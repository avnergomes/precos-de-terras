import csv
import os
import re
import unicodedata
from glob import glob

import pdfplumber
from pypdf import PdfReader


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, 'data')
OUT_DIR = os.path.join(BASE_DIR, 'data', 'extracted')
OUT_FILE = os.path.join(OUT_DIR, 'compiled.csv')

RAW_SOIL_TYPES = {
    'Roxa',
    'Mista',
    'Arenosa',
    'Organica',
    'Orgânica',
    'Hidromorfica',
    'Hidromórfica',
    'Brunada',
    'Brunizada',
}

CLASS_NAMES = [
    'mecanizada',
    'mecanizavel',
    'nao mecanizavel',
    'inaproveitaveis',
]

CLASS_DISPLAY = {
    'mecanizada': 'Mecanizada',
    'mecanizavel': 'Mecanizável',
    'nao mecanizavel': 'Não Mecanizável',
    'inaproveitaveis': 'Inaproveitáveis',
}

BAD_MUNICIPIO_TOKENS = {
    'divisao de estatisticas basicas',
    'municipio',
    'municpio',
    'pagina',
    'terra',
    'tipo de terra',
    'tipo de',
    'precos medios de terras agricolas',
    'precos medios de terras agricolas detalhamento por caracteristica e municipio de 2007 a 2016 em reais por hectare',
}


def normalize(text):
    text = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in text if not unicodedata.combining(ch)).lower().strip()


SOIL_DISPLAY = {normalize(value): value for value in RAW_SOIL_TYPES}
SOIL_TYPES = set(SOIL_DISPLAY.keys())


def parse_number(token):
    token = token.strip()
    if token in ('', '-', 'â€”'):
        return None
    token = token.replace('.', '').replace('R$', '').replace(' ', '')
    token = token.replace(',', '.')
    try:
        return float(token)
    except ValueError:
        return None


def is_valid_municipio(value):
    if not value:
        return False
    if any(ch.isdigit() or ch in ':/' for ch in value):  # rodapé "Fonte: ..." e URL
        return False
    normalized = normalize(value)
    if not normalized or normalized in BAD_MUNICIPIO_TOKENS:
        return False
    if normalized in CLASS_NAMES or normalized in SOIL_TYPES:
        return False
    if normalized.startswith('pagina'):
        return False
    if re.fullmatch(r'[\-\s]+', normalized):
        return False
    return True


def detect_format(text):
    if 'Munícipio Classe / Grau' in text or 'MunÃ­cipio Classe / Grau' in text or 'Municipio Classe / Grau' in text:
        return 'multi_year'
    if 'Município A-' in text or 'MunicÃ­pio A-' in text or 'Municipio A-' in text:
        return 'single_year'
    return None


def extract_years(header_line):
    years = re.findall(r'\b(19\d{2}|20\d{2})\b', header_line)
    return [int(y) for y in years]


def parse_year_from_filename(filename):
    match = re.search(r'_(\d{2})(?:_|\.|$)', filename)
    if not match:
        return None
    year = int(match.group(1))
    if year <= 30:
        return 2000 + year
    return 1900 + year


def parse_multi_year(text):
    rows = []
    current_municipio = None
    current_soil = None
    current_years = []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if line.startswith('Fonte:') or line.startswith('PREÃ‡OS') or line.startswith('PreÃ§os'):
            continue
        if 'municipio' in normalize(line):
            years = extract_years(line)
            if years:
                current_years = years
            continue

        has_digit = any(ch.isdigit() for ch in line)
        normalized = normalize(line)

        if has_digit:
            matched_class = None
            for class_name in CLASS_NAMES:
                if normalized.startswith(class_name):
                    matched_class = class_name
                    break
            if matched_class:
                class_raw = CLASS_DISPLAY.get(matched_class, line.split()[0])
                values = re.findall(r'[\d\.\-]+', line)
                values = [parse_number(v) for v in values]
                for year, value in zip(current_years, values):
                    if value is None or current_municipio is None:
                        continue
                    rows.append({
                        'ano': year,
                        'nivel': 'Municipio',
                        'territorio': current_municipio,
                        'territorio_codigo': '',
                        'categoria': current_soil or '',
                        'subcategoria': class_raw.strip(),
                        'classe': '',
                        'preco': value,
                        'unidade': 'R$/ha',
                    })
            continue

        tokens = line.split()
        if not tokens:
            continue
        last_token = normalize(tokens[-1])
        if last_token in SOIL_TYPES:
            if len(tokens) > 1:
                candidate = ' '.join(tokens[:-1])
                current_municipio = candidate if is_valid_municipio(candidate) else None
            current_soil = SOIL_DISPLAY.get(last_token, tokens[-1])
            continue

        if line.lower().startswith('tipo de'):
            continue

        if len(tokens) > 1:
            current_municipio = line if is_valid_municipio(line) else None

    return rows


VALUE_RE = re.compile(r'^\d{1,3}(?:\.\d{3})*$')


def _header_columns(words):
    """Centros x das colunas de classe a partir da linha 'Município A- I A- II ...'."""
    # O título também contém "município"; vale a primeira linha que tiver códigos de classe.
    for anchor in (w for w in words if normalize(w['text']).startswith('municipio')):
        line = sorted((w for w in words if abs(w['top'] - anchor['top']) < 3), key=lambda w: w['x0'])
        columns = [
            (prefix['text'] + roman['text'], (prefix['x0'] + roman['x1']) / 2)
            for prefix, roman in zip(line, line[1:])
            if re.fullmatch(r'[A-Z]-', prefix['text']) and re.fullmatch(r'[IVX]+', roman['text'])
        ]
        if columns:
            return columns
    return None


def parse_single_year(pdf_path, year):
    """Lê PDFs de ano único (2017+) por coordenadas: cada valor vai para a coluna
    cujo centro x está mais próximo, então classes vazias não deslocam as demais.
    O cabeçalho é mantido entre páginas (o PDF de 2021 só o tem na 1ª página)."""
    rows = []
    columns = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            columns = _header_columns(words) or columns
            if not columns:
                continue
            spacing = min(b[1] - a[1] for a, b in zip(columns, columns[1:]))
            first_col_x = columns[0][1] - spacing / 2

            lines = {}
            for w in words:
                lines.setdefault(round(w['top']), []).append(w)
            for line in lines.values():
                line.sort(key=lambda w: w['x0'])
                values = [w for w in line if VALUE_RE.match(w['text'])]
                name = ' '.join(w['text'] for w in line if w['x0'] < first_col_x and w not in values).strip()
                if not values or not is_valid_municipio(name):
                    continue
                for w in values:
                    center = (w['x0'] + w['x1']) / 2
                    code, col_x = min(columns, key=lambda c: abs(c[1] - center))
                    if abs(col_x - center) > spacing / 2:
                        continue
                    rows.append({
                        'ano': year,
                        'nivel': 'Municipio',
                        'territorio': name,
                        'territorio_codigo': '',
                        'categoria': 'Classe de Capacidade de Uso',
                        'subcategoria': code,
                        'classe': '',
                        'preco': parse_number(w['text']),
                        'unidade': 'R$/ha',
                    })
    return rows


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pdf_files = sorted(glob(os.path.join(PDF_DIR, '*.pdf')))
    if not pdf_files:
        raise SystemExit('Nenhum PDF encontrado em data/.')

    all_rows = []

    for pdf_path in pdf_files:
        reader = PdfReader(pdf_path)
        filename = os.path.basename(pdf_path)
        year_hint = parse_year_from_filename(filename)
        format_type = None
        for page in reader.pages:
            text = page.extract_text() or ''
            if format_type is None:
                format_type = detect_format(text)
            if format_type == 'multi_year':
                all_rows.extend(parse_multi_year(text))
        if format_type == 'single_year' and year_hint:
            all_rows.extend(parse_single_year(pdf_path, year_hint))

    with open(OUT_FILE, 'w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=[
            'ano',
            'nivel',
            'territorio',
            'territorio_codigo',
            'categoria',
            'subcategoria',
            'classe',
            'preco',
            'unidade',
        ])
        writer.writeheader()
        writer.writerows(all_rows)

    print(f'Arquivo gerado: {OUT_FILE} ({len(all_rows)} registros)')


if __name__ == '__main__':
    main()





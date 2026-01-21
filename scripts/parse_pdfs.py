import csv
import os
import re
import unicodedata
from glob import glob

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


def normalize(text):
    text = unicodedata.normalize('NFKD', text)
    return ''.join(ch for ch in text if not unicodedata.combining(ch)).lower().strip()


SOIL_DISPLAY = {normalize(value): value for value in RAW_SOIL_TYPES}
SOIL_TYPES = set(SOIL_DISPLAY.keys())


def parse_number(token):
    token = token.strip()
    if token in ('', '-', '—'):
        return None
    token = token.replace('.', '').replace('R$', '').replace(' ', '')
    token = token.replace(',', '.')
    try:
        return float(token)
    except ValueError:
        return None


def detect_format(text):
    if 'Munícipio Classe / Grau' in text or 'Municipio Classe / Grau' in text:
        return 'multi_year'
    if 'Município A-' in text or 'Municipio A-' in text:
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


def extract_class_codes(header_line):
    codes = re.findall(r'([A-Z])-\s*([IVX]+)', header_line)
    return [f"{letter}-{roman}" for letter, roman in codes]


def parse_multi_year(text):
    rows = []
    current_municipio = None
    current_soil = None
    current_years = []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if line.startswith('Fonte:') or line.startswith('PREÇOS') or line.startswith('Preços'):
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
                current_municipio = ' '.join(tokens[:-1])
            current_soil = SOIL_DISPLAY.get(last_token, tokens[-1])
            continue

        if line.lower().startswith('tipo de'):
            continue

        if len(tokens) > 1:
            current_municipio = line

    return rows


def parse_single_year(text, year):
    rows = []
    current_codes = []

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if line.startswith('Fonte:') or line.startswith('PREÇOS') or line.startswith('Preços'):
            continue
        if 'municipio' in normalize(line):
            codes = extract_class_codes(line)
            if codes:
                current_codes = codes
            continue

        if not any(ch.isdigit() for ch in line):
            continue

        match = re.search(r'\d', line)
        if not match:
            continue
        municipio = line[:match.start()].strip()
        if not municipio:
            continue

        values = re.findall(r'\d[\d\.]*', line[match.start():])
        values = [parse_number(v) for v in values]

        for code, value in zip(current_codes, values):
            if value is None:
                continue
            rows.append({
                'ano': year,
                'nivel': 'Municipio',
                'territorio': municipio,
                'territorio_codigo': '',
                'categoria': 'Classe de Terra',
                'subcategoria': code,
                'classe': '',
                'preco': value,
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
            elif format_type == 'single_year' and year_hint:
                all_rows.extend(parse_single_year(text, year_hint))

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

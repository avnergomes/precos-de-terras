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


def parse_year_from_filename(filename):
    match = re.search(r'_(\d{2})(?:_|\.|$)', filename)
    if not match:
        return None
    year = int(match.group(1))
    if year <= 30:
        return 2000 + year
    return 1900 + year


def _group_lines(words, tolerance=2):
    lines = []
    for w in sorted(words, key=lambda w: w['top']):
        if lines and w['top'] - lines[-1][0]['top'] <= tolerance:
            lines[-1].append(w)
        else:
            lines.append([w])
    return [sorted(line, key=lambda w: w['x0']) for line in lines]


def _nearest_column(word, columns, spacing):
    center = (word['x0'] + word['x1']) / 2
    key, col_x = min(columns, key=lambda c: abs(c[1] - center))
    return key if abs(col_x - center) <= spacing / 2 else None


def _multi_year_header(words):
    """Anos (com centro x), x inicial das colunas 'Tipo de Terra' e 'Classe' do cabeçalho
    'Munícipio | Tipo de Terra | Classe / Grau | 2007 ...'."""
    for anchor in (w for w in words if normalize(w['text']) == 'municipio'):
        line = [w for w in words if abs(w['top'] - anchor['top']) < 3]
        years = [(int(w['text']), (w['x0'] + w['x1']) / 2) for w in line if re.fullmatch(r'(19|20)\d{2}', w['text'])]
        classe = next((w for w in line if normalize(w['text']) == 'classe'), None)
        tipo = next((w for w in words if w['text'] == 'Tipo' and abs(w['top'] - anchor['top']) < 10), None)
        if years and classe and tipo:
            return years, classe['x0'], tipo['x0'] - 5, anchor['top']
    return None


def _name_groups(words, max_gap=12):
    """Junta palavras de nome em linhas próximas (ex.: 'Almirante' / 'Tamandaré').
    Retorna [(nome, centro_y)] em ordem vertical."""
    groups = []
    for line in _group_lines(words):
        top = line[0]['top']
        if groups and top - groups[-1]['bottom'] <= max_gap:
            groups[-1]['parts'].append(line)
            groups[-1]['bottom'] = top
        else:
            groups.append({'parts': [line], 'top': top, 'bottom': top})
    return [
        (' '.join(w['text'] for line in g['parts'] for w in line), (g['top'] + g['bottom']) / 2)
        for g in groups
    ]


def _block_rows(block, name, soil, years, spacing):
    rows = []
    for label, _, values in block:
        for w in values:
            year = _nearest_column(w, years, spacing)
            if year is None:
                continue
            rows.append({
                'ano': year,
                'nivel': 'Municipio',
                'territorio': name,
                'territorio_codigo': '',
                'categoria': SOIL_DISPLAY[normalize(soil['text'])],
                'subcategoria': CLASS_DISPLAY[label],
                'classe': '',
                'preco': parse_number(w['text']),
                'unidade': 'R$/ha',
            })
    return rows


def parse_multi_year(pdf_path):
    """Lê PDFs 1998-2006 e 2007-2016 por coordenadas. Cada bloco tem 4 linhas de classe
    (Mecanizada ... Inaproveitáveis) com o tipo de terra centralizado nele; o nome do
    município fica centralizado sobre todos os seus blocos, às vezes quebrado em duas
    linhas. Pela ordem de texto o nome aparecia fora do lugar e blocos inteiros iam
    para o município anterior."""
    rows = []
    header = None
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            words = page.extract_words()
            header = _multi_year_header(words) or header
            if not header:
                continue
            years, classe_x, soil_x, header_top = header
            spacing = min(b[1] - a[1] for a, b in zip(years, years[1:]))
            label_x = classe_x - 15
            body = [w for w in words if w['top'] > header_top + 8]

            blocks = []
            for line in _group_lines(body):
                label_words = [w for w in line if w['x0'] >= label_x and not re.fullmatch(r'[\d\.\-]+', w['text'])]
                label = normalize(' '.join(w['text'] for w in label_words))
                if label not in CLASS_NAMES:
                    continue
                if label == 'mecanizada' or not blocks:
                    blocks.append([])
                values = [w for w in line if w['x0'] >= label_x and VALUE_RE.match(w['text'])]
                blocks[-1].append((label, line[0]['top'], values))

            left = [w for w in body if w['x1'] < label_x]
            # Separação por coluna, não por texto: o município "Terra Roxa" contém um tipo de solo.
            soils = [w for w in left if w['x0'] >= soil_x and normalize(w['text']) in SOIL_TYPES]
            names = [n for n in _name_groups([w for w in left if w['x1'] < soil_x]) if is_valid_municipio(n[0])]

            # O nome fica centralizado sobre todos os blocos (um por tipo de terra) do
            # município: para cada nome, em ordem, pega quantos blocos fazem o meio bater.
            i = 0
            for name, center in names:
                if i >= len(blocks):
                    print(f'  aviso: nome sem bloco na pág. {page.page_number}: {name!r}')
                    break
                k = min(range(1, min(4, len(blocks) - i) + 1),
                        key=lambda k: abs((blocks[i][0][1] + blocks[i + k - 1][-1][1]) / 2 - center))
                for block in blocks[i:i + k]:
                    top, bottom = block[0][1] - 4, block[-1][1] + 4
                    soil = next((w for w in soils if top <= w['top'] <= bottom), None)
                    if soil is None:
                        print(f'  aviso: bloco sem solo/município na pág. {page.page_number}: {name!r}')
                        continue
                    rows.extend(_block_rows(block, name, soil, years, spacing))
                i += k
            if i < len(blocks):
                print(f'  aviso: {len(blocks) - i} bloco(s) sem nome na pág. {page.page_number}')
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
        format_type = detect_format(reader.pages[0].extract_text() or '')
        if format_type == 'multi_year':
            all_rows.extend(parse_multi_year(pdf_path))
        elif format_type == 'single_year' and year_hint:
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





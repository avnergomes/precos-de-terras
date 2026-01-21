import csv
import json
import os
from glob import glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'extracted')
OUTPUT_DIR = os.path.join(BASE_DIR, 'dashboard', 'public', 'data')

REQUIRED_FIELDS = [
    'ano',
    'nivel',
    'territorio',
    'territorio_codigo',
    'categoria',
    'subcategoria',
    'classe',
    'preco',
    'unidade',
]

# Mapeamento de nomenclatura antiga para nova
# Baseado no Sistema de Capacidade de Uso do Solo (SBCS)
CATEGORIA_MAP = {
    'Roxa': 'Classe de Capacidade de Uso',
    'Mista': 'Classe de Capacidade de Uso',
    'Arenosa': 'Classe de Capacidade de Uso',
    'Classe de Capacidade de Uso': 'Classe de Capacidade de Uso',
}

SUBCATEGORIA_MAP = {
    # Roxa (mais fértil)
    'Roxa|Mecanizada': 'A-I',
    'Roxa|Mecanizável': 'A-II',
    'Roxa|Não Mecanizável': 'B-VI',
    'Roxa|Inaproveitáveis': 'C-VIII',
    # Mista (média)
    'Mista|Mecanizada': 'A-II',
    'Mista|Mecanizável': 'A-III',
    'Mista|Não Mecanizável': 'B-VII',
    'Mista|Inaproveitáveis': 'C-VIII',
    # Arenosa (menos fértil)
    'Arenosa|Mecanizada': 'A-III',
    'Arenosa|Mecanizável': 'A-IV',
    'Arenosa|Não Mecanizável': 'B-VII',
    'Arenosa|Inaproveitáveis': 'C-VIII',
}


def normalizar_nomenclatura(categoria, subcategoria):
    """Converte nomenclatura antiga para nova. Categoria = grupo (A/B/C), Subcategoria = classe (A-I, etc.)."""
    import re

    classe = None

    # Se já está no formato novo (A-I, B-VI, etc.)
    if categoria == 'Classe de Capacidade de Uso' and subcategoria and re.match(r'^[ABC]-[IVX]+$', subcategoria):
        classe = subcategoria
    else:
        # Para formato antigo, mapeia para classe
        chave = f'{categoria}|{subcategoria}'
        classe = SUBCATEGORIA_MAP.get(chave, subcategoria)

    # Extrai o grupo (A, B ou C) da classe
    if classe and re.match(r'^[ABC]-[IVX]+$', classe):
        grupo = classe[0]  # Primeira letra: A, B ou C
        return grupo, classe

    # Fallback: mantém original
    return categoria, subcategoria


def parse_number(value):
    if value is None:
        return None
    raw = str(value).strip()
    if raw == '':
        return None
    raw = raw.replace('.', '').replace(' ', '').replace('R$', '')
    raw = raw.replace(',', '.')
    try:
        return float(raw)
    except ValueError:
        return None


def validate_columns(fieldnames, path):
    missing = [col for col in REQUIRED_FIELDS if col not in fieldnames]
    if missing:
        raise ValueError(f'Arquivo {path} nao possui colunas obrigatorias: {missing}')


def build_metadata(rows):
    anos = sorted({row['ano'] for row in rows if row.get('ano')})
    niveis = sorted({row['nivel'] for row in rows if row.get('nivel')})
    categorias = sorted({row['categoria'] for row in rows if row.get('categoria')})
    subcategorias = sorted({row['subcategoria'] for row in rows if row.get('subcategoria')})
    classes = sorted({row['classe'] for row in rows if row.get('classe')})

    territorios = {}
    for row in rows:
        nivel = row.get('nivel')
        territorio = row.get('territorio')
        if not nivel or not territorio:
            continue
        territorios.setdefault(nivel, set()).add(territorio)

    territorios = {k: sorted(list(v)) for k, v in territorios.items()}

    return {
        'anoMin': anos[0] if anos else 0,
        'anoMax': anos[-1] if anos else 0,
        'anos': anos,
        'niveis': niveis,
        'categorias': categorias,
        'subcategorias': subcategorias,
        'classes': classes,
        'territorios': territorios,
    }


def main():
    compiled_path = os.path.join(DATA_DIR, 'compiled.csv')
    if os.path.exists(compiled_path):
        csv_files = [compiled_path]
    else:
        csv_files = sorted(glob(os.path.join(DATA_DIR, '*.csv')))
        if not csv_files:
            raise SystemExit('Nenhum CSV encontrado em data/extracted.')

    rows = []
    for path in csv_files:
        with open(path, encoding='utf-8') as handle:
            reader = csv.DictReader(handle)
            validate_columns(reader.fieldnames, path)
            for row in reader:
                categoria_raw = row.get('categoria', '').strip()
                subcategoria_raw = row.get('subcategoria', '').strip()

                # Normaliza nomenclatura antiga para nova
                categoria, subcategoria = normalizar_nomenclatura(categoria_raw, subcategoria_raw)

                registro = {
                    'ano': int(row['ano']) if row.get('ano') else None,
                    'nivel': row.get('nivel', '').strip(),
                    'territorio': row.get('territorio', '').strip(),
                    'territorio_codigo': row.get('territorio_codigo', '').strip(),
                    'categoria': categoria,
                    'subcategoria': subcategoria,
                    'classe': row.get('classe', '').strip(),
                    'preco': parse_number(row.get('preco')),
                    'unidade': row.get('unidade', '').strip(),
                }
                rows.append(registro)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    detailed_path = os.path.join(OUTPUT_DIR, 'detailed.json')
    aggregated_path = os.path.join(OUTPUT_DIR, 'aggregated.json')

    with open(detailed_path, 'w', encoding='utf-8') as handle:
        json.dump(rows, handle, ensure_ascii=False, indent=2)

    metadata = build_metadata(rows)
    with open(aggregated_path, 'w', encoding='utf-8') as handle:
        json.dump({'metadata': metadata}, handle, ensure_ascii=False, indent=2)

    print(f'Gerados: {detailed_path} e {aggregated_path}')


if __name__ == '__main__':
    main()

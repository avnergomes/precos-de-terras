import csv
import json
import os
import re
import unicodedata
from glob import glob

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data', 'extracted')
OUTPUT_DIR = os.path.join(BASE_DIR, 'dashboard', 'public', 'data')
MUN_PR_PATH = os.path.join(BASE_DIR, 'data', 'mun_PR.json')

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
    # Roxa (mais fÃ©rtil)
    'Roxa|Mecanizada': 'A-I',
    'Roxa|MecanizÃ¡vel': 'A-II',
    'Roxa|NÃ£o MecanizÃ¡vel': 'B-VI',
    'Roxa|InaproveitÃ¡veis': 'C-VIII',
    # Mista (mÃ©dia)
    'Mista|Mecanizada': 'A-II',
    'Mista|MecanizÃ¡vel': 'A-III',
    'Mista|NÃ£o MecanizÃ¡vel': 'B-VII',
    'Mista|InaproveitÃ¡veis': 'C-VIII',
    # Arenosa (menos fÃ©rtil)
    'Arenosa|Mecanizada': 'A-III',
    'Arenosa|MecanizÃ¡vel': 'A-IV',
    'Arenosa|NÃ£o MecanizÃ¡vel': 'B-VII',
    'Arenosa|InaproveitÃ¡veis': 'C-VIII',
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


def normalize(value):
    if value is None:
        return ''
    text = unicodedata.normalize('NFKD', str(value))
    return ''.join(ch for ch in text if not unicodedata.combining(ch)).lower().strip()


def is_valid_municipio(value):
    if not value:
        return False
    if any(ch.isdigit() for ch in value):
        return False
    normalized = normalize(value)
    if not normalized or normalized in BAD_MUNICIPIO_TOKENS:
        return False
    if normalized.startswith('pagina'):
        return False
    if re.fullmatch(r'[\-\s]+', normalized):
        return False
    return True


def normalizar_nomenclatura(categoria, subcategoria):
    """Converte nomenclatura antiga para nova. Categoria = grupo (A/B/C), Subcategoria = classe (A-I, etc.)."""
    import re

    classe = None

    # Se jÃ¡ estÃ¡ no formato novo (A-I, B-VI, etc.)
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

    # Fallback: mantÃ©m original
    return categoria, subcategoria


def load_municipios_map():
    """Carrega mapeamento de municÃ­pios para regiÃ£o e mesorregiÃ£o do mun_PR.json."""
    if not os.path.exists(MUN_PR_PATH):
        print(f'Aviso: {MUN_PR_PATH} nÃ£o encontrado. RegiÃ£o/mesorregiÃ£o nÃ£o serÃ£o incluÃ­das.')
        return {}

    with open(MUN_PR_PATH, encoding='utf-8') as f:
        geojson = json.load(f)

    mun_map = {}
    for feature in geojson.get('features', []):
        props = feature.get('properties', {})
        nome = props.get('Municipio', '').strip()
        if nome:
            mun_map[nome.lower()] = {
                'regiao': props.get('RegIdr', '').strip(),
                'mesorregiao': props.get('MesoIdr', '').strip(),
            }
    return mun_map


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
    regioes = sorted({row['regiao'] for row in rows if row.get('regiao')})
    mesorregioes = sorted({row['mesorregiao'] for row in rows if row.get('mesorregiao')})

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
        'regioes': regioes,
        'mesorregioes': mesorregioes,
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

    # Carrega mapeamento de municÃ­pios para regiÃ£o/mesorregiÃ£o
    mun_map = load_municipios_map()

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

                territorio = row.get('territorio', '').strip()
                nivel = row.get('nivel', '').strip()
                if nivel == 'Municipio' and not is_valid_municipio(territorio):
                    continue
                mun_info = mun_map.get(territorio.lower(), {})

                registro = {
                    'ano': int(row['ano']) if row.get('ano') else None,
                    'nivel': nivel,
                    'territorio': territorio,
                    'territorio_codigo': row.get('territorio_codigo', '').strip(),
                    'regiao': mun_info.get('regiao', ''),
                    'mesorregiao': mun_info.get('mesorregiao', ''),
                    'categoria': categoria,
                    'subcategoria': subcategoria,
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





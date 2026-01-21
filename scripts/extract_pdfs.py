import os
from glob import glob

import pandas as pd
import tabula


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_DIR = os.path.join(BASE_DIR, 'data')
OUT_DIR = os.path.join(BASE_DIR, 'data', 'extracted')


def sanitize_columns(df):
    df.columns = [str(col).strip() for col in df.columns]
    return df


def extract_tables(pdf_path, mode, encoding):
    return tabula.read_pdf(
        pdf_path,
        pages='all',
        lattice=(mode == 'lattice'),
        stream=(mode == 'stream'),
        guess=True,
        encoding=encoding,
        pandas_options={'dtype': str}
    )


def save_tables(pdf_path, tables, mode):
    base = os.path.splitext(os.path.basename(pdf_path))[0]
    saved = 0
    for idx, table in enumerate(tables, start=1):
        if table is None or table.empty:
            continue
        df = sanitize_columns(table)
        out_name = f"{base}_{mode}_{idx}.csv"
        out_path = os.path.join(OUT_DIR, out_name)
        df.to_csv(out_path, index=False, encoding='utf-8')
        saved += 1
    return saved


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    pdf_files = sorted(glob(os.path.join(PDF_DIR, '*.pdf')))
    if not pdf_files:
        raise SystemExit('Nenhum PDF encontrado em data/.')

    for pdf_path in pdf_files:
        print(f'Processando {os.path.basename(pdf_path)}')
        total_saved = 0

        for mode in ['lattice', 'stream']:
            extracted = False
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    tables = extract_tables(pdf_path, mode, encoding)
                    total_saved += save_tables(pdf_path, tables, mode)
                    extracted = True
                    break
                except Exception as exc:
                    print(f'Falha {mode} ({encoding}): {exc}')
            if not extracted:
                print(f'Nao foi possivel extrair {mode} para {pdf_path}')

        print(f'  tabelas salvas: {total_saved}')


if __name__ == '__main__':
    main()

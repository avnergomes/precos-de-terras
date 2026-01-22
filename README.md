# precos-de-terras

Dashboard para visualizacao dos precos de terras no Parana com analise historica.

## Fonte de dados
- DERAL - Departamento de Economia Rural

## Estrutura do projeto
- `data/`: PDFs originais
- `docs/`: documentos metodologicos do DERAL
- `scripts/`: pipeline para gerar os JSONs consumidos pelo dashboard
- `dashboard/`: aplicacao Vite + React + Tailwind

## Pipeline de dados
Dependencias:
```bash
python -m pip install pypdf
```

1) Rode o parser direto dos PDFs:
```bash
python scripts/parse_pdfs.py
```
2) O CSV consolidado sera salvo em `data/extracted/compiled.csv`.
3) Rode o preprocessamento para gerar os JSONs:
```bash
python scripts/preprocess_data.py
```
4) Substitua/adicione o GeoJSON em `dashboard/public/data/territorios.geojson`.

### Esquema esperado dos CSVs
Colunas obrigatorias:
- `ano`
- `nivel`
- `territorio`
- `territorio_codigo`
- `categoria`
- `subcategoria`
- `classe`
- `preco`
- `unidade`

Observacoes:
- `nivel` representa o recorte territorial (ex.: Municipio, Regional, Mesorregiao).
- `territorio_codigo` deve bater com o codigo do GeoJSON quando existir.
- `preco` deve vir como numero ou string numerica (ex.: `12345,67`).

### GeoJSON
O dashboard espera um `FeatureCollection` com propriedades minimas:
- `nivel`
- `codigo`
- `nome`

Se os nomes forem diferentes, ajuste as propriedades ou atualize a funcao de mapeamento em
`dashboard/src/components/MapChart.jsx`.

## Dashboard
```bash
cd dashboard
npm install
npm run dev
```

## Pesquisa de preco
O frontend possui a aba "Pesquisa de preco" que chama um backend via `POST /api/search`.
O backend de referencia fica em `price_search/` e pode ser executado localmente.

```bash
cd price_search
python -m pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Configure a variavel de ambiente no frontend (ex.: `dashboard/.env.local`):
```
VITE_PRICE_SEARCH_URL=http://localhost:8000
```

## GitHub Pages
O deploy em Pages eh feito via GitHub Actions com build do dashboard.
Garanta que o Pages esteja configurado para usar "GitHub Actions".

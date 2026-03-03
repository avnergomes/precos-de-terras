# Preços de Terras — Terras Rurais do Paraná

Dashboard de preços de terras rurais do Paraná com série histórica de 1998 a 2025, extraída automaticamente de publicações em PDF do SIPT/SEAB. Inclui mapa coroplético, busca de preços e classificação por categoria de terra.

**🔗 [Acessar dashboard](https://avnergomes.github.io/precos-de-terras/)**

Parte do ecossistema **[Datageo Paraná](https://datageoparana.github.io)**.

## Sobre

O SIPT (Sistema de Informação de Preços de Terras) da SEAB/IDR-Paraná publica periodicamente boletins com valores de mercado de terras rurais em diferentes regiões e categorias do estado. Este dashboard digitaliza e organiza essas publicações — originalmente em PDF — em uma interface interativa que cobre quase três décadas de dados.

O diferencial técnico está no pipeline de extração automática de PDFs: os scripts `extract_pdfs.py` e `parse_pdfs.py` processam as publicações brutas e estruturam os dados em JSONs para o frontend. Uma aplicação Flask adicional (`price_search/`) permite buscar preços por critérios específicos.

A visualização inclui mapa coroplético de municípios, série histórica 1998–2025, classificação por categoria de terra, ranking regional e filtros ativos com badges.

## Fonte de Dados

- **SEAB/IDR-Paraná** — SIPT (Sistema de Informação de Preços de Terras)
- Período: 1998–2025
- Arquivos brutos: publicações em PDF em `/data/`

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Gráficos | Recharts, D3.js |
| Mapas | Leaflet, React-Leaflet |
| Pipeline | Python (Pandas, extração de PDF) |
| Busca | Flask (price_search/) |
| Deploy | GitHub Pages via GitHub Actions |
| Tracking | LGPD-compliant (19 métricas anônimas) |

## Estrutura do Projeto

```
precos-de-terras/
├── dashboard/          # Aplicação React
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/ # 18 componentes
│   │   └── hooks/      # useData.js
│   ├── public/
│   │   └── data/       # JSONs processados
│   └── index.html
├── scripts/            # Pipeline de dados (Python)
│   ├── extract_pdfs.py
│   ├── parse_pdfs.py
│   └── preprocess_data.py
├── price_search/       # App Flask de busca de preços
├── data/               # Dados brutos (PDFs 1998–2025)
├── .github/workflows/  # CI/CD
│   ├── data-pipeline.yml
│   └── deploy.yml
└── README.md
```

## Funcionalidades

- Extração automática de dados de publicações em PDF
- Série histórica de preços de terras rurais (1998–2025)
- Mapa coroplético interativo de municípios paranaenses
- Classificação por categoria de terra
- Busca de preços via aplicação Flask
- Ranking regional e gráfico de território
- Filtros ativos com badges visuais
- KPIs de preço médio, mediana, menor/maior valor, crescimento anual e volatilidade

## Desenvolvimento Local

```bash
# Clone
git clone https://github.com/avnergomes/precos-de-terras.git
cd precos-de-terras/dashboard

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Pipeline de Dados

O pipeline opera em três etapas Python: `extract_pdfs.py` extrai o conteúdo textual das publicações PDF em `/data/`, `parse_pdfs.py` estrutura e normaliza os valores extraídos por região e categoria, e `preprocess_data.py` gera os arquivos `aggregated.json` e `detailed.json` em `dashboard/public/data/`. O workflow `data-pipeline.yml` automatiza esse processo no GitHub Actions, e `deploy.yml` publica o resultado no GitHub Pages.

## Licença

Dados públicos. Dashboard desenvolvido por [Avner Gomes](https://avnergomes.github.io/portfolio/).

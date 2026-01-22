# Price search backend

Este diretorio contem uma API simples para pesquisa de precos de terras.
Ela pode ser executada como API (FastAPI) ou como interface de testes (Streamlit).

## Instalar dependencias
```bash
python -m pip install -r requirements.txt
```

## Rodar API (FastAPI)
```bash
uvicorn app:app --reload --port 8000
```

## Rodar interface (Streamlit)
```bash
streamlit run app.py
```

## Dados auxiliares
- Opcionalmente adicione `municipios.json` neste diretorio com uma lista JSON
  de municipios para o seletor do Streamlit.

import json
import re
from datetime import datetime

from duckduckgo_search import DDGS
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def extrair_preco(texto):
  if not texto:
    return None
  match = re.search(r"R\\$\\s?([\\d\\.]+,\\d+)", texto)
  return match.group(0) if match else None


CLASSE_TERMS = {
  "A-I": "classe I lavoura",
  "A-II": "classe II lavoura",
  "A-III": "classe III lavoura",
  "A-IV": "classe IV lavoura",
  "B-V": "classe V pastagem",
  "B-VI": "classe VI pastagem",
  "B-VII": "classe VII pastagem",
  "C-VIII": "classe VIII preservacao",
}


def montar_query(municipio, area_total, areas, usar_classes=True):
  base = f"fazenda {municipio} preco"
  if not usar_classes:
    return base

  classes_com_area = [
    (classe, float(valor))
    for classe, valor in (areas or {}).items()
    if float(valor or 0) > 0
  ]

  classes_com_area.sort(key=lambda item: item[1], reverse=True)
  termos = []
  for classe, _valor in classes_com_area[:3]:
    termo = CLASSE_TERMS.get(classe)
    if termo:
      termos.append(termo)

  if not termos:
    return base

  return f"{base} {' '.join(termos)}"


def executar_busca(query, max_results):
  try:
    with DDGS() as ddgs:
      return list(ddgs.text(query, max_results=max_results))
  except Exception:
    return []


def buscar_anuncios(municipio, area_total, areas, max_results=6):
  anuncios = []
  query_com_classes = montar_query(municipio, area_total, areas, usar_classes=True)
  resultados = executar_busca(query_com_classes, max_results)

  if not resultados:
    query_total = montar_query(municipio, area_total, areas, usar_classes=False)
    resultados = executar_busca(query_total, max_results)

  for resultado in resultados:
    link = resultado.get("href") or resultado.get("url") or ""
    titulo = resultado.get("title") or resultado.get("heading") or "Anuncio sem titulo"
    snippet = resultado.get("body") or resultado.get("snippet") or ""
    preco = extrair_preco(snippet)
    anuncios.append({
      "titulo": titulo,
      "preco": preco,
      "area": None,
      "link": link,
      "municipio": municipio
    })

  return anuncios


app = FastAPI()
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["POST"],
  allow_headers=["*"],
)


@app.post("/api/search")
async def search(payload: dict):
  municipio = payload.get("municipio", "")
  areas = payload.get("areas", {})
  area_total = payload.get("area_total", 0)
  resultados = buscar_anuncios(municipio, area_total, areas)
  return {
    "resultados": resultados,
    "timestamp": datetime.utcnow().isoformat() + "Z"
  }


def carregar_municipios(caminho="municipios.json"):
  try:
    with open(caminho, "r", encoding="utf-8") as handle:
      return json.load(handle)
  except FileNotFoundError:
    return []


def main():
  import streamlit as st

  st.title("Pesquisa de Preco de Terras")
  st.write("Selecione o municipio e informe as areas em ha para cada classe.")

  municipios = carregar_municipios()
  if municipios:
    municipio = st.selectbox("Municipio", options=municipios)
  else:
    st.warning("municipios.json nao encontrado. Informe manualmente.")
    municipio = st.text_input("Municipio")

  areas = {}
  total_area = 0.0

  col1, col2 = st.columns(2)
  with col1:
    for classe in ["A-I", "A-II", "A-III", "A-IV"]:
      valor = st.number_input(f"{classe} (ha)", min_value=0.0, step=0.01)
      areas[classe] = valor
      total_area += valor
  with col2:
    for classe in ["B-V", "B-VI", "B-VII", "C-VIII"]:
      valor = st.number_input(f"{classe} (ha)", min_value=0.0, step=0.01)
      areas[classe] = valor
      total_area += valor

  st.write(f"**Total:** {total_area:.2f} ha")

  if st.button("Pesquisar") and municipio and total_area > 0:
    with st.spinner("Buscando propriedades..."):
      resultados = buscar_anuncios(municipio, total_area, areas)

    st.success(f"Foram encontrados {len(resultados)} anuncios.")
    for item in resultados:
      st.markdown(f"* **{item['titulo']}** - {item['preco'] or 'sem preco'}")
      if item.get("link"):
        st.markdown(f"  <{item['link']}>", unsafe_allow_html=True)
      st.markdown("---")


if __name__ == "__main__":
  main()

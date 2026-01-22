import json
import logging
import re
import unicodedata
from datetime import datetime, timezone

from duckduckgo_search import DDGS
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def extrair_preco(texto):
  if not texto:
    return None
  match = re.search(r"R\\$\\s?([\\d\\.]+,\\d+)", texto)
  return match.group(0) if match else None


def extrair_area(texto):
  if not texto:
    return None
  match = re.search(r"(\\d+[\\.,]?\\d*)\\s?(ha|hectare|hectares|alqueire|alqueires)", texto, re.IGNORECASE)
  if match:
    return f"{match.group(1)} {match.group(2)}"
  match = re.search(r"(\\d+[\\.,]?\\d*)\\s?m2", texto, re.IGNORECASE)
  if match:
    return f"{match.group(1)} m2"
  return None


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

GOOD_KEYWORDS = [
  "fazenda",
  "sitio",
  "chacara",
  "imovel rural",
  "propriedade rural",
  "area rural",
  "a venda",
  "vende",
]

BAD_KEYWORDS = [
  "wikipedia",
  "imdb",
  "netflix",
  "prime video",
  "disney",
  "serie",
  "filme",
  "documentario",
  "restaurant",
  "restaurante",
  "bar & grill",
  "steam",
  "game",
  "tv",
]

BAD_DOMAINS = [
  "wikipedia.org",
  "imdb.com",
  "britannica.com",
  "netflix.com",
  "primevideo.com",
  "disneyplus.com",
]



def normalize_text(text):
  if not text:
    return ""
  normalized = unicodedata.normalize("NFKD", text)
  cleaned = "".join(ch for ch in normalized if not unicodedata.combining(ch))
  return cleaned.lower()

def is_bad_result(link, titulo, snippet):
  text = normalize_text(f"{titulo} {snippet}")
  if any(keyword in text for keyword in BAD_KEYWORDS):
    return True
  if any(domain in link for domain in BAD_DOMAINS):
    return True
  return False


def is_good_result(titulo, snippet):
  text = normalize_text(f"{titulo} {snippet}")
  return any(keyword in text for keyword in GOOD_KEYWORDS)


def montar_query(municipio, area_total, areas, usar_classes=True):
  base = f"fazenda a venda {municipio} imovel rural preco"
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
    logger.info(f"Executando busca: {query}")
    with DDGS() as ddgs:
      resultados = list(ddgs.text(query, max_results=max_results))
      logger.info(f"Busca retornou {len(resultados)} resultados")
      return resultados
  except Exception as e:
    logger.error(f"Erro na busca DuckDuckGo: {type(e).__name__}: {e}")
    return []


def buscar_anuncios(municipio, area_total, areas, max_results=6):
  anuncios = []
  queries = [
    montar_query(municipio, area_total, areas, usar_classes=True),
    montar_query(municipio, area_total, areas, usar_classes=False),
    f"sitio a venda {municipio} preco",
    f"chacara a venda {municipio} preco",
  ]

  resultados = []
  for i, query in enumerate(queries):
    logger.info(f"Tentando query {i+1}/{len(queries)}")
    resultados = executar_busca(query, max_results=max_results * 2)
    if resultados:
      logger.info(f"Query {i+1} retornou resultados")
      break
    logger.info(f"Query {i+1} sem resultados, tentando proxima...")

  filtrados_bad = 0
  filtrados_not_good = 0
  for resultado in resultados:
    link = resultado.get("href") or resultado.get("url") or ""
    titulo = resultado.get("title") or resultado.get("heading") or "Anuncio sem titulo"
    snippet = resultado.get("body") or resultado.get("snippet") or ""
    if is_bad_result(link, titulo, snippet):
      filtrados_bad += 1
      continue
    if not is_good_result(titulo, snippet) and not extrair_preco(snippet):
      filtrados_not_good += 1
      continue
    preco = extrair_preco(snippet)
    area = extrair_area(snippet)
    anuncios.append({
      "titulo": titulo,
      "preco": preco,
      "area": area,
      "link": link,
      "municipio": municipio
    })
    if len(anuncios) >= max_results:
      break

  logger.info(f"Resultados: {len(resultados)} brutos, {filtrados_bad} removidos (bad), {filtrados_not_good} removidos (not good), {len(anuncios)} finais")
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
  logger.info(f"Busca recebida - municipio: {municipio}, area_total: {area_total}")
  resultados = buscar_anuncios(municipio, area_total, areas)
  logger.info(f"Busca finalizada - {len(resultados)} anuncios encontrados")
  return {
    "resultados": resultados,
    "timestamp": datetime.now(timezone.utc).isoformat()
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


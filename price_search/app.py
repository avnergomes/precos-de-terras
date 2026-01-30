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
  # R$ 1.500.000,00 or R$ 1500000 or R$ 850.000
  match = re.search(r"R\$\s?([\d\.]+,\d+)", texto)
  if match:
    return match.group(0)
  match = re.search(r"R\$\s?([\d\.]{4,})", texto)
  if match:
    return match.group(0)
  return None


def extrair_area(texto):
  if not texto:
    return None
  match = re.search(r"(\d+[\.,]?\d*)\s?(ha|hectare|hectares|alqueire|alqueires)", texto, re.IGNORECASE)
  if match:
    return f"{match.group(1)} {match.group(2)}"
  match = re.search(r"(\d+[\.,]?\d*)\s?m2", texto, re.IGNORECASE)
  if match:
    return f"{match.group(1)} m2"
  return None


GOOD_KEYWORDS = [
  "fazenda",
  "sitio",
  "chacara",
  "imovel rural",
  "propriedade rural",
  "area rural",
  "terreno rural",
  "terra rural",
  "a venda",
  "vende",
  "hectare",
  "alqueire",
  " ha ",
  "agricola",
  "lavoura",
  "pastagem",
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
  "tv ",
  "receita",
  "turismo",
  "hotel",
  "pousada",
]

BAD_DOMAINS = [
  "wikipedia.org",
  "imdb.com",
  "britannica.com",
  "netflix.com",
  "primevideo.com",
  "disneyplus.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "tripadvisor.com",
  "booking.com",
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


def montar_queries(municipio, area_total, areas):
  """Build a list of search queries from most specific to most generic."""
  queries = []

  # Area description for queries
  area_desc = ""
  if area_total and area_total > 0:
    area_desc = f" {area_total:.0f} hectares"

  # Determine dominant use from areas
  uso = ""
  if areas:
    grupo_a = sum(float(areas.get(c, 0) or 0) for c in ["A-I", "A-II", "A-III", "A-IV"])
    grupo_b = sum(float(areas.get(c, 0) or 0) for c in ["B-V", "B-VI", "B-VII"])
    if grupo_a > grupo_b and grupo_a > 0:
      uso = "lavoura agricola"
    elif grupo_b > 0:
      uso = "pastagem"

  # Most specific → most generic
  queries.append(f"propriedade rural venda {municipio} Parana{area_desc} {uso}".strip())
  queries.append(f"fazenda a venda {municipio} PR{area_desc}".strip())
  queries.append(f"sitio chacara venda {municipio} Parana preco".strip())
  queries.append(f"imovel rural {municipio} Parana hectares preco".strip())

  return queries


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
  queries = montar_queries(municipio, area_total, areas)

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
  seen_links = set()

  for resultado in resultados:
    link = resultado.get("href") or resultado.get("url") or ""
    titulo = resultado.get("title") or resultado.get("heading") or "Anuncio sem titulo"
    snippet = resultado.get("body") or resultado.get("snippet") or ""

    if link in seen_links:
      continue
    seen_links.add(link)

    if is_bad_result(link, titulo, snippet):
      filtrados_bad += 1
      continue
    if not is_good_result(titulo, snippet) and not extrair_preco(snippet):
      filtrados_not_good += 1
      continue

    preco = extrair_preco(snippet) or extrair_preco(titulo)
    area = extrair_area(snippet) or extrair_area(titulo)

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

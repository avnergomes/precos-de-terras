import { useEffect, useMemo, useState } from 'react';

const BASE_URL = import.meta.env.BASE_URL || '/';

function normalizeKey(value) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveGeoName(props = {}) {
  return props.nome || props.Nome || props.Municipio || props.municipio || props.territorio || props.name || '';
}

function buildMetadata(detailed, aggregated, geoData) {
  if (!detailed || detailed.length === 0) {
    if (aggregated?.metadata) {
      return filterMunicipiosByGeo(aggregated.metadata, geoData);
    }
    return {
      anoMin: 0,
      anoMax: 0,
      anos: [],
      niveis: [],
      categorias: [],
      subcategorias: [],
      regioes: [],
      mesorregioes: [],
      territorios: {},
    };
  }

  const baseMetadata = aggregated?.metadata ? aggregated.metadata : null;

  if (!baseMetadata) {
    const anosSet = new Set();
    const niveisSet = new Set();
    const categoriasSet = new Set();
    const subcategoriasSet = new Set();
    const regioesSet = new Set();
    const mesorregioesSet = new Set();
    const territorios = {};

    detailed.forEach(row => {
      if (row.ano) anosSet.add(row.ano);
      if (row.nivel) niveisSet.add(row.nivel);
      if (row.categoria) categoriasSet.add(row.categoria);
      if (row.subcategoria) subcategoriasSet.add(row.subcategoria);
      if (row.regiao) regioesSet.add(row.regiao);
      if (row.mesorregiao) mesorregioesSet.add(row.mesorregiao);

      if (row.nivel && row.territorio) {
        if (!territorios[row.nivel]) {
          territorios[row.nivel] = new Set();
        }
        territorios[row.nivel].add(row.territorio);
      }
    });

    const anos = Array.from(anosSet).sort((a, b) => a - b);
    const anoMin = anos[0] || 0;
    const anoMax = anos[anos.length - 1] || 0;

    const territoriosSorted = {};
    Object.entries(territorios).forEach(([nivel, set]) => {
      territoriosSorted[nivel] = Array.from(set).sort();
    });

    return filterMunicipiosByGeo({
      anoMin,
      anoMax,
      anos,
      niveis: Array.from(niveisSet).sort(),
      categorias: Array.from(categoriasSet).sort(),
      subcategorias: Array.from(subcategoriasSet).sort(),
      regioes: Array.from(regioesSet).sort(),
      mesorregioes: Array.from(mesorregioesSet).sort(),
      territorios: territoriosSorted,
    }, geoData);
  }

  return filterMunicipiosByGeo(baseMetadata, geoData);
}

function filterMunicipiosByGeo(metadata, geoData) {
  if (!metadata?.territorios?.Municipio || !geoData?.features?.length) {
    return metadata;
  }
  const geoMunicipios = new Set();
  geoData.features.forEach(feature => {
    const props = feature.properties || {};
    const name = resolveGeoName(props);
    if (name) geoMunicipios.add(normalizeKey(name));
  });

  const municipios = metadata.territorios.Municipio
    .filter(item => geoMunicipios.has(normalizeKey(item)))
    .sort();

  return {
    ...metadata,
    territorios: {
      ...metadata.territorios,
      Municipio: municipios,
    },
  };
}

export function useData() {
  const [detailed, setDetailed] = useState([]);
  const [aggregated, setAggregated] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [detailedRes, aggregatedRes, geoRes] = await Promise.all([
          fetch(`${BASE_URL}data/detailed.json`),
          fetch(`${BASE_URL}data/aggregated.json`),
          fetch(`${BASE_URL}data/territorios.geojson`)
        ]);

        if (!detailedRes.ok) {
          throw new Error('Erro ao carregar dados detalhados');
        }

        const detailedData = await detailedRes.json();
        setDetailed(detailedData || []);

        let geoJson = null;
        if (geoRes.ok) {
          geoJson = await geoRes.json();
          setGeoData(geoJson);
        }

        if (aggregatedRes.ok) {
          const aggregatedData = await aggregatedRes.json();
          setAggregated(aggregatedData);
          setMetadata(buildMetadata(detailedData, aggregatedData, geoJson));
        } else {
          setMetadata(buildMetadata(detailedData, null, geoJson));
        }
      } catch (err) {
        setError(err.message);
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { detailed, aggregated, geoData, metadata, loading, error };
}

export function useFilteredData(detailed, filters) {
  return useMemo(() => {
    if (!detailed || detailed.length === 0) return [];

    const [anoMin, anoMax] = filters.anos || [];

    return detailed.filter(row => {
      if (anoMin && row.ano < anoMin) return false;
      if (anoMax && row.ano > anoMax) return false;

      if (filters.nivel && row.nivel !== filters.nivel) return false;

      if (filters.mesorregioes?.length && !filters.mesorregioes.includes(row.mesorregiao)) {
        return false;
      }

      if (filters.regioes?.length && !filters.regioes.includes(row.regiao)) {
        return false;
      }

      if (filters.territorios?.length && !filters.territorios.includes(row.territorio)) {
        return false;
      }

      if (filters.categorias?.length && !filters.categorias.includes(row.categoria)) {
        return false;
      }

      if (filters.subcategorias?.length && !filters.subcategorias.includes(row.subcategoria)) {
        return false;
      }

      return true;
    });
  }, [detailed, filters]);
}

function groupBy(items, keyFn) {
  const map = new Map();
  items.forEach(item => {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  });
  return map;
}

function computeStats(values) {
  if (values.length === 0) {
    return { media: 0, mediana: 0, min: 0, max: 0, desvio: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const total = values.reduce((acc, val) => acc + val, 0);
  const media = total / values.length;
  const mediana = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const variance = values.reduce((acc, val) => acc + (val - media) ** 2, 0) / values.length;
  const desvio = Math.sqrt(variance);

  return { media, mediana, min, max, desvio };
}

export function useAggregations(filteredData, filters) {
  return useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalRegistros: 0,
        precoMedio: 0,
        precoMin: 0,
        precoMax: 0,
        precoMediana: 0,
        volatilidade: 0,
        cagr: 0,
        timeSeries: [],
        byCategoria: [],
        bySubcategoria: [],
        timeSeriesBySubcategoria: {},
        byTerritorio: [],
      };
    }

    const valores = filteredData.map(row => row.preco).filter(v => Number.isFinite(v));
    const stats = computeStats(valores);

    const byAno = groupBy(filteredData, row => row.ano);
    const timeSeries = Array.from(byAno.entries())
      .map(([ano, rows]) => {
        const precoStats = computeStats(rows.map(r => r.preco).filter(v => Number.isFinite(v)));
        return {
          ano,
          media: precoStats.media,
          mediana: precoStats.mediana,
          min: precoStats.min,
          max: precoStats.max,
          registros: rows.length,
        };
      })
      .sort((a, b) => a.ano - b.ano);

    const cagr = (() => {
      if (timeSeries.length < 2) return 0;
      const first = timeSeries[0].media || 0;
      const last = timeSeries[timeSeries.length - 1].media || 0;
      const years = timeSeries.length - 1;
      if (first <= 0 || last <= 0) return 0;
      return (last / first) ** (1 / years) - 1;
    })();

    const byCategoria = Array.from(groupBy(filteredData, row => row.categoria || 'Sem categoria').entries())
      .map(([categoria, rows]) => {
        const precoStats = computeStats(rows.map(r => r.preco).filter(v => Number.isFinite(v)));
        return {
          categoria,
          media: precoStats.media,
          mediana: precoStats.mediana,
          min: precoStats.min,
          max: precoStats.max,
          registros: rows.length,
        };
      })
      .sort((a, b) => b.media - a.media);

    const bySubcategoria = Array.from(groupBy(filteredData, row => row.subcategoria || 'Sem subcategoria').entries())
      .map(([subcategoria, rows]) => {
        const precoStats = computeStats(rows.map(r => r.preco).filter(v => Number.isFinite(v)));
        const categoria = rows[0]?.categoria || '';
        return {
          subcategoria,
          categoria,
          media: precoStats.media,
          mediana: precoStats.mediana,
          min: precoStats.min,
          max: precoStats.max,
          registros: rows.length,
        };
      })
      .sort((a, b) => {
        if (a.subcategoria < b.subcategoria) return -1;
        if (a.subcategoria > b.subcategoria) return 1;
        return 0;
      });

    const timeSeriesBySubcategoria = {};
    const subcategorias = [...new Set(filteredData.map(r => r.subcategoria).filter(Boolean))];
    subcategorias.forEach(sub => {
      const subData = filteredData.filter(r => r.subcategoria === sub);
      const byAnoSub = groupBy(subData, row => row.ano);
      timeSeriesBySubcategoria[sub] = Array.from(byAnoSub.entries())
        .map(([ano, rows]) => {
          const precoStats = computeStats(rows.map(r => r.preco).filter(v => Number.isFinite(v)));
          return {
            ano,
            media: precoStats.media,
            mediana: precoStats.mediana,
            min: precoStats.min,
            max: precoStats.max,
            registros: rows.length,
          };
        })
        .sort((a, b) => a.ano - b.ano);
    });

    const byTerritorio = Array.from(groupBy(filteredData, row => row.territorio || 'Sem territorio').entries())
      .map(([territorio, rows]) => {
        const precoStats = computeStats(rows.map(r => r.preco).filter(v => Number.isFinite(v)));
        return {
          territorio,
          codigo: rows[0]?.territorio_codigo || null,
          nivel: rows[0]?.nivel || filters.nivel,
          media: precoStats.media,
          mediana: precoStats.mediana,
          min: precoStats.min,
          max: precoStats.max,
          registros: rows.length,
        };
      })
      .sort((a, b) => b.media - a.media);

    return {
      totalRegistros: filteredData.length,
      precoMedio: stats.media,
      precoMin: stats.min,
      precoMax: stats.max,
      precoMediana: stats.mediana,
      volatilidade: stats.desvio,
      cagr,
      timeSeries,
      byCategoria,
      bySubcategoria,
      timeSeriesBySubcategoria,
      byTerritorio,
    };
  }, [filteredData, filters.nivel]);
}

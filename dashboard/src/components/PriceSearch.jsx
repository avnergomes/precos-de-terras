import { useEffect, useMemo, useState } from 'react';
import { CLASSE_LABELS } from '../utils/nomenclatura';

const INITIAL_AREAS = Object.keys(CLASSE_LABELS).reduce((acc, classe) => {
  acc[classe] = 0;
  return acc;
}, {});

function normalizeAreas(areas) {
  return Object.entries(areas).reduce((acc, [classe, value]) => {
    const parsed = parseFloat(value);
    acc[classe] = Number.isFinite(parsed) ? parsed : 0;
    return acc;
  }, {});
}

function formatBRL(value) {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  const formatted = value.toFixed(2).replace('.', ',');
  return `R$ ${formatted}`;
}

export default function PriceSearch({ metadata, detailed }) {
  const [municipio, setMunicipio] = useState('');
  const [areas, setAreas] = useState(INITIAL_AREAS);
  const [totalArea, setTotalArea] = useState(0);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const soma = Object.values(areas).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
    setTotalArea(soma);
  }, [areas]);

  const municipios = useMemo(() => {
    return metadata?.territorios?.Municipio || [];
  }, [metadata]);

  const apiBase = import.meta.env.VITE_PRICE_SEARCH_URL;
  const canSearch = Boolean(municipio) && totalArea > 0 && !loading && Boolean(apiBase);

  const handleAreaChange = (classe, valor) => {
    setAreas(prev => ({ ...prev, [classe]: valor }));
  };

  const handlePesquisar = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError('');
    setResultados([]);
    setHasSearched(true);

    try {
      const response = await fetch(`${apiBase}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          municipio,
          areas: normalizeAreas(areas),
          area_total: totalArea,
        }),
      });

      if (!response.ok) {
        throw new Error('Resposta invalida do servidor');
      }

      const data = await response.json();
      setResultados(data?.resultados || []);
      setLastSearch(new Date());
    } catch (err) {
      console.error('Erro ao buscar precos:', err);
      setError('Nao foi possivel concluir a pesquisa agora.');
    } finally {
      setLoading(false);
    }
  };

  if (!metadata) return null;

  const resultadosExibidos = resultados.slice(0, 6);
  const deralEstimate = useMemo(() => {
    if (!municipio || !detailed?.length) return null;
    const rows = detailed.filter(row =>
      row.nivel === 'Municipio' &&
      row.territorio === municipio &&
      Object.prototype.hasOwnProperty.call(CLASSE_LABELS, row.subcategoria)
    );
    if (!rows.length) return null;

    const prices = {};
    const yearsByClass = {};

    rows.forEach(row => {
      if (!Number.isFinite(row.preco)) return;
      const classe = row.subcategoria;
      const year = row.ano || 0;
      const currentYear = yearsByClass[classe] || 0;
      if (year >= currentYear) {
        yearsByClass[classe] = year;
        prices[classe] = row.preco;
      }
    });

    const weightedTotal = Object.entries(areas).reduce((acc, [classe, valor]) => {
      const area = parseFloat(valor) || 0;
      const preco = prices[classe];
      if (!Number.isFinite(preco)) return acc;
      return acc + area * preco;
    }, 0);

    const weightedAvg = totalArea > 0 ? weightedTotal / totalArea : 0;
    const years = Object.values(yearsByClass).filter(Boolean);
    if (!years.length) {
      return { total: 0, media: 0, ano: null, hasPrices: false };
    }
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const yearLabel = minYear === maxYear ? String(maxYear) : `${minYear}-${maxYear}`;

    return {
      total: weightedTotal,
      media: weightedAvg,
      ano: yearLabel,
      hasPrices: Object.keys(prices).length > 0,
    };
  }, [municipio, detailed, areas, totalArea]);

  return (
    <div className="card p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pesquisa de preco</h2>
        {!apiBase && (
          <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
            Configure VITE_PRICE_SEARCH_URL para habilitar a pesquisa
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="filter-label">Municipio</label>
          <select
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            className="filter-select w-full"
          >
            <option value="">Selecione um municipio</option>
            {municipios.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-earth-500">
                <th className="p-2">Classe</th>
                <th className="p-2">Descricao</th>
                <th className="p-2">Area (ha)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(CLASSE_LABELS).map(classe => (
                <tr key={classe} className="border-t border-earth-100">
                  <td className="p-2 font-semibold">{classe}</td>
                  <td className="p-2">{CLASSE_LABELS[classe]}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={areas[classe]}
                      onChange={(e) => handleAreaChange(classe, e.target.value)}
                      className="w-28 border border-earth-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-medium text-earth-700">
            Total: <span className="font-bold text-earth-900">{totalArea.toFixed(2)} ha</span>
          </div>
          <div className="text-sm text-earth-600">
            {municipio ? (
              deralEstimate?.hasPrices ? (
                <>
                  Estimativa DERAL (ref. {deralEstimate.ano}):{' '}
                  <span className="font-semibold text-earth-900">
                    {formatBRL(deralEstimate.media)}/ha
                  </span>
                </>
              ) : (
                <span>Sem dados DERAL para o municipio selecionado.</span>
              )
            ) : (
              <span>Selecione um municipio para ver a estimativa DERAL.</span>
            )}
          </div>
          <button
            disabled={!canSearch}
            onClick={handlePesquisar}
            className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:bg-earth-200 disabled:text-earth-500 transition-colors"
          >
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </div>
      )}

      {hasSearched && !loading && resultadosExibidos.length === 0 && !error && (
        <div className="text-sm text-earth-500">
          Nenhum resultado encontrado na pesquisa online.
        </div>
      )}

      {resultadosExibidos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-earth-800">Resultados encontrados</h3>
          <div className="grid grid-cols-1 gap-3">
            {resultadosExibidos.map((item, index) => (
              <div key={`${item.link || index}`} className="border border-earth-100 rounded-lg p-4">
                <div className="font-semibold text-earth-900">{item.titulo || 'Anuncio sem titulo'}</div>
                {item.preco && <div className="text-forest-700">Preco: {item.preco}</div>}
                {item.area && <div className="text-forest-700">Area: {item.area}</div>}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-forest-600 hover:text-forest-700 underline mt-2"
                  >
                    Acessar anuncio
                  </a>
                )}
              </div>
            ))}
          </div>
          {lastSearch && (
            <div className="text-xs text-earth-500">
              Ultima pesquisa: {lastSearch.toLocaleString('pt-BR')}
            </div>
          )}
        </div>
      )}

      {deralEstimate?.hasPrices && totalArea > 0 && (
        <div className="border border-earth-100 rounded-lg p-4 bg-earth-50/60">
          <div className="font-semibold text-earth-800">Estimativa DERAL (ponderada)</div>
          <div className="text-sm text-earth-600">
            Ano de referencia: {deralEstimate.ano}
          </div>
          <div className="text-sm text-earth-700 mt-2">
            Media ponderada: <span className="font-semibold">{formatBRL(deralEstimate.media)}/ha</span>
          </div>
          <div className="text-sm text-earth-700">
            Valor total estimado: <span className="font-semibold">{formatBRL(deralEstimate.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { CLASSE_LABELS } from '../utils/nomenclatura';

const CLASSES = Object.keys(CLASSE_LABELS);

const INITIAL_AREAS = CLASSES.reduce((acc, classe) => {
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
  if (!Number.isFinite(value) || value === 0) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // DERAL estimate: prices per class + weighted average
  const deralData = useMemo(() => {
    if (!municipio || !detailed?.length) return null;

    const rows = detailed.filter(row =>
      row.nivel === 'Municipio' &&
      row.territorio === municipio &&
      CLASSES.includes(row.subcategoria)
    );
    if (!rows.length) return null;

    const prices = {};
    const years = {};

    rows.forEach(row => {
      if (!Number.isFinite(row.preco)) return;
      const classe = row.subcategoria;
      const year = row.ano || 0;
      const currentYear = years[classe] || 0;
      if (year >= currentYear) {
        years[classe] = year;
        prices[classe] = row.preco;
      }
    });

    if (Object.keys(prices).length === 0) return null;

    const allYears = Object.values(years).filter(Boolean);
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    const yearLabel = minYear === maxYear ? String(maxYear) : `${minYear}\u2013${maxYear}`;

    return { prices, years, yearLabel };
  }, [municipio, detailed]);

  // Per-class subtotals and weighted average
  const estimate = useMemo(() => {
    if (!deralData) return null;

    let weightedTotal = 0;
    let areaWithPrice = 0;
    const subtotals = {};

    CLASSES.forEach(classe => {
      const area = parseFloat(areas[classe]) || 0;
      const preco = deralData.prices[classe];
      if (area > 0 && Number.isFinite(preco)) {
        const subtotal = area * preco;
        subtotals[classe] = subtotal;
        weightedTotal += subtotal;
        areaWithPrice += area;
      }
    });

    const weightedAvg = areaWithPrice > 0 ? weightedTotal / areaWithPrice : 0;

    return { subtotals, total: weightedTotal, media: weightedAvg };
  }, [deralData, areas]);

  if (!metadata) return null;

  const resultadosExibidos = resultados.slice(0, 6);

  return (
    <div className="card p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Pesquisa de preco</h2>
        {!apiBase && (
          <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
            Configure VITE_PRICE_SEARCH_URL para habilitar a pesquisa online
          </span>
        )}
      </div>

      {/* Municipality selector */}
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

      {/* Class table with DERAL prices */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-earth-500">
              <th className="p-2">Classe</th>
              <th className="p-2">Descricao</th>
              <th className="p-2 text-right">R$/ha (DERAL)</th>
              <th className="p-2 text-right">Ref.</th>
              <th className="p-2 text-right">Area (ha)</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map(classe => {
              const preco = deralData?.prices[classe];
              const year = deralData?.years[classe];
              const area = parseFloat(areas[classe]) || 0;
              const subtotal = (area > 0 && Number.isFinite(preco)) ? area * preco : null;
              const hasPrice = Number.isFinite(preco);

              return (
                <tr key={classe} className="border-t border-earth-100">
                  <td className="p-2 font-semibold">{classe}</td>
                  <td className="p-2">{CLASSE_LABELS[classe]}</td>
                  <td className={`p-2 text-right font-medium ${hasPrice ? 'text-earth-900' : 'text-earth-300'}`}>
                    {hasPrice ? formatBRL(preco) : 's/d'}
                  </td>
                  <td className="p-2 text-right text-earth-400 text-xs">
                    {year || ''}
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={areas[classe]}
                      onChange={(e) => handleAreaChange(classe, e.target.value)}
                      className="w-28 border border-earth-200 rounded-lg px-2 py-1 text-right focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
                    />
                  </td>
                  <td className={`p-2 text-right font-medium ${subtotal ? 'text-earth-900' : 'text-earth-300'}`}>
                    {subtotal ? formatBRL(subtotal) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {(totalArea > 0 || (deralData && estimate)) && (
            <tfoot>
              <tr className="border-t-2 border-earth-300 font-semibold text-earth-900">
                <td className="p-2" colSpan={2}>Total</td>
                <td className="p-2 text-right">
                  {estimate?.media ? formatBRL(estimate.media) + '/ha' : '-'}
                </td>
                <td className="p-2 text-right text-xs text-earth-400">
                  {deralData?.yearLabel || ''}
                </td>
                <td className="p-2 text-right">{totalArea.toFixed(2)} ha</td>
                <td className="p-2 text-right">
                  {estimate?.total ? formatBRL(estimate.total) : '-'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Estimate summary card */}
      {estimate && totalArea > 0 && estimate.total > 0 && (
        <div className="border border-forest-200 rounded-lg p-4 bg-forest-50/40">
          <div className="font-semibold text-earth-800">Estimativa DERAL (ponderada)</div>
          <div className="text-sm text-earth-600">
            Referencia: {deralData?.yearLabel} &middot; Municipio: {municipio}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <div className="text-xs text-earth-500">Media ponderada</div>
              <div className="text-lg font-bold text-forest-700">{formatBRL(estimate.media)}/ha</div>
            </div>
            <div>
              <div className="text-xs text-earth-500">Valor total estimado</div>
              <div className="text-lg font-bold text-forest-700">{formatBRL(estimate.total)}</div>
            </div>
          </div>
        </div>
      )}

      {municipio && !deralData && (
        <div className="text-sm text-earth-500 bg-earth-50 rounded-lg p-3">
          Sem dados DERAL para o municipio selecionado.
        </div>
      )}

      {/* Search button */}
      <div className="flex justify-end">
        <button
          disabled={!canSearch}
          onClick={handlePesquisar}
          className="px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:bg-earth-200 disabled:text-earth-500 transition-colors"
        >
          {loading ? 'Pesquisando...' : 'Pesquisar online'}
        </button>
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
                {item.municipio && <div className="text-forest-700">Municipio: {item.municipio}</div>}
                {item.preco && <div className="text-forest-700">Valor: {item.preco}</div>}
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
    </div>
  );
}

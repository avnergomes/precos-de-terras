import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Layers3, TrendingUp, Grid3X3 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { getClasseLabel } from '../utils/nomenclatura';

const SUBCATEGORIA_COLORS = {
  'A-I': '#2d6a4f',
  'A-II': '#40916c',
  'A-III': '#52b788',
  'A-IV': '#74c69d',
  'B-V': '#1d4e89',
  'B-VI': '#2a6db0',
  'B-VII': '#4a90d9',
  'C-VIII': '#9d4edd',
};

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSubcategoria = data.subcategoria !== undefined;
    const label = isSubcategoria ? data.subcategoria : data.categoria;
    const description = getClasseLabel(label, 'sipt');

    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-earth-200">
        <p className="text-sm font-medium text-earth-900">{description}</p>
        <p className="text-xs text-earth-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-forest-600">{formatCurrency(data.media)}</p>
        <p className="text-xs text-earth-400">{data.registros} registros</p>
      </div>
    );
  }
  return null;
}

function TimeSeriesCustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-earth-200 max-w-xs">
        <p className="text-sm font-semibold text-earth-900 mb-2">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs mb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-earth-600">{item.name}</span>
            </span>
            <span className="font-medium" style={{ color: item.color }}>{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function SubcategoriaCard({ item, isSelected, onClick }) {
  const description = getClasseLabel(item.subcategoria, 'sipt') || item.subcategoria;
  const color = SUBCATEGORIA_COLORS[item.subcategoria] || '#62929E';

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-forest-500 bg-forest-50 shadow-md'
          : 'border-earth-200 bg-white hover:border-earth-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded"
          style={{ backgroundColor: color, color: '#fff' }}
        >
          {item.subcategoria}
        </span>
        <span className="text-xs text-earth-400">{item.registros} reg.</span>
      </div>
      <p className="text-xs text-earth-600 mb-1 line-clamp-2" title={description}>{description}</p>
      <p className="text-lg font-bold text-earth-800">{formatCurrency(item.media)}</p>
      <div className="flex justify-between text-xs text-earth-400 mt-1">
        <span>Min: {formatCurrency(item.min)}</span>
        <span>Max: {formatCurrency(item.max)}</span>
      </div>
    </div>
  );
}

export default function CategoryChart({ data }) {
  const [viewMode, setViewMode] = useState('subcategorias');
  const [selectedSubcategorias, setSelectedSubcategorias] = useState([]);

  const chartData = useMemo(() => {
    if (!data?.byCategoria?.length) return [];
    return data.byCategoria.map(item => ({
      ...item,
      categoriaLabel: getClasseLabel(item.categoria, 'sipt') || item.categoria
    }));
  }, [data?.byCategoria]);

  const subcategoriaData = useMemo(() => {
    if (!data?.bySubcategoria?.length) return [];
    return data.bySubcategoria.map(item => ({
      ...item,
      subcategoriaLabel: getClasseLabel(item.subcategoria, 'sipt') || item.subcategoria
    }));
  }, [data?.bySubcategoria]);

  const timeSeriesChartData = useMemo(() => {
    if (!data?.timeSeriesBySubcategoria || selectedSubcategorias.length === 0) return [];

    const allYears = new Set();
    selectedSubcategorias.forEach(sub => {
      const series = data.timeSeriesBySubcategoria[sub] || [];
      series.forEach(point => allYears.add(point.ano));
    });

    const sortedYears = Array.from(allYears).sort((a, b) => a - b);

    return sortedYears.map(ano => {
      const point = { ano };
      selectedSubcategorias.forEach(sub => {
        const series = data.timeSeriesBySubcategoria[sub] || [];
        const match = series.find(s => s.ano === ano);
        point[sub] = match?.media || null;
      });
      return point;
    });
  }, [data?.timeSeriesBySubcategoria, selectedSubcategorias]);

  const toggleSubcategoria = (sub) => {
    setSelectedSubcategorias(prev => {
      if (prev.includes(sub)) {
        return prev.filter(s => s !== sub);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), sub];
      }
      return [...prev, sub];
    });
  };

  if (!data?.byCategoria?.length) {
    return (
      <div className="chart-container">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-accent-100 rounded-lg">
            <Layers3 className="w-5 h-5 text-accent-600" />
          </div>
          <h3 className="section-title">Distribuicao por categoria</h3>
        </div>
        <div className="text-sm text-neutral-500">Sem dados para o periodo selecionado.</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-100 rounded-lg">
            <Layers3 className="w-5 h-5 text-accent-600" />
          </div>
          <h3 className="section-title">Distribuicao por categoria</h3>
        </div>

        <div className="flex gap-1 bg-earth-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('categorias')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'categorias'
                ? 'bg-white text-earth-800 shadow-sm'
                : 'text-earth-500 hover:text-earth-700'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5 inline mr-1" />
            Grupos
          </button>
          <button
            onClick={() => setViewMode('subcategorias')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'subcategorias'
                ? 'bg-white text-earth-800 shadow-sm'
                : 'text-earth-500 hover:text-earth-700'
            }`}
          >
            <Layers3 className="w-3.5 h-3.5 inline mr-1" />
            Classes
          </button>
          <button
            onClick={() => setViewMode('timeseries')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'timeseries'
                ? 'bg-white text-earth-800 shadow-sm'
                : 'text-earth-500 hover:text-earth-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
            Evolucao
          </button>
        </div>
      </div>

      {viewMode === 'categorias' && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 120, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="categoriaLabel" width={110} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="media" fill="#62929E" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === 'subcategorias' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {subcategoriaData.map((item) => (
              <SubcategoriaCard
                key={item.subcategoria}
                item={item}
                isSelected={selectedSubcategorias.includes(item.subcategoria)}
                onClick={() => toggleSubcategoria(item.subcategoria)}
              />
            ))}
          </div>
          {selectedSubcategorias.length > 0 && (
            <p className="text-xs text-earth-500 text-center">
              {selectedSubcategorias.length} classe(s) selecionada(s) - veja a evolucao na aba "Evolucao"
            </p>
          )}
        </>
      )}

      {viewMode === 'timeseries' && (
        <>
          {selectedSubcategorias.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-earth-300 mx-auto mb-3" />
              <p className="text-earth-500 mb-2">Selecione classes para ver a evolucao</p>
              <p className="text-xs text-earth-400">
                Clique nas classes na aba "Classes" (maximo 4)
              </p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<TimeSeriesCustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px' }}
                    formatter={(value) => getClasseLabel(value, 'sipt') || value}
                  />
                  {selectedSubcategorias.map((sub) => (
                    <Line
                      key={sub}
                      type="monotone"
                      dataKey={sub}
                      name={sub}
                      stroke={SUBCATEGORIA_COLORS[sub] || '#62929E'}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

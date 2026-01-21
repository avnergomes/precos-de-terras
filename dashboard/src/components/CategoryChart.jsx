import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Layers3 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { getClasseLabel } from '../utils/nomenclatura';

// Componente de tooltip customizado
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-earth-200">
        <p className="text-sm font-medium text-earth-900">{getClasseLabel(data.categoria, 'sipt')}</p>
        <p className="text-xs text-earth-500 mb-1">{data.categoria}</p>
        <p className="text-sm font-bold text-forest-600">{formatCurrency(data.media)}</p>
        <p className="text-xs text-earth-400">{data.registros} registros</p>
      </div>
    );
  }
  return null;
}

export default function CategoryChart({ data }) {
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

  // Formata os dados com labels legíveis
  const chartData = data.byCategoria.map(item => ({
    ...item,
    categoriaLabel: getClasseLabel(item.categoria, 'sipt') || item.categoria
  }));

  return (
    <div className="chart-container">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-accent-100 rounded-lg">
          <Layers3 className="w-5 h-5 text-accent-600" />
        </div>
        <h3 className="section-title">Distribuicao por categoria</h3>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 180, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis type="category" dataKey="categoriaLabel" width={160} tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="media" fill="#62929E" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

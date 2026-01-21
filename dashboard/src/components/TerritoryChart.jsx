import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { MapPin } from 'lucide-react';
import { formatCurrency } from '../utils/format';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-earth-200">
        <p className="text-sm font-medium text-earth-900">{data.territorio}</p>
        <p className="text-sm font-bold text-primary-600">{formatCurrency(data.media)}</p>
        <p className="text-xs text-earth-400">{data.registros} registros</p>
      </div>
    );
  }
  return null;
}

export default function TerritoryChart({ data, nivel }) {
  const top = (data?.byTerritorio || []).slice(0, 5);

  if (!top.length) {
    return (
      <div className="chart-container h-full flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <MapPin className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="section-title">Ranking territorial</h3>
        </div>
        <div className="text-sm text-neutral-500">Sem dados para o periodo selecionado.</div>
      </div>
    );
  }

  return (
    <div className="chart-container h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg">
          <MapPin className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="section-title">Ranking territorial</h3>
          <p className="text-xs text-neutral-500">Top 5 - {nivel}</p>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={top}
            layout="vertical"
            margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 10 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              type="category"
              dataKey="territorio"
              width={120}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="media" radius={[0, 6, 6, 0]} barSize={28}>
              {top.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === 0 ? '#3d5a68' : '#546A7B'}
                  fillOpacity={1 - index * 0.12}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

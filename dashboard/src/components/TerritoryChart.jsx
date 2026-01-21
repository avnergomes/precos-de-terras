import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MapPin } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function TerritoryChart({ data, nivel }) {
  const top = (data?.byTerritorio || []).slice(0, 10);

  if (!top.length) {
    return (
      <div className="chart-container">
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
    <div className="chart-container">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-100 rounded-lg">
          <MapPin className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="section-title">Ranking territorial</h3>
          <p className="text-xs text-neutral-500">Top 10 - {nivel}</p>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis type="category" dataKey="territorio" width={180} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="media" fill="#546A7B" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Layers3 } from 'lucide-react';
import { formatCurrency } from '../utils/format';

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
          <BarChart data={data.byCategoria} layout="vertical" margin={{ top: 0, right: 10, left: 50, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
            <YAxis type="category" dataKey="categoria" width={160} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="media" fill="#62929E" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

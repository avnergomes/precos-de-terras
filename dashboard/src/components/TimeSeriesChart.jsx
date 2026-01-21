import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CalendarRange } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function TimeSeriesChart({ data }) {
  if (!data?.timeSeries?.length) {
    return (
      <div className="chart-container">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-water-100 rounded-lg">
            <CalendarRange className="w-5 h-5 text-water-600" />
          </div>
          <h3 className="section-title">Serie historica de precos</h3>
        </div>
        <div className="text-sm text-neutral-500">Sem dados para o periodo selecionado.</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-water-100 rounded-lg">
          <CalendarRange className="w-5 h-5 text-water-600" />
        </div>
        <h3 className="section-title">Serie historica de precos</h3>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.timeSeries} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Ano ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="media" stroke="#62929E" strokeWidth={2.5} dot={false} name="Media" />
            <Line type="monotone" dataKey="mediana" stroke="#546A7B" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Mediana" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

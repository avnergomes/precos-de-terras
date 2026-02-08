import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { CalendarRange } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function TimeSeriesChart({ data, onAnoClick, selectedAno }) {
  const chartData = useMemo(() => {
    if (!data?.timeSeries?.length) return [];
    return data.timeSeries.map(item => ({
      ...item,
      isSelected: item.ano === selectedAno,
    }));
  }, [data?.timeSeries, selectedAno]);

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

  const handleChartClick = (event) => {
    if (event?.activePayload?.[0]?.payload?.ano && onAnoClick) {
      onAnoClick(event.activePayload[0].payload.ano);
    }
  };

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
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            onClick={handleChartClick}
            style={{ cursor: onAnoClick ? 'pointer' : 'default' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => `Ano ${label}`}
            />
            <Legend />
            {selectedAno && (
              <ReferenceLine
                x={selectedAno}
                stroke="#1f2937"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{ value: selectedAno, position: 'top', fontSize: 12, fontWeight: 600 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="media"
              stroke="#62929E"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#62929E' }}
              activeDot={{ r: 6, fill: '#62929E', stroke: '#1f2937', strokeWidth: 2 }}
              name="Media"
            />
            <Line
              type="monotone"
              dataKey="mediana"
              stroke="#546A7B"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              name="Mediana"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-center text-neutral-500 mt-2">
        Clique em um ponto para filtrar por ano
      </p>
    </div>
  );
}

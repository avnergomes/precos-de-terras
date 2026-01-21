import { ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/format';

export default function RankingTable({ data, title, levelLabel }) {
  const rows = data?.byTerritorio?.slice(0, 15) || [];

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">{title}</h3>
        <span className="text-xs text-neutral-500">{levelLabel}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-neutral-500">Sem dados para o periodo selecionado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-neutral-200">
                <th className="py-2 pr-4">Posicao</th>
                <th className="py-2 pr-4">Territorio</th>
                <th className="py-2 pr-4">Preco medio</th>
                <th className="py-2 pr-4">Min</th>
                <th className="py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.territorio} className="border-b border-neutral-100 hover:bg-primary-50/40">
                  <td className="py-2 pr-4 text-neutral-500">#{index + 1}</td>
                  <td className="py-2 pr-4 font-medium text-dark-900 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary-500" />
                    {row.territorio}
                  </td>
                  <td className="py-2 pr-4">{formatCurrency(row.media)}</td>
                  <td className="py-2 pr-4 text-neutral-600">{formatCurrency(row.min)}</td>
                  <td className="py-2">{formatCurrency(row.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { TrendingUp, TrendingDown, Sigma, Gauge, Map } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/format';

export default function KpiCards({ data }) {
  const growthPositive = data.cagr >= 0;

  const accents = {
    primary: { bg: 'bg-primary-100', text: 'text-primary-600' },
    secondary: { bg: 'bg-secondary-100', text: 'text-secondary-600' },
    accent: { bg: 'bg-accent-100', text: 'text-accent-600' },
  };

  const kpis = [
    {
      label: 'Preco medio',
      value: formatCurrency(data.precoMedio),
      icon: Gauge,
      accent: 'primary',
    },
    {
      label: 'Preco mediana',
      value: formatCurrency(data.precoMediana),
      icon: Sigma,
      accent: 'secondary',
    },
    {
      label: 'Menor valor',
      value: formatCurrency(data.precoMin),
      icon: TrendingDown,
      accent: 'accent',
    },
    {
      label: 'Maior valor',
      value: formatCurrency(data.precoMax),
      icon: TrendingUp,
      accent: 'primary',
    },
    {
      label: 'Crescimento anual',
      value: formatPercent(data.cagr),
      icon: TrendingUp,
      accent: growthPositive ? 'primary' : 'accent',
    },
    {
      label: 'Volatilidade',
      value: formatNumber(data.volatilidade),
      icon: Map,
      accent: 'secondary',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => (
        <div key={index} className="stat-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value">{kpi.value}</div>
            </div>
            <div className={`p-3 rounded-xl ${accents[kpi.accent].bg}`}>
              <kpi.icon className={`w-5 h-5 ${accents[kpi.accent].text}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

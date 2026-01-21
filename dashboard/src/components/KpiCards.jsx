import { TrendingUp, TrendingDown, Sigma, Gauge, Map, Info } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../utils/format';
import { useState } from 'react';

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-earth-800 rounded-lg shadow-lg whitespace-nowrap max-w-xs text-center">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-earth-800" />
        </div>
      )}
    </div>
  );
}

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
      tooltip: 'Media aritmetica dos precos por hectare no periodo e filtros selecionados',
    },
    {
      label: 'Preco mediana',
      value: formatCurrency(data.precoMediana),
      icon: Sigma,
      accent: 'secondary',
      tooltip: 'Valor central da distribuicao de precos. Menos sensivel a valores extremos que a media',
    },
    {
      label: 'Menor valor',
      value: formatCurrency(data.precoMin),
      icon: TrendingDown,
      accent: 'accent',
      tooltip: 'Menor preco por hectare registrado no periodo e filtros selecionados',
    },
    {
      label: 'Maior valor',
      value: formatCurrency(data.precoMax),
      icon: TrendingUp,
      accent: 'primary',
      tooltip: 'Maior preco por hectare registrado no periodo e filtros selecionados',
    },
    {
      label: 'Crescimento anual',
      value: formatPercent(data.cagr),
      icon: TrendingUp,
      accent: growthPositive ? 'primary' : 'accent',
      tooltip: 'Taxa de crescimento anual composta (CAGR). Indica a valorizacao media anual no periodo',
    },
    {
      label: 'Volatilidade',
      value: formatNumber(data.volatilidade),
      icon: Map,
      accent: 'secondary',
      tooltip: 'Desvio padrao dos precos. Mede a dispersao dos valores em torno da media',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, index) => (
        <div key={index} className="stat-card card-hover">
          <div className="flex items-center justify-between">
            <div>
              <div className="kpi-label flex items-center gap-1.5">
                {kpi.label}
                <Tooltip text={kpi.tooltip}>
                  <Info className="w-3.5 h-3.5 text-earth-400 hover:text-earth-600" />
                </Tooltip>
              </div>
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

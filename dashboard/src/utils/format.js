const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  if (!Number.isFinite(value)) return 'R$ -';
  return currencyFormatter.format(value);
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return '-';
  return numberFormatter.format(value);
}

export function formatCompact(value) {
  if (!Number.isFinite(value)) return '-';
  return compactFormatter.format(value);
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return percentFormatter.format(value);
}

export const mapGradient = [
  '#e2f3f5',
  '#b5dfe4',
  '#85c5cf',
  '#62929e',
  '#4a7a86',
  '#3d646f',
  '#2d4a53',
];

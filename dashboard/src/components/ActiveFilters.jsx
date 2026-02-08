import { X } from 'lucide-react';

const labels = {
  categoria: 'Categoria',
  subcategoria: 'Classe',
  territorio: 'Território',
  ano: 'Ano',
};

export default function ActiveFilters({ filters, onRemove, onClear }) {
  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== null);

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-primary-50 rounded-lg mb-4">
      <span className="text-sm font-medium text-primary-700">Filtros do gráfico:</span>
      {activeFilters.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
        >
          <span className="text-primary-600">{labels[key] || key}:</span>
          <span>{value}</span>
          <button
            onClick={() => onRemove(key)}
            className="ml-0.5 p-0.5 hover:bg-primary-200 rounded-full transition-colors"
            aria-label={`Remover filtro ${labels[key] || key}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <button
        onClick={onClear}
        className="text-sm text-primary-600 hover:text-primary-800 hover:underline ml-2 font-medium"
      >
        Limpar todos
      </button>
    </div>
  );
}

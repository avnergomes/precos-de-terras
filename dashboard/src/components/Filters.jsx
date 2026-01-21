import { useMemo, useState } from 'react';
import { Filter, ChevronDown, ChevronUp, RotateCcw, Download } from 'lucide-react';
import { getClasseLabel, isNovoFormato } from '../utils/nomenclatura';

export default function Filters({ metadata, detailed, filters, onFiltersChange, filteredData }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!metadata) return null;

  const { anos, nivel, territorios, categorias, subcategorias, classes } = filters;
  const [anoMin, anoMax] = anos;

  const availableTerritorios = useMemo(() => {
    if (!nivel || !metadata.territorios?.[nivel]) return [];
    return metadata.territorios[nivel];
  }, [metadata, nivel]);

  const availableSubcategorias = useMemo(() => {
    if (!detailed?.length) return metadata.subcategorias || [];
    const subset = detailed.filter(row =>
      (!categorias.length || categorias.includes(row.categoria))
    );
    const set = new Set();
    subset.forEach(row => {
      if (row.subcategoria) set.add(row.subcategoria);
    });
    return Array.from(set).sort();
  }, [detailed, categorias, metadata]);

  const availableClasses = useMemo(() => {
    if (!detailed?.length) return metadata.classes || [];
    const subset = detailed.filter(row =>
      (!categorias.length || categorias.includes(row.categoria)) &&
      (!subcategorias.length || subcategorias.includes(row.subcategoria))
    );
    const set = new Set();
    subset.forEach(row => {
      if (row.classe) set.add(row.classe);
    });
    return Array.from(set).sort();
  }, [detailed, categorias, subcategorias, metadata]);

  const handleReset = () => {
    onFiltersChange({
      anos: [metadata.anoMin, metadata.anoMax],
      nivel: metadata.niveis?.[0] || '',
      territorios: [],
      categorias: [],
      subcategorias: [],
      classes: [],
    });
  };

  const hasActiveFilters =
    territorios.length > 0 ||
    categorias.length > 0 ||
    subcategorias.length > 0 ||
    classes.length > 0 ||
    anoMin !== metadata.anoMin ||
    anoMax !== metadata.anoMax;

  const handleExportCSV = () => {
    if (!filteredData?.length) return;
    let csvContent = 'ano,nivel,territorio,codigo,categoria,subcategoria,classe,preco,unidade\n';
    filteredData.forEach(row => {
      const linha = [
        row.ano,
        row.nivel,
        `"${row.territorio || ''}"`,
        row.territorio_codigo || '',
        `"${row.categoria || ''}"`,
        `"${row.subcategoria || ''}"`,
        `"${row.classe || ''}"`,
        row.preco,
        row.unidade || ''
      ].join(',');
      csvContent += `${linha}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `precos_terras_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card p-4 md:p-6 relative z-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <Filter className="w-5 h-5 text-forest-600" />
          </div>
          <h2 className="text-lg font-display font-bold text-earth-900">Filtros</h2>
          {hasActiveFilters && (
            <span className="badge badge-green">Ativos</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-forest-600 hover:bg-forest-700
                       rounded-lg transition-colors"
            title="Exportar dados filtrados em CSV"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-earth-600 hover:text-forest-600
                         hover:bg-forest-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-earth-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-earth-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-earth-500" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="filter-label">Periodo</label>
            <div className="flex items-center gap-3">
              <select
                value={anoMin}
                onChange={(e) => onFiltersChange({ ...filters, anos: [parseInt(e.target.value, 10), anoMax] })}
                className="filter-select flex-1"
              >
                {metadata.anos?.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
              <span className="text-earth-400 font-medium">ate</span>
              <select
                value={anoMax}
                onChange={(e) => onFiltersChange({ ...filters, anos: [anoMin, parseInt(e.target.value, 10)] })}
                className="filter-select flex-1"
              >
                {metadata.anos?.filter(a => a >= anoMin).map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="filter-label">Nivel Territorial</label>
            <select
              value={nivel}
              onChange={(e) => onFiltersChange({ ...filters, nivel: e.target.value, territorios: [] })}
              className="filter-select"
            >
              {metadata.niveis?.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="filter-label">Territorio</label>
            <MultiSelect
              options={availableTerritorios}
              selected={territorios}
              onChange={(val) => onFiltersChange({ ...filters, territorios: val })}
              placeholder="Todos"
            />
          </div>

          <div>
            <label className="filter-label">Categoria</label>
            <MultiSelect
              options={metadata.categorias || []}
              selected={categorias}
              onChange={(val) => onFiltersChange({ ...filters, categorias: val, subcategorias: [], classes: [] })}
              placeholder="Todas"
            />
          </div>

          <div>
            <label className="filter-label">Subcategoria</label>
            <MultiSelect
              options={availableSubcategorias}
              selected={subcategorias}
              onChange={(val) => onFiltersChange({ ...filters, subcategorias: val, classes: [] })}
              placeholder="Todas"
              useLabels={true}
            />
          </div>

          <div>
            <label className="filter-label">Classe</label>
            <MultiSelect
              options={availableClasses}
              selected={classes}
              onChange={(val) => onFiltersChange({ ...filters, classes: val })}
              placeholder="Todas"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSelect({ options, selected, onChange, placeholder, useLabels = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => {
      const label = useLabels && isNovoFormato(opt) ? getClasseLabel(opt, 'sipt') : opt;
      return label.toLowerCase().includes(search.toLowerCase());
    });
  }, [options, search, useLabels]);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const getOptionLabel = (opt) => {
    return useLabels && isNovoFormato(opt) ? getClasseLabel(opt, 'sipt') : opt;
  };

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? getOptionLabel(selected[0])
      : `${selected.length} selecionados`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="filter-select text-left w-full"
      >
        <span className={selected.length === 0 ? 'text-earth-400' : 'text-earth-900'}>
          {displayText}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-earth-200 overflow-hidden">
            <div className="p-2 border-b border-earth-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full px-3 py-2 text-sm border border-earth-200 rounded-lg focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-earth-400">Nenhum resultado</div>
              ) : (
                filteredOptions.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleOption(opt)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-forest-50 flex items-center gap-2
                      ${selected.includes(opt) ? 'bg-forest-50 text-forest-700' : 'text-earth-700'}`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                      ${selected.includes(opt)
                        ? 'bg-forest-500 border-forest-500'
                        : 'border-earth-300'}`}
                    >
                      {selected.includes(opt) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{getOptionLabel(opt)}</div>
                      {useLabels && isNovoFormato(opt) && (
                        <div className="text-xs text-earth-500">{opt}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selected.length > 0 && (
              <div className="p-2 border-t border-earth-100">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="w-full px-3 py-1.5 text-sm text-earth-600 hover:text-forest-600 hover:bg-forest-50 rounded-lg transition-colors"
                >
                  Limpar selecao
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

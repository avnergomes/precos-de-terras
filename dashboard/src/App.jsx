import { useEffect, useMemo, useState } from 'react';
import { useData, useFilteredData, useAggregations } from './hooks/useData';

import Header from './components/Header';
import Filters from './components/Filters';
import ClasseLegend from './components/ClasseLegend';
import Tabs from './components/Tabs';
import KpiCards from './components/KpiCards';
import TimeSeriesChart from './components/TimeSeriesChart';
import CategoryChart from './components/CategoryChart';
import CategoryChartSimple from './components/CategoryChartSimple';
import TerritoryChart from './components/TerritoryChart';
import RankingTable from './components/RankingTable';
import MapChart from './components/MapChart';
import PriceSearch from './components/PriceSearch';
import Footer from './components/Footer';
import Loading from './components/Loading';

export default function App() {
  const { detailed, geoData, metadata, loading, error } = useData();

  const [filters, setFilters] = useState({
    anos: [0, 0],
    nivel: '',
    territorios: [],
    categorias: [],
    subcategorias: [],
    regioes: [],
    mesorregioes: [],
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (metadata?.anos?.length) {
      setFilters(prev => ({
        ...prev,
        anos: [metadata.anoMin, metadata.anoMax],
        nivel: metadata.niveis?.[0] || '',
      }));
    }
  }, [metadata]);

  const filteredData = useFilteredData(detailed, filters);
  const aggregates = useAggregations(filteredData, filters, geoData);

  const filterSummary = useMemo(() => {
    const [anoMin, anoMax] = filters.anos || [];
    const periodLabel = anoMin && anoMax ? `${anoMin} - ${anoMax}` : 'Todos os anos';
    const nivelLabel = filters.nivel || metadata?.niveis?.[0] || 'N\u00edvel territorial';
    const regionLabel = filters.regioes?.length ? filters.regioes.join(', ') : 'Todas as regi\u00f5es';
    const mesoLabel = filters.mesorregioes?.length ? filters.mesorregioes.join(', ') : 'Todas as mesorregi\u00f5es';
    const categoriaLabel = filters.categorias?.length ? filters.categorias.join(', ') : 'Todas as categorias';
    const subcategoriaLabel = filters.subcategorias?.length ? filters.subcategorias.join(', ') : 'Todas as subcategorias';

    return `Per\u00edodo: ${periodLabel} \u2022 N\u00edvel: ${nivelLabel} \u2022 Regi\u00e3o: ${regionLabel} \u2022 Mesorregi\u00e3o: ${mesoLabel} \u2022 Categoria: ${categoriaLabel} \u2022 Subcategoria: ${subcategoriaLabel}`;
  }, [filters, metadata]);

  const hasData = useMemo(() => filteredData?.length > 0, [filteredData]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-accent-50 to-primary-50">
        <div className="text-center space-y-4 p-8">
          <div className="text-red-500 text-6xl">!</div>
          <h2 className="text-xl font-bold text-dark-900">Erro ao carregar dados</h2>
          <p className="text-dark-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header metadata={metadata} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-8 w-full space-y-4 md:space-y-6">
        <Filters
          metadata={metadata}
          detailed={detailed}
          filters={filters}
          onFiltersChange={setFilters}
          filteredData={filteredData}
        />

        <div className="text-sm text-neutral-500">{filterSummary}</div>

        <ClasseLegend />

        <KpiCards data={aggregates} />

        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'pesquisa' && (
          <PriceSearch metadata={metadata} detailed={detailed} />
        )}

        {!hasData && activeTab !== 'pesquisa' && (
          <div className="card p-6 text-center text-sm text-neutral-500">
            Sem dados para o conjunto de filtros selecionado.
          </div>
        )}

        {hasData && activeTab !== 'pesquisa' && (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <>
                <TimeSeriesChart data={aggregates} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CategoryChartSimple data={aggregates} />
                  <TerritoryChart data={aggregates} nivel={filters.nivel} />
                </div>
              </>
            )}

            {activeTab === 'historico' && (
              <>
                <TimeSeriesChart data={aggregates} />
                <RankingTable
                  data={aggregates}
                  title="Territorios de maior valor medio"
                  levelLabel={filters.nivel || 'Nivel territorial'}
                />
              </>
            )}

            {activeTab === 'categorias' && (
              <CategoryChart data={aggregates} />
            )}

            {activeTab === 'territorial' && (
              <>
                <TerritoryChart data={aggregates} nivel="Regional IDR-Paran\u00e1" rows={aggregates.byRegIdr} />
                <RankingTable
                  data={aggregates}
                  title="Ranking territorial"
                  levelLabel="Regional IDR-Paran\u00e1"
                  rows={aggregates.byRegIdr}
                />
              </>
            )}

            {activeTab === 'mapa' && (
              <MapChart data={aggregates} geoData={geoData} nivel={filters.nivel} />
            )}
          </div>
        )}
      </main>

      <Footer metadata={metadata} />
    </div>
  );
}

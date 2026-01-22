const tabs = [
  { id: 'overview', label: 'Visao Geral' },
  { id: 'historico', label: 'Historico' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'territorial', label: 'Territorial' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'pesquisa', label: 'Pesquisa de preco' },
];

export default function Tabs({ activeTab, onTabChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

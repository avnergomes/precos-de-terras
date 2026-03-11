import { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Visao Geral' },
  { id: 'historico', label: 'Historico' },
  { id: 'categorias', label: 'Categorias' },
  { id: 'territorial', label: 'Territorial' },
  { id: 'mapa', label: 'Mapa' },
  { id: 'pesquisa', label: 'Pesquisa de preco' },
];

export default function Tabs({ activeTab, onTabChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 160, behavior: 'smooth' });
  };

  return (
    <div className="relative flex items-center" role="tablist">
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 z-10 p-1 bg-white/90 rounded-full shadow-md
                     text-neutral-500 hover:text-primary-700 md:hidden"
          aria-label="Rolar para a esquerda"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-thin md:flex-wrap"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`tab-button whitespace-nowrap transition-transform duration-200 ${
                isActive ? 'active scale-[1.03]' : ''
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 z-10 p-1 bg-white/90 rounded-full shadow-md
                     text-neutral-500 hover:text-primary-700 md:hidden"
          aria-label="Rolar para a direita"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

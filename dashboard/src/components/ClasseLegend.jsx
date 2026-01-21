import { Info } from 'lucide-react';
import { CLASSE_LABELS, CLASSE_DESCRICOES, GRUPOS } from '../utils/nomenclatura';
import { useState } from 'react';

export default function ClasseLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="card p-4 md:p-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-100 rounded-lg">
            <Info className="w-5 h-5 text-accent-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-display font-bold text-earth-900">
              Classificação de Terras
            </h3>
            <p className="text-sm text-earth-500">
              Sistema de Capacidade de Uso do Solo (SBCS)
            </p>
          </div>
        </div>
        <div className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <svg
            className="w-5 h-5 text-earth-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-6">
          <div className="text-sm text-earth-600">
            <p className="mb-2">
              A partir de 2017, a pesquisa adotou o <strong>Sistema de Capacidade de Uso</strong> do solo,
              publicado pela Sociedade Brasileira de Ciência do Solo (SBCS), substituindo a
              metodologia anterior que classificava por tipo de solo (Roxa/Mista/Arenosa).
            </p>
            <p>
              As classes são agrupadas conforme a aptidão agrícola das terras:
            </p>
          </div>

          {Object.entries(GRUPOS).map(([key, grupo]) => (
            <div key={key} className="border-l-4 pl-4" style={{ borderColor: grupo.cor }}>
              <h4 className="font-bold text-earth-900 mb-2">{grupo.nome}</h4>
              <div className="space-y-3">
                {grupo.classes.map(classe => (
                  <div key={classe} className="bg-earth-50 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="font-bold text-earth-900">{classe}</span>
                        <span className="text-sm text-earth-600 ml-2">
                          {CLASSE_LABELS[classe]?.match(/\(([^)]+)\)/)?.[1]}
                        </span>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: `${grupo.cor}20`,
                          color: grupo.cor
                        }}
                      >
                        {CLASSE_LABELS[classe]?.split(' (')[0]}
                      </span>
                    </div>
                    <p className="text-sm text-earth-600">{CLASSE_DESCRICOES[classe]}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Metodologia Anterior (até 2016)
            </h4>
            <p className="text-sm text-amber-800">
              Dados anteriores a 2017 foram automaticamente convertidos da metodologia antiga
              (Roxa/Mista/Arenosa + Mecanizada/Mecanizável/Não-mecanizável) para o novo sistema
              de classificação, permitindo análises históricas consistentes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

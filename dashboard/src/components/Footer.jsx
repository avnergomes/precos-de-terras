import { ExternalLink, Database } from 'lucide-react';

export default function Footer({ metadata }) {
  const currentYear = new Date().getFullYear();
  const anoMin = metadata?.anoMin || '----';
  const anoMax = metadata?.anoMax || '----';

  return (
    <footer className="mt-12 border-t border-accent-200 bg-gradient-to-b from-neutral-50 to-accent-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4">
            <h3 className="font-display font-bold text-dark-900 text-sm md:text-base">
              Precos de Terras - PR
            </h3>
            <p className="text-xs md:text-sm text-dark-700 leading-relaxed">
              Dashboard interativo para analise historica dos precos de terra no Parana.
            </p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h4 className="font-semibold text-dark-900 text-sm md:text-base">Fonte de Dados</h4>
            <ul className="space-y-2 text-xs md:text-sm text-dark-700">
              <li className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary-600" />
                <span>DERAL - Departamento de Economia Rural</span>
              </li>
              <li>
                <a
                  href="https://www.agricultura.pr.gov.br/deral"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-dark-700 hover:text-primary-600 transition-colors group"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Site oficial do DERAL</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3 md:space-y-4">
            <h4 className="font-semibold text-dark-900 text-sm md:text-base">Cobertura</h4>
            <ul className="space-y-2 text-xs md:text-sm text-dark-700">
              <li>Serie: {anoMin} - {anoMax}</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-accent-200 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-dark-600">
            <p>
              {currentYear} Precos de Terras PR. Dados publicos processados para fins analiticos.
            </p>
            <span className="hidden sm:inline text-accent-400">•</span>
            <a
              href="https://avnergomes.github.io/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-dark-500 hover:text-primary-600 transition-colors group"
              title="Desenvolvido por Avner Gomes"
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/logo2.png`}
                alt="Avner Gomes"
                className="w-7 h-7 md:w-8 md:h-8 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] md:text-xs">Desenvolvido por Avner Gomes</span>
            </a>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-2">
            <span className="badge badge-green text-[10px] md:text-xs">Serie historica</span>
            <span className="badge badge-yellow text-[10px] md:text-xs">Indicadores</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

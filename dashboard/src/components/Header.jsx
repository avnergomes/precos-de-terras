import { Landmark, MapPin, TrendingUp, Layers } from 'lucide-react';

export default function Header({ metadata }) {
  const anoMin = metadata?.anoMin || '----';
  const anoMax = metadata?.anoMax || '----';
  const niveisCount = metadata?.niveis?.length || 0;
  const categoriasCount = metadata?.categorias?.length || 0;

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-dark-900 via-secondary-700 to-primary-600 text-white">
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="currentColor" opacity="0.5"/>
              <circle cx="75" cy="75" r="1" fill="currentColor" opacity="0.5"/>
              <circle cx="50" cy="10" r="0.5" fill="currentColor" opacity="0.3"/>
              <circle cx="10" cy="60" r="0.5" fill="currentColor" opacity="0.3"/>
              <circle cx="90" cy="40" r="0.5" fill="currentColor" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grain)"/>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 flex-shrink-0">
              <Landmark className="w-6 h-6 md:w-8 md:h-8 text-primary-200" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight">
                Precos de Terras - PR
              </h1>
              <p className="text-accent-200 text-xs md:text-sm lg:text-base font-medium">
                Analise Historica e Territorial dos Valores de Terra
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-4 lg:gap-6">
            <QuickStat icon={MapPin} label={`${niveisCount}`} sublabel="Niveis territoriais" />
            <QuickStat icon={TrendingUp} label={`${anoMin}-${anoMax}`} sublabel="Serie historica" />
            <QuickStat icon={Layers} label={`${categoriasCount}`} sublabel="Categorias" />
          </div>
        </div>

        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
          <p className="text-neutral-50 text-xs md:text-sm leading-relaxed">
            Explore a evolucao dos precos de terras no Parana com recorte por nivel territorial
            e categorias de uso. Visualizacoes interativas apoiam comparacoes historicas e espaciais.
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-4 md:h-6 lg:h-8">
          <path
            d="M0 48h1440V24c-120 12-240 18-360 18S840 36 720 24 480 0 360 0 120 12 0 24v24z"
            className="fill-neutral-50"
          />
        </svg>
      </div>
    </header>
  );
}

function QuickStat({ icon: Icon, label, sublabel }) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 px-2 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/20">
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-accent-200 flex-shrink-0" />
      <div>
        <div className="text-sm md:text-lg font-bold">{label}</div>
        <div className="text-[10px] md:text-xs text-accent-200">{sublabel}</div>
      </div>
    </div>
  );
}

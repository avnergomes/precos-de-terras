export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-accent-50 to-primary-50">
      <div className="text-center space-y-4 p-8">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-dark-900">Carregando dados...</h2>
        <p className="text-sm text-dark-600">Preparando analises territoriais.</p>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react'
import * as d3 from 'd3'

const CATEGORY_COLORS = {
  'A': '#22c55e',
  'B': '#eab308',
  'C': '#ef4444',
}

export default function RadarChart({
  data,
  title = "Comparativo por Categoria",
  width = 450,
  height = 450,
  showLegend = true
}) {
  const [hoveredTerritory, setHoveredTerritory] = useState(null)

  const chartData = useMemo(() => {
    if (!data?.byCategoria || !data?.byTerritorio) return null

    // Get top territories by average price
    const territories = Object.entries(data.byTerritorio || {})
      .filter(([_, d]) => d.media > 0)
      .sort((a, b) => b[1].media - a[1].media)
      .slice(0, 5)
      .map(([name]) => name)

    if (territories.length === 0) return null

    // Get categories as axes
    const categories = Object.keys(data.byCategoria).filter(c => c)

    if (categories.length < 3) return null

    // Build radar data for each territory
    const radarData = territories.map(territory => {
      const values = categories.map(cat => {
        // Find price for this territory and category
        const catData = data.byCategoriaSubcategoria?.[cat]
        if (!catData) return 0

        // Use overall category average as approximation
        return data.byCategoria[cat]?.media || 0
      })

      return {
        territory,
        values
      }
    })

    const maxValue = Math.max(...radarData.flatMap(d => d.values))

    return { radarData, categories, maxValue }
  }, [data])

  if (!chartData) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-dark-700 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-dark-400">
          Dados insuficientes para o grafico
        </div>
      </div>
    )
  }

  const { radarData, categories, maxValue } = chartData
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2 - 60

  // Create angle scale
  const angleSlice = (Math.PI * 2) / categories.length

  // Create radius scale
  const rScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([0, radius])

  // Grid levels
  const levels = 5
  const gridCircles = d3.range(1, levels + 1).map(l => l / levels)

  // Line generator for radar area
  const radarLine = d3.lineRadial()
    .radius(d => rScale(d))
    .angle((d, i) => i * angleSlice)
    .curve(d3.curveLinearClosed)

  // Format value
  const formatValue = (v) => {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`
    return `R$ ${v.toFixed(0)}`
  }

  // Color palette for territories
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-dark-700 mb-4">{title}</h3>

      <svg width={width} height={height} className="mx-auto">
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Grid circles */}
          {gridCircles.map((level, i) => (
            <circle
              key={i}
              r={radius * level}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={i < levels - 1 ? "4,4" : "0"}
            />
          ))}

          {/* Grid labels */}
          {gridCircles.map((level, i) => (
            <text
              key={i}
              x={4}
              y={-radius * level - 3}
              fill="#94a3b8"
              fontSize={9}
            >
              {formatValue(maxValue * level)}
            </text>
          ))}

          {/* Axis lines and labels */}
          {categories.map((cat, i) => {
            const angle = i * angleSlice - Math.PI / 2
            const x = radius * Math.cos(angle)
            const y = radius * Math.sin(angle)
            const labelX = (radius + 25) * Math.cos(angle)
            const labelY = (radius + 25) * Math.sin(angle)

            return (
              <g key={cat}>
                <line
                  x1={0}
                  y1={0}
                  x2={x}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fill="#475569"
                  fontSize={12}
                  fontWeight="500"
                >
                  {cat}
                </text>
              </g>
            )
          })}

          {/* Radar areas */}
          {radarData.map((territory, i) => {
            const isHovered = hoveredTerritory === territory.territory
            const color = colors[i % colors.length]

            return (
              <g key={territory.territory}>
                {/* Area */}
                <path
                  d={radarLine(territory.values)}
                  fill={color}
                  fillOpacity={isHovered ? 0.4 : 0.15}
                  stroke={color}
                  strokeWidth={isHovered ? 3 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredTerritory(territory.territory)}
                  onMouseLeave={() => setHoveredTerritory(null)}
                >
                  <title>{territory.territory}</title>
                </path>

                {/* Data points */}
                {territory.values.map((val, j) => {
                  const angle = j * angleSlice - Math.PI / 2
                  const x = rScale(val) * Math.cos(angle)
                  const y = rScale(val) * Math.sin(angle)

                  return (
                    <circle
                      key={j}
                      cx={x}
                      cy={y}
                      r={isHovered ? 5 : 3}
                      fill={color}
                      stroke="white"
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredTerritory(territory.territory)}
                      onMouseLeave={() => setHoveredTerritory(null)}
                    >
                      <title>{`${territory.territory}\n${categories[j]}: ${formatValue(val)}`}</title>
                    </circle>
                  )
                })}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {radarData.map((territory, i) => (
            <div
              key={territory.territory}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-all ${
                hoveredTerritory === territory.territory ? 'bg-dark-100' : ''
              }`}
              onMouseEnter={() => setHoveredTerritory(territory.territory)}
              onMouseLeave={() => setHoveredTerritory(null)}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-xs text-dark-600">
                {territory.territory.length > 15
                  ? territory.territory.slice(0, 12) + '...'
                  : territory.territory}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

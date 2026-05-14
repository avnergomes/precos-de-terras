// ATLAS-A11Y-HEX-SWEPT
import { useMemo } from 'react'
import * as d3 from 'd3'

const MARGIN = { top: 20, right: 80, bottom: 20, left: 160 }

const CATEGORY_COLORS = {
  'A': '#0072B2',
  'B': '#eab308',
  'C': '#D55E00',
}

export default function LollipopChart({
  data,
  title = "Ranking de Territorios",
  width = 550,
  height = 500,
  limit = 15,
  onTerritorioClick
}) {
  const chartData = useMemo(() => {
    if (!data) return null

    let items = []

    // Handle array of objects format: [{territorio, media, registros, ...}]
    if (data.byTerritorio && Array.isArray(data.byTerritorio)) {
      items = data.byTerritorio
        .filter(d => d && d.territorio && d.media > 0)
        .map(d => ({
          territorio: d.territorio,
          preco_medio: d.media,
          count: d.registros || 0,
          categoria_dominante: d.categoria_dominante || 'A'
        }))
    }
    // Handle direct array (rows prop with same object format)
    else if (Array.isArray(data)) {
      items = data
        .filter(d => d && (d.media > 0 || d.preco_medio > 0))
        .map(d => ({
          territorio: d.territorio || d.name || 'Desconhecido',
          preco_medio: d.media || d.preco_medio || 0,
          count: d.registros || d.count || 0,
          categoria_dominante: d.categoria_dominante || 'A'
        }))
    }

    if (items.length === 0) return null

    // Sort by price and take top N
    const sorted = items
      .sort((a, b) => b.preco_medio - a.preco_medio)
      .slice(0, limit)

    const maxValue = Math.max(...sorted.map(d => d.preco_medio))

    return { items: sorted, maxValue }
  }, [data, limit])

  if (!chartData) {
    return (
      <div className="bg-white rounded-xl border border-neutral-100 p-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-neutral-400">
          Sem dados disponiveis
        </div>
      </div>
    )
  }

  const { items, maxValue } = chartData
  const innerWidth = width - MARGIN.left - MARGIN.right
  const innerHeight = height - MARGIN.top - MARGIN.bottom

  const xScale = d3.scaleLinear()
    .domain([0, maxValue * 1.1])
    .range([0, innerWidth])

  const yScale = d3.scaleBand()
    .domain(items.map(d => d.territorio))
    .range([0, innerHeight])
    .padding(0.35)

  const formatValue = (v) => {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}K`
    return `R$ ${v.toFixed(0)}`
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>

      <svg width={width} height={height}>
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* Grid lines */}
          {xScale.ticks(5).map((tick, i) => (
            <line
              key={i}
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={0}
              y2={innerHeight}
              stroke="#e2e8f0"
              strokeDasharray="4,4"
            />
          ))}

          {/* X axis labels */}
          {xScale.ticks(5).map((tick, i) => (
            <text
              key={i}
              x={xScale(tick)}
              y={innerHeight + 15}
              textAnchor="middle"
              fill="#6e6453"
              fontSize={10}
            >
              {formatValue(tick)}
            </text>
          ))}

          {/* Lollipops */}
          {items.map((item, i) => {
            const y = yScale(item.territorio) + yScale.bandwidth() / 2
            const xEnd = xScale(item.preco_medio)
            const color = CATEGORY_COLORS[item.categoria_dominante] || '#6e6453'

            return (
              <g
                key={`${item.territorio}-${i}`}
                className="group cursor-pointer"
                onClick={() => onTerritorioClick?.(item.territorio)}
              >
                {/* Hover background */}
                <rect
                  x={-MARGIN.left}
                  y={yScale(item.territorio) - 2}
                  width={innerWidth + MARGIN.left + MARGIN.right}
                  height={yScale.bandwidth() + 4}
                  fill="#f1f5f9"
                  fillOpacity={0}
                  className="group-hover:fill-opacity-100 transition-all"
                />

                {/* Line */}
                <line
                  x1={0}
                  x2={xEnd}
                  y1={y}
                  y2={y}
                  stroke={color}
                  strokeWidth={2}
                />

                {/* Circle */}
                <circle
                  cx={xEnd}
                  cy={y}
                  r={7}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                >
                  <title>
                    {`${item.territorio}\nPreco Medio: ${formatValue(item.preco_medio)}\nRegistros: ${item.count}`}
                  </title>
                </circle>

                {/* Value label - always visible */}
                <text
                  x={xEnd + 12}
                  y={y}
                  alignmentBaseline="middle"
                  fill="#334155"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {formatValue(item.preco_medio)}
                </text>

                {/* Y axis label */}
                <text
                  x={-8}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  fill="#334155"
                  fontSize={10}
                >
                  {item.territorio.length > 22 ? item.territorio.slice(0, 19) + '...' : item.territorio}
                </text>

                {/* Category indicator */}
                <circle
                  cx={-MARGIN.left + 10}
                  cy={y}
                  r={4}
                  fill={color}
                />
              </g>
            )
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-neutral-600">Classe {cat}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

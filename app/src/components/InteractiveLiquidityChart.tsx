'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Position {
  id: number
  name: string
  mcapStart: number
  mcapEnd: number
  supplyStart: number
  supplyEnd: number
  tokens: string
  color: string
  epochs: {
    num: number
    mcap: number
    supply: number
    tax: string
    limit: string
  }[]
}

const positions: Position[] = [
  {
    id: 1,
    name: 'Position 1',
    mcapStart: 2000,
    mcapEnd: 32000,
    supplyStart: 0,
    supplyEnd: 75,
    tokens: '75.00%',
    color: '#E8523D',
    epochs: [
      { num: 1, mcap: 2000, supply: 0, tax: '50%', limit: '0.1%' },
      { num: 2, mcap: 4000, supply: 18.75, tax: '25%', limit: '0.2%' },
      { num: 3, mcap: 8000, supply: 37.5, tax: '12.5%', limit: '0.4%' },
      { num: 4, mcap: 16000, supply: 56.25, tax: '6.25%', limit: '0.8%' },
    ]
  },
  {
    id: 2,
    name: 'Position 2',
    mcapStart: 32000,
    mcapEnd: 512000,
    supplyStart: 75,
    supplyEnd: 93.75,
    tokens: '18.75%',
    color: '#FF8C4A',
    epochs: [
      { num: 1, mcap: 32000, supply: 75, tax: '1%', limit: '1.6%' },
      { num: 2, mcap: 64000, supply: 79.69, tax: '0%', limit: '3.2%' },
      { num: 3, mcap: 128000, supply: 84.38, tax: '0%', limit: '6.4%' },
      { num: 4, mcap: 256000, supply: 89.06, tax: '0%', limit: '12.8%' },
    ]
  },
  {
    id: 3,
    name: 'Position 3',
    mcapStart: 512000,
    mcapEnd: 8192000,
    supplyStart: 93.75,
    supplyEnd: 98.44,
    tokens: '4.69%',
    color: '#FFD700',
    epochs: [
      { num: 1, mcap: 512000, supply: 93.75, tax: '0%', limit: '25.6%' },
      { num: 2, mcap: 1024000, supply: 95.31, tax: '0%', limit: '51.2%' },
      { num: 3, mcap: 2048000, supply: 96.88, tax: '0%', limit: '100%' },
      { num: 4, mcap: 4096000, supply: 97.66, tax: '0%', limit: '100%' },
    ]
  },
  {
    id: 4,
    name: 'Position 4',
    mcapStart: 8192000,
    mcapEnd: 131072000,
    supplyStart: 98.44,
    supplyEnd: 99.61,
    tokens: '1.17%',
    color: '#4ADE80',
    epochs: [
      { num: 1, mcap: 8192000, supply: 98.44, tax: '0%', limit: '100%' },
      { num: 2, mcap: 16384000, supply: 98.73, tax: '0%', limit: '100%' },
      { num: 3, mcap: 32768000, supply: 99.02, tax: '0%', limit: '100%' },
      { num: 4, mcap: 65536000, supply: 99.32, tax: '0%', limit: '100%' },
    ]
  },
  {
    id: 5,
    name: 'Position 5',
    mcapStart: 131072000,
    mcapEnd: 262144000,
    supplyStart: 99.61,
    supplyEnd: 100,
    tokens: '0.39%',
    color: '#60A5FA',
    epochs: [
      { num: 1, mcap: 131072000, supply: 99.61, tax: '0%', limit: '100%' },
      { num: 2, mcap: 165000000, supply: 99.71, tax: '0%', limit: '100%' },
      { num: 3, mcap: 200000000, supply: 99.81, tax: '0%', limit: '100%' },
      { num: 4, mcap: 240000000, supply: 99.90, tax: '0%', limit: '100%' },
    ]
  },
]

export default function InteractiveLiquidityChart() {
  const [hoveredPosition, setHoveredPosition] = useState<Position | null>(null)
  const [hoveredEpoch, setHoveredEpoch] = useState<Position['epochs'][0] | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [sliderValue, setSliderValue] = useState(0)
  const chartRef = useRef<HTMLDivElement>(null)

  // Convert MCAP to Y position (logarithmic scale)
  const mcapToY = (mcap: number) => {
    const minMcap = Math.log10(2000)
    const maxMcap = Math.log10(262144000)
    const logMcap = Math.log10(mcap)
    const normalized = (logMcap - minMcap) / (maxMcap - minMcap)
    return 400 - (normalized * 380) // Inverted Y axis
  }

  // Convert supply % to X position
  const supplyToX = (supply: number) => {
    return 60 + (supply / 100) * 680 // 60px left margin, 680px width
  }

  // Get current position and data based on slider
  const getCurrentData = () => {
    const supply = sliderValue
    let currentPos: Position | null = null
    let currentEpoch: Position['epochs'][0] | null = null

    for (const pos of positions) {
      if (supply >= pos.supplyStart && supply <= pos.supplyEnd) {
        currentPos = pos
        // Find current epoch within position
        for (let i = 0; i < pos.epochs.length; i++) {
          if (i === pos.epochs.length - 1 || supply < pos.epochs[i + 1].supply) {
            currentEpoch = pos.epochs[i]
            break
          }
        }
        break
      }
    }

    return { currentPos, currentEpoch, supply }
  }

  const { currentPos, currentEpoch } = getCurrentData()

  // Format MCAP
  const formatMcap = (mcap: number) => {
    if (mcap >= 1000000) return `$${(mcap / 1000000).toFixed(1)}M`
    if (mcap >= 1000) return `$${(mcap / 1000).toFixed(0)}k`
    return `$${mcap}`
  }

  // Y-axis labels (logarithmic)
  const yLabels = [
    { mcap: 2000, label: '$2k' },
    { mcap: 32000, label: '$32k' },
    { mcap: 512000, label: '$512k' },
    { mcap: 8192000, label: '$8M' },
    { mcap: 131072000, label: '$128M' },
  ]

  // X-axis labels
  const xLabels = [0, 25, 50, 75, 100]

  return (
    <div className="relative">
      {/* Chart Container */}
      <div
        ref={chartRef}
        className="relative bg-black/40 rounded-xl border border-white/10 overflow-hidden"
        style={{ height: '500px' }}
        onMouseMove={(e) => {
          const rect = chartRef.current?.getBoundingClientRect()
          if (rect) {
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            })
          }
        }}
      >
        {/* SVG Chart */}
        <svg width="800" height="500" className="absolute inset-0">
          {/* Grid Lines */}
          <g opacity="0.1">
            {/* Horizontal grid */}
            {yLabels.map((label) => (
              <line
                key={label.mcap}
                x1="60"
                x2="740"
                y1={mcapToY(label.mcap)}
                y2={mcapToY(label.mcap)}
                stroke="white"
                strokeWidth="1"
              />
            ))}
            {/* Vertical grid */}
            {xLabels.map((label) => (
              <line
                key={label}
                x1={supplyToX(label)}
                x2={supplyToX(label)}
                y1="20"
                y2="400"
                stroke="white"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Y Axis Labels (MCAP) */}
          <g>
            {yLabels.map((label) => (
              <text
                key={label.mcap}
                x="50"
                y={mcapToY(label.mcap) + 4}
                fill="white"
                fontSize="12"
                textAnchor="end"
                opacity="0.6"
              >
                {label.label}
              </text>
            ))}
          </g>

          {/* X Axis Labels (Supply %) */}
          <g>
            {xLabels.map((label) => (
              <text
                key={label}
                x={supplyToX(label)}
                y="420"
                fill="white"
                fontSize="12"
                textAnchor="middle"
                opacity="0.6"
              >
                {label}%
              </text>
            ))}
          </g>

          {/* Axis Titles */}
          <text
            x="20"
            y="200"
            fill="white"
            fontSize="14"
            opacity="0.8"
            transform="rotate(-90 20 200)"
            textAnchor="middle"
            fontWeight="600"
          >
            Market Cap
          </text>
          <text
            x="400"
            y="460"
            fill="white"
            fontSize="14"
            opacity="0.8"
            textAnchor="middle"
            fontWeight="600"
          >
            Supply Sold (%)
          </text>

          {/* Position Boxes */}
          {positions.map((pos) => {
            const x1 = supplyToX(pos.supplyStart)
            const x2 = supplyToX(pos.supplyEnd)
            const y1 = mcapToY(pos.mcapEnd)
            const y2 = mcapToY(pos.mcapStart)
            
            return (
              <g key={pos.id}>
                {/* Position Rectangle */}
                <rect
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  fill={pos.color}
                  opacity={hoveredPosition?.id === pos.id ? 0.3 : 0.15}
                  stroke={pos.color}
                  strokeWidth="2"
                  strokeOpacity={hoveredPosition?.id === pos.id ? 1 : 0.5}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredPosition(pos)}
                  onMouseLeave={() => setHoveredPosition(null)}
                />

                {/* Position Label */}
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2}
                  fill="white"
                  fontSize="14"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity={hoveredPosition?.id === pos.id ? 1 : 0.7}
                  pointerEvents="none"
                >
                  P{pos.id}
                </text>

                {/* Epoch Dots */}
                {pos.epochs.map((epoch) => (
                  <circle
                    key={`${pos.id}-${epoch.num}`}
                    cx={supplyToX(epoch.supply)}
                    cy={mcapToY(epoch.mcap)}
                    r="6"
                    fill={pos.color}
                    stroke="white"
                    strokeWidth="2"
                    opacity={hoveredEpoch?.mcap === epoch.mcap ? 1 : 0.6}
                    className="cursor-pointer transition-all hover:r-8"
                    onMouseEnter={() => setHoveredEpoch(epoch)}
                    onMouseLeave={() => setHoveredEpoch(null)}
                  />
                ))}
              </g>
            )
          })}

          {/* Current Position Indicator (from slider) */}
          {currentPos && currentEpoch && (
            <>
              {/* Vertical line */}
              <line
                x1={supplyToX(sliderValue)}
                x2={supplyToX(sliderValue)}
                y1="20"
                y2="400"
                stroke={currentPos.color}
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity="0.8"
              />
              {/* Current point */}
              <circle
                cx={supplyToX(sliderValue)}
                cy={mcapToY(currentEpoch.mcap)}
                r="8"
                fill={currentPos.color}
                stroke="white"
                strokeWidth="3"
              />
            </>
          )}
        </svg>

        {/* Hover Tooltip */}
        <AnimatePresence>
          {hoveredPosition && !hoveredEpoch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none z-10"
              style={{
                left: Math.min(mousePos.x + 15, 650),
                top: Math.max(mousePos.y - 80, 10),
              }}
            >
              <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 shadow-2xl min-w-[200px]">
                <div className="font-bold text-lg mb-2" style={{ color: hoveredPosition.color }}>
                  {hoveredPosition.name}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">MCAP Range:</span>
                    <span className="font-mono">{formatMcap(hoveredPosition.mcapStart)} → {formatMcap(hoveredPosition.mcapEnd)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Supply:</span>
                    <span className="font-mono font-bold">{hoveredPosition.tokens}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Coverage:</span>
                    <span className="font-mono">16x</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {hoveredEpoch && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute pointer-events-none z-10"
              style={{
                left: Math.min(mousePos.x + 15, 650),
                top: Math.max(mousePos.y - 100, 10),
              }}
            >
              <div className="bg-black/95 backdrop-blur-sm border border-white/20 rounded-lg p-4 shadow-2xl min-w-[220px]">
                <div className="font-bold text-lg mb-2 text-[#E8523D]">
                  Epoch {hoveredEpoch.num}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">MCAP:</span>
                    <span className="font-mono font-bold">{formatMcap(hoveredEpoch.mcap)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Supply Sold:</span>
                    <span className="font-mono">{hoveredEpoch.supply.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">Hook Tax:</span>
                    <span className="font-mono text-[#FF8C4A]">{hoveredEpoch.tax}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/60">TX Limit:</span>
                    <span className="font-mono text-[#4ADE80]">{hoveredEpoch.limit}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Slider */}
      <div className="mt-8 glass-card p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Explore Positions</h3>
          <div className="text-sm text-white/60">
            Drag to see how tax and limits change
          </div>
        </div>

        <div className="space-y-4">
          {/* Slider */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseFloat(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: currentPos ? `linear-gradient(to right, ${currentPos.color} 0%, ${currentPos.color} ${sliderValue}%, rgba(255,255,255,0.1) ${sliderValue}%, rgba(255,255,255,0.1) 100%)` : undefined
            }}
          />

          {/* Current Stats */}
          {currentPos && currentEpoch && (
            <motion.div
              key={`${currentPos.id}-${currentEpoch.num}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4"
            >
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-1">Position</div>
                <div className="font-bold text-lg" style={{ color: currentPos.color }}>
                  P{currentPos.id}
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-1">Epoch</div>
                <div className="font-bold text-lg">{currentEpoch.num}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-1">MCAP</div>
                <div className="font-bold text-lg font-mono">{formatMcap(currentEpoch.mcap)}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-1">Hook Tax</div>
                <div className="font-bold text-lg text-[#E8523D]">{currentEpoch.tax}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 mb-1">TX Limit</div>
                <div className="font-bold text-lg text-[#4ADE80]">{currentEpoch.limit}</div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 glass-card p-6 rounded-xl">
        <h3 className="font-bold text-lg mb-4">Position Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {positions.map((pos) => (
            <div
              key={pos.id}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition"
              onMouseEnter={() => setHoveredPosition(pos)}
              onMouseLeave={() => setHoveredPosition(null)}
            >
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: pos.color }}
              />
              <div className="text-sm">
                <div className="font-semibold">{pos.name}</div>
                <div className="text-xs text-white/60">{pos.tokens}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface CascadeTrainData {
  trainName: string
  estimatedDelay?: number
  delayMinutes?: number
  reason: string
  level?: number
}

interface CascadeGraphProps {
  cascadeTrains: CascadeTrainData[]
  primaryTrain: string
  primaryDelay: number
}

const truncate = (str: string, max: number) =>
  str.length > max ? str.slice(0, max) + '…' : str

const firstWord = (str: string) => (str || '').split(/[\s,]+/)[0] || ''

export default function CascadeGraph({ cascadeTrains, primaryTrain, primaryDelay }: CascadeGraphProps) {
  if (!cascadeTrains || cascadeTrains.length === 0) return null

  const l1Trains = cascadeTrains.filter((t) => (t.level ?? 1) === 1)
  const l2Trains = cascadeTrains.filter((t) => (t.level ?? 1) === 2)

  const W = 600
  const primaryCx = W / 2
  const primaryCy = 70

  const getL1Positions = (count: number) => {
    if (count === 0) return []
    if (count === 1) return [{ cx: W / 2, cy: 210 }]
    if (count === 2) return [{ cx: W * 0.3, cy: 210 }, { cx: W * 0.7, cy: 210 }]
    if (count === 3) return [{ cx: W * 0.2, cy: 210 }, { cx: W * 0.5, cy: 210 }, { cx: W * 0.8, cy: 210 }]
    return Array.from({ length: count }, (_, i) => ({
      cx: (W / (count + 1)) * (i + 1),
      cy: 210,
    }))
  }

  const getL2Positions = (count: number) => {
    if (count === 0) return []
    return Array.from({ length: count }, (_, i) => ({
      cx: (W / (count + 1)) * (i + 1),
      cy: 340,
    }))
  }

  const l1Pos = getL1Positions(l1Trains.length)
  const l2Pos = getL2Positions(l2Trains.length)

  const viewH = l2Trains.length > 0 ? 400 : 280

  return (
    <div className="glass rounded-lg p-4 relative">
      <div className="absolute top-4 right-4 flex flex-col gap-1.5 bg-railmind-surface/80 border border-railmind-border p-2 rounded-lg z-10 backdrop-blur-sm shadow-xl">
        <div className="text-[9px] uppercase tracking-widest font-bold text-railmind-subtext mb-1 border-b border-railmind-border/50 pb-1">Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-red border border-white/20"></span>
          <span className="text-xs text-white">Trigger Train</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-orange border border-white/20"></span>
          <span className="text-xs text-white">High Impact</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-yellow border border-white/20"></span>
          <span className="text-xs text-white">Medium Impact</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${viewH}`} className="w-full" style={{ maxHeight: viewH }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>

        {/* Lines from primary to L1 */}
        {l1Pos.map((pos, i) => {
          const dx = pos.cx - primaryCx
          const dy = pos.cy - primaryCy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const startX = primaryCx + (dx / dist) * 45
          const startY = primaryCy + (dy / dist) * 45
          const endX = pos.cx - (dx / dist) * 35
          const endY = pos.cy - (dy / dist) * 35
          const midX = (startX + endX) / 2
          const midY = (startY + endY) / 2
          return (
            <g key={`line-l1-${i}`}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
                className={`cascade-arrow cascade-arrow-${(i % 3) + 1}`}
              />
              <text
                x={midX}
                y={midY - 6}
                textAnchor="middle"
                fill="#6b7280"
                fontSize={9}
                fontFamily="monospace"
              >
                {firstWord(l1Trains[i]?.reason)}
              </text>
            </g>
          )
        })}

        {/* Lines from L1 to L2 */}
        {l2Pos.map((pos, i) => {
          const parentIdx = Math.min(i, l1Pos.length - 1)
          const parent = l1Pos[parentIdx]
          if (!parent) return null
          const dx = pos.cx - parent.cx
          const dy = pos.cy - parent.cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const startX = parent.cx + (dx / dist) * 35
          const startY = parent.cy + (dy / dist) * 35
          const endX = pos.cx - (dx / dist) * 25
          const endY = pos.cy - (dy / dist) * 25
          const arrowIndex = l1Pos.length + i
          return (
            <line
              key={`line-l2-${i}`}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              markerEnd="url(#arrowhead)"
              className={`cascade-arrow cascade-arrow-${(arrowIndex % 3) + 1}`}
            />
          )
        })}

        {/* Primary train node */}
        <motion.g
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0, duration: 0.4 }}
        >
          <title>{primaryTrain}</title>
          <circle cx={primaryCx} cy={primaryCy} r={45} fill="#dc2626" stroke="white" strokeWidth={2} className="cascade-node-primary cascade-node-animate cascade-node-animate-0" />
          <text x={primaryCx} y={primaryCy - 6} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold">
            {truncate(primaryTrain, 15)}
          </text>
          <text x={primaryCx} y={primaryCy + 14} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">
            +{primaryDelay} min
          </text>
        </motion.g>

        {/* L1 train nodes */}
        {l1Pos.map((pos, i) => {
          const train = l1Trains[i]
          const delay = train?.estimatedDelay ?? train?.delayMinutes ?? 0
          return (
            <motion.g
              key={`l1-${i}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (i + 1) * 0.15, duration: 0.4 }}
            >
              <title>{train?.trainName}</title>
              <circle cx={pos.cx} cy={pos.cy} r={35} fill="#f97316" stroke="white" strokeWidth={1.5} className={`cascade-node-level1 cascade-node-animate cascade-node-animate-${i + 1}`} />
              <text x={pos.cx} y={pos.cy - 4} textAnchor="middle" fill="white" fontSize={10}>
                {truncate(train?.trainName || '', 12)}
              </text>
              <text x={pos.cx} y={pos.cy + 12} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">
                +{delay} min
              </text>
            </motion.g>
          )
        })}

        {/* L2 train nodes */}
        {l2Pos.map((pos, i) => {
          const train = l2Trains[i]
          const delay = train?.estimatedDelay ?? train?.delayMinutes ?? 0
          const animateIndex = l1Trains.length + i + 1
          return (
            <motion.g
              key={`l2-${i}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (l1Trains.length + i + 1) * 0.15, duration: 0.4 }}
            >
              <title>{train?.trainName}</title>
              <circle cx={pos.cx} cy={pos.cy} r={25} fill="#eab308" stroke="white" strokeWidth={1} className={`cascade-node-level2 cascade-node-animate cascade-node-animate-${animateIndex}`} />
              <text x={pos.cx} y={pos.cy - 2} textAnchor="middle" fill="white" fontSize={9}>
                {truncate(train?.trainName || '', 10)}
              </text>
              <text x={pos.cx} y={pos.cy + 10} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
                +{delay} min
              </text>
            </motion.g>
          )
        })}
      </svg>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06] text-xs text-railmind-subtext">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-red"></span>
          Primary Delay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-orange"></span>
          Direct Cascade
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-railmind-yellow"></span>
          Secondary Impact
        </span>
      </div>
    </div>
  )
}

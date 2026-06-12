'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import IncidentPanel from '@/components/incidents/IncidentPanel'
import IncidentDetailModal from '@/components/incidents/IncidentDetailModal'
import AgentFeed from '@/components/agents/AgentFeed'
import NotificationPreview from '@/components/notifications/NotificationPreview'
import DemoLauncher from '@/components/DemoLauncher'
import { useTrains, useIncidents } from '@/hooks'
import { getStatusColor } from '@/lib/utils'
import type { Train, Incident } from '@/lib/types'

const RailwayMap = dynamic(
  () => import('@/components/map/RailwayMap'),
  { ssr: false }
)

function useCountUp(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

export default function DashboardPage() {
  const { trains } = useTrains()
  const { incidents: activeIncidents } = useIncidents('active')
  const { incidents: resolvedIncidents } = useIncidents('resolved')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)

  const activeCount = activeIncidents.length
  const resolvedCount = resolvedIncidents.length

  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedTime = currentTime 
    ? currentTime.toLocaleTimeString('en-IN', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
      })
    : '--:--:--'

  const animTrains = useCountUp(trains.length)
  const animActive = useCountUp(activeCount)
  const animResolved = useCountUp(resolvedCount)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-railmind-bg text-white">
      {/* HEADER BAR */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-railmind-surface relative z-10"
        style={{ borderBottom: '1px solid transparent', borderImage: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.3), transparent) 1' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-railmind-subtext font-bold uppercase tracking-[0.2em] pt-0.5">
            Operations Intelligence Center
          </span>
        </div>

        {/* Center: System Status */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06]">
          <span className="w-2 h-2 rounded-full bg-railmind-green relative" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
            System Active
          </span>
          <span className="text-railmind-subtext mx-1">•</span>
          <span className="text-xs font-mono text-railmind-subtext tracking-wider">
            {formattedTime}
          </span>
        </div>

        {/* Right: Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-railmind-subtext uppercase tracking-widest font-semibold mb-0.5">Trains Monitored</span>
            <div className="font-mono text-base font-bold leading-none">{animTrains}</div>
          </div>
          
          <div className="h-8 w-px bg-white/[0.1] mx-2"></div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] text-railmind-subtext uppercase tracking-widest font-semibold mb-0.5">Active Delays</span>
            <motion.div
              key={activeCount}
              initial={{ scale: 1.4, color: '#dc2626' }}
              animate={{ scale: 1, color: activeCount > 0 ? '#dc2626' : '#ffffff' }}
              transition={{ duration: 0.4 }}
              className={`font-mono text-base font-bold leading-none ${activeCount > 0 ? 'text-railmind-red animate-pulse' : 'text-white'}`}
            >
              {animActive}
            </motion.div>
          </div>

          <div className="h-8 w-px bg-white/[0.1] mx-2"></div>

          <div className="flex flex-col items-end">
            <span className="text-[9px] text-railmind-subtext uppercase tracking-widest font-semibold mb-0.5">Cascade Prevented</span>
            <div className="font-mono text-base font-bold text-railmind-green leading-none">{animResolved}</div>
          </div>
        </div>
      </motion.header>

      {/* MAIN CONTENT — explicit grid */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 400px' }}>
        
        {/* Left: Map */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="map-wrapper h-full overflow-hidden"
        >
          <RailwayMap />
        </motion.div>

        {/* Right: Panels — must be above map */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col h-full overflow-hidden border-l border-railmind-border bg-[#0d1117]"
          style={{ position: 'relative', zIndex: 20 }}
        >
          {/* Selected Train Detail (compact, at top) */}
          {selectedTrain && (
            <div className="p-3 border-b border-railmind-border bg-[#111827] flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-white text-sm font-medium">
                  {selectedTrain.name}
                </div>
                <div className={`text-xs ${getStatusColor(selectedTrain.status)}`}>
                  {selectedTrain.delay_minutes > 0
                    ? `Delayed +${selectedTrain.delay_minutes} min`
                    : '✓ On Time'} • {selectedTrain.passengers} passengers
                </div>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="text-railmind-subtext hover:text-white text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Incident panel top half */}
          <div className="flex-1 overflow-y-auto min-h-0 border-b border-railmind-border">
            <IncidentPanel onSelectIncident={setSelectedIncident} />
          </div>

          {/* Agent feed bottom half */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <AgentFeed />
          </div>
        </motion.div>
      </div>

      {/* Incident Details Analysis Modal */}
      {selectedIncident && (
        <IncidentDetailModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
        />
      )}

      {/* Floating Scenario launcher */}
      <DemoLauncher onIncidentComplete={setSelectedIncident} />
    </div>
  )
}
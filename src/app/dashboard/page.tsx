'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
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

  const animTrains = useCountUp(trains.length)
  const animActive = useCountUp(activeCount)
  const animResolved = useCountUp(resolvedCount)

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e1a] text-white">
      {/* HEADER BAR */}
      <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-railmind-border bg-[#0d1117]">
        <div className="flex flex-col">
          <h1 className="text-sm font-black uppercase tracking-wider text-white">
            Railway Operations Intelligence Center
          </h1>
          <span className="text-[10px] text-railmind-subtext font-semibold uppercase">
            Live Network Monitor • RailMind Autonomous Agentic System
          </span>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3">
          {/* Trains Badge */}
          <div className="bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            <span className="text-xs text-railmind-subtext">
              Trains Monitored: <strong className="text-white font-mono">{animTrains}</strong>
            </span>
          </div>

          {/* Active Incidents Badge */}
          <div className={`px-3 py-1 rounded-lg flex items-center gap-1.5 border transition-all ${
            activeCount > 0 
              ? 'bg-railmind-red/10 border-railmind-red/30' 
              : 'bg-railmind-muted/20 border-railmind-border'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-railmind-red animate-ping' : 'bg-railmind-subtext'}`} />
            <span className="text-xs text-railmind-subtext">
              Active Delays: <strong className={`${activeCount > 0 ? 'text-railmind-red' : 'text-white'} font-mono`}>{animActive}</strong>
            </span>
          </div>

          {/* Delays Prevented Badge */}
          <div className="bg-railmind-green/10 border border-railmind-green/20 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-railmind-green" />
            <span className="text-xs text-railmind-subtext">
              Mitigated: <strong className="text-white font-mono">{animResolved}</strong>
            </span>
          </div>

          {/* Agents Badge */}
          <div className="bg-railmind-surface border border-railmind-border px-3 py-1 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-railmind-green animate-pulse" />
            <span className="text-xs text-railmind-subtext">
              Agents: <strong className="text-railmind-green uppercase font-bold tracking-wider">Ready</strong>
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT — explicit grid */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 400px' }}>
        
        {/* Left: Map */}
        <div className="map-wrapper h-full overflow-hidden">
          <RailwayMap onTrainSelect={setSelectedTrain} />
        </div>

        {/* Right: Panels — must be above map */}
        <div
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
        </div>
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
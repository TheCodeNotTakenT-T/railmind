'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import IncidentPanel from '@/components/incidents/IncidentPanel'
import IncidentDetailModal from '@/components/incidents/IncidentDetailModal'
import AgentFeed from '@/components/agents/AgentFeed'
import NotificationPreview from '@/components/notifications/NotificationPreview'
import DemoLauncher from '@/components/DemoLauncher'
import { useTrains, useIncidents } from '@/hooks'
import type { Train, Incident } from '@/lib/types'

const RailwayMap = dynamic(
  () => import('@/components/map/RailwayMap'),
  { ssr: false }
)

export default function DashboardPage() {
  const { trains } = useTrains()
  const { incidents: activeIncidents } = useIncidents('active')
  const { incidents: resolvedIncidents } = useIncidents('resolved')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const activeCount = activeIncidents.length
  const resolvedCount = resolvedIncidents.length

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] text-white overflow-hidden">
      {/* HEADER BAR */}
      <header className="h-14 border-b border-railmind-border bg-railmind-surface/80 backdrop-blur px-6 flex items-center justify-between shrink-0 z-10">
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
              Trains Monitored: <strong className="text-white font-mono">{trains.length}</strong>
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
              Active Delays: <strong className={`${activeCount > 0 ? 'text-railmind-red' : 'text-white'} font-mono`}>{activeCount}</strong>
            </span>
          </div>

          {/* Delays Prevented Badge */}
          <div className="bg-railmind-green/10 border border-railmind-green/20 px-3 py-1 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-railmind-green" />
            <span className="text-xs text-railmind-subtext">
              Mitigated: <strong className="text-white font-mono">{resolvedCount}</strong>
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

      {/* MAIN CONTAINER */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0 bg-[#070b13]">
        
        {/* Left Panel: Railway Map (60% width) */}
        <main className="col-span-7 flex flex-col p-4 border-r border-railmind-border overflow-hidden relative">
          <div className="flex-1 rounded-xl overflow-hidden border border-railmind-border/80 shadow-2xl relative">
            <RailwayMap />
          </div>
        </main>

        {/* Right Panel: Operations Feeds (40% width) */}
        <aside className="col-span-5 flex flex-col p-4 gap-4 overflow-y-auto max-h-full">
          
          {/* Active Incidents Panel (Max-height 50% to align layout) */}
          <div className="flex-1 min-h-[260px] overflow-hidden">
            <IncidentPanel onSelectIncident={setSelectedIncident} />
          </div>
          
          {/* Agent Operations Feed */}
          <div className="flex-1 min-h-[300px] overflow-hidden">
            <AgentFeed />
          </div>

        </aside>

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
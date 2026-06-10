'use client'

import { useState, useEffect } from 'react'
import { useIncidents, useTrains } from '@/hooks'
import { getSeverityBadgeClass, formatDelay, cn } from '@/lib/utils'
import IncidentDetailModal from '@/components/incidents/IncidentDetailModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Clock, Link2 } from 'lucide-react'
import type { Incident } from '@/lib/types'

export default function IncidentsPage() {
  const { incidents: active, loading: activeLoading } = useIncidents('active')
  const { incidents: resolved, loading: resolvedLoading } = useIncidents('resolved')
  const { trains } = useTrains()
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [now, setNow] = useState(new Date())

  // Keep now updated to get accurate minutes ago
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const activeList = active || []
  const resolvedList = resolved || []

  const displayed = filter === 'all' 
    ? [...activeList, ...resolvedList]
    : filter === 'active' 
      ? activeList 
      : resolvedList

  const getMinutesAgo = (isoString: string) => {
    const diffMs = now.getTime() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return diffMins <= 0 ? 'just now' : `${diffMins} min ago`
  }

  const getBorderColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical': return 'border-l-railmind-red'
      case 'high': return 'border-l-railmind-orange'
      case 'medium': return 'border-l-railmind-yellow'
      case 'low': return 'border-l-railmind-muted'
    }
  }

  const getStatusBadge = (status: 'active' | 'analyzing' | 'resolved') => {
    switch (status) {
      case 'active':
        return <Badge className="bg-railmind-red/10 text-railmind-red hover:bg-railmind-red/20 font-semibold border-none">Active</Badge>
      case 'analyzing':
        return <Badge className="bg-railmind-yellow/10 text-railmind-yellow hover:bg-railmind-yellow/20 font-semibold border-none">Analyzing</Badge>
      case 'resolved':
        return <Badge className="bg-railmind-green/10 text-railmind-green hover:bg-railmind-green/20 font-semibold border-none">Resolved</Badge>
    }
  }

  const loading = activeLoading && resolvedLoading

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1 border-b border-railmind-border pb-5">
        <h1 className="text-3xl font-black text-white tracking-tight">Active Incidents</h1>
        <p className="text-railmind-subtext text-sm font-medium">Cascade alert management and live propagation analysis</p>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 bg-railmind-surface/50 border border-railmind-border p-1 rounded-xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            filter === 'all'
              ? "bg-railmind-red text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          All ({activeList.length + resolvedList.length})
        </button>
        <button
          onClick={() => setFilter('active')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            filter === 'active'
              ? "bg-railmind-red text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          Active ({activeList.length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            filter === 'resolved'
              ? "bg-railmind-red text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          Resolved ({resolvedList.length})
        </button>
      </div>

      {/* INCIDENTS LIST GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-railmind-red border-t-transparent rounded-full animate-spin"></div>
          <span className="text-railmind-subtext text-sm font-semibold">Loading incidents...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-railmind-surface/30 border border-railmind-border border-dashed rounded-2xl gap-4">
          <div className="bg-railmind-green/10 p-4 rounded-full text-railmind-green">
            <CheckCircle size={36} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">No incidents in this category</h3>
            <p className="text-railmind-subtext text-xs mt-1">Railway operations are currently running smoothly.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((incident) => {
            const train = trains.find(t => t.id === incident.trigger_train_id)
            const trainName = train ? train.name : (incident.sentinel_analysis?.trainName || incident.trigger_train_id || 'Train')
            const borderClass = getBorderColor(incident.severity)
            const isCritical = incident.severity === 'critical'
            const cascadeCount = incident.cascade_impact?.cascadeTrains?.length || 0

            return (
              <Card
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={cn(
                  "bg-railmind-surface border border-railmind-border border-l-4 p-5 rounded-xl transition-all duration-200 cursor-pointer hover:bg-railmind-surface/80 flex flex-col gap-4 justify-between",
                  borderClass
                )}
                style={isCritical ? { boxShadow: '0 0 8px rgba(220,38,38,0.3)' } : undefined}
              >
                {/* TOP ROW */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider", getSeverityBadgeClass(incident.severity))}>
                        {incident.severity}
                      </span>
                    </div>
                    <span className="text-base font-bold text-white mt-1">{trainName}</span>
                  </div>
                  <span className="text-xs font-bold text-railmind-orange bg-railmind-orange/10 px-2.5 py-1 rounded-lg">
                    {formatDelay(incident.delay_minutes)}
                  </span>
                </div>

                {/* MIDDLE SECTION */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-railmind-subtext font-medium border-t border-railmind-border/50 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-railmind-subtext/75" />
                    <span>Detected: {getMinutesAgo(incident.detected_at)}</span>
                  </div>
                  {incident.cascade_impact && cascadeCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Link2 size={14} className="text-railmind-red/75" />
                      <span className="text-railmind-red font-semibold">Cascade: {cascadeCount} trains</span>
                    </div>
                  )}
                </div>

                {/* BOTTOM ROW */}
                <div className="flex items-center justify-between border-t border-railmind-border/50 pt-3">
                  {getStatusBadge(incident.status)}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs font-bold text-railmind-blue hover:text-white hover:bg-railmind-blue/10 rounded-lg"
                  >
                    View Analysis
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  )
}

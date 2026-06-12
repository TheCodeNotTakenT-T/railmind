'use client'

import { useState, useEffect } from 'react'
import { useIncidents, useTrains } from '@/hooks'
import { getSeverityBadgeClass, formatDelay, cn } from '@/lib/utils'
import IncidentDetailModal from '@/components/incidents/IncidentDetailModal'
import StaticMapThumbnail from '@/components/incidents/StaticMapThumbnail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Clock, Link2, Search, Filter, Layers } from 'lucide-react'
import type { Incident } from '@/lib/types'
import { toast } from 'sonner'

export default function IncidentsPage() {
  const { incidents: active, loading: activeLoading } = useIncidents('active')
  const { incidents: resolved, loading: resolvedLoading } = useIncidents('resolved')
  const { trains } = useTrains()
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [now, setNow] = useState(new Date())
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Keep now updated to get accurate minutes ago
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Sort Active list by most urgent Time to Cascade first
  const activeList = (active || []).sort((a, b) => {
    const aTime = a.cascade_impact?.timeToImpact ?? 999
    const bTime = b.cascade_impact?.timeToImpact ?? 999
    return aTime - bTime
  })
  const resolvedList = resolved || []

  const baseList = filter === 'all' 
    ? [...activeList, ...resolvedList]
    : filter === 'active' 
      ? activeList 
      : resolvedList

  // Apply text search filter
  const displayed = baseList.filter(incident => {
    if (!searchQuery) return true
    const train = trains.find(t => t.id === incident.trigger_train_id)
    const trainName = train?.name || incident.sentinel_analysis?.trainName || ''
    return trainName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           incident.severity.toLowerCase().includes(searchQuery.toLowerCase()) ||
           incident.id.toLowerCase().includes(searchQuery.toLowerCase())
  })

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
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-railmind-red animate-pulse" />
            <span className="text-railmind-red text-[10px] font-bold uppercase tracking-wider">Active</span>
          </div>
        )
      case 'analyzing':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-railmind-yellow animate-pulse" />
            <span className="text-railmind-yellow text-[10px] font-bold uppercase tracking-wider">Analyzing</span>
          </div>
        )
      case 'resolved':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-railmind-green" />
            <span className="text-railmind-green text-[10px] font-bold uppercase tracking-wider">Resolved</span>
          </div>
        )
    }
  }

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const loading = activeLoading && resolvedLoading

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-1 border-b border-railmind-border pb-5">
        <h1 className="text-3xl font-black text-white tracking-tight">Incident Management</h1>
        <p className="text-railmind-subtext text-sm font-medium">Global cascade alert management and bulk resolution actions</p>
      </div>

      {/* TOOLBAR: Search & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* FILTER TABS */}
        <div className="flex items-center bg-surface-1 border border-railmind-border p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-5 py-2 text-xs font-semibold rounded-lg transition-all",
              filter === 'all' ? "bg-surface-3 text-white shadow-md border border-railmind-border/50" : "text-railmind-subtext hover:text-white"
            )}
          >
            All ({activeList.length + resolvedList.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={cn(
              "px-5 py-2 text-xs font-semibold rounded-lg transition-all",
              filter === 'active' ? "bg-surface-3 text-white shadow-md border border-railmind-border/50" : "text-railmind-subtext hover:text-white"
            )}
          >
            Active ({activeList.length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={cn(
              "px-5 py-2 text-xs font-semibold rounded-lg transition-all",
              filter === 'resolved' ? "bg-surface-3 text-white shadow-md border border-railmind-border/50" : "text-railmind-subtext hover:text-white"
            )}
          >
            Resolved ({resolvedList.length})
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative w-full md:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-railmind-subtext" />
          <input 
            type="text" 
            placeholder="Search by train, severity, or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-1 border border-railmind-border rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-railmind-subtext focus:outline-none focus:ring-2 focus:ring-railmind-red/50 transition-all"
          />
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedIds.size > 0 && (
        <div className="bg-railmind-blue/10 border border-railmind-blue/30 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <Layers className="text-railmind-blue w-5 h-5 ml-1" />
            <span className="text-sm font-bold text-white">
              {selectedIds.size} incident{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs text-railmind-subtext hover:text-white">
              Cancel
            </Button>
            <Button size="sm" onClick={() => {
              toast.success(`Bulk resolution deployed to ${selectedIds.size} incidents.`)
              setSelectedIds(new Set())
            }} className="bg-railmind-blue hover:bg-railmind-blue/80 text-white text-xs font-bold rounded-lg px-4">
              Resolve Selected
            </Button>
          </div>
        </div>
      )}

      {/* INCIDENTS LIST GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-railmind-red border-t-transparent rounded-full animate-spin"></div>
          <span className="text-railmind-subtext text-sm font-semibold">Loading incidents...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 border border-railmind-border border-dashed rounded-2xl gap-4">
          <div className="bg-surface-2 p-4 rounded-full text-railmind-subtext">
            <CheckCircle size={36} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white">No matching incidents</h3>
            <p className="text-railmind-subtext text-xs mt-1">Railway operations are currently running smoothly.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((incident) => {
            const train = trains.find(t => t.id === incident.trigger_train_id)
            const trainName = train ? train.name : (incident.sentinel_analysis?.trainName || incident.trigger_train_id || 'Train')
            const borderClass = getBorderColor(incident.severity)
            const cascadeCount = incident.cascade_impact?.cascadeTrains?.length || 0
            const isSelected = selectedIds.has(incident.id)

            // Extract lat/lng if available (fallback to New Delhi)
            let lat = 28.6139, lng = 77.2090
            if (train?.current_lat && train?.current_lng) {
              lat = train.current_lat
              lng = train.current_lng
            } else if ((incident.cascade_impact as any)?.epicenter_lat) {
              lat = (incident.cascade_impact as any).epicenter_lat
              lng = (incident.cascade_impact as any).epicenter_lng
            } else if ((incident as any).location) {
              lat = (incident as any).location.lat
              lng = (incident as any).location.lng
            }

            return (
              <Card
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={cn(
                  "group relative bg-surface-1 border border-railmind-border border-l-4 p-4 rounded-xl transition-all duration-200 cursor-pointer hover:bg-surface-2 flex flex-col gap-3 justify-between shadow-lg shadow-black/20",
                  borderClass,
                  isSelected ? "ring-2 ring-railmind-blue border-transparent bg-surface-2" : ""
                )}
              >
                {/* CHECKBOX */}
                <div 
                  className="absolute top-4 right-4 z-10 p-1"
                  onClick={(e) => handleToggleSelect(e, incident.id)}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    readOnly
                    className="w-4 h-4 cursor-pointer accent-railmind-blue"
                  />
                </div>

                {/* TOP ROW WITH MAP THUMBNAIL */}
                <div className="flex gap-4">
                  <StaticMapThumbnail lat={lat} lng={lng} />
                  
                  <div className="flex flex-col gap-1.5 flex-1 pr-8">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px] font-bold px-1.5 py-0 rounded uppercase tracking-wider", getSeverityBadgeClass(incident.severity))}>
                        {incident.severity}
                      </Badge>
                      <span className="text-[10px] font-bold text-railmind-orange bg-surface-0 border border-railmind-border px-1.5 py-0.5 rounded">
                        +{formatDelay(incident.delay_minutes)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-white line-clamp-1">{trainName}</span>
                    <span className="text-xs text-railmind-subtext line-clamp-1">{incident.sentinel_analysis?.reason || 'Cascade analysis pending...'}</span>
                  </div>
                </div>

                {/* BOTTOM ROW */}
                <div className="flex items-center justify-between border-t border-railmind-border/50 pt-3 mt-1">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(incident.status)}
                    <div className="w-px h-3 bg-railmind-border" />
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-railmind-subtext uppercase tracking-wider">
                      <Clock size={12} />
                      <span>{getMinutesAgo(incident.detected_at)}</span>
                    </div>
                  </div>
                  
                  {incident.cascade_impact && cascadeCount > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-railmind-subtext">Impact:</span>
                      <span className="text-railmind-red">{cascadeCount} trains</span>
                    </div>
                  )}
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

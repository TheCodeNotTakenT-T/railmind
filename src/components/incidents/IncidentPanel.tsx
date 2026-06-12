'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIncidents, useTrains } from '@/hooks'
import { getSeverityBadgeClass } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Incident } from '@/lib/types'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface IncidentPanelProps {
  onSelectIncident: (incident: Incident) => void
}

export default function IncidentPanel({ onSelectIncident }: IncidentPanelProps) {
  const { incidents, loading } = useIncidents('active')
  const { trains } = useTrains()
  const [now, setNow] = useState(Date.now())

  // Force re-render every second for countdown timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getTrainName = (trainId: string) => {
    const train = trains.find(t => t.id === trainId)
    return train ? train.name : `Train ${trainId}`
  }

  const getSeverityClasses = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'incident-critical border-y-0 border-r-0'
      case 'high':
        return 'incident-high border-y-0 border-r-0'
      case 'medium':
        return 'incident-medium border-y-0 border-r-0'
      case 'low':
        return 'incident-low border-y-0 border-r-0'
    }
  }

  const formatTimeAgo = (detectedAt: string) => {
    const diffMs = now - new Date(detectedAt).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin <= 0) return 'Just now'
    return `${diffMin}m ago`
  }

  const formatCountdown = (detectedAt: string, timeToImpactMin: number) => {
    const targetTime = new Date(detectedAt).getTime() + (timeToImpactMin * 60000)
    const remainingMs = targetTime - now
    
    if (remainingMs <= 0) return 'IMMINENT'
    
    const m = Math.floor(remainingMs / 60000)
    const s = Math.floor((remainingMs % 60000) / 1000)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const activeCount = incidents.length

  return (
    <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-railmind-border pb-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-railmind-subtext uppercase flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-railmind-red animate-pulse" />
          ACTIVE INCIDENTS
        </h2>
        {activeCount > 0 && (
          <Badge variant="destructive" className="font-bold text-xs bg-railmind-red text-white">
            {activeCount}
          </Badge>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-railmind-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-railmind-border rounded-xl bg-railmind-bg/40 text-center p-4">
            <CheckCircle2 className="w-10 h-10 text-railmind-green mb-2 animate-bounce" />
            <p className="text-white text-sm font-semibold">No active incidents</p>
            <p className="text-railmind-subtext text-xs mt-1">All systems normal</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {incidents.map((incident) => {
              const trainName = getTrainName(incident.trigger_train_id)
              const hasCascade = incident.cascade_impact && incident.cascade_impact.cascadeTrains
              const hasResolution = incident.resolution_options && incident.resolution_options.length > 0
              const timeToImpact = incident.sentinel_analysis?.timeToImpact
              const isAnalyzed = hasResolution && timeToImpact

              return (
                <motion.div
                  key={incident.id}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    onClick={() => onSelectIncident(incident)}
                    className={`cursor-pointer hover:-translate-y-0.5 hover:scale-[1.01] transition-all duration-200 p-3 flex flex-col gap-2 rounded-r-lg ${getSeverityClasses(incident.severity)}`}
                  >
                    {/* Top Row */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-base text-white truncate max-w-[70%]">
                        {trainName}
                      </div>
                      <Badge className={getSeverityBadgeClass(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Middle Row */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="text-xs font-semibold text-railmind-subtext flex items-center justify-between">
                        <span className="uppercase tracking-wider text-[10px]">Current Delay:</span>
                        <span className="font-mono text-glow-red text-railmind-red font-bold text-sm text-shadow">+{incident.delay_minutes} min</span>
                      </div>
                      
                      {timeToImpact ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-railmind-orange bg-railmind-orange/10 px-2 py-1 rounded">
                          <span className="animate-pulse">⏱</span> 
                          <span>Cascade in {formatCountdown(incident.detected_at, timeToImpact)}</span>
                        </div>
                      ) : hasCascade ? (
                        <div className="text-[11px] text-railmind-orange bg-railmind-orange/10 px-2 py-0.5 rounded border border-railmind-orange/20 mt-1">
                          ⚠ Cascade: {incident.cascade_impact!.cascadeTrains.length} trains at risk
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-between items-center text-[10px] text-railmind-subtext mt-1 border-t border-white/[0.04] pt-2">
                      <span className="font-mono">{formatTimeAgo(incident.detected_at)}</span>
                      {isAnalyzed ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-railmind-green">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Analyzed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-railmind-blue shimmer">
                          <div className="w-2 h-2 border border-railmind-blue border-t-transparent rounded-full animate-spin" />
                          <span className="font-bold tracking-wider">⚡ Analyzing...</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

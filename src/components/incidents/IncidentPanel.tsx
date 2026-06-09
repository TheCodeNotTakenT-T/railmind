'use client'

import React from 'react'
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

  const getTrainName = (trainId: string) => {
    const train = trains.find(t => t.id === trainId)
    return train ? train.name : `Train ${trainId}`
  }

  const getSeverityBorder = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-l-railmind-red'
      case 'high':
        return 'border-l-4 border-l-railmind-orange'
      case 'medium':
        return 'border-l-4 border-l-railmind-yellow'
      case 'low':
        return 'border-l-4 border-l-railmind-muted'
    }
  }

  const formatTimeAgo = (detectedAt: string) => {
    const diffMs = Date.now() - new Date(detectedAt).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin <= 0) return 'Just now'
    return `${diffMin}m ago`
  }

  const activeCount = incidents.length

  return (
    <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-railmind-border pb-3">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-railmind-red animate-pulse" />
          Active Incidents
        </h2>
        {activeCount > 0 && (
          <Badge variant="destructive" className="font-bold text-xs">
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
              const isCritical = incident.severity === 'critical'

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
                    className={`cursor-pointer hover:bg-railmind-muted/20 hover:scale-[1.01] transition-all duration-200 p-3 flex flex-col gap-2 ${getSeverityBorder(
                      incident.severity
                    )} ${isCritical ? 'animate-pulse-critical border border-railmind-red/35' : ''}`}
                  >
                    {/* Top Row */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-sm text-white truncate max-w-[70%]">
                        {trainName}
                      </div>
                      <Badge className={getSeverityBadgeClass(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Middle Row */}
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold text-railmind-subtext flex justify-between">
                        <span>Delay:</span>
                        <span className="text-railmind-red">+{incident.delay_minutes} min</span>
                      </div>
                      {hasCascade && (
                        <div className="text-[11px] text-railmind-orange bg-railmind-orange/10 px-2 py-0.5 rounded border border-railmind-orange/20 mt-1">
                          ⚠ Cascade: {incident.cascade_impact.cascadeTrains.length} trains at risk
                        </div>
                      )}
                    </div>

                    {/* Bottom Row */}
                    <div className="flex justify-between items-center text-[10px] text-railmind-subtext mt-1 border-t border-railmind-border/50 pt-2">
                      <span>{formatTimeAgo(incident.detected_at)}</span>
                      {hasResolution ? (
                        <Badge variant="success" className="text-[9px] py-0.5 px-1.5 font-bold">
                          ✓ Analyzed
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 text-railmind-blue">
                          <div className="w-2 h-2 border border-railmind-blue border-t-transparent rounded-full animate-spin" />
                          <span>Analyzing...</span>
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

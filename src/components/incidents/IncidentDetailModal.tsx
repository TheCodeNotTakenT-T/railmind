'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTrains } from '@/hooks'
import { getSeverityBadgeClass } from '@/lib/utils'
import type { Incident } from '@/lib/types'
import { toast } from 'sonner'
import { 
  X, AlertTriangle, GitBranch, Lightbulb, MessageSquare, 
  CheckCircle, ArrowRight, ShieldAlert, Clock, RefreshCw, Send
} from 'lucide-react'

const CascadeGraph = dynamic(() => import('./CascadeGraph'), { ssr: false })

interface IncidentDetailModalProps {
  incident: Incident | null
  onClose: () => void
}

export default function IncidentDetailModal({ incident, onClose }: IncidentDetailModalProps) {
  const { trains } = useTrains()
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  if (!incident) return null

  const train = trains.find((t) => t.id === incident.trigger_train_id)
  const trainName = train ? train.name : incident.sentinel_analysis?.trainName || incident.trigger_train_id || 'Train'
  const trainNumber = train ? train.number : incident.trigger_train_id || ''

  const cascadeData = (incident.cascade_impact || {}) as any
  const cascadeTrains = cascadeData.cascadeTrains || []
  const passengers = cascadeData.passengersAffected
    ?? cascadeTrains.reduce((sum: number, t: any) => sum + (t.estimatedDelay || t.delayMinutes || 0), 0)
    ?? 0
  const totalDelay = cascadeData.totalCascadeMinutes
    || cascadeTrains.length * 15
    || 0
  const timeToImpact = cascadeData.timeToImpact ?? 18
  const resolutionOptions = incident.resolution_options || []
  const notifications = incident.notifications || null

  const handleApplyResolution = async (index: number) => {
    setApplyingIndex(index)
    try {
      const res = await fetch(`/api/incidents/${incident.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionIndex: index }),
      })
      const data = await res.json()
      if (res.ok) {
        const opt = resolutionOptions[index]
        toast.success('Resolution applied — cascade prevented', {
          description: `Estimated ${opt?.estimatedDelayReduction || 0} minutes saved`,
          duration: 4000,
        })
        onClose()
      } else {
        toast.error(`Error: ${data.error || 'Failed to apply resolution'}`)
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Server error'}`)
    } finally {
      setApplyingIndex(null)
    }
  }

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Dialog open={!!incident} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl bg-railmind-bg border-railmind-border p-6 rounded-2xl text-white" style={{ zIndex: 9999 }}>
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-railmind-border pb-4 mb-6 relative">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{trainName}</h1>
              <Badge className={getSeverityBadgeClass(incident.severity)}>
                {incident.severity.toUpperCase()}
              </Badge>
            </div>
            <p className="text-railmind-subtext text-xs">
              Train #{trainNumber} • Detected at {formatTime(incident.detected_at)}
            </p>
          </div>
          
          <div className="flex items-center gap-4 pr-10">
            <div className="text-right">
              <span className="text-xs text-railmind-subtext block">Current Delay</span>
              <span className="text-2xl font-extrabold text-railmind-red">+{incident.delay_minutes} min</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="absolute top-0 right-0 p-1.5 rounded-lg border border-railmind-border bg-railmind-surface text-railmind-subtext hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* SECTION 2: Cascade Impact */}
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
              <GitBranch className="w-4 h-4 text-railmind-orange" />
              Cascade Analysis
            </h2>
            
            {!incident.cascade_impact || !incident.cascade_impact.cascadeTrains ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-railmind-subtext text-sm">
                  {incident.status === 'resolved' 
                    ? 'Cascade analysis was not required for this incident.'
                    : 'This incident has not been analyzed yet.'}
                </p>
                {incident.status !== 'resolved' && (
                  <>
                    <button
                      onClick={async () => {
                        setIsAnalyzing(true)
                        try {
                          await fetch('/api/agents/analyze', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ incidentId: incident.id })
                          })
                          // Refresh incident data after 3 seconds
                          setTimeout(() => window.location.reload(), 3000)
                        } catch (err) {
                          console.error('Analysis failed:', err)
                        } finally {
                          setIsAnalyzing(false)
                        }
                      }}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-railmind-red text-white rounded-lg 
                                 text-sm font-medium hover:bg-red-700 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed flex 
                                 items-center gap-2 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          Analyzing...
                        </>
                      ) : (
                        <>⚡ Re-run Agent Pipeline</>
                      )}
                    </button>
                    <p className="text-xs text-railmind-subtext mt-1">
                      Note: Re-analysis may reclassify severity and auto-resolve low-risk incidents
                    </p>
                  </>
                )}
              </div>
            ) : cascadeTrains.length === 0 ? (
              <div className="bg-railmind-surface/30 border border-railmind-border/50 border-dashed rounded-xl p-4 text-center text-xs text-railmind-subtext">
                No cascade impact detected — delay isolated
              </div>
            ) : (
              <div className="bg-railmind-surface/60 border border-railmind-border rounded-xl p-4">
                {/* Cascade Graph Visualization */}
                <div className="mb-4">
                  <CascadeGraph
                    cascadeTrains={cascadeTrains}
                    primaryTrain={trainName}
                    primaryDelay={incident.delay_minutes}
                  />
                </div>

                {/* Cascade Train Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cascadeTrains.map((cTrain: any, i: number) => {
                    const delay = cTrain.estimatedDelay ?? cTrain.delayMinutes ?? 0
                    return (
                      <div 
                        key={cTrain.id || i}
                        className="bg-railmind-surface border border-railmind-border/60 rounded-lg p-3 flex justify-between items-center gap-2"
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className="font-bold text-sm text-white truncate">
                            {cTrain.trainName || cTrain.name || 'Unknown Train'}
                          </span>
                          <p className="text-[11px] text-railmind-subtext truncate">
                            {cTrain.reason}
                          </p>
                          <span className="text-[10px] font-bold text-railmind-blue bg-railmind-blue/10 px-1.5 py-0.5 rounded w-fit">
                            L{cTrain.level ?? 1}
                          </span>
                        </div>
                        <span className="font-bold text-railmind-orange text-sm whitespace-nowrap bg-railmind-orange/10 px-2.5 py-1 rounded border border-railmind-orange/20">
                          +{delay} min
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-[11px] text-railmind-subtext border-t border-railmind-border/40 pt-3">
                  <span>Passengers Impacted: <strong className="text-white">{passengers}</strong></span>
                  <span>Total Cascade Delay: <strong className="text-white">{totalDelay} min</strong></span>
                  <span>Impact Horizon: <strong className="text-white">{timeToImpact} min</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Resolution Options */}
          {resolutionOptions.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
                <Lightbulb className="w-4 h-4 text-railmind-yellow" />
                Resolution Options
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resolutionOptions.map((opt: any, i: number) => {
                  const isBest = i === 0
                  const isApplying = applyingIndex === i

                  return (
                    <Card 
                      key={i} 
                      className={`flex flex-col justify-between bg-railmind-surface/80 border p-4 gap-3 transition-all ${
                        isBest ? 'border-railmind-green/60 ring-1 ring-railmind-green/20' : 'border-railmind-border'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-sm text-white line-clamp-1">{opt.title}</span>
                          {isBest && (
                            <Badge variant="success" className="text-[9px] px-1 py-0 font-bold uppercase tracking-wider whitespace-nowrap">
                              Best Option
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center gap-1 border-b border-railmind-border pb-2">
                          <span className="text-railmind-green text-xs font-bold bg-railmind-green/10 px-2 py-0.5 rounded border border-railmind-green/10">
                            Saves {opt.estimatedDelayReduction} min
                          </span>
                          <span className="text-[10px] text-railmind-subtext font-semibold uppercase">
                            {opt.difficulty}
                          </span>
                        </div>

                        {/* Immediate Actions */}
                        <div className="space-y-1.5 mt-1">
                          <span className="text-[10px] font-bold text-railmind-subtext uppercase block">Action Timeline</span>
                          <ul className="space-y-1 text-xs">
                            {opt.immediateActions?.map((action: string, j: number) => (
                              <li key={j} className="text-railmind-text flex gap-1.5 items-start">
                                <span className="text-railmind-blue font-mono text-[10px] bg-railmind-blue/10 px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                                  {action.slice(0, 7)}
                                </span>
                                <span className="line-clamp-2">{action.slice(8)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Tradeoffs */}
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-railmind-border/50">
                        <p className="text-[11px] text-railmind-subtext italic line-clamp-2">
                          Tradeoff: {opt.tradeoffs}
                        </p>
                        
                        {incident.status !== 'resolved' ? (
                          <button
                            disabled={applyingIndex !== null}
                            onClick={() => handleApplyResolution(i)}
                            className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              isBest 
                                ? 'bg-railmind-green hover:bg-railmind-green/80 text-railmind-bg' 
                                : 'bg-railmind-muted hover:bg-railmind-muted/80 text-white'
                            }`}
                          >
                            {isApplying ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Apply Options
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="text-center text-[10px] text-railmind-green font-bold bg-railmind-green/5 py-1.5 rounded border border-railmind-green/10">
                            Resolution Finished
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* SECTION 4: Notifications */}
          {notifications && (
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-railmind-blue" />
                Generated Communications
              </h2>

              <Tabs defaultValue="sms" className="bg-railmind-surface/40 border border-railmind-border rounded-xl p-4">
                <TabsList className="grid grid-cols-3 w-full max-w-sm mb-4">
                  <TabsTrigger value="sms">Passenger SMS</TabsTrigger>
                  <TabsTrigger value="brief">Station Master</TabsTrigger>
                  <TabsTrigger value="crew">Crew Alert</TabsTrigger>
                </TabsList>

                {/* Passenger SMS */}
                <TabsContent value="sms" className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="w-[220px] h-[340px] bg-[#090d16] rounded-[24px] border-4 border-railmind-muted shadow-2xl relative p-3 flex flex-col justify-between shrink-0">
                    {/* Status Bar */}
                    <div className="flex justify-between items-center text-[8px] text-railmind-subtext px-2 border-b border-railmind-border pb-1">
                      <span>9:41 AM</span>
                      <div className="flex gap-1">
                        <span>📶</span>
                        <span>🔋</span>
                      </div>
                    </div>
                    {/* Message Body */}
                    <div className="flex-1 flex flex-col justify-end gap-2 p-1">
                      <div className="bg-[#1f2937] text-white text-xs p-2 rounded-2xl rounded-bl-none max-w-[85%] self-start border border-railmind-border animate-in slide-in-from-bottom-2 duration-300">
                        {notifications.passengerSMS}
                      </div>
                    </div>
                    {/* Bottom Indicator */}
                    <div className="w-20 h-1 bg-railmind-muted mx-auto rounded-full mt-2" />
                  </div>
                  <div className="flex flex-col gap-2 items-start justify-center">
                    <span className="text-xs font-bold text-white uppercase">SMS Dispatch Preview</span>
                    <p className="text-xs text-railmind-subtext max-w-md">
                      Live cellular SMS broadcast sent to all ticketed passengers on {trainName} and connected cascade services.
                    </p>
                    <span className="text-[11px] text-railmind-subtext mt-1">
                      Character Count: <strong className={notifications.passengerSMS.length > 160 ? 'text-railmind-red' : 'text-railmind-green'}>
                        {notifications.passengerSMS.length}
                      </strong> / 160
                    </span>
                    <button
                      onClick={() => toast.success('SMS notifications broadcasted to passengers!')}
                      className="mt-2 py-1.5 px-4 bg-railmind-blue hover:bg-railmind-blue/80 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Dispatch SMS
                    </button>
                  </div>
                </TabsContent>

                {/* Station Master Brief */}
                <TabsContent value="brief" className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-white uppercase">Critical Station Duty Checklist</span>
                  <div className="bg-railmind-surface border border-railmind-border rounded-lg p-3 space-y-2.5">
                    {notifications.stationMasterBrief?.map((brief: string, idx: number) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border-b border-railmind-border/30 pb-2 last:border-0 last:pb-0">
                        <input type="checkbox" className="w-4 h-4 rounded-full border border-railmind-border accent-railmind-green cursor-pointer mt-0.5" />
                        <div className="flex gap-2">
                          <span className="font-mono text-railmind-blue bg-railmind-blue/10 px-1 py-0.5 rounded text-[10px] h-fit select-none">
                            {brief.slice(0, 7)}
                          </span>
                          <span className="text-white font-medium">{brief.slice(8)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Crew Alert */}
                <TabsContent value="crew" className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-white uppercase">Loco Pilot & Crew Handoff Dispatch</span>
                  <div className="border border-railmind-yellow bg-railmind-yellow/5 p-4 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-railmind-yellow shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-railmind-yellow">Operational Crew Alert:</span>
                      <p className="text-railmind-text leading-relaxed font-medium mt-1">
                        {notifications.crewAlert}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success('Crew alert successfully sent to active duty rosters!')}
                    className="self-start py-1.5 px-4 bg-railmind-yellow hover:bg-railmind-yellow/80 text-railmind-bg rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send to Crew
                  </button>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Play, RotateCcw, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react'
import type { Incident } from '@/lib/types'

interface DemoLauncherProps {
  onIncidentComplete?: (incident: Incident) => void
}

const SCENARIOS = [
  { 
    id: 'A', 
    label: 'Howrah Rajdhani — Patna Cascade', 
    desc: '25min delay, 3 trains, 1200 passengers' 
  },
  { 
    id: 'B', 
    label: 'Signal Failure — Mumbai Nashik', 
    desc: '40min block, 5 trains, 3200 passengers' 
  },
  { 
    id: 'C', 
    label: 'Crew Unavailable — Mathura Jn', 
    desc: '20min delay, crew crossover failure' 
  },
  { 
    id: 'D', 
    label: 'Platform Conflict — New Delhi', 
    desc: '4 trains, 2 platforms short, 15min window' 
  },
]

const PROGRESS_STEPS = [
  'Injecting delay scenario...', // 0
  'Sentinel Agent detecting anomaly...', // 1
  'Cascade Analyzer tracing impact...', // 2
  'Resolution Agent generating options...', // 3
  'Communication Agent drafting notifications...', // 4
  '✅ Analysis complete — opening command center' // 5
]

export default function DemoLauncher({ onIncidentComplete }: DemoLauncherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const startPolling = (incidentId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}`)
        if (!res.ok) return

        const data = await res.json()
        const incident = data.incident as Incident

        if (!incident) return

        // Map database state to progress steps
        if (incident.notifications) {
          setCurrentStep(5)
          setIsRunning(false)
          setLastIncidentId(incidentId)
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          toast.success('Full pipeline complete — incident analyzed', { duration: 3000 })
          
          // Small delay before opening modal
          setTimeout(() => {
            onIncidentComplete?.(incident)
          }, 1000)
        } else if (incident.resolution_options && incident.resolution_options.length > 0) {
          setCurrentStep(4)
        } else if (incident.cascade_impact) {
          setCurrentStep(3)
        } else if (incident.sentinel_analysis) {
          setCurrentStep(2)
        } else {
          setCurrentStep(1)
        }
      } catch (err) {
        console.error('Error polling incident status:', err)
      }
    }, 1500)
  }

  const handleSelectScenario = async (id: string) => {
    setIsOpen(false)
    setIsRunning(true)
    setCurrentStep(0)
    
    try {
      // Step 1: Inject Scenario
      const injectRes = await fetch('/api/simulation/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioPreset: id }),
      })
      
      if (!injectRes.ok) {
        throw new Error('Failed to inject delay scenario')
      }
      
      const { incidentId } = await injectRes.json()
      
      // Transition to detecting anomaly
      setCurrentStep(1)
      toast.info('Delay scenario injected — agents activating', { duration: 2000 })
      
      // Step 2: Trigger Agent Pipeline asynchronously (don't await, let polling track it)
      fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      }).catch(err => console.error('Agent analysis trigger error:', err))

      // Start polling DB
      startPolling(incidentId)

    } catch (err: any) {
      toast.error(`Demo failed: ${err.message || 'Error occurred'}`)
      setIsRunning(false)
    }
  }

  const handleReset = async () => {
    const loadingToast = toast.loading('Resetting simulation engine...')
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' })
      if (res.ok) {
        setLastIncidentId(null)
        toast.success('Simulation reset successfully!', { id: loadingToast })
      } else {
        toast.error('Failed to reset simulation', { id: loadingToast })
      }
    } catch (err: any) {
      toast.error(`Reset error: ${err.message}`, { id: loadingToast })
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 flex items-center gap-3" style={{ zIndex: 9990 }}>
        {/* Reset Button */}
        {lastIncidentId && !isRunning && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center p-3 rounded-full bg-railmind-muted hover:bg-railmind-muted/80 text-white shadow-xl hover:scale-105 transition-all cursor-pointer border border-railmind-border"
            title="Reset Simulation"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}

        {/* Main Demo Launcher Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { if (!isRunning) setIsOpen(!isOpen) }}
            disabled={isRunning}
            className={`flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-2xl hover:scale-[1.02] transition-all cursor-pointer border select-none ${
              isRunning 
                ? 'bg-railmind-muted border-railmind-border text-railmind-subtext cursor-not-allowed' 
                : 'bg-railmind-red hover:bg-railmind-red/90 text-white border-railmind-red/20'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running Scenario...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>Run Demo Scenario</span>
              </>
            )}
          </button>

          {/* Scenario Selection Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: -8, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 w-80 bg-railmind-surface border border-railmind-border rounded-xl shadow-2xl overflow-hidden p-2 flex flex-col gap-1.5 z-[100]"
              >
                <div className="px-3 py-1.5 border-b border-railmind-border">
                  <span className="text-xs font-bold text-railmind-subtext uppercase tracking-wider">Select Scenario Preset</span>
                </div>
                {SCENARIOS.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => handleSelectScenario(scen.id)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-railmind-muted/30 transition-all flex flex-col gap-1 cursor-pointer border border-transparent hover:border-railmind-border/60"
                  >
                    <span className="font-bold text-xs text-white">{scen.label}</span>
                    <span className="text-[10px] text-railmind-subtext leading-relaxed">{scen.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Overlay */}
      <AnimatePresence>
        {isRunning && (
          <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 9995, background: 'rgba(0,0,0,0.8)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-railmind-surface border border-railmind-border p-6 rounded-2xl w-full max-w-md shadow-2xl flex flex-col gap-5 text-white"
            >
              <div className="flex items-center gap-2 border-b border-railmind-border pb-3">
                <AlertTriangle className="w-5 h-5 text-railmind-yellow animate-pulse" />
                <h3 className="font-extrabold text-md uppercase tracking-wider">RailMind Agent Operations</h3>
              </div>

              {/* Steps Progress List */}
              <div className="space-y-4">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStep
                  const isCurrent = idx === currentStep
                  const isPending = idx > currentStep

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        isCurrent ? 'scale-[1.02] font-semibold text-white' : 'text-railmind-subtext opacity-60'
                      }`}
                    >
                      {/* Indicator Icon */}
                      <div className="shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-railmind-green fill-railmind-green/10" />
                        ) : isCurrent ? (
                          <Loader2 className="w-5 h-5 text-railmind-blue animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-railmind-border flex items-center justify-center text-[10px] font-mono select-none">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      
                      {/* Step Text */}
                      <span className={`text-xs ${isCurrent ? 'text-white font-bold' : ''}`}>
                        {step}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Current Active Step Highlight */}
              <div className="bg-railmind-bg/80 border border-railmind-border p-3 rounded-lg flex items-start gap-2.5 mt-2">
                <Info className="w-4 h-4 text-railmind-blue mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-railmind-text">
                  Multi-agent AI network resolves platform conflicts, crew roster handoffs, and passenger SMS dispatch automatically.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

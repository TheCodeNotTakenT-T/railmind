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

const STAGES = [
  { id: 0, label: 'Injecting Delay Scenario', agent: null, color: '#9ca3af' },
  { id: 1, label: 'Sentinel Agent', sublabel: 'Detecting anomaly severity', agent: 'S', color: '#3b82f6' },
  { id: 2, label: 'Cascade Analyzer', sublabel: 'Tracing downstream impact', agent: 'C', color: '#f97316' },
  { id: 3, label: 'Resolution Agent', sublabel: 'Generating action plans', agent: 'R', color: '#a855f7' },
  { id: 4, label: 'Communication Agent', sublabel: 'Drafting notifications', agent: 'M', color: '#22c55e' },
  { id: 5, label: 'Analysis Complete', agent: null, color: '#22c55e' },
]

export default function DemoLauncher({ onIncidentComplete }: DemoLauncherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  
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
          setShowFlash(true)
          setTimeout(() => setShowFlash(false), 150)

          setTimeout(() => {
            setIsRunning(false)
            setLastIncidentId(incidentId)
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            toast.success('Full pipeline complete — incident analyzed', { duration: 3000 })
            
            // Small delay before opening modal
            setTimeout(() => {
              onIncidentComplete?.(incident)
            }, 1000)
          }, 400)
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
      // Reset simulation to clean state before demo
      try {
        await fetch('/api/simulation/reset', { method: 'POST' })
      } catch {
        // ignore reset errors
      }
      
      // Small delay to let reset complete
      await new Promise(r => setTimeout(r, 500))

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
            className={`btn-press relative overflow-hidden flex items-center gap-2 px-5 py-3 rounded-full font-bold shadow-2xl hover:scale-[1.02] transition-all cursor-pointer border select-none ${
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
                <span className="absolute inset-0 -translate-x-full hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9995 }}
            className="flex flex-col justify-end backdrop-blur-sm"
          >
            {/* Dimming backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Main panel */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="relative glass rounded-t-3xl border-t border-white/10 p-8 w-full max-w-4xl mx-auto shadow-2xl"
            >
              {/* Title with typing reveal */}
              <div className="text-center mb-6">
                <p className="text-[10px] tracking-[0.3em] text-railmind-red font-mono font-bold mb-1">
                  RAILMIND AUTONOMOUS PIPELINE
                </p>
                <h3 className="text-lg font-bold text-white">
                  {currentStep < 5 ? 'Agents Processing...' : 'Pipeline Complete'}
                </h3>
              </div>

              {/* Pipeline node visualization */}
              <div className="flex items-center justify-between mb-8 px-2">
                {STAGES.filter(s => s.agent).map((stage, i, arr) => (
                  <React.Fragment key={stage.id}>
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm relative"
                        style={{
                          background: currentStep > stage.id 
                            ? `${stage.color}30` 
                            : currentStep === stage.id 
                            ? `${stage.color}20`
                            : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${
                            currentStep >= stage.id ? stage.color : '#1f2937'
                          }`,
                          color: currentStep >= stage.id ? stage.color : '#374151'
                        }}
                        animate={currentStep === stage.id ? {
                          boxShadow: [
                            `0 0 0px ${stage.color}00`,
                            `0 0 24px ${stage.color}, 0 0 40px ${stage.color}60`,
                            `0 0 0px ${stage.color}00`
                          ],
                          scale: [1, 1.08, 1]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 1.3 }}
                      >
                        {currentStep > stage.id ? '✓' : stage.agent}
                      </motion.div>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flex-1 mx-1 relative overflow-hidden transition-all ${currentStep === stage.id ? 'h-[2px]' : 'h-px'}`}>
                        <div 
                          className="absolute inset-0"
                          style={{
                            background: currentStep > stage.id 
                              ? stage.color 
                              : '#1f2937',
                            opacity: currentStep > stage.id ? 0.5 : 1
                          }}
                        />
                        {currentStep === stage.id && (
                          <div className="absolute inset-0 pipeline-active" />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Current stage description */}
              <div className="text-center min-h-[50px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="text-white font-medium">
                      {STAGES[currentStep]?.label}
                    </p>
                    {STAGES[currentStep]?.sublabel && (
                      <p className="text-railmind-subtext text-sm mt-1">
                        {STAGES[currentStep].sublabel}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom info line */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
                <p className="text-xs text-railmind-subtext">
                  Multi-agent AI network resolves platform conflicts, crew handoffs, and passenger notifications autonomously
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion Flash */}
      {showFlash && (
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'white', pointerEvents: 'none' }}
        />
      )}
    </>
  )
}

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentLogs } from '@/hooks'
import { Eye, GitBranch, Lightbulb, MessageSquare, Cpu, Loader2 } from 'lucide-react'
import type { AgentLog } from '@/lib/types'

const AGENT_COLORS: Record<string, { bg: string, text: string, glow: string, gradient: string }> = {
  Sentinel: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', glow: 'rgba(59,130,246,0.4)', gradient: 'radial-gradient(circle at top left, #3b82f6 0%, #1d4ed8 100%)' },
  CascadeAnalyzer: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', glow: 'rgba(249,115,22,0.4)', gradient: 'radial-gradient(circle at top left, #f97316 0%, #c2410c 100%)' },
  Resolution: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7', glow: 'rgba(168,85,247,0.4)', gradient: 'radial-gradient(circle at top left, #a855f7 0%, #7e22ce 100%)' },
  Communication: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', glow: 'rgba(34,197,94,0.4)', gradient: 'radial-gradient(circle at top left, #22c55e 0%, #15803d 100%)' },
  Orchestrator: { bg: 'rgba(226,232,240,0.08)', text: '#e2e8f0', glow: 'rgba(226,232,240,0.3)', gradient: 'radial-gradient(circle at top left, #9ca3af 0%, #4b5563 100%)' },
}

interface AgentFeedProps {
  incidentId?: string
}

const parseAction = (action: string, agentName: string) => {
  if (action.includes(':')) {
    const parts = action.split(':')
    return { type: parts[0].trim(), text: parts.slice(1).join(':').trim() }
  } else if (action.includes('-')) {
    const parts = action.split('-')
    return { type: parts[0].trim(), text: parts.slice(1).join('-').trim() }
  }
  return { type: `${agentName} Task`, text: action }
}

export default function AgentFeed({ incidentId }: AgentFeedProps) {
  const { logs, loading, isAgentRunning } = useAgentLogs(incidentId)

  const formatTimeAgo = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 10) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    return `${diffMin}m ago`
  }

  const formatDuration = (durationMs: number | null) => {
    if (durationMs === null) return null
    return `${(durationMs / 1000).toFixed(1)}s`
  }

  const activeAgent = logs[0]?.agent_name || ''

  return (
    <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-railmind-border pb-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-railmind-subtext uppercase flex items-center gap-2">
          <span>🤖</span>
          AI AGENT OPERATIONS FEED
        </h2>
        {isAgentRunning && (
          <div className="flex items-center gap-1.5 bg-railmind-green/10 px-2 py-0.5 rounded border border-railmind-green/30">
            <span className="w-1.5 h-1.5 rounded-full bg-railmind-green animate-ping" />
            <span className="text-[9px] font-bold text-railmind-green uppercase tracking-widest">LIVE</span>
          </div>
        )}
      </div>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {/* Agents Thinking Neural Pipeline */}
        <AnimatePresence>
          {isAgentRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-4 py-4 mb-3 rounded-lg border border-railmind-border bg-[#0d1420] overflow-hidden flex flex-col items-center justify-center gap-3"
            >
              <div className="flex items-center justify-center gap-1.5 w-full max-w-sm">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${activeAgent === 'Sentinel' ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-[#1f2937]/50 border-[#374151]'}`}>
                  <Eye className={`w-4 h-4 ${activeAgent === 'Sentinel' ? 'text-[#3b82f6]' : 'text-[#9ca3af]'}`} />
                </div>
                <div className="flex-1 h-0.5 rounded flow-dash"></div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${activeAgent === 'CascadeAnalyzer' ? 'bg-[#f97316]/20 border-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.6)]' : 'bg-[#1f2937]/50 border-[#374151]'}`}>
                  <GitBranch className={`w-4 h-4 ${activeAgent === 'CascadeAnalyzer' ? 'text-[#f97316]' : 'text-[#9ca3af]'}`} />
                </div>
                <div className="flex-1 h-0.5 rounded flow-dash"></div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${activeAgent === 'Resolution' ? 'bg-[#a855f7]/20 border-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.6)]' : 'bg-[#1f2937]/50 border-[#374151]'}`}>
                  <Lightbulb className={`w-4 h-4 ${activeAgent === 'Resolution' ? 'text-[#a855f7]' : 'text-[#9ca3af]'}`} />
                </div>
                <div className="flex-1 h-0.5 rounded flow-dash"></div>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${activeAgent === 'Communication' ? 'bg-[#22c55e]/20 border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-[#1f2937]/50 border-[#374151]'}`}>
                  <MessageSquare className={`w-4 h-4 ${activeAgent === 'Communication' ? 'text-[#22c55e]' : 'text-[#9ca3af]'}`} />
                </div>
              </div>
              <div className="text-[9px] font-mono text-railmind-subtext tracking-widest flex items-center gap-2">
                <span className={activeAgent === 'Sentinel' ? 'text-white font-bold' : ''}>SENTINEL</span>
                <span className="text-railmind-border">→</span>
                <span className={activeAgent === 'CascadeAnalyzer' ? 'text-white font-bold' : ''}>CASCADE</span>
                <span className="text-railmind-border">→</span>
                <span className={activeAgent === 'Resolution' ? 'text-white font-bold' : ''}>RESOLUTION</span>
                <span className="text-railmind-border">→</span>
                <span className={activeAgent === 'Communication' ? 'text-white font-bold' : ''}>COMMUNICATION</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-railmind-blue animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <svg 
              className="w-12 h-12 text-railmind-muted mb-3 opacity-60" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path d="M4 3v18M20 3v18M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
            <p className="text-railmind-subtext text-xs">Waiting for incident logs...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {logs.slice(0, 20).map((log: AgentLog) => {
                const isRunning = log.duration_ms === null
                const parsedAction = parseAction(log.action, log.agent_name)

                return (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div 
                      style={{ 
                        background: AGENT_COLORS[log.agent_name]?.bg || 'transparent',
                        borderLeft: `2px solid ${AGENT_COLORS[log.agent_name]?.text || '#374151'}`
                      }}
                      className="rounded-r-lg px-3 py-2.5 mb-1.5 flex items-start justify-between gap-3"
                    >
                      {/* Left: Avatar & Text Content */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div 
                          style={{ 
                            background: AGENT_COLORS[log.agent_name]?.gradient || '#374151',
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 text-white shadow-lg border border-white/10 mt-0.5"
                        >
                          {log.agent_name.charAt(0)}
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span 
                              style={{ color: AGENT_COLORS[log.agent_name]?.text }}
                              className="font-mono text-[10px] font-semibold tracking-wide uppercase"
                            >
                              {log.agent_name}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-railmind-subtext/40"></span>
                            <span className="font-mono text-[9px] text-railmind-subtext uppercase tracking-wider truncate">
                              {parsedAction.type}
                            </span>
                          </div>
                          <span className="text-[13px] text-white font-medium leading-snug tracking-tight">
                            {parsedAction.text}
                          </span>
                        </div>
                      </div>

                      {/* Right: Metrics (Duration Bar & Time) */}
                      <div className="flex flex-col items-end shrink-0 w-16 mt-0.5">
                        {isRunning ? (
                          <div className="flex gap-1 items-center mt-1">
                            <span className="w-1.5 h-1.5 bg-railmind-blue rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-railmind-blue rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-railmind-blue rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5 w-full">
                            <span className="text-[10px] font-mono text-railmind-subtext leading-none">
                              {formatDuration(log.duration_ms)}
                            </span>
                            <div className="w-full h-1 bg-black/40 rounded overflow-hidden relative">
                              <div 
                                className="absolute top-0 left-0 h-full rounded"
                                style={{
                                  width: `${Math.min(100, ((log.duration_ms || 0) / 5000) * 100)}%`,
                                  background: log.duration_ms! < 1500 ? '#22c55e' : log.duration_ms! < 3500 ? '#eab308' : '#dc2626'
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <span className="text-[9px] text-railmind-subtext mt-2 font-mono">
                          {formatTimeAgo(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

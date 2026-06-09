'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentLogs } from '@/hooks'
import { Eye, GitBranch, Lightbulb, MessageSquare, Cpu, Loader2 } from 'lucide-react'
import type { AgentLog } from '@/lib/types'

interface AgentFeedProps {
  incidentId?: string
}

const AGENT_CONFIG = {
  Sentinel: {
    color: 'text-[#3b82f6]',
    bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/20',
    icon: Eye,
    iconColor: 'text-[#3b82f6]'
  },
  CascadeAnalyzer: {
    color: 'text-[#f97316]',
    bg: 'bg-[#f97316]/10 border-[#f97316]/20',
    icon: GitBranch,
    iconColor: 'text-[#f97316]'
  },
  Resolution: {
    color: 'text-[#a855f7]',
    bg: 'bg-[#a855f7]/10 border-[#a855f7]/20',
    icon: Lightbulb,
    iconColor: 'text-[#a855f7]'
  },
  Communication: {
    color: 'text-[#22c55e]',
    bg: 'bg-[#22c55e]/10 border-[#22c55e]/20',
    icon: MessageSquare,
    iconColor: 'text-[#22c55e]'
  },
  Orchestrator: {
    color: 'text-[#f9fafb]',
    bg: 'bg-[#f9fafb]/10 border-[#f9fafb]/20',
    icon: Cpu,
    iconColor: 'text-[#f9fafb]'
  }
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

  return (
    <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-railmind-border pb-3">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-railmind-blue" />
          AI Agent Operations Feed
        </h2>
        {isAgentRunning && (
          <div className="flex items-center gap-1.5 bg-railmind-green/10 border border-railmind-green/20 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-railmind-green animate-ping" />
            <span className="text-[10px] font-bold text-railmind-green uppercase tracking-wider">Agents active</span>
          </div>
        )}
      </div>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-railmind-blue animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            {/* Grey Railway Track SVG */}
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
                const config = AGENT_CONFIG[log.agent_name as keyof typeof AGENT_CONFIG] || AGENT_CONFIG.Orchestrator
                const AgentIcon = config.icon
                const isRunning = log.duration_ms === null

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
                      className={`flex items-center justify-between border rounded-lg p-2.5 bg-railmind-bg/40 ${
                        isRunning ? 'animate-agent-glow border-railmind-blue/50' : 'border-railmind-border'
                      }`}
                    >
                      {/* Left: Avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${config.bg}`}>
                          <AgentIcon className={`w-4 h-4 ${config.iconColor}`} />
                        </div>
                        {/* Center: Content */}
                        <div className="flex flex-col min-w-0">
                          <span className={`font-mono text-[10px] font-bold uppercase ${config.color}`}>
                            {log.agent_name}
                          </span>
                          <span className="text-xs font-semibold text-white leading-normal line-clamp-1">
                            {log.action}
                          </span>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex flex-col items-end shrink-0 ml-3">
                        {isRunning ? (
                          <div className="flex gap-0.5 items-center">
                            <span className="w-1 h-1 bg-railmind-blue rounded-full animate-bounce" />
                            <span className="w-1 h-1 bg-railmind-blue rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1 h-1 bg-railmind-blue rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-railmind-subtext bg-railmind-muted/50 px-1.5 py-0.5 rounded border border-railmind-border/60">
                            {formatDuration(log.duration_ms)}
                          </span>
                        )}
                        <span className="text-[9px] text-railmind-subtext mt-1">
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

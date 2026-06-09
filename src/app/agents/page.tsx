'use client'

import { useAgentLogs } from '@/hooks'
import { Card } from '@/components/ui/card'
import { Eye, GitBranch, Lightbulb, MessageSquare, Cpu, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import type { AgentLog } from '@/lib/types'

const AGENT_CONFIG: Record<
  string,
  { color: string; bg: string; icon: any; iconColor: string; label: string }
> = {
  Sentinel: {
    color: 'text-[#3b82f6]',
    bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/20',
    icon: Eye,
    iconColor: 'text-[#3b82f6]',
    label: 'Sentinel',
  },
  CascadeAnalyzer: {
    color: 'text-[#f97316]',
    bg: 'bg-[#f97316]/10 border-[#f97316]/20',
    icon: GitBranch,
    iconColor: 'text-[#f97316]',
    label: 'Cascade Analyzer',
  },
  Resolution: {
    color: 'text-[#a855f7]',
    bg: 'bg-[#a855f7]/10 border-[#a855f7]/20',
    icon: Lightbulb,
    iconColor: 'text-[#a855f7]',
    label: 'Resolution',
  },
  Communication: {
    color: 'text-[#22c55e]',
    bg: 'bg-[#22c55e]/10 border-[#22c55e]/20',
    icon: MessageSquare,
    iconColor: 'text-[#22c55e]',
    label: 'Communication',
  },
  Orchestrator: {
    color: 'text-[#f9fafb]',
    bg: 'bg-[#f9fafb]/10 border-[#f9fafb]/20',
    icon: Cpu,
    iconColor: 'text-[#f9fafb]',
    label: 'Orchestrator',
  },
}

const AGENT_NAMES = ['Sentinel', 'CascadeAnalyzer', 'Resolution', 'Communication', 'Orchestrator'] as const

export default function AgentsPage() {
  const { logs, loading, isAgentRunning, agentSummary } = useAgentLogs()

  const formatTimeAgo = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 10) return 'just now'
    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    return `${diffHr}h ago`
  }

  const formatDuration = (ms: number | null) => {
    if (ms === null) return '—'
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Calculate per-agent avg duration
  const agentAvgDuration = (name: string) => {
    const agentLogs = logs.filter((l) => l.agent_name === name && l.duration_ms !== null)
    if (agentLogs.length === 0) return null
    const avg = agentLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / agentLogs.length
    return `${(avg / 1000).toFixed(1)}s`
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg border border-[#1f2937] bg-[#111827] hover:bg-[#1f2937] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black uppercase tracking-wider">Agent Monitor</h1>
          <p className="text-xs text-[#9ca3af] uppercase tracking-wider font-semibold">
            Multi-agent AI operations dashboard
          </p>
        </div>
        {isAgentRunning && (
          <div className="flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            <span className="text-xs font-bold text-[#22c55e] uppercase tracking-wider">Agents Active</span>
          </div>
        )}
      </div>

      {/* ROW 1: Agent Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {AGENT_NAMES.map((name) => {
          const config = AGENT_CONFIG[name]
          const Icon = config.icon
          const lastLog = agentSummary[name]
          const avgDur = agentAvgDuration(name)

          return (
            <Card
              key={name}
              className="bg-[#111827] border-[#1f2937] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                <div>
                  <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
                  <p className="text-[10px] text-[#9ca3af]">
                    {lastLog ? `Last: ${formatTimeAgo(lastLog.created_at)}` : 'Never run'}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#1f2937] pt-2 space-y-1.5">
                <p className="text-xs text-[#9ca3af] line-clamp-2">
                  {lastLog?.action || 'Waiting for activation...'}
                </p>
                {avgDur && (
                  <span className="text-[10px] font-mono text-[#9ca3af] bg-[#1f2937] px-1.5 py-0.5 rounded">
                    Avg: {avgDur}
                  </span>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* ROW 2: Full Log Table */}
      <Card className="bg-[#111827] border-[#1f2937] p-5">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
          Agent Activity Log
        </h3>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 text-[#3b82f6] animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[#9ca3af] text-xs">
            No agent activity yet. Run a demo scenario to see agents in action.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1f2937] text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left py-2 px-3 font-semibold">Agent</th>
                  <th className="text-left py-2 px-3 font-semibold">Action</th>
                  <th className="text-left py-2 px-3 font-semibold">Duration</th>
                  <th className="text-left py-2 px-3 font-semibold">Incident ID</th>
                  <th className="text-left py-2 px-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: AgentLog) => {
                  const config = AGENT_CONFIG[log.agent_name] || AGENT_CONFIG.Orchestrator
                  const isRunning = log.duration_ms === null
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-[#1f2937]/50 hover:bg-[#1f2937]/30 transition-colors ${
                        isRunning ? 'bg-[#3b82f6]/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span className={`font-mono font-bold uppercase ${config.color}`}>
                          {log.agent_name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-white max-w-[300px] truncate">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#9ca3af]">
                        {isRunning ? (
                          <span className="flex items-center gap-1 text-[#3b82f6]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Running
                          </span>
                        ) : (
                          formatDuration(log.duration_ms)
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#9ca3af] text-[10px]">
                        {log.incident_id?.slice(0, 8) || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#9ca3af]">
                        {formatTime(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

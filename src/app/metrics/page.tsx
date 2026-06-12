'use client'

import { useState, useEffect } from 'react'
import { useIncidents } from '@/hooks'
import { getSeverityBadgeClass } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ShieldCheck, Clock, Users, Train, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine
} from 'recharts'
import type { Incident } from '@/lib/types'

function useCountUp(target: number, duration: number = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) return
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return count
}

export default function MetricsPage() {
  const { incidents: activeIncidents } = useIncidents('active')
  const { incidents: resolvedIncidents } = useIncidents('resolved')
  const allIncidents = [...activeIncidents, ...resolvedIncidents]

  const totalResolved = resolvedIncidents.length
  const totalPassengersHelped = resolvedIncidents.reduce((sum, i) => {
    const cascade = i.cascade_impact as any
    return sum + (cascade?.passengersAffected || 500)
  }, 0)
  const avgResponseTime = 8.2
  const totalDelaysSaved = resolvedIncidents.reduce((sum, i) => {
    const opts = i.resolution_options
    return sum + (opts?.[0]?.estimatedDelayReduction || 45)
  }, 0)

  // Animated counters
  const delaysPrevented = useCountUp(totalResolved || 12)
  const animatedPassengersSaved = useCountUp(totalDelaysSaved || 540)

  const chartData = [
    { day: 'Jun 3', incidents: 3, resolved: 3, saved: 125 },
    { day: 'Jun 4', incidents: 5, resolved: 4, saved: 180 },
    { day: 'Jun 5', incidents: 8, resolved: 7, saved: 310 },
    { day: 'Jun 6', incidents: 6, resolved: 6, saved: 240 },
    { day: 'Jun 7', incidents: 4, resolved: 4, saved: 175 },
    { day: 'Jun 8', incidents: 7, resolved: 6, saved: 280 },
    {
      day: 'Today',
      incidents: allIncidents.length || 2,
      resolved: totalResolved || 1,
      saved: totalDelaysSaved || 90,
    },
  ]

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const tooltipStyle = {
    contentStyle: {
      background: '#111827',
      border: '1px solid #1f2937',
      borderRadius: '8px',
      color: '#f9fafb',
      fontSize: '12px',
    },
    itemStyle: { color: '#9ca3af' },
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
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">Impact Metrics</h1>
          <p className="text-xs text-[#9ca3af] uppercase tracking-wider font-semibold">
            Real-time performance dashboard
          </p>
        </div>
      </div>

      {/* ROW 1: Hero Layout */}
      <div className="mb-6">
        {/* Hero stat */}
        <div className="glass rounded-xl p-6 mb-4 text-center">
          <p className="text-xs tracking-[0.2em] text-railmind-subtext uppercase mb-2">
            Total Impact
          </p>
          <p 
            className="font-mono font-black text-glow-red"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', color: '#dc2626' }}
          >
            {animatedPassengersSaved}
          </p>
          <p className="text-railmind-subtext text-sm mt-2">
            passenger-minutes saved across {totalResolved} incidents resolved autonomously
          </p>
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="surface-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono text-railmind-green">
              {totalResolved}
            </p>
            <p className="text-xs text-railmind-subtext mt-1">
              Cascades Prevented
            </p>
          </div>
          <div className="surface-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono text-railmind-purple">
              8.2s
            </p>
            <p className="text-xs text-railmind-subtext mt-1">
              Avg AI Response
            </p>
          </div>
          <div className="surface-card rounded-lg p-4 text-center">
            <p className="text-2xl font-bold font-mono text-railmind-blue">
              50
            </p>
            <p className="text-xs text-railmind-subtext mt-1">
              Trains Monitored
            </p>
          </div>
        </div>
      </div>

      {/* ROW 2: Charts */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* Area Chart */}
        <Card className="bg-surface-1 border-railmind-border p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Daily Incidents vs Resolved
              </h3>
              <p className="text-[10px] text-railmind-subtext mt-1 uppercase tracking-widest">
                <span className="text-railmind-red font-bold">Red</span> = Total Incidents | <span className="text-railmind-green font-bold">Green</span> = Resolved by RailMind
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} />
              {/* Reference line for Today */}
              <ReferenceLine x="Today" stroke="#3b82f6" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'top', value: 'CURRENT', fill: '#3b82f6', fontSize: 10, fontWeight: 'bold' }} />
              
              {/* We stack the areas so the bottom overlaps, simulating the gap fill. Higher opacity for the lower value. */}
              <Area
                type="monotone"
                dataKey="incidents"
                stroke="#dc2626"
                fill="url(#colorIncidents)"
                strokeWidth={3}
                name="Incidents"
                isAnimationActive={true}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#22c55e"
                fill="url(#colorResolved)"
                strokeWidth={3}
                name="Resolved"
                isAnimationActive={true}
              />
              <defs>
                <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar Chart */}
        <Card className="bg-surface-1 border-railmind-border p-5 relative overflow-hidden">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Delay Minutes Saved per Day
            </h3>
            <p className="text-[10px] text-railmind-subtext mt-1 uppercase tracking-widest">
              Cumulative cascade impact prevented
            </p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#1f2937', opacity: 0.4 }}
                contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
              />
              <Bar 
                dataKey="saved" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]} 
                name="Minutes Saved"
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ROW 3: Recent Incidents Table */}
      <Card className="bg-[#111827] border-[#1f2937] p-5">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
          Recent Incidents
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2937] text-[#9ca3af] uppercase tracking-wider">
                <th className="text-left py-2 px-3 font-semibold">Train</th>
                <th className="text-left py-2 px-3 font-semibold">Severity</th>
                <th className="text-left py-2 px-3 font-semibold">Delay</th>
                <th className="text-left py-2 px-3 font-semibold">Cascade Trains</th>
                <th className="text-left py-2 px-3 font-semibold">Status</th>
                <th className="text-left py-2 px-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody>
              {allIncidents.slice(0, 10).map((incident: Incident, idx: number) => {
                const cascade = incident.cascade_impact as any
                const cascadeCount = cascade?.cascadeTrains?.length ?? 0
                return (
                  <tr
                    key={incident.id}
                    className={`border-b border-railmind-border/50 transition-all hover:-translate-y-0.5 hover:shadow-lg border-l-2 hover:border-l-railmind-blue ${
                      idx % 2 === 0 ? 'bg-surface-2' : 'bg-surface-3'
                    } border-l-transparent`}
                  >
                    <td className="py-2.5 px-3 text-white font-medium">
                      {incident.sentinel_analysis?.trainName ||
                        incident.trigger_train_id?.slice(0, 8) ||
                        '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge className={`${getSeverityBadgeClass(incident.severity)} ${incident.severity === 'critical' ? 'glow-red' : ''}`}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-railmind-orange font-bold">
                      +{incident.delay_minutes} min
                    </td>
                    <td className="py-2.5 px-3 text-railmind-subtext">
                      {cascadeCount > 0 ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: Math.min(cascadeCount, 5) }).map((_, i) => (
                            <span key={i} className="text-[10px]">🔴</span>
                          ))}
                          {cascadeCount > 5 && <span className="text-[10px] ml-1">+{cascadeCount - 5}</span>}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {incident.status === 'resolved' ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-railmind-green" />
                            <span className="text-railmind-green text-[10px] font-bold uppercase tracking-wider">Resolved</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-railmind-orange animate-pulse" />
                            <span className="text-railmind-orange text-[10px] font-bold uppercase tracking-wider">Active</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-railmind-subtext font-mono text-[10px]">
                      {formatTime(incident.detected_at)}
                    </td>
                  </tr>
                )
              })}
              {allIncidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9ca3af]">
                    No incidents recorded yet. Run a demo scenario to generate data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

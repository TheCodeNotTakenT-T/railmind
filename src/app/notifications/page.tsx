'use client'

import { useState, useEffect } from 'react'
import { useTrains } from '@/hooks'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, Briefcase, Radio, Bell, Mail, Clock, Link2, Send, ShieldAlert, CheckCircle 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NotificationsPage() {
  const { trains } = useTrains()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'passenger' | 'stationmaster' | 'crew'>('all')
  const [showLiveBanner, setShowLiveBanner] = useState(false)
  const [prevCount, setPrevCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        if (data.notifications) {
          if (data.notifications.length > prevCount && prevCount !== 0) {
            setShowLiveBanner(true)
            setTimeout(() => setShowLiveBanner(false), 4000)
          }
          setPrevCount(data.notifications.length)
          setNotifications(data.notifications)
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 5000)
    return () => clearInterval(interval)
  }, [prevCount])

  const displayed = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.recipient_type === activeTab)

  const timeAgo = (isoString: string) => {
    const diffMs = new Date().getTime() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins <= 0) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return new Date(isoString).toLocaleDateString()
  }

  const getRecipientTypeLabel = (type: string) => {
    switch (type) {
      case 'passenger': return 'Passenger SMS'
      case 'stationmaster': return 'Station Master Brief'
      case 'crew': return 'Crew Alert'
      default: return type
    }
  }

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'passenger':
        return <Smartphone size={16} className="text-railmind-blue" />
      case 'stationmaster':
        return <Briefcase size={16} className="text-railmind-orange" />
      case 'crew':
        return <Radio size={16} className="text-railmind-green animate-pulse" />
      default:
        return <Bell size={16} className="text-railmind-subtext" />
    }
  }

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'passenger', label: 'Passenger SMS' },
    { id: 'stationmaster', label: 'Station Master' },
    { id: 'crew', label: 'Crew Alert' }
  ] as const

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 relative">
      <AnimatePresence>
        {showLiveBanner && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-railmind-green text-railmind-bg px-4 py-1.5 rounded-b-xl font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Live Updates Received
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between border-b border-railmind-border pb-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-white tracking-tight">Generated Communications</h1>
            <Badge className="bg-railmind-blue/10 text-railmind-blue hover:bg-railmind-blue/20 font-bold border-none px-2.5 py-0.5 mt-1">
              {notifications.length} Total
            </Badge>
          </div>
          <p className="text-railmind-subtext text-sm font-medium">Logs of automated notifications broadcast to passengers, station staff, and rosters</p>
        </div>
      </div>

      {/* TAB BAR with Framer Motion slide animation */}
      <div className="flex items-center bg-surface-1 border border-railmind-border p-1 rounded-xl w-fit relative">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-5 py-2 text-xs font-semibold rounded-lg transition-colors z-10",
              activeTab === tab.id ? "text-white" : "text-railmind-subtext hover:text-white"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-railmind-red rounded-lg -z-10 shadow-lg shadow-railmind-red/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* NOTIFICATIONS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-railmind-red border-t-transparent rounded-full animate-spin"></div>
          <span className="text-railmind-subtext text-sm font-semibold">Loading broadcasts...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-1 border border-railmind-border border-dashed rounded-2xl gap-4">
          <div className="bg-surface-2 p-4 rounded-full text-railmind-subtext">
            <Mail size={36} className="opacity-60" />
          </div>
          <div className="text-center max-w-sm px-4">
            <h3 className="text-lg font-bold text-white">No communications generated yet</h3>
            <p className="text-railmind-subtext text-xs mt-1.5 leading-relaxed">
              Run a demo scenario from the Dashboard or inject a delay to trigger autonomous agent analysis and communications dispatch.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {displayed.map((n) => {
            const train = trains.find(t => t.id === n.trigger_train_id)
            const trainName = train ? train.name : (n.trigger_train_id || 'Train')

            return (
              <Card
                key={n.id}
                className="bg-surface-1 border border-railmind-border p-5 rounded-xl flex flex-col gap-4 shadow-xl shadow-black/20 hover:border-railmind-border/80 transition-colors"
              >
                {/* HEADER / TOP */}
                <div className="flex items-center justify-between border-b border-railmind-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-surface-0 border border-railmind-border rounded-lg shadow-inner shadow-white/5">
                      {getRecipientIcon(n.recipient_type)}
                    </div>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      {getRecipientTypeLabel(n.recipient_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-railmind-subtext bg-surface-0 px-2 py-1 rounded-full border border-railmind-border/50">
                    <Clock size={10} />
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                </div>

                {/* MIDDLE / CONTENT */}
                <div className="flex-1">
                  {n.recipient_type === 'passenger' ? (
                    <div className="flex flex-col md:flex-row gap-6 items-center bg-surface-0/50 p-4 rounded-xl border border-railmind-border/30">
                      <div className="w-[200px] h-[300px] bg-[#090d16] rounded-[24px] border-4 border-[#374151] shadow-2xl relative p-3 flex flex-col justify-between shrink-0">
                        <div className="flex justify-between items-center text-[8px] text-railmind-subtext px-2 border-b border-railmind-border pb-1">
                          <span>9:41 AM</span>
                          <div className="flex gap-1"><span>📶</span><span>🔋</span></div>
                        </div>
                        <div className="flex-1 flex flex-col justify-end gap-2 p-1">
                          <div className="bg-[#1f2937] text-white text-[10px] p-2.5 rounded-2xl rounded-bl-none max-w-[85%] self-start border border-railmind-border shadow-lg">
                            {n.content}
                          </div>
                        </div>
                        <div className="w-16 h-1 bg-[#374151] mx-auto rounded-full mt-2" />
                      </div>
                      <div className="flex flex-col gap-2 items-start justify-center">
                        <span className="text-xs font-bold text-white uppercase">SMS Dispatch Preview</span>
                        <p className="text-xs text-railmind-subtext max-w-sm">
                          Live cellular SMS broadcast sent to all ticketed passengers on {trainName} and connected cascade services.
                        </p>
                        <span className="text-[11px] text-railmind-subtext mt-1">
                          Characters: <strong className={n.content.length > 160 ? 'text-railmind-red' : 'text-railmind-green'}>
                            {n.content.length}
                          </strong> / 160
                        </span>
                      </div>
                    </div>
                  ) : n.recipient_type === 'stationmaster' ? (
                    <div className="bg-surface-0/50 border border-railmind-border/50 rounded-lg p-4 space-y-3">
                      <span className="text-[10px] font-bold text-railmind-subtext uppercase tracking-widest block mb-2">Station Duty Timeline</span>
                      <div className="relative pl-4 border-l-2 border-railmind-blue/20 ml-2 space-y-4">
                        {n.content.split('\n').filter((line: string) => line.trim().length > 0).map((line: string, idx: number) => {
                          const text = line.replace(/^\d+\.\s*/, '')
                          return (
                            <div key={idx} className="relative group">
                              <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-railmind-bg border-2 border-railmind-blue group-hover:bg-railmind-blue transition-colors" />
                              <div className="text-white text-xs leading-snug">{text}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-railmind-yellow bg-railmind-yellow/5 p-4 rounded-xl flex items-start gap-3 shadow-inner shadow-railmind-yellow/5">
                      <ShieldAlert className="w-5 h-5 text-railmind-yellow shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="font-bold text-railmind-yellow uppercase tracking-widest">Loco Pilot & Crew Handoff Dispatch</span>
                        <p className="text-railmind-text leading-relaxed font-mono mt-1 bg-surface-0 p-3 rounded border border-railmind-border/50">
                          {n.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTOM / LINK */}
                <div className="flex items-center gap-1.5 border-t border-railmind-border/40 pt-3 text-[11px] text-railmind-subtext font-semibold uppercase tracking-wider">
                  <Link2 size={12} className="text-railmind-subtext/75" />
                  <span>Linked Incident:</span>
                  <span className="text-white font-bold bg-surface-2 border border-railmind-border px-2 py-0.5 rounded shadow-sm">
                    {trainName} <span className="text-railmind-orange">+{n.delay_minutes}min</span>
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

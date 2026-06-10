'use client'

import { useState, useEffect } from 'react'
import { useTrains } from '@/hooks'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, Briefcase, Radio, Bell, Mail, Clock, Link2 
} from 'lucide-react'

export default function NotificationsPage() {
  const { trains } = useTrains()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'passenger' | 'stationmaster' | 'crew'>('all')

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications')
        const data = await res.json()
        if (data.notifications) {
          setNotifications(data.notifications)
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

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

  const getContentText = (type: string, content: string) => {
    if (type === 'passenger') return content
    if (content.length > 200) {
      return content.slice(0, 200) + '...'
    }
    return content
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

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6">
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

      {/* TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 bg-railmind-surface/50 border border-railmind-border p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'all'
              ? "bg-[#dc2626] text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          All
        </button>
        <button
          onClick={() => setActiveTab('passenger')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'passenger'
              ? "bg-[#dc2626] text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          Passenger SMS
        </button>
        <button
          onClick={() => setActiveTab('stationmaster')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'stationmaster'
              ? "bg-[#dc2626] text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          Station Master
        </button>
        <button
          onClick={() => setActiveTab('crew')}
          className={cn(
            "px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'crew'
              ? "bg-[#dc2626] text-white shadow-lg shadow-railmind-red/25"
              : "text-railmind-subtext hover:text-white"
          )}
        >
          Crew Alert
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-[#dc2626] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-railmind-subtext text-sm font-semibold">Loading broadcasts...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-railmind-surface/30 border border-railmind-border border-dashed rounded-2xl gap-4">
          <div className="bg-railmind-muted/40 p-4 rounded-full text-railmind-subtext">
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
        <div className="flex flex-col gap-4">
          {displayed.map((n) => {
            const train = trains.find(t => t.id === n.trigger_train_id)
            const trainName = train ? train.name : (n.trigger_train_id || 'Train')
            const content = getContentText(n.recipient_type, n.content)

            return (
              <Card
                key={n.id}
                className="bg-railmind-surface border border-railmind-border p-5 rounded-xl flex flex-col gap-4"
              >
                {/* HEADER / TOP */}
                <div className="flex items-center justify-between border-b border-railmind-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-railmind-bg border border-railmind-border rounded-lg">
                      {getRecipientIcon(n.recipient_type)}
                    </div>
                    <span className="text-sm font-bold text-white">
                      {getRecipientTypeLabel(n.recipient_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-railmind-subtext font-medium">
                    <Clock size={12} />
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                </div>

                {/* MIDDLE / CONTENT */}
                <div className="flex-1">
                  {n.recipient_type === 'passenger' ? (
                    <div className="flex flex-col gap-2">
                      <div className="bg-[#1f2937]/40 rounded-2xl rounded-tl-none p-3.5 text-xs text-railmind-text border border-[#374151]/30 leading-relaxed max-w-[85%]">
                        "{content}"
                      </div>
                      <span className="text-[10px] font-semibold text-railmind-subtext/85 pl-2 uppercase tracking-wider">
                        {content.length} / 160 characters
                      </span>
                    </div>
                  ) : n.recipient_type === 'stationmaster' ? (
                    <div className="pl-1">
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-railmind-text font-medium leading-relaxed">
                        {content.split('\n').filter(line => line.trim().length > 0).map((line, idx) => (
                          <li key={idx} className="pl-1 text-railmind-text">
                            {line.replace(/^\d+\.\s*/, '')}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : (
                    // Crew Alert: Yellow left border, monospace font
                    <div className="border-l-4 border-l-railmind-yellow bg-railmind-yellow/5 px-4 py-3 rounded-r-lg font-mono text-xs text-railmind-yellow leading-relaxed">
                      {content}
                    </div>
                  )}
                </div>

                {/* BOTTOM / LINK */}
                <div className="flex items-center gap-1.5 border-t border-railmind-border/40 pt-3 text-xs text-railmind-subtext font-semibold">
                  <Link2 size={14} className="text-railmind-subtext/75" />
                  <span>Linked Incident:</span>
                  <span className="text-white bg-railmind-bg border border-railmind-border px-2 py-0.5 rounded-lg">
                    {trainName} (+{n.delay_minutes} min delay)
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

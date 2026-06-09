'use client'

import React from 'react'
import { useIncidents } from '@/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { MessageSquare, Checklist, ShieldAlert, MailCheck } from 'lucide-react'

export default function NotificationPreview() {
  const { incidents } = useIncidents('active')
  const incident = incidents.find((i) => i.notifications !== null)

  if (!incident || !incident.notifications) {
    return (
      <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 border-b border-railmind-border pb-3">
          <h2 className="text-md font-bold text-white flex items-center gap-2">
            <MailCheck className="w-5 h-5 text-railmind-blue" />
            Live Broadcasts
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-railmind-border/60 rounded-xl bg-railmind-bg/25">
          <MessageSquare className="w-10 h-10 text-railmind-muted mb-2 opacity-50" />
          <p className="text-railmind-subtext text-xs">No notifications generated</p>
        </div>
      </div>
    )
  }

  const notifs = incident.notifications

  return (
    <div className="flex flex-col h-full bg-railmind-surface border border-railmind-border rounded-xl p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-railmind-border pb-3">
        <h2 className="text-md font-bold text-white flex items-center gap-2">
          <MailCheck className="w-5 h-5 text-railmind-blue" />
          Live Broadcasts
        </h2>
        <span className="text-[10px] bg-railmind-blue/15 border border-railmind-blue/20 text-railmind-blue px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          Active
        </span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sms" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-3 w-full mb-3 shrink-0">
          <TabsTrigger value="sms" className="text-xs">SMS</TabsTrigger>
          <TabsTrigger value="brief" className="text-xs">Brief</TabsTrigger>
          <TabsTrigger value="crew" className="text-xs">Crew</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {/* SMS Tab */}
          <TabsContent value="sms" className="mt-0">
            <Card className="bg-railmind-bg/40 border-railmind-border p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-railmind-blue">
                <MessageSquare className="w-4 h-4" />
                <span>Passenger Broadcaster</span>
              </div>
              <p className="text-xs text-white leading-relaxed font-medium">
                "{notifs.passengerSMS}"
              </p>
              <div className="flex justify-between items-center text-[10px] text-railmind-subtext mt-1 border-t border-railmind-border/40 pt-2">
                <span>SMS Channel</span>
                <span>{notifs.passengerSMS.length} / 160 chars</span>
              </div>
            </Card>
          </TabsContent>

          {/* Station Master Brief Tab */}
          <TabsContent value="brief" className="mt-0">
            <Card className="bg-railmind-bg/40 border-railmind-border p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-railmind-green border-b border-railmind-border/40 pb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>Station Duty Checklist</span>
              </div>
              <ul className="space-y-1.5 text-xs text-railmind-text font-medium">
                {notifs.stationMasterBrief?.map((brief: string, idx: number) => (
                  <li key={idx} className="flex gap-1.5 items-start">
                    <span className="text-railmind-blue font-mono text-[9px] bg-railmind-blue/10 px-1 py-0.5 rounded whitespace-nowrap mt-0.5">
                      {brief.slice(0, 7)}
                    </span>
                    <span className="line-clamp-2">{brief.slice(8)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>

          {/* Crew Alert Tab */}
          <TabsContent value="crew" className="mt-0">
            <Card className="bg-railmind-bg/40 border border-railmind-yellow/30 bg-railmind-yellow/5 p-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-railmind-yellow border-b border-railmind-yellow/20 pb-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Duty Crew Alert</span>
              </div>
              <p className="text-xs text-white leading-relaxed font-medium">
                {notifs.crewAlert}
              </p>
              <div className="text-[10px] text-railmind-subtext mt-1 border-t border-railmind-yellow/20 pt-2 flex justify-between">
                <span>Roster Alerting</span>
                <span>Active Duty</span>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

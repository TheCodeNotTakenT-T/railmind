'use client'
import { useTrains, useIncidents, useAgentLogs } from '@/hooks'

export default function DashboardPage() {
  const { trains, loading } = useTrains()
  const { incidents } = useIncidents()
  const { logs, isAgentRunning } = useAgentLogs()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      <p className="text-railmind-subtext mt-2">
        Trains: {trains.length} | Incidents: {incidents.length} | Agent running: {isAgentRunning ? 'Yes' : 'No'}
      </p>
      {loading && <p className="text-railmind-yellow mt-2">Loading...</p>}
    </div>
  )
}
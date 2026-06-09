'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { Train } from '@/lib/types'

const RailwayMap = dynamic(
  () => import('@/components/map/RailwayMap'),
  { ssr: false }
)

export default function DashboardPage() {
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Railway Operations Center
          </h1>
          <p className="text-railmind-subtext text-sm">
            Live network — 50 trains monitored
          </p>
        </div>
        {selectedTrain && (
          <div className="bg-railmind-surface border border-railmind-border 
                          rounded-lg px-4 py-2">
            <div className="text-white text-sm font-medium">
              {selectedTrain.name}
            </div>
            <div className="text-railmind-subtext text-xs">
              {selectedTrain.delay_minutes > 0 
                ? `Delayed +${selectedTrain.delay_minutes} min` 
                : 'On Time'}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 rounded-xl overflow-hidden border 
                      border-railmind-border min-h-0">
        <RailwayMap onTrainSelect={setSelectedTrain} />
      </div>
    </div>
  )
}
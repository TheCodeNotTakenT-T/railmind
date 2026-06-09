'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { Train } from '@/lib/types'

const RailwayMapInner = dynamic(
  () => import('./RailwayMapInner'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0d1117] rounded-lg 
                      flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-[#dc2626] text-2xl mb-2 animate-bounce">🚄</div>
          <p className="text-[#9ca3af] text-sm">Loading railway network...</p>
        </div>
      </div>
    )
  }
)

export default function RailwayMap({ 
  onTrainSelect 
}: { 
  onTrainSelect?: (train: Train) => void 
}) {
  return <RailwayMapInner onTrainSelect={onTrainSelect} />
}

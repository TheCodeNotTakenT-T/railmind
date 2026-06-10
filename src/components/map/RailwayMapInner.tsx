'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrains } from '@/hooks/useTrains'
import type { Train } from '@/lib/types'

// Fix Leaflet default icon issue (required in Next.js)
const fixLeafletIcons = () => {
  if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })
  }
}

const STATUS_COLORS = {
  on_time: '#22c55e',
  delayed: '#f97316', 
  critical: '#dc2626'
}

export default function RailwayMapInner({ 
  onTrainSelect 
}: { 
  onTrainSelect?: (train: Train) => void 
}) {
  const { trains } = useTrains()
  const [stations, setStations] = useState<any[]>([])
  const [railLines, setRailLines] = useState<any[]>([])

  // Fix leaflet marker icons
  useEffect(() => {
    fixLeafletIcons()
  }, [])

  // Fetch static data on mount
  useEffect(() => {
    fetch('/data/stations.json')
      .then(r => r.json())
      .then(setStations)
      .catch(console.error)
    
    fetch('/data/rail-network.geojson')
      .then(r => r.json())
      .then(data => setRailLines(data.features || []))
      .catch(console.error)
  }, [])



  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      {/* Rail network lines */}
      {railLines.map((feature: any, i: number) => {
        const coords = feature.geometry?.coordinates?.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        )
        if (!coords) return null
        return (
          <Polyline
            key={i}
            positions={coords}
            color="#1e3a5f"
            weight={1.5}
            opacity={0.6}
          />
        )
      })}

      {/* Station markers */}
      {stations.map((station: any) => (
        <CircleMarker
          key={station.code}
          center={[station.lat, station.lng]}
          radius={station.platforms >= 8 ? 5 : 3}
          fillColor="#334155"
          color="#475569"
          fillOpacity={0.8}
          weight={1}
          bubblingMouseEvents={false}
        />
      ))}

      {/* Train markers */}
      {trains.map((train: Train) => {
        const color = STATUS_COLORS[train.status] || '#22c55e'
        const radius = train.status === 'critical' ? 10 : 
                       train.status === 'delayed' ? 8 : 6
        
        return (
          <React.Fragment key={train.id}>
            {/* Pulse ring for critical trains */}
            {train.status === 'critical' && (
              <CircleMarker
                center={[train.current_lat || 20.5937,
                         train.current_lng || 78.9629]}
                radius={radius + 8}
                fillColor={color}
                color="transparent"
                fillOpacity={0.15}
                className="animate-pulse-critical"
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e)
                    if (onTrainSelect) onTrainSelect(train)
                  }
                }}
              />
            )}
            <CircleMarker
              key={train.id}
              center={[train.current_lat || 20.5937, 
                       train.current_lng || 78.9629]}
              radius={radius}
              fillColor={color}
              color="white"
              fillOpacity={0.9}
              weight={2}
              className={train.status === 'critical' ? 'animate-pulse-critical' : ''}
              bubblingMouseEvents={false}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e)
                  if (onTrainSelect) onTrainSelect(train)
                }
              }}
            />
          </React.Fragment>
        )
      })}
    </MapContainer>
  )
}

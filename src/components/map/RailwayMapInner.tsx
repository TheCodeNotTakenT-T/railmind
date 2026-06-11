'use client'

import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrains } from '@/hooks/useTrains'
import type { Train, Incident } from '@/lib/types'

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

function MapController({ 
  incidents, 
  stations 
}: { 
  incidents: Incident[], 
  stations: any[] 
}) {
  const map = useMap()
  const prevCountRef = useRef(0)
  
  useEffect(() => {
    const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'analyzing')
    
    // New incident detected (count increased)
    if (activeIncidents.length > prevCountRef.current && activeIncidents.length > 0) {
      const newest = activeIncidents[0] // Most recent first (already sorted)
      
      // Try to find affected station coordinates
      const sentinelData = (newest.cascade_impact as any)?.sentinel_analysis || 
                           (newest as any)?.sentinel_analysis
      const stationCode = sentinelData?.affectedStation
      
      if (stationCode && stations.length > 0) {
        const station = stations.find((s: any) => s.code === stationCode)
        if (station) {
          setTimeout(() => {
            map.flyTo([station.lat, station.lng], 7, {
              duration: 1.8,
              easeLinearity: 0.25
            })
          }, 800) // Small delay so incident card appears first
        }
      } else {
        // Fallback: fly to center of India + zoom in slightly
        setTimeout(() => {
          map.flyTo([23.5, 80.5], 6, { duration: 1.5 })
        }, 800)
      }
    }
    
    prevCountRef.current = activeIncidents.length
  }, [incidents, map, stations])
  
  return null // This component renders nothing, just controls the map
}

export default function RailwayMapInner({ 
  onTrainSelect,
  incidents
}: { 
  onTrainSelect?: (train: Train) => void 
  incidents: Incident[]
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
      <MapController incidents={incidents} stations={stations} />
      
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

      {/* Highlight route of trains with active incidents */}
      {trains
        .filter(train => {
          const hasIncident = incidents.some(
            i => i.trigger_train_id === train.id && 
                 (i.status === 'active' || i.status === 'analyzing')
          )
          return hasIncident && train.route && train.route.length > 1
        })
        .map(train => {
          // Build coordinates array from the train's route station codes
          const routeCoords = (train.route as string[])
            .map(code => stations.find((s: any) => s.code === code))
            .filter(Boolean)
            .map((s: any) => [s.lat, s.lng] as [number, number])
          
          if (routeCoords.length < 2) return null
          
          return (
            <Polyline
              key={`highlight-${train.id}`}
              positions={routeCoords}
              pathOptions={{
                color: '#dc2626',
                weight: 3,
                opacity: 0.7,
                dashArray: '8, 4',
              }}
            />
          )
        })
      }

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
            {/* Pulse rings behind delayed/critical trains */}
            {(train.status === 'critical' || train.delay_minutes > 28) && (
              <>
                <CircleMarker
                  key={`${train.id}-r1`}
                  center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
                  radius={12}
                  pathOptions={{ 
                    color: '#dc2626', fillColor: 'transparent',
                    opacity: 0.7, fillOpacity: 0, weight: 1.5,
                    className: 'pulse-ring-1'
                  }}
                  interactive={false}
                  bubblingMouseEvents={false}
                />
                <CircleMarker
                  key={`${train.id}-r2`}
                  center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
                  radius={20}
                  pathOptions={{ 
                    color: '#dc2626', fillColor: 'transparent',
                    opacity: 0.5, fillOpacity: 0, weight: 1,
                    className: 'pulse-ring-2'
                  }}
                  interactive={false}
                  bubblingMouseEvents={false}
                />
                <CircleMarker
                  key={`${train.id}-r3`}
                  center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
                  radius={28}
                  pathOptions={{ 
                    color: '#dc2626', fillColor: 'transparent',
                    opacity: 0.3, fillOpacity: 0, weight: 1,
                    className: 'pulse-ring-3'
                  }}
                  interactive={false}
                  bubblingMouseEvents={false}
                />
              </>
            )}
            {(train.status === 'delayed' && train.delay_minutes >= 5 && 
              train.delay_minutes <= 28) && (
              <>
                <CircleMarker
                  key={`${train.id}-or1`}
                  center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
                  radius={10}
                  pathOptions={{ 
                    color: '#f97316', fillColor: 'transparent',
                    opacity: 0.6, fillOpacity: 0, weight: 1.5,
                    className: 'pulse-ring-orange-1'
                  }}
                  interactive={false}
                  bubblingMouseEvents={false}
                />
                <CircleMarker
                  key={`${train.id}-or2`}
                  center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
                  radius={18}
                  pathOptions={{ 
                    color: '#f97316', fillColor: 'transparent',
                    opacity: 0.35, fillOpacity: 0, weight: 1,
                    className: 'pulse-ring-orange-2'
                  }}
                  interactive={false}
                  bubblingMouseEvents={false}
                />
              </>
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

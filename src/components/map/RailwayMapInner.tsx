'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrains } from '@/hooks/useTrains'
import { useIncidents } from '@/hooks/useIncidents'
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
  const { incidents } = useIncidents()
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

  // Determine if a train has an active incident
  const getTrainIncident = (trainId: string) => 
    incidents.find(i => i.trigger_train_id === trainId && i.status === 'active')

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
        >
          <Popup autoPan={false}>
            <div style={{ background: '#111827', color: '#f9fafb', 
                          padding: '8px', borderRadius: '4px', minWidth: '120px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                {station.name}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                Code: {station.code} • {station.platforms} platforms
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Train markers */}
      {trains.map((train: Train) => {
        const incident = getTrainIncident(train.id)
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
                    e.originalEvent.stopPropagation()
                  }
                }}
              />
            )}
            <CircleMarker
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
                  e.originalEvent.stopPropagation()
                }
              }}
            >
            <Popup autoPan={false}>
              <div style={{ background: '#111827', color: '#f9fafb', 
                            padding: '8px', borderRadius: '4px', minWidth: '160px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', 
                              marginBottom: '4px' }}>
                  {train.name}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                  #{train.number}
                </div>
                <div style={{ 
                  color: train.delay_minutes > 0 ? '#dc2626' : '#22c55e',
                  fontSize: '12px', marginTop: '4px', fontWeight: 'bold'
                }}>
                  {train.delay_minutes > 0 
                    ? `Delayed +${train.delay_minutes} min` 
                    : '✓ On Time'}
                </div>
                <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                  {train.passengers} passengers
                </div>
                {incident && (
                  <div style={{ color: '#dc2626', fontSize: '11px', 
                                marginTop: '4px' }}>
                    ⚠ Active incident
                  </div>
                )}
                {onTrainSelect && (
                  <button
                    onClick={() => onTrainSelect(train)}
                    style={{ 
                      marginTop: '6px', padding: '3px 8px',
                      background: '#dc2626', color: 'white',
                      border: 'none', borderRadius: '4px',
                      cursor: 'pointer', fontSize: '11px', width: '100%'
                    }}
                  >
                    View Details
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
          </React.Fragment>
        )
      })}
    </MapContainer>
  )
}

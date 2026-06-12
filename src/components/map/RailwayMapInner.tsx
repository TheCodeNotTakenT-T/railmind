'use client'

import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, useMap } from 'react-leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTrains } from '@/hooks/useTrains'
import type { Train, Incident } from '@/lib/types'
import { AlertCircle, Users, Activity, X } from 'lucide-react'

// Fix Leaflet default icon issue
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

// --- Map Controller: Handles FlyTo and Epicenter Rings ---
function MapController({ incidents, stations }: { incidents: Incident[], stations: any[] }) {
  const map = useMap()
  const prevCountRef = useRef(0)
  const [epicenter, setEpicenter] = useState<{lat: number, lng: number} | null>(null)
  
  useEffect(() => {
    const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'analyzing')
    
    // New incident detected
    if (activeIncidents.length > prevCountRef.current && activeIncidents.length > 0) {
      const newest = activeIncidents[0]
      const sentinelData = (newest.cascade_impact as any)?.sentinel_analysis || (newest as any)?.sentinel_analysis
      const stationCode = sentinelData?.affectedStation
      
      if (stationCode && stations.length > 0) {
        const station = stations.find((s: any) => s.code === stationCode)
        if (station) {
          setTimeout(() => {
            map.flyTo([station.lat, station.lng], 7, {
              duration: 1.5,
              easeLinearity: 0.25
            })
            // Trigger epicenter rings
            setEpicenter({ lat: station.lat, lng: station.lng })
            setTimeout(() => setEpicenter(null), 4000) // remove after 4s
          }, 800)
        }
      } else {
        setTimeout(() => map.flyTo([23.5, 80.5], 6, { duration: 1.5 }), 800)
      }
    }
    prevCountRef.current = activeIncidents.length
  }, [incidents, map, stations])

  // Create custom DivIcon for epicenter rings
  const createEpicenterIcon = () => {
    return L.divIcon({
      className: 'epicenter-icon-container',
      html: `
        <div class="relative w-full h-full">
          <div class="absolute inset-0 border-2 border-[#dc2626] rounded-full epicenter-ring-1"></div>
          <div class="absolute inset-0 border-2 border-[#dc2626] rounded-full epicenter-ring-2"></div>
          <div class="absolute inset-0 border-2 border-[#dc2626] rounded-full epicenter-ring-3"></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    })
  }

  return (
    <>
      {epicenter && (
        <Marker position={[epicenter.lat, epicenter.lng]} icon={createEpicenterIcon()} interactive={false} />
      )}
    </>
  )
}

// --- Animated Train Marker: Smooth LERP Movement ---
function AnimatedTrainMarker({ train, color, radius, isCritical, isDelayed }: { train: Train, color: string, radius: number, isCritical: boolean, isDelayed: boolean }) {
  const [pos, setPos] = useState<[number, number]>([train.current_lat || 20.5937, train.current_lng || 78.9629])
  const prevPosRef = useRef<[number, number]>(pos)
  const targetPosRef = useRef<[number, number]>(pos)
  const animationRef = useRef<number | null>(null)
  
  useEffect(() => {
    const target: [number, number] = [train.current_lat || 20.5937, train.current_lng || 78.9629]
    if (target[0] !== targetPosRef.current[0] || target[1] !== targetPosRef.current[1]) {
      // Train moved. Start interpolation.
      prevPosRef.current = pos
      targetPosRef.current = target
      
      const startTime = performance.now()
      const duration = 4500 // 4.5 seconds to glide
      
      const animate = (time: number) => {
        let progress = (time - startTime) / duration
        if (progress > 1) progress = 1
        
        // easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3)
        
        const lat = prevPosRef.current[0] + (target[0] - prevPosRef.current[0]) * ease
        const lng = prevPosRef.current[1] + (target[1] - prevPosRef.current[1]) * ease
        
        setPos([lat, lng])
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          prevPosRef.current = target
        }
      }
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [train.current_lat, train.current_lng]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // Create custom DivIcon for pulse rings to avoid SVG scaling bugs
  const createPulseIcon = (type: 'critical' | 'delayed') => {
    const color = type === 'critical' ? '#dc2626' : '#f97316'
    const animationClass = type === 'critical' ? 'pulse-ring' : 'pulse-ring-orange'
    const size = type === 'critical' ? 24 : 18
    
    return L.divIcon({
      className: 'pulse-icon-container',
      html: `
        <div class="relative w-full h-full">
          <div class="absolute inset-0 border-2 rounded-full ${animationClass}" style="border-color: ${color}"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    })
  }

  return (
    <React.Fragment>
      {/* Pulse rings behind delayed/critical trains */}
      {isCritical && (
        <Marker position={pos} icon={createPulseIcon('critical')} interactive={false} />
      )}
      {isDelayed && (
        <Marker position={pos} icon={createPulseIcon('delayed')} interactive={false} />
      )}
      <CircleMarker
        center={pos}
        radius={radius}
        fillColor={color}
        color="white"
        fillOpacity={0.9}
        weight={2}
        bubblingMouseEvents={false}
        interactive={false}
      />
    </React.Fragment>
  )
}

export default function RailwayMapInner({ 
  incidents
}: { 
  incidents: Incident[]
}) {
  const { trains } = useTrains()
  const [stations, setStations] = useState<any[]>([])
  const [railLines, setRailLines] = useState<any[]>([])
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null)

  useEffect(() => { fixLeafletIcons() }, [])

  useEffect(() => {
    fetch('/data/stations.json').then(r => r.json()).then(setStations).catch(console.error)
    fetch('/data/rail-network.geojson').then(r => r.json()).then(data => setRailLines(data.features || [])).catch(console.error)
  }, [])

  const hasActiveIncidents = incidents.some(i => i.status === 'active' || i.status === 'analyzing')

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg map-wrapper">
      {/* Map Ambient Effects: Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[400] bg-[radial-gradient(circle_at_center,transparent_30%,rgba(10,14,26,0.8)_100%)] mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 z-[400] bg-[rgba(10,14,26,0.1)] mix-blend-luminosity" />

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />
        <MapController incidents={incidents} stations={stations} />
        
        {/* Rail network lines */}
        {railLines.map((feature: any, i: number) => {
          const coords = feature.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng])
          if (!coords) return null
          return (
            <Polyline
              key={i}
              positions={coords}
              color="#1e3a5f"
              weight={1.5}
              opacity={hasActiveIncidents ? 0.3 : 0.6} // Dim if active incidents exist
            />
          )
        })}

        {/* Route Highlighting */}
        {trains.filter(train => incidents.some(i => i.trigger_train_id === train.id && (i.status === 'active' || i.status === 'analyzing')) && train.route).map(train => {
          const routeCoords = (train.route as string[]).map(code => stations.find(s => s.code === code)).filter(Boolean).map(s => [s.lat, s.lng] as [number, number])
          if (routeCoords.length < 2) return null
          return (
            <Polyline
              key={`highlight-${train.id}`}
              positions={routeCoords}
              pathOptions={{ color: '#dc2626', weight: 3, opacity: 0.7 }}
              className="animate-pulse"
            />
          )
        })}

        {/* Station markers */}
        {stations.map((station: any) => {
          const isMajor = station.platforms >= 8
          return (
            <CircleMarker
              key={station.code}
              center={[station.lat, station.lng]}
              radius={isMajor ? 4 : 2}
              fillColor={isMajor ? '#e2e8f0' : '#334155'}
              color="transparent"
              fillOpacity={isMajor ? 0.9 : 0.6}
              interactive={false}
              className={isMajor ? 'glow-station' : ''}
            />
          )
        })}

        {/* Train Interactivity Layer (invisible markers on top to capture clicks) */}
        {trains.map((train: Train) => (
           <CircleMarker
             key={`hitbox-${train.id}`}
             center={[train.current_lat || 20.5937, train.current_lng || 78.9629]}
             radius={15}
             fillOpacity={0}
             color="transparent"
             eventHandlers={{
               click: (e) => {
                 L.DomEvent.stopPropagation(e)
                 setSelectedTrain(train)
               }
             }}
           />
        ))}

        {/* Train Markers */}
        {trains.map((train: Train) => {
          const isCritical = train.status === 'critical' || train.delay_minutes > 28
          const isDelayed = train.status === 'delayed' && train.delay_minutes >= 5 && train.delay_minutes <= 28
          const color = STATUS_COLORS[train.status] || '#22c55e'
          const radius = isCritical ? 8 : isDelayed ? 6 : 5
          return (
            <AnimatedTrainMarker 
              key={`visual-${train.id}`} 
              train={train} 
              color={color} 
              radius={radius} 
              isCritical={isCritical} 
              isDelayed={isDelayed} 
            />
          )
        })}
      </MapContainer>

      {/* Train Detail Slide-in Panel */}
      <AnimatePresence>
        {selectedTrain && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-[320px] bg-[#0d1420]/95 backdrop-blur-md border-l border-white/[0.06] z-[500] shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-railmind-subtext tracking-widest uppercase">
                  {selectedTrain.id}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedTrain.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTrain(null)}
                className="p-1 rounded hover:bg-white/10 transition-colors text-railmind-subtext hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Status Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-railmind-subtext uppercase tracking-wider font-semibold">Status</span>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedTrain.status === 'critical' ? 'bg-railmind-red/20 text-railmind-red border border-railmind-red/30' :
                    selectedTrain.status === 'delayed' ? 'bg-railmind-orange/20 text-railmind-orange border border-railmind-orange/30' :
                    'bg-railmind-green/20 text-railmind-green border border-railmind-green/30'
                  }`}>
                    {selectedTrain.status}
                  </div>
                </div>

                <div className="bg-[#111827] rounded-lg p-3 border border-white/[0.04]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-railmind-subtext">Current Delay</span>
                    <Activity className={`w-4 h-4 ${selectedTrain.delay_minutes > 0 ? 'text-railmind-red' : 'text-railmind-green'}`} />
                  </div>
                  <div className={`font-mono text-2xl font-black ${selectedTrain.delay_minutes > 0 ? 'text-railmind-red text-glow-red' : 'text-railmind-green'}`}>
                    +{selectedTrain.delay_minutes} <span className="text-sm font-semibold">min</span>
                  </div>
                </div>
                
                <div className="bg-[#111827] rounded-lg p-3 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-xs text-railmind-subtext flex items-center gap-2">
                    <Users className="w-4 h-4" /> Passengers
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    {Math.floor(Math.random() * 500) + 800}
                  </span>
                </div>
              </div>

              {/* Route Section */}
              {selectedTrain.route && (
                <div>
                  <span className="text-xs text-railmind-subtext uppercase tracking-wider font-semibold block mb-3">Route Journey</span>
                  <div className="relative pl-3 border-l-2 border-railmind-border space-y-4">
                    {(selectedTrain.route as string[]).map((stationCode, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-[#111827] border-2 border-railmind-blue" />
                        <span className="text-xs font-mono text-white ml-2">{stationCode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

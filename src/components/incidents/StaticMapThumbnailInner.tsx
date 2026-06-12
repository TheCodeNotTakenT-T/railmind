'use client'

import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export default function StaticMapThumbnailInner({ lat, lng }: { lat?: number, lng?: number }) {
  const centerLat = lat || 28.6139
  const centerLng = lng || 77.2090
  
  return (
    <div className="w-[80px] h-[60px] rounded overflow-hidden border border-railmind-border shrink-0 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={5} 
        zoomControl={false} 
        dragging={false} 
        scrollWheelZoom={false} 
        doubleClickZoom={false} 
        attributionControl={false} 
        className="w-full h-full"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <CircleMarker 
          center={[centerLat, centerLng]} 
          radius={4} 
          color="#dc2626" 
          fillColor="#dc2626" 
          fillOpacity={0.8} 
        />
      </MapContainer>
    </div>
  )
}

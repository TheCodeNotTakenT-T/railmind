'use client'

import dynamic from 'next/dynamic'

const StaticMapThumbnailInner = dynamic(
  () => import('./StaticMapThumbnailInner'),
  { ssr: false }
)

export default function StaticMapThumbnail({ lat, lng }: { lat?: number, lng?: number }) {
  return <StaticMapThumbnailInner lat={lat} lng={lng} />
}

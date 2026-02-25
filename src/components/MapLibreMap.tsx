import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

type Marker = { id: string; lat: number; lng: number; title?: string; description?: string }

export default function MapLibreMap({
  center = [25, 20] as [number, number],
  zoom = 3,
  markers = [] as Marker[],
}: {
  center?: [number, number]
  zoom?: number
  markers?: Marker[]
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!ref.current) return
    if (mapRef.current) return

    // ensure the map container sits below overlays
    ref.current.style.position = 'relative'
    ref.current.style.zIndex = '0'

    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [center[1], center[0]],
      zoom,
    })

    mapRef.current = map

    // ensure canvas and layers have neutral z-index so UI overlays remain on top
    map.on('load', () => {
      try {
        const canvas = map.getCanvas && map.getCanvas()
        if (canvas) canvas.style.zIndex = '0'
      } catch (e) {
        // ignore
      }
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setCenter([center[1], center[0]])
    map.setZoom(zoom)
  }, [center, zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // remove existing markers
    const existing = document.querySelectorAll('.maplibre-marker')
    existing.forEach((n) => n.remove())

    markers.forEach((m) => {
      const el = document.createElement('div')
      el.className = 'maplibre-marker'
      el.style.width = '22px'
      el.style.height = '22px'
      el.style.borderRadius = '50%'
      el.style.background = '#0C0C12'
      el.style.border = '2px solid #C8A84B'
      el.style.boxShadow = '0 0 8px rgba(200,168,75,0.6)'

      const marker = new maplibregl.Marker(el)
        .setLngLat([m.lng, m.lat])

      if (m.title || m.description) {
        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
          <div style="font-family: Inter, ui-sans-serif; font-size:13px;">
            <div style="font-weight:700;color:#C8A84B">${m.title || ''}</div>
            <div style="font-size:12px;color:#9aa0a6">${m.description || ''}</div>
          </div>
        `)
        marker.setPopup(popup)
      }

      marker.addTo(map)
    })
  }, [markers])

  return <div ref={ref} className="h-full w-full rounded-md" />
}

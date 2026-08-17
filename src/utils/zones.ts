import L from 'leaflet'
import 'leaflet.markercluster'
import zonesData from '../data/zones.json'

export type Restriction = 'PROHIBITED' | 'REQ_AUTHORISATION'

export interface ZoneGeometry {
  uomDimensions: string
  lowerLimit: number
  lowerVerticalReference: string
  upperLimit: number
  upperVerticalReference: string
  horizontalProjection:
    | { type: 'Circle'; center: [number, number]; radius: number }
    | { type: 'Polygon'; coordinates: [number, number][][] }
}

export interface ZoneAuthority {
  purpose: string
  intervalBefore: string
  name: string
  contactName: string
  email: string
  phone: string
}

export interface Zone {
  identifier: string
  country: string
  name: string
  type: string
  restriction: Restriction
  reason: string[]
  otherReasonInfo: string
  uSpaceClass: string
  message: string
  applicability: { permanent: string }[]
  regulationExemption: string
  zoneAuthority: ZoneAuthority[]
  geometry: ZoneGeometry[]
}

export interface ZonesFile {
  title: string
  description: string
  features: Zone[]
}

const RESTRICTION_COLORS: Record<Restriction, { fill: string; border: string }> = {
  PROHIBITED: { fill: '#e74c3c', border: '#c0392b' },
  REQ_AUTHORISATION: { fill: '#f39c12', border: '#d68910' },
}

export function getZones(): Zone[] {
  return (zonesData as ZonesFile).features
}

export function getLastUpdated(): string {
  const rawTitle = zonesData.title
  const dateMatch = rawTitle.match(/\d{2}\-\d{2}\-\d{4}/)
  return dateMatch ? dateMatch[0] : ''

}

export function getColor(restriction: Restriction) {
  return RESTRICTION_COLORS[restriction]
}

export function createZoneCircles(
  zones: Zone[],
  map: L.Map,
  visibleRestrictions: Set<Restriction>
): L.LayerGroup {
  const group = L.layerGroup()

  for (const zone of zones) {
    if (!visibleRestrictions.has(zone.restriction)) continue

    for (const geom of zone.geometry) {
      const proj = geom.horizontalProjection
      const colors = getColor(zone.restriction)

      if (proj.type === 'Circle') {
        const [lon, lat] = proj.center
        const layer = L.circle([lat, lon], {
          radius: proj.radius,
          color: colors.border,
          fillColor: colors.fill,
          fillOpacity: 0.25,
          weight: 2,
        })
        layer.bindPopup(createPopupContent(zone, geom))
        layer.addTo(group)
      } else if (proj.type === 'Polygon') {
        // GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
        const rings = proj.coordinates.map((ring) =>
          ring.map(([lon, lat]): L.LatLngExpression => [lat, lon])
        )
        const layer = L.polygon(rings, {
          color: colors.border,
          fillColor: colors.fill,
          fillOpacity: 0.25,
          weight: 2,
        })
        layer.bindPopup(createPopupContent(zone, geom))
        layer.addTo(group)
      }
    }
  }

  group.addTo(map)
  return group
}

function createPopupContent(zone: Zone, geom: ZoneGeometry): string {
  const auth = zone.zoneAuthority.find((a) => a.purpose === 'AUTHORIZATION')
  const restrictionLabel =
    zone.restriction === 'PROHIBITED' ? '🚫 ЗАБРАНЕНА' : '⚠️ ИЗИСКВА РАЗРЕШЕНИЕ'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 320px; line-height: 1.4;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">${restrictionLabel}</h3>
      <p style="margin: 0 0 6px 0;"><strong>ID:</strong> ${zone.identifier}</p>
      <p style="margin: 0 0 6px 0;"><strong>Причина:</strong> ${zone.reason.join(', ')}</p>
      <p style="margin: 0 0 6px 0;">${zone.message}</p>
      <p style="margin: 0 0 6px 0;"><strong>Височина:</strong> ${geom.lowerLimit}m – ${geom.upperLimit}m ${geom.upperVerticalReference}</p>
      ${auth ? `
        <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
        <p style="margin: 0 0 4px 0;"><strong>ОРГАН:</strong> ${auth.name}</p>
        <p style="margin: 0 0 4px 0;"><strong>Лице:</strong> ${auth.contactName}</p>
        <p style="margin: 0 0 4px 0;"><strong>Email:</strong> <a href="mailto:${auth.email}">${auth.email}</a></p>
        <p style="margin: 0;"><strong>Тел:</strong> ${auth.phone}</p>
      ` : ''}
    </div>
  `
}

export function countByRestriction(zones: Zone[]): Record<Restriction, number> {
  const counts: Record<Restriction, number> = {
    PROHIBITED: 0,
    REQ_AUTHORISATION: 0,
  }
  for (const zone of zones) {
    counts[zone.restriction]++
  }
  return counts
}
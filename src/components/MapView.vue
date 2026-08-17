<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.markercluster'
import { getZones, createZoneCircles, type Restriction } from '@/utils/zones'

const loading = ref(true)
const props = defineProps<{
  visibleRestrictions: Set<Restriction>
}>()

const mapContainer = ref<HTMLDivElement>()
let map: L.Map
let zoneGroup: L.LayerGroup | null = null
const zones = getZones()

function rebuildZones() {
  if (zoneGroup) {
    map.removeLayer(zoneGroup)
  }
  zoneGroup = createZoneCircles(zones, map, props.visibleRestrictions)
}

watch(
  () => new Set(props.visibleRestrictions),
  () => rebuildZones(),
  { deep: true }
)

onMounted(() => {
  map = L.map(mapContainer.value!, {
    center: [42.7, 25.5],
    zoom: 7,
    zoomControl: true,
  })

  const streetLayer = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  )

  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a> — Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
    }
  )

  // Satellite with transparent street labels overlaid (CartoDB labels only — no background)
  const labelsLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    }
  )

  const satelliteWithLabels = L.layerGroup([satelliteLayer, labelsLayer])

  streetLayer.addTo(map)

  L.control
    .layers({
      '🗺️ Карта': streetLayer,
      '🛰️ Сателит': satelliteLayer,
      '🛰️ Сателит + улици': satelliteWithLabels,
    })
    .addTo(map)

  rebuildZones()
  loading.value = false
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
    <div v-if="loading" class="loading-overlay">
    <div class="loading-spinner"></div>
    <p>Зареждане на зони...</p>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}
.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.loading-spinner {
  width: 40px; height: 40px;
  border: 4px solid #ddd;
  border-top-color: #e74c3c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
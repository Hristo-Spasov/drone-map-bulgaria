<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet.markercluster'
import { getZones, createZoneCircles, type Restriction } from '@/utils/zones'

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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  rebuildZones()
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}
</style>
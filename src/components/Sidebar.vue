<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getZones, countByRestriction, getColor, type Restriction, getLastUpdated } from '@/utils/zones'

const props = defineProps<{
  visibleRestrictions: Set<Restriction>
}>()

const emit = defineEmits<{
  toggle: [restriction: Restriction]
}>()

const zones = getZones()
const counts = countByRestriction(zones)
const lastUpdated = getLastUpdated()

const status = ref<{ lastChecked: string | null; lastUpdated: string | null; source: string | null }>({
  lastChecked: null,
  lastUpdated: null,
  source: null,
})

onMounted(async () => {
  try {
    const res = await fetch('/api/status')
    status.value = await res.json()
  } catch {
    // API not available (dev mode)
  }
})

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toggle(restriction: Restriction) {
  emit('toggle', restriction)
}

function isVisible(restriction: Restriction): boolean {
  return props.visibleRestrictions.has(restriction)
}
</script>

<template>
  <div class="sidebar">
    <h2>🚁 Drone Zones BG</h2>
    <p class="subtitle">{{ zones.length }} зони</p>

    <div class="legend">
      <label class="legend-item" @click="toggle('PROHIBITED')">
        <input type="checkbox" :checked="isVisible('PROHIBITED')" />
        <span
          class="color-dot"
          :style="{ backgroundColor: getColor('PROHIBITED').fill, borderColor: getColor('PROHIBITED').border }"
        ></span>
        <span class="legend-label">Забранена зона</span>
        <span class="zone-count">{{ counts.PROHIBITED }}</span>
      </label>

      <label class="legend-item" @click="toggle('REQ_AUTHORISATION')">
        <input type="checkbox" :checked="isVisible('REQ_AUTHORISATION')" />
        <span
          class="color-dot"
          :style="{ backgroundColor: getColor('REQ_AUTHORISATION').fill, borderColor: getColor('REQ_AUTHORISATION').border }"
        ></span>
        <span class="legend-label">Изисква разрешение</span>
        <span class="zone-count">{{ counts.REQ_AUTHORISATION }}</span>
      </label>
    </div>

    <div class="instructions">
      <p>💡 Кликнете върху зона за подробности</p>
    </div>
    <div class="status">
      <p><strong>Последна проверка:</strong> {{ formatDate(status.lastChecked) }}</p>
      <p><strong>Данни от:</strong> {{ lastUpdated || '—' }}</p>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1000;
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  font-family: Arial, sans-serif;
  min-width: 220px;
  user-select: none;
}

h2 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
}

.subtitle {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #666;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.15s;
}

.legend-item:hover {
  background: #f5f5f5;
}

.legend-item input[type='checkbox'] {
  cursor: pointer;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid;
  flex-shrink: 0;
}

.legend-label {
  font-size: 13px;
  flex: 1;
}

.zone-count {
  font-size: 12px;
  color: #999;
  font-weight: 600;
}

.instructions {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.instructions p {
  margin: 0;
  font-size: 12px;
  color: #888;
}

.status {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.status p {
  margin: 4px 0;
  font-size: 11px;
  color: #666;
}

@media (max-width: 600px) {
  .sidebar {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 0;
    padding: 12px 16px;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
<script setup lang="ts">
import { reactive } from 'vue'
import MapView from './components/MapView.vue'
import Sidebar from './components/Sidebar.vue'
import type { Restriction } from './utils/zones'

const visibleRestrictions = reactive<Set<Restriction>>(
  new Set(['PROHIBITED', 'REQ_AUTHORISATION'])
)

function toggleRestriction(restriction: Restriction) {
  if (visibleRestrictions.has(restriction)) {
    visibleRestrictions.delete(restriction)
  } else {
    visibleRestrictions.add(restriction)
  }
}
</script>

<template>
  <MapView :visible-restrictions="visibleRestrictions" />
  <Sidebar :visible-restrictions="visibleRestrictions" @toggle="toggleRestriction" />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
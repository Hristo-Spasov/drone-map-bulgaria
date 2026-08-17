import * as L from 'leaflet'

declare module 'leaflet' {
  class MarkerClusterGroup extends LayerGroup {
    constructor(options?: any)
    addLayer(layer: Layer): this
    removeLayer(layer: Layer): this
    clearLayers(): this
  }
}

declare module 'leaflet.markercluster' {
  export = L
}
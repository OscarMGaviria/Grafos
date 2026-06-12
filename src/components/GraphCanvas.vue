<template>
  <div
    class="canvas-container"
    :class="modeClass"
    ref="containerRef"
    @mousemove="handleContainerMouseMove"
    @mouseleave="previewPos = null"
  >
    <!-- Controles de navegación flotantes -->
    <div class="navigation-controls glass">
      <button @click="zoomIn" title="Acercar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button @click="zoomOut" title="Alejar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <button @click="resetView" title="Restablecer vista">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
        </svg>
      </button>
      <div class="nav-divider"></div>
      <span class="zoom-level">{{ Math.round(currentZoom * 100) }}%</span>
      <div class="nav-divider"></div>
      <div :class="['indicator', activeMode]"></div>
      <span class="badge-text">{{ modeLabel }}</span>
    </div>

    <!-- Barra de estado inferior -->
    <div class="canvas-statusbar glass">
      <span>{{ nodes.length }} nodos</span>
      <div class="nav-divider"></div>
      <span>{{ edges.length }} vías</span>
      <template v-if="dijkstraResult">
        <div class="nav-divider"></div>
        <span class="statusbar-route">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M22 12H2M12 19l7-7-7-7"/>
          </svg>
          Ruta: {{ dijkstraResult.totalDistance }} km
        </span>
      </template>
    </div>

    <!-- Preview de arista al crear vías -->
    <svg
      v-if="activeMode === 'add-edge' && edgeSourceId && previewPos"
      class="edge-preview-svg"
    >
      <line
        :x1="edgeSourceScreenPos.x"
        :y1="edgeSourceScreenPos.y"
        :x2="previewPos.x"
        :y2="previewPos.y"
        stroke="rgba(0,133,63,0.65)"
        stroke-width="3"
        stroke-dasharray="6 4"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import cytoscape from 'cytoscape'

const props = defineProps({
  nodes:               { type: Array,   required: true },
  edges:               { type: Array,   required: true },
  activeMode:          { type: String,  default: 'select' },
  is3d:                { type: Boolean, default: false },   // kept for compat
  selectedElement:     { type: Object,  default: null },
  selectedElementType: { type: String,  default: null },
  dijkstraResult:      { type: Object,  default: null }
})

const emit = defineEmits([
  'select-node', 'select-edge', 'clear-selection',
  'move-node', 'move-node-end', 'add-node', 'add-edge', 'zoom-reset'
])

const containerRef = ref(null)
let cy = null
const currentZoom = ref(0.1)
const edgeSourceId  = ref(null)
const previewPos    = ref(null)
let pulseInterval   = null
let pulseDir        = 1
let pulseVal        = 0.05

// ─── Modo ─────────────────────────────────────────────────────────────────────
const modeClass = computed(() => ({
  'mode-add-node': props.activeMode === 'add-node',
  'mode-add-edge': props.activeMode === 'add-edge'
}))

const modeLabel = computed(() => {
  if (props.activeMode === 'select')   return 'Seleccionar'
  if (props.activeMode === 'add-node') return 'Crear Nodo'
  if (props.activeMode === 'add-edge') return 'Enlazar Vías'
  return ''
})

// ─── Stylesheet Cytoscape ─────────────────────────────────────────────────────
const CY_STYLE = [
  // ─ Nodos base
  {
    selector: 'node',
    style: {
      'shape': 'ellipse',
      'width': 16,
      'height': 16,
      'background-color': '#00853F',
      'border-width': 1.5,
      'border-color': 'rgba(0,0,0,0.18)',
      'label': 'data(nombre)',
      'font-size': 12,
      'font-family': 'Inter, system-ui, sans-serif',
      'font-weight': 700,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -6,
      'color': '#1f2937',
      'text-outline-width': 3,
      'text-outline-color': '#ffffff',
      'text-opacity': 0,
      'z-index': 10
    }
  },
  // ─ Intersecciones
  {
    selector: 'node[tipo="interseccion"]',
    style: {
      'background-color': '#F5A623',
      'width': 10,
      'height': 10
    }
  },
  // ─ Seleccionado
  {
    selector: 'node.app-selected',
    style: {
      'background-color': '#00C965',
      'border-width': 2.5,
      'border-color': '#ffffff',
      'width': 25.6,
      'height': 25.6,
      'text-opacity': 1,
      'overlay-color': '#00853F',
      'overlay-padding': 10,
      'overlay-opacity': 0.2,
      'z-index': 100
    }
  },
  {
    selector: 'node[tipo="interseccion"].app-selected',
    style: {
      'background-color': '#FFE054',
      'border-color': '#ffffff',
      'width': 16,
      'height': 16
    }
  },
  // ─ Dijkstra
  {
    selector: 'node.dijkstra-node',
    style: {
      'background-color': '#FFD100',
      'border-color': 'rgba(0,0,0,0.22)',
      'width': 29.6,
      'height': 29.6,
      'text-opacity': 1,
      'overlay-color': '#FFD100',
      'overlay-padding': 7,
      'overlay-opacity': 0.25,
      'z-index': 90
    }
  },
  // ─ Nodo fuente de arista
  {
    selector: 'node.edge-source',
    style: {
      'background-color': '#F5A623',
      'border-color': '#00B259',
      'border-width': 3,
      'width': 18,
      'height': 18,
      'text-opacity': 1,
      'z-index': 95
    }
  },
  // ─ Hover
  {
    selector: 'node.hovered',
    style: { 'text-opacity': 1 }
  },
  // ─ Vías base (calzada sencilla = punteado)
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#4b5563',
      'curve-style': 'straight',
      'target-arrow-shape': 'none',
      'target-arrow-color': '#00853F',
      'line-style': 'dashed',
      'line-dash-pattern': [4, 4]
    }
  },
  // ─ Calzada doble = línea continua y más gruesa
  {
    selector: 'edge[calzada="doble"]',
    style: {
      'line-style': 'solid',
      'width': 4
    }
  },
  // ─ Un sentido → flecha
  {
    selector: 'edge[sentido="un-sentido"]',
    style: {
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#00853F'
    }
  },
  // ─ Seleccionada
  {
    selector: 'edge.app-selected',
    style: {
      'line-color': '#F5A623',
      'width': 5,
      'overlay-color': '#F5A623',
      'overlay-opacity': 0.25,
      'overlay-padding': 5,
      'z-index': 50
    }
  },
  // ─ Ruta Dijkstra
  {
    selector: 'edge.dijkstra-edge',
    style: {
      'line-color': '#D4AF37',
      'width': 6,
      'line-style': 'solid',
      'target-arrow-shape': 'none',
      'overlay-color': '#FFD100',
      'overlay-opacity': 0.2,
      'overlay-padding': 5,
      'z-index': 40
    }
  },
  {
    selector: 'edge[sentido="un-sentido"].dijkstra-edge',
    style: {
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#D4AF37'
    }
  },
  // ─ Vía cerrada
  {
    selector: 'edge.cerrada',
    style: {
      'line-color': '#7f1d1d',
      'opacity': 0.65,
      'line-style': 'dashed',
      'line-dash-pattern': [4, 6]
    }
  },
  // ─ Neutralizar overlay de selección nativo de Cytoscape
  { selector: 'node:selected', style: { 'overlay-opacity': 0 } },
  { selector: 'edge:selected', style: { 'overlay-opacity': 0 } }
]

// ─── Inicialización Cytoscape ─────────────────────────────────────────────────
onMounted(() => {
  cy = cytoscape({
    container: containerRef.value,
    elements: buildElements(),
    style: CY_STYLE,
    layout: { name: 'preset' },
    zoomingEnabled: true,
    userZoomingEnabled: true,
    panningEnabled: true,
    userPanningEnabled: true,
    autoungrabify: true,          // nodos no arrastrables
    boxSelectionEnabled: false,
    minZoom: 0.04,
    maxZoom: 15,
    wheelSensitivity: 0.25
  })

  cy.autounselectify(true)   // Cytoscape no agrega estado :selected propio

  cy.on('tap', 'node', handleNodeTap)
  cy.on('tap', 'edge', handleEdgeTap)
  cy.on('tap',         handleBackgroundTap)
  cy.on('zoom pan',    () => { currentZoom.value = cy.zoom() })
  cy.on('zoom',        applyZoomLabels)
  cy.on('mouseover', 'node', e => {
    e.target.addClass('hovered')
    applyZoomLabels()
  })
  cy.on('mouseout', 'node', e => {
    e.target.removeClass('hovered')
    applyZoomLabels()
  })

  setTimeout(() => resetView(), 150)
})

onUnmounted(() => {
  stopPulse()
  if (cy) cy.destroy()
})

// ─── Build elements ───────────────────────────────────────────────────────────
const buildElements = () => {
  const els = []
  props.nodes.forEach(n => {
    els.push({
      group: 'nodes',
      data: { id: n.id, nombre: n.nombre, tipo: n.tipo },
      position: { x: n.x, y: n.y }
    })
  })
  props.edges.forEach(e => {
    const el = {
      group: 'edges',
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        sentido: e.sentido || 'doble',
        calzada: e.calzada || 'sencilla'
      }
    }
    if (e.estado === 'cerrada') el.classes = 'cerrada'
    els.push(el)
  })
  return els
}

// ─── Watchers de sincronización ───────────────────────────────────────────────
let wasEmpty = true

watch(() => props.nodes, newNodes => {
  if (!cy) return
  cy.startBatch()

  const existingIds = new Set(cy.nodes().map(n => n.id()))
  const newIds      = new Set(newNodes.map(n => n.id))

  cy.nodes().filter(n => !newIds.has(n.id())).remove()

  newNodes.forEach(n => {
    if (existingIds.has(n.id)) {
      const node = cy.getElementById(n.id)
      node.data({ nombre: n.nombre, tipo: n.tipo })
      node.position({ x: n.x, y: n.y })
    } else {
      cy.add({
        group: 'nodes',
        data: { id: n.id, nombre: n.nombre, tipo: n.tipo },
        position: { x: n.x, y: n.y }
      })
    }
  })

  cy.endBatch()
  applyZoomLabels()

  // Centrar vista cuando los datos cargan por primera vez
  if (wasEmpty && newNodes.length > 0) {
    wasEmpty = false
    setTimeout(() => resetView(), 100)
  }
}, { deep: true })

watch(() => props.edges, newEdges => {
  if (!cy) return
  cy.startBatch()

  const existingIds = new Set(cy.edges().map(e => e.id()))
  const newIds      = new Set(newEdges.map(e => e.id))

  cy.edges().filter(e => !newIds.has(e.id())).remove()

  newEdges.forEach(e => {
    if (existingIds.has(e.id)) {
      const edge = cy.getElementById(e.id)
      edge.data({ sentido: e.sentido || 'doble', calzada: e.calzada || 'sencilla' })
      e.estado === 'cerrada' ? edge.addClass('cerrada') : edge.removeClass('cerrada')
    } else {
      const added = cy.add({
        group: 'edges',
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          sentido: e.sentido || 'doble',
          calzada: e.calzada || 'sencilla'
        }
      })
      if (e.estado === 'cerrada') added.addClass('cerrada')
    }
  })

  cy.endBatch()
}, { deep: true })

watch(() => props.selectedElement, newEl => {
  if (!cy) return
  cy.startBatch()
  cy.elements('.app-selected').removeClass('app-selected')
  stopPulse()

  if (newEl) {
    const el = cy.getElementById(newEl.id)
    if (!el.empty()) {
      el.addClass('app-selected')
      if (props.selectedElementType === 'node') startPulse(el)
    }
  }
  applyZoomLabels()
  cy.endBatch()
})

watch(() => props.dijkstraResult, result => {
  if (!cy) return
  cy.startBatch()
  cy.elements('.dijkstra-node, .dijkstra-edge').removeClass('dijkstra-node dijkstra-edge')
  if (result) {
    result.nodeIds.forEach(id => cy.getElementById(id).addClass('dijkstra-node'))
    result.edgeIds.forEach(id => cy.getElementById(id).addClass('dijkstra-edge'))
  }
  applyZoomLabels()
  cy.endBatch()
})

watch(() => props.activeMode, mode => {
  if (!cy) return
  if (mode !== 'add-edge') {
    edgeSourceId.value = null
    previewPos.value   = null
    cy.nodes().removeClass('edge-source')
  }
})

// ─── Handlers de eventos Cytoscape ───────────────────────────────────────────
const handleNodeTap = e => {
  e.stopPropagation()
  const nodeId   = e.target.id()
  const nodeData = props.nodes.find(n => n.id === nodeId)
  if (!nodeData) return

  if (props.activeMode === 'select') {
    emit('select-node', nodeData)
  } else if (props.activeMode === 'add-edge') {
    if (!edgeSourceId.value) {
      edgeSourceId.value = nodeId
      e.target.addClass('edge-source')
    } else if (edgeSourceId.value !== nodeId) {
      emit('add-edge', { sourceId: edgeSourceId.value, targetId: nodeId })
      cy.nodes().removeClass('edge-source')
      edgeSourceId.value = null
      previewPos.value   = null
    }
  }
}

const handleEdgeTap = e => {
  e.stopPropagation()
  if (props.activeMode !== 'select') return
  const edgeId   = e.target.id()
  const edgeData = props.edges.find(ed => ed.id === edgeId)
  if (edgeData) emit('select-edge', edgeData)
}

const handleBackgroundTap = e => {
  if (e.target !== cy) return
  if (props.activeMode === 'add-node') {
    const pos = e.position
    emit('add-node', { x: pos.x, y: pos.y })
  } else {
    emit('clear-selection')
  }
}

// Etiquetas visibles al zoom >= 260% o para nodos especiales
const applyZoomLabels = () => {
  if (!cy) return
  const showAll = cy.zoom() >= 2.6
  cy.nodes().forEach(node => {
    const special = node.hasClass('app-selected') ||
                    node.hasClass('dijkstra-node') ||
                    node.hasClass('hovered') ||
                    node.hasClass('edge-source')
    node.style('text-opacity', showAll || special ? 1 : 0)
  })
}

// Preview de arista: posición del mouse en coordenadas del contenedor
const handleContainerMouseMove = e => {
  if (props.activeMode === 'add-edge' && edgeSourceId.value) {
    const rect   = containerRef.value.getBoundingClientRect()
    previewPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
}

// Posición en pantalla del nodo fuente (para el SVG de preview)
const edgeSourceScreenPos = computed(() => {
  if (!cy || !edgeSourceId.value) return { x: 0, y: 0 }
  const node = cy.getElementById(edgeSourceId.value)
  if (node.empty()) return { x: 0, y: 0 }
  return node.renderedPosition()
})

// ─── Animación de pulso del nodo seleccionado ─────────────────────────────────
const startPulse = node => {
  stopPulse()
  pulseVal = 0.05
  pulseDir = 1
  pulseInterval = setInterval(() => {
    if (!cy || !node) return
    pulseVal += pulseDir * 0.015
    if (pulseVal >= 0.5)  pulseDir = -1
    if (pulseVal <= 0.04) pulseDir =  1
    node.style('overlay-opacity', pulseVal)
  }, 20)
}

const stopPulse = () => {
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null }
}

// ─── Navegación ──────────────────────────────────────────────────────────────
const zoomIn = () => {
  if (!cy || !containerRef.value) return
  cy.zoom({
    level: Math.min(cy.zoom() * 1.35, 15),
    renderedPosition: {
      x: containerRef.value.offsetWidth  / 2,
      y: containerRef.value.offsetHeight / 2
    }
  })
}

const zoomOut = () => {
  if (!cy || !containerRef.value) return
  cy.zoom({
    level: Math.max(cy.zoom() / 1.35, 0.04),
    renderedPosition: {
      x: containerRef.value.offsetWidth  / 2,
      y: containerRef.value.offsetHeight / 2
    }
  })
}

const resetView = () => {
  if (!cy || cy.nodes().empty()) return
  cy.fit(cy.nodes(), 60)
  emit('zoom-reset')
}

const centerOnCoordinates = (x, y) => {
  if (!cy) return
  cy.animate({
    zoom: Math.max(cy.zoom(), 0.8),
    center: { position: { x, y } },
    duration: 300,
    easing: 'ease-out'
  })
}

defineExpose({ centerOnCoordinates, resetView })
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: grab;
  /* Cuadrícula de puntos como fondo */
  background-image: radial-gradient(circle, rgba(0, 0, 0, 0.07) 1.2px, transparent 1.2px);
  background-size: 50px 50px;
  background-color: #f8fafc;
}

.canvas-container:active  { cursor: grabbing; }
.canvas-container.mode-add-node { cursor: crosshair; }
.canvas-container.mode-add-edge { cursor: cell; }

/* Controles flotantes de navegación */
.navigation-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 6px;
  z-index: 10;
}

.navigation-controls button {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--glass-border);
  color: #1f2937;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.navigation-controls button:hover {
  background: rgba(0, 133, 63, 0.1);
  color: #00853F;
}

.nav-divider {
  width: 1px;
  height: 18px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0 2px;
  flex-shrink: 0;
}

.zoom-level {
  font-size: 0.72rem;
  font-weight: 700;
  color: hsl(var(--text-muted));
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  flex-shrink: 0;
}

.indicator.select    { color: #00853F; background-color: #00853F; }
.indicator.add-node  { color: #00B259; background-color: #00B259; }
.indicator.add-edge  { color: #F5A623; background-color: #F5A623; }

.badge-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: hsl(var(--text-light));
}

/* Barra de estado inferior */
.canvas-statusbar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  z-index: 10;
  font-size: 0.72rem;
  font-weight: 600;
  color: hsl(var(--text-muted));
  white-space: nowrap;
}

.statusbar-route {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c47d00;
}

/* SVG de preview de arista */
.edge-preview-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 8;
}
</style>

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

    <!-- Overlay SVG: anillo pulsante + preview de arista -->
    <svg class="sigma-overlay">
      <!-- Anillo pulsante del nodo seleccionado -->
      <circle
        v-if="pulsePos && selectedElementType === 'node'"
        class="pulse-ring"
        :cx="pulsePos.x"
        :cy="pulsePos.y"
        :r="pulsePos.r"
        fill="none"
        stroke="#00853F"
        stroke-width="2"
      />
      <!-- Línea de preview al crear vías -->
      <line
        v-if="activeMode === 'add-edge' && edgeSourceId && previewPos"
        :x1="edgeSrcScreenPos.x"
        :y1="edgeSrcScreenPos.y"
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
import Sigma from 'sigma'
import Graph from 'graphology'

const props = defineProps({
  nodes:               { type: Array,   required: true },
  edges:               { type: Array,   required: true },
  activeMode:          { type: String,  default: 'select' },
  is3d:                { type: Boolean, default: false },
  selectedElement:     { type: Object,  default: null },
  selectedElementType: { type: String,  default: null },
  dijkstraResult:      { type: Object,  default: null }
})

const emit = defineEmits([
  'select-node', 'select-edge', 'clear-selection',
  'move-node', 'move-node-end', 'add-node', 'add-edge', 'zoom-reset'
])

const containerRef = ref(null)
let graph    = null
let renderer = null

// ─── Estado reactivo ──────────────────────────────────────────────────────────
const cameraRatio   = ref(1)
const currentZoom   = computed(() => 1 / cameraRatio.value)
const selectedNodeId = ref(null)
const selectedEdgeId = ref(null)
const hoveredNodeId  = ref(null)
const dijkstraNodeIds = ref(new Set())
const dijkstraEdgeIds = ref(new Set())
const edgeSourceId   = ref(null)
const previewPos     = ref(null)
const pulsePos       = ref(null)      // {x, y, r} en coords de pantalla
const edgeSrcScreenPos = ref({ x: 0, y: 0 })
let wasEmpty = true

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

// ─── Colores y tamaños base ───────────────────────────────────────────────────
const BASE_SIZE  = { municipio: 8,   interseccion: 5 }
const BASE_COLOR = { municipio: '#00853F', interseccion: '#F5A623' }

const nodeBaseSize  = (tipo) => BASE_SIZE[tipo]  ?? 5
const nodeBaseColor = (tipo) => BASE_COLOR[tipo] ?? '#00853F'

// ─── nodeReducer — estilización dinámica ─────────────────────────────────────
const nodeReducer = (node, data) => {
  const res        = { ...data }
  const isSelected = selectedNodeId.value  === node
  const isDijkstra = dijkstraNodeIds.value.has(node)
  const isHovered  = hoveredNodeId.value   === node
  const isEdgeSrc  = edgeSourceId.value    === node
  const isSpecial  = isSelected || isDijkstra || isHovered || isEdgeSrc

  // Etiqueta visible al zoom ≥ 260% o para nodos especiales
  const showLabel = cameraRatio.value <= 0.385 || isSpecial
  res.label = showLabel ? data.nombre : ''

  if (isDijkstra) {
    res.color  = '#FFD100'
    res.size   = data.baseSize * 1.85
    res.zIndex = 90
  } else if (isSelected) {
    res.color  = data.tipo === 'municipio' ? '#00C965' : '#FFE054'
    res.size   = data.baseSize * 1.6
    res.zIndex = 100
  } else if (isEdgeSrc) {
    res.color  = '#F5A623'
    res.size   = data.baseSize * 1.2
    res.zIndex = 95
  } else if (isHovered) {
    res.size   = data.baseSize * 1.15
  }

  return res
}

// ─── edgeReducer — estilización dinámica ─────────────────────────────────────
const edgeReducer = (edge, data) => {
  const res        = { ...data }
  const isSelected = selectedEdgeId.value  === edge
  const isDijkstra = dijkstraEdgeIds.value.has(edge)

  if (isDijkstra) {
    res.color  = '#D4AF37'
    res.size   = 6
    res.zIndex = 40
  } else if (isSelected) {
    res.color  = '#F5A623'
    res.size   = 5
    res.zIndex = 50
  } else if (data.cerrada) {
    res.color  = 'rgba(127,29,29,0.65)'
  }

  return res
}

// ─── Posiciones de pantalla (anillo + preview) ─────────────────────────────
const updateOverlayPositions = () => {
  if (!renderer || !graph) return

  // Anillo pulsante
  if (selectedNodeId.value) {
    try {
      const gx  = graph.getNodeAttribute(selectedNodeId.value, 'x')
      const gy  = graph.getNodeAttribute(selectedNodeId.value, 'y')
      const sp  = renderer.graphToViewport({ x: gx, y: gy })
      const dd  = renderer.getNodeDisplayData(selectedNodeId.value)
      const g2v = renderer.getGraphToViewportRatio()
      pulsePos.value = { x: sp.x, y: sp.y, r: (dd?.size ?? 8) * g2v * 1.55 }
    } catch { pulsePos.value = null }
  } else {
    pulsePos.value = null
  }

  // Fuente de arista
  if (edgeSourceId.value) {
    try {
      const gx = graph.getNodeAttribute(edgeSourceId.value, 'x')
      const gy = graph.getNodeAttribute(edgeSourceId.value, 'y')
      edgeSrcScreenPos.value = renderer.graphToViewport({ x: gx, y: gy })
    } catch { /* noop */ }
  }
}

// ─── Inicialización ───────────────────────────────────────────────────────────
onMounted(() => {
  graph = new Graph({ type: 'mixed', multi: false })

  props.nodes.forEach(n => {
    const bs = nodeBaseSize(n.tipo)
    graph.addNode(n.id, {
      x: n.x, y: n.y,
      size: bs, baseSize: bs,
      color: nodeBaseColor(n.tipo),
      label: '', nombre: n.nombre, tipo: n.tipo
    })
  })

  props.edges.forEach(e => addGraphEdge(e))

  renderer = new Sigma(graph, containerRef.value, {
    renderEdgeLabels:      false,
    enableEdgeEvents:      true,
    defaultNodeType:       'circle',
    defaultEdgeType:       'line',
    labelFont:             'Inter, system-ui, sans-serif',
    labelSize:             12,
    labelWeight:           'bold',
    labelColor:            { color: '#1f2937' },
    labelBackgroundColor:  '#ffffff',
    labelRenderedSizeThreshold: 0,    // la visibilidad la controla el reducer
    stagePadding:          60,
    zIndex:                true,
    minCameraRatio:        0.067,     // zoom máx ~1500%
    maxCameraRatio:        10,
    nodeReducer,
    edgeReducer
  })

  // Eventos de cámara
  renderer.getCamera().on('updated', state => {
    cameraRatio.value = state.ratio
    renderer.refresh()        // re-evalúa reducers (etiquetas, estados)
    updateOverlayPositions()
  })

  // Eventos de render
  renderer.on('afterRender', updateOverlayPositions)

  // ─── Drag de nodos ────────────────────────────────────────────────────────
  let draggedNode = null
  let hasDragged  = false

  renderer.on('downNode', ({ node }) => {
    if (props.activeMode !== 'select') return
    draggedNode = node
    hasDragged  = false
    renderer.getCamera().disable()
  })

  renderer.getMouseCaptor().on('mousemovebody', (e) => {
    if (!draggedNode) return
    hasDragged = true
    const pos = renderer.viewportToGraph(e)
    graph.setNodeAttribute(draggedNode, 'x', pos.x)
    graph.setNodeAttribute(draggedNode, 'y', pos.y)
    emit('move-node', { nodeId: draggedNode, x: pos.x, y: pos.y })
    e.preventSigmaDefault()
    renderer.refresh()
  })

  renderer.getMouseCaptor().on('mouseup', () => {
    if (draggedNode) {
      renderer.getCamera().enable()
      if (hasDragged) emit('move-node-end')
      draggedNode = null
    }
  })

  // Click en nodo
  renderer.on('clickNode', ({ node }) => {
    if (hasDragged) return  // fue drag, no click
    if (props.activeMode === 'select') {
      const nodeData = props.nodes.find(n => n.id === node)
      if (nodeData) emit('select-node', nodeData)
    } else if (props.activeMode === 'add-edge') {
      if (!edgeSourceId.value) {
        edgeSourceId.value = node
        renderer.refresh()
      } else if (edgeSourceId.value !== node) {
        emit('add-edge', { sourceId: edgeSourceId.value, targetId: node })
        edgeSourceId.value = null
        previewPos.value   = null
        renderer.refresh()
      }
    }
  })

  // Click en arista
  renderer.on('clickEdge', ({ edge }) => {
    if (props.activeMode !== 'select') return
    const edgeData = props.edges.find(e => e.id === edge)
    if (edgeData) emit('select-edge', edgeData)
  })

  // Click en fondo
  renderer.on('clickStage', ({ event }) => {
    if (props.activeMode === 'add-node') {
      const graphCoords = renderer.viewportToGraph({ x: event.x, y: event.y })
      emit('add-node', graphCoords)
    } else {
      emit('clear-selection')
    }
  })

  // Hover
  renderer.on('enterNode', ({ node }) => {
    hoveredNodeId.value = node
    renderer.refresh()
  })
  renderer.on('leaveNode', () => {
    hoveredNodeId.value = null
    renderer.refresh()
  })
})

onUnmounted(() => {
  if (renderer) { renderer.kill(); renderer = null }
  graph = null
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const addGraphEdge = (e) => {
  if (!graph || !graph.hasNode(e.source) || !graph.hasNode(e.target)) return
  if (graph.hasEdge(e.id)) return
  graph.addEdgeWithKey(e.id, e.source, e.target, {
    size:    e.calzada === 'doble' ? 4 : 2,
    color:   e.estado === 'cerrada' ? 'rgba(127,29,29,0.65)' : '#4b5563',
    type:    e.sentido === 'un-sentido' ? 'arrow' : 'line',
    cerrada: e.estado === 'cerrada',
    sentido: e.sentido || 'doble',
    calzada: e.calzada || 'sencilla'
  })
}

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(() => props.nodes, newNodes => {
  if (!graph || !renderer) return

  const existingIds = new Set(graph.nodes())
  const newIds      = new Set(newNodes.map(n => n.id))

  graph.nodes().filter(id => !newIds.has(id)).forEach(id => graph.dropNode(id))

  newNodes.forEach(n => {
    if (existingIds.has(n.id)) {
      const bs = nodeBaseSize(n.tipo)
      graph.setNodeAttribute(n.id, 'x',        n.x)
      graph.setNodeAttribute(n.id, 'y',        n.y)
      graph.setNodeAttribute(n.id, 'nombre',   n.nombre)
      graph.setNodeAttribute(n.id, 'tipo',     n.tipo)
      graph.setNodeAttribute(n.id, 'baseSize', bs)
      graph.setNodeAttribute(n.id, 'color',    nodeBaseColor(n.tipo))
      graph.setNodeAttribute(n.id, 'size',     bs)
    } else {
      const bs = nodeBaseSize(n.tipo)
      graph.addNode(n.id, {
        x: n.x, y: n.y,
        size: bs, baseSize: bs,
        color: nodeBaseColor(n.tipo),
        label: '', nombre: n.nombre, tipo: n.tipo
      })
    }
  })

  renderer.refresh()

  if (wasEmpty && newNodes.length > 0) {
    wasEmpty = false
    setTimeout(() => renderer?.getCamera().animatedReset(), 150)
  }
}, { deep: true })

watch(() => props.edges, newEdges => {
  if (!graph || !renderer) return

  const existingIds = new Set(graph.edges())
  const newIds      = new Set(newEdges.map(e => e.id))

  graph.edges().filter(id => !newIds.has(id)).forEach(id => graph.dropEdge(id))

  newEdges.forEach(e => {
    if (existingIds.has(e.id)) {
      graph.setEdgeAttribute(e.id, 'size',    e.calzada === 'doble' ? 4 : 2)
      graph.setEdgeAttribute(e.id, 'color',   e.estado === 'cerrada' ? 'rgba(127,29,29,0.65)' : '#4b5563')
      graph.setEdgeAttribute(e.id, 'type',    e.sentido === 'un-sentido' ? 'arrow' : 'line')
      graph.setEdgeAttribute(e.id, 'cerrada', e.estado === 'cerrada')
    } else {
      addGraphEdge(e)
    }
  })

  renderer.refresh()
}, { deep: true })

watch(() => props.selectedElement, newEl => {
  if (props.selectedElementType === 'node') {
    selectedNodeId.value = newEl?.id ?? null
    selectedEdgeId.value = null
  } else if (props.selectedElementType === 'edge') {
    selectedEdgeId.value = newEl?.id ?? null
    selectedNodeId.value = null
  } else {
    selectedNodeId.value = null
    selectedEdgeId.value = null
  }
  if (renderer) renderer.refresh()
  updateOverlayPositions()
})

watch(() => props.dijkstraResult, result => {
  dijkstraNodeIds.value = new Set(result?.nodeIds ?? [])
  dijkstraEdgeIds.value = new Set(result?.edgeIds ?? [])
  if (renderer) renderer.refresh()
})

watch(() => props.activeMode, mode => {
  if (mode !== 'add-edge') {
    edgeSourceId.value = null
    previewPos.value   = null
    if (renderer) renderer.refresh()
  }
})

// ─── Mouse move (preview de arista) ──────────────────────────────────────────
const handleContainerMouseMove = e => {
  if (props.activeMode === 'add-edge' && edgeSourceId.value) {
    const rect       = containerRef.value.getBoundingClientRect()
    previewPos.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
}

// ─── Navegación ──────────────────────────────────────────────────────────────
const zoomIn = () => {
  renderer?.getCamera().animatedZoom({ factor: 1.35 })
}

const zoomOut = () => {
  renderer?.getCamera().animatedUnzoom({ factor: 1.35 })
}

const resetView = () => {
  renderer?.getCamera().animatedReset()
  emit('zoom-reset')
}

const centerOnCoordinates = (x, y) => {
  if (!renderer || !graph) return
  const nodeId = graph.nodes().find(id => {
    const attrs = graph.getNodeAttributes(id)
    return Math.abs(attrs.x - x) < 1 && Math.abs(attrs.y - y) < 1
  })
  if (!nodeId) return
  const dd = renderer.getNodeDisplayData(nodeId)
  if (!dd) return
  renderer.getCamera().animate(
    { x: dd.x, y: dd.y, ratio: Math.min(renderer.getCamera().ratio, 0.5) },
    { duration: 300 }
  )
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
  background-image: radial-gradient(circle, rgba(0,0,0,0.07) 1.2px, transparent 1.2px);
  background-size: 50px 50px;
  background-color: #f8fafc;
}

.canvas-container:active  { cursor: grabbing; }
.canvas-container.mode-add-node { cursor: crosshair; }
.canvas-container.mode-add-edge { cursor: cell; }

/* Controles flotantes */
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
  background: rgba(0,0,0,0.04);
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
  background: rgba(0,133,63,0.1);
  color: #00853F;
}

.nav-divider {
  width: 1px;
  height: 18px;
  background: rgba(0,0,0,0.1);
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

/* Barra de estado */
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

/* Overlay SVG: anillo + preview */
.sigma-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 8;
}

/* Anillo pulsante */
.pulse-ring {
  animation: pulse-ring 1.3s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes pulse-ring {
  0%   { transform: scale(1.0);  opacity: 0.75; }
  50%  { transform: scale(1.55); opacity: 0.12; }
  100% { transform: scale(1.0);  opacity: 0.75; }
}
</style>

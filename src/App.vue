<template>
  <div class="app-container">
    <!-- Header principal -->
    <header class="main-header glass">
      <div class="header-logo">
        <span class="logo-emoji">🕸️</span>
        <div class="logo-text">
          <h1>Red Vial Antioquia</h1>
          <p>• Diagrama de Grafos</p>
        </div>
      </div>
      
      <!-- El toolbar se ha trasladado al lienzo en forma flotante -->

    </header>

    <!-- Contenido Principal -->
    <main class="main-content">
      <div class="canvas-wrapper">
        <GraphCanvas 
          :nodes="nodes" 
          :edges="edges" 
          :active-mode="activeMode" 
          :is-3d="is3DMode"
          :selected-element="selectedElement"
          :selected-element-type="selectedElementType"
          :dijkstra-result="dijkstraResult"
          @select-node="selectNode"
          @select-edge="selectEdge"
          @clear-selection="clearSelection"
          @move-node="moveNode"
          @move-node-end="handleMoveNodeEnd"
          @add-node="addNode"
          @add-edge="addEdge"
          @zoom-reset="handleZoomReset"
          ref="canvasRef"
        />
        
        <!-- Buscador Flotante (Esquina Superior Izquierda) -->
        <div class="search-overlay glass glow-primary">
          <div class="search-input-wrapper">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Buscar municipios..." 
              class="search-input-floating"
              @focus="searchFocused = true"
              @blur="handleSearchBlur"
            />
            <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <!-- Lista de resultados -->
          <div v-if="searchFocused && filteredNodes.length > 0" class="search-results-dropdown">
            <div 
              v-for="node in filteredNodes" 
              :key="node.id" 
              class="search-result-item"
              @mousedown="selectSearchResult(node)"
            >
              <span class="result-dot" :class="node.tipo"></span>
              <div class="result-info">
                <span class="result-name">{{ node.nombre }}</span>
                <span class="result-type">{{ node.tipo === 'municipio' ? 'Municipio' : 'Intersección' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel de Modos Flotante (Esquina Superior Derecha) -->
        <div class="modes-overlay glass">
          <button 
            :class="['btn-mode-floating', { active: activeMode === 'select' && !is3DMode }]" 
            @click="is3DMode ? toggle3DMode() : setMode('select')"
            title="Seleccionar y Mover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
          </button>
          
          <button 
            :class="['btn-mode-floating', { active: activeMode === 'add-node' }]" 
            @click="setMode('add-node')"
            :disabled="is3DMode"
            title="Agregar Nodo (Clic en Lienzo)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          </button>
          
          <button 
            :class="['btn-mode-floating', { active: activeMode === 'add-edge' }]" 
            @click="setMode('add-edge')"
            :disabled="is3DMode"
            title="Agregar Vía (Origen -> Destino)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
          
          <div class="floating-divider"></div>
          
          <button 
            :class="['btn-mode-floating', { active: is3DMode }]" 
            @click="toggle3DMode"
            title="Vista Átomo 3D"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10zM2 12h20"/></svg>
          </button>
        </div>

        <!-- Botón flotante "+" en la parte inferior derecha -->
        <button 
          class="add-node-fab glass" 
          @click="openAddNodeModal" 
          title="Agregar Nodo por Coordenadas"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- Panel Lateral (Sidebar) -->
      <aside class="sidebar-wrapper">
        <SidebarPanel
          :nodes="nodes"
          :edges="edges"
          :selected-element="selectedElement"
          :selected-element-type="selectedElementType"
          :dijkstra-result="dijkstraResult"
          :map-bounds="mapBounds"
          v-model:start-node-id="dijkstraStartNodeId"
          v-model:end-node-id="dijkstraEndNodeId"
          @update-node="updateNode"
          @update-edge="updateEdge"
          @delete-node="deleteNode"
          @delete-edge="deleteEdge"
          @calculate-dijkstra="calculateDijkstra"
          @clear-dijkstra="clearDijkstra"
          @center-on-node="centerOnNode"
          @add-node-by-coordinates="addNodeByCoordinates"
        />
      </aside>
    </main>

    <!-- Notificaciones de Guardado -->
    <Transition name="fade">
      <div v-if="toast.show" :class="['toast', toast.type]">
        <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <svg v-else-if="toast.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <svg v-else-if="toast.type === 'danger'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- Modal para Agregar Nodo por Coordenadas -->
    <Transition name="modal-fade">
      <div v-if="showAddNodeModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content glass glow-primary">
          <div class="modal-header">
            <h3>Agregar Nuevo Nodo</h3>
            <button class="btn-close-modal" @click="closeModal" title="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          
          <form @submit.prevent="submitAddNode" class="modal-body">
            <div class="input-item">
              <label for="modal-node-name">Nombre del Nodo</label>
              <input 
                id="modal-node-name"
                type="text" 
                v-model="modalNodeName" 
                placeholder="Ej. Medellín, Envigado, Intersección Norte..." 
                required
                class="modal-input"
              />
            </div>
            
            <div class="input-item">
              <label for="modal-node-tipo">Tipo de Nodo (Propiedad GeoJSON)</label>
              <select id="modal-node-tipo" v-model="modalNodeTipo" class="modal-select">
                <option value="municipio">Municipio</option>
                <option value="interseccion">Intersección</option>
              </select>
            </div>
            
            <div class="input-item">
              <label for="modal-node-coords">Coordenadas (Latitud, Longitud)</label>
              <input 
                id="modal-node-coords"
                type="text" 
                v-model="modalNodeCoords" 
                placeholder="Ej. 6.2482, -75.5800" 
                required
                class="modal-input"
              />
              <span class="input-help">Ingresa las coordenadas en formato decimal (ej: Latitud, Longitud) separadas por coma.</span>
            </div>
            
            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
              <button type="submit" class="btn-primary">Crear Nodo</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import GraphCanvas from './components/GraphCanvas.vue'
import SidebarPanel from './components/SidebarPanel.vue'

// --- ESTADO ---
const nodes = ref([])
const edges = ref([])
const activeMode = ref('select') // 'select' | 'add-node' | 'add-edge'
const is3DMode = ref(false)

const selectedElement = ref(null)
const selectedElementType = ref(null) // 'node' | 'edge'

const dijkstraStartNodeId = ref('')
const dijkstraEndNodeId = ref('')
const dijkstraResult = ref(null)

const saving = ref(false)
const savedStatus = ref('saved') // 'saved' | 'modified' | 'saving'

const toast = reactive({
  show: false,
  message: '',
  type: 'info'
})

const canvasRef = ref(null)

// --- SISTEMA DE PROYECCIÓN GEOGRÁFICA ---
const width = 3000
const height = 3000
const margin = 200

const mapBounds = reactive({ minLng: -76.8, maxLng: -74.5, minLat: 5.5, maxLat: 8.9 })

const calculateBounds = (features) => {
  const points = features.filter(f => f.geometry.type === 'Point')
  if (points.length === 0) return
  const lngs = points.map(f => f.geometry.coordinates[0])
  const lats = points.map(f => f.geometry.coordinates[1])
  mapBounds.minLng = Math.min(...lngs)
  mapBounds.maxLng = Math.max(...lngs)
  mapBounds.minLat = Math.min(...lats)
  mapBounds.maxLat = Math.max(...lats)
}

const project = (lng, lat) => {
  const { minLng, maxLng, minLat, maxLat } = mapBounds
  const x = margin + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * margin)
  const y = height - margin - ((lat - minLat) / (maxLat - minLat)) * (height - 2 * margin)
  return { x, y }
}

const unproject = (x, y) => {
  const { minLng, maxLng, minLat, maxLat } = mapBounds
  const lng = minLng + ((x - margin) / (width - 2 * margin)) * (maxLng - minLng)
  const lat = minLat + (((height - margin) - y) / (height - 2 * margin)) * (maxLat - minLat)
  return [lng, lat]
}

// --- HISTORIAL (UNDO/REDO) ---
const undoStack = ref([])
const redoStack = ref([])

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

const pushState = () => {
  savedStatus.value = 'modified'
  
  // Guardar copia profunda de nodos y vías
  const nodesCopy = JSON.parse(JSON.stringify(nodes.value))
  const edgesCopy = JSON.parse(JSON.stringify(edges.value))
  
  undoStack.value.push({ nodes: nodesCopy, edges: edgesCopy })
  redoStack.value = [] // Limpiar rehacer
}

const undo = () => {
  if (!canUndo.value) return
  
  // Guardar estado actual en redo stack
  const nodesCopy = JSON.parse(JSON.stringify(nodes.value))
  const edgesCopy = JSON.parse(JSON.stringify(edges.value))
  redoStack.value.push({ nodes: nodesCopy, edges: edgesCopy })
  
  // Cargar estado anterior
  const previousState = undoStack.value.pop()
  nodes.value = previousState.nodes
  edges.value = previousState.edges
  
  // Actualizar selección
  restoreSelection()
  clearDijkstra()
  showToast('Deshecho', 'info')
  saveGeoJSON() // Autoguardado
}

const redo = () => {
  if (!canRedo.value) return
  
  // Guardar estado actual en undo stack
  const nodesCopy = JSON.parse(JSON.stringify(nodes.value))
  const edgesCopy = JSON.parse(JSON.stringify(edges.value))
  undoStack.value.push({ nodes: nodesCopy, edges: edgesCopy })
  
  // Cargar estado siguiente
  const nextState = redoStack.value.pop()
  nodes.value = nextState.nodes
  edges.value = nextState.edges
  
  restoreSelection()
  clearDijkstra()
  showToast('Rehecho', 'info')
  saveGeoJSON() // Autoguardado
}

// Restaurar selección si el elemento aún existe tras un deshacer/rehacer
const restoreSelection = () => {
  if (!selectedElement.value) return
  const id = selectedElement.value.id
  if (selectedElementType.value === 'node') {
    const found = nodes.value.find(n => n.id === id)
    selectedElement.value = found || null
    if (!found) selectedElementType.value = null
  } else {
    const found = edges.value.find(e => e.id === id)
    selectedElement.value = found || null
    if (!found) selectedElementType.value = null
  }
}

// --- COMUNICACIÓN API ---
const loadGeoJSON = async () => {
  try {
    const res = await fetch('/api/geojson')
    if (!res.ok) throw new Error('Error al leer el archivo GeoJSON')
    const geojson = await res.json()
    
    calculateBounds(geojson.features)
    
    const loadedNodes = []
    const loadedEdges = []
    
    // 1. Procesar puntos primero (Nodos)
    geojson.features.forEach(f => {
      if (f.geometry.type === 'Point') {
        const coords = f.geometry.coordinates
        const { x, y } = project(coords[0], coords[1])
        loadedNodes.push({
          id: f.properties.id || `node-${Math.random().toString(36).substr(2, 9)}`,
          nombre: f.properties.nombre || 'Sin nombre',
          tipo: f.properties.tipo || 'interseccion',
          x,
          y
        })
      }
    })
    
    // 2. Procesar vías
    geojson.features.forEach(f => {
      if (f.geometry.type === 'LineString') {
        let defaultDist = 0
        const coords = f.geometry.coordinates
        if (coords && coords.length >= 2) {
          const p1 = coords[0] // [lng, lat]
          const p2 = coords[1] // [lng, lat]
          const R = 6371
          const dLat = (p2[1] - p1[1]) * Math.PI / 180
          const dLng = (p2[0] - p1[0]) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          defaultDist = Number((R * c).toFixed(2))
        }

        loadedEdges.push({
          id: f.properties.id || `via-${Math.random().toString(36).substr(2, 9)}`,
          source: f.properties.source,
          target: f.properties.target,
          sentido: f.properties.sentido || 'doble',
          calzada: f.properties.calzada || 'sencilla',
          tipo: f.properties.tipo || 'via',
          nombre: f.properties.nombre || 'Vía sin nombre',
          capa_rodadura: f.properties.capa_rodadura || 'pavimentada',
          longitud: f.properties.longitud !== undefined ? Number(f.properties.longitud) : defaultDist,
          estado: f.properties.estado || 'abierta',
          precipitacion: f.properties.precipitacion !== undefined ? Number(f.properties.precipitacion) : 0,
          puntos_criticos: f.properties.puntos_criticos !== undefined ? Number(f.properties.puntos_criticos) : 0,
          pendiente: f.properties.pendiente !== undefined ? Number(f.properties.pendiente) : 0
        })
      }
    })
    
    nodes.value = loadedNodes
    edges.value = loadedEdges
    
    savedStatus.value = 'saved'
    undoStack.value = []
    redoStack.value = []
  } catch (err) {
    showToast('Error cargando GeoJSON: ' + err.message, 'danger')
  }
}

const saveGeoJSON = async () => {
  saving.value = true
  savedStatus.value = 'saving'
  
  try {
    // Reconstruir lista de Features GeoJSON
    const features = []
    
    // 1. Nodos
    nodes.value.forEach(n => {
      const [lng, lat] = unproject(n.x, n.y)
      features.push({
        type: 'Feature',
        properties: {
          id: n.id,
          nombre: n.nombre,
          tipo: n.tipo
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      })
    })
    
    // 2. Vías
    edges.value.forEach(e => {
      const sourceNode = nodes.value.find(n => n.id === e.source)
      const targetNode = nodes.value.find(n => n.id === e.target)
      
      // Si alguno de los nodos extremos no existe, no guardar la vía
      if (!sourceNode || !targetNode) return
      
      const sourceCoords = unproject(sourceNode.x, sourceNode.y)
      const targetCoords = unproject(targetNode.x, targetNode.y)
      
      features.push({
        type: 'Feature',
        properties: {
          id: e.id,
          source: e.source,
          target: e.target,
          sentido: e.sentido,
          calzada: e.calzada,
          tipo: e.tipo,
          nombre: e.nombre || 'Vía sin nombre',
          capa_rodadura: e.capa_rodadura || 'pavimentada',
          longitud: e.longitud !== undefined ? Number(e.longitud) : 0,
          estado: e.estado || 'abierta',
          precipitacion: e.precipitacion !== undefined ? Number(e.precipitacion) : 0,
          puntos_criticos: e.puntos_criticos !== undefined ? Number(e.puntos_criticos) : 0,
          pendiente: e.pendiente !== undefined ? Number(e.pendiente) : 0
        },
        geometry: {
          type: 'LineString',
          coordinates: [sourceCoords, targetCoords]
        }
      })
    })
    
    const geojson = {
      type: 'FeatureCollection',
      features
    }
    
    const res = await fetch('/api/geojson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geojson)
    })
    
    if (!res.ok) throw new Error('Error al guardar archivo')
    
    savedStatus.value = 'saved'
    showToast('Cambios guardados en disco correctamente', 'success')
  } catch (err) {
    savedStatus.value = 'modified'
    showToast('Error al guardar: ' + err.message, 'danger')
  } finally {
    saving.value = false
  }
}

// --- INTERACCIONES DEL LIENZO ---
const toggle3DMode = () => {
  is3DMode.value = !is3DMode.value
  if (is3DMode.value) {
    activeMode.value = 'select'
  }
  clearSelection()
}

const setMode = (mode) => {
  activeMode.value = mode
  clearSelection()
}

const selectNode = (node) => {
  selectedElement.value = node
  selectedElementType.value = 'node'
}

const selectEdge = (edge) => {
  selectedElement.value = edge
  selectedElementType.value = 'edge'
}

const clearSelection = () => {
  selectedElement.value = null
  selectedElementType.value = null
}

const moveNode = ({ nodeId, x, y }) => {
  const node = nodes.value.find(n => n.id === nodeId)
  if (node) {
    node.x = x
    node.y = y
    // Al arrastrar, modificamos el estado pero no creamos entrada de historial en cada pixel.
    // Marcaremos como modificado.
    if (savedStatus.value === 'saved') {
      savedStatus.value = 'modified'
    }
  }
}

// Agregar un nodo en una coordenada SVG [x, y]
const addNode = ({ x, y }) => {
  pushState()
  
  const id = `node-${Math.random().toString(36).substr(2, 9)}`
  const newNode = {
    id,
    nombre: 'Nuevo Nodo',
    tipo: 'interseccion',
    x,
    y
  }
  nodes.value.push(newNode)
  selectNode(newNode)
  showToast('Nodo creado', 'success')
  saveGeoJSON() // Autoguardado
}

const handleMoveNodeEnd = () => {
  pushState()
  saveGeoJSON() // Autoguardado
}

// Variables de estado para el Buscador Flotante
const searchQuery = ref('')
const searchFocused = ref(false)

const filteredNodes = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return []
  return nodes.value.filter(n => 
    n.nombre.toLowerCase().includes(q)
  ).slice(0, 8)
})

const selectSearchResult = (node) => {
  centerOnNode(node.id)
  searchQuery.value = ''
  searchFocused.value = false
}

const handleSearchBlur = () => {
  setTimeout(() => {
    searchFocused.value = false
  }, 150)
}

// Variables de estado y lógica para el Modal de Agregar Nodo por Coordenadas
const showAddNodeModal = ref(false)
const modalNodeName = ref('')
const modalNodeTipo = ref('interseccion')
const modalNodeCoords = ref('')

const openAddNodeModal = () => {
  modalNodeName.value = ''
  modalNodeTipo.value = 'interseccion'
  modalNodeCoords.value = ''
  showAddNodeModal.value = true
}

const closeModal = () => {
  showAddNodeModal.value = false
}

const submitAddNode = () => {
  const name = modalNodeName.value.trim()
  const tipo = modalNodeTipo.value
  const coordsStr = modalNodeCoords.value.trim()
  
  if (!coordsStr) {
    showToast('Por favor ingresa las coordenadas', 'warning')
    return
  }
  
  const parts = coordsStr.split(',')
  if (parts.length !== 2) {
    showToast('Formato incorrecto. Usa: Latitud, Longitud', 'warning')
    return
  }
  
  const lat = parseFloat(parts[0].trim())
  const lng = parseFloat(parts[1].trim())
  
  if (isNaN(lat) || isNaN(lng)) {
    showToast('Las coordenadas deben ser números decimales válidos', 'warning')
    return
  }
  
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showToast('Coordenadas fuera de rango (-90 a 90, -180 a 180)', 'warning')
    return
  }
  
  pushState()
  const { x, y } = project(lng, lat) // Recibe (longitud, latitud) en project
  
  const id = `node-${Math.random().toString(36).substr(2, 9)}`
  const newNode = {
    id,
    nombre: name || 'Nuevo Nodo',
    tipo,
    x,
    y
  }
  
  nodes.value.push(newNode)
  selectNode(newNode)
  closeModal()
  
  // Centrar la vista del lienzo en el nodo creado
  if (canvasRef.value) {
    canvasRef.value.centerOnCoordinates(x, y)
  }
  
  showToast(`Nodo "${newNode.nombre}" agregado exitosamente`, 'success')
  saveGeoJSON() // Autoguardado
}

// Agregar una vía entre origen y destino
const addEdge = ({ sourceId, targetId }) => {
  // Evitar duplicados directos
  const exists = edges.value.some(e => 
    (e.source === sourceId && e.target === targetId) || 
    (e.source === targetId && e.target === sourceId)
  )
  if (exists) {
    showToast('Ya existe una vía entre estos nodos', 'warning')
    return
  }
  
  pushState()
  
  const sNode = nodes.value.find(n => n.id === sourceId)
  const tNode = nodes.value.find(n => n.id === targetId)
  let calculatedDist = 0
  if (sNode && tNode) {
    calculatedDist = Number(calculateDistance(sNode, tNode).toFixed(2))
  }

  const id = `via-${Math.random().toString(36).substr(2, 9)}`
  const newEdge = {
    id,
    source: sourceId,
    target: targetId,
    sentido: 'doble',
    calzada: 'sencilla',
    tipo: 'via',
    nombre: 'Vía sin nombre',
    capa_rodadura: 'pavimentada',
    longitud: calculatedDist,
    estado: 'abierta',
    precipitacion: 0,
    puntos_criticos: 0,
    pendiente: 0
  }
  edges.value.push(newEdge)
  selectEdge(newEdge)
  showToast('Vía creada', 'success')
  saveGeoJSON() // Autoguardado
}

// Actualizar propiedades de un nodo
const updateNode = (updatedNode) => {
  pushState()
  const idx = nodes.value.findIndex(n => n.id === updatedNode.id)
  if (idx !== -1) {
    nodes.value[idx] = { ...nodes.value[idx], ...updatedNode }
    // Actualizar selección activa
    selectedElement.value = nodes.value[idx]
    saveGeoJSON() // Autoguardado
  }
}

// Actualizar propiedades de una vía
const updateEdge = (updatedEdge) => {
  pushState()
  const idx = edges.value.findIndex(e => e.id === updatedEdge.id)
  if (idx !== -1) {
    edges.value[idx] = { ...edges.value[idx], ...updatedEdge }
    selectedElement.value = edges.value[idx]
    saveGeoJSON() // Autoguardado
  }
}

// Eliminar un nodo (y todas sus vías conectadas)
const deleteNode = (nodeId) => {
  pushState()
  
  // 1. Eliminar vías que conectan con este nodo
  edges.value = edges.value.filter(e => e.source !== nodeId && e.target !== nodeId)
  
  // 2. Eliminar el nodo
  nodes.value = nodes.value.filter(n => n.id !== nodeId)
  
  clearSelection()
  clearDijkstra()
  showToast('Nodo y sus conexiones eliminados', 'success')
  saveGeoJSON() // Autoguardado
}

// Eliminar una vía
const deleteEdge = (edgeId) => {
  pushState()
  edges.value = edges.value.filter(e => e.id !== edgeId)
  clearSelection()
  clearDijkstra()
  showToast('Vía eliminada', 'success')
  saveGeoJSON() // Autoguardado
}

// Centrar canvas en un nodo específico
const centerOnNode = (nodeId) => {
  const node = nodes.value.find(n => n.id === nodeId)
  if (node && canvasRef.value) {
    canvasRef.value.centerOnCoordinates(node.x, node.y)
    selectNode(node)
  }
}

const handleZoomReset = () => {}

const addNodeByCoordinates = () => {
  openAddNodeModal()
}

// --- DIJKSTRA (RUTA MÁS CORTA) ---
const calculateDistance = (node1, node2) => {
  // Usar coordenadas geográficas reales para la distancia
  const [lng1, lat1] = unproject(node1.x, node1.y)
  const [lng2, lat2] = unproject(node2.x, node2.y)
  
  // Fórmula de Haversine
  const R = 6371 // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const calculateDijkstra = () => {
  const startId = dijkstraStartNodeId.value
  const endId = dijkstraEndNodeId.value
  
  if (!startId || !endId) {
    showToast('Selecciona nodo de origen y destino', 'warning')
    return
  }
  
  if (startId === endId) {
    showToast('El origen y el destino son el mismo nodo', 'warning')
    return
  }
  
  // 1. Construir Adjacency List
  const graph = {}
  nodes.value.forEach(n => {
    graph[n.id] = []
  })
  
  edges.value.forEach(e => {
    // Omitir vías cerradas en el ruteo
    if (e.estado === 'cerrada') return

    const s = nodes.value.find(n => n.id === e.source)
    const t = nodes.value.find(n => n.id === e.target)
    if (!s || !t) return
    
    // Usar la longitud real/guardada de la vía, o en su defecto calcular la geodistancia
    const dist = e.longitud !== undefined ? Number(e.longitud) : calculateDistance(s, t)
    
    // Si es doble sentido
    if (e.sentido === 'doble') {
      graph[e.source].push({ node: e.target, dist, edgeId: e.id })
      graph[e.target].push({ node: e.source, dist, edgeId: e.id })
    } else {
      // Sentido único (origen -> destino)
      graph[e.source].push({ node: e.target, dist, edgeId: e.id })
    }
  })
  
  // 2. Ejecutar Algoritmo Dijkstra
  const distances = {}
  const prevNode = {}
  const prevEdge = {}
  const visited = new Set()
  const queue = []
  
  nodes.value.forEach(n => {
    distances[n.id] = Infinity
  })
  distances[startId] = 0
  
  queue.push({ id: startId, dist: 0 })
  
  while (queue.length > 0) {
    // Buscar nodo con distancia mínima en la cola
    queue.sort((a, b) => a.dist - b.dist)
    const current = queue.shift()
    const u = current.id
    
    if (visited.has(u)) continue
    visited.add(u)
    
    if (u === endId) break // Llegamos al destino
    
    const neighbors = graph[u] || []
    neighbors.forEach(neighbor => {
      const v = neighbor.node
      if (!visited.has(v)) {
        const alt = distances[u] + neighbor.dist
        if (alt < distances[v]) {
          distances[v] = alt
          prevNode[v] = u
          prevEdge[v] = neighbor.edgeId
          queue.push({ id: v, dist: alt })
        }
      }
    })
  }
  
  // Si no hay ruta
  if (distances[endId] === Infinity) {
    dijkstraResult.value = null
    showToast('No existe ninguna ruta viable entre los nodos seleccionados', 'danger')
    return
  }
  
  // 3. Reconstruir el Camino
  const pathNodes = []
  const pathEdges = []
  const steps = []
  let curr = endId
  
  while (curr !== startId) {
    const prev = prevNode[curr]
    const edgeId = prevEdge[curr]
    
    pathNodes.unshift(curr)
    pathEdges.unshift(edgeId)
    
    const sNode = nodes.value.find(n => n.id === prev)
    const tNode = nodes.value.find(n => n.id === curr)
    const edge = edges.value.find(e => e.id === edgeId)
    const dist = calculateDistance(sNode, tNode)
    
    steps.unshift({
      from: sNode.nombre,
      to: tNode.nombre,
      distance: dist.toFixed(2),
      type: edge.calzada === 'doble' ? 'Doble calzada' : 'Calzada sencilla'
    })
    
    curr = prev
  }
  pathNodes.unshift(startId) // Añadir origen
  
  dijkstraResult.value = {
    nodeIds: pathNodes,
    edgeIds: pathEdges,
    totalDistance: distances[endId].toFixed(2),
    steps
  }
  
  showToast(`Ruta calculada: ${distances[endId].toFixed(2)} km`, 'success')
}

const clearDijkstra = () => {
  dijkstraResult.value = null
  dijkstraStartNodeId.value = ''
  dijkstraEndNodeId.value = ''
}

// --- UTILS ---
const showToast = (message, type = 'info') => {
  toast.message = message
  toast.type = type
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 4000)
}

const saveButtonText = computed(() => {
  if (saving.value) return 'Guardando...'
  if (savedStatus.value === 'modified') return 'Guardar Cambios'
  return 'Guardado'
})

// Teclas rápidas
const handleKeyDown = (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    undo()
    return
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    redo()
    return
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'g') {
    e.preventDefault()
    saveGeoJSON()
    return
  }

  // No activar atajos de modo si el foco está en un campo de texto
  const tag = e.target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return

  if (e.key === 'Escape') {
    e.preventDefault()
    clearSelection()
    setMode('select')
  }
  if (e.key.toLowerCase() === 'r') {
    e.preventDefault()
    setMode('add-edge')
  }
  if (e.key.toLowerCase() === 'n') {
    e.preventDefault()
    openAddNodeModal()
  }
}

// --- ON MOUNT ---
onMounted(() => {
  loadGeoJSON()
  window.addEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: hsl(var(--bg-dark));
  overflow: hidden;
  position: relative;
}

/* Header principal */
.main-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 10;
  margin: 0;
  border-radius: 0 !important;
  border-top: none;
  border-left: none;
  border-right: none;
  border-bottom: 1px solid rgba(0, 0, 0, 0.25) !important;
  background: linear-gradient(135deg, #00853F 0%, #005c2b 100%) !important;
  backdrop-filter: none !important;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-emoji {
  font-size: 1.8rem;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
  animation: pulse 2s infinite alternate;
}

.logo-text h1 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #ffffff;
  background: none;
  -webkit-text-fill-color: #ffffff;
}

.logo-text p {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.65);
}

.btn-tool {
  background: transparent;
  color: hsl(var(--text-muted));
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.85rem;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn-tool svg {
  transition: transform 0.2s ease;
}

.btn-tool:hover {
  background: rgba(0, 0, 0, 0.04);
  color: hsl(var(--text-light));
}

.btn-tool:hover svg {
  transform: scale(1.1);
}

.btn-tool.active {
  background: rgba(170, 27, 34, 0.08);
  color: #AA1B22;
  border: 1px solid rgba(170, 27, 34, 0.22);
  box-shadow: 0 4px 12px rgba(170, 27, 34, 0.08);
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-save {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-save.saved {
  background: rgba(170, 27, 34, 0.1);
  color: #AA1B22;
  border: 1px solid rgba(170, 27, 34, 0.25);
  box-shadow: 0 0 10px rgba(170, 27, 34, 0.08);
}

.btn-save.saved:hover {
  background: rgba(170, 27, 34, 0.18);
}

.btn-save.modified {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
  color: white;
  box-shadow: 0 4px 14px rgba(170, 27, 34, 0.35);
}

.btn-save.modified:hover {
  filter: brightness(1.1);
  box-shadow: 0 6px 20px rgba(170, 27, 34, 0.5);
}

.btn-save.saving {
  background: rgba(255, 255, 255, 0.05);
  color: hsl(var(--text-muted));
  border: 1px solid var(--glass-border);
  cursor: not-allowed;
}

/* Área de contenido principal */
.main-content {
  flex: 1;
  display: flex;
  padding: 0;
  gap: 0;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  border: none;
  border-right: 1px solid var(--glass-border);
  box-shadow: none;
}

.sidebar-wrapper {
  width: 400px;
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
}

/* Spinner animado */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Notificación flotante (Toast) */
.toast {
  position: absolute;
  bottom: 24px;
  left: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 2000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  backdrop-filter: blur(8px);
}

.toast.info {
  background: rgba(13, 17, 23, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.toast.success {
  background: rgba(170, 27, 34, 0.92);
  border-color: rgba(229, 80, 80, 0.45);
}

.toast.warning {
  background: rgba(120, 80, 0, 0.92);
  border-color: rgba(245, 166, 35, 0.5);
}

.toast.danger {
  background: rgba(127, 29, 29, 0.9);
  border-color: rgba(239, 68, 68, 0.4);
}

/* Transición Toast */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* FAB Button style */
.add-node-fab {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(170, 27, 34, 0.4);
  border: none;
  cursor: pointer;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0;
}

.add-node-fab:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 6px 20px rgba(170, 27, 34, 0.6);
}

.add-node-fab:active {
  transform: scale(0.95);
}

/* Floating modes overlay (Top Right) */
.modes-overlay {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: row;
  gap: 6px;
  padding: 6px;
  z-index: 100;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.btn-mode-floating {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  color: hsl(var(--text-muted));
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.btn-mode-floating:hover {
  background: rgba(170, 27, 34, 0.08);
  color: #AA1B22;
}

.btn-mode-floating.active {
  background: rgba(170, 27, 34, 0.1);
  color: #AA1B22;
  border: 1px solid rgba(170, 27, 34, 0.2);
}

.btn-mode-floating:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.floating-divider {
  width: 1px;
  height: 20px;
  background: rgba(0, 0, 0, 0.08);
  align-self: center;
  margin: 0 2px;
}

/* Floating search widget (Top Left) */
.search-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 280px;
  z-index: 110;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 2px 8px;
  height: 44px;
}

.search-icon {
  color: hsl(var(--text-muted));
  margin-right: 8px;
  flex-shrink: 0;
}

.search-input-floating {
  border: none;
  background: transparent;
  padding: 8px 0;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
}

.search-input-floating:focus {
  border: none;
  box-shadow: none;
  background: transparent;
}

.btn-clear-search {
  background: transparent;
  border: none;
  color: hsl(var(--text-muted));
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

.btn-clear-search:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1f2937;
}

/* Dropdown list of results */
.search-results-dropdown {
  position: absolute;
  top: 50px;
  left: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-height: 250px;
  overflow-y: auto;
  z-index: 1000;
  padding: 6px 0;
}

.search-result-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-result-item:hover {
  background: rgba(170, 27, 34, 0.07);
}

.result-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.result-dot.municipio {
  background: #AA1B22;
  box-shadow: 0 0 6px rgba(170, 27, 34, 0.6);
}

.result-dot.interseccion {
  background: #F5A623;
  box-shadow: 0 0 6px rgba(245, 166, 35, 0.6);
}

.result-info {
  display: flex;
  flex-direction: column;
}

.result-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2937;
}

.result-type {
  font-size: 0.7rem;
  color: hsl(var(--text-muted));
}

/* Modal Overlay and Content */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  width: 90%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(170, 27, 34, 0.15);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(170, 27, 34, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1f2937;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: hsl(var(--text-muted));
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.btn-close-modal:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1f2937;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-input, .modal-select {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #1f2937;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  width: 100%;
}

.modal-input:focus, .modal-select:focus {
  outline: none;
  border-color: rgba(170, 27, 34, 0.5);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(170, 27, 34, 0.15);
}

.input-help {
  font-size: 0.75rem;
  color: hsl(var(--text-muted));
  margin-top: 4px;
  display: block;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

/* Transición del Modal */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-content {
  transform: scale(0.9) translateY(20px);
}
.modal-fade-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  from { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3)); }
  to { filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.65)); }
}
</style>

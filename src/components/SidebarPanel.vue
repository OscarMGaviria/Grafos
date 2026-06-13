<template>
  <div class="sidebar glass">
    <!-- Navegación de Pestañas -->
    <div class="tabs">
      <button :class="['tab-btn', { active: activeTab === 'properties' }]" @click="activeTab = 'properties'" title="Editor de Propiedades">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        <span>Propiedades</span>
      </button>

      <button :class="['tab-btn', { active: activeTab === 'dijkstra' }]" @click="activeTab = 'dijkstra'" title="Calcular Ruta Óptima">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          <path d="M7 12h10M14 8l5 4-5 4"/>
        </svg>
        <span>Ruta</span>
      </button>
      <button :class="['tab-btn', { active: activeTab === 'metrics' }]" @click="activeTab = 'metrics'" title="Métricas de la Red">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        <span>Métricas</span>
      </button>
    </div>

    <!-- Contenido de las pestañas -->
    <div class="tab-content">
      
      <!-- PESTAÑA 1: PROPIEDADES (CRUD) -->
      <div v-if="activeTab === 'properties'" class="panel-section">
        <h2 class="section-title">Editor de Propiedades</h2>
        
        <!-- Estado Vacío -->
        <div v-if="!selectedElement" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="muted-icon"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <p>Selecciona un nodo o vía en el lienzo para ver y editar sus propiedades.</p>
        </div>

        <!-- Edición de Nodo -->
        <div v-else-if="selectedElementType === 'node'" class="props-editor">
          <div class="badge node-badge" :class="selectedElement.tipo">
            {{ selectedElement.tipo === 'municipio' ? 'Municipio' : 'Intersección' }}
          </div>

          <div class="props-table">
            <div class="prop-row">
              <span class="prop-label">ID</span>
              <div class="prop-value"><input type="text" :value="selectedElement.id" readonly class="readonly-input" /></div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Nombre</span>
              <div class="prop-value"><input type="text" v-model="nodeName" @input="handleNodeUpdate" placeholder="Ej. Medellín" /></div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Tipo</span>
              <div class="prop-value">
                <select v-model="nodeTipo" @change="handleNodeUpdate">
                  <option value="municipio">Municipio</option>
                  <option value="interseccion">Intersección</option>
                </select>
              </div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Coords</span>
              <div class="prop-value">
                <input id="sidebar-node-coords" type="text" v-model="nodeCoords" @change="handleNodeUpdate" placeholder="6.2482, -75.5800" />
              </div>
              <span class="prop-unit">lat,lng</span>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-danger" @click="$emit('delete-node', selectedElement.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              <span>Eliminar Nodo</span>
            </button>
          </div>
        </div>

        <!-- Edición de Vía (Edge) -->
        <div v-else-if="selectedElementType === 'edge'" class="props-editor">
          <div class="badge edge-badge">Vía de Conexión</div>

          <div class="props-table">
            <div class="prop-row">
              <span class="prop-label">ID</span>
              <div class="prop-value"><input type="text" :value="selectedElement.id" readonly class="readonly-input" /></div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Origen</span>
              <div class="prop-value prop-display">{{ getNodeName(selectedElement.source) }}</div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Destino</span>
              <div class="prop-value prop-display">{{ getNodeName(selectedElement.target) }}</div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Nombre</span>
              <div class="prop-value"><input type="text" v-model="edgeNombre" @input="handleEdgeUpdate" placeholder="Ej. Troncal del Caribe" /></div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Sentido</span>
              <div class="prop-value">
                <select v-model="edgeSentido" @change="handleEdgeUpdate">
                  <option value="doble">Doble ⇌</option>
                  <option value="un-sentido">Único →</option>
                </select>
              </div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Calzada</span>
              <div class="prop-value">
                <select v-model="edgeCalzada" @change="handleEdgeUpdate">
                  <option value="sencilla">Sencilla</option>
                  <option value="doble">Doble</option>
                </select>
              </div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Rodadura</span>
              <div class="prop-value"><input type="text" v-model="edgeCapaRodadura" @input="handleEdgeUpdate" /></div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Longitud</span>
              <div class="prop-value"><input type="number" v-model.number="edgeLongitud" step="0.01" min="0" @input="handleEdgeUpdate" /></div>
              <span class="prop-unit">km</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Estado</span>
              <div class="prop-value">
                <select v-model="edgeEstado" @change="handleEdgeUpdate">
                  <option value="abierta">Abierta</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>
              <span class="prop-unit">—</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Precipit.</span>
              <div class="prop-value"><input type="number" v-model.number="edgePrecipitacion" min="0" @input="handleEdgeUpdate" /></div>
              <span class="prop-unit">mm/h</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">P. Críticos</span>
              <div class="prop-value"><input type="number" v-model.number="edgePuntosCriticos" min="0" step="1" @input="handleEdgeUpdate" /></div>
              <span class="prop-unit">uds</span>
            </div>
            <div class="prop-row">
              <span class="prop-label">Pendiente</span>
              <div class="prop-value"><input type="number" v-model.number="edgePendiente" step="0.1" @input="handleEdgeUpdate" /></div>
              <span class="prop-unit">%</span>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn-danger" @click="$emit('delete-edge', selectedElement.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              <span>Eliminar Vía</span>
            </button>
          </div>
        </div>

      </div>



      <!-- PESTAÑA 3: RUTA MÁS CORTA (DIJKSTRA) -->
      <div v-if="activeTab === 'dijkstra'" class="panel-section">
        <h2 class="section-title">Cálculo de Ruta Óptima</h2>
        <p class="section-desc">Encuentra el camino más rápido entre municipios utilizando el algoritmo de Dijkstra basado en kilómetros viales reales.</p>

        <div class="dijkstra-form">
          <!-- Nodo de Origen Autocomplete -->
          <div class="input-item autocomplete-container">
            <label>Nodo de Origen</label>
            <div class="search-input-wrapper">
              <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                type="text" 
                v-model="startSearchQuery" 
                placeholder="Escribe para buscar origen..." 
                class="search-input-floating"
                @focus="startSearchFocused = true"
                @blur="handleStartBlur"
              />
              <button v-if="startSearchQuery" class="btn-clear-search" @click="clearStartNode" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <!-- Resultados Autocomplete -->
            <div v-if="startSearchFocused && filteredStartNodes.length > 0" class="autocomplete-dropdown glass">
              <div 
                v-for="node in filteredStartNodes" 
                :key="node.id" 
                class="autocomplete-item"
                @mousedown="selectStartNode(node)"
              >
                <span class="result-dot" :class="node.tipo"></span>
                <div class="result-info">
                  <span class="result-name">{{ node.nombre }}</span>
                  <span class="result-type">{{ node.tipo === 'municipio' ? 'Municipio' : 'Intersección' }}</span>
                </div>
              </div>
            </div>

            <!-- Zona de Soltar (Drop Zone Overlay) -->
            <div 
              v-if="activeDragNode" 
              class="drop-zone-overlay glass" 
              @mouseup.stop="handleDropNode('start')"
            >
              <div class="drop-zone-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="2"/></svg>
                <span>Soltar como Origen</span>
              </div>
            </div>
          </div>

          <!-- Nodo de Destino Autocomplete -->
          <div class="input-item autocomplete-container">
            <label>Nodo de Destino</label>
            <div class="search-input-wrapper">
              <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input 
                type="text" 
                v-model="endSearchQuery" 
                placeholder="Escribe para buscar destino..." 
                class="search-input-floating"
                @focus="endSearchFocused = true"
                @blur="handleEndBlur"
              />
              <button v-if="endSearchQuery" class="btn-clear-search" @click="clearEndNode" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <!-- Resultados Autocomplete -->
            <div v-if="endSearchFocused && filteredEndNodes.length > 0" class="autocomplete-dropdown glass">
              <div 
                v-for="node in filteredEndNodes" 
                :key="node.id" 
                class="autocomplete-item"
                @mousedown="selectEndNode(node)"
              >
                <span class="result-dot" :class="node.tipo"></span>
                <div class="result-info">
                  <span class="result-name">{{ node.nombre }}</span>
                  <span class="result-type">{{ node.tipo === 'municipio' ? 'Municipio' : 'Intersección' }}</span>
                </div>
              </div>
            </div>

            <!-- Zona de Soltar (Drop Zone Overlay) -->
            <div 
              v-if="activeDragNode" 
              class="drop-zone-overlay glass" 
              @mouseup.stop="handleDropNode('end')"
            >
              <div class="drop-zone-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="2"/></svg>
                <span>Soltar como Destino</span>
              </div>
            </div>
          </div>

          <div class="dijkstra-actions">
            <button class="btn-primary" @click="$emit('calculate-dijkstra')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              <span>Calcular Ruta</span>
            </button>
            <button class="btn-secondary" @click="$emit('clear-dijkstra')">
              Limpiar
            </button>
          </div>
        </div>

        <!-- Resultados Dijkstra -->
        <div v-if="dijkstraResult" class="dijkstra-results">
          <div class="result-summary glass glow-primary">
            <div class="summary-label">Distancia Total</div>
            <div class="summary-value">{{ dijkstraResult.totalDistance }} <span class="unit">km</span></div>
          </div>

          <div class="route-steps">
            <div class="steps-title">Detalle de la Ruta</div>
            <div class="steps-timeline">
              <div v-for="(step, idx) in dijkstraResult.steps" :key="idx" class="timeline-item">
                <div class="timeline-bullet"></div>
                <div class="timeline-body">
                  <div class="step-nodes">
                    <span class="step-node-name">{{ step.from }}</span>
                    <span class="step-arrow">→</span>
                    <span class="step-node-name">{{ step.to }}</span>
                  </div>
                  <div class="step-meta">
                    <span>{{ step.distance }} km</span>
                    <span class="meta-dot">•</span>
                    <span>{{ step.type }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 4: ESTADÍSTICAS Y MÉTRICAS -->
      <div v-if="activeTab === 'metrics'" class="panel-section">
        <h2 class="section-title">Métricas de la Red Vial</h2>
        
        <div class="metrics-grid">
          <div class="metric-card glass">
            <div class="metric-val">{{ nodes.length }}</div>
            <div class="metric-lbl">Nodos Totales</div>
          </div>
          <div class="metric-card glass">
            <div class="metric-val">{{ edges.length }}</div>
            <div class="metric-lbl">Vías de Conexión</div>
          </div>
          <div class="metric-card glass">
            <div class="metric-val">{{ countNodesByType('municipio') }}</div>
            <div class="metric-lbl">Municipios</div>
          </div>
          <div class="metric-card glass">
            <div class="metric-val">{{ countNodesByType('interseccion') }}</div>
            <div class="metric-lbl">Intersecciones</div>
          </div>
        </div>

        <div class="metric-details glass">
          <div class="detail-row">
            <span class="lbl">Extensión de Red Vial:</span>
            <span class="val">{{ totalRoadLength }} km</span>
          </div>
          <div class="detail-row">
            <span class="lbl">Grado Promedio (Conectividad):</span>
            <span class="val">{{ averageDegree }}</span>
          </div>
          <div class="detail-row">
            <span class="lbl">Componentes Conectados:</span>
            <span class="val">{{ connectedComponentsCount }}</span>
          </div>
        </div>

        <!-- Índices topológicos -->
        <div class="indices-title">Índices Topológicos de Conectividad</div>

        <div class="index-card glass">
          <div class="index-header">
            <span class="index-name">Índice β</span>
            <span class="index-formula">β = a / n</span>
          </div>
          <div class="index-value">{{ betaIndex }}</div>
          <div class="index-label" :class="betaLabelClass">{{ betaLabel }}</div>
          <div class="index-scale">
            <span :class="{ active: betaIndex !== '—' && +betaIndex < 1 }">Inconexa &lt;1</span>
            <span :class="{ active: betaIndex !== '—' && +betaIndex >= 1 && +betaIndex < 3 }">Compleja 1–3</span>
            <span :class="{ active: betaIndex !== '—' && +betaIndex >= 3 }">Muy compleja ≥3</span>
          </div>
          <p class="index-desc">Mide el grado de conexión de la red comparando el número de arcos con el número de nodos. Un valor bajo indica que la red carece de circuitos alternativos y es vulnerable ante el corte de cualquier vía.</p>
        </div>

        <div class="index-card glass">
          <div class="index-header">
            <span class="index-name">Índice γ</span>
            <span class="index-formula">γ = a / [3(n−2)] × 100</span>
          </div>
          <div class="index-value">{{ gammaIndex }}<span class="index-unit" v-if="gammaIndex !== '—'">%</span></div>
          <div class="index-label">{{ gammaLabel }}</div>
          <div class="index-bar" v-if="gammaIndex !== '—'">
            <div class="index-bar-fill" :style="{ width: Math.min(+gammaIndex, 100) + '%' }"></div>
          </div>
          <p class="index-desc">Expresa qué porcentaje de arcos existen respecto al máximo teórico posible. Indica cuánta conectividad adicional requiere la red para alcanzar su potencial estructural completo.</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  selectedElement: { type: Object, default: null },
  selectedElementType: { type: String, default: null },
  dijkstraResult: { type: Object, default: null },
  startNodeId: { type: String, default: '' },
  endNodeId: { type: String, default: '' },
  activeDragNode: { type: Object, default: null },
  mapBounds: {
    type: Object,
    default: () => ({ minLng: -76.8, maxLng: -74.5, minLat: 5.5, maxLat: 8.9 })
  }
})

const emit = defineEmits([
  'update-node', 'update-edge', 'delete-node', 'delete-edge', 
  'calculate-dijkstra', 'clear-dijkstra', 'center-on-node',
  'update:startNodeId', 'update:endNodeId'
])

// --- TABS ---
const activeTab = ref('properties')

// Cambiar de pestaña automáticamente si el usuario selecciona un elemento (observación profunda)
watch(() => props.selectedElement, (newVal) => {
  if (newVal) {
    activeTab.value = 'properties'
    if (document.activeElement?.id !== 'sidebar-node-coords') {
      loadElementProps(newVal)
    } else {
      // Si el input de coordenadas está enfocado, actualizamos solo los demás datos
      nodeName.value = newVal.nombre || ''
      nodeTipo.value = newVal.tipo || 'municipio'
    }
  }
}, { deep: true })

// --- FORMULARIO DE EDICIÓN ---
const nodeName = ref('')
const nodeTipo = ref('municipio')
const nodeCoords = ref('')

const edgeSentido = ref('doble')
const edgeCalzada = ref('sencilla')
const edgeTipo = ref('via')
const edgeNombre = ref('Vía sin nombre')
const edgeCapaRodadura = ref('pavimentada')
const edgeLongitud = ref(0)
const edgeEstado = ref('abierta')
const edgePrecipitacion = ref(0)
const edgePuntosCriticos = ref(0)
const edgePendiente = ref(0)

// --- AUTOCOMPLETADO DE RUTA (DIJKSTRA) ---
const startSearchQuery = ref('')
const startSearchFocused = ref(false)
const endSearchQuery = ref('')
const endSearchFocused = ref(false)

// Sincronizar inputs de texto con los IDs seleccionados
watch(() => props.startNodeId, (newId) => {
  const node = props.nodes.find(n => n.id === newId)
  startSearchQuery.value = node ? node.nombre : ''
}, { immediate: true })

watch(() => props.endNodeId, (newId) => {
  const node = props.nodes.find(n => n.id === newId)
  endSearchQuery.value = node ? node.nombre : ''
}, { immediate: true })

// Filtrar municipios e intersecciones para Origen
const filteredStartNodes = computed(() => {
  const q = startSearchQuery.value.toLowerCase().trim()
  if (!q) {
    // Mostrar por defecto los primeros 5 municipios
    return props.nodes.filter(n => n.tipo === 'municipio').slice(0, 5)
  }
  return props.nodes.filter(n => 
    n.nombre.toLowerCase().includes(q)
  ).slice(0, 8)
})

// Filtrar municipios e intersecciones para Destino
const filteredEndNodes = computed(() => {
  const q = endSearchQuery.value.toLowerCase().trim()
  if (!q) {
    // Mostrar por defecto los primeros 5 municipios
    return props.nodes.filter(n => n.tipo === 'municipio').slice(0, 5)
  }
  return props.nodes.filter(n => 
    n.nombre.toLowerCase().includes(q)
  ).slice(0, 8)
})

const selectStartNode = (node) => {
  emit('update:startNodeId', node.id)
  startSearchQuery.value = node.nombre
  startSearchFocused.value = false
}

const selectEndNode = (node) => {
  emit('update:endNodeId', node.id)
  endSearchQuery.value = node.nombre
  endSearchFocused.value = false
}

const clearStartNode = () => {
  emit('update:startNodeId', '')
  startSearchQuery.value = ''
  startSearchFocused.value = false
}

const clearEndNode = () => {
  emit('update:endNodeId', '')
  endSearchQuery.value = ''
  endSearchFocused.value = false
}

const handleStartBlur = () => {
  setTimeout(() => {
    startSearchFocused.value = false
  }, 180)
}

const handleEndBlur = () => {
  setTimeout(() => {
    endSearchFocused.value = false
  }, 180)
}

const handleDropNode = (role) => {
  if (props.activeDragNode) {
    if (role === 'start') {
      emit('update:startNodeId', props.activeDragNode.id)
      startSearchFocused.value = false
    } else if (role === 'end') {
      emit('update:endNodeId', props.activeDragNode.id)
      endSearchFocused.value = false
    }
    // Quitar el foco de cualquier input activo
    if (document.activeElement) {
      document.activeElement.blur()
    }
  }
}

const loadElementProps = (element) => {
  if (!element) return
  if (props.selectedElementType === 'node') {
    nodeName.value = element.nombre || ''
    nodeTipo.value = element.tipo || 'municipio'
    
    // Convertir SVG x, y a coordenadas geográficas Lat, Lng
    const [lng, lat] = unproject(element.x, element.y)
    nodeCoords.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } else if (props.selectedElementType === 'edge') {
    edgeSentido.value = element.sentido || 'doble'
    edgeCalzada.value = element.calzada || 'sencilla'
    edgeTipo.value = element.tipo || 'via'
    edgeNombre.value = element.nombre || 'Vía sin nombre'
    edgeCapaRodadura.value = element.capa_rodadura || 'pavimentada'
    edgeLongitud.value = element.longitud !== undefined ? element.longitud : 0
    edgeEstado.value = element.estado || 'abierta'
    edgePrecipitacion.value = element.precipitacion !== undefined ? element.precipitacion : 0
    edgePuntosCriticos.value = element.puntos_criticos !== undefined ? element.puntos_criticos : 0
    edgePendiente.value = element.pendiente !== undefined ? element.pendiente : 0
  }
}

const handleNodeUpdate = () => {
  if (!props.selectedElement) return
  
  let x = props.selectedElement.x
  let y = props.selectedElement.y
  
  const coordsStr = nodeCoords.value.trim()
  if (coordsStr) {
    const parts = coordsStr.split(',')
    if (parts.length === 2) {
      const lat = parseFloat(parts[0].trim())
      const lng = parseFloat(parts[1].trim())
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        const projected = project(lng, lat)
        x = projected.x
        y = projected.y
      } else {
        // Revertir a la posición previa si son números inválidos
        const [lngPrev, latPrev] = unproject(props.selectedElement.x, props.selectedElement.y)
        nodeCoords.value = `${latPrev.toFixed(6)}, ${lngPrev.toFixed(6)}`
        return
      }
    } else {
      // Revertir a la posición previa si faltan comas
      const [lngPrev, latPrev] = unproject(props.selectedElement.x, props.selectedElement.y)
      nodeCoords.value = `${latPrev.toFixed(6)}, ${lngPrev.toFixed(6)}`
      return
    }
  }
  
  emit('update-node', {
    id: props.selectedElement.id,
    nombre: nodeName.value,
    tipo: nodeTipo.value,
    x,
    y
  })
}

const handleEdgeUpdate = () => {
  if (!props.selectedElement) return
  emit('update-edge', {
    id: props.selectedElement.id,
    sentido: edgeSentido.value,
    calzada: edgeCalzada.value,
    tipo: edgeTipo.value,
    nombre: edgeNombre.value,
    capa_rodadura: edgeCapaRodadura.value,
    longitud: edgeLongitud.value !== '' ? Number(edgeLongitud.value) : 0,
    estado: edgeEstado.value,
    precipitacion: edgePrecipitacion.value !== '' ? Number(edgePrecipitacion.value) : 0,
    puntos_criticos: edgePuntosCriticos.value !== '' ? Number(edgePuntosCriticos.value) : 0,
    pendiente: edgePendiente.value !== '' ? Number(edgePendiente.value) : 0
  })
}

// Helpers para nombres de nodos conexos
const getNodeName = (nodeId) => {
  const node = props.nodes.find(n => n.id === nodeId)
  return node ? node.nombre : nodeId
}



// --- NODO ORDENADO PARA DIJKSTRA ---
const sortedNodes = computed(() => {
  return [...props.nodes].sort((a, b) => {
    // Municipios arriba, luego alfabéticamente
    if (a.tipo !== b.tipo) {
      return a.tipo === 'municipio' ? -1 : 1
    }
    return a.nombre.localeCompare(b.nombre)
  })
})

// --- CÁLCULO DE MÉTRICAS ---
const countNodesByType = (type) => {
  return props.nodes.filter(n => n.tipo === type).length
}

const width = 3000
const height = 3000
const margin = 200

const project = (lng, lat) => {
  const { minLng, maxLng, minLat, maxLat } = props.mapBounds
  const x = margin + ((lng - minLng) / (maxLng - minLng)) * (width - 2 * margin)
  const y = height - margin - ((lat - minLat) / (maxLat - minLat)) * (height - 2 * margin)
  return { x, y }
}

const unproject = (x, y) => {
  const { minLng, maxLng, minLat, maxLat } = props.mapBounds
  const lng = minLng + ((x - margin) / (width - 2 * margin)) * (maxLng - minLng)
  const lat = minLat + (((height - margin) - y) / (height - 2 * margin)) * (maxLat - minLat)
  return [lng, lat]
}

const calculateDistance = (node1, node2) => {
  const [lng1, lat1] = unproject(node1.x, node1.y)
  const [lng2, lat2] = unproject(node2.x, node2.y)
  
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const totalRoadLength = computed(() => {
  let len = 0
  props.edges.forEach(e => {
    const s = props.nodes.find(n => n.id === e.source)
    const t = props.nodes.find(n => n.id === e.target)
    if (s && t) {
      len += calculateDistance(s, t)
    }
  })
  return len.toFixed(1)
})

const averageDegree = computed(() => {
  if (props.nodes.length === 0) return '0.00'
  // El grado es el número de conexiones por nodo.
  // Cada vía de doble sentido cuenta como 2 conexiones totales (1 por extremo), 
  // cada vía de sentido único cuenta como 2 conexiones totales (1 entrante, 1 saliente).
  // Total de grados = 2 * número de vías
  const totalDegree = 2 * props.edges.length
  return (totalDegree / props.nodes.length).toFixed(2)
})

// Algoritmo BFS para encontrar componentes conectados
const connectedComponentsCount = computed(() => {
  if (props.nodes.length === 0) return 0
  
  const adjacencyList = {}
  props.nodes.forEach(n => {
    adjacencyList[n.id] = []
  })
  
  props.edges.forEach(e => {
    if (adjacencyList[e.source] && adjacencyList[e.target]) {
      adjacencyList[e.source].push(e.target)
      adjacencyList[e.target].push(e.source)
    }
  })
  
  const visited = new Set()
  let count = 0
  
  props.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      count++
      // Recorrido BFS
      const queue = [node.id]
      visited.add(node.id)
      
      while (queue.length > 0) {
        const curr = queue.shift()
        const neighbors = adjacencyList[curr] || []
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        })
      }
    }
  })
  
  return count
})

// Índice β = a / n  (Cardozo et al., 2009)
const betaIndex = computed(() => {
  const n = props.nodes.length
  if (n === 0) return '—'
  return (props.edges.length / n).toFixed(3)
})

const betaLabel = computed(() => {
  const n = props.nodes.length
  if (n === 0) return ''
  const b = props.edges.length / n
  if (b < 1)  return 'Red inconexa'
  if (b === 1) return 'Un circuito'
  if (b < 3)  return 'Red compleja'
  return 'Red muy compleja'
})

const betaLabelClass = computed(() => {
  const b = parseFloat(betaIndex.value)
  if (isNaN(b)) return ''
  if (b < 1)  return 'label-low'
  if (b < 3)  return 'label-mid'
  return 'label-high'
})

// Índice γ = a / [3(n − 2)] × 100  (Bautista, 2018)
const gammaIndex = computed(() => {
  const n = props.nodes.length
  if (n <= 2) return '—'
  const maxArcs = 3 * (n - 2)
  return ((props.edges.length / maxArcs) * 100).toFixed(1)
})

const gammaLabel = computed(() => {
  const n = props.nodes.length
  if (n <= 2) return ''
  const g = (props.edges.length / (3 * (n - 2))) * 100
  if (g < 30)  return 'Muy baja conectividad'
  if (g < 55)  return 'Baja conectividad'
  if (g < 75)  return 'Conectividad media'
  return 'Alta conectividad'
})
</script>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0 !important;
  border: none;
}

/* Tabs */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.03);
}

.tab-btn {
  flex: 1;
  background: transparent;
  color: hsl(var(--text-muted));
  padding: 12px 4px;
  border-radius: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  gap: 5px;
  flex-direction: column;
}

.tab-btn:hover {
  color: hsl(var(--text-light));
  background: rgba(0, 0, 0, 0.02);
}

.tab-btn.active {
  color: #00853F;
  border-bottom-color: #00853F;
  background: rgba(0, 133, 63, 0.06);
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.section-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 6px;
}

.section-desc {
  font-size: 0.8rem;
  color: hsl(var(--text-muted));
  line-height: 1.4;
  margin-bottom: 20px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 20px;
  color: hsl(var(--text-muted));
  flex: 1;
}

.muted-icon {
  margin-bottom: 16px;
  opacity: 0.4;
  color: hsl(var(--text-muted));
}

.empty-state p {
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Editor de propiedades en tabla */
.props-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.badge {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid transparent;
}

.node-badge.municipio {
  background: rgba(0, 133, 63, 0.1);
  color: #005c2b;
  border-color: rgba(0, 133, 63, 0.25);
}

.node-badge.interseccion {
  background: rgba(245, 166, 35, 0.12);
  color: #b07000;
  border-color: rgba(245, 166, 35, 0.3);
}

.edge-badge {
  background: rgba(0, 133, 63, 0.1);
  color: #005c2b;
  border-color: rgba(0, 133, 63, 0.25);
}

/* Tabla de propiedades */
.props-table {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.prop-row {
  display: grid;
  grid-template-columns: 82px 1fr 44px;
  align-items: stretch;
  min-height: 32px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.prop-row:last-child {
  border-bottom: none;
}

.prop-row:nth-child(even) {
  background: rgba(0, 0, 0, 0.015);
}

.prop-label {
  padding: 0 8px;
  font-size: 0.68rem;
  font-weight: 600;
  color: hsl(var(--text-muted));
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: rgba(0, 0, 0, 0.025);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.prop-value {
  display: flex;
  align-items: stretch;
  min-width: 0;
}

.prop-value input,
.prop-value select {
  width: 100%;
  border: none;
  background: transparent;
  padding: 5px 8px;
  font-size: 0.8rem;
  border-radius: 0;
  color: #1f2937;
  box-shadow: none;
  min-height: 32px;
}

.prop-value input:focus,
.prop-value select:focus {
  outline: none;
  background: rgba(0, 133, 63, 0.04);
  box-shadow: inset 2px 0 0 #00853F;
}

.prop-value input.readonly-input {
  color: hsl(var(--text-muted));
  cursor: not-allowed;
  font-size: 0.72rem;
}

.prop-display {
  padding: 5px 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop-unit {
  padding: 0 6px;
  font-size: 0.67rem;
  color: hsl(var(--text-muted));
  background: rgba(0, 0, 0, 0.02);
  border-left: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-weight: 500;
}

.readonly-input {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
  color: hsl(var(--text-muted));
  cursor: not-allowed;
}

.form-actions {
  margin-top: 4px;
}

.form-actions button {
  width: 100%;
}

/* Buscador */
.search-box {
  margin-bottom: 16px;
}

.search-input {
  padding-left: 14px;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: calc(100vh - 260px);
  padding-right: 2px;
}

.list-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.list-item:hover {
  background: rgba(170, 27, 34, 0.07);
  border-color: rgba(170, 27, 34, 0.2);
  transform: translateX(3px);
}

.list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
}

.list-dot.municipio    { background: #AA1B22; box-shadow: 0 0 6px rgba(170,27,34,0.6); }
.list-dot.interseccion { background: #F5A623; box-shadow: 0 0 6px rgba(245,166,35,0.6); }

.list-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.list-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2937;
}

.list-type {
  font-size: 0.7rem;
  color: hsl(var(--text-muted));
}

.arrow-icon {
  color: hsl(var(--text-muted));
  opacity: 0;
  transition: opacity 0.2s ease;
}

.list-item:hover .arrow-icon {
  opacity: 1;
}

.empty-list {
  text-align: center;
  font-size: 0.8rem;
  color: hsl(var(--text-muted));
  padding: 20px;
}

/* Dijkstra pestaña */
.dijkstra-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.dijkstra-actions {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
}

.dijkstra-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: rgba(170, 27, 34, 0.08);
  border-color: rgba(170, 27, 34, 0.2);
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #AA1B22;
  margin-bottom: 4px;
}

.summary-value {
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 800;
  color: #1f2937;
}

.summary-value .unit {
  font-size: 1rem;
  font-weight: 500;
  color: #AA1B22;
}

.route-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.steps-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: hsl(var(--text-muted));
}

.steps-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 14px;
  border-left: 2px dashed rgba(170, 27, 34, 0.3);
  max-height: calc(100vh - 460px);
  overflow-y: auto;
}

.timeline-item {
  position: relative;
  padding-bottom: 16px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-bullet {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #AA1B22;
  border: 2px solid #ffffff;
  box-shadow: 0 0 6px rgba(170, 27, 34, 0.5);
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-nodes {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
}

.step-arrow {
  color: #AA1B22;
}

.step-meta {
  font-size: 0.7rem;
  color: hsl(var(--text-muted));
  display: flex;
  gap: 6px;
  align-items: center;
}

.meta-dot {
  font-size: 8px;
}

/* Métricas pestaña */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: 10px;
  align-items: center;
  background: rgba(0, 0, 0, 0.02);
}

.metric-val {
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.metric-lbl {
  font-size: 0.7rem;
  color: hsl(var(--text-muted));
  margin-top: 4px;
  text-align: center;
}

.metric-details {
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.03);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.detail-row .lbl {
  color: hsl(var(--text-muted));
}

.detail-row .val {
  font-weight: 600;
  color: #1f2937;
}

/* Índices topológicos */
.indices-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: hsl(var(--text-muted));
  margin-top: 16px;
  margin-bottom: 8px;
}

.index-card {
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.02);
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.index-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.index-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #1f2937;
}

.index-formula {
  font-size: 0.68rem;
  color: hsl(var(--text-muted));
  font-style: italic;
}

.index-value {
  font-family: 'Outfit', sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: #00853F;
  line-height: 1;
}

.index-unit {
  font-size: 1rem;
  font-weight: 500;
  color: hsl(var(--text-muted));
  margin-left: 2px;
}

.index-label {
  font-size: 0.72rem;
  font-weight: 600;
}

.label-low  { color: #c0392b; }
.label-mid  { color: #e67e22; }
.label-high { color: #00853F; }
.index-label:not(.label-low):not(.label-mid):not(.label-high) { color: hsl(var(--text-muted)); }

.index-scale {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}

.index-scale span {
  font-size: 0.62rem;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(0,0,0,0.05);
  color: hsl(var(--text-muted));
  border: 1px solid transparent;
}

.index-scale span.active {
  background: rgba(0, 133, 63, 0.1);
  color: #00853F;
  border-color: rgba(0, 133, 63, 0.25);
  font-weight: 700;
}

.index-bar {
  height: 6px;
  background: rgba(0,0,0,0.07);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 2px;
}

.index-bar-fill {
  height: 100%;
  background: linear-gradient(to right, #00853F, #00B259);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.index-desc {
  font-size: 0.7rem;
  color: hsl(var(--text-muted));
  line-height: 1.45;
  margin-top: 4px;
  border-top: 1px solid rgba(0,0,0,0.05);
  padding-top: 6px;
}

/* Autocompletado y Drop Zones */
.autocomplete-container {
  position: relative;
  width: 100%;
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(0, 133, 63, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  max-height: 180px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 4px;
  padding: 4px 0;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.autocomplete-item:hover {
  background: rgba(0, 133, 63, 0.07);
}

.drop-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 133, 63, 0.07);
  border: 1.8px dashed #00853F;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  cursor: copy;
  animation: drop-pulse-border 1.5s infinite alternate;
}

.drop-zone-overlay:hover {
  background: rgba(0, 133, 63, 0.14);
  border-color: #00B259;
}

.drop-zone-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #005c2b;
  font-size: 0.78rem;
  font-weight: 700;
}

@keyframes drop-pulse-border {
  from {
    border-color: rgba(0, 133, 63, 0.6);
    background: rgba(0, 133, 63, 0.04);
  }
  to {
    border-color: rgba(0, 133, 63, 1);
    background: rgba(0, 133, 63, 0.12);
  }
}
</style>

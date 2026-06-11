<template>
  <div
    class="canvas-container grid-bg"
    :class="{ 'mode-add-node': props.activeMode === 'add-node' && !props.is3d, 'mode-add-edge': props.activeMode === 'add-edge' && !props.is3d }"
    ref="containerRef"
    @mousedown="handleContainerMouseDown"
    @wheel="handleWheel"
    @contextmenu.prevent
  >
    <!-- Barra de estado inferior del canvas -->
    <div class="canvas-statusbar glass">
      <span>Zoom: {{ Math.round(zoom * 100) }}%</span>
      <div class="nav-divider"></div>
      <span>{{ props.nodes.length }} nodos</span>
      <div class="nav-divider"></div>
      <span>{{ props.edges.length }} vías</span>
      <div class="nav-divider" v-if="props.dijkstraResult"></div>
      <span v-if="props.dijkstraResult" class="statusbar-route">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12H2M12 19l7-7-7-7"/></svg>
        Ruta: {{ props.dijkstraResult.totalDistance }} km
      </span>
    </div>

    <!-- Lienzo SVG -->
    <svg 
      class="graph-svg" 
      width="100%" 
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Definición de marcadores para flechas de sentido único y filtros de brillo -->
      <defs>
        <!-- Gradientes solo para estado seleccionado (efecto brillante) -->
        <radialGradient id="sel-municipio" cx="32%" cy="28%" r="68%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="45%"  stop-color="#00C965"/>
          <stop offset="100%" stop-color="#003d1f"/>
        </radialGradient>
        <radialGradient id="sel-interseccion" cx="32%" cy="28%" r="68%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="45%"  stop-color="#FFE054"/>
          <stop offset="100%" stop-color="#7a4e00"/>
        </radialGradient>

        <!-- Patrón de cuadrícula de puntos para el fondo -->
        <pattern id="grid-dots" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
          <circle cx="25" cy="25" r="1.2" fill="rgba(0,0,0,0.07)"/>
        </pattern>

        <!-- Flecha estándar para un sentido -->
        <marker 
          id="arrow" 
          viewBox="0 0 10 10" 
          refX="22" 
          refY="5" 
          markerWidth="6" 
          markerHeight="6" 
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#00853F" />
        </marker>

        <!-- Flecha para la ruta resaltada de Dijkstra -->
        <marker
          id="arrow-dijkstra"
          viewBox="0 0 10 10"
          refX="22"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 L2,5 Z" fill="#D4AF37" />
        </marker>

        <!-- Filtro de brillo de neón (Glow Filter) -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Grupo transformable que contiene todo el grafo -->
      <g :transform="`translate(${panX}, ${panY}) scale(${zoom})`">

        <!-- Cuadrícula de fondo sutil -->
        <rect x="-10000" y="-10000" width="23000" height="23000" fill="url(#grid-dots)" pointer-events="none"/>

        <!-- Órbitas atómicas decorativas en el fondo de la esfera (solo en modo 3D) -->
        <g v-if="transitionProgress > 0" class="atomic-orbits" :style="{ opacity: transitionProgress * 0.18 }">
          <!-- Órbita 1 (Horizontal inclinada) -->
          <ellipse cx="1500" cy="1500" rx="550" ry="220" class="orbit-ring orbit-1" />
          <!-- Órbita 2 (Inclinada derecha) -->
          <ellipse cx="1500" cy="1500" rx="550" ry="220" class="orbit-ring orbit-2" transform="rotate(60, 1500, 1500)" />
          <!-- Órbita 3 (Inclinada izquierda) -->
          <ellipse cx="1500" cy="1500" rx="550" ry="220" class="orbit-ring orbit-3" transform="rotate(-60, 1500, 1500)" />
        </g>

        <!-- 1. Renderizado de Vías (Edges) -->
        <g class="edges-group">
          <g v-for="edge in edges" :key="edge.id">
            <!-- Obtener coordenadas de origen y destino interpoladas -->
            <line
              v-if="getNodeCoords(edge.source) && getNodeCoords(edge.target)"
              :x1="getNodeCoords(edge.source).x"
              :y1="getNodeCoords(edge.source).y"
              :x2="getNodeCoords(edge.target).x"
              :y2="getNodeCoords(edge.target).y"
              :class="[
                'edge-line', 
                { 
                  'selected': selectedElementType === 'edge' && selectedElement?.id === edge.id,
                  'dijkstra-path': isEdgeInDijkstra(edge.id),
                  'un-sentido': edge.sentido === 'un-sentido',
                  'cerrada': edge.estado === 'cerrada'
                }
              ]"
              :stroke-dasharray="edge.calzada === 'doble' ? 'none' : '4 4'"
              :marker-end="edge.sentido === 'un-sentido' ? (isEdgeInDijkstra(edge.id) ? 'url(#arrow-dijkstra)' : 'url(#arrow)') : ''"
              :style="getEdgeStyle(edge)"
              @click.stop="handleEdgeClick(edge)"
            />
            
            <!-- Línea oculta más ancha para facilitar el clic en la vía -->
            <line
              v-if="getNodeCoords(edge.source) && getNodeCoords(edge.target)"
              :x1="getNodeCoords(edge.source).x"
              :y1="getNodeCoords(edge.source).y"
              :x2="getNodeCoords(edge.target).x"
              :y2="getNodeCoords(edge.target).y"
              class="edge-click-trigger"
              @click.stop="handleEdgeClick(edge)"
            />
          </g>

          <!-- Vista previa de línea mientras se crea una vía en modo 'add-edge' -->
          <line
            v-if="activeMode === 'add-edge' && edgeSourceNode"
            :x1="edgeSourceNode.x"
            :y1="edgeSourceNode.y"
            :x2="mouseSVGX"
            :y2="mouseSVGY"
            class="edge-preview-line"
          />
        </g>

        <!-- 2. Renderizado de Nodos (Nodes) -->
        <g class="nodes-group">
          <g 
            v-for="node in nodes" 
            :key="node.id"
            :transform="`translate(${getNodeCoords(node.id)?.x || node.x}, ${getNodeCoords(node.id)?.y || node.y})`"
            :class="[
              'node-group', 
              node.tipo,
              { 
                'selected': selectedElementType === 'node' && selectedElement?.id === node.id,
                'dijkstra-path': isNodeInDijkstra(node.id),
                'edge-source': edgeSourceNode?.id === node.id
              }
            ]"
            :style="getNodeStyle(node.id)"
            @mousedown.stop="handleNodeMouseDown($event, node)"
            @click.stop="handleNodeClick(node)"
            @mouseenter="hoveredNodeId = node.id"
            @mouseleave="hoveredNodeId = null"
          >
            <!-- Sombra de neón exterior para nodos seleccionados/Dijkstra -->
            <circle 
              :r="getNodeRadius(node) * 1.5" 
              class="node-glow-ring"
              v-if="(selectedElementType === 'node' && selectedElement?.id === node.id) || isNodeInDijkstra(node.id)"
              :style="{ strokeWidth: (is3d ? 2 : (zoom >= 0.7 ? 2 / zoom : 2 / 0.7)) + 'px' }"
            />

            <!-- Círculo principal del nodo (Esfera en 3D, Relleno sólido y reducido 40% en 2D) -->
            <circle 
              :r="getNodeRadius(node)" 
              class="node-circle" 
              :style="circleStyle(node)"
            />

            <!-- Punto central para municipios (SOLO en 3D) -->
            <circle 
              v-if="node.tipo === 'municipio' && transitionProgress > 0" 
              :r="4 * (getNodeCoords(node.id)?.scale || 1)" 
              fill="#fff" 
              :opacity="0.85 * transitionProgress"
            />
            
            <!-- Etiqueta del nodo (se muestra al pasar el mouse o al seleccionarlo) -->
            <text 
              v-if="shouldShowNodeLabel(node)"
              :y="getNodeLabelY(node)" 
              text-anchor="middle" 
              class="node-label"
              :style="{ fontSize: `${getNodeLabelFontSize()}px` }"
            >
              {{ node.nombre }}
            </text>
          </g>
        </g>

      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  activeMode: { type: String, default: 'select' },
  is3d: { type: Boolean, default: false },
  selectedElement: { type: Object, default: null },
  selectedElementType: { type: String, default: null },
  dijkstraResult: { type: Object, default: null }
})

const emit = defineEmits([
  'select-node', 'select-edge', 'clear-selection', 
  'move-node', 'move-node-end', 'add-node', 'add-edge', 'zoom-reset'
])

// --- REFERENCIAS ---
const containerRef = ref(null)

// --- ESTADO NAVEGACIÓN (ZOOM/PAN) ---
const panX = ref(150)
const panY = ref(150)
const zoom = ref(0.28) // Zoom inicial bajo para encajar el mapa completo de Antioquia

// --- ESTADO DRAG & DROP Y CONEXIÓN ---
const draggedNodeId = ref(null)
const edgeSourceNode = ref(null)
const hoveredNodeId = ref(null) // Nodo sobre el que está el mouse para mostrar label

// Coordenadas del cursor en el espacio SVG
const mouseSVGX = ref(0)
const mouseSVGY = ref(0)

// Seguimiento del estado de arrastre del lienzo (panning en 2D)
let isPanning = false
let startPanX = 0
let startPanY = 0
let startMouseX = 0
let startMouseY = 0

// Desplazamiento inicial del arrastre de nodo y umbral de clic
let nodeDragOffset = { x: 0, y: 0 }
let nodeMoved = false
let startDragMouseX = 0
let startDragMouseY = 0

// --- ESTADO MODO ÁTOMO 3D ---
const sphereRadius = 550 // Radio de la esfera virtual
const centerX = 1500     // Centro del viewport SVG virtual (3000x3000px)
const centerY = 1500
const cameraDistance = 1200 // Distancia focal de la cámara para perspectiva

// Ángulo e interpolación de transición suave (0 = 2D Puro, 1 = 3D Puro)
const transitionProgress = ref(0)

// Ángulos de rotación actuales
const angleX = ref(0.4)
const angleY = ref(0.6)

// Velocidad de auto-rotación por defecto
const speedX = ref(0.001)
const speedY = ref(0.003)

// Inercia acumulada al arrastrar con el mouse
const inertiaX = ref(0)
const inertiaY = ref(0)
const isDragging3D = ref(false)

let lastMouseX3D = 0
let lastMouseY3D = 0
let animationFrameId = null

// Almacena la posición inicial en 3D para cada nodo: { [nodeId]: { x3, y3, z3 } }
const nodes3D = ref({})
// Almacena las posiciones 2D proyectadas actuales: { [nodeId]: { x, y, scale, z } }
const projectedNodes = ref({})

// --- ETIQUETAS Y TEXTO ---
const modeLabel = computed(() => {
  if (props.activeMode === 'select') return 'Seleccionar y Mover'
  if (props.activeMode === 'add-node') return 'Modo Crear Nodo'
  if (props.activeMode === 'add-edge') return 'Modo Enlazar Vías'
  return ''
})

// --- LÓGICA DE INTERPOLACIÓN DE COORDENADAS ---
const getNodeCoords = (nodeId) => {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return null
  
  const t = transitionProgress.value
  if (t === 0) {
    // 2D Puro
    return { x: node.x, y: node.y, scale: 1, z: 0 }
  }
  
  const proj3D = projectedNodes.value[nodeId]
  if (!proj3D) {
    return { x: node.x, y: node.y, scale: 1, z: 0 }
  }
  
  if (t === 1) {
    // 3D Puro
    return proj3D
  }
  
  // Interpolación suave para ver cómo se acomoda cada nodo
  return {
    x: node.x * (1 - t) + proj3D.x * t,
    y: node.y * (1 - t) + proj3D.y * t,
    scale: 1 * (1 - t) + proj3D.scale * t,
    z: proj3D.z * t
  }
}

// --- DIMENSIONAMIENTO DINÁMICO DE NODOS ---
const zoomThreshold = 0.7 // Umbral a partir del cual se reduce el tamaño para evitar encimado

const getNodeRadius = (node) => {
  const t = transitionProgress.value
  const isSelected = props.selectedElement?.id === node.id

  let baseR = node.tipo === 'municipio' ? 8 : 5
  if (isNodeInDijkstra(node.id)) baseR *= 1.85
  else if (isSelected) baseR *= 1.6

  const zVal = zoom.value
  const r2D = zVal >= zoomThreshold ? baseR / zVal : baseR / zoomThreshold

  const scale3D = projectedNodes.value[node.id]?.scale || 1
  let baseR3D = node.tipo === 'municipio' ? 14 : 9
  if (isNodeInDijkstra(node.id)) baseR3D *= 1.85
  else if (isSelected) baseR3D *= 1.6
  const r3D = baseR3D * scale3D

  return r2D * (1 - t) + r3D * t
}

const getNodeStrokeWidth = (node) => {
  const t = transitionProgress.value
  const zVal = zoom.value
  const sw2D = zVal >= zoomThreshold
    ? 2.5 / zVal
    : 2.5 / zoomThreshold
  const sw3D = 0
  return sw2D * (1 - t) + sw3D * t
}

const getNodeLabelFontSize = () => {
  const t = transitionProgress.value
  const zVal = zoom.value
  const fs2D = 12 / zVal
  const fs3D = 11
  return fs2D * (1 - t) + fs3D * t
}

const getNodeLabelY = (node) => {
  const t = transitionProgress.value
  const zVal = zoom.value
  const isSelected = props.selectedElement?.id === node.id

  // Radio constante en píxeles de pantalla
  let screenR = node.tipo === 'municipio' ? 8 : 5
  if (isNodeInDijkstra(node.id)) screenR *= 1.85
  else if (isSelected) screenR *= 1.6

  // Margen fijo en píxeles de pantalla sobre el borde del nodo
  const MARGIN_PX = 10
  const effectiveZoom = Math.max(zVal, zoomThreshold)

  // Para seleccionado: fuera del buffer en px → SVG
  const screenEdge = isSelected ? screenR * 1.5 * 1.55 : screenR
  const y2D = -(screenEdge + MARGIN_PX) / effectiveZoom

  const scale3D = projectedNodes.value[node.id]?.scale || 1
  const y3D = -22 * scale3D

  return y2D * (1 - t) + y3D * t
}

// Estilo de relleno y borde
const circleStyle = (node) => {
  const isSelected = props.selectedElement?.id === node.id
  const inDijkstra = isNodeInDijkstra(node.id)

  if (inDijkstra) {
    return { fill: '#FFD100', stroke: 'rgba(0,0,0,0.18)', strokeWidth: '1.5px' }
  }

  if (isSelected) {
    const grad = node.tipo === 'municipio' ? 'sel-municipio' : 'sel-interseccion'
    return { fill: `url(#${grad})`, stroke: '#ffffff', strokeWidth: '2.5px' }
  }

  const fill = node.tipo === 'municipio' ? '#00853F' : '#F5A623'
  return { fill, stroke: 'rgba(0,0,0,0.18)', strokeWidth: '1.5px' }
}

// Decidir si mostrar etiqueta de nombre (solo hover o selección)
const shouldShowNodeLabel = (node) => {
  return zoom.value >= 2.6 || props.selectedElement?.id === node.id || hoveredNodeId.value === node.id
}

// --- CONFIGURACIÓN DE ESFERA DE FIBONACCI 3D ---
const initializeFibonacciSphere = () => {
  const count = props.nodes.length
  if (count === 0) return
  
  const newNodes3D = {}
  const sortedNodes = [...props.nodes].sort((a, b) => a.id.localeCompare(b.id))
  
  sortedNodes.forEach((node, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    
    newNodes3D[node.id] = {
      x3: sphereRadius * Math.sin(phi) * Math.cos(theta),
      y3: sphereRadius * Math.sin(phi) * Math.sin(theta),
      z3: sphereRadius * Math.cos(phi)
    }
  })
  
  nodes3D.value = newNodes3D
  update3DProjection()
}

// Actualizar proyección 2D a partir de las posiciones 3D rotadas
const update3DProjection = () => {
  const cosX = Math.cos(angleX.value)
  const sinX = Math.sin(angleX.value)
  const cosY = Math.cos(angleY.value)
  const sinY = Math.sin(angleY.value)
  
  const newProjected = {}
  
  props.nodes.forEach(node => {
    const coords = nodes3D.value[node.id]
    if (!coords) return
    
    const { x3, y3, z3 } = coords
    
    const xRot = x3 * cosY - z3 * sinY
    const zRot = x3 * sinY + z3 * cosY
    
    const yRot = y3 * cosX - zRot * sinX
    const zFinal = y3 * sinX + zRot * cosX
    
    const scale = cameraDistance / (cameraDistance + zFinal)
    const px = centerX + xRot * scale
    const py = centerY + yRot * scale
    
    newProjected[node.id] = {
      x: px,
      y: py,
      scale,
      z: zFinal
    }
  })
  
  projectedNodes.value = newProjected
}

// Bucle de animación continuo para rotar la esfera y suavizar transiciones
const animate3D = () => {
  const t = transitionProgress.value
  
  // Detener el bucle si estamos 100% en 2D y la transición terminó
  if (!props.is3d && t === 0) {
    animationFrameId = null
    return
  }
  
  // 1. Actualizar el progreso de la transición de manera muy suave (tasa de cambio fija)
  if (props.is3d) {
    if (transitionProgress.value < 1) {
      transitionProgress.value = Math.min(transitionProgress.value + 0.018, 1) // ~0.5 segundos de morfo
    }
  } else {
    if (transitionProgress.value > 0) {
      transitionProgress.value = Math.max(transitionProgress.value - 0.018, 0)
    }
  }
  
  // 2. Rotar 3D
  if (isDragging3D.value) {
    angleY.value = (angleY.value + inertiaY.value) % (2 * Math.PI)
    angleX.value = (angleX.value + inertiaX.value) % (2 * Math.PI)
  } else {
    // Si está en 3D o en transición, rotar
    angleX.value = (angleX.value + speedX.value + inertiaX.value) % (2 * Math.PI)
    angleY.value = (angleY.value + speedY.value + inertiaY.value) % (2 * Math.PI)
    
    inertiaX.value *= 0.92
    inertiaY.value *= 0.92
  }
  
  update3DProjection()
  animationFrameId = requestAnimationFrame(animate3D)
}

// --- ESTILIZACIÓN DE PROFUNDIDAD EN 3D ---
const getNodeStyle = (nodeId) => {
  const t = transitionProgress.value
  if (t === 0) return {}
  const proj = projectedNodes.value[nodeId]
  if (!proj) return {}
  
  // Atenuación de opacidad en 3D
  const opacity3D = 0.12 + 0.88 * ((sphereRadius - proj.z) / (2 * sphereRadius))
  // Interpolación con opacidad completa en 2D
  const opacity = 1.0 * (1 - t) + opacity3D * t
  
  return {
    opacity: opacity
  }
}

const getEdgeStyle = (edge) => {
  const t = transitionProgress.value
  let baseWidth = edge.calzada === 'doble' ? 5 : 3
  if (isEdgeInDijkstra(edge.id)) {
    baseWidth *= 2.5 // Las aristas en la ruta óptima se dibujan 2.5 veces más gruesas
  }
  
  const zVal = zoom.value
  const w2D = zVal >= zoomThreshold
    ? baseWidth / zVal
    : baseWidth / zoomThreshold
  
  if (t === 0) {
    return {
      strokeWidth: w2D
    }
  }
  
  const sProj = projectedNodes.value[edge.source]
  const tProj = projectedNodes.value[edge.target]
  if (!sProj || !tProj) {
    return { strokeWidth: w2D }
  }
  
  const avgScale = (sProj.scale + tProj.scale) / 2
  const w3D = baseWidth * avgScale
  
  const avgZ = (sProj.z + tProj.z) / 2
  const opacity3D = 0.08 + 0.92 * ((sphereRadius - avgZ) / (2 * sphereRadius))
  
  return {
    opacity: 1 * (1 - t) + opacity3D * t,
    strokeWidth: w2D * (1 - t) + w3D * t
  }
}

// --- NAVEGACIÓN Y INTERACCIONES DEL MOUSE (GLOBALES Y LOCALES) ---
const getSVGCoords = (clientX, clientY) => {
  if (!containerRef.value) return { x: 0, y: 0 }
  const rect = containerRef.value.getBoundingClientRect()
  const xLocal = clientX - rect.left
  const yLocal = clientY - rect.top
  return {
    x: (xLocal - panX.value) / zoom.value,
    y: (yLocal - panY.value) / zoom.value
  }
}

const handleContainerMouseDown = (e) => {
  e.preventDefault()
  
  if (props.is3d) {
    // Iniciar arrastre de rotación esférica 3D
    isDragging3D.value = true
    lastMouseX3D = e.clientX
    lastMouseY3D = e.clientY
    inertiaX.value = 0
    inertiaY.value = 0
    
    emit('clear-selection')
  } else {
    // Iniciar paneo normal 2D (cualquier clic de mouse inicia arrastre)
    isPanning = true
    startPanX = panX.value
    startPanY = panY.value
    startMouseX = e.clientX
    startMouseY = e.clientY
    
    // Limpiar selección si hicieron clic izquierdo en el fondo vacío del SVG
    if (e.button === 0 && e.target.tagName === 'svg') {
      emit('clear-selection')
    }
  }
}

const handleGlobalMouseMove = (e) => {
  if (props.is3d && isDragging3D.value) {
    const dx = e.clientX - lastMouseX3D
    const dy = e.clientY - lastMouseY3D
    
    inertiaY.value = dx * 0.004
    inertiaX.value = -dy * 0.004
    
    angleY.value = (angleY.value + inertiaY.value) % (2 * Math.PI)
    angleX.value = (angleX.value + inertiaX.value) % (2 * Math.PI)
    
    lastMouseX3D = e.clientX
    lastMouseY3D = e.clientY
    return
  }

  const { x, y } = getSVGCoords(e.clientX, e.clientY)
  mouseSVGX.value = x
  mouseSVGY.value = y

  if (isPanning) {
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    panX.value = startPanX + dx
    panY.value = startPanY + dy
    return
  }

  if (draggedNodeId.value) {
    const dist = Math.hypot(e.clientX - startDragMouseX, e.clientY - startDragMouseY)
    if (dist > 3) {
      nodeMoved = true
      emit('move-node', {
        nodeId: draggedNodeId.value,
        x: x + nodeDragOffset.x,
        y: y + nodeDragOffset.y
      })
    }
  }
}

const handleGlobalMouseUp = () => {
  isPanning = false
  isDragging3D.value = false
  
  if (draggedNodeId.value) {
    draggedNodeId.value = null
    if (nodeMoved) {
      emit('move-node-end')
    }
  }
}

const handleWheel = (e) => {
  e.preventDefault()
  
  const zoomFactor = 1.15
  let nextZoom = zoom.value
  
  if (e.deltaY < 0) {
    nextZoom *= zoomFactor
  } else {
    nextZoom /= zoomFactor
  }
  
  if (nextZoom < 0.04) nextZoom = 0.04
  if (nextZoom > 15) nextZoom = 15
  
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    panX.value = mouseX - (mouseX - panX.value) * (nextZoom / zoom.value)
    panY.value = mouseY - (mouseY - panY.value) * (nextZoom / zoom.value)
    zoom.value = nextZoom
  }
}

// Botones flotantes
const zoomIn = () => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const nextZoom = Math.min(zoom.value * 1.3, 15)
  panX.value = cx - (cx - panX.value) * (nextZoom / zoom.value)
  panY.value = cy - (cy - panY.value) * (nextZoom / zoom.value)
  zoom.value = nextZoom
}

const zoomOut = () => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const nextZoom = Math.max(zoom.value / 1.3, 0.04)
  panX.value = cx - (cx - panX.value) * (nextZoom / zoom.value)
  panY.value = cy - (cy - panY.value) * (nextZoom / zoom.value)
  zoom.value = nextZoom
}

const resetView = () => {
  if (props.is3d) {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    zoom.value = 0.65 
    panX.value = rect.width / 2 - 1500 * zoom.value
    panY.value = rect.height / 2 - 1500 * zoom.value
    angleX.value = 0.4
    angleY.value = 0.6
    inertiaX.value = 0
    inertiaY.value = 0
    return
  }

  if (props.nodes.length === 0) return
  
  const xs = props.nodes.map(n => n.x)
  const ys = props.nodes.map(n => n.y)
  
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  
  const graphW = maxX - minX
  const graphH = maxY - minY
  
  if (!containerRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  
  const scaleX = (containerRect.width * 0.8) / graphW
  const scaleY = (containerRect.height * 0.8) / graphH
  const optimalZoom = Math.min(scaleX, scaleY, 1.5)
  
  zoom.value = optimalZoom
  panX.value = containerRect.width / 2 - (minX + graphW / 2) * optimalZoom
  panY.value = containerRect.height / 2 - (minY + graphH / 2) * optimalZoom
  
  emit('zoom-reset')
}

const centerOnCoordinates = (x, y) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const targetZoom = Math.max(zoom.value, 0.8)
  
  zoom.value = targetZoom
  panX.value = rect.width / 2 - x * targetZoom
  panY.value = rect.height / 2 - y * targetZoom
}

defineExpose({
  centerOnCoordinates,
  resetView
})

// --- ACCIONES SOBRE NODOS/VÍAS ---
const handleNodeMouseDown = (e, node) => {
  if (props.is3d) return
  if (props.activeMode !== 'select') return
  e.preventDefault()
  nodeMoved = false
  startDragMouseX = e.clientX
  startDragMouseY = e.clientY
}

const handleNodeClick = (node) => {
  if (props.activeMode === 'select') {
    if (!nodeMoved) {
      emit('select-node', node)
    }
    return
  }

  if (props.is3d) return

  // Modo Agregar Vía
  if (props.activeMode === 'add-edge') {
    if (!edgeSourceNode.value) {
      edgeSourceNode.value = node
    } else {
      if (edgeSourceNode.value.id !== node.id) {
        emit('add-edge', {
          sourceId: edgeSourceNode.value.id,
          targetId: node.id
        })
      }
      edgeSourceNode.value = null
    }
  }
}

const handleEdgeClick = (edge) => {
  if (props.activeMode === 'select') {
    emit('select-edge', edge)
  }
}

const checkBackgroundClickForNode = (e) => {
  if (props.is3d) return
  if (props.activeMode === 'add-node' && e.target.tagName === 'svg') {
    const { x, y } = getSVGCoords(e.clientX, e.clientY)
    emit('add-node', { x, y })
  }
}

// --- WATCHERS MODO 3D ---
watch(() => props.is3d, (is3DActive) => {
  if (is3DActive) {
    initializeFibonacciSphere()
  }
  
  // Asegurar que el bucle de animación esté en marcha
  if (!animationFrameId) {
    animate3D()
  }
  
  // Forzar redibujado de centrado tras delay de transición
  setTimeout(() => {
    resetView()
  }, 50)
})

watch(() => props.nodes.length, () => {
  initializeFibonacciSphere()
  if (props.is3d && !animationFrameId) {
    animate3D()
  }
})

watch(() => props.activeMode, (newMode) => {
  if (newMode !== 'add-edge') {
    edgeSourceNode.value = null
  }
})

// --- LIFECYCLE ---
onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('click', checkBackgroundClickForNode)
  }
  
  window.addEventListener('mousemove', handleGlobalMouseMove)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  
  // Inicializar posiciones 3D de Fibonacci
  initializeFibonacciSphere()
  
  if (props.is3d) {
    animate3D()
  } else {
    // Si inicia en 2D, hacer un render de calentamiento y centrar
    update3DProjection()
    setTimeout(() => {
      resetView()
    }, 400)
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('click', checkBackgroundClickForNode)
  }
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// --- DIJKSTRA EN 3D ---
const isNodeInDijkstra = (nodeId) => {
  if (!props.dijkstraResult) return false
  return props.dijkstraResult.nodeIds.includes(nodeId)
}

const isEdgeInDijkstra = (edgeId) => {
  if (!props.dijkstraResult) return false
  return props.dijkstraResult.edgeIds.includes(edgeId)
}
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

.canvas-container.mode-add-node {
  cursor: crosshair;
}

.canvas-container.mode-add-edge {
  cursor: cell;
}

.graph-svg {
  display: block;
}

/* Controles flotantes de navegación */
.navigation-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 6px;
  z-index: 5;
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
}

.navigation-controls button:hover {
  background: rgba(170, 27, 34, 0.08);
  color: #AA1B22;
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
  z-index: 5;
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

.mode-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 6px;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.indicator.select    { color: #00853F; background-color: #00853F; }
.indicator.add-node  { color: #00B259; background-color: #00B259; }
.indicator.add-edge  { color: #F5A623; background-color: #F5A623; }
.indicator.mode-3d   { color: #FFD100; background-color: #FFD100; }

.badge-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: hsl(var(--text-light));
}

/* --- ÓRBITAS ATÓMICAS DECORATIVAS --- */
.atomic-orbits {
  pointer-events: none;
}

.orbit-ring {
  fill: none;
  stroke: rgba(170, 27, 34, 0.22);
  stroke-width: 2;
  stroke-dasharray: 8 6;
}

.orbit-1 {
  animation: orbit-spin-1 30s linear infinite;
  transform-box: fill-box;
  transform-origin: center;
}

.orbit-2 {
  animation: orbit-spin-2 30s linear infinite;
  transform-box: fill-box;
  transform-origin: center;
}

.orbit-3 {
  animation: orbit-spin-3 30s linear infinite;
  transform-box: fill-box;
  transform-origin: center;
}

/* --- ESTILOS DE ELEMENTOS SVG --- */

/* Vías */
.edge-line {
  stroke: #4b5563;
  fill: none;
  cursor: pointer;
  transition: stroke 0.25s ease;
}

.edge-line:hover {
  stroke: #AA1B22;
}

.edge-line.un-sentido {
  stroke: #AA1B22;
}

.edge-line.selected {
  stroke: #F5A623;
  filter: url(#glow);
}

/* Resaltado de Dijkstra */
.edge-line.dijkstra-path {
  stroke: #D4AF37;
  animation: edge-pulse 1.5s infinite;
  filter: url(#glow);
}

.edge-line.cerrada {
  stroke: #7f1d1d !important;
  stroke-dasharray: 4 6 !important;
  opacity: 0.65;
}

/* Disparador de clics amplio e invisible en las vías */
.edge-click-trigger {
  stroke: transparent;
  stroke-width: 16;
  fill: none;
  cursor: pointer;
}

.edge-preview-line {
  stroke: rgba(170, 27, 34, 0.65);
  stroke-width: 4;
  stroke-dasharray: 5 5;
  pointer-events: none;
}

/* Nodos */
.node-group {
  cursor: pointer;
}

/* Desactivar hover escalado en el grupo para evitar desalineación */
.node-circle {
  transition: stroke 0.2s ease, fill 0.2s ease, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
  transform-box: fill-box;
}

/* Solo escalar el círculo del nodo en hover en vista 2D */
.canvas-container:not(.mode-3d) .node-group:hover .node-circle {
  transform: scale(1.25);
}

/* Anillo exterior */
.node-glow-ring {
  fill: none;
}

.node-group.selected .node-glow-ring {
  stroke: #00853F;
  stroke-width: 2px;
  opacity: 0.7;
  animation: node-pulse-selected 1.3s ease-in-out infinite;
}

.node-group.dijkstra-path:not(.selected) .node-glow-ring {
  stroke: #FFD100;
  opacity: 0.4;
  animation: node-ring-expand 2.2s infinite ease-out;
}

.node-group.selected .node-circle {
  filter: url(#glow) drop-shadow(0 0 4px rgba(255,255,255,0.8));
}

.node-group.dijkstra-path .node-circle {
  filter: url(#glow);
}

.node-group.edge-source .node-circle {
  stroke: #ffffff;
  fill: #F5A623;
  animation: blink 1s infinite alternate;
}

/* Etiquetas de texto */
.node-label {
  font-family: var(--font-family);
  font-weight: 700;
  fill: #1f2937;
  stroke: #ffffff;
  stroke-width: 3px;
  paint-order: stroke fill;
  pointer-events: none;
  letter-spacing: 0.2px;
}

.node-group.selected .node-label {
  fill: #AA1B22;
}

/* ANIMACIONES */
@keyframes edge-pulse {
  0% { opacity: 0.75; }
  50% { opacity: 1; }
  100% { opacity: 0.75; }
}

@keyframes node-ring-expand {
  0% { transform: scale(0.6); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

@keyframes node-pulse-selected {
  0%   { transform: scale(1.1); opacity: 0.7; }
  50%  { transform: scale(1.55); opacity: 0.15; }
  100% { transform: scale(1.1); opacity: 0.7; }
}

@keyframes blink {
  from { filter: brightness(1); }
  to { filter: brightness(1.4) drop-shadow(0 0 6px #22d3ee); }
}

@keyframes orbit-spin-1 {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes orbit-spin-2 {
  from { transform: rotate(60deg); }
  to { transform: rotate(420deg); }
}

@keyframes orbit-spin-3 {
  from { transform: rotate(-60deg); }
  to { transform: rotate(300deg); }
}
</style>

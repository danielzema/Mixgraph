import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getGraphData, getFolderGraphData, getPlaylistGraphData, getFolders, getPlaylists, getPlaylistTracks } from '../api'

// Camelot wheel compatibility checker
// Compatible keys: same key, ±1 on the wheel (wraps 12→1), or same number different letter (A↔B)
function isInKey(key1, key2) {
  if (!key1 || !key2) return false
  
  // Parse Camelot notation (e.g., "8A", "11B", "1A")
  const parse = (key) => {
    const match = key.match(/^(\d{1,2})([ABab])$/i)
    if (!match) return null
    return { num: parseInt(match[1]), letter: match[2].toUpperCase() }
  }
  
  const k1 = parse(key1)
  const k2 = parse(key2)
  
  if (!k1 || !k2) return false
  
  // Same key = compatible
  if (k1.num === k2.num && k1.letter === k2.letter) return true
  
  // Same number, different letter (A↔B) = compatible (relative major/minor)
  if (k1.num === k2.num && k1.letter !== k2.letter) return true
  
  // Adjacent numbers on the wheel (same letter) = compatible
  // The wheel wraps: 12 → 1
  if (k1.letter === k2.letter) {
    const diff = Math.abs(k1.num - k2.num)
    if (diff === 1 || diff === 11) return true // 11 means 12→1 or 1→12
  }
  
  return false
}

// Cache for persisting graph state across component unmounts
const graphCache = {
  data: null,
  positions: null,
  layoutComplete: false,
  viewType: 'all',
  selectedFolderId: null,
  selectedPlaylistId: null
}

function Graph() {
  const [folders, setFolders] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [viewType, setViewType] = useState(graphCache.viewType)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [highlightedTrackIds, setHighlightedTrackIds] = useState(new Set())
  const [highlightedEdgePairs, setHighlightedEdgePairs] = useState(new Set())
  const [graphData, setGraphData] = useState(graphCache.data || { nodes: [], edges: [] })
  const [loading, setLoading] = useState(!graphCache.data)
  const [layoutProgress, setLayoutProgress] = useState(graphCache.layoutComplete ? 100 : 0)
  const [layoutComplete, setLayoutComplete] = useState(graphCache.layoutComplete)
  const [isBuilding, setIsBuilding] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [nodePositions, setNodePositions] = useState(graphCache.positions || {})
  const [dragging, setDragging] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const graphPageRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const buildRequestedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchHighlightedId, setSearchHighlightedId] = useState(null)
  
  // Dynamic canvas sizing based on node count - square for better edge distribution
  const canvasSize = useMemo(() => {
    const nodeCount = graphData.nodes.length
    const edgeCount = graphData.edges.length
    // Scale canvas based on complexity - square canvas to avoid edge clustering
    const baseDimension = 1000
    const scaleFactor = Math.max(1, Math.sqrt(nodeCount / 15) * (1 + edgeCount / (nodeCount * 4 || 1) * 0.2))
    const size = Math.min(5000, Math.max(baseDimension, baseDimension * scaleFactor))
    return { width: size, height: size }
  }, [graphData.nodes.length, graphData.edges.length])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      graphPageRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }
  
  // Fit graph to view - calculate zoom and pan to show all nodes
  function fitToView() {
    if (Object.keys(nodePositions).length === 0) return
    
    const positions = Object.values(nodePositions)
    const padding = 80
    const minX = Math.min(...positions.map(p => p.x)) - padding
    const maxX = Math.max(...positions.map(p => p.x)) + padding
    const minY = Math.min(...positions.map(p => p.y)) - padding
    const maxY = Math.max(...positions.map(p => p.y)) + padding
    
    const graphWidth = maxX - minX
    const graphHeight = maxY - minY
    
    // Get container dimensions
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return
    
    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height
    
    // The SVG viewBox maps canvasSize to container size
    // We need zoom relative to how the viewBox scales
    const viewBoxScaleX = containerWidth / canvasSize.width
    const viewBoxScaleY = containerHeight / canvasSize.height
    const viewBoxScale = Math.min(viewBoxScaleX, viewBoxScaleY)
    
    // Calculate zoom needed to fit the actual graph content
    const zoomX = (containerWidth / viewBoxScale) / graphWidth
    const zoomY = (containerHeight / viewBoxScale) / graphHeight
    const newZoom = Math.min(zoomX, zoomY, 3) * 0.85
    
    // Calculate pan to center the graph
    const graphCenterX = (minX + maxX) / 2
    const graphCenterY = (minY + maxY) / 2
    const viewCenterX = (canvasSize.width / 2)
    const viewCenterY = (canvasSize.height / 2)
    
    setZoom(Math.max(0.2, newZoom))
    setPan({ x: viewCenterX - graphCenterX, y: viewCenterY - graphCenterY })
  }

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    getFolders().then(setFolders)
    getPlaylists().then(setPlaylists)
  }, [])

  // Initial load - always load graph on mount
  useEffect(() => {
    buildRequestedRef.current = true
    loadGraph()
  }, [])

  // Handle view type changes - only update highlighting, don't rebuild
  useEffect(() => {
    if (!graphData.nodes.length) return
    
    async function updateHighlighting() {
      if (viewType === 'playlist' && selectedPlaylist) {
        const playlistTracks = await getPlaylistTracks(selectedPlaylist.id)
        setHighlightedTrackIds(new Set(playlistTracks.map(t => t.id)))
        
        const edgePairs = new Set()
        for (let i = 0; i < playlistTracks.length - 1; i++) {
          const fromId = playlistTracks[i].id
          const toId = playlistTracks[i + 1].id
          edgePairs.add(`${fromId}-${toId}`)
        }
        setHighlightedEdgePairs(edgePairs)
      } else {
        setHighlightedTrackIds(new Set())
        setHighlightedEdgePairs(new Set())
      }
      
      // Update cache
      graphCache.viewType = viewType
      graphCache.selectedFolderId = selectedFolder?.id || null
      graphCache.selectedPlaylistId = selectedPlaylist?.id || null
    }
    
    updateHighlighting()
  }, [viewType, selectedPlaylist, selectedFolder, graphData.nodes.length])

  // Manual refresh function
  async function refreshGraph() {
    buildRequestedRef.current = true
    // Clear cache
    graphCache.data = null
    graphCache.positions = null
    graphCache.layoutComplete = false
    
    setLayoutComplete(false)
    setLayoutProgress(0)
    await loadGraph()
  }

  async function loadGraph() {
    setLoading(true)
    try {
      // Always load all graph data for the main view
      const data = await getGraphData()
      setGraphData(data)
      
      // Cache the data
      graphCache.data = data
      
      // Use smart initial layout based on graph structure
      const positions = computeInitialLayout(data.nodes, data.edges)
      setNodePositions(positions)
    } catch (err) {
      console.error('Failed to load graph:', err)
    }
    setLoading(false)
  }
  
  // Compute smarter initial positions using a hierarchical approach
  function computeInitialLayout(nodes, edges) {
    const positions = {}
    const nodeCount = nodes.length
    
    if (nodeCount === 0) return positions
    
    // Build adjacency maps
    const outgoing = new Map()
    const incoming = new Map()
    nodes.forEach(n => {
      outgoing.set(n.id, [])
      incoming.set(n.id, [])
    })
    edges.forEach(e => {
      outgoing.get(e.from_track_id)?.push(e.to_track_id)
      incoming.get(e.to_track_id)?.push(e.from_track_id)
    })
    
    // Calculate node degrees for importance
    const degrees = new Map()
    nodes.forEach(n => {
      degrees.set(n.id, (outgoing.get(n.id)?.length || 0) + (incoming.get(n.id)?.length || 0))
    })
    
    // Sort nodes by degree (most connected first)
    const sortedNodes = [...nodes].sort((a, b) => degrees.get(b.id) - degrees.get(a.id))
    
    // Dynamic sizing based on node count - use larger area for spread
    const baseRadius = Math.max(250, Math.min(800, nodeCount * 15))
    const centerX = canvasSize.width / 2
    const centerY = canvasSize.height / 2
    
    // Use golden angle spiral for even circular distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5 degrees
    
    sortedNodes.forEach((node, index) => {
      if (index === 0) {
        // Most connected node at center
        positions[node.id] = { x: centerX, y: centerY }
        return
      }
      
      // Golden angle spiral - spreads nodes evenly in a circular pattern
      const angle = index * goldenAngle
      const radius = baseRadius * Math.sqrt(index / nodeCount) * 0.9
      
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      }
    })
    
    return positions
  }

  // Apply force-directed layout with edge crossing minimization
  // Only runs when buildRequestedRef is true (initial load or manual refresh)
  useEffect(() => {
    if (graphData.nodes.length === 0) return
    if (!buildRequestedRef.current) return
    
    // If we have cached positions and layout is complete, don't rebuild
    if (graphCache.layoutComplete && graphCache.positions) {
      setLayoutComplete(true)
      setLayoutProgress(100)
      return
    }
    
    setIsBuilding(true)
    setLayoutProgress(0)
    setLayoutComplete(false)
    
    let animationFrame
    let iterations = 0
    // More iterations for larger graphs
    const maxIterations = Math.min(300, 100 + graphData.nodes.length * 2)
    
    // Pre-compute edge lookup for faster access
    const edgeSet = new Set(graphData.edges.map(e => `${e.from_track_id}-${e.to_track_id}`))
    const hasEdge = (from, to) => edgeSet.has(`${from}-${to}`) || edgeSet.has(`${to}-${from}`)
    
    // Compute edge indices for curve differentiation
    const edgePairs = new Map()
    graphData.edges.forEach((edge, idx) => {
      const key = [edge.from_track_id, edge.to_track_id].sort().join('-')
      if (!edgePairs.has(key)) edgePairs.set(key, [])
      edgePairs.get(key).push({ edge, idx })
    })
    
    function applyForces() {
      if (iterations >= maxIterations) return
      
      // Cooling factor - start strong, decrease over time
      const temp = 1 - (iterations / maxIterations)
      const coolingFactor = Math.pow(temp, 0.5)
      
      setNodePositions(prev => {
        const newPositions = { ...prev }
        const nodes = graphData.nodes
        const edges = graphData.edges
        const nodeCount = nodes.length
        
        // Dynamic parameters based on graph size
        const idealDistance = Math.max(80, Math.min(200, canvasSize.width / Math.sqrt(nodeCount) * 0.8))
        const repulsionStrength = idealDistance * idealDistance * 50
        const attractionStrength = 0.02
        
        // Repulsion between all nodes - quadtree-like optimization for large graphs
        const forces = new Map()
        nodes.forEach(n => forces.set(n.id, { fx: 0, fy: 0 }))
        
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i]
            const nodeB = nodes[j]
            const posA = newPositions[nodeA.id]
            const posB = newPositions[nodeB.id]
            
            if (!posA || !posB) continue
            
            const dx = posB.x - posA.x
            const dy = posB.y - posA.y
            const distSq = dx * dx + dy * dy
            const dist = Math.sqrt(distSq) || 1
            
            // Stronger repulsion when nodes are close
            let force = repulsionStrength / distSq
            
            // Extra repulsion for non-connected nodes that are very close
            if (!hasEdge(nodeA.id, nodeB.id) && dist < idealDistance * 1.5) {
              force *= 2
            }
            
            // Cap maximum force to prevent explosions
            force = Math.min(force, 50) * coolingFactor
            
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            
            forces.get(nodeA.id).fx -= fx
            forces.get(nodeA.id).fy -= fy
            forces.get(nodeB.id).fx += fx
            forces.get(nodeB.id).fy += fy
          }
        }
        
        // Attraction along edges - pull connected nodes closer
        edges.forEach(edge => {
          const posA = newPositions[edge.from_track_id]
          const posB = newPositions[edge.to_track_id]
          
          if (!posA || !posB) return
          
          const dx = posB.x - posA.x
          const dy = posB.y - posA.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          
          // Ideal edge length scales with graph
          const targetLength = idealDistance * 0.8
          const force = (dist - targetLength) * attractionStrength * coolingFactor
          
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          
          forces.get(edge.from_track_id).fx += fx
          forces.get(edge.from_track_id).fy += fy
          forces.get(edge.to_track_id).fx -= fx
          forces.get(edge.to_track_id).fy -= fy
        })
        
        // Push nodes away from edges they don't belong to (reduce crossings)
        // Only do this check occasionally to save performance
        if (iterations % 3 === 0) {
          const edgeClearance = 40
          edges.forEach(edge => {
            const posA = newPositions[edge.from_track_id]
            const posB = newPositions[edge.to_track_id]
            if (!posA || !posB) return
            
            nodes.forEach(node => {
              if (node.id === edge.from_track_id || node.id === edge.to_track_id) return
              const posN = newPositions[node.id]
              if (!posN) return
              
              // Calculate distance from node to edge line segment
              const edgeDx = posB.x - posA.x
              const edgeDy = posB.y - posA.y
              const edgeLenSq = edgeDx * edgeDx + edgeDy * edgeDy
              if (edgeLenSq === 0) return
              
              // Project node onto edge
              const t = Math.max(0, Math.min(1, ((posN.x - posA.x) * edgeDx + (posN.y - posA.y) * edgeDy) / edgeLenSq))
              
              // Closest point on edge
              const closestX = posA.x + t * edgeDx
              const closestY = posA.y + t * edgeDy
              
              // Distance from node to edge
              const distToEdgeX = posN.x - closestX
              const distToEdgeY = posN.y - closestY
              const distToEdge = Math.sqrt(distToEdgeX * distToEdgeX + distToEdgeY * distToEdgeY) || 1
              
              // If too close to edge, push away
              if (distToEdge < edgeClearance) {
                const pushForce = (edgeClearance - distToEdge) * 0.15 * coolingFactor
                forces.get(node.id).fx += (distToEdgeX / distToEdge) * pushForce
                forces.get(node.id).fy += (distToEdgeY / distToEdge) * pushForce
              }
            })
          })
        }
        
        // Center gravity - gentle pull toward center to prevent drift
        const centerX = canvasSize.width / 2
        const centerY = canvasSize.height / 2
        const gravityStrength = 0.01 * coolingFactor
        
        nodes.forEach(node => {
          const pos = newPositions[node.id]
          if (!pos) return
          forces.get(node.id).fx += (centerX - pos.x) * gravityStrength
          forces.get(node.id).fy += (centerY - pos.y) * gravityStrength
        })
        
        // Apply forces with velocity limiting
        const maxVelocity = idealDistance * 0.5
        nodes.forEach(node => {
          const pos = newPositions[node.id]
          const f = forces.get(node.id)
          if (!pos || !f) return
          
          // Limit velocity
          const velocity = Math.sqrt(f.fx * f.fx + f.fy * f.fy)
          if (velocity > maxVelocity) {
            f.fx = (f.fx / velocity) * maxVelocity
            f.fy = (f.fy / velocity) * maxVelocity
          }
          
          newPositions[node.id] = {
            x: pos.x + f.fx,
            y: pos.y + f.fy
          }
        })
        
        // Keep nodes in bounds with padding
        const padding = 60
        Object.keys(newPositions).forEach(id => {
          newPositions[id].x = Math.max(padding, Math.min(canvasSize.width - padding, newPositions[id].x))
          newPositions[id].y = Math.max(padding, Math.min(canvasSize.height - padding, newPositions[id].y))
        })
        
        return newPositions
      })
      
      iterations++
      setLayoutProgress(Math.round((iterations / maxIterations) * 100))
      
      if (iterations < maxIterations) {
        animationFrame = requestAnimationFrame(applyForces)
      } else {
        // Cache the final positions
        setNodePositions(prev => {
          graphCache.positions = prev
          return prev
        })
        graphCache.layoutComplete = true
        buildRequestedRef.current = false
        setIsBuilding(false)
        setLayoutComplete(true)
      }
    }
    
    animationFrame = requestAnimationFrame(applyForces)
    return () => cancelAnimationFrame(animationFrame)
  }, [graphData, canvasSize])

  // Mouse handlers for dragging nodes
  const handleMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation()
    const pos = nodePositions[nodeId]
    if (!pos) return
    
    const svgRect = svgRef.current.getBoundingClientRect()
    setDragging(nodeId)
    setOffset({
      x: (e.clientX - svgRect.left) / zoom - pan.x - pos.x,
      y: (e.clientY - svgRect.top) / zoom - pan.y - pos.y
    })
  }, [nodePositions, zoom, pan])

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      const svgRect = svgRef.current.getBoundingClientRect()
      const x = (e.clientX - svgRect.left) / zoom - pan.x - offset.x
      const y = (e.clientY - svgRect.top) / zoom - pan.y - offset.y
      
      setNodePositions(prev => {
        const newPositions = {
          ...prev,
          [dragging]: { 
            x: Math.max(30, Math.min(canvasSize.width - 30, x)), 
            y: Math.max(30, Math.min(canvasSize.height - 30, y)) 
          }
        }
        // Update cache when dragging
        graphCache.positions = newPositions
        return newPositions
      })
    } else if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x) / zoom,
        y: pan.y + (e.clientY - panStart.y) / zoom
      })
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [dragging, offset, isPanning, panStart, zoom, pan, canvasSize])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      e.preventDefault() // Prevent text selection
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [])

  // Calculate arrow path with curve - supports multiple edges between same nodes
  const getArrowPath = useCallback((from, to, edgeIndex = 0, totalEdges = 1) => {
    if (!from || !to) return ''
    
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist < 1) return ''
    
    // Shorten the line to not overlap with node circles
    const nodeRadius = 25
    const arrowLength = 10
    const ratio1 = nodeRadius / dist
    const ratio2 = (dist - nodeRadius - arrowLength) / dist
    
    const x1 = from.x + dx * ratio1
    const y1 = from.y + dy * ratio1
    const x2 = from.x + dx * ratio2
    const y2 = from.y + dy * ratio2
    
    // Control point for curve - vary based on edge index to separate parallel edges
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    
    // Base curve offset
    let curveOffset = 25
    
    // If multiple edges, spread them out
    if (totalEdges > 1) {
      const spread = 40
      const offsetIndex = edgeIndex - (totalEdges - 1) / 2
      curveOffset = spread + offsetIndex * 30
    }
    
    const perpX = -dy / dist * curveOffset
    const perpY = dx / dist * curveOffset
    
    return `M ${x1} ${y1} Q ${midX + perpX} ${midY + perpY} ${x2} ${y2}`
  }, [])

  // Get arrow head points - adjusted for curved paths
  const getArrowHead = useCallback((from, to, edgeIndex = 0, totalEdges = 1) => {
    if (!from || !to) return ''
    
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist < 1) return ''
    
    const nodeRadius = 25
    
    // Calculate curve offset for arrow direction
    let curveOffset = 25
    if (totalEdges > 1) {
      const spread = 40
      const offsetIndex = edgeIndex - (totalEdges - 1) / 2
      curveOffset = spread + offsetIndex * 30
    }
    
    // Perpendicular offset
    const perpX = -dy / dist * curveOffset
    const perpY = dx / dist * curveOffset
    
    // Approximate the end tangent of the quadratic curve
    // The curve goes from start through control point to end
    const midX = (from.x + to.x) / 2 + perpX
    const midY = (from.y + to.y) / 2 + perpY
    
    // Tangent at end is from control point to end
    const tangentDx = to.x - midX
    const tangentDy = to.y - midY
    const tangentDist = Math.sqrt(tangentDx * tangentDx + tangentDy * tangentDy) || 1
    
    const x = to.x - (tangentDx / tangentDist) * nodeRadius
    const y = to.y - (tangentDy / tangentDist) * nodeRadius
    
    const angle = Math.atan2(tangentDy, tangentDx)
    const arrowSize = 8
    
    const x1 = x - arrowSize * Math.cos(angle - 0.5)
    const y1 = y - arrowSize * Math.sin(angle - 0.5)
    const x2 = x - arrowSize * Math.cos(angle + 0.5)
    const y2 = y - arrowSize * Math.sin(angle + 0.5)
    
    return `M ${x} ${y} L ${x1} ${y1} L ${x2} ${y2} Z`
  }, [])
  
  // Pre-compute edge indices for parallel edges
  const edgeIndices = useMemo(() => {
    const pairCounts = new Map()
    const indices = new Map()
    
    graphData.edges.forEach(edge => {
      const key = [edge.from_track_id, edge.to_track_id].sort().join('-')
      if (!pairCounts.has(key)) pairCounts.set(key, 0)
      indices.set(edge.id, pairCounts.get(key))
      pairCounts.set(key, pairCounts.get(key) + 1)
    })
    
    // Second pass to get totals
    const result = new Map()
    graphData.edges.forEach(edge => {
      const key = [edge.from_track_id, edge.to_track_id].sort().join('-')
      result.set(edge.id, { index: indices.get(edge.id), total: pairCounts.get(key) })
    })
    
    return result
  }, [graphData.edges])

  const outgoingCount = (nodeId) => 
    graphData.edges.filter(e => e.from_track_id === nodeId).length

  const incomingCount = (nodeId) => 
    graphData.edges.filter(e => e.to_track_id === nodeId).length

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setSearchHighlightedId(null)
      return
    }
    const query = searchQuery.toLowerCase()
    const results = graphData.nodes.filter(node => 
      node.title.toLowerCase().includes(query) || 
      node.artist.toLowerCase().includes(query)
    ).slice(0, 8)
    setSearchResults(results)
  }, [searchQuery, graphData.nodes])

  function selectSearchResult(node) {
    setSearchHighlightedId(node.id)
    setSearchQuery('')
    setSearchResults([])
    setSelectedNode(node)
    
    // Pan to the node
    const pos = nodePositions[node.id]
    if (pos) {
      const centerX = canvasSize.width / 2
      const centerY = canvasSize.height / 2
      setPan({ x: centerX - pos.x, y: centerY - pos.y })
    }
  }

  function clearSearchHighlight() {
    setSearchHighlightedId(null)
  }

  return (
    <div className={`graph-page${isFullscreen ? ' fullscreen' : ''}`} ref={graphPageRef}>
      <div className="graph-controls">
        <div className="graph-search">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="graph-search-input"
            />
            {searchHighlightedId && (
              <button className="search-clear-btn" onClick={clearSearchHighlight} title="Clear highlight">
                ×
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(node => (
                <div 
                  key={node.id} 
                  className="search-dropdown-item"
                  onClick={() => selectSearchResult(node)}
                >
                  <span className="search-title">{node.title}</span>
                  <span className="search-artist">{node.artist}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="graph-filter">
          <label>View:</label>
          <select 
            value={viewType} 
            onChange={e => {
              setViewType(e.target.value)
              if (e.target.value === 'all') {
                setSelectedPlaylist(null)
              }
            }}
          >
            <option value="all">All Tracks</option>
            <option value="playlist">By Playlist</option>
          </select>
          
          {viewType === 'playlist' && (
            <select 
              value={selectedPlaylist?.id || ''} 
              onChange={e => {
                const playlist = playlists.find(p => p.id === parseInt(e.target.value))
                setSelectedPlaylist(playlist || null)
              }}
            >
              <option value="">Select Playlist...</option>
              {playlists.map(p => (
                <option key={p.id} value={p.id}>📋 {p.name}</option>
              ))}
            </select>
          )}
        </div>
        
        <div className="graph-stats">
          <span>🎵 {graphData.nodes.length} tracks</span>
          <span>➡️ {graphData.edges.length} transitions</span>
        </div>

        <div className="zoom-controls">
          <button className="btn btn-small" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="btn btn-small" onClick={() => setZoom(z => Math.max(0.1, z / 1.2))}>−</button>
          <button className="btn btn-small btn-secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
          <button 
            className="btn btn-small btn-secondary" 
            onClick={refreshGraph} 
            disabled={isBuilding}
            title="Refresh graph with latest data"
          >
            🔄 Refresh
          </button>
          <button className="btn btn-small btn-secondary" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </div>

      <div className="graph-container" ref={containerRef}>
        {loading ? (
          <div className="graph-loading">Loading graph...</div>
        ) : graphData.nodes.length === 0 ? (
          <div className="graph-empty">
            <h3>No tracks to display</h3>
            <p>{viewType !== 'all' ? 'Add tracks to see the graph' : 'Import some tracks to see the graph'}</p>
          </div>
        ) : isBuilding && !layoutComplete ? (
          <div className="graph-building">
            <div className="building-text">
              Building<span className="building-dots"></span>
            </div>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${layoutProgress}%` }}></div>
            </div>
            <div className="progress-text">{layoutProgress}%</div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleSvgMouseDown}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#e94560" />
              </marker>
            </defs>
            
            <rect width={canvasSize.width} height={canvasSize.height} fill="transparent" />
            
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {graphData.edges.map(edge => {
                const from = nodePositions[edge.from_track_id]
                const to = nodePositions[edge.to_track_id]
                if (!from || !to) return null
                
                const isSelected = selectedEdge?.id === edge.id
                // Only highlight edges that connect consecutive tracks in playlist order
                const edgeKey = `${edge.from_track_id}-${edge.to_track_id}`
                const isHighlighted = highlightedEdgePairs.has(edgeKey)
                // Highlight edges connected to selected node
                const isConnectedToSelectedNode = selectedNode && 
                  (edge.from_track_id === selectedNode.id || edge.to_track_id === selectedNode.id)
                
                // Get edge index for parallel edge differentiation
                const edgeInfo = edgeIndices.get(edge.id) || { index: 0, total: 1 }
                
                // Determine edge colors based on state
                let strokeColor, strokeWidth, fillColor
                if (isSelected) {
                  strokeColor = '#fff'
                  strokeWidth = 3
                  fillColor = '#fff'
                } else if (isConnectedToSelectedNode) {
                  // Outgoing edges are green, incoming are yellow
                  const isOutgoing = edge.from_track_id === selectedNode.id
                  strokeColor = isOutgoing ? '#4ade80' : '#fbbf24'
                  strokeWidth = 2.5
                  fillColor = strokeColor
                } else if (isHighlighted) {
                  strokeColor = '#4ade80'
                  strokeWidth = 3
                  fillColor = '#4ade80'
                } else {
                  strokeColor = `rgba(233, 69, 96, ${0.3 + edge.rating * 0.15})`
                  strokeWidth = 1 + edge.rating * 0.5
                  fillColor = `rgba(233, 69, 96, ${0.5 + edge.rating * 0.1})`
                }
                
                return (
                  <g 
                    key={edge.id} 
                    className={`graph-edge ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isConnectedToSelectedNode ? 'connected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEdge(isSelected ? null : edge)
                      setSelectedNode(null)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Invisible wider path for easier clicking */}
                    <path
                      d={getArrowPath(from, to, edgeInfo.index, edgeInfo.total)}
                      stroke="transparent"
                      strokeWidth={15}
                      fill="none"
                    />
                    <path
                      d={getArrowPath(from, to, edgeInfo.index, edgeInfo.total)}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    <path
                      d={getArrowHead(from, to, edgeInfo.index, edgeInfo.total)}
                      fill={fillColor}
                    />
                  </g>
                )
              })}
              
              {/* Nodes */}
              {graphData.nodes.map(node => {
                const pos = nodePositions[node.id]
                if (!pos) return null
                
                const isSelected = selectedNode?.id === node.id
                const hasOutgoing = outgoingCount(node.id) > 0
                const hasIncoming = incomingCount(node.id) > 0
                const isHighlighted = highlightedTrackIds.size > 0 && highlightedTrackIds.has(node.id)
                const isSearchHighlighted = searchHighlightedId === node.id
                
                // Determine fill color - keep normal colors, only change highlighted ones
                let fillColor
                if (isSelected) {
                  fillColor = '#e94560'
                } else if (isSearchHighlighted) {
                  fillColor = '#f59e0b' // Amber for search highlight
                } else if (isHighlighted) {
                  fillColor = '#22c55e' // Green for highlighted
                } else if (hasOutgoing && hasIncoming) {
                  fillColor = '#2d4a7c'
                } else if (hasOutgoing) {
                  fillColor = '#1a5c3a'
                } else if (hasIncoming) {
                  fillColor = '#5c3a1a'
                } else {
                  fillColor = '#3a3a5c'
                }
                
                return (
                  <g
                    key={node.id}
                    className={`graph-node ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isSearchHighlighted ? 'search-highlighted' : ''}`}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setSelectedNode(isSelected ? null : node)
                      setSelectedEdge(null)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r={isSearchHighlighted ? 30 : isHighlighted ? 28 : 25}
                      fill={fillColor}
                      stroke={isSelected ? '#fff' : isSearchHighlighted ? '#fbbf24' : isHighlighted ? '#4ade80' : '#e94560'}
                      strokeWidth={isSelected ? 3 : isSearchHighlighted ? 4 : isHighlighted ? 3 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.3em"
                      fill="white"
                      fontSize="8"
                      fontWeight="500"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.title.length > 12 ? node.title.substring(0, 10) + '...' : node.title}
                    </text>
                    
                    {/* Transition counts */}
                    {(hasOutgoing || hasIncoming) && (
                      <>
                        {hasOutgoing && (
                          <text x="20" y="-20" fontSize="9" fill="#4ade80">
                            ↗{outgoingCount(node.id)}
                          </text>
                        )}
                        {hasIncoming && (
                          <text x="-30" y="-20" fontSize="9" fill="#fbbf24">
                            ↙{incomingCount(node.id)}
                          </text>
                        )}
                      </>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
        )}

        {/* Node details panel */}
        {selectedNode && (
          <div className="node-details">
            <h3>{selectedNode.title}</h3>
            <p className="artist">{selectedNode.artist}</p>
            <div className="node-meta">
              <span className="bpm-badge">{selectedNode.bpm?.toFixed(1)} BPM</span>
            <span className="key-badge">{selectedNode.key || 'N/A'}</span>
          </div>
          <div className="node-stats">
            <div>
              <strong>{outgoingCount(selectedNode.id)}</strong>
              <span>Outgoing</span>
            </div>
            <div>
              <strong>{incomingCount(selectedNode.id)}</strong>
              <span>Incoming</span>
            </div>
          </div>
          
          {outgoingCount(selectedNode.id) > 0 && (
            <div className="node-transitions">
              <h4>Transitions to:</h4>
              {graphData.edges
                .filter(e => e.from_track_id === selectedNode.id)
                .map(e => {
                  const target = graphData.nodes.find(n => n.id === e.to_track_id)
                  const keyMatch = isInKey(selectedNode.key, target?.key)
                  return (
                    <div key={e.id} className="transition-item" onClick={() => setSelectedNode(target)}>
                      <span className="transition-title">
                        {keyMatch && <span className="key-indicator in-key" title="In Key">🔑</span>}
                        {target?.title}
                      </span>
                      <span className="stars">{'⭐'.repeat(e.rating)}</span>
                    </div>
                  )
                })}
            </div>
          )}
          
          {incomingCount(selectedNode.id) > 0 && (
            <div className="node-transitions">
              <h4>Transitions from:</h4>
              {graphData.edges
                .filter(e => e.to_track_id === selectedNode.id)
                .map(e => {
                  const source = graphData.nodes.find(n => n.id === e.from_track_id)
                  const keyMatch = isInKey(source?.key, selectedNode.key)
                  return (
                    <div key={e.id} className="transition-item" onClick={() => setSelectedNode(source)}>
                      <span className="transition-title">
                        {keyMatch && <span className="key-indicator in-key" title="In Key">🔑</span>}
                        {source?.title}
                      </span>
                      <span className="stars">{'⭐'.repeat(e.rating)}</span>
                    </div>
                  )
                })}
            </div>
          )}
          
          <button className="btn btn-secondary btn-small" onClick={() => setSelectedNode(null)}>
            Close
          </button>
        </div>
      )}

      {/* Edge details panel */}
      {selectedEdge && (() => {
        const fromNode = graphData.nodes.find(n => n.id === selectedEdge.from_track_id)
        const toNode = graphData.nodes.find(n => n.id === selectedEdge.to_track_id)
        return (
          <div className="edge-details">
            <h3>Transition Details</h3>
            
            <div className="edge-tracks">
              <div className="edge-track from">
                <span className="edge-track-label">FROM</span>
                <h4>{fromNode?.title}</h4>
                <p className="artist">{fromNode?.artist}</p>
                <div className="edge-track-meta">
                  <span className="bpm-badge">{fromNode?.bpm?.toFixed(1)} BPM</span>
                  <span className="key-badge">{fromNode?.key || 'N/A'}</span>
                </div>
              </div>
              
              <div className="edge-arrow">↓</div>
              
              <div className="edge-track to">
                <span className="edge-track-label">TO</span>
                <h4>{toNode?.title}</h4>
                <p className="artist">{toNode?.artist}</p>
                <div className="edge-track-meta">
                  <span className="bpm-badge">{toNode?.bpm?.toFixed(1)} BPM</span>
                  <span className="key-badge">{toNode?.key || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="edge-info">
              <div className="edge-info-row">
                <span className="edge-info-label">Type</span>
                <span className="type-badge">{selectedEdge.transition_type}</span>
              </div>
              <div className="edge-info-row">
                <span className="edge-info-label">Rating</span>
                <span className="stars">{'⭐'.repeat(selectedEdge.rating)}{'☆'.repeat(5 - selectedEdge.rating)}</span>
              </div>
              <div className="edge-info-row">
                <span className="edge-info-label">Key Match</span>
                {isInKey(fromNode?.key, toNode?.key) ? (
                  <span className="key-match-badge in-key">🔑 In Key</span>
                ) : (
                  <span className="key-match-badge out-of-key">✗ Out of Key</span>
                )}
              </div>
              {selectedEdge.notes && (
                <div className="edge-info-row notes">
                  <span className="edge-info-label">Notes</span>
                  <p className="edge-notes">{selectedEdge.notes}</p>
                </div>
              )}
            </div>
            
            <div className="edge-actions">
              <button 
                className="btn btn-small" 
                onClick={() => {
                  setSelectedNode(fromNode)
                  setSelectedEdge(null)
                }}
              >
                View From Track
              </button>
              <button 
                className="btn btn-small" 
                onClick={() => {
                  setSelectedNode(toNode)
                  setSelectedEdge(null)
                }}
              >
                View To Track
              </button>
            </div>
            
            <button className="btn btn-secondary btn-small" onClick={() => setSelectedEdge(null)}>
              Close
            </button>
          </div>
        )
      })()}
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <h4>A song has...</h4>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#2d4a7c' }}></span>
          <span>Transitions both ways</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#1a5c3a' }}></span>
          <span>Only transitions from</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#5c3a1a' }}></span>
          <span>Only transitions to</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#3a3a5c' }}></span>
          <span>No transitions</span>
        </div>
      </div>
    </div>
  )
}

export default Graph

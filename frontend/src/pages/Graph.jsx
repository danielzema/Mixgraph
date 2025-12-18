import { useState, useEffect, useRef, useCallback } from 'react'
import { getGraphData, getFolderGraphData, getPlaylistGraphData, getFolders, getPlaylists } from '../api'

function Graph() {
  const [folders, setFolders] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [viewType, setViewType] = useState('all') // 'all', 'folder', 'playlist'
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [nodePositions, setNodePositions] = useState({})
  const [dragging, setDragging] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    getFolders().then(setFolders)
    getPlaylists().then(setPlaylists)
  }, [])

  useEffect(() => {
    loadGraph()
  }, [viewType, selectedFolder, selectedPlaylist])

  async function loadGraph() {
    setLoading(true)
    try {
      let data
      if (viewType === 'folder' && selectedFolder) {
        data = await getFolderGraphData(selectedFolder.id)
      } else if (viewType === 'playlist' && selectedPlaylist) {
        data = await getPlaylistGraphData(selectedPlaylist.id)
      } else {
        data = await getGraphData()
      }
      setGraphData(data)
      
      // Initialize positions in a circle layout
      const positions = {}
      const nodeCount = data.nodes.length
      const centerX = 400
      const centerY = 300
      const radius = Math.min(250, Math.max(150, nodeCount * 15))
      
      data.nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2
        positions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        }
      })
      setNodePositions(positions)
    } catch (err) {
      console.error('Failed to load graph:', err)
    }
    setLoading(false)
  }

  // Apply simple force-directed layout
  useEffect(() => {
    if (graphData.nodes.length === 0) return
    
    let animationFrame
    let iterations = 0
    const maxIterations = 100
    
    function applyForces() {
      if (iterations >= maxIterations) return
      
      setNodePositions(prev => {
        const newPositions = { ...prev }
        const nodes = graphData.nodes
        const edges = graphData.edges
        
        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeA = nodes[i]
            const nodeB = nodes[j]
            const posA = newPositions[nodeA.id]
            const posB = newPositions[nodeB.id]
            
            if (!posA || !posB) continue
            
            const dx = posB.x - posA.x
            const dy = posB.y - posA.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = 5000 / (dist * dist)
            
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            
            newPositions[nodeA.id] = { x: posA.x - fx, y: posA.y - fy }
            newPositions[nodeB.id] = { x: posB.x + fx, y: posB.y + fy }
          }
        }
        
        // Attraction along edges
        edges.forEach(edge => {
          const posA = newPositions[edge.from_track_id]
          const posB = newPositions[edge.to_track_id]
          
          if (!posA || !posB) return
          
          const dx = posB.x - posA.x
          const dy = posB.y - posA.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - 150) * 0.05
          
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          
          newPositions[edge.from_track_id] = { x: posA.x + fx, y: posA.y + fy }
          newPositions[edge.to_track_id] = { x: posB.x - fx, y: posB.y - fy }
        })
        
        // Keep nodes in bounds
        Object.keys(newPositions).forEach(id => {
          newPositions[id].x = Math.max(50, Math.min(750, newPositions[id].x))
          newPositions[id].y = Math.max(50, Math.min(550, newPositions[id].y))
        })
        
        return newPositions
      })
      
      iterations++
      if (iterations < maxIterations) {
        animationFrame = requestAnimationFrame(applyForces)
      }
    }
    
    animationFrame = requestAnimationFrame(applyForces)
    return () => cancelAnimationFrame(animationFrame)
  }, [graphData])

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
      
      setNodePositions(prev => ({
        ...prev,
        [dragging]: { x: Math.max(30, Math.min(770, x)), y: Math.max(30, Math.min(570, y)) }
      }))
    } else if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x) / zoom,
        y: pan.y + (e.clientY - panStart.y) / zoom
      })
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [dragging, offset, isPanning, panStart, zoom, pan])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === 'rect') {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)))
  }, [])

  // Calculate arrow path with curve
  function getArrowPath(from, to) {
    if (!from || !to) return ''
    
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    // Shorten the line to not overlap with node circles
    const nodeRadius = 25
    const arrowLength = 10
    const ratio1 = nodeRadius / dist
    const ratio2 = (dist - nodeRadius - arrowLength) / dist
    
    const x1 = from.x + dx * ratio1
    const y1 = from.y + dy * ratio1
    const x2 = from.x + dx * ratio2
    const y2 = from.y + dy * ratio2
    
    // Control point for curve
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const perpX = -dy / dist * 30
    const perpY = dx / dist * 30
    
    return `M ${x1} ${y1} Q ${midX + perpX} ${midY + perpY} ${x2} ${y2}`
  }

  // Get arrow head points
  function getArrowHead(from, to) {
    if (!from || !to) return ''
    
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const nodeRadius = 25
    
    const x = to.x - (dx / dist) * nodeRadius
    const y = to.y - (dy / dist) * nodeRadius
    
    const angle = Math.atan2(dy, dx)
    const arrowSize = 8
    
    const x1 = x - arrowSize * Math.cos(angle - 0.5)
    const y1 = y - arrowSize * Math.sin(angle - 0.5)
    const x2 = x - arrowSize * Math.cos(angle + 0.5)
    const y2 = y - arrowSize * Math.sin(angle + 0.5)
    
    return `M ${x} ${y} L ${x1} ${y1} L ${x2} ${y2} Z`
  }

  const outgoingCount = (nodeId) => 
    graphData.edges.filter(e => e.from_track_id === nodeId).length

  const incomingCount = (nodeId) => 
    graphData.edges.filter(e => e.to_track_id === nodeId).length

  return (
    <div className="graph-page">
      <div className="graph-controls">
        <div className="graph-filter">
          <label>View:</label>
          <select 
            value={viewType} 
            onChange={e => {
              setViewType(e.target.value)
              if (e.target.value === 'all') {
                setSelectedFolder(null)
                setSelectedPlaylist(null)
              }
            }}
          >
            <option value="all">All Tracks</option>
            <option value="folder">By Folder</option>
            <option value="playlist">By Playlist</option>
          </select>
          
          {viewType === 'folder' && (
            <select 
              value={selectedFolder?.id || ''} 
              onChange={e => {
                const folder = folders.find(f => f.id === parseInt(e.target.value))
                setSelectedFolder(folder || null)
              }}
            >
              <option value="">Select Folder...</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>📁 {f.name} ({f.track_count})</option>
              ))}
            </select>
          )}
          
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
          <button className="btn btn-small" onClick={() => setZoom(z => Math.max(0.3, z / 1.2))}>−</button>
          <button className="btn btn-small btn-secondary" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
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
        ) : (
          <svg
            ref={svgRef}
            viewBox="0 0 800 600"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={handleSvgMouseDown}
            onWheel={handleWheel}
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
            
            <rect width="800" height="600" fill="transparent" />
            
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {graphData.edges.map(edge => {
                const from = nodePositions[edge.from_track_id]
                const to = nodePositions[edge.to_track_id]
                if (!from || !to) return null
                
                return (
                  <g key={edge.id} className="graph-edge">
                    <path
                      d={getArrowPath(from, to)}
                      stroke={`rgba(233, 69, 96, ${0.3 + edge.rating * 0.15})`}
                      strokeWidth={1 + edge.rating * 0.5}
                      fill="none"
                    />
                    <path
                      d={getArrowHead(from, to)}
                      fill={`rgba(233, 69, 96, ${0.5 + edge.rating * 0.1})`}
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
                
                return (
                  <g
                    key={node.id}
                    className={`graph-node ${isSelected ? 'selected' : ''}`}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={e => handleMouseDown(e, node.id)}
                    onClick={() => setSelectedNode(isSelected ? null : node)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      r={25}
                      fill={isSelected ? '#e94560' : hasOutgoing && hasIncoming ? '#2d4a7c' : hasOutgoing ? '#1a5c3a' : hasIncoming ? '#5c3a1a' : '#3a3a5c'}
                      stroke={isSelected ? '#fff' : '#e94560'}
                      strokeWidth={isSelected ? 3 : 1.5}
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
      </div>

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
                  return (
                    <div key={e.id} className="transition-item" onClick={() => setSelectedNode(target)}>
                      <span>{target?.title}</span>
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

      {/* Legend */}
      <div className="graph-legend">
        <h4>Legend</h4>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#2d4a7c' }}></span>
          <span>Has transitions both ways</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#1a5c3a' }}></span>
          <span>Only outgoing transitions</span>
        </div>
        <div className="legend-item">
          <span className="legend-circle" style={{ background: '#5c3a1a' }}></span>
          <span>Only incoming transitions</span>
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

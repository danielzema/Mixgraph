import { useState, useEffect, useRef } from 'react'
import { 
  getPlaylists, 
  createPlaylist, 
  deletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  getTransitions
} from '../api'
import TrackBrowser from '../components/TrackBrowser'

function Playlists() {
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [allTransitions, setAllTransitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistTracks(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  async function loadData() {
    setLoading(true)
    const [playlistsData, transitionsData] = await Promise.all([
      getPlaylists(),
      getTransitions()
    ])
    setPlaylists(playlistsData)
    setAllTransitions(transitionsData)
    setLoading(false)
  }

  async function loadPlaylistTracks(playlistId) {
    const data = await getPlaylistTracks(playlistId)
    setPlaylistTracks(data)
  }

  async function handleCreatePlaylist(e) {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    const result = await createPlaylist(newPlaylistName.trim())
    setNewPlaylistName('')
    setShowNewPlaylist(false)
    await loadData()
    // Select the newly created playlist
    setSelectedPlaylist({ id: result.id, name: result.name, track_count: 0 })
  }

  async function handleDeletePlaylist(playlist) {
    if (confirm(`Delete playlist "${playlist.name}"?\n\nTracks won't be deleted from your library.`)) {
      await deletePlaylist(playlist.id)
      if (selectedPlaylist?.id === playlist.id) {
        setSelectedPlaylist(null)
        setPlaylistTracks([])
      }
      loadData()
    }
  }

  async function handleAddTrack(track) {
    if (!selectedPlaylist) return
    await addTrackToPlaylist(selectedPlaylist.id, track.id)
    await loadPlaylistTracks(selectedPlaylist.id)
    loadData()
  }

  async function handleRemoveTrack(position) {
    await removeTrackFromPlaylist(selectedPlaylist.id, position)
    await loadPlaylistTracks(selectedPlaylist.id)
    loadData()
  }

  // Get transition between two tracks if it exists
  function getTransitionBetween(fromId, toId) {
    return allTransitions.find(t => t.from_track_id === fromId && t.to_track_id === toId)
  }

  // Move track up in the list
  async function moveTrackUp(index) {
    if (index <= 0) return
    const pos1 = playlistTracks[index].position
    const pos2 = playlistTracks[index - 1].position
    await reorderPlaylistTracks(selectedPlaylist.id, pos1, pos2)
    await loadPlaylistTracks(selectedPlaylist.id)
  }

  // Move track down in the list
  async function moveTrackDown(index) {
    if (index >= playlistTracks.length - 1) return
    const pos1 = playlistTracks[index].position
    const pos2 = playlistTracks[index + 1].position
    await reorderPlaylistTracks(selectedPlaylist.id, pos1, pos2)
    await loadPlaylistTracks(selectedPlaylist.id)
  }

  // Drag and drop handlers
  function handleDragStart(e, index) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave(e) {
    setDragOverIndex(null)
  }

  async function handleDrop(e, targetIndex) {
    e.preventDefault()
    setDragOverIndex(null)
    
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      return
    }

    const pos1 = playlistTracks[draggedIndex].position
    const pos2 = playlistTracks[targetIndex].position
    await reorderPlaylistTracks(selectedPlaylist.id, pos1, pos2)
    await loadPlaylistTracks(selectedPlaylist.id)
    setDraggedIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="playlists-page">
      {/* Sidebar - Playlist List */}
      <div className="playlists-sidebar">
        <div className="sidebar-header">
          <h3>📕 Playlists</h3>
          <button 
            className="btn btn-small"
            onClick={() => setShowNewPlaylist(true)}
            title="New Playlist"
          >
            +
          </button>
        </div>

        {showNewPlaylist && (
          <form onSubmit={handleCreatePlaylist} className="new-folder-form">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              autoFocus
            />
            <div className="form-actions">
              <button type="submit" className="btn btn-small">Create</button>
              <button 
                type="button" 
                className="btn btn-small btn-secondary"
                onClick={() => { setShowNewPlaylist(false); setNewPlaylistName('') }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="playlist-list">
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : playlists.length === 0 ? (
            <p className="empty-text">No playlists yet</p>
          ) : (
            playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`playlist-item ${selectedPlaylist?.id === playlist.id ? 'active' : ''}`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <span className="playlist-icon">📕</span>
                <span className="playlist-name">{playlist.name}</span>
                <span className="playlist-count">{playlist.track_count}</span>
                <button
                  className="playlist-delete"
                  onClick={e => { e.stopPropagation(); handleDeletePlaylist(playlist) }}
                  title="Delete playlist"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-hint">
          <small>💡 Create a playlist to build your DJ sets with ordered transitions</small>
        </div>
      </div>

      {/* Main Content */}
      <div className="playlists-main">
        {!selectedPlaylist ? (
          <div className="card empty-state-card">
            <h2>Select a Playlist</h2>
            <p>Choose a playlist from the sidebar to start building your set.</p>
          </div>
        ) : (
          <div className="card playlist-editor">
            <div className="playlist-header">
              <div>
                <h2>📕 {selectedPlaylist.name}</h2>
                <p className="playlist-subtitle">
                  {playlistTracks.length} tracks • {playlistTracks.length > 1 ? `${playlistTracks.length - 1} transitions` : 'No transitions yet'}
                </p>
              </div>
              <div className="playlist-actions">
                <button className="btn" onClick={() => setShowAddTrack(true)}>
                  + Add Track
                </button>
              </div>
            </div>

            {playlistTracks.length === 0 ? (
              <div className="empty-playlist">
                <div className="drop-zone-large">
                  <span className="drop-icon">🎵</span>
                  <h3>Add tracks to your playlist</h3>
                  <p>Click "Add Track" to browse your library and track folders</p>
                </div>
              </div>
            ) : (
              <div className="setlist">
                {playlistTracks.map((track, index) => {
                  const nextTrack = playlistTracks[index + 1]
                  const transition = nextTrack ? getTransitionBetween(track.id, nextTrack.id) : null
                  
                  return (
                    <div 
                      key={`${track.id}-${index}`} 
                      className={`setlist-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="setlist-track">
                        <div className="drag-handle" title="Drag to reorder">⋮⋮</div>
                        <div className="track-number">{index + 1}</div>
                        <div className="track-info">
                          <div className="track-title">{track.title}</div>
                          <div className="track-artist">{track.artist}</div>
                        </div>
                        <div className="track-badges">
                          <span className="bpm-badge">{track.bpm?.toFixed(1)}</span>
                          <span className="key-badge">{track.key || 'N/A'}</span>
                        </div>
                        <div className="track-controls">
                          <button 
                            className="control-btn"
                            onClick={() => moveTrackUp(index)}
                            disabled={index === 0}
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button 
                            className="control-btn"
                            onClick={() => moveTrackDown(index)}
                            disabled={index === playlistTracks.length - 1}
                            title="Move down"
                          >
                            ▼
                          </button>
                          <button 
                            className="control-btn remove"
                            onClick={() => handleRemoveTrack(track.position)}
                            title="Remove from playlist"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {/* Transition indicator */}
                      {nextTrack && (
                        <div className={`transition-indicator ${transition ? 'has-transition' : 'no-transition'}`}>
                          {transition ? (
                            <>
                              {transition.comment && (
                                <div className="transition-comment">💬 {transition.comment}</div>
                              )}
                              <div className="transition-row">
                                <span className="transition-arrow">↓</span>
                                <span className="transition-type">{transition.transition_type}</span>
                                <span className="transition-rating">
                                  {'⭐'.repeat(transition.rating)}
                                  <span className="empty-stars">{'☆'.repeat(5 - transition.rating)}</span>
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="transition-row">
                              <span className="transition-arrow missing">↓</span>
                              <span className="no-transition-text">No transition defined</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Track Modal */}
      {showAddTrack && selectedPlaylist && (
        <div className="modal-overlay" onClick={() => setShowAddTrack(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Track to {selectedPlaylist.name}</h2>
              <button className="modal-close" onClick={() => setShowAddTrack(false)}>×</button>
            </div>
            
            <TrackBrowser 
              onSelect={(track) => {
                handleAddTrack(track)
              }}
              excludeIds={[]}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Playlists

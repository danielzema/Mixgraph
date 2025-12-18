import { useState, useEffect, useRef } from 'react'
import { 
  getFolders, 
  createFolder, 
  deleteFolder,
  getFolderTracks,
  addTrackToFolder,
  removeTrackFromFolder,
  importRekordboxToFolder,
  getTransitions
} from '../api'
import TrackBrowser from '../components/TrackBrowser'

function Playlists() {
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [folderTracks, setFolderTracks] = useState([])
  const [allTransitions, setAllTransitions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      loadFolderTracks(selectedFolder.id)
    }
  }, [selectedFolder])

  async function loadData() {
    setLoading(true)
    const [foldersData, transitionsData] = await Promise.all([
      getFolders(),
      getTransitions()
    ])
    setFolders(foldersData)
    setAllTransitions(transitionsData)
    setLoading(false)
  }

  async function loadFolderTracks(folderId) {
    const data = await getFolderTracks(folderId)
    setFolderTracks(data)
  }

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    const result = await createFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolder(false)
    await loadData()
    // Select the newly created folder
    setSelectedFolder({ id: result.id, name: result.name, track_count: 0 })
  }

  async function handleDeleteFolder(folder) {
    if (confirm(`Delete playlist "${folder.name}"?\n\nTracks won't be deleted from your library.`)) {
      await deleteFolder(folder.id)
      if (selectedFolder?.id === folder.id) {
        setSelectedFolder(null)
        setFolderTracks([])
      }
      loadData()
    }
  }

  async function handleAddTrack(track) {
    if (!selectedFolder) return
    const result = await addTrackToFolder(selectedFolder.id, track.id)
    if (result.error) {
      alert(result.error)
    } else {
      await loadFolderTracks(selectedFolder.id)
      loadData()
    }
  }

  async function handleRemoveTrack(trackId) {
    await removeTrackFromFolder(selectedFolder.id, trackId)
    await loadFolderTracks(selectedFolder.id)
    loadData()
  }

  // Get transition between two tracks if it exists
  function getTransitionBetween(fromId, toId) {
    return allTransitions.find(t => t.from_track_id === fromId && t.to_track_id === toId)
  }

  // Drag and drop for file import
  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    
    if (!selectedFolder) return
    
    const files = Array.from(e.dataTransfer.files)
    const txtFile = files.find(f => f.name.endsWith('.txt'))
    
    if (txtFile) {
      setImporting(true)
      try {
        const result = await importRekordboxToFolder(selectedFolder.id, txtFile)
        if (result.success) {
          alert(`Imported ${result.imported} tracks from ${txtFile.name}`)
          await loadFolderTracks(selectedFolder.id)
          loadData()
        } else {
          alert(`Import failed: ${result.error}`)
        }
      } catch (err) {
        alert(`Import failed: ${err.message}`)
      }
      setImporting(false)
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file || !selectedFolder) return
    
    setImporting(true)
    try {
      const result = await importRekordboxToFolder(selectedFolder.id, file)
      if (result.success) {
        alert(`Imported ${result.imported} tracks from ${file.name}`)
        await loadFolderTracks(selectedFolder.id)
        loadData()
      } else {
        alert(`Import failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`)
    }
    setImporting(false)
    e.target.value = ''
  }

  // Move track up in the list
  async function moveTrackUp(index) {
    if (index <= 0) return
    // This would require a backend endpoint to reorder - for now just visual feedback
    const newTracks = [...folderTracks]
    const temp = newTracks[index]
    newTracks[index] = newTracks[index - 1]
    newTracks[index - 1] = temp
    setFolderTracks(newTracks)
  }

  // Move track down in the list
  async function moveTrackDown(index) {
    if (index >= folderTracks.length - 1) return
    const newTracks = [...folderTracks]
    const temp = newTracks[index]
    newTracks[index] = newTracks[index + 1]
    newTracks[index + 1] = temp
    setFolderTracks(newTracks)
  }

  return (
    <div className="playlists-page">
      {/* Sidebar - Playlist List */}
      <div className="playlists-sidebar">
        <div className="sidebar-header">
          <h3>📋 Playlists</h3>
          <button 
            className="btn btn-small"
            onClick={() => setShowNewFolder(true)}
            title="New Playlist"
          >
            +
          </button>
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="new-folder-form">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              autoFocus
            />
            <div className="form-actions">
              <button type="submit" className="btn btn-small">Create</button>
              <button 
                type="button" 
                className="btn btn-small btn-secondary"
                onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="playlist-list">
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : folders.length === 0 ? (
            <p className="empty-text">No playlists yet</p>
          ) : (
            folders.map(folder => (
              <div
                key={folder.id}
                className={`playlist-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
                onClick={() => setSelectedFolder(folder)}
              >
                <span className="playlist-icon">📋</span>
                <span className="playlist-name">{folder.name}</span>
                <span className="playlist-count">{folder.track_count}</span>
                <button
                  className="playlist-delete"
                  onClick={e => { e.stopPropagation(); handleDeleteFolder(folder) }}
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
        {!selectedFolder ? (
          <div className="card empty-state-card">
            <h2>📋 Select a Playlist</h2>
            <p>Choose a playlist from the sidebar or create a new one to start building your set.</p>
            <button className="btn" onClick={() => setShowNewFolder(true)}>
              + Create New Playlist
            </button>
          </div>
        ) : (
          <div 
            className={`card playlist-editor ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="playlist-header">
              <div>
                <h2>📋 {selectedFolder.name}</h2>
                <p className="playlist-subtitle">
                  {folderTracks.length} tracks • {folderTracks.length > 1 ? `${folderTracks.length - 1} transitions` : 'No transitions yet'}
                </p>
              </div>
              <div className="playlist-actions">
                <button className="btn" onClick={() => setShowAddTrack(true)}>
                  + Add Track
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : '📥 Import .txt'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            {folderTracks.length === 0 ? (
              <div className="empty-playlist">
                <div className="drop-zone-large">
                  <span className="drop-icon">📥</span>
                  <h3>Add tracks to your playlist</h3>
                  <p>Click "Add Track" to browse your library, or drag a Rekordbox .txt file here</p>
                </div>
              </div>
            ) : (
              <div className="setlist">
                {folderTracks.map((track, index) => {
                  const nextTrack = folderTracks[index + 1]
                  const transition = nextTrack ? getTransitionBetween(track.id, nextTrack.id) : null
                  
                  return (
                    <div key={track.id} className="setlist-item">
                      <div className="setlist-track">
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
                            ↑
                          </button>
                          <button 
                            className="control-btn"
                            onClick={() => moveTrackDown(index)}
                            disabled={index === folderTracks.length - 1}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button 
                            className="control-btn remove"
                            onClick={() => handleRemoveTrack(track.id)}
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
                              <span className="transition-arrow">↓</span>
                              <span className="transition-type">{transition.transition_type}</span>
                              <span className="transition-rating">{'⭐'.repeat(transition.rating)}</span>
                            </>
                          ) : (
                            <>
                              <span className="transition-arrow missing">↓</span>
                              <span className="no-transition-text">No transition defined</span>
                            </>
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
      {showAddTrack && selectedFolder && (
        <div className="modal-overlay" onClick={() => setShowAddTrack(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Track to {selectedFolder.name}</h2>
              <button className="modal-close" onClick={() => setShowAddTrack(false)}>×</button>
            </div>
            
            <TrackBrowser 
              onSelect={(track) => {
                handleAddTrack(track)
              }}
              excludeIds={folderTracks.map(t => t.id)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Playlists

import { useState, useEffect, useRef } from 'react'
import { 
  getTracks, 
  deleteTrack, 
  getFolders, 
  createFolder, 
  deleteFolder,
  getFolderTracks,
  removeTrackFromFolder,
  importRekordboxToFolder,
  addTrackToFolder
} from '../api'

function Tracks() {
  const [tracks, setTracks] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [folderTracks, setFolderTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOver, setDragOver] = useState(null)
  const [importing, setImporting] = useState(false)
  const [showAddTrack, setShowAddTrack] = useState(false)
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
    const [tracksData, foldersData] = await Promise.all([
      getTracks(),
      getFolders()
    ])
    setTracks(tracksData)
    setFolders(foldersData)
    setLoading(false)
  }

  async function loadFolderTracks(folderId) {
    const data = await getFolderTracks(folderId)
    setFolderTracks(data)
  }

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim())
    setNewFolderName('')
    setShowNewFolder(false)
    loadData()
  }

  async function handleDeleteFolder(folder) {
    if (confirm(`Delete folder "${folder.name}"?\n\nTracks won't be deleted, just removed from this folder.`)) {
      await deleteFolder(folder.id)
      if (selectedFolder?.id === folder.id) {
        setSelectedFolder(null)
        setFolderTracks([])
      }
      loadData()
    }
  }

  async function handleDeleteTrack(id, title) {
    if (confirm(`Remove "${title}" from the database?\n\nThis will also remove all transitions involving this track.`)) {
      await deleteTrack(id)
      loadData()
      if (selectedFolder) {
        loadFolderTracks(selectedFolder.id)
      }
    }
  }

  async function handleRemoveFromFolder(trackId, title) {
    if (confirm(`Remove "${title}" from this folder?`)) {
      await removeTrackFromFolder(selectedFolder.id, trackId)
      loadFolderTracks(selectedFolder.id)
      loadData() // Refresh folder track counts
    }
  }

  // Drag and drop handlers
  function handleDragOver(e, folderId) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(folderId)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(null)
  }

  async function handleDrop(e, folderId) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(null)
    
    const files = Array.from(e.dataTransfer.files)
    const txtFile = files.find(f => f.name.endsWith('.txt'))
    
    if (txtFile) {
      setImporting(true)
      try {
        const result = await importRekordboxToFolder(folderId, txtFile)
        if (result.success) {
          alert(`Imported ${result.imported} tracks from ${txtFile.name}`)
          loadData()
          if (selectedFolder?.id === folderId) {
            loadFolderTracks(folderId)
          }
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
        loadData()
        loadFolderTracks(selectedFolder.id)
      } else {
        alert(`Import failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Import failed: ${err.message}`)
    }
    setImporting(false)
    e.target.value = ''
  }

  async function handleAddExistingTrack(trackId) {
    if (!selectedFolder) return
    const result = await addTrackToFolder(selectedFolder.id, trackId)
    if (result.error) {
      alert(result.error)
    } else {
      loadFolderTracks(selectedFolder.id)
      loadData()
      setShowAddTrack(false)
      setSearch('')
    }
  }

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.artist.toLowerCase().includes(search.toLowerCase())
  )

  const displayTracks = selectedFolder ? folderTracks : filteredTracks

  return (
    <div className="tracks-layout">
      {/* Sidebar - Folders */}
      <div className="folders-sidebar">
        <div className="sidebar-header">
          <h3>📁 Playlists</h3>
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

        <div 
          className={`folder-item ${!selectedFolder ? 'active' : ''}`}
          onClick={() => { setSelectedFolder(null); setFolderTracks([]) }}
        >
          <span className="folder-icon">🎵</span>
          <span className="folder-name">All Tracks</span>
          <span className="folder-count">{tracks.length}</span>
        </div>

        {folders.map(folder => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolder?.id === folder.id ? 'active' : ''} ${dragOver === folder.id ? 'drag-over' : ''}`}
            onClick={() => setSelectedFolder(folder)}
            onDragOver={e => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, folder.id)}
          >
            <span className="folder-icon">📁</span>
            <span className="folder-name">{folder.name}</span>
            <span className="folder-count">{folder.track_count}</span>
            <button
              className="folder-delete"
              onClick={e => { e.stopPropagation(); handleDeleteFolder(folder) }}
              title="Delete playlist"
            >
              ×
            </button>
          </div>
        ))}

        <div className="drop-hint">
          <small>💡 Drag a Rekordbox .txt file onto a playlist to import</small>
        </div>
      </div>

      {/* Main Content - Tracks */}
      <div className="tracks-main">
        <div className="card">
          <div className="tracks-header">
            <h2>
              {selectedFolder ? (
                <>📁 {selectedFolder.name}</>
              ) : (
                <>🎵 All Tracks ({tracks.length})</>
              )}
            </h2>
            
            {selectedFolder && (
              <div className="folder-actions">
                <button 
                  className="btn"
                  onClick={() => setShowAddTrack(true)}
                >
                  Add Track
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : 'Import .txt'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>

          {!selectedFolder && (
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search tracks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Drop zone for selected folder */}
          {selectedFolder && (
            <div 
              className={`drop-zone ${dragOver === selectedFolder.id ? 'active' : ''}`}
              onDragOver={e => handleDragOver(e, selectedFolder.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, selectedFolder.id)}
            >
              <div className="drop-zone-content">
                <span className="drop-icon">📥</span>
                <span>Drop Rekordbox .txt file here to import</span>
              </div>
            </div>
          )}

          {loading ? (
            <p>Loading...</p>
          ) : displayTracks.length === 0 ? (
            <div className="empty-state">
              <h3>{selectedFolder ? 'Empty playlist' : 'No tracks found'}</h3>
              <p>
                {selectedFolder 
                  ? 'Drag a Rekordbox .txt file here or click "Import .txt"'
                  : 'Import tracks using the playlist feature'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>BPM</th>
                    <th>Key</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTracks.map((track, idx) => (
                    <tr key={track.id}>
                      <td>{idx + 1}</td>
                      <td>{track.title}</td>
                      <td>{track.artist}</td>
                      <td><span className="bpm-badge">{track.bpm?.toFixed(1)}</span></td>
                      <td><span className="key-badge">{track.key || 'N/A'}</span></td>
                      <td className="actions">
                        {selectedFolder ? (
                          <button 
                            className="btn btn-secondary btn-small"
                            onClick={() => handleRemoveFromFolder(track.id, track.title)}
                          >
                            Remove
                          </button>
                        ) : (
                          <button 
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeleteTrack(track.id, track.title)}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Track Modal */}
      {showAddTrack && selectedFolder && (
        <div className="modal-overlay" onClick={() => { setShowAddTrack(false); setSearch('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Track to {selectedFolder.name}</h2>
            
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search for a track..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {search.length >= 2 && (
              <div className="search-results-list">
                {filteredTracks.slice(0, 10).map(track => (
                  <div 
                    key={track.id}
                    className="search-result-item"
                    onClick={() => handleAddExistingTrack(track.id)}
                  >
                    <div className="track-info">
                      <strong>{track.title}</strong>
                      <span>{track.artist}</span>
                    </div>
                    <div className="track-meta">
                      <span className="bpm-badge">{track.bpm?.toFixed(1)}</span>
                      <span className="key-badge">{track.key || 'N/A'}</span>
                    </div>
                  </div>
                ))}
                {filteredTracks.length === 0 && (
                  <p className="no-results">No tracks found</p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => { setShowAddTrack(false); setSearch('') }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tracks

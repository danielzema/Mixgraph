import { useState, useEffect } from 'react'
import { getTracks, getFolders, getFolderTracks } from '../api'

function TrackBrowser({ onSelect, excludeIds = [] }) {
  const [tracks, setTracks] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [folderTracks, setFolderTracks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('search') // 'search', 'browse', or 'folders'

  useEffect(() => {
    Promise.all([getTracks(), getFolders()]).then(([tracksData, foldersData]) => {
      setTracks(tracksData)
      setFolders(foldersData)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      getFolderTracks(selectedFolder.id).then(setFolderTracks)
    }
  }, [selectedFolder])

  const currentTracks = selectedFolder ? folderTracks : tracks
  
  const filteredTracks = currentTracks
    .filter(t => !excludeIds.includes(t.id))
    .filter(t => {
      if (viewMode === 'search' && search.length < 2) return false
      if (search.length >= 2) {
        return t.title.toLowerCase().includes(search.toLowerCase()) ||
               t.artist.toLowerCase().includes(search.toLowerCase())
      }
      return true
    })

  const displayTracks = viewMode === 'search' 
    ? filteredTracks.slice(0, 15) 
    : filteredTracks

  function handleFolderSelect(folder) {
    setSelectedFolder(folder)
    setViewMode('folders')
  }

  function handleBackToFolders() {
    setSelectedFolder(null)
    setFolderTracks([])
  }

  return (
    <div className="track-browser">
      <div className="browser-tabs">
        <button 
          className={`browser-tab ${viewMode === 'search' ? 'active' : ''}`}
          onClick={() => { setViewMode('search'); setSelectedFolder(null) }}
        >
          🔍 Search
        </button>
        <button 
          className={`browser-tab ${viewMode === 'browse' ? 'active' : ''}`}
          onClick={() => { setViewMode('browse'); setSelectedFolder(null) }}
        >
          📚 All Tracks
        </button>
        <button 
          className={`browser-tab ${viewMode === 'folders' ? 'active' : ''}`}
          onClick={() => { setViewMode('folders'); setSelectedFolder(null) }}
        >
          📁 Playlists
        </button>
      </div>

      {/* Folder browser */}
      {viewMode === 'folders' && !selectedFolder && (
        <div className="browser-folders">
          {folders.length === 0 ? (
            <p className="browser-hint">No playlists yet</p>
          ) : (
            <div className="browser-folder-list">
              {folders.map(folder => (
                <div 
                  key={folder.id}
                  className="browser-folder-item"
                  onClick={() => handleFolderSelect(folder)}
                >
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">{folder.name}</span>
                  <span className="folder-count">{folder.track_count} tracks</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Folder header when viewing folder contents */}
      {viewMode === 'folders' && selectedFolder && (
        <div className="browser-folder-header">
          <button className="btn btn-small btn-secondary" onClick={handleBackToFolders}>
            ← Back
          </button>
          <span className="folder-title">📁 {selectedFolder.name}</span>
        </div>
      )}

      {/* Search/filter bar - show for search, browse, or when viewing folder contents */}
      {(viewMode !== 'folders' || selectedFolder) && (
        <div className="browser-search">
          <input
            type="text"
            className="form-input"
            placeholder={viewMode === 'search' ? "Type to search..." : "Filter tracks..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus={viewMode === 'search'}
          />
        </div>
      )}

      {loading ? (
        <p className="browser-hint" style={{ padding: 20 }}>Loading tracks...</p>
      ) : (viewMode !== 'folders' || selectedFolder) && (
        <div className="browser-results">
          {viewMode === 'search' && search.length < 2 ? (
            <p className="browser-hint">Type at least 2 characters to search</p>
          ) : displayTracks.length === 0 ? (
            <p className="browser-hint">No tracks found</p>
          ) : (
            <>
              <p className="browser-count">{displayTracks.length} tracks</p>
              <div className="browser-list">
                {displayTracks.map(track => (
                  <div 
                    key={track.id}
                    className="browser-track"
                    onClick={() => onSelect(track)}
                  >
                    <div className="track-info">
                      <div className="track-title">{track.title}</div>
                      <div className="track-artist">{track.artist}</div>
                    </div>
                    <div className="track-badges">
                      <span className="bpm-badge">{track.bpm?.toFixed(1)}</span>
                      <span className="key-badge">{track.key || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackBrowser

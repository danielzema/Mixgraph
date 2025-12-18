import { useState, useEffect } from 'react'
import { getTracks, getFolders, getFolderTracks, getPlaylists, getPlaylistTracks } from '../api'

function TrackBrowser({ onSelect, excludeIds = [], mode = 'tracks' }) {
  const [searchMode, setSearchMode] = useState(mode) // 'tracks' or 'playlists'
  const [tracks, setTracks] = useState([])
  const [folders, setFolders] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [folderTracks, setFolderTracks] = useState([])
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTracks(), getFolders(), getPlaylists()]).then(([tracksData, foldersData, playlistsData]) => {
      setTracks(tracksData)
      setFolders(foldersData)
      setPlaylists(playlistsData)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      getFolderTracks(selectedFolder.id).then(setFolderTracks)
    } else {
      setFolderTracks([])
    }
  }, [selectedFolder])

  useEffect(() => {
    if (selectedPlaylist) {
      getPlaylistTracks(selectedPlaylist.id).then(setPlaylistTracks)
    } else {
      setPlaylistTracks([])
    }
  }, [selectedPlaylist])

  // Get current tracks based on mode and selection
  const getCurrentTracks = () => {
    if (searchMode === 'playlists') {
      return selectedPlaylist ? playlistTracks : []
    }
    return selectedFolder ? folderTracks : tracks
  }
  
  const currentTracks = getCurrentTracks()
  
  // Filter by search
  const filteredTracks = currentTracks
    .filter(t => !excludeIds.includes(t.id))
    .filter(t => {
      if (search.length < 2) return true
      return t.title.toLowerCase().includes(search.toLowerCase()) ||
             t.artist.toLowerCase().includes(search.toLowerCase())
    })

  // Filter playlists by search
  const filteredPlaylists = playlists.filter(p => {
    if (search.length < 2) return true
    return p.name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="track-browser">
      {/* Mode tabs */}
      <div className="browser-tabs">
        <button 
          className={`browser-tab ${searchMode === 'tracks' ? 'active' : ''}`}
          onClick={() => { setSearchMode('tracks'); setSelectedPlaylist(null); setSearch('') }}
        >
          🎵 Tracks
        </button>
        <button 
          className={`browser-tab ${searchMode === 'playlists' ? 'active' : ''}`}
          onClick={() => { setSearchMode('playlists'); setSelectedFolder(null); setSearch('') }}
        >
          📋 Playlists
        </button>
      </div>

      {/* Controls based on mode */}
      <div className="browser-controls">
        {searchMode === 'tracks' && (
          <div className="folder-filter">
            <label>📁 Folder:</label>
            <select 
              className="form-select"
              value={selectedFolder?.id || ''}
              onChange={e => {
                const folderId = e.target.value
                if (folderId) {
                  const folder = folders.find(f => f.id === parseInt(folderId))
                  setSelectedFolder(folder)
                } else {
                  setSelectedFolder(null)
                }
              }}
            >
              <option value="">All Tracks</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name} ({folder.track_count})
                </option>
              ))}
            </select>
          </div>
        )}

        {searchMode === 'playlists' && !selectedPlaylist && (
          <div className="folder-filter" style={{ flex: 1 }}>
            <label>Search playlists:</label>
          </div>
        )}

        {searchMode === 'playlists' && selectedPlaylist && (
          <div className="folder-filter">
            <button 
              className="btn btn-small btn-secondary"
              onClick={() => setSelectedPlaylist(null)}
            >
              ← Back to playlists
            </button>
            <span style={{ marginLeft: 12 }}>📋 {selectedPlaylist.name}</span>
          </div>
        )}
        
        <div className="browser-search">
          <input
            type="text"
            className="form-input"
            placeholder={searchMode === 'playlists' && !selectedPlaylist ? "Search playlists..." : "Search tracks..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {loading ? (
        <p className="browser-hint" style={{ padding: 20 }}>Loading...</p>
      ) : searchMode === 'playlists' && !selectedPlaylist ? (
        // Show playlist list
        <div className="browser-results">
          {filteredPlaylists.length === 0 ? (
            <p className="browser-hint">No playlists found</p>
          ) : (
            <>
              <p className="browser-count">{filteredPlaylists.length} playlists</p>
              <div className="browser-list">
                {filteredPlaylists.map(playlist => (
                  <div 
                    key={playlist.id}
                    className="browser-track"
                    onClick={() => setSelectedPlaylist(playlist)}
                  >
                    <div className="track-info">
                      <div className="track-title">📋 {playlist.name}</div>
                      <div className="track-artist">{playlist.track_count} tracks</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        // Show track list
        <div className="browser-results">
          {filteredTracks.length === 0 ? (
            <p className="browser-hint">
              {searchMode === 'playlists' ? 'No tracks in this playlist' : 'No tracks found'}
            </p>
          ) : (
            <>
              <p className="browser-count">
                {filteredTracks.length} tracks
                {selectedFolder && ` in ${selectedFolder.name}`}
                {selectedPlaylist && ` in ${selectedPlaylist.name}`}
              </p>
              <div className="browser-list">
                {filteredTracks.map((track, index) => (
                  <div 
                    key={`${track.id}-${index}`}
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

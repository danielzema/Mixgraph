import { useState, useEffect } from 'react'
import { getTracks, getTrackTransitions, getPlaylists, getPlaylistTracks, getTransitions } from '../api'

function DJMode() {
  // Mode selection
  const [mode, setMode] = useState(null) // null = selecting, 'freestyle' or 'playlist'
  const [playlists, setPlaylists] = useState([])
  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  
  // Track state
  const [tracks, setTracks] = useState([])
  const [allTransitions, setAllTransitions] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(-1) // Position in playlist
  const [transitions, setTransitions] = useState([])
  const [history, setHistory] = useState([])
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(true)

  useEffect(() => {
    getPlaylists().then(setPlaylists)
  }, [])

  useEffect(() => {
    if (mode === 'freestyle') {
      getTracks().then(setTracks)
    }
  }, [mode])

  useEffect(() => {
    if (selectedPlaylist) {
      Promise.all([
        getPlaylistTracks(selectedPlaylist.id),
        getTransitions() // Get all transitions to check between consecutive tracks
      ]).then(([tracksData, transitionsData]) => {
        setTracks(tracksData)
        setAllTransitions(transitionsData)
      })
    }
  }, [selectedPlaylist])

  useEffect(() => {
    if (currentTrack) {
      if (mode === 'freestyle') {
        getTrackTransitions(currentTrack.id).then(setTransitions)
      } else if (mode === 'playlist') {
        // In playlist mode, show transition to next track in setlist
        const nextTrack = tracks[currentIndex + 1]
        if (nextTrack) {
          const nextTransition = allTransitions.find(
            t => t.from_track_id === currentTrack.id && t.to_track_id === nextTrack.id
          )
          setTransitions(nextTransition ? [nextTransition] : [])
        } else {
          setTransitions([])
        }
      }
    }
  }, [currentTrack, currentIndex, mode, allTransitions, tracks])

  function selectMode(m) {
    setMode(m)
    if (m === 'freestyle') {
      setShowSearch(true)
    }
  }

  function selectPlaylist(playlist) {
    setSelectedPlaylist(playlist)
    setMode('playlist')
    setShowSearch(false) // In playlist mode, start from the beginning
  }

  function selectTrack(track, index = -1) {
    setCurrentTrack(track)
    setCurrentIndex(index >= 0 ? index : tracks.findIndex(t => t.id === track.id))
    setHistory(prev => [...prev, track])
    setShowSearch(false)
    setSearch('')
  }

  function handleTransition(transition) {
    const nextTrack = tracks.find(t => t.id === transition.to_track_id)
    if (nextTrack) {
      selectTrack(nextTrack)
    }
  }

  function goToNextTrack() {
    if (currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1]
      selectTrack(nextTrack, currentIndex + 1)
    }
  }

  function goToPrevTrack() {
    if (currentIndex > 0) {
      const prevTrack = tracks[currentIndex - 1]
      selectTrack(prevTrack, currentIndex - 1)
    }
  }

  function startFromBeginning() {
    if (tracks.length > 0) {
      selectTrack(tracks[0], 0)
    }
  }

  function reset() {
    setCurrentTrack(null)
    setCurrentIndex(-1)
    setTransitions([])
    setHistory([])
    setShowSearch(true)
  }

  function backToModeSelect() {
    setMode(null)
    setSelectedPlaylist(null)
    setCurrentTrack(null)
    setCurrentIndex(-1)
    setTransitions([])
    setAllTransitions([])
    setHistory([])
    setTracks([])
    setShowSearch(true)
    setSearch('')
  }

  // Get transition between two tracks
  function getTransitionBetween(fromId, toId) {
    return allTransitions.find(t => t.from_track_id === fromId && t.to_track_id === toId)
  }

  const searchResults = search.length >= 2 
    ? tracks.filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 10)
    : []

  // Mode selection screen
  if (mode === null) {
    return (
      <div className="dj-mode-select">
        <div className="card">
          <h2>🎧 DJ Mode</h2>
          <p style={{ marginBottom: 24, color: 'rgba(255,255,255,0.6)' }}>
            Choose how you want to mix
          </p>
          
          <div className="mode-options">
            <div 
              className="mode-card"
              onClick={() => selectMode('freestyle')}
            >
              <span className="mode-icon">🎤</span>
              <h3>Freestyle</h3>
              <p>Search any track and see all available transitions</p>
            </div>
            
            <div 
              className="mode-card"
              onClick={() => selectMode('playlist-select')}
            >
              <span className="mode-icon">📋</span>
              <h3>Setlist Mode</h3>
              <p>Play through a playlist in order with defined transitions</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Playlist selection screen
  if (mode === 'playlist-select') {
    return (
      <div className="card">
        <div className="dj-header">
          <button className="btn btn-secondary btn-small" onClick={backToModeSelect}>
            ← Back
          </button>
          <h2>📋 Choose a Playlist</h2>
        </div>
        
        {playlists.length > 0 ? (
          <div className="playlist-list-select">
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                className="playlist-select-item"
                onClick={() => selectPlaylist(playlist)}
              >
                <span className="playlist-icon">📋</span>
                <div className="playlist-info">
                  <div className="playlist-name">{playlist.name}</div>
                  <div className="playlist-count">{playlist.track_count} tracks</div>
                </div>
                <span className="playlist-arrow">→</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No playlists yet</h3>
            <p>Create a playlist in the Playlists tab first</p>
          </div>
        )}
      </div>
    )
  }

  // Playlist mode - show setlist view
  if (mode === 'playlist' && !currentTrack) {
    return (
      <div className="card">
        <div className="dj-header">
          <button className="btn btn-secondary btn-small" onClick={backToModeSelect}>
            ← Back
          </button>
          <h2>📋 {selectedPlaylist?.name}</h2>
        </div>
        
        {tracks.length === 0 ? (
          <div className="empty-state">
            <h3>Empty playlist</h3>
            <p>Add tracks to this playlist in the Playlists tab</p>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: 20, color: 'rgba(255,255,255,0.6)' }}>
              {tracks.length} tracks in setlist
            </p>
            
            <button className="btn" onClick={startFromBeginning} style={{ marginBottom: 20 }}>
              ▶ Start from Beginning
            </button>
            
            <div className="setlist-preview">
              {tracks.map((track, index) => {
                const nextTrack = tracks[index + 1]
                const transition = nextTrack ? getTransitionBetween(track.id, nextTrack.id) : null
                
                return (
                  <div key={track.id} className="setlist-preview-item">
                    <div 
                      className="setlist-preview-track"
                      onClick={() => selectTrack(track, index)}
                    >
                      <span className="track-number">{index + 1}</span>
                      <div className="track-info">
                        <div className="track-title">{track.title}</div>
                        <div className="track-artist">{track.artist}</div>
                      </div>
                      <div className="track-badges">
                        <span className="bpm-badge">{track.bpm?.toFixed(1)}</span>
                        <span className="key-badge">{track.key || 'N/A'}</span>
                      </div>
                    </div>
                    {nextTrack && (
                      <div className={`setlist-transition ${transition ? 'has-transition' : 'no-transition'}`}>
                        {transition ? (
                          <>
                            <span className="transition-type">{transition.transition_type}</span>
                            <span className="transition-rating">{'⭐'.repeat(transition.rating)}</span>
                          </>
                        ) : (
                          <span className="no-transition-label">⚠ No transition</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  // Track selection / search screen (freestyle mode)
  if (showSearch || !currentTrack) {
    return (
      <div className="card">
        <div className="dj-header">
          <button className="btn btn-secondary btn-small" onClick={backToModeSelect}>
            ← Back
          </button>
          <h2>🎤 Freestyle Mode</h2>
        </div>
        <p style={{ marginBottom: 20, color: 'rgba(255,255,255,0.6)' }}>
          Search for a track to start your set
        </p>
        
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search for starting track..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map(track => (
                <div 
                  key={track.id}
                  className="search-result"
                  onClick={() => selectTrack(track)}
                >
                  <div style={{ fontWeight: 500 }}>{track.title}</div>
                  <small style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {track.artist} • {track.bpm?.toFixed(1)} BPM • {track.key || 'N/A'}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Get next track info for playlist mode
  const nextTrack = mode === 'playlist' && currentIndex < tracks.length - 1 
    ? tracks[currentIndex + 1] 
    : null
  const nextTransition = nextTrack ? getTransitionBetween(currentTrack.id, nextTrack.id) : null

  return (
    <div>
      <div className="dj-header-bar">
        <button className="btn btn-secondary btn-small" onClick={backToModeSelect}>
          ← Back
        </button>
        <span className="mode-label">
          {mode === 'freestyle' ? '🎤 Freestyle' : `� ${selectedFolder?.name}`}
        </span>
        {mode === 'playlist' && (
          <span className="position-label">
            Track {currentIndex + 1} of {tracks.length}
          </span>
        )}
      </div>
      
      <div className="dj-mode">
        <div className="card current-track">
          <div className="current-track-header">
            <div className="now-playing-label">NOW PLAYING</div>
            <button className="btn btn-secondary" onClick={reset}>
              Reset
            </button>
          </div>
          
          <h2 className="current-title">{currentTrack.title}</h2>
          <p className="current-artist">{currentTrack.artist}</p>
          
          <div className="track-meta">
            <span className="bpm-badge">{currentTrack.bpm?.toFixed(1)} BPM</span>
            <span className="key-badge">{currentTrack.key || 'N/A'}</span>
          </div>

          {/* Playlist navigation */}
          {mode === 'playlist' && (
            <div className="playlist-nav">
              <button 
                className="btn btn-secondary"
                onClick={goToPrevTrack}
                disabled={currentIndex <= 0}
              >
                ← Previous
              </button>
              <button 
                className="btn"
                onClick={goToNextTrack}
                disabled={currentIndex >= tracks.length - 1}
              >
                Next →
              </button>
            </div>
          )}

          {history.length > 1 && (
            <div className="history">
              <h3>Set History</h3>
              <div className="history-list">
                {history.map((track, i) => (
                  <span key={i} className="history-item">
                    {i + 1}. {track.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Next Track Preview (Playlist Mode) */}
        {mode === 'playlist' && nextTrack && (
          <div className="card next-track-card">
            <div className="next-track-header">
              <span className="up-next-label">UP NEXT</span>
              {nextTransition && (
                <div className="transition-preview">
                  <span className="type-badge">{nextTransition.transition_type}</span>
                  <span className="stars">{'⭐'.repeat(nextTransition.rating)}</span>
                </div>
              )}
            </div>
            
            <div className="next-track-info" onClick={goToNextTrack}>
              <div>
                <h3>{nextTrack.title}</h3>
                <p className="artist">{nextTrack.artist}</p>
              </div>
              <div className="track-badges">
                <span className="bpm-badge">{nextTrack.bpm?.toFixed(1)}</span>
                <span className="key-badge">{nextTrack.key || 'N/A'}</span>
              </div>
            </div>

            {nextTransition?.notes && (
              <div className="transition-notes-display">
                <span className="notes-label">📝 Notes:</span>
                <span className="notes-text">{nextTransition.notes}</span>
              </div>
            )}
            
            {!nextTransition && (
              <div className="no-transition-warning">
                ⚠ No transition defined - go to Transitions tab to add one
              </div>
            )}
          </div>
        )}

        {/* Freestyle transitions */}
        {mode === 'freestyle' && (
          <div className="card">
            <h2 style={{ marginBottom: 16 }}>
              Available Transitions ({transitions.length})
            </h2>
            
            {transitions.length === 0 ? (
              <div className="empty-state">
                <h3>No transitions</h3>
                <p>Add transitions from this track in the Transitions tab</p>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: 16 }}
                  onClick={() => setShowSearch(true)}
                >
                  Choose Different Track
                </button>
              </div>
            ) : (
              <div className="transition-list">
                {transitions.map(t => (
                  <div 
                    key={t.id}
                    className="transition-card"
                    onClick={() => handleTransition(t)}
                  >
                    <h4>{t.to_title}</h4>
                    <p className="artist">{t.to_artist}</p>
                    <div className="meta">
                      <span className="bpm-badge">{t.to_bpm?.toFixed(1)} BPM</span>
                      <span className="key-badge">{t.to_key || 'N/A'}</span>
                      <span className="type-badge">{t.transition_type}</span>
                      <span className="stars">{'⭐'.repeat(t.rating)}</span>
                    </div>
                    {t.notes && (
                      <div className="transition-card-notes">
                        📝 {t.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {mode === 'freestyle' && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12, color: 'rgba(255,255,255,0.6)' }}>
            Jump to any track
          </h3>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for another track..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(track => (
                  <div 
                    key={track.id}
                    className="search-result"
                    onClick={() => selectTrack(track)}
                  >
                    <div style={{ fontWeight: 500 }}>{track.title}</div>
                    <small style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {track.artist} • {track.bpm?.toFixed(1)} BPM • {track.key || 'N/A'}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DJMode

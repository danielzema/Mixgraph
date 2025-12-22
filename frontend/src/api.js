const API_BASE = '/api'

// ============================================================================
// TRACKS
// ============================================================================

export async function getTracks() {
  const res = await fetch(`${API_BASE}/tracks`)
  return res.json()
}

export async function getTrack(id) {
  const res = await fetch(`${API_BASE}/tracks/${id}`)
  return res.json()
}

export async function deleteTrack(id) {
  const res = await fetch(`${API_BASE}/tracks/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function createTrack(trackData) {
  const res = await fetch(`${API_BASE}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackData)
  })
  return res.json()
}

export async function updateTrack(id, trackData) {
  const res = await fetch(`${API_BASE}/tracks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trackData)
  })
  return res.json()
}

export async function searchTracks(query) {
  const res = await fetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(query)}`)
  return res.json()
}

// ============================================================================
// TRANSITIONS
// ============================================================================

export async function getTransitions() {
  const res = await fetch(`${API_BASE}/transitions`)
  return res.json()
}

export async function createTransition(data) {
  const res = await fetch(`${API_BASE}/transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteTransition(id) {
  const res = await fetch(`${API_BASE}/transitions/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function updateTransition(id, data) {
  const res = await fetch(`${API_BASE}/transitions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function getTrackTransitions(trackId) {
  const res = await fetch(`${API_BASE}/tracks/${trackId}/transitions`)
  return res.json()
}

// ============================================================================
// FOLDERS (for track library organization)
// ============================================================================

export async function getFolders() {
  const res = await fetch(`${API_BASE}/folders`)
  return res.json()
}

export async function createFolder(name, parentId = null) {
  const res = await fetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent_id: parentId })
  })
  return res.json()
}

export async function updateFolder(id, name) {
  const res = await fetch(`${API_BASE}/folders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  return res.json()
}

export async function deleteFolder(id) {
  const res = await fetch(`${API_BASE}/folders/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function getFolderTracks(folderId) {
  const res = await fetch(`${API_BASE}/folders/${folderId}/tracks`)
  return res.json()
}

export async function addTrackToFolder(folderId, trackId) {
  const res = await fetch(`${API_BASE}/folders/${folderId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_id: trackId })
  })
  return res.json()
}

export async function removeTrackFromFolder(folderId, trackId) {
  const res = await fetch(`${API_BASE}/folders/${folderId}/tracks/${trackId}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function importRekordboxToFolder(folderId, file) {
  const formData = new FormData()
  formData.append('file', file)
  
  const res = await fetch(`${API_BASE}/folders/${folderId}/import`, {
    method: 'POST',
    body: formData
  })
  return res.json()
}

export async function getFolderTransitions(folderId) {
  const res = await fetch(`${API_BASE}/folders/${folderId}/transitions`)
  return res.json()
}

// ============================================================================
// PLAYLISTS (for DJ sets - separate from folders)
// ============================================================================

export async function getPlaylists() {
  const res = await fetch(`${API_BASE}/playlists`)
  return res.json()
}

export async function createPlaylist(name) {
  const res = await fetch(`${API_BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  return res.json()
}

export async function updatePlaylist(id, name) {
  const res = await fetch(`${API_BASE}/playlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  return res.json()
}

export async function deletePlaylist(id) {
  const res = await fetch(`${API_BASE}/playlists/${id}`, { method: 'DELETE' })
  return res.json()
}

export async function getPlaylistTracks(playlistId) {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`)
  return res.json()
}

export async function addTrackToPlaylist(playlistId, trackId) {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_id: trackId })
  })
  return res.json()
}

export async function removeTrackFromPlaylist(playlistId, position) {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks/${position}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function reorderPlaylistTracks(playlistId, position1, position2) {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ position1, position2 })
  })
  return res.json()
}

// ============================================================================
// GRAPH DATA
// ============================================================================

export async function getGraphData() {
  const res = await fetch(`${API_BASE}/graph`)
  return res.json()
}

export async function getFolderGraphData(folderId) {
  const res = await fetch(`${API_BASE}/folders/${folderId}/graph`)
  return res.json()
}

export async function getPlaylistGraphData(playlistId) {
  const res = await fetch(`${API_BASE}/playlists/${playlistId}/graph`)
  return res.json()
}

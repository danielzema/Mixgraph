const API_BASE = '/api'

// Helper to get auth headers
function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem('token')
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
}

// Helper for authenticated fetch
async function authFetch(url, options = {}) {
  const headers = {
    ...getAuthHeaders(options.body && !(options.body instanceof FormData)),
    ...options.headers
  }
  
  const res = await fetch(url, { ...options, headers })
  
  // Handle unauthorized responses
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  
  return res.json()
}

// ============================================================================
// TRACKS
// ============================================================================

export async function getTracks() {
  return authFetch(`${API_BASE}/tracks`)
}

export async function getTrack(id) {
  return authFetch(`${API_BASE}/tracks/${id}`)
}

export async function deleteTrack(id) {
  return authFetch(`${API_BASE}/tracks/${id}`, { method: 'DELETE' })
}

export async function createTrack(trackData) {
  return authFetch(`${API_BASE}/tracks`, {
    method: 'POST',
    body: JSON.stringify(trackData)
  })
}

export async function updateTrack(id, trackData) {
  return authFetch(`${API_BASE}/tracks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(trackData)
  })
}

export async function searchTracks(query) {
  return authFetch(`${API_BASE}/tracks/search?q=${encodeURIComponent(query)}`)
}

// ============================================================================
// TRANSITIONS
// ============================================================================

export async function getTransitions() {
  return authFetch(`${API_BASE}/transitions`)
}

export async function createTransition(data) {
  return authFetch(`${API_BASE}/transitions`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function deleteTransition(id) {
  return authFetch(`${API_BASE}/transitions/${id}`, { method: 'DELETE' })
}

export async function updateTransition(id, data) {
  return authFetch(`${API_BASE}/transitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function getTrackTransitions(trackId) {
  return authFetch(`${API_BASE}/tracks/${trackId}/transitions`)
}

// ============================================================================
// FOLDERS (for track library organization)
// ============================================================================

export async function getFolders() {
  return authFetch(`${API_BASE}/folders`)
}

export async function createFolder(name, parentId = null) {
  return authFetch(`${API_BASE}/folders`, {
    method: 'POST',
    body: JSON.stringify({ name, parent_id: parentId })
  })
}

export async function updateFolder(id, name) {
  return authFetch(`${API_BASE}/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
}

export async function deleteFolder(id) {
  return authFetch(`${API_BASE}/folders/${id}`, { method: 'DELETE' })
}

export async function getFolderTracks(folderId) {
  return authFetch(`${API_BASE}/folders/${folderId}/tracks`)
}

export async function addTrackToFolder(folderId, trackId) {
  return authFetch(`${API_BASE}/folders/${folderId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId })
  })
}

export async function removeTrackFromFolder(folderId, trackId) {
  return authFetch(`${API_BASE}/folders/${folderId}/tracks/${trackId}`, {
    method: 'DELETE'
  })
}

export async function importRekordboxToFolder(folderId, file) {
  const formData = new FormData()
  formData.append('file', file)
  
  // For FormData, don't set Content-Type header (browser sets it with boundary)
  const token = localStorage.getItem('token')
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
  
  const res = await fetch(`${API_BASE}/folders/${folderId}/import`, {
    method: 'POST',
    headers,
    body: formData
  })
  
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  
  return res.json()
}

export async function getFolderTransitions(folderId) {
  return authFetch(`${API_BASE}/folders/${folderId}/transitions`)
}

// ============================================================================
// PLAYLISTS (for DJ sets - separate from folders)
// ============================================================================

export async function getPlaylists() {
  return authFetch(`${API_BASE}/playlists`)
}

export async function createPlaylist(name) {
  return authFetch(`${API_BASE}/playlists`, {
    method: 'POST',
    body: JSON.stringify({ name })
  })
}

export async function updatePlaylist(id, name) {
  return authFetch(`${API_BASE}/playlists/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  })
}

export async function deletePlaylist(id) {
  return authFetch(`${API_BASE}/playlists/${id}`, { method: 'DELETE' })
}

export async function getPlaylistTracks(playlistId) {
  return authFetch(`${API_BASE}/playlists/${playlistId}/tracks`)
}

export async function addTrackToPlaylist(playlistId, trackId) {
  return authFetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId })
  })
}

export async function removeTrackFromPlaylist(playlistId, position) {
  return authFetch(`${API_BASE}/playlists/${playlistId}/tracks/${position}`, {
    method: 'DELETE'
  })
  return res.json()
}

export async function reorderPlaylistTracks(playlistId, position1, position2) {
  return authFetch(`${API_BASE}/playlists/${playlistId}/tracks/reorder`, {
    method: 'POST',
    body: JSON.stringify({ position1, position2 })
  })
}

// ============================================================================
// GRAPH DATA
// ============================================================================

export async function getGraphData() {
  return authFetch(`${API_BASE}/graph`)
}

export async function getFolderGraphData(folderId) {
  return authFetch(`${API_BASE}/folders/${folderId}/graph`)
}

export async function getPlaylistGraphData(playlistId) {
  return authFetch(`${API_BASE}/playlists/${playlistId}/graph`)
}

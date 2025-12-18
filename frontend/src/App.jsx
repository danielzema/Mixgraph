import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Tracks from './pages/Tracks'
import Transitions from './pages/Transitions'
import DJMode from './pages/DJMode'
import Graph from './pages/Graph'
import Playlists from './pages/Playlists'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path

  return (
    <div className="app">
      <header className="header">
        <h1>🎧 Mixgraph</h1>
        <nav className="nav-buttons">
          <button 
            className={`nav-btn ${isActive('/') ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            DJ Mode
          </button>
          <button 
            className={`nav-btn ${isActive('/tracks') ? 'active' : ''}`}
            onClick={() => navigate('/tracks')}
          >
            Tracks
          </button>
          <button 
            className={`nav-btn ${isActive('/playlists') ? 'active' : ''}`}
            onClick={() => navigate('/playlists')}
          >
            Playlists
          </button>
          <button 
            className={`nav-btn ${isActive('/transitions') ? 'active' : ''}`}
            onClick={() => navigate('/transitions')}
          >
            Transitions
          </button>
          <button 
            className={`nav-btn ${isActive('/graph') ? 'active' : ''}`}
            onClick={() => navigate('/graph')}
          >
            Graph
          </button>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<DJMode />} />
        <Route path="/tracks" element={<Tracks />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/transitions" element={<Transitions />} />
        <Route path="/graph" element={<Graph />} />
      </Routes>
    </div>
  )
}

export default App

import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Tracks from './pages/Tracks'
import Transitions from './pages/Transitions'
import DJMode from './pages/DJMode'
import Graph from './pages/Graph'
import Playlists from './pages/Playlists'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Camelot from './pages/Camelot'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout, loading } = useAuth()
  
  const isActive = (path) => location.pathname === path

  // Show login page if not authenticated
  if (!loading && !isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />
  }

  // Show loading screen while checking auth
  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  // Show login page
  if (location.pathname === '/login') {
    if (isAuthenticated) {
      return <Navigate to="/" replace />
    }
    return <Login />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Mixgraph</h1>
        <nav className="nav-buttons">
          <div className="nav-group nav-group-left">
            <button 
              className={`nav-btn ${isActive('/camelot') ? 'active' : ''}`}
              onClick={() => navigate('/camelot')}
            >
              Camelot
            </button>
            <button 
              className={`nav-btn ${isActive('/') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              DJ Mode
            </button>
            <button 
              className={`nav-btn ${isActive('/graph') ? 'active' : ''}`}
              onClick={() => navigate('/graph')}
            >
              Graph
            </button>
          </div>
          <div className="nav-divider"></div>
          <div className="nav-group nav-group-right">
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
          </div>
        </nav>
        <div className="user-menu">
          <button className="username-btn" onClick={() => navigate('/profile')}>
            👤 {user?.username}
          </button>
        </div>
      </header>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><DJMode /></ProtectedRoute>} />
        <Route path="/camelot" element={<ProtectedRoute><Camelot /></ProtectedRoute>} />
        <Route path="/tracks" element={<ProtectedRoute><Tracks /></ProtectedRoute>} />
        <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
        <Route path="/transitions" element={<ProtectedRoute><Transitions /></ProtectedRoute>} />
        <Route path="/graph" element={<ProtectedRoute><Graph /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default App

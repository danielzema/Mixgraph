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
  const [showAbout, setShowAbout] = useState(false)
  
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
            <span className="icon-user"></span> {user?.username}
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

      <footer className="app-footer">
        <span className="footer-copyright">© 2026 Mixgraph</span>
        <span className="footer-divider"></span>
        <button className="footer-link" onClick={() => setShowAbout(true)}>
          About
        </button>
      </footer>

      {showAbout && (
        <div className="modal-overlay" onClick={() => setShowAbout(false)}>
          <div className="modal about-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>About Mixgraph</h2>
              <button className="modal-close" onClick={() => setShowAbout(false)}>×</button>
            </div>
            <div className="about-content">
              <h3>Welcome to Mixgraph</h3>
              <p>
                Mixgraph is a DJ set planning tool that helps you create seamless mixes by 
                mapping transitions between tracks.
              </p>
              
              <h4>How It Works</h4>
              <ul>
                <li><strong>Tracks:</strong> Add your music library with BPM and key information</li>
                <li><strong>Transitions:</strong> Define how tracks flow into each other with ratings and notes</li>
                <li><strong>Graph:</strong> Visualize all your tracks and transitions as an interactive network</li>
                <li><strong>Playlists:</strong> Organize tracks into sets and see transition compatibility</li>
                <li><strong>DJ Mode:</strong> Perform live with suggested next tracks based on your transitions</li>
                <li><strong>Camelot:</strong> Reference the Camelot wheel for harmonic mixing</li>
              </ul>

              <h4>Key Compatibility</h4>
              <p>
                Tracks are marked as "In Key" when they share the same Camelot key, are one step 
                adjacent on the wheel, or share the same number with different letter (A ↔ B).
              </p>

              <h4>Tips</h4>
              <ul>
                <li>Use the Graph view to discover missing transition opportunities</li>
                <li>Rate your transitions to remember which ones work best</li>
                <li>Add notes to remember specific mix points or techniques</li>
                <li>Build playlists to plan your sets in advance</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

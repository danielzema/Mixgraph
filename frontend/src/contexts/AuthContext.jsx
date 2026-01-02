import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
          } else {
            // Token invalid, clear it
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
          }
        } catch (err) {
          console.error('Auth check failed:', err)
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [token])

  async function login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const text = await res.text()
      if (!text) {
        throw new Error('Server returned empty response. Is the backend running?')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('Invalid response from server')
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      if (err.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Is the backend running?')
      }
      throw err
    }
  }

  async function register(username, email, password) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }
    
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch (err) {
      console.error('Logout error:', err)
    }
    
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

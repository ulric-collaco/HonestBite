import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Scanner from './pages/Scanner'
import ScanResults from './pages/ScanResults'
import Profile from './pages/Profile'
import DoctorDashboard from './pages/DoctorDashboard'
import './App.css'

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userId, setUserId] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    // Check if user has completed onboarding
    const storedUserId = localStorage.getItem('userId')
    const onboardingComplete = localStorage.getItem('onboardingComplete')
    
    if (storedUserId && onboardingComplete === 'true') {
      setUserId(storedUserId)
      setIsOnboarded(true)
    }
  }, [])

  const handleOnboardingComplete = (newUserId) => {
    setUserId(newUserId)
    setIsOnboarded(true)
    localStorage.setItem('userId', newUserId)
    localStorage.setItem('onboardingComplete', 'true')
  }

  // Theme handling (light/dark) without affecting app logic
  useEffect(() => {
    const saved = localStorage.getItem('hb-theme')
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      const initial = prefersDark ? 'dark' : 'light'
      setTheme(initial)
      document.documentElement.setAttribute('data-theme', initial)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('hb-theme', next)
  }

  return (
    <Router>
      <div className="app">
        {/* Global Header */}
        <header className="app-header" role="banner">
          <div className="container header-inner">
            <Link className="brand" to={isOnboarded ? '/home' : '/'} aria-label="HonestBite Home">
              <span className="brand-mark" aria-hidden>🥗</span>
              <span className="brand-name">HonestBite</span>
            </Link>
            <div className="header-actions">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                aria-pressed={theme === 'dark'}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </header>
        <Routes>
          <Route 
            path="/" 
            element={isOnboarded ? <Navigate to="/home" /> : <Onboarding onComplete={handleOnboardingComplete} />} 
          />
          <Route 
            path="/home" 
            element={isOnboarded ? <Home userId={userId} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/scanner" 
            element={isOnboarded ? <Scanner userId={userId} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/results" 
            element={isOnboarded ? <ScanResults userId={userId} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/profile" 
            element={isOnboarded ? <Profile userId={userId} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/doctor/:patientId" 
            element={<DoctorDashboard />} 
          />
        </Routes>
        {/* Global Footer */}
        <footer className="app-footer" role="contentinfo">
          <div className="container footer-inner">
            <p className="text-xs">© {new Date().getFullYear()} HonestBite • v1.0</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App

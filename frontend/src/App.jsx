import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { Home as HomeIcon, ScanLine, User, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Scanner from './pages/Scanner'
import ScanResults from './pages/ScanResults'
import Profile from './pages/Profile'
import DoctorDashboard from './pages/DoctorDashboard'
import About from './pages/About'
import './App.css'

const BottomNav = () => {
  const location = useLocation()
  return (
    <nav className="nav" role="navigation">
      <Link to="/home" className={`nav-item ${location.pathname === '/home' ? 'active' : ''}`}>
        <span className="nav-icon"><HomeIcon size={24} /></span>
        <span>Home</span>
      </Link>
      <Link to="/scanner" className={`nav-item ${location.pathname === '/scanner' ? 'active' : ''}`}>
        <span className="nav-icon"><ScanLine size={24} /></span>
        <span>Scan</span>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <span className="nav-icon"><User size={24} /></span>
        <span>Profile</span>
      </Link>
    </nav>
  )
}

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userId, setUserId] = useState(null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
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

  useEffect(() => {
    const saved = localStorage.getItem('hb-theme')
    const initial = (saved === 'light' || saved === 'dark') ? saved : 'light'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
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
        <header className="app-header" role="banner">
          <div className="container header-inner">
            <Link className="brand" to={isOnboarded ? '/home' : '/'} aria-label="HonestBite Home">
              <img src="/logo.jpg" alt="HonestBite Logo" className="brand-logo" />
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
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </header>
        
        <Routes>
          <Route path="/" element={isOnboarded ? <Navigate to="/home" /> : <Onboarding onComplete={handleOnboardingComplete} />} />
          <Route path="/home" element={isOnboarded ? <Home userId={userId} /> : <Navigate to="/" />} />
          <Route path="/scanner" element={isOnboarded ? <Scanner userId={userId} /> : <Navigate to="/" />} />
          <Route path="/results" element={isOnboarded ? <ScanResults userId={userId} /> : <Navigate to="/" />} />
          <Route path="/profile" element={isOnboarded ? <Profile userId={userId} /> : <Navigate to="/" />} />
          <Route path="/doctor/:patientId" element={<DoctorDashboard />} />
          <Route path="/about" element={<About />} />
        </Routes>
        
        {isOnboarded && <BottomNav />}
        
        {!isOnboarded && (
          <footer className="app-footer" role="contentinfo">
            <div className="container footer-inner">
              <p className="text-xs">© {new Date().getFullYear()} HonestBite • <Link to="/about">About Us</Link></p>
            </div>
          </footer>
        )}
      </div>
    </Router>
  )
}

export default App

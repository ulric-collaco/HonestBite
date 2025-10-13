import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

  return (
    <Router>
      <div className="app">
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
      </div>
    </Router>
  )
}

export default App

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, getUserScans } from '../services/api'
import { formatDateTime, timeAgo, buildDoctorLink } from '../utils/helpers'
import './Home.css'

function Home({ userId }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [userData, scansData] = await Promise.all([
        getUser(userId),
        getUserScans(userId)
      ])
      
      setUser(userData)
      setRecentScans(scansData.scans?.slice(0, 5) || [])
    } catch (err) {
      console.error('Error loading home data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page page">
      <div className="home-header">
        <h1>🥗 HonestBite</h1>
        <p>Scan products to reveal the truth</p>
      </div>

      <div className="container">
        {/* Scan Button */}
        <Link to="/scanner" className="scan-button-large">
          <div className="scan-icon">📷</div>
          <h2>Scan Product</h2>
          <p>Tap to scan barcode or label</p>
        </Link>

        {/* Quick Stats */}
        {user && (
          <div className="quick-stats">
            <div className="stat-card">
              <div className="stat-number">{recentScans.length}</div>
              <div className="stat-label">Total Scans</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{user.health_conditions?.length || 0}</div>
              <div className="stat-label">Health Conditions</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{user.allergies?.length || 0}</div>
              <div className="stat-label">Allergies Tracked</div>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        <div className="section">
          <h2 className="section-title">Recent Scans</h2>
          
          {recentScans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <p>No scans yet</p>
              <p className="text-secondary">Start scanning products to see them here</p>
            </div>
          ) : (
            <div className="scans-list">
              {recentScans.map((scan) => (
                <div key={scan.id} className="scan-item">
                  <div className="scan-info">
                    <h3>{scan.product_name}</h3>
                    <p className="text-secondary">{timeAgo(scan.scanned_at)}</p>
                  </div>
                  <div 
                    className="score-badge"
                  >
                    {scan.truth_score}/10
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Doctor Link */}
        {user && (
          <div className="card">
            <h3>👨‍⚕️ Share with Doctor</h3>
            <p className="text-secondary mb-2">
              Share this link with your doctor to give them access to your nutrition data
            </p>
            <div className="doctor-link-container">
              <input 
                type="text" 
                value={buildDoctorLink(userId)} 
                readOnly 
                className="doctor-link-input"
                onClick={() => navigate(`/doctor/${userId}`)}
                title="Open doctor's dashboard"
              />
              <button 
                className="btn btn-primary"
                onClick={() => {
                  navigator.clipboard.writeText(buildDoctorLink(userId))
                  alert('Link copied to clipboard!')
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="nav">
        <Link to="/home" className="nav-item active">
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </Link>
        <Link to="/scanner" className="nav-item">
          <span className="nav-icon">📷</span>
          <span>Scan</span>
        </Link>
        <Link to="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  )
}

export default Home

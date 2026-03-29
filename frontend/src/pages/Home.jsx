import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine, ArrowRight, Stethoscope, Leaf, MessageSquare } from 'lucide-react'
import { getUser, getUserScans, getDoctorDashboard } from '../services/api'
import { timeAgo, buildDoctorLink, formatDateTime } from '../utils/helpers'
import './Home.css'

function Home({ userId }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [latestNote, setLatestNote] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [userData, scansData, doctorData] = await Promise.all([
          getUser(userId),
          getUserScans(userId),
          getDoctorDashboard(userId).catch(() => ({ notes: [] })) // Graceful handle if no doctor data
        ])
        
        setUser(userData)
        setRecentScans(scansData.scans?.slice(0, 5) || [])
        
        if (doctorData.notes && doctorData.notes.length > 0) {
          setLatestNote(doctorData.notes[0])
        }
      } catch (err) {
        console.error('Error loading home data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [userId])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  if (loading) return <div className="page loader-page"><div className="spinner"></div></div>

  return (
    <div className="home-page fade-in">
      <div className="dashboard-header container">
        <div className="greeting">
          <p className="greeting-sub">Welcome back,</p>
          <h1>{getGreeting()}</h1>
        </div>
      </div>

      <div className="container dashboard-grid">
        {/* Latest Doctor's Note */}
        {latestNote && (
          <div className="card doctor-note-card stagger-1 mb-2" style={{ borderLeft: '4px solid var(--color-primary)', background: 'linear-gradient(to right, rgba(15, 98, 254, 0.05), transparent)' }}>
            <div className="card-header" style={{ marginBottom: '8px' }}>
              <div className="card-title">
                <span className="icon"><MessageSquare size={20} color="var(--color-primary)" /></span>
                <h3 style={{ color: 'var(--color-primary)' }}>Doctor's Assessment</h3>
              </div>
              <span className="text-secondary text-xs">{timeAgo(latestNote.created_at)}</span>
            </div>
            <p className="note-body" style={{ fontSize: '1.05rem', fontWeight: '500', color: 'var(--color-text)' }}>
              "{latestNote.note_text}"
            </p>
            <div className="note-footer mt-1">
              <span className="text-secondary text-xs">Based on your recent grocery scans</span>
            </div>
          </div>
        )}

        {/* Hero CTA */}
        <Link to="/scanner" className="hero-scan-card glow-effect stagger-2">
          <div className="hero-scan-content">
            <span className="hero-icon"><ScanLine size={32} /></span>
            <div className="hero-text">
              <h2>Scan a Product</h2>
              <p>Instantly reveal hidden ingredients & nutrition truth</p>
            </div>
          </div>
          <div className="hero-arrow"><ArrowRight size={24} /></div>
        </Link>

        {/* Stats Row */}
        {user && (
          <div className="stats-row stagger-3">
            <div className="stat-pill">
              <span className="stat-val">{recentScans.length}</span>
              <span className="stat-lbl">Scans</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">{user.health_conditions?.length || 0}</span>
              <span className="stat-lbl">Conditions</span>
            </div>
            <div className="stat-pill">
              <span className="stat-val">{user.allergies?.length || 0}</span>
              <span className="stat-lbl">Allergies</span>
            </div>
          </div>
        )}

        {/* Doctor Share Card */}
        {user && (
          <div className="card doctor-card stagger-4">
            <div className="card-header">
              <div className="card-title">
                <span className="icon"><Stethoscope size={20} /></span>
                <h3>Medical Share Link</h3>
              </div>
            </div>
            <p className="text-secondary text-sm mb-2">
              Share this secure link with your doctor for better consultations.
            </p>
            <div className="share-input-group">
              <input 
                type="text" 
                value={buildDoctorLink(userId)} 
                readOnly 
                className="input share-link"
                onClick={(e) => e.target.select()}
              />
              <button 
                className="btn btn-primary share-btn"
                onClick={() => {
                  navigator.clipboard.writeText(buildDoctorLink(userId))
                  alert('Copied to clipboard!')
                }}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Recent Scans */}
        <div className="recent-section stagger-5">
          <div className="section-header">
            <h3>Recent Scans</h3>
            <Link to="/profile" className="view-all">View History</Link>
          </div>
          
          {recentScans.length === 0 ? (
            <div className="empty-state card">
              <div className="empty-icon"><Leaf size={32} /></div>
              <h4>No scans yet</h4>
              <p>Your history will appear here once you start exploring products.</p>
            </div>
          ) : (
            <div className="scans-list">
              {recentScans.map((scan, index) => (
                <div key={scan.id} className="scan-item card" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="scan-item-info">
                    <h4>{scan.product_name}</h4>
                    <span className="scan-time">{timeAgo(scan.scanned_at)}</span>
                  </div>
                  <div className={`score-ring ${scan.truth_score >= 7 ? 'high' : scan.truth_score >= 4 ? 'med' : 'low'}`}>
                    <span>{scan.truth_score}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home

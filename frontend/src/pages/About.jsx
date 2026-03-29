import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import './About.css'
import api, { checkHealth } from '../services/api'

export default function About() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const keepAliveRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const fetchCount = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/api/about/users')
        if (!cancelled) setCount(res.data?.users_count ?? 0)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to fetch')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const pingBackend = async () => {
      try {
        await checkHealth()
      } catch (_) {}
    }

    fetchCount()
    pingBackend()

    const INTERVAL_MS = 9 * 60 * 1000
    const startInterval = () => {
      if (keepAliveRef.current) return
      keepAliveRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          pingBackend()
        }
      }, INTERVAL_MS)
    }

    const stopInterval = () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        pingBackend()
        startInterval()
      } else {
        stopInterval()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState === 'visible') startInterval()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      stopInterval()
    }
  }, [])

  return (
    <div className="about-page container fade-in">
      <div className="about-card">
        <div className="about-logo" style={{ display: 'flex', justifyContent: 'center', color: 'var(--color-primary)' }}><Leaf size={48} /></div>
        
        <h1 className="about-title">Bringing transparency to<br/>your daily nutrition.</h1>
        <div className="about-team">Made by Ulric, Swar, Sherwin, Diva</div>
        
        <div className="about-divider"></div>

        <div className="about-metric">
          <p className="label">Users Empowered</p>
          {loading ? (
            <p className="value" style={{ fontSize: 32, opacity: 0.5 }}>Loading…</p>
          ) : error ? (
            <p className="value error" style={{ fontSize: 24 }}>Error: {error}</p>
          ) : (
            <p className="value" aria-live="polite">{(count || 0).toLocaleString()}</p>
          )}
        </div>

        <p className="about-note">We believe that knowing what you consume should be simple, accurate, and accessible to everyone. HonestBite reveals the truth behind labels.</p>
        
        <Link to="/home" className="about-link">Return to Dashboard</Link>
      </div>
    </div>
  )
}

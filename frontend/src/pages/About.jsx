import { useEffect, useRef, useState } from 'react'
import './About.css'
import api, { checkHealth } from '../services/api'

export default function About() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Keep-alive interval ref so we can clear it on unmount
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
      } catch (_) {
        // ignore network errors for keep-alive
      }
    }

    // Initial fetch + initial ping
    fetchCount()
    pingBackend()

    // Every 9 minutes while the page is visible, ping /health to keep the Render service warm
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

    // Handle tab visibility to avoid unnecessary pings
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        pingBackend()
        startInterval()
      } else {
        stopInterval()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    // Start interval initially if visible
    if (document.visibilityState === 'visible') startInterval()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      stopInterval()
    }
  }, [])

  return (
    <main className="about-page container">
      <section className="about-card">
        <h1 className="about-title">Made by Ulric Swar Sherwin Diva</h1>

        <div className="about-metric">
          <p className="label">Users served now</p>
          {loading ? (
            <p className="value">Loading…</p>
          ) : error ? (
            <p className="value error">Error: {error}</p>
          ) : (
            <p className="value" aria-live="polite">{count.toLocaleString()}</p>
          )}
        </div>

        <p className="about-note">This page fetches the latest value from the database each time it's opened.</p>
      </section>
    </main>
  )
}

import { useEffect, useState } from 'react'
import './About.css'
import api from '../services/api'

export default function About() {
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

    // Fetch on mount. Each visit to /about triggers a fresh request.
    fetchCount()

    return () => { cancelled = true }
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

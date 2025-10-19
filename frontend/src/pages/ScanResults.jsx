import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getScoreLabel } from '../utils/helpers'
import AIChat from '../components/AIChat'
import './ScanResults.css'

function ScanResults({ userId }) {
  const [showScoreInfo, setShowScoreInfo] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState({})
  const infoBtnRef = useRef(null)
  const scoreWrapRef = useRef(null)
  const popoverRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { scanResult } = location.state || {}

  if (!scanResult) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h2>No scan results found</h2>
            <Link to="/scanner" className="btn btn-primary">
              Start Scanning
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { product_info, truth_score, alerts, risk_factors, data_source, greenwashing_flags, ai_insights } = scanResult
  const numericScore = typeof truth_score === 'number' ? truth_score : (truth_score?.score ?? 0)

  // Close popover on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!showScoreInfo) return
      const pop = popoverRef.current
      const btn = infoBtnRef.current
      if (pop && !pop.contains(e.target) && btn && !btn.contains(e.target)) {
        setShowScoreInfo(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [showScoreInfo])

  // Position popover to avoid viewport clipping (auto-center, clamp left/right)
  useEffect(() => {
    if (!showScoreInfo) return
    const btn = infoBtnRef.current
    const wrap = scoreWrapRef.current
    const pop = popoverRef.current
    if (!btn || !wrap || !pop) return

    // Wait a tick to ensure layout is measured with content
    const raf = requestAnimationFrame(() => {
      const btnRect = btn.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      const popW = pop.offsetWidth || 320
      // Desired center relative to wrapper
      const targetCenter = btnRect.left + btnRect.width / 2
      const baseLeft = targetCenter - wrapRect.left
      const minLeft = popW / 2 + 8
      const maxLeft = Math.max(minLeft, wrapRect.width - popW / 2 - 8)
      const clampedLeft = Math.min(Math.max(baseLeft, minLeft), maxLeft)

      // Set computed style
      setPopoverStyle({
        left: `${clampedLeft}px`,
        transform: 'translate(-50%, 8px)'
      })
      // Also position arrow approximately under the button
      const arrow = pop.querySelector('.score-popover-arrow')
      if (arrow) {
        const arrowOffset = Math.max(16, Math.min(popW - 16, popW / 2 + (baseLeft - clampedLeft)))
        arrow.style.left = `${arrowOffset}px`
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [showScoreInfo])

  return (
    <div className="results-page page">
      <div className="page-header">
        <div className="score-display" ref={scoreWrapRef}>
          <div className="score-number">{numericScore}</div>
          <div className="score-label">{getScoreLabel(numericScore)}</div>
          <button
            type="button"
            className="btn btn-link score-info-btn"
            onClick={() => setShowScoreInfo((v) => !v)}
            aria-label="Learn why this score"
            title="Learn why this score"
            ref={infoBtnRef}
          >
            ℹ️ Learn why
          </button>

          {showScoreInfo && (
            <div className="score-popover show" role="dialog" aria-label="Why this score" ref={popoverRef} style={popoverStyle}>
              <div className="score-popover-arrow" />
              <div className="score-popover-body">
                <p className="text-secondary" style={{ marginBottom: 6 }}>
                  A simple 1–10 rating, based on per‑100g nutrition and a few signals.
                </p>
                {product_info?.nutrition_facts && (
                  <ul className="score-factors">
                    {product_info.nutrition_facts.sugar != null && (
                      <li>• Sugar: {product_info.nutrition_facts.sugar} g/100g</li>
                    )}
                    {product_info.nutrition_facts.sodium != null && (
                      <li>• Sodium: {Math.round((product_info.nutrition_facts.sodium || 0) * 1000)} mg/100g</li>
                    )}
                    {product_info.nutrition_facts.saturated_fat != null && (
                      <li>• Saturated fat: {product_info.nutrition_facts.saturated_fat} g/100g</li>
                    )}
                    {product_info.nutrition_facts.fiber != null && (
                      <li>• Fiber: {product_info.nutrition_facts.fiber} g/100g</li>
                    )}
                    {product_info.nutrition_facts.protein != null && (
                      <li>• Protein: {product_info.nutrition_facts.protein} g/100g</li>
                    )}
                  </ul>
                )}
                {Array.isArray(product_info?.additives) && (
                  <p>• Additives: {product_info.additives.length}</p>
                )}
                {product_info?.nova_group && (
                  <p>• NOVA group: {product_info.nova_group}</p>
                )}
                {product_info?.category && (
                  <p>• Category: {product_info.category}</p>
                )}
                <p className="text-secondary" style={{ marginTop: 6 }}>
                  Personal alerts appear above and don’t change this objective score.
                </p>
              </div>
            </div>
          )}
        </div>
        <h1>{product_info?.name || 'Unknown Product'}</h1>
        {data_source && (
          <p className="data-source">Data from: {data_source}</p>
        )}
      </div>

      <div className="container">
        {/* Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="alerts-section">
            {alerts.map((alert, index) => (
              <div 
                key={index} 
                className={`alert ${alert.severity === 'high' ? 'alert-danger' : 'alert-warning'}`}
              >
                <span className="alert-icon">
                  {alert.severity === 'high' ? '🚨' : '⚠️'}
                </span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Product Info */}
        <div className="card">
          <h2>📦 Product Information</h2>
          {product_info?.brand && (
            <div className="info-row">
              <span className="info-label">Brand:</span>
              <span className="info-value">{product_info.brand}</span>
            </div>
          )}
          {product_info?.category && (
            <div className="info-row">
              <span className="info-label">Category:</span>
              <span className="info-value">{product_info.category}</span>
            </div>
          )}
          {product_info?.barcode && (
            <div className="info-row">
              <span className="info-label">Barcode:</span>
              <span className="info-value">{product_info.barcode}</span>
            </div>
          )}
        </div>

        {/* Nutrition Facts */}
        {product_info?.nutrition_facts && (
          <div className="card">
            <h2>📊 Nutrition Facts (per 100g)</h2>
            <div className="nutrition-grid">
              {Object.entries(product_info.nutrition_facts).map(([key, value]) => (
                <div key={key} className="nutrition-item">
                  <span className="nutrition-label">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="nutrition-value">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        {product_info?.ingredients && (
          <div className="card">
            <h2>🧪 Ingredients</h2>
            <p className="ingredients-text">{product_info.ingredients}</p>
          </div>
        )}

        {/* Risk Factors */}
        {risk_factors && risk_factors.length > 0 && (
          <div className="card">
            <h2>⚠️ Risk Factors</h2>
            <ul className="risk-list">
              {risk_factors.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Guidance is requested by the assistant itself when opened; no separate section here. */}

        {/* AI Insights */}
        {ai_insights && (
          <div className="card ai-insights-card">
            <h2>🤖 AI Analysis</h2>
            <div className="ai-insights-content">
              {typeof ai_insights.analysis === 'string' ? (
                <div 
                  className="ai-analysis"
                  dangerouslySetInnerHTML={{ 
                    __html: ai_insights.analysis
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              ) : (
                <div className="ai-analysis text-secondary">No AI analysis available.</div>
              )}
              <div className="ai-meta">
                <span className="confidence-badge">
                  📊 Confidence: {Number.isFinite(ai_insights?.confidence) ? Math.round(ai_insights.confidence * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Greenwashing Flags */}
        {greenwashing_flags && greenwashing_flags.length > 0 && (
          <div className="card greenwashing-card">
            <h2>🚩 Marketing Red Flags</h2>
            <p className="text-secondary mb-2">
              These buzzwords may be misleading or unsubstantiated:
            </p>
            <div className="buzzword-tags">
              {greenwashing_flags.map((flag, index) => (
                <span key={index} className="buzzword-tag">{flag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="btn btn-primary btn-large"
            onClick={() => navigate('/scanner')}
          >
            Scan Another Product
          </button>
          <button 
            className="btn btn-outline btn-large"
            onClick={() => navigate('/home')}
          >
            Back to Home
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="nav">
        <Link to="/home" className="nav-item">
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

      {/* Score Info Modal removed in favor of inline popover */}

      {/* AI Chat Assistant */}
      <AIChat 
        userId={userId} 
        context={{ 
          productInfo: product_info,
          scanResult: scanResult 
        }}
        placeholder="Ask me about this product..."
        autoGuidanceOnExpand={true}
      />
    </div>
  )
}

export default ScanResults

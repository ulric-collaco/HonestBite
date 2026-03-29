import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { BadgeAlert, AlertTriangle, Bot, FileText, BarChart2, TestTube, Flag } from 'lucide-react'
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
      <div className="page fade-in">
        <div className="container" style={{ marginTop: '20vh' }}>
          <div className="card text-center stagger-1">
            <h2 className="mb-2">No results found</h2>
            <Link to="/scanner" className="btn btn-primary">Scan a Product</Link>
          </div>
        </div>
      </div>
    )
  }

  const { product_info, truth_score, alerts, risk_factors, data_source, greenwashing_flags, ai_insights } = scanResult
  const numericScore = typeof truth_score === 'number' ? truth_score : (truth_score?.score ?? 0)

  // Color mapping based on score (1-10)
  const getScoreColor = (score) => {
    if (score >= 8) return 'var(--color-success)';
    if (score >= 5) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const scoreColor = getScoreColor(numericScore);

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

  useEffect(() => {
    if (!showScoreInfo) return
    const btn = infoBtnRef.current
    const wrap = scoreWrapRef.current
    const pop = popoverRef.current
    if (!btn || !wrap || !pop) return

    const raf = requestAnimationFrame(() => {
      const btnRect = btn.getBoundingClientRect()
      const wrapRect = wrap.getBoundingClientRect()
      const popW = pop.offsetWidth || 280
      const targetCenter = btnRect.left + btnRect.width / 2
      const baseLeft = targetCenter - wrapRect.left
      const minLeft = popW / 2 + 8
      const maxLeft = Math.max(minLeft, wrapRect.width - popW / 2 - 8)
      const clampedLeft = Math.min(Math.max(baseLeft, minLeft), maxLeft)

      setPopoverStyle({
        left: `${clampedLeft}px`,
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [showScoreInfo])

  return (
    <div className="results-page page" style={{ '--score-color': scoreColor }}>
      <div className="results-header container">
        <div className="score-display" ref={scoreWrapRef}>
          <div className="score-circle">
            <span className="score-number">{numericScore}</span>
            <span className="score-max">/10</span>
          </div>
          <div className="score-label">{getScoreLabel(numericScore)}</div>
          
          <button
            type="button"
            className="score-info-btn"
            onClick={() => setShowScoreInfo((v) => !v)}
            ref={infoBtnRef}
          >
            Why this score? 
          </button>

          {showScoreInfo && (
            <div className="score-popover show" ref={popoverRef} style={popoverStyle}>
              <div className="score-popover-body">
                <p className="text-secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                  A 1–10 objective rating based on nutritional value per 100g.
                </p>
                {product_info?.nutrition_facts && (
                  <ul className="score-factors">
                    {product_info.nutrition_facts.sugar != null && <li>• Sugar: {product_info.nutrition_facts.sugar}g</li>}
                    {product_info.nutrition_facts.sodium != null && <li>• Sodium: {Math.round((product_info.nutrition_facts.sodium || 0) * 1000)}mg</li>}
                    {product_info.nutrition_facts.saturated_fat != null && <li>• Sat. fat: {product_info.nutrition_facts.saturated_fat}g</li>}
                    {product_info.nutrition_facts.fiber != null && <li>• Fiber: {product_info.nutrition_facts.fiber}g</li>}
                    {product_info.nutrition_facts.protein != null && <li>• Protein: {product_info.nutrition_facts.protein}g</li>}
                  </ul>
                )}
                {product_info?.nova_group && <p className="mt-1 text-sm">• NOVA: {product_info.nova_group}</p>}
              </div>
            </div>
          )}
        </div>
        
        <h1 className="product-title">{product_info?.name || 'Unknown Product'}</h1>
        {data_source && <p className="data-source">Source: {data_source}</p>}
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        {/* Personal Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="alerts-list stagger-1">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert-item ${alert.severity === 'high' ? 'alert-danger' : 'alert-warning'}`}>
                <span className="alert-icon" style={{ display: 'flex' }}>{alert.severity === 'high' ? <BadgeAlert size={20} /> : <AlertTriangle size={20} />}</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Insights Card */}
        {ai_insights && (
          <div className="card section-card ai-insights-card stagger-2">
            <h2 className="section-title"><span className="icon" style={{ display: 'flex' }}><Bot size={20} /></span> AI Analysis</h2>
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
              <div className="ai-analysis text-secondary">No deep analysis available.</div>
            )}
            {ai_insights.confidence && (
              <div>
                <span className="confidence-badge">Confidence: {Math.round(ai_insights.confidence * 100)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Product Details Grid */}
        <div className="card section-card stagger-3">
          <h2 className="section-title"><span className="icon" style={{ display: 'flex' }}><FileText size={20} /></span> Details</h2>
          <div className="info-list">
            {product_info?.brand && (
              <div className="info-row">
                <span className="info-label">Brand</span>
                <span className="info-value">{product_info.brand}</span>
              </div>
            )}
            {product_info?.category && (
              <div className="info-row">
                <span className="info-label">Category</span>
                <span className="info-value">{product_info.category}</span>
              </div>
            )}
            {product_info?.barcode && (
              <div className="info-row">
                <span className="info-label">Barcode</span>
                <span className="info-value">{product_info.barcode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Nutrition */}
        {product_info?.nutrition_facts && Object.keys(product_info.nutrition_facts).length > 0 && (
          <div className="card section-card stagger-3">
            <h2 className="section-title"><span className="icon" style={{ display: 'flex' }}><BarChart2 size={20} /></span> per 100g</h2>
            <div className="nutrition-grid">
              {Object.entries(product_info.nutrition_facts).map(([key, value]) => (
                <div key={key} className="nutrition-item">
                  <span className="nutrition-label">{key.replace('_', ' ')}</span>
                  <span className="nutrition-value">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients & Flags */}
        <div className="stagger-4">
          {product_info?.ingredients && (
            <div className="card section-card mb-2">
              <h2 className="section-title"><span className="icon" style={{ display: 'flex' }}><TestTube size={20} /></span> Ingredients</h2>
              <p className="ingredients-text">{product_info.ingredients}</p>
            </div>
          )}

          {risk_factors && risk_factors.length > 0 && (
            <div className="card section-card mb-2" style={{ borderColor: 'var(--color-warning)' }}>
              <h2 className="section-title text-warning"><span className="icon" style={{ display: 'flex' }}><AlertTriangle size={20} /></span> Additives / Risks</h2>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {risk_factors.map((risk, index) => <li key={index} className="mb-1">{risk}</li>)}
              </ul>
            </div>
          )}

          {greenwashing_flags && greenwashing_flags.length > 0 && (
            <div className="card section-card">
              <h2 className="section-title"><span className="icon" style={{ display: 'flex' }}><Flag size={20} /></span> Marketing Claims</h2>
              <p className="text-secondary text-sm">These terms may be unsupported or misleading:</p>
              <div className="buzzword-tags">
                {greenwashing_flags.map((flag, index) => (
                  <span key={index} className="buzzword-tag">{flag}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="action-buttons stagger-5">
          <button className="btn btn-primary btn-large" onClick={() => navigate('/scanner')}>
            Scan Another
          </button>
          <button className="btn btn-outline btn-large" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      <AIChat 
        userId={userId} 
        context={{ productInfo: product_info, scanResult: scanResult }}
        placeholder="Ask nutrition assistant..."
        autoGuidanceOnExpand={true}
      />
    </div>
  )
}

export default ScanResults

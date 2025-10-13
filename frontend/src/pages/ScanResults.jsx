import { useLocation, useNavigate, Link } from 'react-router-dom'
import { getScoreColor, getScoreLabel } from '../utils/helpers'
import './ScanResults.css'

function ScanResults() {
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

  const { product_info, truth_score, alerts, risk_factors, data_source, greenwashing_flags } = scanResult

  return (
    <div className="results-page page">
      <div className="page-header" style={{ backgroundColor: getScoreColor(truth_score) }}>
        <div className="score-display">
          <div className="score-number">{truth_score}</div>
          <div className="score-label">{getScoreLabel(truth_score)}</div>
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
                  <span className="nutrition-value">{value}</span>
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
    </div>
  )
}

export default ScanResults

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getDoctorDashboard, exportDoctorReport } from '../services/api'
import { formatDateTime, downloadBlob } from '../utils/helpers'
import './DoctorDashboard.css'

function DoctorDashboard() {
  const { patientId } = useParams()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())

  useEffect(() => {
    loadDashboard()
  }, [patientId])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getDoctorDashboard(patientId)
      setDashboardData(data)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load patient data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async () => {
    try {
      setExporting(true)
      const blob = await exportDoctorReport(patientId)
      downloadBlob(blob, `patient-${patientId}-report.pdf`)
    } catch (err) {
      console.error('Error exporting report:', err)
      alert('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId))
  }

  if (loading) {
    return (
      <div className="doctor-dashboard-page">
        <div className="container">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="doctor-dashboard-page">
        <div className="container">
          <div className="alert alert-danger">
            {error}
          </div>
        </div>
      </div>
    )
  }

  const { patient, scan_history, risk_patterns, alerts } = dashboardData || {}
  const activeAlerts = alerts?.filter(alert => !dismissedAlerts.has(alert.id)) || []

  return (
    <div className="doctor-dashboard-page">
      <div className="doctor-header">
        <h1>👨‍⚕️ Doctor's Dashboard</h1>
        <p>Patient Nutrition Monitoring</p>
      </div>

      <div className="container">
        {/* Patient Info */}
        <div className="card patient-card">
          <h2>Patient Information</h2>
          <div className="patient-info">
            <div className="info-item">
              <span className="info-label">Patient ID:</span>
              <span className="info-value">{patientId}</span>
            </div>
            {patient?.health_conditions?.length > 0 && (
              <div className="info-item">
                <span className="info-label">Health Conditions:</span>
                <div className="tags">
                  {patient.health_conditions.map((condition, index) => (
                    <span key={index} className="tag tag-health">{condition}</span>
                  ))}
                </div>
              </div>
            )}
            {patient?.allergies?.length > 0 && (
              <div className="info-item">
                <span className="info-label">Allergies:</span>
                <div className="tags">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="tag tag-allergy">{allergy}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            className="btn btn-primary"
            onClick={handleExportReport}
            disabled={exporting}
          >
            {exporting ? 'Generating...' : '📄 Export PDF Report'}
          </button>
        </div>

        {/* Health Alerts */}
        {activeAlerts.length > 0 ? (
          <div className="card alerts-card">
            <h2>🚨 Health Alerts</h2>
            <p className="text-secondary mb-2">
              Alerts are triggered when patients scan 3+ risky products per week
            </p>
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="health-alert">
                <div className="alert-content">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-text">
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <span className="alert-time">{formatDateTime(alert.timestamp)}</span>
                  </div>
                </div>
                <button
                  className="btn-dismiss"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="card no-alerts-card">
            <div className="no-alerts-content">
              <div className="no-alerts-icon">✅</div>
              <h3>No Active Alerts</h3>
              <p>Patient is eating healthily - no concerning patterns detected</p>
            </div>
          </div>
        )}

        {/* Risk Patterns */}
        {risk_patterns && Object.keys(risk_patterns).length > 0 && (
          <div className="card">
            <h2>📊 Risk Patterns</h2>
            <div className="risk-patterns-grid">
              {Object.entries(risk_patterns).map(([key, value]) => (
                <div key={key} className="risk-pattern-item">
                  <div className="risk-pattern-label">{key}</div>
                  <div className="risk-pattern-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scan History */}
        <div className="card">
          <h2>📦 Scan History</h2>
          {scan_history && scan_history.length > 0 ? (
            <div className="scan-history">
              {scan_history.map((scan) => (
                <div key={scan.id} className="history-item">
                  <div className="history-info">
                    <h4>{scan.product_name}</h4>
                    <p className="text-secondary">{formatDateTime(scan.scanned_at)}</p>
                    {scan.risk_factors && scan.risk_factors.length > 0 && (
                      <div className="risk-tags">
                        {scan.risk_factors.map((risk, index) => (
                          <span key={index} className="risk-tag">{risk}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div
                    className="history-score"
                  >
                    {scan.truth_score}/10
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">No scan history available</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard

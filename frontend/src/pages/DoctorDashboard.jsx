import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Stethoscope, User, FileDown, AlertTriangle, CheckCircle, BarChart2, ClipboardList, PlusCircle, MessageSquare } from 'lucide-react'
import { getDoctorDashboard, exportDoctorReport, addClinicalNote, dismissDoctorAlert } from '../services/api'
import { formatDateTime, downloadBlob } from '../utils/helpers'
import './DoctorDashboard.css'

function DoctorDashboard() {
  const { patientId } = useParams()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

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

  useEffect(() => {
    loadDashboard()
  }, [patientId])

  const handleExportReport = async () => {
    try {
      setExporting(true)
      const blob = await exportDoctorReport(patientId)
      downloadBlob(blob, `honestbite-report-${patientId}.pdf`)
    } catch (err) {
      console.error('Error exporting report:', err)
      alert('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveNote = async () => {
    if (!newNote.trim()) return
    try {
      setSavingNote(true)
      await addClinicalNote(patientId, newNote)
      setNewNote('')
      // Refresh dashboard to show new note
      const data = await getDoctorDashboard(patientId)
      setDashboardData(data)
    } catch (err) {
      alert('Failed to save note')
    } finally {
      setSavingNote(false)
    }
  }

  const dismissAlert = async (alertId) => {
    try {
      await dismissDoctorAlert(patientId, alertId)
      // Optimistic UI update or refresh
      setDashboardData(prev => ({
        ...prev,
        alerts: prev.alerts.filter(a => a.id !== alertId)
      }))
    } catch (err) {
      alert('Failed to dismiss alert persistently')
    }
  }

  if (loading) return <div className="page loader-page"><div className="spinner"></div></div>

  if (error) {
    return (
      <div className="page fade-in">
        <div className="container mt-3">
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    )
  }

  const { patient, scan_history, risk_patterns, alerts, notes } = dashboardData || {}

  return (
    <div className="doctor-dashboard-page page fade-in">
      <div className="doctor-header container stagger-1">
        <div className="doctor-logo"><Stethoscope size={32} /></div>
        <h1>Clinician Portal</h1>
        <p>Patient Dietary Monitoring</p>
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        {/* Patient Info */}
        <div className="card patient-card stagger-2 mb-2">
          <h2 className="mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="icon" style={{ display: 'flex' }}><User size={24} /></span> Patient File
          </h2>
          <div className="patient-info">
            <div className="info-item">
              <span className="info-label">Patient ID</span>
              <span className="info-value">{patientId}</span>
            </div>
            {patient?.health_conditions?.length > 0 && (
              <div className="info-item">
                <span className="info-label">Health Conditions</span>
                <div className="tags">
                  {patient.health_conditions.map((condition, index) => (
                    <span key={index} className="tag-health">{condition}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button className="btn btn-primary" onClick={handleExportReport} disabled={exporting} style={{ width: '100%', marginTop: '16px' }}>
            {exporting ? 'Generating Report...' : <><div style={{ display: 'flex' }}><FileDown size={18} /></div> Download Clinical PDF</>}
          </button>
        </div>

        {/* Health Alerts */}
        <div className="stagger-3 mb-2">
          {alerts && alerts.length > 0 ? (
            <div className="card alerts-card">
              <h2 className="mb-1 text-warning" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="icon" style={{ display: 'flex' }}><AlertTriangle size={24} /></span> Clinical Alerts
              </h2>
              {alerts.map((alert) => (
                <div key={alert.id} className="health-alert">
                  <div className="alert-content">
                    <div className="alert-icon" style={{ display: 'flex' }}><AlertTriangle size={20} color="var(--color-warning)" /></div>
                    <div className="alert-text">
                      <h4>{alert.title}</h4>
                      <p>{alert.message}</p>
                    </div>
                  </div>
                  <button className="btn-dismiss" onClick={() => dismissAlert(alert.id)} title="Dismiss persistently">
                    <CheckCircle size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card no-alerts-card">
              <div className="no-alerts-content">
                <div className="no-alerts-icon" style={{ display: 'flex', justifyContent: 'center' }}><CheckCircle size={48} /></div>
                <h3>All Clear</h3>
                <p>No critical dietary risks detected currently.</p>
              </div>
            </div>
          )}
        </div>

        {/* Clinical Notes & Assessment */}
        <div className="card stagger-4 mb-2">
          <h2 className="mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="icon" style={{ display: 'flex' }}><MessageSquare size={24} /></span> Clinical Notes
          </h2>
          <div className="notes-input mb-2">
            <textarea 
              className="form-control" 
              placeholder="Enter clinical assessment or patient recommendations..." 
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ minHeight: '100px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '12px', padding: '12px' }}
            />
            <button 
              className="btn btn-primary mt-1" 
              onClick={handleSaveNote} 
              disabled={savingNote || !newNote.trim()}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <PlusCircle size={18} /> {savingNote ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
          
          <div className="notes-list">
            {notes && notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="note-card mb-1" style={{ borderLeft: '3px solid var(--color-primary)', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '0 12px 12px 0' }}>
                  <p className="note-text" style={{ fontSize: '0.95rem' }}>{note.note_text}</p>
                  <span className="note-date text-secondary text-xs">{formatDateTime(note.created_at)}</span>
                </div>
              ))
            ) : (
              <p className="text-secondary text-sm">No clinical notes recorded yet.</p>
            )}
          </div>
        </div>

        {/* Risk Patterns */}
        {risk_patterns && Object.keys(risk_patterns).length > 0 && (
          <div className="card stagger-4 mb-2">
            <h2 className="mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span className="icon" style={{ display: 'flex' }}><BarChart2 size={24} /></span> Aggregate Trends</h2>
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

        {/* Scan Registry */}
        <div className="card stagger-5">
          <h2 className="mb-2" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span className="icon" style={{ display: 'flex' }}><ClipboardList size={24} /></span> Scan Registry</h2>
          {scan_history && scan_history.length > 0 ? (
            <div className="scan-history">
              {scan_history.map((scan) => (
                <div key={scan.id} className="history-item">
                  <div className="history-info">
                    <h4>{scan.product_name}</h4>
                    <p className="text-secondary">{formatDateTime(scan.scanned_at)}</p>
                  </div>
                  <div className="history-score" style={{ 
                    borderColor: scan.truth_score >= 7 ? 'var(--color-success)' : scan.truth_score >= 4 ? 'var(--color-warning)' : 'var(--color-danger)',
                    color: scan.truth_score >= 7 ? 'var(--color-success)' : scan.truth_score >= 4 ? 'var(--color-warning)' : 'var(--color-danger)'
                  }}>
                    {scan.truth_score}/10
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">No scan history recorded.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard

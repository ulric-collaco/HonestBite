import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUser, updateUser } from '../services/api'
import { copyToClipboard, buildDoctorLink } from '../utils/helpers'
import './Profile.css'

const HEALTH_CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Kidney Disease', 'Obesity',
  'PCOD/PCOS', 'Thyroid Disorders', 'High Cholesterol', 'Lactose Intolerance', 'Celiac Disease'
]

const ALLERGIES = [
  'Peanuts', 'Tree nuts', 'Dairy', 'Gluten', 'Soy',
  'Eggs', 'Fish', 'Shellfish', 'Sesame', 'Wheat'
]

function Profile({ userId }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  
  const [formData, setFormData] = useState({
    healthConditions: [],
    allergies: []
  })

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const userData = await getUser(userId)
      setUser(userData)
      setFormData({
        healthConditions: userData.health_conditions || [],
        allergies: userData.allergies || []
      })
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleHealthCondition = (condition) => {
    setFormData(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(condition)
        ? prev.healthConditions.filter(c => c !== condition)
        : [...prev.healthConditions, condition]
    }))
  }

  const toggleAllergy = (allergy) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')

    try {
      await updateUser(userId, {
        health_conditions: formData.healthConditions,
        allergies: formData.allergies
      })

      setUser(prev => ({
        ...prev,
        health_conditions: formData.healthConditions,
        allergies: formData.allergies
      }))

      setEditing(false)
      setMessage('Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyDoctorLink = async () => {
    const link = buildDoctorLink(userId)
    const success = await copyToClipboard(link)
    if (success) {
      setMessage('Doctor link copied to clipboard!')
      setTimeout(() => setMessage(''), 3000)
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
    <div className="profile-page page">
      <div className="page-header">
        <h1 className="page-title">👤 Profile</h1>
        <p>Manage your health information</p>
      </div>

      <div className="container">
        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {/* User ID */}
        <div className="card">
          <h3>User ID</h3>
          <p className="user-id-text">{userId}</p>
        </div>

        {/* Health Conditions */}
        <div className="card">
          <div className="card-header">
            <h3>🏥 Health Conditions</h3>
            {!editing && (
              <button 
                className="btn-edit"
                onClick={() => setEditing(true)}
                title="Edit health conditions and allergies"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <p className="text-sm" style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                Select all health conditions that apply to you. This helps us provide personalized nutrition insights.
              </p>
              <div className="checkbox-grid">
                {HEALTH_CONDITIONS.map((condition) => (
                  <label key={condition} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.healthConditions.includes(condition)}
                      onChange={() => toggleHealthCondition(condition)}
                    />
                    <span>{condition}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="tags">
                {user?.health_conditions?.length > 0 ? (
                  user.health_conditions.map((condition, index) => (
                    <span key={index} className="tag tag-health">{condition}</span>
                  ))
                ) : (
                  <p className="text-secondary">No health conditions added</p>
                )}
              </div>
              {user?.health_conditions?.length === 0 && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setEditing(true)}
                  style={{ marginTop: '1rem' }}
                >
                  ➕ Add Health Conditions
                </button>
              )}
            </>
          )}
        </div>

        {/* Allergies */}
        <div className="card">
          <div className="card-header">
            <h3>🚫 Allergies</h3>
            {!editing && (
              <button 
                className="btn-edit"
                onClick={() => setEditing(true)}
                title="Edit allergies and health conditions"
              >
                ✏️ Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <p className="text-sm" style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
                Select all allergies that apply to you. This helps us provide personalized warnings.
              </p>
              <div className="checkbox-grid">
                {ALLERGIES.map((allergy) => (
                  <label key={allergy} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.allergies.includes(allergy)}
                      onChange={() => toggleAllergy(allergy)}
                    />
                    <span>{allergy}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="tags">
                {user?.allergies?.length > 0 ? (
                  user.allergies.map((allergy, index) => (
                    <span key={index} className="tag tag-allergy">{allergy}</span>
                  ))
                ) : (
                  <p className="text-secondary">No allergies added</p>
                )}
              </div>
              {user?.allergies?.length === 0 && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setEditing(true)}
                  style={{ marginTop: '1rem' }}
                >
                  ➕ Add Allergies
                </button>
              )}
            </>
          )}
        </div>

        {editing && (
          <div className="action-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
            <button
              className="btn btn-outline btn-large"
              onClick={() => {
                setEditing(false)
                setFormData({
                  healthConditions: user.health_conditions || [],
                  allergies: user.allergies || []
                })
              }}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Doctor Link */}
        {user && (
          <div className="card doctor-link-card">
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
                onClick={handleCopyDoctorLink}
              >
                📋 Copy
              </button>
            </div>
          </div>
        )}
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
        <Link to="/profile" className="nav-item active">
          <span className="nav-icon">👤</span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  )
}

export default Profile

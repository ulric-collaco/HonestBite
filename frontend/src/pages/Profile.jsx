import { useState, useEffect } from 'react'
import { User, Activity, Edit2, Ban, Save, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getUser, updateUser } from '../services/api'
import { buildDoctorLink } from '../utils/helpers'
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
    loadUserData()
  }, [userId])

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

  if (loading) {
    return (
      <div className="page loader-page">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="profile-page page fade-in">
      <div className="profile-header container stagger-1">
        <div className="profile-avatar"><User size={48} /></div>
        <h1>Your Profile</h1>
        <p>Manage health info and preferences</p>
      </div>

      <div className="container" style={{ paddingTop: 0 }}>
        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        <div className="card stagger-2 mb-2">
          <p className="text-secondary text-sm mb-1">ACCOUNT IDENTIFIER</p>
          <p className="user-id-text">{userId}</p>
        </div>

        <div className="card stagger-3 mb-2">
          <div className="card-header">
            <h3 style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span className="icon" style={{ display: 'flex' }}><Activity size={24} /></span> Health Conditions</h3>
            {!editing && (
              <button 
                className="btn-edit"
                onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ display: 'flex' }}><Edit2 size={16} /></span> Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <p className="text-sm text-secondary mb-2">
                Select all health conditions that apply. This helps us personalize insights.
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
                    <span key={index} className="tag">{condition}</span>
                  ))
                ) : (
                  <p className="text-secondary text-sm">No health conditions added</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="card stagger-4 mb-2">
          <div className="card-header">
            <h3 style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span className="icon" style={{ display: 'flex' }}><Ban size={24} /></span> Allergies</h3>
            {!editing && (
              <button 
                className="btn-edit"
                onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ display: 'flex' }}><Edit2 size={16} /></span> Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <p className="text-sm text-secondary mb-2">
                Select allergies to receive warnings when scanning products.
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
                    <span key={index} className="tag">{allergy}</span>
                  ))
                ) : (
                  <p className="text-secondary text-sm">No allergies added</p>
                )}
              </div>
            </>
          )}
        </div>

        {editing && (
          <div className="action-buttons mb-3 stagger-4">
            <button
              className="btn btn-primary btn-large"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : <><div style={{ display: 'flex' }}><Save size={18} /></div> Save Changes</>}
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
        {!editing && user && (
          <div className="card ai-insights-card stagger-4 mt-2">
            <h3 className="mb-1" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><span className="icon" style={{ display: 'flex' }}><Stethoscope size={24} /></span> Share with Doctor</h3>
            <p className="text-secondary text-sm mb-2">
              Share this link with your doctor for better consultations.
            </p>
            <div className="doctor-link-container">
              <input 
                type="text" 
                value={buildDoctorLink(userId)} 
                readOnly 
                className="input doctor-link-input"
                onClick={(e) => e.target.select()}
              />
              <button 
                className="btn btn-primary"
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
      </div>
    </div>
  )
}

export default Profile

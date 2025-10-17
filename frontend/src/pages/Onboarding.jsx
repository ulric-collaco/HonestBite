import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUser } from '../services/api'
import { generateUserId } from '../utils/helpers'
import './Onboarding.css'

const HEALTH_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Heart Disease',
  'Kidney Disease',
  'Obesity',
  'PCOD/PCOS',
  'Thyroid Disorders',
  'High Cholesterol',
  'Lactose Intolerance',
  'Celiac Disease'
]

const ALLERGIES = [
  'Peanuts',
  'Tree nuts',
  'Dairy',
  'Gluten',
  'Soy',
  'Eggs',
  'Fish',
  'Shellfish',
  'Sesame',
  'Wheat'
]

function Onboarding({ onComplete }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    healthConditions: [],
    allergies: []
  })

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

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const userId = generateUserId()
      
      await createUser({
        user_id: userId,
        health_conditions: formData.healthConditions,
        allergies: formData.allergies
      })

      onComplete(userId)
      navigate('/home')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError('Failed to create profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <h1>
          <img src="/logo.jpg" alt="HonestBite" className="title-logo" />
          HonestBite
        </h1>
        <p>Let's personalize your experience</p>
      </div>

      <div className="onboarding-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
        <div className="progress-line"></div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
      </div>

      <div className="onboarding-content">
        {step === 1 && (
          <div className="onboarding-step">
            <h2>Health Conditions</h2>
            <p className="step-description">
              Select any health conditions you have (optional)
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

            <button
              className="btn btn-primary btn-large"
              onClick={handleNext}
            >
              Next →
            </button>
            
            <button
              className="btn btn-outline btn-large mt-2"
              onClick={() => onComplete(generateUserId())}
            >
              Skip Onboarding
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>Allergies</h2>
            <p className="step-description">
              Select any food allergies you have (optional)
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

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-large"
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </button>

            <button
              className="btn btn-outline btn-large mt-2"
              onClick={handleBack}
              disabled={loading}
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Onboarding

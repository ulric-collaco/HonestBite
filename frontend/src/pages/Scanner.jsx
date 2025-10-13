import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { scanProduct } from '../services/api'
import { scanBarcodeFromVideo, isValidBarcode } from '../utils/barcode'
import { extractTextFromImage, parseNutritionInfo } from '../utils/ocr'
import './Scanner.css'

function Scanner({ userId }) {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const [mode, setMode] = useState('barcode') // 'barcode', 'label', 'manual'
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [manualBarcode, setManualBarcode] = useState('')

  const handleBarcodeCapture = async () => {
    if (!webcamRef.current) {
      setError('Camera not available')
      return
    }

    setScanning(true)
    setError('')

    try {
      const videoElement = webcamRef.current.video
      
      // Scan barcode from video stream
      const barcode = await scanBarcodeFromVideo(videoElement)
      
      if (!isValidBarcode(barcode)) {
        throw new Error('Invalid barcode format')
      }

      // Send to backend for product lookup
      const result = await scanProduct({
        user_id: userId,
        barcode: barcode,
        scan_type: 'barcode'
      })

      // Navigate to results page
      navigate('/results', { state: { scanResult: result } })
      
    } catch (err) {
      console.error('Barcode scan error:', err)
      setError(err.message || 'Failed to scan barcode. Please try again or enter manually.')
    } finally {
      setScanning(false)
    }
  }

  const handleLabelCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    
    if (!imageSrc) {
      setError('Failed to capture image')
      return
    }

    setScanning(true)
    setError('')

    try {
      // Extract text using OCR
      const text = await extractTextFromImage(imageSrc)
      const nutritionData = parseNutritionInfo(text)

      // Send to backend for analysis
      const result = await scanProduct({
        user_id: userId,
        image_data: imageSrc,
        ocr_text: text,
        nutrition_data: nutritionData,
        scan_type: 'label'
      })

      navigate('/results', { state: { scanResult: result } })
      
    } catch (err) {
      console.error('Label scan error:', err)
      setError('Failed to read nutrition label. Please try again with better lighting.')
    } finally {
      setScanning(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')

    try {
      if (mode === 'barcode') {
        const { scanBarcodeFromImage } = await import('../utils/barcode')
        const barcode = await scanBarcodeFromImage(file)
        
        const result = await scanProduct({
          user_id: userId,
          barcode: barcode,
          scan_type: 'barcode'
        })

        navigate('/results', { state: { scanResult: result } })
      } else {
        // OCR for label
        const text = await extractTextFromImage(file)
        const nutritionData = parseNutritionInfo(text)

        const result = await scanProduct({
          user_id: userId,
          ocr_text: text,
          nutrition_data: nutritionData,
          scan_type: 'label'
        })

        navigate('/results', { state: { scanResult: result } })
      }
    } catch (err) {
      console.error('File upload error:', err)
      setError('Failed to process image. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    
    if (!isValidBarcode(manualBarcode)) {
      setError('Please enter a valid barcode (6-14 digits)')
      return
    }

    setScanning(true)
    setError('')

    try {
      const result = await scanProduct({
        user_id: userId,
        barcode: manualBarcode,
        scan_type: 'manual'
      })

      navigate('/results', { state: { scanResult: result } })
    } catch (err) {
      console.error('Manual scan error:', err)
      setError('Product not found. Please check the barcode.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="scanner-page page">
      <div className="page-header">
        <h1 className="page-title">Scan Product</h1>
        <p>Choose a scan method</p>
      </div>

      <div className="container">
        {/* Mode Selection */}
        <div className="mode-selector">
          <button
            className={`mode-btn ${mode === 'barcode' ? 'active' : ''}`}
            onClick={() => setMode('barcode')}
          >
            📊 Barcode
          </button>
          <button
            className={`mode-btn ${mode === 'label' ? 'active' : ''}`}
            onClick={() => setMode('label')}
          >
            🏷️ Label
          </button>
          <button
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            ⌨️ Manual
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {/* Camera View */}
        {mode !== 'manual' && (
          <div className="camera-container">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                facingMode: 'environment',
                width: 1280,
                height: 720
              }}
              className="webcam"
            />
            
            {mode === 'barcode' && (
              <div className="scan-overlay">
                <div className="scan-frame"></div>
                <p>Align barcode within frame</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {mode === 'barcode' && (
          <div className="action-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={handleBarcodeCapture}
              disabled={scanning}
            >
              {scanning ? 'Scanning...' : '📷 Scan Barcode'}
            </button>
            
            <button
              className="btn btn-secondary btn-large"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              📁 Upload Image
            </button>
          </div>
        )}

        {mode === 'label' && (
          <div className="action-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={handleLabelCapture}
              disabled={scanning}
            >
              {scanning ? 'Processing...' : '📷 Capture Label'}
            </button>
            
            <button
              className="btn btn-secondary btn-large"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              📁 Upload Image
            </button>
          </div>
        )}

        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="manual-form">
            <h3>Enter Barcode Manually</h3>
            <p className="text-secondary">Enter the barcode number from the product</p>
            
            <input
              type="text"
              className="input"
              placeholder="Enter barcode (e.g., 8901030123456)"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
              maxLength={14}
              disabled={scanning}
            />
            
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={scanning || !manualBarcode}
            >
              {scanning ? 'Searching...' : '🔍 Look Up Product'}
            </button>
          </form>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {scanning && <div className="spinner"></div>}
      </div>

      {/* Bottom Navigation */}
      <nav className="nav">
        <a href="/home" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </a>
        <a href="/scanner" className="nav-item active">
          <span className="nav-icon">📷</span>
          <span>Scan</span>
        </a>
        <a href="/profile" className="nav-item">
          <span className="nav-icon">👤</span>
          <span>Profile</span>
        </a>
      </nav>
    </div>
  )
}

export default Scanner

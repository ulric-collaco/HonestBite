import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { scanProduct } from '../services/api'
import { isValidBarcode, scanBarcodeFromImage } from '../utils/barcode'
import './Scanner.css'

function Scanner({ userId }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  
  const [mode, setMode] = useState('scan') // 'scan' | 'manual'
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [manualBarcode, setManualBarcode] = useState('')

  const processImage = async (file) => {
    setScanning(true)
    setError('')

    try {
      // Decode barcode from the image
      const decoded = await scanBarcodeFromImage(file)

      if (!isValidBarcode(decoded)) {
        throw new Error('Invalid or unsupported barcode detected')
      }

      // Send to backend for analysis by barcode
      const result = await scanProduct({
        user_id: userId,
        barcode: decoded,
        scan_type: 'barcode'
      })

      navigate('/results', { state: { scanResult: result } })
      
    } catch (err) {
      console.error('Barcode processing error:', err)
      setError('No barcode detected. Please retake the photo ensuring the barcode is clear and well-lit.')
    } finally {
      setScanning(false)
    }
  }

  const handleCameraCapture = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImage(file)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImage(file)
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
        <p>Choose how to scan your product</p>
      </div>

      <div className="container">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${mode === 'scan' ? 'active' : ''}`}
            onClick={() => setMode('scan')}
          >
            📷 Scan Barcode
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            ⌨️ Enter Barcode
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {mode === 'scan' ? (
          <>
            <div className="scan-options">
              <div className="scan-option-card">
                <div className="scan-icon-large">📷</div>
                <h2>Take Photo</h2>
                <p>Use your camera to capture the product barcode</p>
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={scanning}
                >
                  {scanning ? 'Processing...' : 'Open Camera'}
                </button>
              </div>

              <div className="scan-divider">
                <span>OR</span>
              </div>

              <div className="scan-option-card">
                <div className="scan-icon-large">📁</div>
                <h2>Upload Image</h2>
                <p>Select a photo where the barcode is visible</p>
                <button
                  className="btn btn-secondary btn-large"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={scanning}
                >
                  {scanning ? 'Processing...' : 'Choose File'}
                </button>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleCameraCapture}
            />
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            {scanning && (
              <div className="processing-overlay">
                <div className="spinner"></div>
                <p>Processing image...</p>
              </div>
            )}

            <div className="scanner-tips">
              <h3>📝 Tips for Best Results</h3>
              <ul>
                <li>✓ Ensure good lighting and avoid glare on the barcode</li>
                <li>✓ Fill the frame with the barcode and keep it in focus</li>
                <li>✓ Keep the barcode straight and not curved</li>
              </ul>
            </div>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="manual-form">
            <div className="manual-icon">🔢</div>
            <h3>Enter Barcode Number</h3>
            <p className="text-secondary">Type or paste the barcode from the product packaging</p>

            <input
              type="text"
              className="input barcode-input"
              placeholder="e.g., 8901030123456"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ''))}
              maxLength={14}
              disabled={scanning}
              autoFocus
            />

            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={scanning || !manualBarcode}
            >
              {scanning ? 'Searching...' : '🔍 Look Up Product'}
            </button>

            <div className="manual-tips">
              <p>💡 Barcodes are usually 8-14 digits long</p>
              <p>💡 Found under the product barcode lines</p>
            </div>
          </form>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleCameraCapture}
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {scanning && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Processing image...</p>
          </div>
        )}

        <div className="scanner-tips">
          <h3>📝 Tips for Best Results</h3>
          <ul>
            <li>✓ Ensure good lighting and avoid glare on the barcode</li>
            <li>✓ Fill the frame with the barcode and keep it in focus</li>
            <li>✓ Keep the barcode straight and not curved</li>
          </ul>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="nav">
        <Link to="/home" className="nav-item">
          <span className="nav-icon">🏠</span>
          <span>Home</span>
        </Link>
        <Link to="/scanner" className="nav-item active">
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

export default Scanner

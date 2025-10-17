import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { scanProduct, decodeBarcodeRemote } from '../services/api'
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
  const [detectedBarcode, setDetectedBarcode] = useState('')
  const [processingStep, setProcessingStep] = useState('')

  const processImage = async (file) => {
    setScanning(true)
    setError('')
    setDetectedBarcode('')
    setProcessingStep('Extracting barcode from image...')

    try {
      // Decode barcode from the image
      let decoded = null
      try {
        decoded = await scanBarcodeFromImage(file)
      } catch (localErr) {
        console.warn('Local barcode decode failed, trying remote:', localErr)
        setProcessingStep('Trying alternative barcode detection...')
        // Fallback to remote LogMeal decode using base64
        const toBase64 = (f) => new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsDataURL(f)
        })
        const base64 = await toBase64(file)
        try {
          const remote = await decodeBarcodeRemote(base64)
          decoded = remote?.barcode || null
        } catch (remoteErr) {
          console.error('Remote barcode decode failed:', remoteErr)
        }
      }

      if (!isValidBarcode(decoded)) {
        throw new Error('Invalid or unsupported barcode detected')
      }

      // Show the detected barcode
      setDetectedBarcode(decoded)
      setProcessingStep('Fetching product information...')

      // Send to backend for analysis by barcode
      const result = await scanProduct({
        user_id: userId,
        barcode: decoded,
        scan_type: 'barcode'
      })

      navigate('/results', { state: { scanResult: result } })
      
    } catch (err) {
      console.error('Barcode processing error:', err)
      setError(err.message || 'No barcode detected. Please retake the photo ensuring the barcode is clear and well-lit.')
      setDetectedBarcode('')
      setProcessingStep('')
    } finally {
      setScanning(false)
    }
  }

  const handleCameraCapture = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImage(file)
    // Reset input so same file can be selected again
    event.target.value = ''
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImage(file)
    // Reset input so same file can be selected again
    event.target.value = ''
  }

  // (Label OCR flow removed)

  const handleManualSubmit = async (e) => {
    e.preventDefault()

    console.log('Manual submit - User ID:', userId)
    console.log('Manual submit - Barcode:', manualBarcode)

    if (!isValidBarcode(manualBarcode)) {
      setError('Please enter a valid barcode (6-14 digits)')
      return
    }

    setScanning(true)
    setError('')
    setDetectedBarcode(manualBarcode)
    setProcessingStep('Fetching product information...')

    try {
      console.log('Calling scanProduct API...')
      const result = await scanProduct({
        user_id: userId,
        barcode: manualBarcode,
        scan_type: 'manual'
      })

      console.log('API Response:', result)
      navigate('/results', { state: { scanResult: result } })
    } catch (err) {
      console.error('Manual scan error - Full error:', err)
      console.error('Error response:', err.response)
      console.error('Error message:', err.message)
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Product not found. Please check the barcode.'
      setError(errorMsg)
      setDetectedBarcode('')
      setProcessingStep('')
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
                <p>{processingStep}</p>
                {detectedBarcode && (
                  <div className="detected-barcode">
                    <p className="barcode-label">Detected Barcode:</p>
                    <p className="barcode-value">{detectedBarcode}</p>
                  </div>
                )}
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

        {/* Hidden file inputs (barcode) */}
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

import { useState, useRef } from 'react'
import { Camera, Keyboard, Smartphone, ImagePlus, FileText, Sparkles, Target, Ruler, Binary, Lightbulb } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { scanProduct, extractBarcodes } from '../services/api'
import { isValidBarcode, scanBarcodeFromImage } from '../utils/barcode'
import './Scanner.css'

function Scanner({ userId }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  
  const [mode, setMode] = useState('scan') 
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
      let decoded = null
      try {
        setProcessingStep('Detecting barcode on server...')
        const serverRes = await extractBarcodes(file)
        const first = serverRes?.barcodes?.[0]?.text
        if (first) {
          decoded = first
        }
      } catch (srvErr) {
        console.warn('Server extract failed, falling back:', srvErr)
      }

      if (!decoded) {
        try {
          setProcessingStep('Trying on-device barcode decoding...')
          decoded = await scanBarcodeFromImage(file)
        } catch (localErr) {
          console.warn('Local barcode decode failed:', localErr)
        }
      }

      decoded = (decoded || '').toString().replace(/\D/g, '')

      if (!isValidBarcode(decoded)) {
        throw new Error('Invalid or unsupported barcode detected')
      }

      setDetectedBarcode(decoded)
      setProcessingStep('Fetching product information...')

      const result = await scanProduct({
        user_id: userId,
        barcode: decoded,
        scan_type: 'barcode'
      })
      if (result?.not_found) {
        const bc = result.barcode || decoded
        setError(`${result.message || 'Product not found.'} (Barcode: ${bc || 'N/A'})`)
        setProcessingStep('')
        setScanning(false)
        return
      }

      navigate('/results', { state: { scanResult: result } })
      
    } catch (err) {
      console.error('Barcode processing error:', err)
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error
      if (err?.response?.status === 404 && serverMsg) {
        setError(serverMsg)
      } else {
        setError(err.message || 'No barcode detected. Please retake the photo ensuring the barcode is clear and well-lit.')
      }
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
    event.target.value = ''
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImage(file)
    event.target.value = ''
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()

    if (!isValidBarcode(manualBarcode)) {
      setError('Please enter a valid barcode (6-14 digits)')
      return
    }

    setScanning(true)
    setError('')
    setDetectedBarcode(manualBarcode)
    setProcessingStep('Fetching product information...')

    try {
      const result = await scanProduct({
        user_id: userId,
        barcode: manualBarcode,
        scan_type: 'manual'
      })
      if (result?.not_found) {
        const bc = result.barcode || manualBarcode
        setError(`${result.message || 'Product not found.'} (Barcode: ${bc || 'N/A'})`)
        setProcessingStep('')
        setScanning(false)
        return
      }
      navigate('/results', { state: { scanResult: result } })
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Product not found. Please check the barcode.'
      setError(errorMsg)
      setDetectedBarcode('')
      setProcessingStep('')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="scanner-page page fade-in">
      <div className="scanner-header container">
        <h1>Add a Product</h1>
        <p>Scan a barcode to uncover health data</p>
      </div>

      <div className="container">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-toggle-btn ${mode === 'scan' ? 'active' : ''}`}
            onClick={() => setMode('scan')}
          >
            <span className="icon"><Camera size={18} /></span> Scan
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <span className="icon"><Keyboard size={18} /></span> Manual
          </button>
        </div>

        {error && (
          <div className="alert alert-danger stagger-1">
            {error}
          </div>
        )}

        {mode === 'scan' ? (
          <div className="scan-options stagger-2">
            <div className="scan-option-card card">
              <div className="scan-icon-large"><Smartphone size={48} /></div>
              <h2>Take a Photo</h2>
              <p>Capture the barcode directly using your camera</p>
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

            <div className="scan-option-card card">
              <div className="scan-icon-large"><ImagePlus size={48} /></div>
              <h2>Upload Image</h2>
              <p>Select an existing photo from your gallery</p>
              <button
                className="btn btn-secondary btn-large"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
              >
                {scanning ? 'Processing...' : 'Choose File'}
              </button>
            </div>
            
            <div className="scanner-tips stagger-3">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> Pro Tips</h3>
              <ul>
                <li><span className="icon" style={{ display: 'flex' }}><Sparkles size={16} /></span> Ensure good lighting to avoid glare</li>
                <li><span className="icon" style={{ display: 'flex' }}><Target size={16} /></span> Center the barcode filling the frame</li>
                <li><span className="icon" style={{ display: 'flex' }}><Ruler size={16} /></span> Keep the barcode flat and straight</li>
              </ul>
            </div>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="manual-form card stagger-2">
            <div className="manual-icon"><Binary size={48} /></div>
            <h2 className="text-center mb-1">Enter Barcode</h2>
            <p className="text-secondary text-center mb-3">Type the digits found below the lines</p>

            <input
              type="text"
              className="input barcode-input"
              placeholder="e.g. 8901030123456"
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
              {scanning ? 'Searching...' : 'Look Up Product'}
            </button>

            <div className="manual-tips">
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><span><Lightbulb size={16} /></span> Usually 8-14 digits long</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><span><Lightbulb size={16} /></span> Found right under the vertical lines</p>
            </div>
          </form>
        )}

        {/* Hidden inputs */}
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
                <p className="barcode-label">Detected Barcode</p>
                <p className="barcode-value">{detectedBarcode}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Scanner

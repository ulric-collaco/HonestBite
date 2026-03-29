import express from 'express'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { db } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Get doctor dashboard data
router.get('/:patient_id', async (req, res, next) => {
  try {
    const { patient_id } = req.params

    // Get patient info
    const patient = await db.single('SELECT * FROM users WHERE user_id = ?', [patient_id])

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    // Get scan history
    const { results: scanHistory } = await db.query(
      'SELECT * FROM scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 50',
      [patient_id]
    )

    // Get clinical notes
    const { results: notes } = await db.query(
      'SELECT * FROM clinical_notes WHERE user_id = ? ORDER BY created_at DESC',
      [patient_id]
    )

    // Get dismissed alerts
    const { results: dismissed } = await db.query(
      'SELECT alert_key FROM dismissed_alerts WHERE user_id = ?',
      [patient_id]
    )
    const dismissedKeys = dismissed.map(d => d.alert_key)

    // Parse data
    const parsedPatient = {
      ...patient,
      health_conditions: JSON.parse(patient.health_conditions || '[]'),
      allergies: JSON.parse(patient.allergies || '[]')
    }
    
    const parsedScans = scanHistory.map(scan => ({
      ...scan,
      risk_factors: JSON.parse(scan.risk_factors || '[]')
    }))

    // Calculate risk patterns
    const riskPatterns = calculateRiskPatterns(parsedScans)

    // Generate alerts and filter dismissed ones
    const allAlerts = generateDoctorAlerts(parsedScans, parsedPatient)
    const activeAlerts = allAlerts.filter(alert => !dismissedKeys.includes(alert.id))

    res.json({
      patient: parsedPatient,
      scan_history: parsedScans,
      risk_patterns: riskPatterns,
      alerts: activeAlerts,
      notes: notes
    })
  } catch (error) {
    next(error)
  }
})

// Add a clinical note
router.post('/:patient_id/notes', async (req, res, next) => {
  try {
    const { patient_id } = req.params
    const { note_text } = req.body

    if (!note_text) return res.status(400).json({ error: 'Note text is required' })

    await db.query(
      'INSERT INTO clinical_notes (user_id, note_text) VALUES (?, ?)',
      [patient_id, note_text]
    )

    res.status(201).json({ message: 'Note added successfully' })
  } catch (error) {
    next(error)
  }
})

// Dismiss an alert persistently
router.post('/:patient_id/dismiss-alert', async (req, res, next) => {
  try {
    const { patient_id } = req.params
    const { alert_key } = req.body

    if (!alert_key) return res.status(400).json({ error: 'Alert key is required' })

    await db.query(
      'INSERT OR IGNORE INTO dismissed_alerts (user_id, alert_key) VALUES (?, ?)',
      [patient_id, alert_key]
    )

    res.json({ message: 'Alert dismissed' })
  } catch (error) {
    next(error)
  }
})

// Export PDF report
router.get('/:patient_id/report', async (req, res, next) => {
  try {
    const { patient_id } = req.params

    const patient = await db.single('SELECT * FROM users WHERE user_id = ?', [patient_id])

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const { results: scanHistory } = await db.query(
      'SELECT * FROM scans WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 100',
      [patient_id]
    )

    const parsedPatient = {
      ...patient,
      health_conditions: JSON.parse(patient.health_conditions || '[]'),
      allergies: JSON.parse(patient.allergies || '[]')
    }

    const parsedScans = scanHistory.map(scan => ({
      ...scan,
      risk_factors: JSON.parse(scan.risk_factors || '[]')
    }))

    // Generate PDF
    const pdfBytes = await generatePDFReport(parsedPatient, parsedScans)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="honestbite-report-${patient_id}.pdf"`)
    res.send(Buffer.from(pdfBytes))

    logger.info(`Professional PDF report generated for patient: ${patient_id}`)
  } catch (error) {
    next(error)
  }
})

/**
 * Calculate risk patterns from scan history
 */
function calculateRiskPatterns(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) return {}

  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const recentScans = scanHistory.filter(s => new Date(s.scanned_at) >= oneWeekAgo)

  const riskyScans = recentScans.filter(scan => scan.truth_score <= 5)
  const highSugarScans = recentScans.filter(scan => scan.risk_factors?.some(r => r.includes('Sugar')))
  const highSodiumScans = recentScans.filter(scan => scan.risk_factors?.some(r => r.includes('Sodium')))

  const avgScore = scanHistory.length > 0
    ? Math.round(scanHistory.reduce((sum, s) => sum + s.truth_score, 0) / scanHistory.length)
    : 0

  return {
    'Total Scans (7 days)': recentScans.length,
    'Risky Products (Score ≤5)': riskyScans.length,
    'High Sugar Products': highSugarScans.length,
    'High Sodium Products': highSodiumScans.length,
    'Average Truth Score': avgScore
  }
}

/**
 * Generate alerts for doctor with Advanced Risk Detection
 */
function generateDoctorAlerts(scanHistory, patient) {
  const alerts = []
  const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const recentScans = scanHistory.filter(s => new Date(s.scanned_at) >= oneWeekAgo)

  // 1. Threshold-based Sugar Alert (Diabetics)
  if (patient.health_conditions?.includes('Diabetes')) {
    const thresholdSugar = 22.5 // High threshold for single item
    const criticalScans = recentScans.filter(scan => {
      const sugarFactor = scan.risk_factors?.find(r => r.includes('Sugar Content:'))
      if (!sugarFactor) return false
      const amount = parseFloat(sugarFactor.match(/[\d.]+/)?.[0] || '0')
      return amount > thresholdSugar
    })

    if (criticalScans.length > 0) {
      alerts.push({
        id: `sugar-clinical-${patient.user_id}`,
        title: 'Critical Sugar Intake Detected',
        message: `Patient scanned ${criticalScans.length} products with >22.5g sugar per 100g.`,
        severity: 'high'
      })
    }
  }

  // 2. Frequency-based Risky Pattern
  const riskyScans = recentScans.filter(scan => scan.truth_score <= 4)
  if (riskyScans.length >= 3) {
    alerts.push({
      id: `risky-pattern-${patient.user_id}`,
      title: 'Persistent Low-Score Purchases',
      message: `${riskyScans.length} products with Truth Score <4 detected in the last rolling 7 days.`,
      severity: 'medium'
    })
  }

  return alerts
}

/**
 * Upgraded Professional PDF Report
 */
async function generatePDFReport(patient, scanHistory) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  // Header Branding
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: rgb(0.05, 0.1, 0.25) })
  page.drawText('HonestBite', { x: 40, y: height - 45, size: 28, font: fontBold, color: rgb(1, 1, 1) })
  page.drawText('Clinical Nutritional Assessment', { x: 40, y: height - 65, size: 12, font, color: rgb(0.8, 0.8, 0.8) })

  let yPos = height - 120

  // Patient Info Header
  page.drawText('PATIENT PROFILE', { x: 40, y: yPos, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2) })
  yPos -= 25
  page.drawText(`ID: ${patient.user_id}`, { x: 40, y: yPos, size: 10, font })
  page.drawText(`Conditions: ${patient.health_conditions.join(', ') || 'None'}`, { x: 200, y: yPos, size: 10, font })
  yPos -= 20
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: 40, y: yPos, size: 10, font })
  
  // Risk Indicators Table
  yPos -= 40
  page.drawText('RECENT CONSUMPTION REGISTRY', { x: 40, y: yPos, size: 14, font: fontBold })
  yPos -= 25

  // Table Headers
  page.drawRectangle({ x: 40, y: yPos - 5, width: 515, height: 20, color: rgb(0.9, 0.9, 0.9) })
  page.drawText('Date', { x: 50, y: yPos, size: 10, font: fontBold })
  page.drawText('Product Name', { x: 120, y: yPos, size: 10, font: fontBold })
  page.drawText('Barcode', { x: 300, y: yPos, size: 10, font: fontBold })
  page.drawText('Truth Score', { x: 450, y: yPos, size: 10, font: fontBold })
  yPos -= 25

  const latestScans = scanHistory.slice(0, 25)
  for (const scan of latestScans) {
    if (yPos < 60) break

    const scoreColor = scan.truth_score > 7 ? rgb(0.1, 0.6, 0.2) : scan.truth_score > 4 ? rgb(0.8, 0.5, 0) : rgb(0.8, 0.1, 0.1)
    
    page.drawText(new Date(scan.scanned_at).toLocaleDateString().slice(0, 10), { x: 50, y: yPos, size: 9, font })
    page.drawText(scan.product_name.slice(0, 25), { x: 120, y: yPos, size: 9, font })
    page.drawText(scan.barcode.slice(0, 15), { x: 300, y: yPos, size: 9, font })
    
    // Draw Truth Score with colored indicator
    page.drawRectangle({ x: 450, y: yPos - 2, width: 25, height: 12, color: scoreColor })
    page.drawText(`${scan.truth_score}`, { x: 458, y: yPos, size: 10, font: fontBold, color: rgb(1, 1, 1) })
    
    yPos -= 20
    page.drawLine({ start: { x: 40, y: yPos + 5 }, end: { x: 555, y: yPos + 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) })
  }

  // Footer
  page.drawText('CONFIDENTIAL MEDICAL RECORD - This report is for clinical evaluation purposes only.', {
    x: 40, y: 30, size: 8, font, color: rgb(0.6, 0.6, 0.6)
  })

  return await pdfDoc.save()
}

export default router

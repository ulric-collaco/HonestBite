import express from 'express'
import { PDFDocument, rgb } from 'pdf-lib'
import { supabase } from '../config/database.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Get doctor dashboard data
router.get('/:patient_id', async (req, res, next) => {
  try {
    const { patient_id } = req.params

    // Get patient info
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', patient_id)
      .single()

    if (patientError) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    // Get scan history
    const { data: scanHistory, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', patient_id)
      .order('scanned_at', { ascending: false })
      .limit(50)

    if (scanError) throw scanError

    // Calculate risk patterns
    const riskPatterns = calculateRiskPatterns(scanHistory)

    // Generate alerts
    const alerts = generateDoctorAlerts(scanHistory, patient)

    res.json({
      patient: {
        user_id: patient.user_id,
        health_conditions: patient.health_conditions,
        allergies: patient.allergies,
        created_at: patient.created_at
      },
      scan_history: scanHistory,
      risk_patterns: riskPatterns,
      alerts
    })
  } catch (error) {
    next(error)
  }
})

// Export PDF report
router.get('/:patient_id/report', async (req, res, next) => {
  try {
    const { patient_id } = req.params

    // Get patient data
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', patient_id)
      .single()

    if (patientError) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    // Get scan history
    const { data: scanHistory, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', patient_id)
      .order('scanned_at', { ascending: false })
      .limit(50)

    if (scanError) throw scanError

    // Generate PDF
    const pdfBytes = await generatePDFReport(patient, scanHistory)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="patient-${patient_id}-report.pdf"`)
    res.send(Buffer.from(pdfBytes))

    logger.info(`PDF report generated for patient: ${patient_id}`)
  } catch (error) {
    next(error)
  }
})

/**
 * Calculate risk patterns from scan history
 */
function calculateRiskPatterns(scanHistory) {
  if (!scanHistory || scanHistory.length === 0) {
    return {}
  }

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const recentScans = scanHistory.filter(
    scan => new Date(scan.scanned_at) >= oneWeekAgo
  )

  const riskyScans = recentScans.filter(scan => scan.truth_score <= 5)
  const highSugarScans = recentScans.filter(
    scan => scan.risk_factors?.some(r => r.includes('Sugar'))
  )
  const highSodiumScans = recentScans.filter(
    scan => scan.risk_factors?.some(r => r.includes('Sodium'))
  )

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
 * Generate alerts for doctor
 */
function generateDoctorAlerts(scanHistory, patient) {
  const alerts = []

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const recentScans = scanHistory.filter(
    scan => new Date(scan.scanned_at) >= oneWeekAgo
  )

  const riskyScans = recentScans.filter(scan => scan.truth_score <= 5)

  // Alert if 3+ risky scans per week
  if (riskyScans.length >= 3) {
    alerts.push({
      id: `alert-${Date.now()}-1`,
      title: 'High Risk Pattern Detected',
      message: `Patient scanned ${riskyScans.length} risky products (score ≤5) in the past week`,
      timestamp: new Date().toISOString()
    })
  }

  // Check for specific health concerns
  if (patient.health_conditions?.includes('Diabetes')) {
    const highSugarScans = recentScans.filter(
      scan => scan.risk_factors?.some(r => r.toLowerCase().includes('sugar'))
    )
    
    if (highSugarScans.length >= 2) {
      alerts.push({
        id: `alert-${Date.now()}-2`,
        title: 'Diabetes Management Concern',
        message: `Patient (diabetic) scanned ${highSugarScans.length} high-sugar products this week`,
        timestamp: new Date().toISOString()
      })
    }
  }

  if (patient.health_conditions?.includes('Hypertension')) {
    const highSodiumScans = recentScans.filter(
      scan => scan.risk_factors?.some(r => r.toLowerCase().includes('sodium'))
    )
    
    if (highSodiumScans.length >= 2) {
      alerts.push({
        id: `alert-${Date.now()}-3`,
        title: 'Hypertension Management Concern',
        message: `Patient (hypertensive) scanned ${highSodiumScans.length} high-sodium products this week`,
        timestamp: new Date().toISOString()
      })
    }
  }

  return alerts
}

/**
 * Generate PDF report
 */
async function generatePDFReport(patient, scanHistory) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size
  const { width, height } = page.getSize()

  // Title
  page.drawText('Patient Nutrition Report', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0.15, 0.25, 0.91)
  })

  // Patient Info
  let yPos = height - 100
  page.drawText(`Patient ID: ${patient.user_id}`, { x: 50, y: yPos, size: 12 })
  yPos -= 25

  if (patient.health_conditions && patient.health_conditions.length > 0) {
    page.drawText(`Health Conditions: ${patient.health_conditions.join(', ')}`, {
      x: 50,
      y: yPos,
      size: 12
    })
    yPos -= 25
  }

  if (patient.allergies && patient.allergies.length > 0) {
    page.drawText(`Allergies: ${patient.allergies.join(', ')}`, {
      x: 50,
      y: yPos,
      size: 12
    })
    yPos -= 25
  }

  // Scan History
  yPos -= 30
  page.drawText('Recent Scan History:', { x: 50, y: yPos, size: 16, color: rgb(0, 0, 0) })
  yPos -= 25

  const recentScans = scanHistory.slice(0, 15)
  for (const scan of recentScans) {
    if (yPos < 100) break // Prevent overflow

    const date = new Date(scan.scanned_at).toLocaleDateString('en-IN')
    const text = `${date} - ${scan.product_name} (Score: ${scan.truth_score}/10)`
    
    page.drawText(text, { x: 50, y: yPos, size: 10 })
    yPos -= 20
  }

  // Footer
  page.drawText(`Generated on ${new Date().toLocaleString('en-IN')}`, {
    x: 50,
    y: 30,
    size: 10,
    color: rgb(0.5, 0.5, 0.5)
  })

  return await pdfDoc.save()
}

export default router

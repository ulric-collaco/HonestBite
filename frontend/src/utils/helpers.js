/**
 * Generate a unique user ID
 * @returns {string} Unique user ID
 */
export const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date)
  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return d.toLocaleDateString('en-IN', options)
}

/**
 * Format time for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  const d = new Date(date)
  const options = { hour: '2-digit', minute: '2-digit' }
  return d.toLocaleTimeString('en-IN', options)
}

/**
 * Format date and time for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  return `${formatDate(date)} at ${formatTime(date)}`
}

/**
 * Calculate time ago
 * @param {string|Date} date - Date to calculate from
 * @returns {string} Time ago string
 */
export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  
  let interval = Math.floor(seconds / 31536000)
  if (interval >= 1) return `${interval} year${interval > 1 ? 's' : ''} ago`
  
  interval = Math.floor(seconds / 2592000)
  if (interval >= 1) return `${interval} month${interval > 1 ? 's' : ''} ago`
  
  interval = Math.floor(seconds / 86400)
  if (interval >= 1) return `${interval} day${interval > 1 ? 's' : ''} ago`
  
  interval = Math.floor(seconds / 3600)
  if (interval >= 1) return `${interval} hour${interval > 1 ? 's' : ''} ago`
  
  interval = Math.floor(seconds / 60)
  if (interval >= 1) return `${interval} minute${interval > 1 ? 's' : ''} ago`
  
  return 'Just now'
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncate = (text, length = 50) => {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Download file from blob
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename for download
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Get color for truth score
 * @param {number} score - Truth score (1-10)
 * @returns {string} Color code
 */
export const getScoreColor = (score) => {
  // Monochrome mapping: higher scores use darker neutrals, lower scores lighter neutrals
  if (score >= 9) return '#111111' // very dark
  if (score >= 7) return '#2b2b2b'
  if (score >= 5) return '#4a4a4a'
  if (score >= 3) return '#6e6e73'
  return '#a1a1a6' // light gray
}

/**
 * Get label for truth score
 * @param {number} score - Truth score (1-10)
 * @returns {string} Label text
 */
export const getScoreLabel = (score) => {
  if (score >= 9) return 'Excellent'
  if (score >= 8) return 'Very Good'
  if (score >= 7) return 'Good'
  if (score >= 6) return 'Fair'
  if (score >= 5) return 'Average'
  if (score >= 4) return 'Below Average'
  if (score >= 3) return 'Poor'
  if (score >= 2) return 'Very Poor'
  return 'Avoid'
}

/**
 * Build the public doctor link for the given user/patient id based on current origin
 * Example (localhost): http://localhost:5173/doctor/<id>
 * Example (prod): https://honestbite.vercel.app/doctor/<id>
 */
export const buildDoctorLink = (userId) => {
  try {
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
    // Fallback domain if rendered in non-browser contexts
    const base = origin || 'https://honestbite.vercel.app'
    return `${base}/doctor/${encodeURIComponent(userId)}`
  } catch {
    return `https://honestbite.vercel.app/doctor/${encodeURIComponent(userId)}`
  }
}

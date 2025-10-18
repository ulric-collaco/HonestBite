import fetch from 'node-fetch'

const HF_MODEL = 'Piero2411/YOLOV8s-Barcode-Detection'
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`

/**
 * Call Hugging Face Inference API to detect barcode bounding boxes.
 * @param {Buffer} imageBuffer - Raw image bytes
 * @returns {Promise<Array<{box:[number,number,number,number], label:string, score:number}>>}
 */
export async function detectBarcodesHF(imageBuffer) {
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error('HF_API_KEY is not set in environment')
  }

  const res = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/octet-stream'
    },
    body: imageBuffer
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Hugging Face API error: ${res.status} ${res.statusText} - ${txt}`)
  }

  const data = await res.json()

  // Expected format: [{score, label, box: {xmin, ymin, xmax, ymax}}] or variant
  // Normalize to [x, y, w, h]
  if (!Array.isArray(data)) {
    // Some HF models return {error: 'loading'} initially; handle gracefully
    if (data && data.error) {
      throw new Error(`Hugging Face API returned error: ${data.error}`)
    }
    return []
  }

  const boxes = data.map(d => {
    let x = 0, y = 0, w = 0, h = 0
    if (d.box) {
      // YOLO models often return xmin/xmax/ymin/ymax
      const { xmin, xmax, ymin, ymax } = d.box
      if (typeof xmin === 'number' && typeof xmax === 'number' && typeof ymin === 'number' && typeof ymax === 'number') {
        x = xmin
        y = ymin
        w = Math.max(0, xmax - xmin)
        h = Math.max(0, ymax - ymin)
      }
    } else if (Array.isArray(d.boxes)) {
      // Some variants may nest boxes
      const b = d.boxes[0]
      if (b) {
        const { xmin, xmax, ymin, ymax } = b
        x = xmin; y = ymin; w = Math.max(0, xmax - xmin); h = Math.max(0, ymax - ymin)
      }
    } else if (Array.isArray(d.box)) {
      // Rare case: [x, y, w, h]
      ;[x, y, w, h] = d.box
    }

    return {
      box: [Math.round(x), Math.round(y), Math.round(w), Math.round(h)],
      label: d.label || 'barcode',
      score: typeof d.score === 'number' ? d.score : 0
    }
  }).filter(b => b.box[2] > 2 && b.box[3] > 2)

  return boxes
}

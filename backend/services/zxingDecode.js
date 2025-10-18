import { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, HybridBinarizer, BinaryBitmap } from '@zxing/library'
import sharp from 'sharp'

/**
 * Attempt to decode a barcode from an image buffer using ZXing.
 * Tries rotations 0/90/180/270 and common 1D formats.
 * @param {Buffer} imageBuffer
 * @returns {Promise<string|null>} decoded text or null
 */
export async function decodeBarcodeWithZXing(imageBuffer) {
  // Load via sharp to raw pixels
  const img = sharp(imageBuffer)
  const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  // Convert RGBA to RGB if needed
  const toRGB = (src) => {
    if (channels === 3) return src
    const rgb = Buffer.alloc(width * height * 3)
    for (let i = 0, j = 0; i < src.length; i += channels, j += 3) {
      rgb[j] = src[i]; rgb[j + 1] = src[i + 1]; rgb[j + 2] = src[i + 2]
    }
    return rgb
  }

  const rgbBytes = toRGB(data)

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.RSS_14,
    BarcodeFormat.RSS_EXPANDED
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)

  const reader = new MultiFormatReader()
  reader.setHints(hints)

  // Helper to decode given raw array and dims
  const tryDecode = (raw, w, h) => {
    const luminance = new RGBLuminanceSource(raw, w, h, 3)
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminance))
    return reader.decode(binaryBitmap)
  }

  // Try rotations
  const attempts = [0, 90, 180, 270]
  for (const angle of attempts) {
    try {
      if (angle === 0) {
        const res = tryDecode(rgbBytes, width, height)
        return res?.getText?.() || null
      }
      const rotated = await rotateRawRGB(rgbBytes, width, height, angle)
      const w = angle % 180 === 0 ? width : height
      const h = angle % 180 === 0 ? height : width
      const res = tryDecode(rotated, w, h)
      return res?.getText?.() || null
    } catch (e) {
      // continue trying
    }
  }

  return null
}

async function rotateRawRGB(raw, width, height, angle) {
  // Rotate by reusing sharp for simplicity
  const buf = await sharp(raw, { raw: { width, height, channels: 3 } })
    .rotate(angle)
    .raw()
    .toBuffer()
  const meta = await sharp(buf, { raw: { width: angle % 180 === 0 ? width : height, height: angle % 180 === 0 ? height : width, channels: 3 } }).metadata()
  // The above metadata call isn't necessary; dimensions are known from angle
  return buf
}

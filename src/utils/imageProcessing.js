// Shared client-side image handling for uploads (prompt demos, avatars, etc.).
// Goals: keep payloads small, normalise raster formats to WebP, and never
// rasterise vectors. Everything runs locally in the browser — no upload.

const DEFAULTS = {
  maxDimension: 1600,   // longest edge in px; larger images are downscaled
  quality: 0.82,        // WebP quality (0–1)
  maxSourceBytes: 15 * 1024 * 1024, // reject absurdly large source files up front
}

export function isSvg(file) {
  return file?.type === 'image/svg+xml' || /\.svg$/i.test(file?.name || '')
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

/**
 * Process an image File for upload.
 * - SVGs pass through untouched (vectors must stay vectors).
 * - Raster images are downscaled to `maxDimension` and re-encoded as WebP.
 * - Throws on non-images or files over `maxSourceBytes`.
 *
 * Returns { dataUrl, type, width, height, bytes, converted }.
 */
export async function processImageForUpload(file, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts }
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }
  if (file.size > cfg.maxSourceBytes) {
    throw new Error(`Image is too large (max ${Math.round(cfg.maxSourceBytes / 1024 / 1024)} MB)`)
  }

  // SVGs are already tiny and resolution-independent — keep them as-is.
  if (isSvg(file)) {
    const dataUrl = await readAsDataURL(file)
    return { dataUrl, type: 'image/svg+xml', width: 0, height: 0, bytes: file.size, converted: false }
  }

  const srcUrl = await readAsDataURL(file)
  const img = await loadImage(srcUrl)
  const longest = Math.max(img.width, img.height)
  const scale = longest > cfg.maxDimension ? cfg.maxDimension / longest : 1
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)

  const dataUrl = canvas.toDataURL('image/webp', cfg.quality)
  // Fallback: some browsers can't encode WebP via canvas — keep the original then.
  if (!dataUrl.startsWith('data:image/webp')) {
    return { dataUrl: srcUrl, type: file.type, width: img.width, height: img.height, bytes: file.size, converted: false }
  }
  const bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
  return { dataUrl, type: 'image/webp', width: w, height: h, bytes, converted: true }
}

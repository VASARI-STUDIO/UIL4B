import { useEffect, useRef, useState } from 'react'

// Measures one image the way the File Converter does: drawn to a canvas and encoded
// with `canvas.toBlob`. BEFORE is the source as a lossless PNG (or the real size of a
// file the visitor chose); AFTER is the re-encode at the format, quality and longest
// side on screen. Nothing runs until `near` is true, and each re-encode is debounced,
// so a dragged control costs one encode at the end.

const encode = (canvas, type, q) => new Promise((resolve) => {
  try { canvas.toBlob((b) => resolve(b ? b.size : null), type, q) } catch { resolve(null) }
})

const isImage = (file) => (file?.type || '').startsWith('image/')

/** The canvas scaled so its longest side is `limit`; the canvas itself when no limit applies. */
function limited(canvas, limit) {
  const longest = Math.max(canvas.width, canvas.height)
  if (!limit || longest <= limit) return canvas
  const k = limit / longest
  const small = document.createElement('canvas')
  small.width = Math.max(1, Math.round(canvas.width * k))
  small.height = Math.max(1, Math.round(canvas.height * k))
  small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height)
  return small
}

/**
 * `limit` is the longest side in px, or 0 to keep the size. `out` carries the type
 * and limit it was encoded at, so a reading from the previous setting is never shown
 * under the new one's name, plus the pixel size of the output.
 */
export function useTryMeasure({ near, source, format, quality, limit }) {
  const [pick, setPick] = useState(null)
  const [failed, setFailed] = useState(false)
  // { w, h, before } for the image being measured, and the latest AFTER reading.
  const [src, setSrc] = useState(null)
  const [out, setOut] = useState(null)
  const canvasRef = useRef(null)

  // Release a picked file's object URL when it is replaced or the page goes.
  useEffect(() => () => { if (pick?.url) URL.revokeObjectURL(pick.url) }, [pick])

  // Decode the image being compressed and measure its BEFORE size.
  useEffect(() => {
    if (!near || typeof document === 'undefined') return undefined
    const url = pick ? pick.url : source
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    img.decode().then(async () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvasRef.current = canvas
      const before = pick ? pick.size : await encode(canvas, 'image/png')
      if (cancelled) return
      // A zero-size image, or one past the browser's canvas limit, cannot be
      // measured; it reports as unsupported rather than waiting for a figure.
      if (!img.naturalWidth || !img.naturalHeight || !before) { setSrc(null); setFailed(true); return }
      setSrc({ w: img.naturalWidth, h: img.naturalHeight, before })
    }).catch(() => { if (!cancelled) { setSrc(null); if (pick) setFailed(true) } })
    return () => { cancelled = true }
  }, [near, pick, source])

  // Re-encode at the format, quality and size on screen.
  useEffect(() => {
    if (!src || !canvasRef.current) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      const canvas = limited(canvasRef.current, limit)
      const size = await encode(canvas, format, format === 'image/png' ? undefined : quality / 100)
      if (cancelled) return
      if (size == null) { setFailed(true); return }
      setOut({ size, type: format, limit, w: canvas.width, h: canvas.height })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [src, format, quality, limit])

  const takeImage = (file) => {
    if (!file) return
    // A rejected file leaves the current image and its measurements untouched.
    if (!isImage(file)) { setFailed(true); return }
    setOut(null)
    setSrc(null)
    setFailed(false)
    setPick({ name: file.name, size: file.size, url: URL.createObjectURL(file), file })
  }

  return { pick, failed, src, out, takeImage }
}

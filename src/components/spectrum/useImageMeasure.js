import { useEffect, useRef, useState } from 'react'

/** True from the first time the element is within `margin` of the viewport. */
export function useInView(ref, margin = '600px') {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return undefined
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, seen])
  return seen
}

const encode = (canvas, type, q) => new Promise((resolve) => {
  try { canvas.toBlob((b) => resolve(b ? b.size : null), type, q) } catch { resolve(null) }
})

const isImage = (file) => (file?.type || '').startsWith('image/')

/**
 * Measures one image the way the File Converter does: it is drawn to a canvas and
 * encoded with `canvas.toBlob` at the format and quality given. BEFORE is the
 * source as a lossless PNG (or the real size of a file the visitor chose); the
 * latest AFTER size is the re-encode. Nothing runs until `near` is true, and each
 * re-encode is debounced, so a dragged slider costs one encode at the end.
 */
export function useImageMeasure({ near, source, format, quality }) {
  const [pick, setPick] = useState(null)
  const [failed, setFailed] = useState(false)
  // { w, h, before } for the image being measured, and the latest AFTER size.
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

  // Re-encode at the format and quality on screen.
  useEffect(() => {
    if (!src || !canvasRef.current) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      const size = await encode(canvasRef.current, format, format === 'image/png' ? undefined : quality / 100)
      // The size is stored with the type it was encoded as, so a reading from
      // the previous format is never shown under the new one's name.
      if (cancelled) return
      if (size == null) { setFailed(true); return }
      setOut({ size, type: format })
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [src, format, quality])

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

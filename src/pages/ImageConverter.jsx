import { useState, useCallback, useRef } from 'react'
import JSZip from 'jszip'

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

const EXT_MAP = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/avif': 'avif' }

export default function ImageConverter({ toast }) {
  const [originals, setOriginals] = useState([])
  const [format, setFormat] = useState('image/webp')
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState(0)
  const fileInputRef = useRef(null)

  const handleFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return

    const loaded = []
    let count = 0
    imageFiles.forEach((file, idx) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          loaded[idx] = { img, name: file.name, size: file.size, w: img.width, h: img.height }
          count++
          if (count === imageFiles.length) setOriginals([...loaded])
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const getCanvas = useCallback((orig) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let w = orig.w, h = orig.h
    if (maxWidth > 0 && w > maxWidth) { h = Math.round(h * (maxWidth / w)); w = maxWidth }
    canvas.width = w; canvas.height = h
    if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h) }
    ctx.drawImage(orig.img, 0, 0, w, h)
    return { canvas, w, h }
  }, [format, maxWidth])

  const downloadSingle = useCallback((idx) => {
    const orig = originals[idx]
    if (!orig) return
    const ext = EXT_MAP[format] || 'webp'
    const { canvas } = getCanvas(orig)
    canvas.toBlob((blob) => {
      if (!blob) { toast('Format not supported'); return }
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = orig.name.replace(/\.[^.]+$/, '') + '.' + ext
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      toast('Downloaded ' + a.download)
    }, format, quality / 100)
  }, [originals, format, quality, getCanvas, toast])

  const downloadAll = useCallback(() => {
    if (!originals.length) return
    const zip = new JSZip()
    const ext = EXT_MAP[format] || 'webp'
    let pending = originals.length

    originals.forEach((orig) => {
      if (!orig) { pending--; return }
      const { canvas } = getCanvas(orig)
      canvas.toBlob((blob) => {
        if (blob) {
          const name = orig.name.replace(/\.[^.]+$/, '') + '.' + ext
          zip.file(name, blob)
        }
        pending--
        if (pending === 0) {
          zip.generateAsync({ type: 'blob' }).then((content) => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(content)
            a.download = 'converted-images.zip'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(a.href)
            toast(`Downloaded zip with ${originals.length} images`)
          })
        }
      }, format, quality / 100)
    })
  }, [originals, format, quality, getCanvas, toast])

  const clearAll = useCallback(() => {
    setOriginals([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const getPreview = useCallback((orig) => {
    const { canvas, w, h } = getCanvas(orig)
    let dataUrl
    try { dataUrl = canvas.toDataURL(format, quality / 100) }
    catch { dataUrl = canvas.toDataURL('image/png') }
    const cs = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75)
    const sv = orig.size > 0 ? Math.round((1 - cs / orig.size) * 100) : 0
    return { dataUrl, w, h, convertedSize: cs, savings: sv }
  }, [format, quality, getCanvas])

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Image Converter</h1>
        <p>Convert, compress, and resize images locally. Nothing gets uploaded.</p>
      </div>

      <div className="sub">
        <div
          className="img-drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; handleFiles(e.dataTransfer.files) }}
        >
          <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>Drop images here or click to browse</p>
          <p style={{ fontSize: 11, color: 'var(--t2)' }}>PNG, JPG, GIF, BMP, SVG, WebP, AVIF</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        </div>
      </div>

      {originals.length > 0 && (
        <>
          <div className="sub">
            <div className="sl">Output Settings</div>
            <div className="row" style={{ gap: 16, marginTop: 10 }}>
              <div>
                <div className="seg-label">Format</div>
                <select value={format} onChange={e => setFormat(e.target.value)} style={{ width: 140 }}>
                  <option value="image/webp">WebP</option>
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/avif">AVIF</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="seg-label">Quality</div>
                <div className="row">
                  <input type="range" min="1" max="100" value={quality} style={{ flex: 1 }} onChange={e => setQuality(+e.target.value)} />
                  <input type="number" min="1" max="100" value={quality} style={{ width: 64, textAlign: 'center' }} onChange={e => setQuality(Math.max(1, Math.min(100, +e.target.value || 80)))} />
                  <span style={{ fontSize: 11, color: 'var(--t1)' }}>%</span>
                </div>
              </div>
              <div>
                <div className="seg-label">Max Width</div>
                <input type="number" value={maxWidth} min="0" max="8000" style={{ width: 80 }} onChange={e => setMaxWidth(+e.target.value)} />
              </div>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn btn-accent" onClick={downloadAll}>Download All as ZIP</button>
              <button className="btn" onClick={clearAll}>Clear</button>
            </div>
          </div>

          <div className="sub">
            <div className="sl">Preview</div>
            <div className="img-grid">
              {originals.map((orig, idx) => {
                if (!orig) return null
                const ext = EXT_MAP[format] || 'webp'
                const preview = getPreview(orig)
                const bn = orig.name.replace(/\.[^.]+$/, '')
                return (
                  <div key={idx} className="card" style={{ padding: 10 }}>
                    <div style={{ background: 'var(--bg-2)', marginBottom: 8, overflow: 'hidden', borderRadius: 8 }}>
                      <img src={preview.dataUrl} style={{ width: '100%', display: 'block', maxHeight: 160, objectFit: 'contain' }} alt={bn} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bn}.{ext}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t2)', marginBottom: 2 }}>{preview.w} &times; {preview.h}px</div>
                    <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                      {formatBytes(orig.size)} &rarr; {formatBytes(preview.convertedSize)}{' '}
                      <span style={{ color: preview.savings > 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {preview.savings > 0 ? '−' : '+'}{Math.abs(preview.savings)}%
                      </span>
                    </div>
                    <button className="btn btn-s" style={{ marginTop: 8, width: '100%' }} onClick={() => downloadSingle(idx)}>
                      Download
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

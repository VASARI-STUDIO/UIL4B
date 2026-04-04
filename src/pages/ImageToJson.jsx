import { useState, useCallback, useRef } from 'react'

const STYLES = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Anime', '3D Render', 'Pixel Art', 'Comic Book', 'Concept Art', 'Line Art', 'Pencil Sketch', 'Surrealist']
const MOODS = ['Cinematic', 'Ethereal', 'Dark', 'Vibrant', 'Minimalist', 'Nostalgic', 'Futuristic', 'Dreamy', 'Gritty', 'Serene']
const LIGHTINGS = ['Natural', 'Studio', 'Golden Hour', 'Neon', 'Rim Light', 'Volumetric', 'Dramatic', 'Soft Ambient', 'Backlit', 'Low Key']
const COMPOSITIONS = ['Rule of Thirds', 'Centered', 'Wide Angle', 'Close-up', 'Birds Eye', 'Low Angle', 'Symmetrical', 'Dynamic', 'Panoramic']
const COLOR_PALETTES = ['Warm', 'Cool', 'Monochrome', 'Pastel', 'Neon', 'Earth Tones', 'High Contrast', 'Muted', 'Vibrant', 'Dark']

function extractDominantColors(canvas, ctx) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const colorCounts = {}
  const step = 4 * 10 // sample every 10th pixel
  for (let i = 0; i < data.length; i += step) {
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    const key = `${r},${g},${b}`
    colorCounts[key] = (colorCounts[key] || 0) + 1
  }
  return Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => {
      const [r, g, b] = k.split(',').map(Number)
      return '#' + [r, g, b].map(c => Math.min(255, c).toString(16).padStart(2, '0')).join('')
    })
}

function analyzeImageProperties(canvas, ctx) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let totalBrightness = 0
  let totalSaturation = 0
  const pixelCount = data.length / 4
  const step = 10

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    totalBrightness += (mx + mn) / 2
    totalSaturation += mx === 0 ? 0 : (mx - mn) / mx
  }

  const samples = Math.ceil(pixelCount / step)
  const avgBrightness = totalBrightness / samples
  const avgSaturation = totalSaturation / samples
  const aspectRatio = canvas.width / canvas.height

  let guessedMood = 'Vibrant'
  if (avgBrightness < 0.3) guessedMood = 'Dark'
  else if (avgBrightness > 0.7 && avgSaturation < 0.2) guessedMood = 'Minimalist'
  else if (avgBrightness > 0.6 && avgSaturation > 0.4) guessedMood = 'Vibrant'
  else if (avgSaturation < 0.15) guessedMood = 'Serene'
  else if (avgBrightness < 0.45) guessedMood = 'Cinematic'

  let guessedLighting = 'Natural'
  if (avgBrightness > 0.6) guessedLighting = 'Soft Ambient'
  else if (avgBrightness < 0.3) guessedLighting = 'Low Key'
  else if (avgBrightness > 0.45 && avgBrightness < 0.6) guessedLighting = 'Golden Hour'

  let guessedPalette = 'Vibrant'
  if (avgSaturation < 0.1) guessedPalette = 'Monochrome'
  else if (avgSaturation < 0.25) guessedPalette = 'Muted'
  else if (avgBrightness < 0.3) guessedPalette = 'Dark'
  else if (avgBrightness > 0.65) guessedPalette = 'Pastel'

  let ratioLabel = '1:1'
  if (aspectRatio > 1.7) ratioLabel = '16:9'
  else if (aspectRatio > 1.4) ratioLabel = '3:2'
  else if (aspectRatio > 1.2) ratioLabel = '4:3'
  else if (aspectRatio < 0.6) ratioLabel = '9:16'
  else if (aspectRatio < 0.75) ratioLabel = '2:3'

  return {
    brightness: Math.round(avgBrightness * 100),
    saturation: Math.round(avgSaturation * 100),
    mood: guessedMood,
    lighting: guessedLighting,
    colorPalette: guessedPalette,
    aspectRatio: ratioLabel,
    width: canvas.width,
    height: canvas.height,
  }
}

export default function ImageToJson({ onCopy }) {
  const [imageData, setImageData] = useState(null)
  const [imageName, setImageName] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [dominantColors, setDominantColors] = useState([])
  const [subject, setSubject] = useState('')
  const [style, setStyle] = useState('')
  const [mood, setMood] = useState('')
  const [lighting, setLighting] = useState('')
  const [composition, setComposition] = useState('')
  const [colorPalette, setColorPalette] = useState('')
  const [notes, setNotes] = useState('')
  const fileRef = useRef(null)

  const processImage = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      setImageData(e.target.result)
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 400 / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const colors = extractDominantColors(canvas, ctx)
        const props = analyzeImageProperties(canvas, ctx)

        setDominantColors(colors)
        setAnalysis(props)
        setMood(props.mood)
        setLighting(props.lighting)
        setColorPalette(props.colorPalette)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) processImage(file)
  }, [processImage])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }, [processImage])

  const buildJson = useCallback(() => {
    const obj = {
      source_image: {
        filename: imageName || undefined,
        dimensions: analysis ? { width: analysis.width, height: analysis.height } : undefined,
        aspect_ratio: analysis?.aspectRatio || undefined,
      },
      analysis: {
        brightness: analysis?.brightness !== undefined ? analysis.brightness + '%' : undefined,
        saturation: analysis?.saturation !== undefined ? analysis.saturation + '%' : undefined,
        dominant_colors: dominantColors.length > 0 ? dominantColors : undefined,
        color_palette: colorPalette || undefined,
      },
      reconstructed_prompt: {
        subject: subject || undefined,
        style: style || undefined,
        mood: mood || undefined,
        lighting: lighting || undefined,
        composition: composition || undefined,
        notes: notes || undefined,
      },
    }
    // Clean undefined
    const clean = (o) => {
      Object.keys(o).forEach(k => {
        if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) clean(o[k])
        if (o[k] === undefined) delete o[k]
      })
    }
    clean(obj)
    return JSON.stringify(obj, null, 2)
  }, [imageName, analysis, dominantColors, colorPalette, subject, style, mood, lighting, composition, notes])

  const handleReset = () => {
    setImageData(null)
    setImageName('')
    setAnalysis(null)
    setDominantColors([])
    setSubject('')
    setStyle('')
    setMood('')
    setLighting('')
    setComposition('')
    setColorPalette('')
    setNotes('')
  }

  return (
    <div className="sec">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 2, background: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Reverse Engine V1.0</span>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Image to JSON
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Reverse-engineer any image into a structured JSON prompt. Extract colors, analyze mood and lighting, then reconstruct a reproducible prompt configuration.
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="img-drop-zone"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ marginBottom: 24, position: 'relative', overflow: 'hidden' }}
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        {imageData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={imageData} alt="Uploaded" style={{ maxHeight: 240, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }} />
            <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{imageName}</span>
          </div>
        ) : (
          <div style={{ padding: '20px 0' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>Drop an image here or click to upload</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>PNG, JPG, WEBP supported</div>
          </div>
        )}
      </div>

      {analysis && (
        <>
          {/* Analysis + Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 360px) 1fr', gap: 14, marginBottom: 24 }}>
            {/* Auto-detected properties */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '18px 22px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Auto-Detected Properties</div>
              </div>

              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Brightness</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{analysis.brightness}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-4)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${analysis.brightness}%`, background: 'var(--accent)', borderRadius: 2 }} />
                </div>
              </div>

              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Saturation</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{analysis.saturation}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-4)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${analysis.saturation}%`, background: 'var(--accent)', borderRadius: 2 }} />
                </div>
              </div>

              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 8 }}>Dominant Colors</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {dominantColors.map((c, i) => (
                    <div key={i} onClick={() => onCopy(c)} style={{ width: 32, height: 32, borderRadius: 4, background: c, cursor: 'pointer', border: '1px solid var(--border)' }} title={c} />
                  ))}
                </div>
              </div>

              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Aspect Ratio</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{analysis.aspectRatio}</span>
                </div>
              </div>

              <div style={{ padding: '0 22px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Resolution</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{analysis.width} × {analysis.height}</span>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '18px 22px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Reconstructed Prompt</div>
              </div>

              <div style={{ padding: '0 22px 14px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Subject</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Describe the main subject" style={{ width: '100%', fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 22px 14px' }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Style</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} style={{ width: '100%' }}>
                    <option value="">Detect...</option>
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Mood</label>
                  <select value={mood} onChange={e => setMood(e.target.value)} style={{ width: '100%' }}>
                    {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 22px 14px' }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Lighting</label>
                  <select value={lighting} onChange={e => setLighting(e.target.value)} style={{ width: '100%' }}>
                    {LIGHTINGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Composition</label>
                  <select value={composition} onChange={e => setComposition(e.target.value)} style={{ width: '100%' }}>
                    <option value="">Detect...</option>
                    {COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 22px 14px' }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Color Palette</label>
                  <select value={colorPalette} onChange={e => setColorPalette(e.target.value)} style={{ width: '100%' }}>
                    {COLOR_PALETTES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ padding: '0 22px 22px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations..." rows={2} style={{ width: '100%', resize: 'vertical', fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* JSON Output */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>JSON Output</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-s" onClick={() => onCopy(buildJson())} style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </button>
                <button className="btn btn-s" onClick={() => {
                  const blob = new Blob([buildJson()], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${imageName.replace(/\.[^.]+$/, '')}-prompt.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }} style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Download .json
                </button>
              </div>
            </div>
            <div className="code" onClick={() => onCopy(buildJson())} style={{ fontSize: 12, lineHeight: 1.8 }}>{buildJson()}</div>
          </div>

          <button className="btn" onClick={handleReset} style={{ fontWeight: 600 }}>Analyze Another Image</button>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)' }}>
          Powered by <span style={{ fontWeight: 800, color: 'var(--t0)', textTransform: 'uppercase' }}>Obsidian Core</span> pixel analysis
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Reverse Engine Active</span>
        </span>
      </div>
    </div>
  )
}

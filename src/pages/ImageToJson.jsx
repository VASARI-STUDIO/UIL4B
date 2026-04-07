import { useState, useCallback, useRef } from 'react'

const STYLES = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Anime', '3D Render', 'Pixel Art', 'Comic Book', 'Concept Art', 'Line Art', 'Pencil Sketch', 'Surrealist']
const MOODS = ['Cinematic', 'Ethereal', 'Dark', 'Vibrant', 'Minimalist', 'Nostalgic', 'Futuristic', 'Dreamy', 'Gritty', 'Serene']
const LIGHTINGS = ['Natural', 'Studio', 'Golden Hour', 'Neon', 'Rim Light', 'Volumetric', 'Dramatic', 'Soft Ambient', 'Backlit', 'Low Key']
const COMPOSITIONS = ['Rule of Thirds', 'Centered', 'Wide Angle', 'Close-up', 'Birds Eye', 'Low Angle', 'Symmetrical', 'Dynamic', 'Panoramic']

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (mx + mn) / 2
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    switch (mx) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s, l]
}

function extractDominantColors(canvas, ctx) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const colorCounts = {}
  const step = 4 * 8
  for (let i = 0; i < data.length; i += step) {
    const r = Math.round(data[i] / 24) * 24
    const g = Math.round(data[i + 1] / 24) * 24
    const b = Math.round(data[i + 2] / 24) * 24
    const key = `${r},${g},${b}`
    colorCounts[key] = (colorCounts[key] || 0) + 1
  }
  return Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => {
      const [r, g, b] = k.split(',').map(Number)
      return '#' + [r, g, b].map(c => Math.min(255, c).toString(16).padStart(2, '0')).join('')
    })
}

function describeHue(hueDeg) {
  if (hueDeg < 15 || hueDeg >= 345) return 'crimson red'
  if (hueDeg < 45) return 'amber orange'
  if (hueDeg < 65) return 'golden yellow'
  if (hueDeg < 100) return 'lime green'
  if (hueDeg < 150) return 'forest green'
  if (hueDeg < 180) return 'teal cyan'
  if (hueDeg < 220) return 'azure blue'
  if (hueDeg < 260) return 'indigo violet'
  if (hueDeg < 290) return 'amethyst purple'
  if (hueDeg < 330) return 'magenta pink'
  return 'rose'
}

function analyzeImageProperties(canvas, ctx) {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  let totalBrightness = 0, totalSaturation = 0
  let warmPixels = 0, coolPixels = 0, neutralPixels = 0
  let darkPixels = 0, midPixels = 0, lightPixels = 0
  let edgeStrength = 0, edgeCount = 0
  const hueBuckets = new Array(12).fill(0)
  const w = canvas.width, h = canvas.height
  const step = 6

  // Edge detection (Sobel-lite, sample-based)
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = (y * w + x) * 4
      const i_r = (y * w + (x + 1)) * 4
      const i_d = ((y + 1) * w + x) * 4
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
      const lumR = (data[i_r] + data[i_r + 1] + data[i_r + 2]) / 3
      const lumD = (data[i_d] + data[i_d + 1] + data[i_d + 2]) / 3
      const diff = Math.abs(lum - lumR) + Math.abs(lum - lumD)
      if (diff > 25) edgeCount++
      edgeStrength += diff
    }
  }
  const totalSamples = Math.floor((h - 2) / step) * Math.floor((w - 2) / step)
  const edgeRatio = edgeCount / totalSamples
  const avgEdge = edgeStrength / totalSamples

  // Color analysis
  let pixelSamples = 0
  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const [hue, sat, light] = rgbToHsl(r, g, b)
    totalBrightness += light
    totalSaturation += sat

    if (sat > 0.15) {
      hueBuckets[Math.floor(hue / 30) % 12]++
      // Warm vs cool classification
      if ((hue < 70 || hue > 320) && sat > 0.2) warmPixels++
      else if (hue >= 180 && hue <= 260 && sat > 0.2) coolPixels++
      else neutralPixels++
    } else {
      neutralPixels++
    }

    if (light < 0.33) darkPixels++
    else if (light < 0.66) midPixels++
    else lightPixels++

    pixelSamples++
  }

  const avgBrightness = totalBrightness / pixelSamples
  const avgSaturation = totalSaturation / pixelSamples

  // Tonal range / contrast
  const tonalRange = (lightPixels / pixelSamples) - (darkPixels / pixelSamples)
  const contrastScore = Math.abs(lightPixels - darkPixels) / pixelSamples
  const balanceScore = midPixels / pixelSamples
  let contrastLevel = 'medium'
  if (contrastScore > 0.45 || (lightPixels > pixelSamples * 0.4 && darkPixels > pixelSamples * 0.3)) contrastLevel = 'high'
  else if (balanceScore > 0.6) contrastLevel = 'soft'
  else if (avgBrightness < 0.25 && balanceScore < 0.3) contrastLevel = 'dramatic'

  // Color temperature
  let temperature = 'neutral'
  if (warmPixels > coolPixels * 1.4) temperature = 'warm'
  else if (coolPixels > warmPixels * 1.4) temperature = 'cool'

  // Detail level from edges
  let detailLevel = 'moderate detail'
  if (edgeRatio > 0.35 || avgEdge > 22) detailLevel = 'highly detailed, intricate textures'
  else if (edgeRatio > 0.18) detailLevel = 'detailed, sharp focus'
  else if (edgeRatio < 0.06) detailLevel = 'smooth, minimal texture'
  else if (edgeRatio < 0.12) detailLevel = 'soft details, painterly'

  // Mood inference
  let mood = 'Vibrant'
  if (avgBrightness < 0.22 && avgSaturation < 0.4) mood = 'Dark'
  else if (avgBrightness < 0.35 && contrastScore > 0.3) mood = 'Cinematic'
  else if (avgBrightness > 0.75 && avgSaturation < 0.25) mood = 'Minimalist'
  else if (avgBrightness > 0.6 && avgSaturation < 0.4 && temperature === 'warm') mood = 'Dreamy'
  else if (avgBrightness > 0.55 && avgSaturation > 0.5) mood = 'Vibrant'
  else if (avgSaturation < 0.18) mood = 'Serene'
  else if (avgBrightness < 0.45 && avgSaturation > 0.4) mood = 'Gritty'
  else if (temperature === 'cool' && avgBrightness > 0.5) mood = 'Ethereal'
  else if (avgBrightness < 0.4 && temperature === 'cool') mood = 'Nostalgic'

  // Lighting inference
  let lighting = 'Natural'
  if (avgBrightness < 0.22) lighting = 'Low Key'
  else if (avgBrightness < 0.35 && contrastScore > 0.35) lighting = 'Dramatic'
  else if (avgBrightness > 0.7 && balanceScore > 0.5) lighting = 'Soft Ambient'
  else if (temperature === 'warm' && avgBrightness > 0.4 && avgBrightness < 0.65) lighting = 'Golden Hour'
  else if (temperature === 'cool' && avgSaturation > 0.5 && avgBrightness < 0.5) lighting = 'Neon'
  else if (contrastScore > 0.4 && balanceScore < 0.3) lighting = 'Rim Light'
  else if (avgBrightness > 0.55 && contrastScore < 0.2) lighting = 'Studio'

  // Style guess
  let style = 'Photorealistic'
  if (edgeRatio < 0.08 && avgSaturation > 0.4) style = 'Digital Art'
  else if (edgeRatio < 0.1 && avgSaturation < 0.3) style = 'Watercolor'
  else if (edgeRatio > 0.4) style = 'Concept Art'
  else if (avgSaturation > 0.6 && contrastScore > 0.3) style = '3D Render'

  // Composition guess from aspect & pixel distribution
  const aspectRatio = w / h
  let composition = 'Rule of Thirds'
  if (Math.abs(aspectRatio - 1) < 0.05) composition = 'Centered'
  else if (aspectRatio > 2.2) composition = 'Panoramic'
  else if (aspectRatio > 1.7) composition = 'Wide Angle'
  else if (aspectRatio < 0.7) composition = 'Low Angle'

  let ratioLabel = '1:1'
  if (aspectRatio > 1.7) ratioLabel = '16:9'
  else if (aspectRatio > 1.4) ratioLabel = '3:2'
  else if (aspectRatio > 1.2) ratioLabel = '4:3'
  else if (aspectRatio < 0.6) ratioLabel = '9:16'
  else if (aspectRatio < 0.75) ratioLabel = '2:3'

  // Dominant hue family
  const maxBucket = hueBuckets.indexOf(Math.max(...hueBuckets))
  const dominantHueName = describeHue(maxBucket * 30 + 15)

  // Color palette descriptor
  let paletteDescriptor = 'balanced color palette'
  if (avgSaturation < 0.1) paletteDescriptor = 'monochromatic palette'
  else if (avgSaturation < 0.25) paletteDescriptor = 'muted desaturated palette'
  else if (avgSaturation > 0.55 && avgBrightness > 0.55) paletteDescriptor = 'vibrant saturated palette'
  else if (avgBrightness > 0.7 && avgSaturation < 0.45) paletteDescriptor = 'pastel palette'
  else if (avgBrightness < 0.3) paletteDescriptor = 'dark moody palette'
  else if (temperature === 'warm') paletteDescriptor = 'warm earth tone palette'
  else if (temperature === 'cool') paletteDescriptor = 'cool tone palette'

  return {
    brightness: Math.round(avgBrightness * 100),
    saturation: Math.round(avgSaturation * 100),
    contrast: Math.round(contrastScore * 100),
    edgeDensity: Math.round(edgeRatio * 100),
    temperature,
    contrastLevel,
    detailLevel,
    mood,
    lighting,
    style,
    composition,
    aspectRatio: ratioLabel,
    width: w,
    height: h,
    dominantHueName,
    paletteDescriptor,
    tonalRange: tonalRange > 0.15 ? 'high key' : tonalRange < -0.15 ? 'low key' : 'mid tone',
  }
}

function buildAutoPrompt(props, dominantColors, subject) {
  const subj = subject || `a ${props.dominantHueName} toned scene`
  const parts = [
    subj,
    `${props.style.toLowerCase()} style`,
    `${props.mood.toLowerCase()} atmosphere`,
    `${props.lighting.toLowerCase()} lighting`,
    props.detailLevel,
    props.paletteDescriptor,
    `${props.temperature} color temperature`,
    `${props.contrastLevel} contrast`,
    `${props.composition.toLowerCase()} composition`,
    `dominant tones of ${dominantColors.slice(0, 3).join(', ')}`,
    `${props.tonalRange} exposure`,
    'professional photography, ultra detailed, masterpiece, 8k resolution',
  ]
  return parts.join(', ')
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
  const [notes, setNotes] = useState('')
  const [autoPrompt, setAutoPrompt] = useState('')
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
        const scale = Math.min(1, 500 / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const colors = extractDominantColors(canvas, ctx)
        const props = analyzeImageProperties(canvas, ctx)

        setDominantColors(colors)
        setAnalysis(props)
        setStyle(props.style)
        setMood(props.mood)
        setLighting(props.lighting)
        setComposition(props.composition)
        setAutoPrompt(buildAutoPrompt(props, colors, ''))
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

  const regeneratePrompt = useCallback(() => {
    if (!analysis) return
    const customProps = { ...analysis, style, mood, lighting, composition }
    setAutoPrompt(buildAutoPrompt(customProps, dominantColors, subject))
  }, [analysis, style, mood, lighting, composition, subject, dominantColors])

  const buildJson = useCallback(() => {
    const obj = {
      source_image: {
        filename: imageName || undefined,
        dimensions: analysis ? { width: analysis.width, height: analysis.height } : undefined,
        aspect_ratio: analysis?.aspectRatio || undefined,
      },
      visual_analysis: analysis ? {
        brightness: analysis.brightness + '%',
        saturation: analysis.saturation + '%',
        contrast: analysis.contrast + '%',
        edge_density: analysis.edgeDensity + '%',
        color_temperature: analysis.temperature,
        contrast_level: analysis.contrastLevel,
        tonal_range: analysis.tonalRange,
        detail_level: analysis.detailLevel,
        dominant_hue: analysis.dominantHueName,
        color_palette: analysis.paletteDescriptor,
        dominant_colors: dominantColors,
      } : undefined,
      reconstructed_prompt: {
        subject: subject || undefined,
        style: style || undefined,
        mood: mood || undefined,
        lighting: lighting || undefined,
        composition: composition || undefined,
        notes: notes || undefined,
      },
      full_prompt: autoPrompt || undefined,
      negative_prompt: 'blurry, low quality, distorted, watermark, text, logo, deformed',
      parameters: analysis ? {
        aspect_ratio: analysis.aspectRatio,
        steps: 30,
        cfg_scale: 7.5,
        sampler: 'DPM++ 2M Karras',
      } : undefined,
    }
    const clean = (o) => {
      Object.keys(o).forEach(k => {
        if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) clean(o[k])
        if (o[k] === undefined) delete o[k]
      })
    }
    clean(obj)
    return JSON.stringify(obj, null, 2)
  }, [imageName, analysis, dominantColors, subject, style, mood, lighting, composition, notes, autoPrompt])

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
    setNotes('')
    setAutoPrompt('')
  }

  return (
    <div className="sec">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 2, background: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Reverse Engine V2.0</span>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Image to JSON
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Reverse-engineer any image into a complete generator-ready prompt. Deep pixel analysis extracts color temperature, contrast, edge density, tonal range, and lighting to reconstruct a reproducible prompt.
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
            <img src={imageData} alt="Uploaded" style={{ maxHeight: 280, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }} />
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
          {/* Auto-generated prompt — top of results */}
          <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent)', background: 'linear-gradient(180deg, var(--card) 0%, var(--accent-bg) 200%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>Auto-Generated Prompt</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-s" onClick={regeneratePrompt} style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Regenerate</button>
                <button className="btn btn-s btn-accent" onClick={() => onCopy(autoPrompt)} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Copy Prompt</button>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--t0)', lineHeight: 1.7, fontFamily: 'var(--mono)' }}>{autoPrompt}</p>
          </div>

          {/* Deep Analysis Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%), 1fr))', gap: 14, marginBottom: 24 }}>
            <MetricCard label="Style" value={analysis.style} sub="visual treatment" />
            <MetricCard label="Mood" value={analysis.mood} sub="emotional tone" />
            <MetricCard label="Lighting" value={analysis.lighting} sub="light source type" />
            <MetricCard label="Temperature" value={analysis.temperature} sub="color warmth" />
            <MetricCard label="Contrast" value={analysis.contrastLevel} sub={`${analysis.contrast}% delta`} />
            <MetricCard label="Tonal Range" value={analysis.tonalRange} sub="exposure key" />
            <MetricCard label="Detail Level" value={analysis.detailLevel.split(',')[0]} sub={`${analysis.edgeDensity}% edge density`} />
            <MetricCard label="Dominant Hue" value={analysis.dominantHueName} sub={analysis.paletteDescriptor} />
          </div>

          {/* Visual Stats + Editable Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 360px) 1fr', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '18px 22px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Pixel Histograms</div>
              </div>

              <StatBar label="Brightness" value={analysis.brightness} />
              <StatBar label="Saturation" value={analysis.saturation} />
              <StatBar label="Contrast" value={analysis.contrast} />
              <StatBar label="Edge Density" value={analysis.edgeDensity} />

              <div style={{ padding: '0 22px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 8 }}>Dominant Colors</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {dominantColors.map((c, i) => (
                    <div key={i} onClick={() => onCopy(c)} style={{ aspectRatio: '1', borderRadius: 4, background: c, cursor: 'pointer', border: '1px solid var(--border)', position: 'relative' }} title={c}>
                      <span style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: '0 22px 22px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Aspect</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{analysis.aspectRatio}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t2)' }}>Resolution</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>{analysis.width}×{analysis.height}</div>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '18px 22px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Refine Prompt Components</div>
              </div>

              <div style={{ padding: '0 22px 14px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Subject (describe what you see)</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. a vintage motorcycle on a coastal road" style={{ width: '100%', fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 22px 14px' }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Style</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} style={{ width: '100%' }}>
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
                    {COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ padding: '0 22px 22px' }}>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional observations or specific elements..." rows={2} style={{ width: '100%', resize: 'vertical', fontSize: 12 }} />
              </div>
            </div>
          </div>

          {/* JSON Output */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Full JSON Output</span>
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
            <div className="code" onClick={() => onCopy(buildJson())} style={{ fontSize: 12, lineHeight: 1.8, maxHeight: 500, overflowY: 'auto' }}>{buildJson()}</div>
          </div>

          <button className="btn" onClick={handleReset} style={{ fontWeight: 600 }}>Analyze Another Image</button>
        </>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)' }}>
          Powered by <span style={{ fontWeight: 800, color: 'var(--t0)', textTransform: 'uppercase' }}>Obsidian Core</span> deep pixel analysis
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Reverse Engine Active</span>
        </span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t0)', marginBottom: 4, textTransform: 'capitalize' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{sub}</div>
    </div>
  )
}

function StatBar({ label, value }) {
  return (
    <div style={{ padding: '0 22px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{value}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-4)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: 'var(--accent)', borderRadius: 2 }} />
      </div>
    </div>
  )
}

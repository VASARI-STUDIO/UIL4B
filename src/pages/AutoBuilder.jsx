import { useState, useRef, useCallback } from 'react'
import AuthGate from '../components/AuthGate'

// ── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'generate', label: 'Generate from Description' },
  { id: 'upload', label: 'Upload Brand Assets' },
]

const MOODS = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'playful', label: 'Playful' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'rustic', label: 'Rustic' },
]

const FONT_PAIRS = [
  { primary: 'Inter', secondary: 'Merriweather', vibe: 'Clean & readable' },
  { primary: 'Playfair Display', secondary: 'Source Sans 3', vibe: 'Elegant editorial' },
  { primary: 'Montserrat', secondary: 'Lora', vibe: 'Modern & warm' },
  { primary: 'Raleway', secondary: 'Roboto Slab', vibe: 'Geometric & grounded' },
  { primary: 'DM Sans', secondary: 'DM Serif Display', vibe: 'Balanced contrast' },
  { primary: 'Space Grotesk', secondary: 'Libre Baskerville', vibe: 'Tech meets tradition' },
  { primary: 'Outfit', secondary: 'Crimson Pro', vibe: 'Fresh & sophisticated' },
  { primary: 'Archivo', secondary: 'Spectral', vibe: 'Bold headlines, gentle body' },
  { primary: 'Sora', secondary: 'Newsreader', vibe: 'Futuristic & editorial' },
  { primary: 'Poppins', secondary: 'PT Serif', vibe: 'Friendly & classic' },
]

// Mood → HSL hue ranges and saturation/lightness character
const MOOD_PROFILES = {
  minimal:   { hues: [210, 220], sat: [8, 18], lit: [45, 60], accent: [210, 70, 50] },
  bold:      { hues: [0, 350], sat: [75, 90], lit: [45, 55], accent: [350, 85, 50] },
  playful:   { hues: [160, 280], sat: [60, 80], lit: [50, 60], accent: [280, 70, 55] },
  corporate: { hues: [210, 230], sat: [50, 70], lit: [35, 50], accent: [220, 65, 45] },
  elegant:   { hues: [30, 50], sat: [20, 40], lit: [25, 45], accent: [40, 35, 35] },
  rustic:    { hues: [20, 40], sat: [40, 60], lit: [35, 50], accent: [25, 55, 42] },
}

const MOOD_RATIONALES = {
  minimal: 'Neutral tones with a restrained palette keep the focus on content and whitespace.',
  bold: 'High-saturation, high-contrast colors demand attention and convey energy.',
  playful: 'Bright, varied hues evoke creativity and approachability.',
  corporate: 'Cool blues and balanced contrast project trust and professionalism.',
  elegant: 'Muted warm tones with deep darks communicate luxury and refinement.',
  rustic: 'Earthy mid-tones and warm undertones feel authentic and handcrafted.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Simple hash from a string to a 0–1 float */
function hashSeed(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h % 10000) / 10000
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))
  return '#' + [f(0), f(8), f(4)].map(c => c.toString(16).padStart(2, '0')).join('')
}

function lerp(a, b, t) { return a + (b - a) * t }

/** Generate a 5-color palette from mood + description seed */
function generatePalette(mood, description) {
  const profile = MOOD_PROFILES[mood] || MOOD_PROFILES.minimal
  const seed = hashSeed(description || 'default')

  const baseHue = lerp(profile.hues[0], profile.hues[1], seed)
  const baseSat = lerp(profile.sat[0], profile.sat[1], seed)
  const baseLit = lerp(profile.lit[0], profile.lit[1], seed)

  return [
    { hex: hslToHex(baseHue, baseSat, baseLit), role: 'Primary' },
    { hex: hslToHex((baseHue + 30) % 360, baseSat * 0.8, baseLit + 10), role: 'Secondary' },
    { hex: hslToHex((baseHue + 180) % 360, baseSat * 0.6, 50), role: 'Accent' },
    { hex: hslToHex(baseHue, baseSat * 0.15, 95), role: 'Background' },
    { hex: hslToHex(baseHue, baseSat * 0.3, 15), role: 'Text' },
  ]
}

/** Pick a deterministic font pair from mood + description */
function pickFontPair(mood, description) {
  const seed = hashSeed((mood || '') + (description || ''))
  // Weight the choice by mood for thematic consistency
  const moodMap = {
    minimal: [0, 4, 6],
    bold: [3, 7, 5],
    playful: [2, 9, 6],
    corporate: [0, 3, 4],
    elegant: [1, 4, 8],
    rustic: [2, 5, 9],
  }
  const candidates = moodMap[mood] || [0, 1, 2]
  const idx = candidates[Math.floor(seed * candidates.length)]
  return FONT_PAIRS[idx]
}

/** Extract dominant colors from an image element via canvas quantization */
function extractColors(imgElement, count = 5) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const size = 100
  canvas.width = size; canvas.height = size
  ctx.drawImage(imgElement, 0, 0, size, size)
  const data = ctx.getImageData(0, 0, size, size).data
  const buckets = {}
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    if (data[i + 3] < 128) continue
    const key = `${r},${g},${b}`
    buckets[key] = (buckets[key] || 0) + 1
  }
  return Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number)
      return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
    })
}

/** Build a CSS custom properties string from a palette */
function paletteToCss(palette) {
  const names = ['primary', 'secondary', 'accent', 'background', 'text']
  return palette.map((c, i) => `  --ab-${names[i] || `color-${i}`}: ${c.hex || c};`).join('\n')
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ColorSwatch({ color, label, onCopy }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(color)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
      title={`Copy ${color}`}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 'var(--radius)',
        background: color, border: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,.1)',
        transition: 'transform .15s',
      }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', fontWeight: 600 }}>
        {color.toUpperCase()}
      </span>
      {label && <span style={{ fontSize: 9, color: 'var(--t3)', fontWeight: 500 }}>{label}</span>}
    </button>
  )
}

function FontPreview({ fontPair }) {
  if (!fontPair) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
          Heading — {fontPair.primary}
        </div>
        <div style={{ fontFamily: `"${fontPair.primary}", sans-serif`, fontSize: 26, fontWeight: 700, color: 'var(--t0)', lineHeight: 1.2 }}>
          The quick brown fox
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
          Body — {fontPair.secondary}
        </div>
        <div style={{ fontFamily: `"${fontPair.secondary}", serif`, fontSize: 15, color: 'var(--t1)', lineHeight: 1.6 }}>
          Pack my box with five dozen liquor jugs. Amazingly few discotheques provide jukeboxes.
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic' }}>
        Vibe: {fontPair.vibe}
      </div>
    </div>
  )
}

function HeroPreview({ palette, fontPair, description }) {
  if (!palette || !fontPair) return null
  const primary = palette[0]?.hex || '#3B82F6'
  const bg = palette[3]?.hex || '#f8fafc'
  const text = palette[4]?.hex || '#111827'
  const accent = palette[2]?.hex || '#10b981'

  return (
    <div style={{
      background: bg, borderRadius: 'var(--radius-l)', border: '1px solid var(--border)',
      padding: 32, textAlign: 'center', overflow: 'hidden', position: 'relative',
    }}>
      {/* Decorative gradient orb */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        borderRadius: '50%', background: primary, opacity: 0.08, filter: 'blur(40px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        fontFamily: `"${fontPair.primary}", sans-serif`, fontSize: 22, fontWeight: 700,
        color: text, marginBottom: 8, lineHeight: 1.2, position: 'relative',
      }}>
        {description || 'Your Business Name'}
      </div>
      <div style={{
        fontFamily: `"${fontPair.secondary}", serif`, fontSize: 13, color: text,
        opacity: 0.65, marginBottom: 20, lineHeight: 1.5, position: 'relative',
      }}>
        Professional services you can trust. Let us help you build something great.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', position: 'relative' }}>
        <span style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: 6,
          background: primary, color: '#fff', fontSize: 12, fontWeight: 600,
          fontFamily: `"${fontPair.primary}", sans-serif`,
        }}>
          Get Started
        </span>
        <span style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: 6,
          background: 'transparent', color: accent, fontSize: 12, fontWeight: 600,
          border: `1px solid ${accent}`, fontFamily: `"${fontPair.primary}", sans-serif`,
        }}>
          Learn More
        </span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AutoBuilder({ onCopy, toast }) {
  // Tab state
  const [tab, setTab] = useState('generate')

  // Tab 1 — Generate state
  const [description, setDescription] = useState('')
  const [mood, setMood] = useState('minimal')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)

  // Tab 2 — Upload state
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [brandFont, setBrandFont] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)
  const imgRef = useRef(null)

  // ── Shared copy helper ──────────────────────────────────────────────────────

  const copyText = useCallback(async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast?.(label)
    } catch {
      toast?.('Copy failed')
    }
  }, [toast])

  // ── Tab 1: Generate ─────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return
    setGenerating(true)

    // Generated client-side (HSL mood profiles + curated font pairs). A future
    // AI-backed mode can route through /api/generate-prompt to stay within the
    // Vercel serverless function budget rather than adding a new endpoint.
    await new Promise(r => setTimeout(r, 800))

    const palette = generatePalette(mood, description)
    const fontPair = pickFontPair(mood, description)
    const rationale = MOOD_RATIONALES[mood] || 'A balanced palette suited to this business type.'

    setGenResult({ palette, fontPair, rationale, description: description.trim(), mood })
    setGenerating(false)
  }, [description, mood])

  // ── Tab 2: Upload & Extract ─────────────────────────────────────────────────

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast?.('Please upload an image file (PNG, JPG, SVG)')
      return
    }
    setLogoFile(file)
    setUploadResult(null)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)
  }, [toast])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleExtract = useCallback(async () => {
    if (!logoPreview) return
    setExtracting(true)

    try {
      // Load image into an element for canvas extraction
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = logoPreview

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      const colors = extractColors(img, 5)
      const roles = ['Primary', 'Secondary', 'Accent', 'Background', 'Text']
      const palette = colors.map((hex, i) => ({ hex, role: roles[i] || `Color ${i + 1}` }))

      // Use brand font or fallback
      const fontPair = brandFont.trim()
        ? { primary: brandFont.trim(), secondary: 'Inter', vibe: 'Custom brand font' }
        : FONT_PAIRS[0]

      setUploadResult({
        palette,
        fontPair,
        rationale: 'Colors extracted from your uploaded logo using dominant-color quantization.',
        description: logoFile?.name || 'Brand assets',
        mood: 'custom',
      })
    } catch {
      toast?.('Could not read that image — try a PNG or JPG')
    } finally {
      setExtracting(false)
    }
  }, [logoPreview, brandFont, logoFile, toast])

  // ── Export handlers ─────────────────────────────────────────────────────────

  const currentResult = tab === 'generate' ? genResult : uploadResult

  const handleCopyCss = useCallback(() => {
    if (!currentResult?.palette) return
    const css = `:root {\n${paletteToCss(currentResult.palette)}\n}`
    copyText(css, 'CSS variables copied')
  }, [currentResult, copyText])

  const handleApplyToColorStudio = useCallback(() => {
    if (!currentResult?.palette) return
    // Store palette in localStorage for Color Studio to pick up
    try {
      const colors = currentResult.palette.map(c => c.hex)
      localStorage.setItem('ab-palette-transfer', JSON.stringify(colors))
      toast?.('Palette saved — open Color Studio to apply')
    } catch {
      toast?.('Could not save palette')
    }
  }, [currentResult, toast])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">
          AI Tools{' '}
          <span className="nav-alpha-badge" style={{ marginLeft: 8 }}>Alpha</span>
        </div>
        <h1>
          UI Auto-Builder
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
            padding: '2px 8px', borderRadius: 'var(--radius-s)',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            verticalAlign: 'middle', marginLeft: 8,
          }}>
            ALPHA
          </span>
        </h1>
        <p>Describe your business and get a complete design system — colors, fonts, and a live preview.</p>
      </div>

      <AuthGate featureLabel="use the UI Auto-Builder">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`pt-t${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Tab 1: Generate from Description ─── */}
        {tab === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              {/* Business description */}
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="ab-desc" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>
                  Describe your business
                </label>
                <textarea
                  id="ab-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Modern landscaping business targeting young homeowners in Melbourne"
                  rows={3}
                  style={{
                    width: '100%', resize: 'vertical', fontFamily: 'var(--font)',
                    fontSize: 13, padding: '10px 14px', borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)', background: 'var(--inp)',
                    color: 'var(--t0)', outline: 'none', transition: 'border-color .2s',
                  }}
                />
              </div>

              {/* Mood chips */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                  Style mood
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MOODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`pt-t${mood === m.id ? ' on' : ''}`}
                      onClick={() => setMood(m.id)}
                      style={{ padding: '5px 12px', fontSize: 11 }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                className="btn btn-accent"
                disabled={generating || !description.trim()}
                onClick={handleGenerate}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generating ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Generate Design System
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {genResult && <ResultsPanel result={genResult} onCopyCss={handleCopyCss} onApply={handleApplyToColorStudio} copyText={copyText} />}
          </div>
        )}

        {/* ─── Tab 2: Upload Brand Assets ─── */}
        {tab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              {/* Logo upload drop zone */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 8 }}>
                  Upload your logo
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-l)', padding: logoPreview ? 16 : 40,
                    textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'var(--accent-bg)' : 'var(--bg-1)',
                    transition: 'all .2s', minHeight: 120,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 8,
                  }}
                >
                  {logoPreview ? (
                    <img
                      ref={imgRef}
                      src={logoPreview}
                      alt="Logo preview"
                      style={{ maxWidth: 200, maxHeight: 120, objectFit: 'contain', borderRadius: 'var(--radius)' }}
                    />
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span style={{ fontSize: 12, color: 'var(--t2)' }}>
                        Drag &amp; drop your logo, or click to browse
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--t3)' }}>
                        PNG, JPG, or SVG
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleFile(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
                {logoPreview && (
                  <button
                    type="button"
                    className="btn btn-s"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); setUploadResult(null) }}
                    style={{ marginTop: 8, fontSize: 11 }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Brand font hint */}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="ab-brand-font" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>
                  Current brand font (optional)
                </label>
                <input
                  id="ab-brand-font"
                  type="text"
                  value={brandFont}
                  onChange={e => setBrandFont(e.target.value)}
                  placeholder="e.g. Montserrat, Playfair Display"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Extract button */}
              <button
                type="button"
                className="btn btn-accent"
                disabled={extracting || !logoPreview}
                onClick={handleExtract}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {extracting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83" />
                    </svg>
                    Extracting Colors...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r="2.5" />
                      <path d="M17 21H7l3.5-7 2.5 3 3-4.5L20 21" />
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                    </svg>
                    Extract Colors from Logo
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {uploadResult && <ResultsPanel result={uploadResult} onCopyCss={handleCopyCss} onApply={handleApplyToColorStudio} copyText={copyText} />}
          </div>
        )}
      </AuthGate>
    </div>
  )
}

// ── Results Panel (shared between Tab 1 & Tab 2) ─────────────────────────────

function ResultsPanel({ result, onCopyCss, onApply, copyText }) {
  const { palette, fontPair, rationale, description } = result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Color Palette */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 4 }}>
          Color Palette
        </div>
        <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.5 }}>
          {rationale}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {palette.map((c, i) => (
            <ColorSwatch key={i} color={c.hex} label={c.role} onCopy={hex => copyText(hex, `${hex} copied`)} />
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 12 }}>
          Typography
        </div>
        <FontPreview fontPair={fontPair} />
      </div>

      {/* UI Preview */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', marginBottom: 12 }}>
          UI Preview
        </div>
        <HeroPreview palette={palette} fontPair={fontPair} description={description} />
      </div>

      {/* Export actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-accent" onClick={onApply}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Apply to Color Studio
        </button>
        <button type="button" className="btn" onClick={onCopyCss}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy CSS Variables
        </button>
      </div>
    </div>
  )
}

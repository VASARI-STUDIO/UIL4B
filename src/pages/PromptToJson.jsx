import { useState, useCallback } from 'react'

const STYLES = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Watercolor', 'Anime', '3D Render', 'Pixel Art', 'Comic Book', 'Concept Art', 'Line Art', 'Pencil Sketch', 'Surrealist']
const MOODS = ['Cinematic', 'Ethereal', 'Dark', 'Vibrant', 'Minimalist', 'Nostalgic', 'Futuristic', 'Dreamy', 'Gritty', 'Serene']
const LIGHTINGS = ['Natural', 'Studio', 'Golden Hour', 'Neon', 'Rim Light', 'Volumetric', 'Dramatic', 'Soft Ambient', 'Backlit', 'Low Key']
const COMPOSITIONS = ['Rule of Thirds', 'Centered', 'Wide Angle', 'Close-up', 'Birds Eye', 'Low Angle', 'Symmetrical', 'Dynamic', 'Panoramic']
const CAMERAS = ['None', 'Canon EOS R5', 'Sony A7R IV', 'Hasselblad X2D', 'Fujifilm GFX', 'Leica M11', 'Nikon Z9']
const RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:2', '21:9']

function parsePromptToFields(prompt) {
  const lower = prompt.toLowerCase()
  const detected = {
    style: STYLES.find(s => lower.includes(s.toLowerCase())) || '',
    mood: MOODS.find(m => lower.includes(m.toLowerCase())) || '',
    lighting: LIGHTINGS.find(l => lower.includes(l.toLowerCase())) || '',
    composition: COMPOSITIONS.find(c => lower.includes(c.toLowerCase())) || '',
  }
  // Extract subject — strip detected keywords to get the core subject
  let subject = prompt
  Object.values(detected).forEach(v => {
    if (v) subject = subject.replace(new RegExp(v, 'gi'), '')
  })
  // Clean up common filler words
  subject = subject.replace(/\b(in|with|and|the|a|an|style|lighting|mood|shot|view)\b/gi, ' ')
    .replace(/[,]+/g, ' ').replace(/\s+/g, ' ').trim()

  return { subject, ...detected }
}

export default function PromptToJson({ onCopy }) {
  const [rawPrompt, setRawPrompt] = useState('')
  const [subject, setSubject] = useState('')
  const [style, setStyle] = useState('')
  const [mood, setMood] = useState('')
  const [lighting, setLighting] = useState('')
  const [composition, setComposition] = useState('')
  const [camera, setCamera] = useState('None')
  const [ratio, setRatio] = useState('1:1')
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, watermark, text, logo')
  const [steps, setSteps] = useState(30)
  const [cfgScale, setCfgScale] = useState(7.5)
  const [seed, setSeed] = useState(-1)
  const [parsed, setParsed] = useState(false)

  const handleParse = useCallback(() => {
    if (!rawPrompt.trim()) return
    const fields = parsePromptToFields(rawPrompt)
    setSubject(fields.subject)
    if (fields.style) setStyle(fields.style)
    if (fields.mood) setMood(fields.mood)
    if (fields.lighting) setLighting(fields.lighting)
    if (fields.composition) setComposition(fields.composition)
    setParsed(true)
  }, [rawPrompt])

  const buildJson = useCallback(() => {
    const obj = {
      prompt: {
        subject: subject || rawPrompt,
        style: style || undefined,
        mood: mood || undefined,
        lighting: lighting || undefined,
        composition: composition || undefined,
        camera: camera !== 'None' ? camera : undefined,
      },
      negative_prompt: negativePrompt || undefined,
      parameters: {
        aspect_ratio: ratio,
        steps,
        cfg_scale: cfgScale,
        seed: seed === -1 ? 'random' : seed,
      },
    }
    // Remove undefined keys
    Object.keys(obj.prompt).forEach(k => obj.prompt[k] === undefined && delete obj.prompt[k])
    if (!obj.negative_prompt) delete obj.negative_prompt
    return JSON.stringify(obj, null, 2)
  }, [subject, rawPrompt, style, mood, lighting, composition, camera, negativePrompt, ratio, steps, cfgScale, seed])

  const buildCompositePrompt = useCallback(() => {
    const parts = [subject || rawPrompt]
    if (style) parts.push(style.toLowerCase() + ' style')
    if (mood) parts.push(mood.toLowerCase() + ' mood')
    if (lighting) parts.push(lighting.toLowerCase() + ' lighting')
    if (composition) parts.push(composition.toLowerCase() + ' composition')
    if (camera !== 'None') parts.push('shot on ' + camera)
    return parts.filter(Boolean).join(', ')
  }, [subject, rawPrompt, style, mood, lighting, composition, camera])

  const handleReset = () => {
    setRawPrompt('')
    setSubject('')
    setStyle('')
    setMood('')
    setLighting('')
    setComposition('')
    setCamera('None')
    setRatio('1:1')
    setNegativePrompt('blurry, low quality, distorted, watermark, text, logo')
    setSteps(30)
    setCfgScale(7.5)
    setSeed(-1)
    setParsed(false)
  }

  return (
    <div className="sec">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 2, background: 'var(--accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Prompt Engine V1.0</span>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, textTransform: 'uppercase', marginBottom: 12 }}>
          Prompt to JSON
        </h1>
        <p style={{ fontSize: 15, color: 'var(--t1)', maxWidth: 600, lineHeight: 1.7 }}>
          Convert natural language image prompts into structured JSON for Stable Diffusion, Midjourney, DALL-E, and other generators. Get consistent, reproducible outputs.
        </p>
      </div>

      {/* Input Section */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: '18px 22px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 12 }}>Raw Prompt Input</div>
          <textarea
            value={rawPrompt}
            onChange={e => setRawPrompt(e.target.value)}
            placeholder="e.g. A cyberpunk samurai standing on a Tokyo rooftop at golden hour, cinematic lighting, photorealistic, wide angle composition"
            rows={4}
            style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font)', fontSize: 14, lineHeight: 1.6 }}
          />
        </div>
        <div style={{ padding: '0 22px 18px', display: 'flex', gap: 8 }}>
          <button className="btn btn-accent" onClick={handleParse} style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 11 }}>
            Parse Prompt
          </button>
          <button className="btn" onClick={handleReset} style={{ fontWeight: 600, fontSize: 11 }}>
            Reset
          </button>
        </div>
      </div>

      {/* Fields Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 400px) 1fr', gap: 14, marginBottom: 32 }}>
        {/* Configuration */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '18px 22px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Prompt Structure</div>
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Core subject of the image" style={{ width: '100%', fontSize: 13 }} />
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select style...</option>
              {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Mood</label>
            <select value={mood} onChange={e => setMood(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select mood...</option>
              {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Lighting</label>
            <select value={lighting} onChange={e => setLighting(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select lighting...</option>
              {LIGHTINGS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Composition</label>
            <select value={composition} onChange={e => setComposition(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select composition...</option>
              {COMPOSITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 22px 16px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Camera</label>
            <select value={camera} onChange={e => setCamera(e.target.value)} style={{ width: '100%' }}>
              {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ padding: '0 22px 22px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)', display: 'block', marginBottom: 6 }}>Negative Prompt</label>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              rows={2}
              style={{ width: '100%', resize: 'vertical', fontSize: 12 }}
            />
          </div>
        </div>

        {/* Right column: Parameters + Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Parameters */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '18px 22px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Generation Parameters</div>
            </div>

            <div style={{ padding: '0 22px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Aspect Ratio</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {RATIOS.map(r => (
                  <button
                    key={r}
                    className={`pt-t${ratio === r ? ' on' : ''}`}
                    onClick={() => setRatio(r)}
                    style={{ fontSize: 11, padding: '6px 12px' }}
                  >{r}</button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 22px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Steps</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{steps}</span>
              </div>
              <input type="range" min="10" max="100" value={steps} onChange={e => setSteps(+e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ padding: '0 22px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>CFG Scale</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{cfgScale}</span>
              </div>
              <input type="range" min="1" max="20" step="0.5" value={cfgScale} onChange={e => setCfgScale(+e.target.value)} style={{ width: '100%' }} />
            </div>

            <div style={{ padding: '0 22px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t2)' }}>Seed</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: seed === -1 ? 'var(--t2)' : 'var(--accent)' }}>{seed === -1 ? 'Random' : seed}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" value={seed} onChange={e => setSeed(+e.target.value)} style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }} />
                <button className="btn btn-s" onClick={() => setSeed(-1)} style={{ fontSize: 10 }}>Random</button>
              </div>
            </div>
          </div>

          {/* Composite prompt preview */}
          {parsed && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>Optimized Prompt</span>
                <button className="btn btn-s" onClick={() => onCopy(buildCompositePrompt())} style={{ padding: '3px 8px' }}>Copy</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.6, fontFamily: 'var(--mono)' }}>{buildCompositePrompt()}</p>
            </div>
          )}
        </div>
      </div>

      {/* JSON Output */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)' }}>JSON Output</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s" onClick={() => onCopy(buildJson())} style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy JSON
            </button>
            <button className="btn btn-s" onClick={() => {
              const blob = new Blob([buildJson()], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'prompt-config.json'
              a.click()
              URL.revokeObjectURL(url)
            }} style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Download .json
            </button>
          </div>
        </div>
        <div className="code" onClick={() => onCopy(buildJson())} style={{ fontSize: 12, lineHeight: 1.8 }}>{buildJson()}</div>
      </div>

      {/* Footer meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--t2)' }}>
          Compatible with <span style={{ fontWeight: 700, color: 'var(--t0)' }}>Stable Diffusion</span>, <span style={{ fontWeight: 700, color: 'var(--t0)' }}>Midjourney</span>, <span style={{ fontWeight: 700, color: 'var(--t0)' }}>DALL-E</span>, <span style={{ fontWeight: 700, color: 'var(--t0)' }}>Flux</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>Prompt Engine Active</span>
        </span>
      </div>
    </div>
  )
}

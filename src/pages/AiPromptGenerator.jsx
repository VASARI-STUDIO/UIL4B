import { useState, useRef } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { auth as firebaseAuth } from '../utils/firebase'
import AuthGate from '../components/AuthGate'

const TOOL_ID = 'prompts-ai'

const PLATFORMS = [
  { id: 'general', label: 'General' },
  { id: 'midjourney', label: 'Midjourney' },
  { id: 'dalle', label: 'DALL·E' },
  { id: 'stable-diffusion', label: 'Stable Diffusion' },
]

const STYLES = [
  { id: '', label: 'Auto' },
  { id: 'photorealistic', label: 'Photorealistic' },
  { id: 'illustration', label: 'Illustration' },
  { id: '3d-render', label: '3D Render' },
  { id: 'flat-design', label: 'Flat Design' },
  { id: 'watercolor', label: 'Watercolour' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'line-art', label: 'Line Art' },
]

export default function AiPromptGenerator({ toast }) {
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('general')
  const [style, setStyle] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[TOOL_ID] ?? 40

  const generate = async () => {
    if (!description.trim()) return
    if (!canUseFeature(TOOL_ID, dailyLimit)) {
      toast?.('Daily limit reached — resets at midnight')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Sign in to use AI features')

      const r = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: description.trim(),
          style: style || undefined,
          platform: platform !== 'general' ? platform : undefined,
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      recordUsage(TOOL_ID)

      setResults(prev => [{
        id: crypto.randomUUID(),
        prompt: data.prompt,
        platform: data.platform || platform,
        description: description.trim(),
        style,
        ts: Date.now(),
      }, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyPrompt = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast?.('Prompt copied')
    } catch {
      toast?.('Copy failed')
    }
  }

  const removeResult = (id) => setResults(prev => prev.filter(r => r.id !== id))

  const platformLabel = (id) => PLATFORMS.find(p => p.id === id)?.label || id

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">AI Tools <span className="nav-alpha-badge" style={{ marginLeft: 8 }}>Alpha</span></div>
        <h1>AI Image Prompt <em>Generator</em></h1>
        <p>
          Describe what you want and get a detailed AI image prompt optimised for your platform.
          {isPro ? ' Pro plan active.' : ''}
        </p>
      </div>

      <AuthGate featureLabel="generate AI image prompts">
        <div className="aipg-composer card">
          <div className="aipg-field">
            <label htmlFor="aipg-desc">Describe your image</label>
            <textarea
              ref={textareaRef}
              id="aipg-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. minimalist logo for a coffee shop with warm tones and a sunrise motif"
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generate() }}
            />
          </div>

          <div className="aipg-options">
            <div className="aipg-option-group">
              <span className="aipg-option-label">Platform</span>
              <div className="aipg-chips">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`pl-chip${platform === p.id ? ' active' : ''}`}
                    onClick={() => setPlatform(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="aipg-option-group">
              <span className="aipg-option-label">Style</span>
              <div className="aipg-chips">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={`pl-chip${style === s.id ? ' active' : ''}`}
                    onClick={() => setStyle(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="aipg-submit-row">
            <button
              className="btn btn-accent"
              onClick={generate}
              disabled={busy || !description.trim()}
            >
              {busy ? 'Generating…' : 'Generate prompt'}
            </button>
            <span className="aipg-hint">⌘ + Enter</span>
          </div>

          {error && <div className="aipg-error">{error}</div>}
        </div>
      </AuthGate>

      {results.length > 0 && (
        <div className="aipg-results">
          <div className="aipg-results-header">
            <span className="fg-detail-label">Generated prompts</span>
            <button className="btn btn-s" onClick={() => setResults([])}>Clear all</button>
          </div>
          {results.map(r => (
            <div key={r.id} className="aipg-result card">
              <div className="aipg-result-meta">
                <span className="pl-tag">{platformLabel(r.platform)}</span>
                {r.style && <span className="pl-tag">{r.style}</span>}
                <span className="aipg-result-brief" title={r.description}>
                  {r.description.length > 60 ? r.description.slice(0, 60) + '…' : r.description}
                </span>
              </div>
              <div className="aipg-result-prompt">{r.prompt}</div>
              <div className="aipg-result-actions">
                <button className="btn btn-s btn-accent" onClick={() => copyPrompt(r.prompt)}>Copy prompt</button>
                <button className="btn btn-s" onClick={() => { setDescription(r.description); setStyle(r.style); setPlatform(r.platform) }}>Re-use brief</button>
                <button className="btn btn-s" onClick={() => removeResult(r.id)} style={{ color: 'var(--t2)' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="aipg-tips card">
          <div className="fg-detail-label">Tips for better prompts</div>
          <ul className="alt-tips">
            <li><strong>Be specific</strong> — describe subject, setting, lighting, mood, and colour palette.</li>
            <li><strong>Choose a platform</strong> — each AI generator has different syntax preferences.</li>
            <li><strong>Pick a style</strong> — photorealistic, illustration, and 3D render produce very different results.</li>
            <li><strong>Iterate</strong> — generate multiple variations and refine your brief.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

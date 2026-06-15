import { useState, useRef, useMemo } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { auth as firebaseAuth } from '../utils/firebase'
import AuthGate from '../components/AuthGate'
import { RULE_CATEGORIES, PRESETS, buildPromptJson, buildPromptText } from '../data/promptRules'

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
  const [mode, setMode] = useState('builder') // 'builder' | 'brief'
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('general')
  const [style, setStyle] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[TOOL_ID] ?? 40

  // JSON builder state
  const [subject, setSubject] = useState('')
  const [selectedRules, setSelectedRules] = useState([])
  const [activePreset, setActivePreset] = useState(null)
  const [collapsed, setCollapsed] = useState({})

  const toggleRule = (id) => {
    setActivePreset(null)
    setSelectedRules(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id])
  }

  const applyPreset = (preset) => {
    setActivePreset(preset.id)
    setSelectedRules([...preset.rules])
  }

  const clearRules = () => { setSelectedRules([]); setActivePreset(null) }
  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const builderJson = useMemo(
    () => buildPromptJson({ subject, selectedRules, style, platform: platform !== 'general' ? platform : null }),
    [subject, selectedRules, style, platform]
  )
  const builderText = useMemo(
    () => buildPromptText({ subject, selectedRules, style }),
    [subject, selectedRules, style]
  )

  const generate = async () => {
    const brief = mode === 'builder' ? builderText : description.trim()
    if (!brief) return
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
          description: brief,
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
        description: brief,
        style,
        json: mode === 'builder' ? { ...builderJson } : null,
        ts: Date.now(),
      }, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyText = async (text, label = 'Prompt copied') => {
    try {
      await navigator.clipboard.writeText(text)
      toast?.(label)
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
          Build a structured, max-quality prompt from preset rule packs — or write a quick brief.
          {isPro ? ' Pro plan active.' : ''}
        </p>
      </div>

      <AuthGate featureLabel="generate AI image prompts">
        {/* Mode toggle */}
        <div className="aipg-mode-toggle">
          <button type="button" className={`aipg-mode-btn${mode === 'builder' ? ' active' : ''}`} onClick={() => setMode('builder')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            JSON Builder
          </button>
          <button type="button" className={`aipg-mode-btn${mode === 'brief' ? ' active' : ''}`} onClick={() => setMode('brief')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/></svg>
            Quick Brief
          </button>
        </div>

        {mode === 'builder' ? (
          <div className="aipg-builder">
            <div className="aipg-builder-main">
              <div className="aipg-composer card">
                <div className="aipg-field">
                  <label htmlFor="aipg-subject">Subject</label>
                  <input
                    id="aipg-subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. a lone astronaut on a red desert planet"
                  />
                </div>

                {/* Presets */}
                <div className="aipg-option-group">
                  <span className="aipg-option-label">Quick presets</span>
                  <div className="aipg-presets">
                    {PRESETS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`aipg-preset${activePreset === p.id ? ' active' : ''}`}
                        onClick={() => applyPreset(p)}
                        title={p.desc}
                      >
                        <span className="aipg-preset-label">{p.label}</span>
                        <span className="aipg-preset-desc">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rule categories */}
                {RULE_CATEGORIES.map(cat => {
                  const isCollapsed = collapsed[cat.id]
                  const count = cat.rules.filter(r => selectedRules.includes(r.id)).length
                  return (
                    <div key={cat.id} className="aipg-rulecat">
                      <button type="button" className="aipg-rulecat-head" onClick={() => toggleCollapse(cat.id)}>
                        <svg className={`aipg-rulecat-arr${isCollapsed ? '' : ' open'}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
                        <span className="aipg-rulecat-label">{cat.label}</span>
                        {count > 0 && <span className="aipg-rulecat-count">{count}</span>}
                      </button>
                      {!isCollapsed && (
                        <div className="aipg-rules">
                          {cat.rules.map(rule => {
                            const on = selectedRules.includes(rule.id)
                            return (
                              <button
                                key={rule.id}
                                type="button"
                                className={`aipg-rule${on ? ' active' : ''}`}
                                onClick={() => toggleRule(rule.id)}
                              >
                                <span className="aipg-rule-check">
                                  {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </span>
                                {rule.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="aipg-options">
                  <div className="aipg-option-group">
                    <span className="aipg-option-label">Platform</span>
                    <div className="aipg-chips">
                      {PLATFORMS.map(p => (
                        <button key={p.id} type="button" className={`pl-chip${platform === p.id ? ' active' : ''}`} onClick={() => setPlatform(p.id)}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="aipg-option-group">
                    <span className="aipg-option-label">Base style</span>
                    <div className="aipg-chips">
                      {STYLES.map(s => (
                        <button key={s.id} type="button" className={`pl-chip${style === s.id ? ' active' : ''}`} onClick={() => setStyle(s.id)}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live preview sidebar */}
            <div className="aipg-builder-side">
              <div className="aipg-preview card">
                <div className="aipg-preview-head">
                  <span className="fg-detail-label">Structured JSON</span>
                  <button className="btn btn-s" onClick={() => copyText(JSON.stringify(builderJson, null, 2), 'JSON copied')} disabled={!subject && selectedRules.length === 0}>Copy</button>
                </div>
                <pre className="aipg-json">{JSON.stringify(builderJson, null, 2)}</pre>
              </div>

              <div className="aipg-preview card">
                <div className="aipg-preview-head">
                  <span className="fg-detail-label">Prompt text</span>
                  <button className="btn btn-s" onClick={() => copyText(builderText)} disabled={!builderText}>Copy</button>
                </div>
                <p className="aipg-preview-text">{builderText || <span style={{ color: 'var(--t3)' }}>Pick a preset or rules to build your prompt.</span>}</p>
              </div>

              <div className="aipg-builder-actions">
                <button className="btn btn-accent" onClick={generate} disabled={busy || !builderText}>
                  {busy ? 'Enhancing…' : 'Enhance with AI'}
                </button>
                {selectedRules.length > 0 && <button className="btn btn-s" onClick={clearRules}>Clear rules</button>}
              </div>
              {error && <div className="aipg-error">{error}</div>}
            </div>
          </div>
        ) : (
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
                    <button key={p.id} type="button" className={`pl-chip${platform === p.id ? ' active' : ''}`} onClick={() => setPlatform(p.id)}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="aipg-option-group">
                <span className="aipg-option-label">Style</span>
                <div className="aipg-chips">
                  {STYLES.map(s => (
                    <button key={s.id} type="button" className={`pl-chip${style === s.id ? ' active' : ''}`} onClick={() => setStyle(s.id)}>{s.label}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="aipg-submit-row">
              <button className="btn btn-accent" onClick={generate} disabled={busy || !description.trim()}>
                {busy ? 'Generating…' : 'Generate prompt'}
              </button>
              <span className="aipg-hint">⌘ + Enter</span>
            </div>

            {error && <div className="aipg-error">{error}</div>}
          </div>
        )}
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
                {r.json && <span className="pl-tag">JSON</span>}
                <span className="aipg-result-brief" title={r.description}>
                  {r.description.length > 60 ? r.description.slice(0, 60) + '…' : r.description}
                </span>
              </div>
              <div className="aipg-result-prompt">{r.prompt}</div>
              <div className="aipg-result-actions">
                <button className="btn btn-s btn-accent" onClick={() => copyText(r.prompt)}>Copy prompt</button>
                {r.json && <button className="btn btn-s" onClick={() => copyText(JSON.stringify(r.json, null, 2), 'JSON copied')}>Copy JSON</button>}
                <button className="btn btn-s" onClick={() => removeResult(r.id)} style={{ color: 'var(--t2)' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="aipg-tips card">
          <div className="fg-detail-label">Tips for max-quality renders</div>
          <ul className="alt-tips">
            <li><strong>Start with a preset</strong> — then fine-tune individual rules to taste.</li>
            <li><strong>Stack categories</strong> — combine camera, lighting, and quality tags for richer output.</li>
            <li><strong>Copy the JSON</strong> — structured prompts work well with API-driven pipelines.</li>
            <li><strong>Enhance with AI</strong> — turns your rule selection into a polished natural-language prompt.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

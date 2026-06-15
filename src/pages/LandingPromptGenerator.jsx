import { useState, useMemo } from 'react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { auth as firebaseAuth } from '../utils/firebase'
import AuthGate from '../components/AuthGate'
import { LP_CATEGORIES, LP_PRESETS, buildLandingJson, buildLandingText } from '../data/landingPromptRules'

const TOOL_ID = 'prompts-ai'

export default function LandingPromptGenerator({ toast }) {
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[TOOL_ID] ?? 40

  const [brief, setBrief] = useState('')
  const [audience, setAudience] = useState('')
  const [selectedRules, setSelectedRules] = useState([])
  const [activePreset, setActivePreset] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const singleCats = useMemo(() => new Set(LP_CATEGORIES.filter(c => c.single).map(c => c.id)), [])
  const ruleCat = useMemo(() => {
    const m = {}
    for (const cat of LP_CATEGORIES) for (const r of cat.rules) m[r.id] = cat.id
    return m
  }, [])

  const toggleRule = (id) => {
    setActivePreset(null)
    setSelectedRules(prev => {
      if (prev.includes(id)) return prev.filter(r => r !== id)
      const catId = ruleCat[id]
      if (singleCats.has(catId)) {
        // radio behaviour — replace any existing pick in this category
        const sameCatIds = LP_CATEGORIES.find(c => c.id === catId).rules.map(r => r.id)
        return [...prev.filter(r => !sameCatIds.includes(r)), id]
      }
      return [...prev, id]
    })
  }

  const applyPreset = (preset) => { setActivePreset(preset.id); setSelectedRules([...preset.rules]) }
  const clearRules = () => { setSelectedRules([]); setActivePreset(null) }
  const toggleCollapse = (id) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const json = useMemo(() => buildLandingJson({ brief, selectedRules, audience }), [brief, selectedRules, audience])
  const promptText = useMemo(() => buildLandingText({ brief, selectedRules, audience }), [brief, selectedRules, audience])

  const generate = async () => {
    if (!brief.trim() && selectedRules.length === 0) return
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: promptText, platform: 'website builder (v0, Lovable, Bolt, Claude)' }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      recordUsage(TOOL_ID)
      setResults(prev => [{
        id: crypto.randomUUID(),
        prompt: data.prompt,
        brief: promptText,
        json: { ...json },
        ts: Date.now(),
      }, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const copyText = async (text, label = 'Copied') => {
    try { await navigator.clipboard.writeText(text); toast?.(label) }
    catch { toast?.('Copy failed') }
  }

  const removeResult = (id) => setResults(prev => prev.filter(r => r.id !== id))

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">AI Tools <span className="nav-alpha-badge" style={{ marginLeft: 8 }}>Alpha</span></div>
        <h1>AI Landing Page <em>Prompts</em></h1>
        <p>
          Build a structured JSON prompt for generating AAA-tier websites with AI builders like v0, Lovable, Bolt or Claude.
          {isPro ? ' Pro plan active.' : ''}
        </p>
      </div>

      <AuthGate featureLabel="generate landing page prompts">
        <div className="aipg-builder">
          <div className="aipg-builder-main">
            <div className="aipg-composer card">
              <div className="aipg-field">
                <label htmlFor="lp-brief">What is the website for?</label>
                <input id="lp-brief" type="text" value={brief} onChange={e => setBrief(e.target.value)} placeholder="e.g. a landscaping business in Melbourne" />
              </div>
              <div className="aipg-field">
                <label htmlFor="lp-audience">Target audience (optional)</label>
                <input id="lp-audience" type="text" value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. homeowners aged 35–60" />
              </div>

              <div className="aipg-option-group">
                <span className="aipg-option-label">Quick presets</span>
                <div className="aipg-presets">
                  {LP_PRESETS.map(p => (
                    <button key={p.id} type="button" className={`aipg-preset${activePreset === p.id ? ' active' : ''}`} onClick={() => applyPreset(p)} title={p.desc}>
                      <span className="aipg-preset-label">{p.label}</span>
                      <span className="aipg-preset-desc">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {LP_CATEGORIES.map(cat => {
                const isCollapsed = collapsed[cat.id]
                const count = cat.rules.filter(r => selectedRules.includes(r.id)).length
                return (
                  <div key={cat.id} className="aipg-rulecat">
                    <button type="button" className="aipg-rulecat-head" onClick={() => toggleCollapse(cat.id)}>
                      <svg className={`aipg-rulecat-arr${isCollapsed ? '' : ' open'}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>
                      <span className="aipg-rulecat-label">{cat.label}</span>
                      {cat.single && <span className="aipg-rulecat-hint">pick one</span>}
                      {count > 0 && <span className="aipg-rulecat-count">{count}</span>}
                    </button>
                    {!isCollapsed && (
                      <div className="aipg-rules">
                        {cat.rules.map(rule => {
                          const on = selectedRules.includes(rule.id)
                          return (
                            <button key={rule.id} type="button" className={`aipg-rule${on ? ' active' : ''}`} onClick={() => toggleRule(rule.id)}>
                              <span className={`aipg-rule-check${cat.single ? ' radio' : ''}`}>
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
            </div>
          </div>

          <div className="aipg-builder-side">
            <div className="aipg-preview card">
              <div className="aipg-preview-head">
                <span className="fg-detail-label">Structured JSON</span>
                <button className="btn btn-s" onClick={() => copyText(JSON.stringify(json, null, 2), 'JSON copied')} disabled={!brief && selectedRules.length === 0}>Copy</button>
              </div>
              <pre className="aipg-json">{JSON.stringify(json, null, 2)}</pre>
            </div>
            <div className="aipg-preview card">
              <div className="aipg-preview-head">
                <span className="fg-detail-label">Prompt text</span>
                <button className="btn btn-s" onClick={() => copyText(promptText)} disabled={!promptText}>Copy</button>
              </div>
              <p className="aipg-preview-text">{promptText}</p>
            </div>
            <div className="aipg-builder-actions">
              <button className="btn btn-accent" onClick={generate} disabled={busy || (!brief.trim() && selectedRules.length === 0)}>
                {busy ? 'Enhancing…' : 'Enhance with AI'}
              </button>
              {selectedRules.length > 0 && <button className="btn btn-s" onClick={clearRules}>Clear</button>}
            </div>
            {error && <div className="aipg-error">{error}</div>}
          </div>
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
                <span className="pl-tag">Website</span>
                <span className="pl-tag">JSON</span>
              </div>
              <div className="aipg-result-prompt">{r.prompt}</div>
              <div className="aipg-result-actions">
                <button className="btn btn-s btn-accent" onClick={() => copyText(r.prompt)}>Copy prompt</button>
                <button className="btn btn-s" onClick={() => copyText(JSON.stringify(r.json, null, 2), 'JSON copied')}>Copy JSON</button>
                <button className="btn btn-s" onClick={() => removeResult(r.id)} style={{ color: 'var(--t2)' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="aipg-tips card">
          <div className="fg-detail-label">How to use these prompts</div>
          <ul className="alt-tips">
            <li><strong>Pick a preset</strong> — then refine site type, aesthetic, sections, and interactions.</li>
            <li><strong>Paste into an AI builder</strong> — v0.dev, Lovable, Bolt.new, or a Claude artifact.</li>
            <li><strong>Copy the JSON</strong> — feed structured specs to API-driven generation pipelines.</li>
            <li><strong>Enhance with AI</strong> — expands your spec into a detailed, build-ready brief.</li>
          </ul>
        </div>
      )}
    </div>
  )
}

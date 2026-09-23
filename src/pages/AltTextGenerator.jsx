import { useState, useCallback, useRef, useLayoutEffect } from 'react'
import AuthGate from '../components/AuthGate'
import { AI_LIMITS } from '../config/plans'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { useAiQuota } from '../hooks/useAiQuota'
import QuotaMeter from '../components/QuotaMeter'
import { auth as firebaseAuth } from '../utils/firebase'
import { toCsv } from '../utils/csv'
// The `alt-text` page stylesheet. Imported here rather than from global.css so
// Vite emits it as this lazy route's own chunk stylesheet — only a visitor who
// opens this page downloads it, and it arrives with the chunk, before paint.
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/studio.css'
import '../styles/deferred/tool-shell.css'
import '../styles/pages/alt-text.css'

const ALT_TEXT_TOOL_ID = 'alt-text'
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif'
const MAX_DIM = 1600

// `desc` says what the mode PRODUCES, `when` says when to reach for it. Both
// used to live in a `title` tooltip, which is invisible on touch and never
// answered the only question a first-time user has — which one do I pick? The
// selected mode's guidance is now rendered, so the choice is legible without
// hovering.
const TONES = [
  {
    id: 'concise',
    label: 'Concise',
    desc: '1–2 sentences, ~125 characters',
    when: 'The safe default. Most images in body content want this — screen readers announce it in one breath.',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    desc: '2–4 sentences, up to 300 characters',
    when: 'When the image carries the meaning: a hero shot, a product photo, a scene the reader would otherwise lose.',
  },
  {
    id: 'technical',
    label: 'Technical',
    desc: 'Exact text, data values and labels',
    when: 'For charts, diagrams, screenshots and UI, where the numbers and labels ARE the content.',
  },
]

// Roughly a dozen lines at the card's type size — past that a description has
// gone wrong and a scrollbar is the honest signal. Well beyond the 300-character
// ceiling the 'detailed' tone targets, so a normal result never hits it.
const ALT_TEXT_MAX_HEIGHT = 260

// The result box was a fixed rows={3} textarea. A 300-character 'detailed'
// result does not fit in three rows, so a complete answer arrived looking
// clipped and the user had to scroll a tiny box to read their own output —
// which is what a truncated generation looks like from the outside, and is
// almost certainly the "generation gets cut off" in the founder's report.
// Sizing to content is what makes a finished answer LOOK finished.
function AutoGrowTextarea({ value, maxHeight = ALT_TEXT_MAX_HEIGHT, ...rest }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Collapse before measuring. scrollHeight of a sized element never reports
    // less than its current height, so without this reset the box ratchets
    // upward and never shrinks back when the user deletes text.
    el.style.height = 'auto'
    // scrollHeight covers content + padding but NOT the border, while this
    // stylesheet is border-box globally — so assigning it straight to `height`
    // leaves the content area short by the border and shaves the last line.
    // Measured at 2px, which is enough to clip the descenders off a final line
    // and reintroduce exactly the "it got cut off" impression being fixed here.
    const cs = getComputedStyle(el)
    const border = cs.boxSizing === 'border-box'
      ? parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
      : 0
    const needed = el.scrollHeight + border
    el.style.height = `${Math.min(needed, maxHeight)}px`
    el.style.overflowY = needed > maxHeight ? 'auto' : 'hidden'
  }, [value, maxHeight])
  return <textarea ref={ref} value={value} rows={1} {...rest} />
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

function fileToResizedBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode image'))
      img.onload = () => {
        let w = img.width, h = img.height
        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = MAX_DIM / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        const mimeType = 'image/jpeg'
        const dataUrl = canvas.toDataURL(mimeType, 0.85)
        const base64 = dataUrl.split(',')[1]
        resolve({ base64, mimeType, previewUrl: dataUrl })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function AltTextGenerator({ toast }) {
  const [items, setItems] = useState([])
  const [context, setContext] = useState('')
  const [tone, setTone] = useState('concise')
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[ALT_TEXT_TOOL_ID] ?? AI_LIMITS.free.daily
  // Reads the `usage` object the server has always returned and nothing ever
  // consumed, so the meter reflects the account rather than this browser — and
  // so the MONTHLY ceiling is visible before it is hit.
  const quota = useAiQuota(ALT_TEXT_TOOL_ID)

  const handleFiles = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) {
      toast?.('No images found in selection')
      return
    }
    const next = imageFiles.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      file: f,
      previewUrl: null,
      base64: null,
      mimeType: null,
      altText: '',
      truncated: false,
      status: 'pending',
      error: null,
    }))
    setItems(prev => [...prev, ...next])

    for (const it of next) {
      try {
        const { base64, mimeType, previewUrl } = await fileToResizedBase64(it.file)
        setItems(prev => prev.map(p => p.id === it.id ? { ...p, base64, mimeType, previewUrl, status: 'ready' } : p))
      } catch (err) {
        setItems(prev => prev.map(p => p.id === it.id ? { ...p, status: 'error', error: err.message } : p))
      }
    }
  }, [toast])

  const onInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id))
  const clearAll = () => setItems([])

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // Resolves true only when a result landed on the card. generateAll counts
  // these: it used to toast "Generated N alt texts" for N = everything it
  // TRIED, so a refused request ended with a green tick saying the work was
  // done, directly above a card saying it was not (rendered 2026-09-09 with
  // /api/ai answering 500 and again 429, 320 through 1920, both themes).
  const generateForItem = async (item, retries = 2) => {
    if (!item.base64) return false
    // Two ceilings, not one. The local tracker only knows about the daily
    // count, so a user could be blocked by the MONTHLY limit while every local
    // check said they were fine — and the server's refusal then read as a
    // generic error. quota.blocked covers both, and quota.message names which.
    if (quota.blocked || !canUseFeature(ALT_TEXT_TOOL_ID, dailyLimit)) {
      const why = quota.message || 'Daily limit reached — resets at midnight'
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: why } : p))
      toast?.(why)
      return false
    }
    // Clear the truncation flag too, or a retry that succeeds in full still
    // wears the warning from the attempt before it.
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'generating', error: null, truncated: false } : p))
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Not signed in')

      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task: 'alt-text', image: item.base64, mimeType: item.mimeType, context: context.trim() || undefined, tone }),
      })
      const data = await r.json().catch(() => ({}))
      // Every response carries the authoritative counts — including the 429s.
      // Absorbing them here is what makes the meter correct after a refusal,
      // and what surfaces the monthly ceiling the client could not otherwise
      // know about.
      quota.absorb(data)
      if (r.status === 429 && data.retryAfter && retries > 0) {
        const wait = (data.retryAfter || 5) * 1000
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready', error: `Rate limited, retrying in ${wait / 1000}s…` } : p))
        await delay(wait)
        return generateForItem(item, retries - 1)
      }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      recordUsage(ALT_TEXT_TOOL_ID)
      // The server flags a response that hit the model's token ceiling. Carry it
      // onto the item so the card can say the answer is unfinished — a partial
      // description presented as complete is the bug this whole flag exists for.
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, altText: data.altText, truncated: Boolean(data.truncated), status: 'done' } : p))
      return true
    } catch (err) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: err.message } : p))
      return false
    }
  }

  const generateAll = async () => {
    setBusy(true)
    const targets = items.filter(it => it.status === 'ready' || it.status === 'error')
    let done = 0
    for (let i = 0; i < targets.length; i++) {
      if (await generateForItem(targets[i])) done++
      if (i < targets.length - 1) await delay(4500)
    }
    setBusy(false)
    // The count is what LANDED. Nothing landed: the cards carry the reason,
    // and a toast announcing a success that did not happen is the fault above.
    if (done > 0) toast?.(`Generated ${done} alt text${done === 1 ? '' : 's'}`)
  }

  const copyOne = async (it) => {
    if (!it.altText) return
    try {
      await navigator.clipboard.writeText(it.altText)
      toast?.('Copied')
    } catch {
      toast?.('Copy failed')
    }
  }

  const copyAll = async () => {
    const done = items.filter(it => it.altText)
    if (!done.length) return
    const text = done.map(it => `${it.name}\t${it.altText}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast?.(`Copied ${done.length} alt texts`)
    } catch {
      toast?.('Copy failed')
    }
  }

  const downloadCSV = () => {
    const done = items.filter(it => it.altText)
    if (!done.length) return
    // Quoting alone was not enough: alt text is model output derived from a
    // user-supplied image, so a result beginning = + - or @ was executed as a
    // formula when the file was opened. See utils/csv.js.
    const csv = toCsv(['filename', 'alt_text'], done, (item, column) => (
      column === 'filename' ? item.name : item.altText
    ))
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'alt-text.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  const editAlt = (id, value) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, altText: value } : p))
  }

  const readyCount = items.filter(it => it.status === 'ready' || it.status === 'error').length
  const doneCount = items.filter(it => it.altText).length
  const activeTone = TONES.find(t => t.id === tone) || TONES[0]

  return (
    <div className="sec alt-page">
      <header className="alt-hero">
        {/* NO TAXONOMY EYEBROW. It read "AI Tools" at y=102 — the Create group
            the visitor clicked through, above an h1 that names the tool.
            #surface-headers-read-as-ai. */}
        <h1>Alt Text <em>Generator</em></h1>
        {/* Both plans resolve to the same model (see MODELS in
            api/_lib/plans.js), so the old "upgrade for higher-quality models"
            was selling something that does not exist. Pro buys CAPACITY. A
            unit test fails if this claim comes back while the models match. */}
        <p>Batch-upload images and generate WCAG-compliant alt text that also earns search relevance — by describing images accurately, not by stuffing keywords. {isPro ? 'Pro capacity active.' : 'Pro raises your daily and monthly generation limits.'}</p>
      </header>

      <AuthGate featureLabel="generate alt text">
      {/* Above the dropzone, not beside the button: the allowance is something
          to know BEFORE uploading forty images, not after the eighth refusal. */}
      <QuotaMeter quota={quota} className="quota--tool" />
      <div
        className={`alt-dropzone${isDragging ? ' dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          onChange={onInputChange}
          hidden
        />
        <span className="alt-dropzone-ico" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </span>
        <div className="alt-dropzone-title">Drop images here or click to upload</div>
        <div className="alt-dropzone-sub">JPG · PNG · WebP · HEIC · multiple files supported</div>
      </div>

      <div className="alt-options">
        <div className="alt-context">
          <label htmlFor="alt-context-input">Page context (optional)</label>
          <input
            id="alt-context-input"
            type="text"
            placeholder="e.g. blog post about hiking in the Alps"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            aria-describedby="alt-context-help"
          />
          {/* Says plainly what this field is NOT. It is the one input a
              keyword-stuffing tool would abuse, and the server prompt refuses to
              use it that way — the UI should not imply otherwise. */}
          <p className="alt-field-help" id="alt-context-help">
            What the page is about. Used to judge which details matter — never inserted as keywords, which Google treats as spam.
          </p>
        </div>
        <div className="alt-context">
          <span className="alt-label" id="alt-tone-label">Length</span>
          <div className="alt-seg" role="group" aria-labelledby="alt-tone-label">
            {TONES.map(t => (
              <button
                key={t.id}
                type="button"
                className="alt-seg-btn"
                onClick={() => setTone(t.id)}
                // The chips were styled-selected only. Without aria-pressed a
                // screen-reader user cannot tell which length is active.
                aria-pressed={tone === t.id}
                aria-describedby={tone === t.id ? 'alt-tone-help' : undefined}
                title={t.desc}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="alt-field-help" id="alt-tone-help">
            <strong>{activeTone.desc}.</strong> {activeTone.when}
          </p>
        </div>
      </div>

      {items.length === 0 && (
        <div className="alt-examples">
          <div className="alt-examples-title">What good alt text looks like</div>
          <div className="alt-examples-grid">
            <div className="alt-example good">
              <span className="alt-example-tag">Good</span>
              <p className="alt-example-text">“Golden retriever puppy curled asleep on a grey wool blanket”</p>
              <span className="alt-example-why">Specific subject, setting, and detail — describes what matters.</span>
            </div>
            <div className="alt-example bad">
              <span className="alt-example-tag">Avoid</span>
              <p className="alt-example-text">“image of a dog” · “IMG_4821.jpg” · “photo”</p>
              <span className="alt-example-why">Vague or filename-based — adds nothing for screen-reader users.</span>
            </div>
          </div>
          <ul className="alt-tips">
            <li>Keep it under ~125 characters — screen readers cut off long descriptions.</li>
            <li>Don&rsquo;t start with “image of” or “picture of” — that&rsquo;s already announced.</li>
            <li>Add <strong>page context</strong> above (e.g. the article topic) for sharper results.</li>
            <li>For purely decorative images, leave alt text empty (<code>alt=&quot;&quot;</code>).</li>
            {/* The honest version, stated where a user forms their mental model
                of what this tool is for. A stuffing tool would promise the
                opposite, and would earn them a spam penalty. */}
            <li>Search engines reward <strong>accurate and specific</strong> descriptions. Stuffing keywords breaks Google&rsquo;s spam policy and helps nobody.</li>
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className="alt-toolbar">
          <div className="alt-toolbar-info">
            <strong>{items.length}</strong> image{items.length === 1 ? '' : 's'}
            {doneCount > 0 && <> · <strong>{doneCount}</strong> generated</>}
          </div>
          <div className="alt-toolbar-actions">
            <button type="button" className="alt-btn" onClick={clearAll} disabled={busy}>Clear</button>
            {doneCount > 0 && (
              <>
                <button type="button" className="alt-btn" onClick={copyAll} disabled={busy}>Copy all</button>
                <button type="button" className="alt-btn" onClick={downloadCSV} disabled={busy}>Download CSV</button>
              </>
            )}
            <button type="button" className="alt-btn alt-btn--primary" onClick={generateAll} disabled={busy || readyCount === 0}>
              {busy ? 'Generating…' : `Generate ${readyCount > 0 ? `(${readyCount})` : 'all'}`}
            </button>
          </div>
        </div>
      )}

      <div className="alt-grid">
        {items.map(it => (
          <div key={it.id} className={`alt-card alt-card-${it.status}`}>
            <div className="alt-card-preview">
              {it.previewUrl ? (
                <img src={it.previewUrl} alt="" />
              ) : (
                <div className="alt-card-preview-pending">Loading…</div>
              )}
              <button type="button" className="alt-card-remove" onClick={() => removeItem(it.id)} aria-label={`Remove ${it.name}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="alt-card-body">
              <div className="alt-card-meta">
                <span className="alt-card-name" title={it.name}>{it.name}</span>
                <span className="alt-card-size">{formatBytes(it.size)}</span>
              </div>
              {it.status === 'generating' && <div className="alt-card-status">Generating…</div>}
              {/* Its own class, not the card's modifier. `alt-card-${status}` puts
                  `alt-card-error` on the CARD, and the message used to carry the
                  same name — so the message's rule (red tint, 12px, 8px padding, a
                  small radius, a red hairline) landed on the whole card: a refused
                  generation turned the card into a padded red box with its preview
                  inset. Rendered 2026-09-09 at 320 through 1920, both themes. */}
              {/* AND IT IS A STATUS MESSAGE, which it was not.
                  #435 gave this message its own class and stopped the green
                  "Generated 1 alt text" toast from landing over a card that
                  had failed — both of which fixed what a SIGHTED user saw. A
                  screen-reader user still got nothing: rendered 2026-09-11
                  signed in free with /api/ai answering 500, the card read "The
                  generator is unavailable right now." and the page's only live
                  region was the app toast, deliberately empty. Press Generate,
                  hear silence, and the failure is indistinguishable from a
                  press that did not register. WCAG 4.1.3.

                  status, not alert, for two reasons: a batch can fail card by
                  card and three assertive interruptions for one press is worse
                  than three queued sentences; and `.alt-card-warn` eight lines
                  below is the same card announcing the same kind of outcome
                  politely already. No new sentence — `it.error` is the string
                  that was on screen and unannounced. */}
              {it.status === 'error' && <div className="alt-card-error-msg" role="status" aria-live="polite">{it.error}</div>}
              {it.altText && (
                <>
                  {it.truncated && (
                    <div className="alt-card-warn" role="status">
                      The AI ran out of room and stopped mid-answer. Finish it below, or retry.
                    </div>
                  )}
                  <AutoGrowTextarea
                    className="alt-card-text"
                    aria-label={`Alt text for ${it.name}`}
                    value={it.altText}
                    onChange={(e) => editAlt(it.id, e.target.value)}
                  />
                  <div className="alt-card-actions">
                    <span className={`alt-card-count${it.altText.length > 125 ? ' over' : ''}`}>
                      {it.altText.length} chars
                    </span>
                    <button type="button" className="alt-btn" onClick={() => copyOne(it)}>Copy</button>
                    <button type="button" className="alt-btn" onClick={() => generateForItem(it)} disabled={busy}>Retry</button>
                  </div>
                </>
              )}
              {!it.altText && it.status !== 'generating' && it.status !== 'error' && (
                <button type="button" className="alt-btn" onClick={() => generateForItem(it)} disabled={busy || !it.base64}>
                  Generate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      </AuthGate>
    </div>
  )
}

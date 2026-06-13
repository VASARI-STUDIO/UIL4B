import { useState, useCallback, useRef } from 'react'
import UsageGate from '../components/UsageGate'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { auth as firebaseAuth } from '../utils/firebase'

const ALT_TEXT_TOOL_ID = 'alt-text'
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif'
const MAX_DIM = 1600

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
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[ALT_TEXT_TOOL_ID] ?? 40

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

  const generateForItem = async (item, retries = 2) => {
    if (!item.base64) return
    if (!canUseFeature(ALT_TEXT_TOOL_ID, dailyLimit)) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: 'Daily usage limit reached' } : p))
      toast?.('Daily limit reached — resets at midnight')
      return
    }
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'generating', error: null } : p))
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Not signed in')

      const r = await fetch('/api/alt-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image: item.base64, mimeType: item.mimeType, context: context.trim() || undefined }),
      })
      const data = await r.json().catch(() => ({}))
      if (r.status === 429 && data.retryAfter && retries > 0) {
        const wait = (data.retryAfter || 5) * 1000
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready', error: `Rate limited, retrying in ${wait / 1000}s…` } : p))
        await delay(wait)
        return generateForItem(item, retries - 1)
      }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      recordUsage(ALT_TEXT_TOOL_ID)
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, altText: data.altText, status: 'done' } : p))
    } catch (err) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: err.message } : p))
    }
  }

  const generateAll = async () => {
    setBusy(true)
    const targets = items.filter(it => it.status === 'ready' || it.status === 'error')
    for (let i = 0; i < targets.length; i++) {
      await generateForItem(targets[i])
      if (i < targets.length - 1) await delay(4500)
    }
    setBusy(false)
    toast?.(`Generated ${targets.length} alt text${targets.length === 1 ? '' : 's'}`)
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
    const csv = 'filename,alt_text\n' + done.map(it =>
      `"${it.name.replace(/"/g, '""')}","${it.altText.replace(/"/g, '""')}"`
    ).join('\n')
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

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Imagery</div>
        <h1>Alt Text <em>Generator</em></h1>
        <p>Batch-upload images and generate accessible alt text using AI. {isPro ? 'Pro model active.' : 'Upgrade to Pro for higher-quality models.'}</p>
      </div>

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
          style={{ display: 'none' }}
        />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <div className="alt-dropzone-title">Drop images here or click to upload</div>
        <div className="alt-dropzone-sub">JPG · PNG · WebP · HEIC · multiple files supported</div>
      </div>

      <div className="alt-context">
        <label htmlFor="alt-context-input">Context (optional)</label>
        <input
          id="alt-context-input"
          type="text"
          placeholder="e.g. blog post about hiking in the Alps"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
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
            <li>Add a <strong>context</strong> note above (e.g. the article topic) for sharper results.</li>
            <li>For purely decorative images, leave alt text empty (<code>alt=&quot;&quot;</code>).</li>
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <>
          <UsageGate toolId={ALT_TEXT_TOOL_ID}>
            <div className="alt-toolbar">
              <div className="alt-toolbar-info">
                <strong>{items.length}</strong> image{items.length === 1 ? '' : 's'}
                {doneCount > 0 && <> · <strong>{doneCount}</strong> generated</>}
              </div>
              <div className="alt-toolbar-actions">
                <button className="btn btn-s" onClick={clearAll} disabled={busy}>Clear</button>
                {doneCount > 0 && (
                  <>
                    <button className="btn btn-s" onClick={copyAll} disabled={busy}>Copy all</button>
                    <button className="btn btn-s" onClick={downloadCSV} disabled={busy}>Download CSV</button>
                  </>
                )}
                <button className="btn btn-primary btn-s" onClick={generateAll} disabled={busy || readyCount === 0}>
                  {busy ? 'Generating…' : `Generate ${readyCount > 0 ? `(${readyCount})` : 'all'}`}
                </button>
              </div>
            </div>
          </UsageGate>
        </>
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
              <button className="alt-card-remove" onClick={() => removeItem(it.id)} aria-label="Remove">
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
              {it.status === 'error' && <div className="alt-card-error">{it.error}</div>}
              {it.altText && (
                <>
                  <textarea
                    className="alt-card-text"
                    value={it.altText}
                    onChange={(e) => editAlt(it.id, e.target.value)}
                    rows={3}
                  />
                  <div className="alt-card-actions">
                    <span className={`alt-card-count${it.altText.length > 125 ? ' over' : ''}`}>
                      {it.altText.length} chars
                    </span>
                    <button className="btn btn-s" onClick={() => copyOne(it)}>Copy</button>
                    <button className="btn btn-s" onClick={() => generateForItem(it)} disabled={busy}>Retry</button>
                  </div>
                </>
              )}
              {!it.altText && it.status !== 'generating' && it.status !== 'error' && (
                <button className="btn btn-s" onClick={() => generateForItem(it)} disabled={busy || !it.base64}>
                  Generate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

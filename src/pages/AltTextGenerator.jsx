import { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ToolLayout, ToolButton, ToolMain, SlidePills, ToolIcon,
} from '../components/tool/ToolLayout'
import MenuSelect from '../components/tool/MenuSelect'
import { AI_LIMITS } from '../config/plans'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import useExportGate from '../hooks/useExportGate'
import { useSubscription } from '../contexts/SubscriptionContext'
import { recordUsage, canUseFeature } from '../utils/usageTracker'
import { useAiQuota } from '../hooks/useAiQuota'
import QuotaMeter from '../components/QuotaMeter'
import {
  AI_IMAGE_SENT, AI_TERMS_PATH, AI_REGION_TITLE, AI_REGION_ALT_BODY, AI_REGION_PANEL,
} from '../config/aiImageConsent'
import { crossRouteHashClick } from '../components/spectrum/salesLinks'
import useAiRegion, { regionBlockedNow } from '../hooks/useAiRegion'
import { isRegionRefusal } from '../utils/aiRegion'
import { auth as firebaseAuth } from '../utils/firebase'
import { toCsv } from '../utils/csv'
import VerifyEmailPrompt from '../components/VerifyEmailPrompt'
import AiLabel from '../components/AiLabel'
import { isEmailUnverifiedReply, beginVerifyRun, refuseForVerify, verifyRetryTarget } from '../utils/aiEmailGate'
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
// `target` is the character count each mode asks the server for (TONE_CONFIGS
// in api/ai.js); technical has no target.
const TONES = [
  {
    id: 'concise',
    label: 'Concise',
    target: 125,
    desc: '1–2 sentences, about 125 characters',
    when: 'The safe default for images in body content.',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    target: 300,
    desc: '2–4 sentences, up to 300 characters',
    when: 'For images that carry the meaning: a hero shot, a product photo, a scene the reader would otherwise miss.',
  },
  {
    id: 'technical',
    label: 'Technical',
    target: null,
    desc: 'Exact text, data values and labels',
    when: 'For charts, diagrams, screenshots and UI, where the numbers and labels are the content.',
  },
]

const toneOf = (id) => TONES.find(t => t.id === id) || TONES[0]
const COPY_FEEDBACK_MS = 1600

// Shown in the empty state: what good alt text looks like, before anything is
// uploaded. Written by a person, and measured the way a result is.
const EXAMPLE_ALT = 'Golden retriever puppy curled asleep on a grey wool blanket'

// The count against the length the row was written at, in words so colour is
// never the only signal.
function countText(n, toneId) {
  const target = toneOf(toneId).target
  const noun = n === 1 ? 'character' : 'characters'
  if (!target) return { text: `${n} ${noun}`, over: false }
  if (n > target) return { text: `${n} characters, ${n - target} over the ${target} target`, over: true }
  return { text: `${n} of ${target} characters`, over: false }
}

// Roughly a dozen lines at the card's type size — past that a description has
// gone wrong and a scrollbar is the honest signal. Well beyond the 300-character
// ceiling the 'detailed' tone targets, so a normal result never hits it.
const ALT_TEXT_MAX_HEIGHT = 260

// The result box was a fixed rows={3} textarea. A 300-character 'detailed'
// result does not fit in three rows, so a complete answer arrived looking
// clipped and the user had to scroll a tiny box to read their own output —
// which is what a truncated generation looks like from the outside, and is
// almost certainly the reported "generation gets cut off" problem.
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
  // Set when /api/ai refuses an unverified email. `verifyStop` ends the running
  // batch at once (every remaining image would get the same refusal), and
  // `verifyRetry` remembers what to repeat once the address is verified: the
  // whole batch, or the one card that was pressed.
  const [verifyNeeded, setVerifyNeeded] = useState(false)
  const verifyStop = useRef(false)
  // Set by the Stop button; checked between images, so the one in flight finishes.
  const stopRef = useRef(false)
  const [run, setRun] = useState(null)
  const verifyRetry = useRef(null)
  const verifyRun = { setNeeded: setVerifyNeeded, stop: verifyStop, retryRef: verifyRetry }
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const { plan, isPro } = useSubscription()
  const dailyLimit = plan?.limits?.[ALT_TEXT_TOOL_ID] ?? AI_LIMITS.free.daily
  // Reads the `usage` object the server has always returned and nothing ever
  // consumed, so the meter reflects the account rather than this browser — and
  // so the MONTHLY ceiling is visible before it is hit.
  const quota = useAiQuota(ALT_TEXT_TOOL_ID)
  // Visitors in the UK, Switzerland and the EEA can't use this tool (Google's
  // Gemini terms); the server says so and the page swaps the dropzone for why.
  const region = useAiRegion()
  const regionBlocked = region.blocked
  // Set when a Generate request is refused. The button the visitor pressed goes
  // away with the block, so focus moves to the card heading; a block found on
  // first load leaves focus alone.
  const regionHeadingRef = useRef(null)
  const focusRegionRef = useRef(false)
  useEffect(() => {
    if (regionBlocked && focusRegionRef.current) {
      focusRegionRef.current = false
      regionHeadingRef.current?.focus()
    }
  }, [regionBlocked])
  // The tool opens signed out. An account is asked for only when a generation
  // is requested, because that is the step that sends the image to /api/ai and
  // spends an allowance the server meters per account.
  const { user } = useAuth()
  const { requireLogin } = useLoginPrompt()
  const gateFile = useExportGate()
  const ensureAccount = useCallback(async () => {
    if (user) return true
    return !!(await requireLogin('generate alt text', { free: true, signup: true }))
  }, [user, requireLogin])

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

  // Resolves true only when a result landed on the card. generateAll counts
  // these: it used to toast "Generated N alt texts" for N = everything it
  // TRIED, so a refused request ended with a green tick saying the work was
  // done, directly above a card saying it was not (rendered 2026-09-09 with
  // /api/ai answering 500 and again 429, 320 through 1920, both themes).
  const generateForItem = async (item, retries = 2, useTone = tone) => {
    if (!item.base64) return false
    // Two ceilings, not one. The local tracker only knows about the daily
    // count, so a user could be blocked by the MONTHLY limit while every local
    // check said they were fine — and the server's refusal then read as a
    // generic error. quota.blocked covers both, and quota.message names which.
    if (quota.blocked || !canUseFeature(ALT_TEXT_TOOL_ID, dailyLimit)) {
      const why = quota.message || 'Daily limit reached — resets at 00:00 UTC'
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: why } : p))
      toast?.(why)
      return false
    }
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'generating', error: null } : p))
    try {
      const token = await firebaseAuth.currentUser?.getIdToken()
      if (!token) throw new Error('Not signed in')

      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ task: 'alt-text', image: item.base64, mimeType: item.mimeType, context: context.trim() || undefined, tone: useTone }),
      })
      const data = await r.json().catch(() => ({}))
      // The server refuses this region before it takes anything from the
      // allowance, so there is nothing to record or retry.
      if (isRegionRefusal(r.status, data)) {
        focusRegionRef.current = true
        region.markBlocked()
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: data.error || AI_REGION_TITLE } : p))
        return false
      }
      if (isEmailUnverifiedReply(r.status, data)) {
        // Not an error on the card: the card goes back to ready, and the prompt
        // above the dropzone says what to do.
        refuseForVerify(verifyRun, item.id)
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready', error: null } : p))
        return false
      }
      // A failed reply that still used the allowance says so, and is counted
      // here the same as a success so the local tracker agrees with the server.
      if (!r.ok && data.quotaSpent === true) recordUsage(ALT_TEXT_TOOL_ID)
      // Every response carries the authoritative counts — including the 429s.
      // Absorbing them here is what makes the meter correct after a refusal,
      // and what surfaces the monthly ceiling the client could not otherwise
      // know about.
      quota.absorb(data)
      if (r.status === 429 && data.retryAfter && retries > 0) {
        const wait = (data.retryAfter || 5) * 1000
        setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'ready', error: `Busy right now. Trying again in ${wait / 1000} seconds.` } : p))
        await delay(wait)
        return generateForItem(item, retries - 1, useTone)
      }
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      recordUsage(ALT_TEXT_TOOL_ID)
      // The server answers a reply cut off at the token ceiling with an error,
      // so any altText that arrives here is a finished answer.
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, altText: data.altText, status: 'done', tone: useTone } : p))
      return true
    } catch (err) {
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', error: err.message } : p))
      return false
    }
  }

  // One card's Generate or Retry: the same account check as the batch.
  // `useTone` is set by a row's Rewrite; otherwise the Length choice applies.
  const generateOne = async (item, useTone) => {
    if (!(await ensureAccount())) return
    beginVerifyRun(verifyRun, null)
    await generateForItem(item, 2, useTone || tone)
  }

  // Waits, but gives up the moment Stop is pressed.
  const pauseUnlessStopped = async (ms) => {
    const end = Date.now() + ms
    while (Date.now() < end && !stopRef.current) await delay(200)
  }

  // `only` is a list of row ids (Retry failed); without it every row that is
  // ready or failed is written. Decorative rows are never sent.
  const generateAll = async (only) => {
    if (!(await ensureAccount())) return
    setBusy(true)
    stopRef.current = false
    beginVerifyRun(verifyRun, { id: null, batch: true })
    const targets = items.filter(it => !it.decorative && (it.status === 'ready' || it.status === 'error')
      && (!Array.isArray(only) || only.includes(it.id)))
    let done = 0
    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break
      setRun({ at: i + 1, total: targets.length })
      if (await generateForItem(targets[i])) done++
      // A region refusal is final for every remaining card, so stop here.
      if (regionBlockedNow()) break
      if (verifyStop.current || stopRef.current) break
      if (i < targets.length - 1) await pauseUnlessStopped(4500)
    }
    setBusy(false)
    setRun(null)
    // The count is what LANDED. Nothing landed: the rows carry the reason,
    // and a toast announcing a success that did not happen is the fault above.
    if (stopRef.current) toast?.(`Stopped. ${done} of ${targets.length} written.`)
    else if (done > 0) toast?.(`Wrote ${done} alt text${done === 1 ? '' : 's'}`)
  }

  // The address is verified and the token is fresh: repeat what was refused.
  const retryAfterVerify = () => {
    const target = verifyRetryTarget(verifyRetry.current, items)
    setVerifyNeeded(false)
    verifyRetry.current = null
    if (target.kind === 'batch') generateAll()
    else if (target.kind === 'one') generateOne(target.item)
  }

  // Resolves true when the text reached the clipboard; the row shows the result
  // in place. A decorative image copies an empty string: its alt is "".
  const copyOne = async (it) => {
    try {
      await navigator.clipboard.writeText(it.decorative ? '' : it.altText)
      return true
    } catch {
      return false
    }
  }

  // Rows that have an alt to hand over: written ones, and decorative ones (empty).
  const outputRows = items.filter(it => it.decorative || it.altText)
  const altOf = (it) => (it.decorative ? '' : it.altText)

  const copyAll = async () => {
    if (!outputRows.length) return
    const text = outputRows.map(it => `${it.name}\t${altOf(it)}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      toast?.(`Copied ${outputRows.length} alt text${outputRows.length === 1 ? '' : 's'}`)
    } catch {
      toast?.('Copy failed')
    }
  }

  const downloadCSV = async () => {
    if (!outputRows.length) return
    if (!(await gateFile('download the alt text'))) return
    // Quoting alone was not enough: alt text is model output derived from a
    // user-supplied image, so a result beginning = + - or @ was executed as a
    // formula when the file was opened. See utils/csv.js.
    const csv = toCsv(['filename', 'alt_text'], outputRows, (item, column) => (
      column === 'filename' ? item.name : altOf(item)
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

  const setDecorative = (id, on) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, decorative: on } : p))
  }

  const preparingCount = items.filter(it => it.status === 'pending').length
  const readyCount = items.filter(it => !it.decorative && (it.status === 'ready' || it.status === 'error')).length
  const writtenCount = items.filter(it => it.altText && !it.decorative).length
  const failedIds = items.filter(it => it.status === 'error' && !it.altText && !it.decorative).map(it => it.id)
  const activeTone = toneOf(tone)
  // What is left before the daily or monthly wall, whichever is nearer.
  const left = Math.min(quota.daily.remaining, quota.monthly ? quota.monthly.remaining : Infinity)

  // The primary always names the next step and is never disabled.
  let primaryKind = 'add'
  if (busy) primaryKind = 'stop'
  else if (quota.blocked) primaryKind = isPro ? 'none' : 'plans'
  else if (readyCount > 0) primaryKind = 'write'
  else if (writtenCount > 0) primaryKind = 'copy'

  const openPicker = () => fileInputRef.current?.click()
  const primaryNode = {
    add: <ToolButton variant="accent" icon="upload-simple" onClick={openPicker}>Add images</ToolButton>,
    write: <ToolButton variant="accent" icon="magic-wand" onClick={() => generateAll()}>{`Write alt text (${readyCount})`}</ToolButton>,
    stop: <ToolButton icon="x" aria-label="Stop after this image" onClick={() => { stopRef.current = true }}>Stop</ToolButton>,
    copy: <ToolButton variant="accent" icon="copy" onClick={copyAll}>Copy all</ToolButton>,
    plans: <ToolButton as={Link} to="/plans" variant="accent">See plans</ToolButton>,
    none: null,
  }[primaryKind]

  // The toolbar's actions, in row order. Each id carries what it acts on, so a
  // change in the queue re-measures the row. Empty when the region gate applies.
  const tbItems = []
  if (!regionBlocked && items.length > 0) {
    tbItems.push({
      id: `count-${items.length}-${writtenCount}-${run ? run.at : 0}`,
      menu: false,
      render: () => (
        <span className="tl-meta alt-count">
          {run
            ? `Writing ${run.at} of ${run.total}`
            : `${items.length} image${items.length === 1 ? '' : 's'}${writtenCount > 0 ? ` · ${writtenCount} written` : ''}`}
        </span>
      ),
    })
  }
  if (!regionBlocked && primaryKind !== 'add') tbItems.push({
    id: 'add',
    priority: 2,
    render: () => <ToolButton icon="upload-simple" collapse onClick={openPicker} disabled={busy}>Add images</ToolButton>,
    menu: { label: 'Add images', icon: 'upload-simple', onSelect: openPicker, disabled: busy },
  })
  if (!regionBlocked && outputRows.length > 0) {
    if (primaryKind !== 'copy') tbItems.push({
      id: 'copy-all',
      align: 'end',
      priority: 1,
      render: () => <ToolButton icon="copy" collapse onClick={copyAll} disabled={busy}>Copy all</ToolButton>,
      menu: { label: 'Copy all', icon: 'copy', onSelect: copyAll, disabled: busy },
    })
    tbItems.push({
      id: 'csv',
      priority: 0,
      render: () => <ToolButton onClick={downloadCSV} disabled={busy}>Download CSV</ToolButton>,
      menu: { label: 'Download CSV', onSelect: downloadCSV, disabled: busy },
    })
  }
  if (!regionBlocked && items.length > 0) {
    tbItems.push({
      id: 'clear',
      align: outputRows.length > 0 && primaryKind !== 'copy' ? undefined : 'end',
      priority: 0,
      render: () => <ToolButton onClick={clearAll} disabled={busy}>Clear</ToolButton>,
      menu: { label: 'Clear', icon: 'x', onSelect: clearAll, disabled: busy },
    })
  }

  const guide = (
    <details className="alt-guide" open={regionBlocked || undefined}>
      <summary>How to write good alt text</summary>
      <ul className="alt-tips">
        <li><strong>Good:</strong> &lsquo;Golden retriever puppy curled asleep on a grey wool blanket&rsquo;. Specific subject, setting and detail.</li>
        <li><strong>Avoid:</strong> &lsquo;image of a dog&rsquo;, &lsquo;IMG_4821.jpg&rsquo;, &lsquo;photo&rsquo;. Vague or file names add nothing for screen reader users.</li>
        <li>Aim for about 125 characters. Long descriptions are tiring to listen to.</li>
        <li>Don&rsquo;t start with &lsquo;image of&rsquo; or &lsquo;picture of&rsquo;. Screen readers already say it&rsquo;s an image.</li>
        {!regionBlocked && <li>Add what the page is about for sharper results.</li>}
        <li>For purely decorative images, tick Decorative image. It gives an empty alt (<code>alt=&quot;&quot;</code>).</li>
        {/* The honest version, stated where a user forms their mental model
            of what this tool is for. A stuffing tool would promise the
            opposite, and would earn them a spam penalty. */}
        <li>Search engines reward <strong>accurate, specific</strong> descriptions. Stuffing in keywords breaks Google&rsquo;s spam policy and helps nobody.</li>
        {!regionBlocked && <li>Upload a batch and get alt text written to WCAG guidance, described accurately rather than stuffed with keywords.</li>}
        {/* Both plans resolve to the same model (MODELS in api/_lib/plans.js),
            so Pro is described as capacity, never as a better model. */}
        {!regionBlocked && <li>{isPro ? 'Pro limits are on.' : <>Pro raises your daily and monthly limits. <Link to="/plans">See plans</Link></>}</li>}
      </ul>
    </details>
  )

  return (
    <ToolLayout className="alt-page" title="Alt Text Generator" titleId="alt-title" items={tbItems} primary={regionBlocked ? null : primaryNode}>
      <ToolMain className="alt-main alt-sheet-wrap">
        {regionBlocked ? (
          <>
            <section className="alt-region" role="status" aria-labelledby="alt-region-title" data-testid="ai-region-blocked">
              <span className="alt-region-ico" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
                </svg>
              </span>
              <h2 className="alt-region-title" id="alt-region-title" ref={regionHeadingRef} tabIndex={-1}>{AI_REGION_TITLE}</h2>
              <p className="alt-region-body">{AI_REGION_ALT_BODY}</p>
              <p className="alt-region-note">{AI_REGION_PANEL}</p>
              <Link to="/create" className="tl-btn tl-btn--quiet alt-region-link">Browse other tools</Link>
            </section>
            {guide}
          </>
        ) : (
          <>
            {verifyNeeded && <VerifyEmailPrompt onVerified={retryAfterVerify} />}
            {/* Above the dropzone, so it is read before anything is uploaded,
                and outside it so no control sits inside another. The
                dropzone points at it with aria-describedby. What the
                provider may do with an image is in the Terms, linked rather
                than repeated. */}
            <p id="alt-ai-consent" className="ai-image-consent">
              {AI_IMAGE_SENT} <Link to={AI_TERMS_PATH} onClick={crossRouteHashClick(AI_TERMS_PATH)}>How providers may use them</Link>
            </p>
            <div
              aria-describedby="alt-ai-consent"
              className={`alt-dropzone${items.length > 0 ? ' alt-dropzone--compact' : ''}${isDragging ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={openPicker}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } }}
              role="button"
              tabIndex={0}
            >
              <input ref={fileInputRef} type="file" accept={ACCEPT} multiple onChange={onInputChange} hidden />
              <ToolIcon name={items.length > 0 ? 'plus' : 'image'} size={items.length > 0 ? 18 : 40} className="alt-dropzone-ico" />
              <div className="alt-dropzone-text">
                <div className="alt-dropzone-title">
                  {isDragging ? 'Drop to add' : items.length > 0 ? 'Add more images: drop here or choose files' : 'Drop images here, or choose files'}
                </div>
                {items.length === 0 && <div className="alt-dropzone-sub">JPG, PNG, WebP, GIF or HEIC. Add as many as you like.</div>}
              </div>
            </div>

            <section className="alt-brief" aria-label="Alt text settings">
              <div className="alt-brief-col alt-length">
                <span className="alt-brief-label" id="alt-tone-label">Length</span>
                <SlidePills className="tl-pills tl-pills--block alt-seg" role="group" aria-labelledby="alt-tone-label" value={tone}>
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={tone === t.id ? 'tl-pill is-on' : 'tl-pill'}
                      onClick={() => setTone(t.id)}
                      // Without aria-pressed a screen-reader user cannot tell which
                      // length is active.
                      aria-pressed={tone === t.id}
                      aria-describedby={tone === t.id ? 'alt-tone-help' : undefined}
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </SlidePills>
                <p className="alt-field-help" id="alt-tone-help">
                  <strong>{activeTone.desc}.</strong> {activeTone.when}
                </p>
              </div>
              <div className="alt-brief-col alt-context">
                <label className="alt-brief-label" htmlFor="alt-context-input">What&apos;s the page about? <span className="alt-brief-opt">(optional)</span></label>
                <input
                  id="alt-context-input"
                  type="text"
                  className="alt-field"
                  placeholder="e.g. a blog post about hiking in the Alps"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  aria-describedby="alt-context-help"
                />
                {/* Says plainly what this field is NOT. It is the one input a
                    keyword-stuffing tool would abuse, and the server prompt
                    refuses to use it that way. */}
                <p className="alt-field-help" id="alt-context-help">
                  Optional. Helps pick which details matter. It&rsquo;s never added as keywords.
                </p>
              </div>
              {quota.message ? (
                <QuotaMeter quota={quota} className="quota--tool" />
              ) : (
                <p className="alt-allowance">
                  {!user
                    ? `${AI_LIMITS.free.daily} a day free with an account`
                    : `${quota.daily.remaining} of ${quota.daily.limit} left today${quota.monthly ? ` · ${quota.monthly.remaining} of ${quota.monthly.limit} this month` : ''}`}
                </p>
              )}
              {readyCount > left && left > 0 && (
                <p className="alt-queue-note">You have {left} generation{left === 1 ? '' : 's'} left today. The first {left} image{left === 1 ? '' : 's'} will be written.</p>
              )}
            </section>

            {items.length === 0 && (
              <figure className="alt-example">
                <figcaption className="alt-example-label">Example, written by a person</figcaption>
                <p className="alt-example-words">{EXAMPLE_ALT}</p>
                <p className="alt-row-count">{countText(EXAMPLE_ALT.length, 'concise').text}</p>
              </figure>
            )}

            {items.length > 0 && (
              <section className="alt-sheet" aria-labelledby="alt-sheet-title">
                <div className="alt-sheet-head">
                  <h2 id="alt-sheet-title">{items.length} image{items.length === 1 ? '' : 's'}</h2>
                  <p className="alt-sheet-sum">
                    {preparingCount > 0 && <span>Preparing {preparingCount} image{preparingCount === 1 ? '' : 's'}…</span>}
                    <span>{writtenCount} written{failedIds.length > 0 ? ` · ${failedIds.length} failed` : ''}</span>
                    {failedIds.length > 0 && !quota.blocked && (
                      <ToolButton className="alt-retry-failed" disabled={busy} onClick={() => generateAll(failedIds)}>Retry failed</ToolButton>
                    )}
                  </p>
                </div>
                {items.map(it => (
                  <AltRow
                    key={it.id}
                    it={it}
                    busy={busy}
                    showPlans={quota.blocked && !isPro}
                    blocked={quota.blocked}
                    onRemove={() => removeItem(it.id)}
                    onEdit={(value) => editAlt(it.id, value)}
                    onWrite={(useTone) => generateOne(it, useTone)}
                    onDecorative={(on) => setDecorative(it.id, on)}
                    onCopy={() => copyOne(it)}
                  />
                ))}
              </section>
            )}

            {guide}
          </>
        )}
      </ToolMain>
    </ToolLayout>
  )
}

// One image beside its words. The copy confirmation is the row's own state, so
// it shows in place and a polite live region announces it.
function AltRow({ it, busy, showPlans, blocked, onRemove, onEdit, onWrite, onDecorative, onCopy }) {
  const [copyState, setCopyState] = useState(null)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    const ok = await onCopy()
    setCopyState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopyState(null), COPY_FEEDBACK_MS)
  }
  const nameId = `alt-name-${it.id}`
  const countId = `alt-count-${it.id}`
  const hasText = !!it.altText
  const writing = it.status === 'generating'
  const pending = it.status === 'pending'
  const showText = hasText && !writing && !it.decorative
  const count = showText ? countText(it.altText.length, it.tone) : null
  const canAct = !busy && !!it.base64
  const copyLabel = copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : it.decorative ? 'Copy empty alt' : 'Copy'
  const copyBtn = (
    <ToolButton className={`alt-row-copy${copyState ? ` is-${copyState}` : ''}`} onClick={copy}>
      <span className={`alt-swap${copyState === 'copied' ? ' is-on' : ''}`} aria-hidden="true">
        <ToolIcon name="copy" size={15} />
        <ToolIcon name="check" size={15} />
      </span>
      {copyLabel}
    </ToolButton>
  )
  return (
    <article className={`alt-row alt-row-${it.status}`} aria-labelledby={nameId}>
      <div className="alt-row-thumb">
        {it.previewUrl ? <img src={it.previewUrl} alt="" /> : <div className="alt-row-thumb-pending" />}
      </div>
      <div className="alt-row-meta">
        <span className="alt-row-name" id={nameId} title={it.name}>{it.name}</span>
        <span className="alt-row-facts">
          <span className="alt-row-size">{formatBytes(it.size)}</span>
          {hasText && !it.decorative && <AiLabel what="alt text" />}
        </span>
        <ToolButton variant="square" icon="x" className="alt-row-remove" aria-label={`Remove ${it.name}`} onClick={onRemove} />
      </div>
      <div className="alt-row-body">
        {pending && <p className="alt-row-note" role="status">Preparing image…</p>}
        {writing && <p className="alt-row-note alt-row-writing" role="status" aria-live="polite">Writing alt text…</p>}
        {it.status === 'error' && (
          <p className="alt-row-problem" role="status" aria-live="polite">
            <ToolIcon name="warning-circle" size={15} />
            <span>{it.error || "That didn't work. Try again, or try a smaller image."}</span>
            {showPlans && <Link to="/plans">See plans</Link>}
          </p>
        )}
        {it.status === 'ready' && it.error && <p className="alt-row-note" role="status" aria-live="polite">{it.error}</p>}
        {it.decorative && !pending && (
          <>
            <p className="alt-row-deco-alt"><code>alt=&quot;&quot;</code></p>
            <p className="alt-row-note">Screen readers skip this image.</p>
          </>
        )}
        {showText && (
          <AutoGrowTextarea
            className="alt-row-text"
            aria-label={`Alt text for ${it.name}`}
            aria-describedby={countId}
            value={it.altText}
            onChange={(e) => onEdit(e.target.value)}
          />
        )}
        {!hasText && !it.decorative && it.status === 'ready' && !it.error && <p className="alt-row-note">Not written yet.</p>}
        {!pending && (
          <div className="alt-row-foot">
            {count && (
              <p className={`alt-row-count${count.over ? ' is-over' : ''}`} id={countId}>
                {count.over && <ToolIcon name="warning" size={14} />}
                {count.text}
              </p>
            )}
            <label className="alt-row-deco">
              <input type="checkbox" checked={!!it.decorative} onChange={(e) => onDecorative(e.target.checked)} />
              <span>Decorative image</span>
            </label>
            <div className="alt-row-actions">
              {(showText || it.decorative) && copyBtn}
              {showText && (
                <MenuSelect
                  label="Rewrite"
                  triggerLabel="Rewrite"
                  value={it.tone || 'concise'}
                  options={TONES.map(t => ({ value: t.id, label: t.label }))}
                  onChange={onWrite}
                  disabled={!canAct}
                  footnote="Uses 1 of your generations."
                  className="tl-btn tl-btn--quiet alt-rewrite"
                />
              )}
              {!hasText && !it.decorative && !writing && (it.status === 'ready' || (it.status === 'error' && !blocked)) && (
                <ToolButton onClick={() => onWrite()} disabled={!canAct}>{it.status === 'error' ? 'Try again' : 'Write'}</ToolButton>
              )}
            </div>
          </div>
        )}
        <span className="sr-only" role="status" aria-live="polite">{copyState === 'copied' ? 'Alt text copied' : copyState === 'failed' ? 'Copy failed' : ''}</span>
      </div>
    </article>
  )
}

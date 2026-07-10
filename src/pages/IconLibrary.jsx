import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { getLenis } from '../hooks/useSmoothScroll'
import UIKitGuide from '../components/UIKitGuide'
import { addRecentIcon, getRecentIcons, clearRecentIcons } from '../utils/recentIcons'

const API_LIMIT = 999

const API_HOSTS = [
  'https://api.iconify.design',
  'https://api.simplesvg.com',
  'https://api.unisvg.com',
]

const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'token-branded',
])
// Theme-adaptive tint for the GRID/rail only (inverts monochrome art in dark mode).
// The customizer Stage does NOT use this — it fixes contrast via a luminance swap.
const invClass = (pack) => (COLORED_PACKS.has(pack) ? '' : 'ig-inv')

// Curated cross-pack collections. A chip aggregates every pack in its group so
// "Coloured" shows colour icons from ALL colour packs, not just one — same for
// the other styles. `packs` are real Iconify prefixes.
const ICON_GROUPS = {
  outlined: { label: 'Outlined', packs: ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph'] },
  solid: { label: 'Solid', packs: ['mdi', 'material-symbols', 'solar', 'fa6-solid', 'bxs'] },
  coloured: { label: 'Coloured', packs: ['logos', 'flat-color-icons', 'devicon', 'skill-icons', 'vscode-icons', 'token-branded'] },
  brands: { label: 'Brand logos', packs: ['simple-icons', 'logos', 'devicon', 'skill-icons'] },
  flags: { label: 'Flags', packs: ['circle-flags', 'flag', 'flagpack', 'cif'] },
  emoji: { label: 'Emoji', packs: ['twemoji', 'fluent-emoji', 'noto', 'openmoji'] },
}
const GROUP_ORDER = ['outlined', 'solid', 'coloured', 'brands', 'flags', 'emoji']
// Cap each pack's contribution so a 5-pack aggregate stays snappy (the grid is
// windowed anyway — nobody scrolls past a few thousand).
const PER_PACK_CAP = 1500

// Every pack across every group, de-duped — the default "All packs" aggregate.
const ALL_PACKS = [...new Set(GROUP_ORDER.flatMap(k => ICON_GROUPS[k].packs))]
// Cap per pack for the default aggregate so we hold ~5k lightweight refs, not ~36k.
const ALL_INITIAL_PER_PACK = 250
// Packs whose default style is genuinely stroke-based (the stroke slider applies).
const STROKE_PACKS = new Set(ICON_GROUPS.outlined.packs)
// Pro-gated store of user-customised icons. NEVER read/written for non-Pro.
const CUSTOM_KEY = 'vs-custom-icons'

// ── Style coherence ──────────────────────────────────────────────────────────
// Several Iconify prefixes ship MULTIPLE styles under one prefix, so a raw
// /collection dump mixes stroked and filled glyphs. That is why "Outlined" was
// showing filled icons: Phosphor (`ph`) carries `-fill`/`-duotone` weights,
// Heroicons/Iconoir carry `-solid`, Tabler carries `-filled`. These per-pack,
// suffix-anchored matchers keep only the names whose glyph matches the chosen
// style, so a style filter shows ONE coherent look (never a filled icon under
// "Outlined"). Packs absent here are single-style — every name is kept.
const STYLE_RULES = {
  ph:                 { outlined: n => !/-(?:thin|light|bold|fill|duotone)$/.test(n) },
  heroicons:          { outlined: n => !/-solid$/.test(n) },
  iconoir:            { outlined: n => !/-solid$/.test(n) },
  tabler:             { outlined: n => !/-filled$/.test(n) },
  mdi:                { solid: n => !/-outline$/.test(n) },
  'material-symbols': { solid: n => !/-(?:outline(?:-(?:rounded|sharp))?|rounded|sharp)$/.test(n) },
  solar:              { solid: n => /-bold(?:-duotone)?$/.test(n) },
}
// The style a single pack browses in — so picking "Phosphor" under Interface
// (outlined) directly never dumps its fill weights either.
const PACK_STYLE = {
  lucide: 'outlined', tabler: 'outlined', iconoir: 'outlined', heroicons: 'outlined', ph: 'outlined',
  mdi: 'solid', 'material-symbols': 'solid', solar: 'solid', 'fa6-solid': 'solid', bxs: 'solid',
}
const matchesStyle = (pack, name, style) => {
  const rule = STYLE_RULES[pack]?.[style]
  return rule ? rule(name) : true
}
const keepStyle = (pack, names, style) => {
  const rule = STYLE_RULES[pack]?.[style]
  return rule ? names.filter(rule) : names
}

function buildSvgUrl(host, pack, name, params = {}) {
  let url = `${host}/${pack}/${name}.svg`
  const parts = []
  if (params.size) { parts.push(`width=${params.size}`, `height=${params.size}`) }
  if (params.color) parts.push(`color=${encodeURIComponent(params.color)}`)
  if (params.rotate) parts.push(`rotate=${params.rotate}deg`)
  const flipVal = [params.flipH && 'horizontal', params.flipV && 'vertical'].filter(Boolean).join(',')
  if (flipVal) parts.push(`flip=${flipVal}`)
  if (params.download) parts.push('download=1')
  if (parts.length) url += '?' + parts.join('&')
  return url
}

async function fetchWithFallback(path, timeout = 4000) {
  for (const host of API_HOSTS) {
    try {
      const r = await fetch(`${host}${path}`, { signal: AbortSignal.timeout(timeout) })
      if (r.ok) return r
    } catch { /* try next host */ }
  }
  throw new Error('All API hosts failed')
}

async function fetchSvgText(pack, name, params = {}) {
  for (const host of API_HOSTS) {
    try {
      const url = buildSvgUrl(host, pack, name, params)
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (r.ok) return await r.text()
    } catch { /* try next host */ }
  }
  throw new Error('Failed to fetch icon SVG')
}

// ── Pure helpers (module scope — reused by the customizer + browse fns) ───────

// Round-robin merge so the grid mixes packs (outlined+solid+coloured+…) instead
// of dumping one pack fully before the next.
function interleavePacks(lists) {
  const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0)
  const merged = []
  for (let i = 0; i < maxLen; i++) for (const l of lists) if (i < l.length) merged.push(l[i])
  return merged
}

// Pro-gated custom store. Callers MUST check isPro before invoking these for a
// non-Pro user — the store is never touched for non-Pro (anti-tamper).
function readCustomIcons() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}
function writeCustomIcons(list) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); return true }
  catch { return false }
}

// Custom (base N) naming: count existing saves of the same base, then N = count+1.
function nextCustomName(base, existing) {
  const count = existing.filter(c => c.base === base).length
  const iteration = count + 1
  return { iteration, name: `Custom (${base} ${iteration})` }
}

// WCAG relative luminance of a hex colour (0 = black, 1 = white). Drives the
// contrast-aware Stage swap so a black icon never disappears on #0E0E11.
function relativeLuminance(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return 1
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const toLin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const r = toLin(parseInt(h.slice(0, 2), 16))
  const g = toLin(parseInt(h.slice(2, 4), 16))
  const b = toLin(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Sanitise arbitrary SVG markup (fetched OR pasted) before it ever touches the
// DOM: parse, drop <script>, strip on* handlers and javascript: hrefs. Returns
// the cleaned <svg> string, or null if it isn't valid SVG.
function sanitizeSvgMarkup(text) {
  if (!text || typeof text !== 'string') return null
  try {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    if (doc.querySelector('parsererror')) return null
    const svg = doc.querySelector('svg')
    if (!svg) return null
    svg.querySelectorAll('script').forEach(n => n.remove())
    const walk = (el) => {
      for (const a of [...el.attributes]) {
        const name = a.name.toLowerCase()
        const val = (a.value || '').trim().toLowerCase()
        if (name.startsWith('on')) el.removeAttribute(a.name)
        else if ((name === 'href' || name === 'xlink:href') && val.startsWith('javascript:')) el.removeAttribute(a.name)
      }
      for (const child of [...el.children]) walk(child)
    }
    walk(svg)
    return svg.outerHTML
  } catch { return null }
}

// Build a neutral (currentColor) base SVG for an embedded icon — no width/height
// so the Stage CSS drives its size live.
function embeddedSvgMarkup(icon) {
  return icon.filled
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
}

// Heuristic: does this markup describe a stroke-based icon (so we show the
// stroke control)? fill:none + a real stroke colour.
function detectPastedStroke(svg) {
  if (!svg) return false
  return /fill\s*=\s*["']none["']/i.test(svg) && /stroke\s*=\s*["'](?!none)[^"']+["']/i.test(svg)
}

// Re-neutralise a saved custom's baked root colour back to currentColor so the
// Stage can live-recolour it again on re-open.
function normalizeCustomBase(svg) {
  if (!svg) return svg
  return svg
    .replace(/(<svg\b[^>]*?)\sstroke="(?!none)[^"]*"/i, '$1 stroke="currentColor"')
    .replace(/(<svg\b[^>]*?)\sfill="(?!none)[^"]*"/i, '$1 fill="currentColor"')
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg || '')}`
}

// viewBox-centred rotate/flip transform used when baking output markup.
function transformAttr(rotate, flipH, flipV, cx, cy) {
  const parts = []
  if (rotate) parts.push(`rotate(${rotate} ${cx} ${cy})`)
  if (flipH || flipV) parts.push(`translate(${cx} ${cy}) scale(${flipH ? -1 : 1} ${flipV ? -1 : 1}) translate(${-cx} ${-cy})`)
  return parts.join(' ')
}

// Bake the live customiser values into REAL SVG attributes so copied/saved/
// downloaded markup matches the Stage exactly (this is the Lucide copy-reset
// #2794 workaround — never fall back to defaults).
function serializeCustomizedSvg(rawSvg, opts = {}) {
  if (!rawSvg) return ''
  const { size = 48, color, stroke, isStroke, absStroke, rotate = 0, flipH = false, flipV = false } = opts
  let doc
  try { doc = new DOMParser().parseFromString(rawSvg, 'image/svg+xml') } catch { return rawSvg }
  const svg = doc.querySelector('svg')
  if (!svg) return rawSvg
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  if (color) {
    if (isStroke) {
      svg.setAttribute('stroke', color)
      if (svg.getAttribute('fill') && svg.getAttribute('fill') !== 'none') svg.setAttribute('fill', color)
    } else {
      svg.setAttribute('fill', color)
    }
  }
  if (isStroke && stroke != null) {
    svg.setAttribute('stroke-width', String(stroke))
    if (absStroke) svg.setAttribute('vector-effect', 'non-scaling-stroke')
  }
  const vb = (svg.getAttribute('viewBox') || '0 0 24 24').split(/\s+/).map(Number)
  const cx = (vb[0] || 0) + (vb[2] || 24) / 2
  const cy = (vb[1] || 0) + (vb[3] || 24) / 2
  const tf = transformAttr(rotate, flipH, flipV, cx, cy)
  if (tf) {
    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', tf)
    while (svg.firstChild) g.appendChild(svg.firstChild)
    svg.appendChild(g)
  }
  return svg.outerHTML
}

// Robust clipboard write: async Clipboard API with a legacy execCommand
// fallback. Returns whether the copy landed (so callers never fake success).
async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:absolute;left:-9999px;top:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch { return false }
}

// Map an active icon to the recents payload. Pasted icons have no stable
// identity, so they aren't tracked (returns null → addRecentIcon no-ops).
function recentPayload(icon) {
  if (!icon || icon.pasted) return null
  if (icon.cdn) return { cdn: true, pack: icon.pack, name: icon.custom ? icon.base : icon.name }
  if (icon.d) return { cdn: false, name: icon.name, d: icon.d, filled: !!icon.filled }
  return null
}

// ── Icon customizer ──────────────────────────────────────────────────────────
// Replaces the old IconDetail. A structural sibling of ExportPanel: a dark
// spotlight "Stage" with live --ig-* preview, sanitised inline SVG, copy
// serialisation, and a Pro-gated Save. Adopts ExportPanel's a11y verbatim.
function IconCustomizer({ icon, addMode, isPro, onClose, onCopy }) {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const stageRef = useRef(null)
  const hostRef = useRef(null)
  const restoreRef = useRef(typeof document !== 'undefined' ? document.activeElement : null)

  const [pasted, setPasted] = useState(null)      // { svg, isStroke } for add-mode
  const [pasteText, setPasteText] = useState('')
  const [pasteErr, setPasteErr] = useState(false)

  const activeIcon = useMemo(() => {
    if (icon) return icon
    if (pasted) return { name: 'custom-icon', base: 'icon', svg: pasted.svg, cdn: false, filled: !pasted.isStroke, pasted: true }
    return null
  }, [icon, pasted])

  // Seed controls from a re-opened custom's saved values.
  const [size, setSize] = useState(() => (icon?.custom && icon.size) || 48)
  const [color, setColor] = useState(() => (icon?.custom && icon.color) || '')
  const [stroke, setStroke] = useState(() => (icon?.custom && icon.stroke) || 2)
  const [absStroke, setAbsStroke] = useState(() => !!(icon?.custom && icon.absStroke))
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [tab, setTab] = useState('svg')
  const [copied, setCopied] = useState('')
  const [savedState, setSavedState] = useState(() => (icon?.custom ? 'saved' : 'idle'))

  const isColoredPack = !!(activeIcon?.cdn && COLORED_PACKS.has(activeIcon.pack))
  const isStroke = useMemo(() => {
    if (!activeIcon) return false
    if (activeIcon.custom) return !!activeIcon.isStroke
    if (activeIcon.svg) return detectPastedStroke(activeIcon.svg)
    if (activeIcon.cdn) return STROKE_PACKS.has(activeIcon.pack) && matchesStyle(activeIcon.pack, activeIcon.name, 'outlined')
    return !activeIcon.filled
  }, [activeIcon])
  const rendersInline = !!activeIcon && (!!activeIcon.svg || (activeIcon.cdn ? isStroke : true))

  // Synchronous base markup for non-CDN sources (memoised — no setState churn).
  const localBase = useMemo(() => {
    if (!activeIcon) return null
    if (activeIcon.custom && activeIcon.svg) return normalizeCustomBase(activeIcon.svg)
    if (activeIcon.svg) return sanitizeSvgMarkup(activeIcon.svg)
    if (!activeIcon.cdn) return embeddedSvgMarkup(activeIcon)
    return null
  }, [activeIcon])

  // CDN base fetched once per icon, keyed by identity so a stale response from a
  // previous icon can never paint. All setState here is async (never in-render).
  const [fetched, setFetched] = useState({ id: null, svg: null, err: false })
  useEffect(() => {
    if (!activeIcon || !activeIcon.cdn || activeIcon.custom) return
    const id = activeIcon.id || `${activeIcon.pack}:${activeIcon.name}`
    let cancelled = false
    fetchSvgText(activeIcon.pack, activeIcon.name, {})
      .then(txt => {
        if (cancelled) return
        const clean = sanitizeSvgMarkup(txt)
        setFetched(clean ? { id, svg: clean, err: false } : { id, svg: null, err: true })
      })
      .catch(() => { if (!cancelled) setFetched({ id, svg: null, err: true }) })
    return () => { cancelled = true }
  }, [activeIcon])

  const currentId = activeIcon ? (activeIcon.id || `${activeIcon.pack}:${activeIcon.name}`) : null
  const fetchedBase = fetched.id === currentId ? fetched.svg : null
  const loadErr = fetched.id === currentId ? fetched.err : false
  const baseSvgText = localBase || fetchedBase

  // Inject the neutral base inline on the Stage; CSS vars drive its appearance.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = rendersInline && baseSvgText ? baseSvgText : ''
  }, [rendersInline, baseSvgText])

  // Live preview via the ONLY permitted inline-style channel: setProperty.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.style.setProperty('--ig-size', `${size}px`)
    stage.style.setProperty('--ig-stroke', String(stroke))
    stage.style.setProperty('--ig-color', color || '#F4F4F5')
    const tf = []
    if (rotate) tf.push(`rotate(${rotate}deg)`)
    if (flipH) tf.push('scaleX(-1)')
    if (flipV) tf.push('scaleY(-1)')
    stage.style.setProperty('--ig-transform', tf.length ? tf.join(' ') : 'none')
  }, [size, stroke, color, rotate, flipH, flipV])

  // Lock body scroll + restore focus to the opener on unmount (mirror ExportPanel).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    getLenis()?.stop()
    const opener = restoreRef.current
    return () => {
      document.body.style.overflow = prev
      getLenis()?.start()
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  // Move focus into the panel, trap Tab, close on Escape (mirror ExportPanel).
  useEffect(() => {
    panelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const f = panelRef.current?.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!f || f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const serializedOutput = useMemo(
    () => serializeCustomizedSvg(baseSvgText, { size, color: color || undefined, stroke, isStroke, absStroke, rotate, flipH, flipV }),
    [baseSvgText, size, color, stroke, isStroke, absStroke, rotate, flipH, flipV],
  )

  const cssCode = useMemo(() => {
    const lines = [`width: ${size}px;`, `height: ${size}px;`]
    if (color) lines.push(`color: ${color};`)
    const tf = []
    if (rotate) tf.push(`rotate(${rotate}deg)`)
    if (flipH) tf.push('scaleX(-1)')
    if (flipV) tf.push('scaleY(-1)')
    if (tf.length) lines.push(`transform: ${tf.join(' ')};`)
    return `.icon {\n  ${lines.join('\n  ')}\n}`
  }, [size, color, rotate, flipH, flipV])

  const urlCode = useMemo(() => {
    if (!activeIcon?.cdn || activeIcon.custom) return ''
    const p = { size }
    if (color && !isColoredPack) p.color = color
    if (rotate) p.rotate = rotate
    if (flipH) p.flipH = true
    if (flipV) p.flipV = true
    return buildSvgUrl(API_HOSTS[0], activeIcon.pack, activeIcon.name, p)
  }, [activeIcon, size, color, isColoredPack, rotate, flipH, flipV])

  const stageImgUrl = useMemo(() => {
    if (!activeIcon?.cdn) return ''
    const p = { size }
    if (color && !isColoredPack) p.color = color
    if (rotate) p.rotate = rotate
    if (flipH) p.flipH = true
    if (flipV) p.flipV = true
    return buildSvgUrl(API_HOSTS[0], activeIcon.pack, activeIcon.name, p)
  }, [activeIcon, size, color, isColoredPack, rotate, flipH, flipV])

  const effectiveColor = rendersInline ? (color || '#F4F4F5') : (color || '#000000')
  const stageIsLight = !isColoredPack && relativeLuminance(effectiveColor) < 0.35

  const markDirty = () => setSavedState(s => (s === 'saved' ? 'idle' : s))

  const applyPaste = () => {
    const clean = sanitizeSvgMarkup(pasteText)
    if (!clean) { setPasteErr(true); return }
    setPasteErr(false)
    setPasted({ svg: clean, isStroke: detectPastedStroke(clean) })
  }

  const handleCopySvg = async () => {
    const ok = await writeClipboard(serializedOutput)
    if (!ok) return
    setCopied('svg')
    setTimeout(() => setCopied(''), 2000)
    if (onCopy) onCopy(serializedOutput)
    addRecentIcon(recentPayload(activeIcon), 'copy')
  }

  const handleCopyCode = async () => {
    const text = tab === 'svg' ? serializedOutput : tab === 'css' ? cssCode : urlCode
    const ok = await writeClipboard(text)
    if (!ok) return
    setCopied('code')
    setTimeout(() => setCopied(''), 2000)
  }

  const handleDownload = () => {
    if (!serializedOutput) return
    try {
      const blob = new Blob([serializedOutput], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(activeIcon?.name || 'icon').replace(/[^\w.-]+/g, '-')}.svg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { /* ignore */ }
  }

  // ANTI-TAMPER: non-Pro is a no-op that routes to checkout BEFORE any compute —
  // no record is built, and the Custom store is never read or written.
  const handleSave = () => {
    if (!isPro) { navigate('/checkout'); return }
    if (!activeIcon || !baseSvgText) return
    const existing = readCustomIcons()
    const base = activeIcon.custom ? activeIcon.base : (activeIcon.cdn || activeIcon.d ? activeIcon.name : 'icon')
    const { iteration, name } = nextCustomName(base, existing)
    const colored = isColoredPack || !!color || (activeIcon.pasted === true && !isStroke)
    const svg = serializeCustomizedSvg(baseSvgText, { size, color: color || undefined, stroke, isStroke, absStroke, rotate, flipH, flipV })
    const record = {
      key: `${CUSTOM_KEY}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      base, iteration, name,
      pack: activeIcon.pack || null, cdn: !!activeIcon.cdn,
      svg, color: color || '', size, stroke, absStroke, isStroke, colored, ts: Date.now(),
    }
    if (!writeCustomIcons([record, ...existing])) { setSavedState('error'); return }
    addRecentIcon(recentPayload(activeIcon), 'edit')
    setSavedState('saved')
  }

  const saveLabel = savedState === 'saved' ? 'Saved to Custom Icons'
    : savedState === 'error' ? 'Couldn’t save — retry'
      : activeIcon?.custom ? 'Save as new' : 'Save to project'

  const title = addMode && !activeIcon ? 'Add a custom icon.' : (activeIcon?.name || 'Customise')

  return (
    <div className="icust-overlay" onMouseDown={onClose}>
      <div
        className="icust-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icust-title"
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="icust-head">
          <div className="icust-head-text">
            <span className="icust-eyebrow">{addMode && !activeIcon ? 'Add icon' : 'Customise'}</span>
            <h2 className="icust-title" id="icust-title">{title}</h2>
          </div>
          <button type="button" className="icust-close" onClick={onClose} aria-label="Close customizer">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {!activeIcon ? (
          <div className="icust-paste">
            <p className="icust-paste-help">Paste SVG markup or the full <code>&lt;svg&gt;…&lt;/svg&gt;</code>. Tune it on the stage, then copy — or save it to Custom Icons with Pro.</p>
            <textarea
              className="icust-paste-input"
              value={pasteText}
              onChange={(e) => { setPasteText(e.target.value); setPasteErr(false) }}
              placeholder="<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; …>…</svg>"
              aria-label="SVG markup"
              spellCheck={false}
            />
            {pasteErr && <p className="icust-err">That doesn’t look like valid SVG. Paste the full &lt;svg&gt;…&lt;/svg&gt;.</p>}
            <div className="icust-foot">
              <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={onClose}>Cancel</button>
              <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={applyPaste}>Add to stage</button>
            </div>
          </div>
        ) : (
          <>
            <div className={`icust-stage${stageIsLight ? ' icust-stage--light' : ''}${absStroke ? ' is-abs' : ''}`} ref={stageRef}>
              {rendersInline ? (
                <>
                  <div ref={hostRef} className="icust-stage-host" aria-hidden="true" />
                  {!baseSvgText && <span className="icust-stage-msg">{loadErr ? 'Couldn’t load this icon.' : 'Loading…'}</span>}
                </>
              ) : (
                <img className="icust-stage-img" src={stageImgUrl} width={size} height={size} alt={activeIcon.name} />
              )}
            </div>

            <div className="icust-meta">
              <span className="icust-tag">{activeIcon.custom ? 'Custom' : activeIcon.pasted ? 'Pasted' : (activeIcon.pack || 'embedded')}</span>
              <span className="icust-tag">{activeIcon.name}</span>
              {activeIcon.cdn && !activeIcon.custom && <span className="icust-tag">CDN</span>}
            </div>

            <div className="icust-controls">
              <div className="icust-row">
                <label htmlFor="icust-size">Size</label>
                <input id="icust-size" type="range" min="12" max="128" value={size} onChange={(e) => { setSize(+e.target.value); markDirty() }} />
                <span className="icust-value">{size}px</span>
              </div>

              <div className="icust-row">
                <label>Colour</label>
                {isColoredPack ? (
                  <span className="icust-note">Original colours preserved</span>
                ) : (
                  <>
                    <div className="icust-seg">
                      <button type="button" className={!color ? 'active' : ''} onClick={() => { setColor(''); markDirty() }}>Default</button>
                      <button type="button" className={color === '#000000' ? 'active' : ''} onClick={() => { setColor('#000000'); markDirty() }}>Black</button>
                      <button type="button" className={color === '#ffffff' ? 'active' : ''} onClick={() => { setColor('#ffffff'); markDirty() }}>White</button>
                    </div>
                    <input type="color" className="icust-color" aria-label="Custom colour" value={color || '#000000'} onChange={(e) => { setColor(e.target.value); markDirty() }} />
                  </>
                )}
              </div>

              {isStroke && (
                <div className="icust-row">
                  <label htmlFor="icust-stroke">Stroke</label>
                  <input id="icust-stroke" type="range" min="1" max="3" step="0.25" value={stroke} onChange={(e) => { setStroke(+e.target.value); markDirty() }} />
                  <span className="icust-value">{stroke}</span>
                  <button type="button" className={`icust-abs${absStroke ? ' active' : ''}`} aria-pressed={absStroke} onClick={() => { setAbsStroke(a => !a); markDirty() }}>Absolute</button>
                </div>
              )}

              <div className="icust-row">
                <label>Rotate</label>
                <div className="icust-seg">
                  {[0, 90, 180, 270].map(deg => (
                    <button key={deg} type="button" className={rotate === deg ? 'active' : ''} onClick={() => { setRotate(deg); markDirty() }}>{deg}°</button>
                  ))}
                </div>
              </div>

              <div className="icust-row">
                <label>Flip</label>
                <div className="icust-seg">
                  <button type="button" className={flipH ? 'active' : ''} aria-pressed={flipH} onClick={() => { setFlipH(f => !f); markDirty() }}>Horizontal</button>
                  <button type="button" className={flipV ? 'active' : ''} aria-pressed={flipV} onClick={() => { setFlipV(f => !f); markDirty() }}>Vertical</button>
                </div>
              </div>
            </div>

            <div className="icust-code">
              <div className="icust-code-tabs">
                <button type="button" className={tab === 'svg' ? 'active' : ''} onClick={() => setTab('svg')}>SVG</button>
                <button type="button" className={tab === 'css' ? 'active' : ''} onClick={() => setTab('css')}>CSS</button>
                {activeIcon.cdn && !activeIcon.custom && <button type="button" className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>URL</button>}
              </div>
              <button type="button" className="icust-code-box" onClick={handleCopyCode}>
                <span className="icust-code-hint">{copied === 'code' ? 'Copied!' : 'Click to copy'}</span>
                <code>{tab === 'svg' ? serializedOutput : tab === 'css' ? cssCode : urlCode}</code>
              </button>
            </div>

            <div className="icust-foot">
              <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={handleCopySvg}>
                {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
              </button>

              {isPro ? (
                <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={handleSave} disabled={savedState === 'saved'} aria-disabled={savedState === 'saved'}>
                  {saveLabel}
                </button>
              ) : (
                <div className="icust-save-lock">
                  <button type="button" className="ui-pill ui-pill-out ui-pill-md icust-save--locked" aria-disabled="true" title="Saving custom icons is a Pro feature." onClick={() => navigate('/checkout')}>
                    <span className="icust-lock-glyph" aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    Save to project
                    <span className="pnav-pop-tag">Pro</span>
                  </button>
                  <Link className="icust-upgrade" to="/checkout">Upgrade to save →</Link>
                </div>
              )}

              <button type="button" className="ui-pill ui-pill-out ui-pill-md" onClick={handleDownload}>Download</button>

              {activeIcon.cdn && !activeIcon.custom && !activeIcon.pasted && (
                <a className="ui-pill ui-pill-ghost ui-pill-md" href={`https://icon-sets.iconify.design/${activeIcon.pack}/${activeIcon.name}/`} target="_blank" rel="noopener noreferrer">
                  View on Iconify
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Flatten a /collection response into a flat, de-duplicated list of icon names.
// Combines categorised + uncategorised icons; aliases/hidden are skipped so the
// grid only shows canonical, renderable icons.
function collectionToNames(d) {
  const seen = new Set()
  const names = []
  const push = (n) => { if (n && !seen.has(n)) { seen.add(n); names.push(n) } }
  if (Array.isArray(d.uncategorized)) d.uncategorized.forEach(push)
  if (d.categories) Object.values(d.categories).forEach(arr => Array.isArray(arr) && arr.forEach(push))
  return names
}

// ── Collection cache ──────────────────────────────────────────────────────────
// Module-level (survives remounts) cache of parsed /collection responses, keyed by
// Iconify prefix. Every browse path (All packs / single pack / cross-pack group /
// search-clear) funnels through getCollectionNames, so a pack is fetched from the
// CDN at most ONCE per session. Switching packs or collections — or bouncing back
// to "All packs" — then paints from memory with no network round-trip. Caches the
// RAW de-duped name list + title; each caller still applies its own style filter.
const COLLECTION_CACHE = new Map()

async function getCollectionNames(pack) {
  const hit = COLLECTION_CACHE.get(pack)
  if (hit) return hit
  const r = await fetchWithFallback(`/collection?prefix=${pack}`, 6000)
  const d = await r.json()
  const entry = { names: collectionToNames(d), title: d.title || pack }
  COLLECTION_CACHE.set(pack, entry)
  return entry
}

const PAGE_SIZE = 120

export default function IconLibrary({ onCopy, embedded }) {
  const { t } = useI18n()
  const { isPro } = useSubscription()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])      // full result set (browse or search)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [mode, setMode] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  const [group, setGroup] = useState(null)   // active cross-pack collection, or null
  const [source, setSource] = useState('all')  // all | group | pack | custom | search
  const [selected, setSelected] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [recents, setRecents] = useState(() => getRecentIcons())
  const timer = useRef(null)
  const cdnOk = useRef(null)
  const reqId = useRef(0)            // guards against out-of-order async responses
  const didInit = useRef(false)
  const sentinelRef = useRef(null)
  const retryRef = useRef(null)     // re-runs the last browse for the error banner

  const renderLocal = useCallback((q, packFilter) => {
    const localIcons = window.icons || []
    const PACKS = window.PACKS || {}
    const pm = { tabler: 'T', lucide: 'L', iconoir: 'I', heroicons: 'H', 'simple-icons': 'S' }
    const pc = pm[packFilter] || ''
    q = (q || '').toLowerCase()
    const filtered = localIcons.filter(i =>
      (activeCat === 'all' || i.c === activeCat) &&
      (!packFilter || i.p === pc) &&
      (!q || i.n.indexOf(q) !== -1 || i.c.indexOf(q) !== -1)
    )
    setIcons(filtered.map(i => ({
      id: i.n,
      name: i.n,
      pack: PACKS[i.p] || i.p,
      d: i.d,
      filled: i.p === 'S',
      cdn: false
    })))
    setVisible(PAGE_SIZE)
    setMode(cdnOk.current === false ? 'Offline' : 'Embedded')
    setLoading(false)
  }, [activeCat])

  // Load EVERY pack by default, progressively. Fire all /collection requests in
  // parallel but append per-pack as each resolves (never Promise.all-block), and
  // round-robin merge so the grid stays mixed. Skeleton shows until the first
  // pack lands; a total failure surfaces the retry banner + built-in icons.
  const browseAll = useCallback(() => {
    const rid = ++reqId.current
    retryRef.current = browseAll
    setSource('all'); setGroup(null); setPack('')
    setLoadError(false)
    setVisible(PAGE_SIZE); setMode('')
    const lists = ALL_PACKS.map(() => [])

    // Warm-cache fast path: if every pack is already cached (e.g. returning to
    // "All packs" after browsing a single pack), paint synchronously with no
    // network and no skeleton flash.
    if (ALL_PACKS.every(p => COLLECTION_CACHE.has(p))) {
      cdnOk.current = true
      ALL_PACKS.forEach((p, idx) => {
        const names = keepStyle(p, COLLECTION_CACHE.get(p).names, PACK_STYLE[p]).slice(0, ALL_INITIAL_PER_PACK)
        lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
      })
      const merged = lists.flat()
      setIcons(merged)
      setMode(`All packs · ${merged.length.toLocaleString()} icons · ${ALL_PACKS.length} sets`)
      setLoading(false)
      return
    }

    setLoading(true)
    setIcons([])
    let settled = 0
    let okCount = 0
    ALL_PACKS.forEach((p, idx) => {
      getCollectionNames(p)
        .then(({ names: raw }) => {
          if (rid !== reqId.current) return
          cdnOk.current = true
          okCount++
          const names = keepStyle(p, raw, PACK_STYLE[p]).slice(0, ALL_INITIAL_PER_PACK)
          lists[idx] = names.map(n => ({ id: `${p}:${n}`, pack: p, name: n, cdn: true }))
          // Default sort = pack-by-pack: lists stays in ALL_PACKS order and each
          // pack's icons are contiguous, so flat() groups every pack together
          // (Lucide block, then Tabler, …) regardless of which request resolves
          // first — no round-robin interleave.
          const merged = lists.flat()
          setIcons(merged)
          const sets = lists.filter(l => l.length).length
          setMode(`All packs · ${merged.length.toLocaleString()} icons · ${sets} sets`)
          if (merged.length) setLoading(false)
        })
        .catch(() => { /* this pack failed — others may still resolve */ })
        .finally(() => {
          if (rid !== reqId.current) return
          settled++
          if (settled === ALL_PACKS.length) {
            setLoading(false)
            if (okCount === 0) { cdnOk.current = false; setLoadError(true); renderLocal('', '') }
          }
        })
    })
  }, [renderLocal])

  // Browse an entire icon set via the /collection endpoint.
  const browsePack = useCallback((packFilter) => {
    setSource('pack'); setGroup(null)
    if (!packFilter) { browseAll(); return }
    const rid = ++reqId.current
    retryRef.current = () => browsePack(packFilter)
    setLoading(true); setLoadError(false)
    getCollectionNames(packFilter)
      .then(({ names: raw, title }) => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        const names = keepStyle(packFilter, raw, PACK_STYLE[packFilter])
        if (!names.length) { renderLocal('', packFilter); return }
        setIcons(names.map(n => ({ id: `${packFilter}:${n}`, pack: packFilter, name: n, cdn: true })))
        setVisible(PAGE_SIZE)
        setMode(`${title} · ${names.length.toLocaleString()} icons`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal('', packFilter)
      })
  }, [renderLocal, browseAll])

  // Browse a whole collection (chip): fetch every pack in the group and
  // round-robin interleave them so the grid mixes packs.
  const browseGroup = useCallback((groupKey) => {
    const g = ICON_GROUPS[groupKey]
    if (!g) return
    const rid = ++reqId.current
    retryRef.current = () => browseGroup(groupKey)
    setSource('group'); setGroup(groupKey); setPack('')
    setLoading(true); setLoadError(false)
    Promise.all(g.packs.map(p =>
      getCollectionNames(p)
        .then(({ names }) => ({ names: keepStyle(p, names, groupKey).slice(0, PER_PACK_CAP), pack: p, ok: true }))
        .catch(() => ({ names: [], pack: p, ok: false }))
    ))
      .then(results => {
        if (rid !== reqId.current) return
        if (!results.some(r => r.ok)) { cdnOk.current = false; setLoadError(true); renderLocal('', ''); return }
        cdnOk.current = true
        const lists = results.map(r => r.names.map(n => ({ id: `${r.pack}:${n}`, pack: r.pack, name: n, cdn: true })))
        const merged = interleavePacks(lists)
        if (!merged.length) { renderLocal('', ''); return }
        setIcons(merged)
        setVisible(PAGE_SIZE)
        const hits = results.filter(r => r.names.length).length
        setMode(`${g.label} · ${merged.length.toLocaleString()} icons · ${hits} packs`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal('', '')
      })
  }, [renderLocal])

  // Custom Icons category. ANTI-TAMPER: for non-Pro this NEVER reads the store —
  // it renders the locked promo instead (handled in the render tree).
  const browseCustom = useCallback(() => {
    retryRef.current = browseCustom
    reqId.current++            // cancel any in-flight browse
    setSource('custom'); setGroup(null); setPack('')
    setQuery(''); setLoadError(false)
    if (!isPro) { setIcons([]); setVisible(PAGE_SIZE); setMode(''); setLoading(false); return }
    const list = readCustomIcons()
    setIcons(list.map(c => ({ ...c, custom: true, id: c.key })))
    setVisible(PAGE_SIZE)
    setMode(`Custom Icons · ${list.length.toLocaleString()} saved`)
    setLoading(false)
  }, [isPro])

  const doSearch = useCallback((q, scope = {}) => {
    q = (q || '').trim()
    const { pack: packFilter = '', group: groupKey = null } = scope
    if (!q || q.length < 2) {
      if (groupKey) browseGroup(groupKey)
      else if (packFilter) browsePack(packFilter)
      else browseAll()
      return
    }
    if (cdnOk.current === false) {
      renderLocal(q, groupKey ? '' : packFilter)
      return
    }
    const rid = ++reqId.current
    retryRef.current = () => doSearch(q, scope)
    setSource('search')
    setLoading(true); setLoadError(false)
    const params = new URLSearchParams()
    if (groupKey) params.set('prefixes', ICON_GROUPS[groupKey].packs.join(','))
    else if (packFilter) params.set('prefix', packFilter)
    params.set('query', q)
    params.set('limit', String(API_LIMIT))
    fetchWithFallback(`/search?${params.toString()}`)
      .then(r => r.json())
      .then(d => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        if (!d.icons || !d.icons.length) {
          renderLocal(q, groupKey ? '' : packFilter)
          return
        }
        const style = groupKey || PACK_STYLE[packFilter]
        const items = d.icons
          .map(id => { const [p, n] = id.split(':'); return { id, pack: p, name: n, cdn: true } })
          .filter(ic => matchesStyle(ic.pack, ic.name, style))
        if (!items.length) { renderLocal(q, groupKey ? '' : packFilter); return }
        setIcons(items)
        setVisible(PAGE_SIZE)
        const scopeLabel = groupKey ? ICON_GROUPS[groupKey].label : 'Iconify'
        setMode(`${items.length.toLocaleString()} matches${d.total > items.length ? '+' : ''} · ${scopeLabel}`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        setLoadError(true)
        renderLocal(q, groupKey ? '' : packFilter)
      })
  }, [renderLocal, browsePack, browseGroup, browseAll])

  // Initial load: all packs, so the grid shows catalogue breadth on first paint.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const id = setTimeout(() => browseAll(), 0)
    return () => clearTimeout(id)
  }, [browseAll])

  // Infinite scroll — reveal another page as the sentinel comes into view. The
  // `visible` dep makes the observer reconnect after each reveal so it keeps
  // draining while the sentinel stays inside the rootMargin (fixes the stall).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, icons.length))
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [icons.length, visible])

  const debounceSearch = useCallback((q, scope) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q, scope), 300)
  }, [doSearch])

  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    debounceSearch(q, { pack, group })
  }

  const handleClearSearch = () => {
    setQuery('')
    clearTimeout(timer.current)
    if (group) browseGroup(group)
    else if (source === 'custom') browseCustom()
    else if (pack) browsePack(pack)
    else browseAll()
  }

  const handlePackChange = (e) => {
    const p = e.target.value
    if (p.startsWith('group:')) return   // synthetic active-collection label
    clearTimeout(timer.current)
    if (p === 'all') { setQuery(''); browseAll() }
    else if (p === 'custom') { setQuery(''); browseCustom() }
    else {
      setPack(p); setGroup(null); setSource('pack')
      if (query.trim().length >= 2) doSearch(query, { pack: p, group: null })
      else browsePack(p)
    }
  }

  // Toggle a cross-pack collection chip. Keep any active search text and AND the
  // group into the query instead of clearing it; only browse the group when the
  // search box is empty.
  const handleGroupToggle = (key) => {
    clearTimeout(timer.current)
    const q = query.trim()
    const nextGroup = group === key ? null : key
    setGroup(nextGroup)
    setPack('')
    if (q.length >= 2) {
      setSource('search')
      doSearch(query, { pack: '', group: nextGroup })
    } else if (nextGroup) {
      browseGroup(nextGroup)
    } else {
      browseAll()
    }
  }

  const handleIconClick = (icon) => {
    setAddMode(false)
    setSelected(icon)
  }

  const handleAddIcon = () => {
    setSelected(null)
    setAddMode(true)
  }

  const handleCloseCustomizer = useCallback(() => {
    setSelected(null)
    setAddMode(false)
    setRecents(getRecentIcons())
    if (source === 'custom' && isPro) browseCustom()
  }, [source, isPro, browseCustom])

  // Clear-all for the two My Icons sections. Saved (custom) is Pro-only and wipes
  // the store; Recently copied is available to everyone and wipes the recents.
  const handleClearCustom = useCallback(() => {
    if (!isPro) return
    writeCustomIcons([])
    setIcons([])
    setMode('Custom Icons · 0 saved')
  }, [isPro])

  const handleClearRecents = useCallback(() => {
    clearRecentIcons()
    setRecents([])
  }, [])

  const selectValue = group ? `group:${group}` : source === 'custom' ? 'custom' : source === 'all' ? 'all' : pack

  const shown = icons.slice(0, visible)
  const hasMore = visible < icons.length
  const isMyIcons = source === 'custom'
  const searchEmpty = !isMyIcons && !loading && icons.length === 0 && !loadError

  // Shared glyph renderer — one code path for custom (saved), CDN and embedded
  // icons, reused by the main grid and both My Icons sections.
  const iconGlyph = (icon) => {
    if (icon.custom) {
      return <img src={svgToDataUri(icon.svg)} width="24" height="24" className={icon.colored ? '' : 'ig-inv'} loading="lazy" alt={icon.name} />
    }
    if (icon.cdn) {
      return <img src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`} width="24" height="24" className={invClass(icon.pack)} loading="lazy" alt={icon.name} />
    }
    return (
      <svg viewBox="0 0 24 24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'} aria-hidden="true">
        <path d={icon.d} />
      </svg>
    )
  }

  const renderCell = (icon, idx) => (
    <div
      key={icon.id || icon.key || `${idx}-${icon.name || ''}`}
      className="ic"
      role="button"
      tabIndex={0}
      aria-label={`Customise ${icon.name}`}
      onClick={() => handleIconClick(icon)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleIconClick(icon) } }}
    >
      {iconGlyph(icon)}
      <span>{icon.name}</span>
      {!icon.custom && icon.pack && <span className="ic-pack">{icon.pack}</span>}
    </div>
  )

  return (
    <div className="sec">
      {!embedded && (
        <div className="sec-h">
          <div className="sec-h-eyebrow">{t('iconLibrary.eyebrow')}</div>
          <h1>{t('iconLibrary.heading')}</h1>
          <p>{t('iconLibrary.subtitle')}</p>
        </div>
      )}

      {recents.length > 0 && !isMyIcons && (
        <div className="ig-rail">
          <div className="ig-rail-head">
            Recent
            <button
              type="button"
              className="ig-rail-clear"
              aria-label="Clear recent icons"
              title="Clear recent"
              onClick={() => { clearRecentIcons(); setRecents([]) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Clear
            </button>
          </div>
          <div className="ig-rail-track">
            {recents.map((r) => (
              <button
                key={r.key}
                type="button"
                className="ig-rail-item"
                aria-label={`${r.action === 'edit' ? 'Edited' : 'Copied'} ${r.name} — open to customise`}
                onClick={() => handleIconClick(r)}
              >
                {r.cdn ? (
                  <img src={`https://api.iconify.design/${r.pack}/${r.name}.svg?width=24&height=24`} width="24" height="24" className={invClass(r.pack)} loading="lazy" alt="" />
                ) : (
                  <svg viewBox="0 0 24 24" fill={r.filled ? 'currentColor' : 'none'} stroke={r.filled ? 'none' : 'currentColor'} aria-hidden="true"><path d={r.d} /></svg>
                )}
                <span className={`ig-rail-badge ig-rail-badge--${r.action === 'edit' ? 'edit' : 'copy'}`} aria-hidden="true">
                  {r.action === 'edit' ? (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  ) : (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sub">
        <div className="pl-toolbar">
          <div className="pl-search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="pl-search"
              placeholder="Search icons…"
              value={query}
              onChange={handleQueryChange}
            />
            {query && (
              <button type="button" className="pl-search-clear" aria-label="Clear search" onClick={handleClearSearch}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            )}
          </div>

          <select className="pl-select" value={selectValue} onChange={handlePackChange} aria-label="Icon pack">
            {group && <option value={`group:${group}`}>◆ {ICON_GROUPS[group].label} collection</option>}
            <option value="all">All packs</option>
            <optgroup label="Yours">
              <option value="custom">My Icons</option>
            </optgroup>
            <optgroup label="Interface (outlined)">
              <option value="lucide">Lucide</option>
              <option value="tabler">Tabler</option>
              <option value="iconoir">Iconoir</option>
              <option value="heroicons">Heroicons</option>
              <option value="ph">Phosphor</option>
            </optgroup>
            <optgroup label="Interface (solid)">
              <option value="mdi">Material Design</option>
              <option value="material-symbols">Material Symbols</option>
              <option value="solar">Solar</option>
              <option value="fa6-solid">Font Awesome</option>
              <option value="bxs">BoxIcons</option>
            </optgroup>
            <optgroup label="Brand logos (coloured)">
              <option value="simple-icons">Simple Icons</option>
              <option value="logos">Logos (colour)</option>
              <option value="devicon">Devicon</option>
              <option value="skill-icons">Skill Icons</option>
            </optgroup>
            <optgroup label="Flags">
              <option value="circle-flags">Circle Flags</option>
              <option value="flag">Flag Icons</option>
              <option value="flagpack">Flagpack</option>
              <option value="cif">Currency Flags</option>
            </optgroup>
            <optgroup label="Flat & emoji">
              <option value="flat-color-icons">Flat Color Icons</option>
              <option value="twemoji">Twemoji</option>
              <option value="noto">Noto Emoji</option>
              <option value="fluent-emoji">Fluent Emoji</option>
              <option value="openmoji">OpenMoji</option>
            </optgroup>
          </select>

          <button type="button" className="ig-addbtn" onClick={handleAddIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add icon
          </button>

          <div className="pl-chips">
            <button type="button" className={`pl-chip${source === 'custom' ? ' active' : ''}`} onClick={() => browseCustom()}>My Icons</button>
            {GROUP_ORDER.map(key => (
              <button key={key} type="button" className={`pl-chip${group === key ? ' active' : ''}`} onClick={() => handleGroupToggle(key)}>
                {ICON_GROUPS[key].label}
              </button>
            ))}
          </div>
        </div>

        {isMyIcons ? (
          // ── My Icons: two distinct collections, each independently clearable ──
          // 1) Saved — icons customised + saved to the project (Pro-gated store);
          // 2) Recently copied — every icon copied out, for quick reuse (all users).
          <div className="ig-myicons">
            <section className="ig-mysec">
              <div className="ig-mysec-head">
                <h3 className="ig-mysec-title">Saved</h3>
                {isPro && icons.length > 0 && (
                  <button type="button" className="ig-rail-clear" onClick={handleClearCustom} title="Clear all saved icons">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Clear all
                  </button>
                )}
              </div>
              {!isPro ? (
                <div className="ig-custom-lock">
                  <span className="ig-custom-lock-glyph" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </span>
                  <h3 className="ig-custom-lock-title">Save your customised icons</h3>
                  <p className="ig-custom-lock-sub">Pro keeps every icon you tweak in one place, ready to reuse across projects.</p>
                  <button type="button" className="ui-pill ui-pill-accent ui-pill-md" onClick={() => navigate('/checkout')}>Upgrade to Pro</button>
                </div>
              ) : icons.length > 0 ? (
                <div className="ig">{shown.map(renderCell)}</div>
              ) : (
                <div className="ig-custom-empty">No saved icons yet — open any icon, adjust it on the stage, and hit Save to keep it here.</div>
              )}
            </section>

            <section className="ig-mysec">
              <div className="ig-mysec-head">
                <h3 className="ig-mysec-title">Recently copied</h3>
                {recents.length > 0 && (
                  <button type="button" className="ig-rail-clear" onClick={handleClearRecents} title="Clear recently copied">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    Clear all
                  </button>
                )}
              </div>
              {recents.length > 0 ? (
                <div className="ig">{recents.map(renderCell)}</div>
              ) : (
                <div className="ig-custom-empty">Icons you copy show up here for quick reuse.</div>
              )}
            </section>
          </div>
        ) : (
          <>
            {loadError && (
              <div className="ig-notice">
                <span>Couldn’t reach the icon service — showing built-in icons.</span>
                <button type="button" className="ui-pill ui-pill-out ui-pill-sm" onClick={() => retryRef.current?.()}>Try again</button>
              </div>
            )}

            <div className="ig">
              {loading && icons.length === 0
                ? Array.from({ length: 24 }).map((_, i) => (
                  <div key={`skel-${i}`} className="ig-skel" aria-hidden="true">
                    <div className="sk ig-skel-glyph" />
                    <div className="sk ig-skel-label" />
                  </div>
                ))
                : shown.map(renderCell)}
            </div>

            {hasMore && <div ref={sentinelRef} className="ig-sentinel" />}

            {loading && icons.length > 0 && (
              <p className="ig-status">Loading more…</p>
            )}

            {searchEmpty && (
              <div className="pl-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>{query.trim()
                  ? `No icons match “${query.trim()}”. Try another word, or clear the search to browse everything.`
                  : 'No icons to show — try another pack or search.'}</p>
              </div>
            )}

            {!loading && icons.length > 0 && (
              <p className="ig-status">
                Showing {shown.length.toLocaleString()} of {icons.length.toLocaleString()} · {mode}
              </p>
            )}
          </>
        )}
      </div>
      <UIKitGuide step="icons" />

      {(selected || addMode) && (
        <IconCustomizer
          key={selected ? (selected.id || selected.key || `${selected.pack || 'emb'}:${selected.name}`) : 'add'}
          icon={selected}
          addMode={addMode && !selected}
          isPro={isPro}
          onClose={handleCloseCustomizer}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}

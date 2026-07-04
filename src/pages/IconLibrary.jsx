import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import UIKitGuide from '../components/UIKitGuide'
import { addRecentIcon } from '../utils/recentIcons'

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
const iconFilter = (pack) => (COLORED_PACKS.has(pack) ? 'none' : 'var(--icon-inv)')

// Curated cross-pack collections. A chip aggregates every pack in its group so
// "Coloured" shows colour icons from ALL colour packs, not just one — same for
// the other styles. `packs` are real Iconify prefixes.
const ICON_GROUPS = {
  outlined: { label: 'Outlined', packs: ['lucide', 'tabler', 'iconoir', 'heroicons', 'ph'] },
  solid: { label: 'Solid', packs: ['mdi', 'material-symbols', 'solar', 'fa6-solid', 'carbon'] },
  coloured: { label: 'Coloured', packs: ['logos', 'flat-color-icons', 'devicon', 'skill-icons', 'vscode-icons', 'token-branded'] },
  flags: { label: 'Flags', packs: ['circle-flags', 'flag', 'flagpack', 'cif'] },
  emoji: { label: 'Emoji', packs: ['twemoji', 'fluent-emoji', 'noto', 'openmoji'] },
}
const GROUP_ORDER = ['outlined', 'solid', 'coloured', 'flags', 'emoji']
// Cap each pack's contribution so a 5-pack aggregate stays snappy (the grid is
// windowed anyway — nobody scrolls past a few thousand).
const PER_PACK_CAP = 1500

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

function IconDetail({ icon, onClose, onCopy, paletteColors }) {
  const [size, setSize] = useState(48)
  const [color, setColor] = useState('')
  const [colorInput, setColorInput] = useState('')
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [svgCode, setSvgCode] = useState('')
  const [copied, setCopied] = useState('')
  const [tab, setTab] = useState('svg')
  const fetchRef = useRef(null)

  const isCdn = icon.cdn
  const pack = isCdn ? icon.pack : null
  const name = icon.name
  const isColored = pack && COLORED_PACKS.has(pack)

  const transforms = []
  if (rotate) transforms.push(`rotate(${rotate}deg)`)
  if (flipH) transforms.push('scaleX(-1)')
  if (flipV) transforms.push('scaleY(-1)')
  const transformStyle = transforms.length ? transforms.join(' ') : undefined

  useEffect(() => {
    clearTimeout(fetchRef.current)
    fetchRef.current = setTimeout(() => {
      if (!isCdn) {
        const c = color || 'currentColor'
        const svg = icon.filled
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${c}"><path d="${icon.d}"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
        setSvgCode(svg)
        return
      }
      const p = { size }
      if (color) p.color = color
      if (rotate) p.rotate = rotate
      if (flipH) p.flipH = true
      if (flipV) p.flipV = true
      fetchSvgText(pack, name, p)
        .then(setSvgCode)
        .catch(() => setSvgCode('<!-- Failed to load SVG -->'))
    }, 350)
    return () => clearTimeout(fetchRef.current)
  }, [isCdn, icon, pack, name, size, color, rotate, flipH, flipV])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const previewParams = { size }
  if (color && !isColored) previewParams.color = color
  if (rotate) previewParams.rotate = rotate
  if (flipH) previewParams.flipH = true
  if (flipV) previewParams.flipV = true
  const previewUrl = isCdn ? buildSvgUrl(API_HOSTS[0], pack, name, previewParams) : null

  const cssLines = [`width: ${size}px;`, `height: ${size}px;`]
  if (color) cssLines.push(`color: ${color};`)
  if (transforms.length) cssLines.push(`transform: ${transforms.join(' ')};`)
  const cssCode = `.icon {\n  ${cssLines.join('\n  ')}\n}`

  const iconUrl = isCdn ? buildSvgUrl(API_HOSTS[0], pack, name, previewParams) : ''

  const doCopy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleColorInput = (val) => {
    setColorInput(val)
    if (!val) { setColor(''); return }
    if (/^#[0-9a-f]{3,8}$/i.test(val)) setColor(val)
  }

  return (
    <div className="fg-detail-overlay" onClick={onClose}>
      <div className="il-detail" onClick={e => e.stopPropagation()}>
        <button className="fg-detail-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="il-detail-preview">
          {isCdn ? (
            <img
              src={previewUrl}
              width={size}
              height={size}
              alt={name}
              style={{ filter: !color && !isColored ? iconFilter(pack) : 'none' }}
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              width={size}
              height={size}
              fill={icon.filled ? (color || 'currentColor') : 'none'}
              stroke={icon.filled ? 'none' : (color || 'currentColor')}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: transformStyle }}
            >
              <path d={icon.d} />
            </svg>
          )}
        </div>

        <div className="fg-detail-tags">
          <span className="fg-tag">{pack || 'embedded'}</span>
          <span className="fg-tag">{name}</span>
          {isCdn && <span className="fg-tag">CDN</span>}
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Customize</div>
          <div className="il-detail-controls">
            <div className="il-detail-row">
              <label>Size</label>
              <input type="range" min="12" max="128" value={size} onChange={e => setSize(+e.target.value)} />
              <span className="il-detail-value">{size}px</span>
            </div>
            <div className="il-detail-row">
              <label>Color</label>
              {isColored ? (
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>Original colours preserved</span>
              ) : (
                <>
                  <input
                    type="color"
                    value={color || '#000000'}
                    onChange={e => { setColor(e.target.value); setColorInput(e.target.value) }}
                  />
                  <input
                    type="text"
                    className="il-detail-color-input"
                    value={colorInput}
                    placeholder="currentColor"
                    onChange={e => handleColorInput(e.target.value)}
                  />
                  {color && (
                    <button className="il-detail-reset" onClick={() => { setColor(''); setColorInput('') }} title="Reset color" aria-label="Reset color">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
            {!isColored && (
              <div className="il-detail-row">
                <label>Preset</label>
                <div className="il-detail-seg" style={{ flexWrap: 'wrap' }}>
                  <button className={!color ? 'active' : ''} onClick={() => { setColor(''); setColorInput('') }}>Default</button>
                  <button className={color === '#000000' ? 'active' : ''} onClick={() => { setColor('#000000'); setColorInput('#000000') }}>Black</button>
                  <button className={color === '#ffffff' ? 'active' : ''} onClick={() => { setColor('#ffffff'); setColorInput('#ffffff') }}>White</button>
                  {paletteColors?.slice(0, 5).map((c, i) => (
                    <button key={i} className={color === c ? 'active' : ''} onClick={() => { setColor(c); setColorInput(c) }} title={c} aria-label={`Set color to ${c}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.15)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="il-detail-row">
              <label>Rotate</label>
              <div className="il-detail-seg">
                {[0, 90, 180, 270].map(deg => (
                  <button key={deg} className={rotate === deg ? 'active' : ''} onClick={() => setRotate(deg)}>
                    {deg}°
                  </button>
                ))}
              </div>
            </div>
            <div className="il-detail-row">
              <label>Flip</label>
              <div className="il-detail-seg">
                <button className={flipH ? 'active' : ''} onClick={() => setFlipH(!flipH)}>Horizontal</button>
                <button className={flipV ? 'active' : ''} onClick={() => setFlipV(!flipV)}>Vertical</button>
              </div>
            </div>
          </div>
        </div>

        <div className="fg-detail-section">
          <div className="fg-detail-label">Code</div>
          <div className="il-detail-code-tabs">
            <button className={tab === 'svg' ? 'active' : ''} onClick={() => setTab('svg')}>SVG</button>
            <button className={tab === 'css' ? 'active' : ''} onClick={() => setTab('css')}>CSS</button>
            {isCdn && <button className={tab === 'url' ? 'active' : ''} onClick={() => setTab('url')}>URL</button>}
          </div>
          <div
            className="il-detail-code"
            onClick={() => doCopy(tab === 'svg' ? svgCode : tab === 'css' ? cssCode : iconUrl, 'code')}
          >
            <span className="il-detail-code-hint">{copied === 'code' ? 'Copied!' : 'Click to copy'}</span>
            {tab === 'svg' && svgCode}
            {tab === 'css' && cssCode}
            {tab === 'url' && iconUrl}
          </div>
        </div>

        <div className="fg-detail-actions">
          <button className="ui-pill ui-pill-accent ui-pill-sm" onClick={() => { doCopy(svgCode, 'svg'); if (onCopy) onCopy(svgCode) }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
          </button>
          <button className="ui-pill ui-pill-out ui-pill-sm" onClick={() => {
            try {
              const saved = JSON.parse(localStorage.getItem('vs-saved-icons') || '[]')
              const key = `${pack || 'emb'}-${name}`
              if (!saved.find(s => s.key === key)) {
                saved.push({ key, pack, name, cdn: !!isCdn, d: icon.d, filled: icon.filled, color })
                localStorage.setItem('vs-saved-icons', JSON.stringify(saved))
              }
              setCopied('saved')
              setTimeout(() => setCopied(p => p === 'saved' ? '' : p), 1500)
            } catch {}
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {copied === 'saved' ? 'Saved!' : 'Save to Project'}
          </button>
          {isCdn && (
            <a
              href={buildSvgUrl(API_HOSTS[0], pack, name, { ...previewParams, download: true })}
              className="ui-pill ui-pill-out ui-pill-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </a>
          )}
          {isCdn && (
            <a
              href={`https://icon-sets.iconify.design/${pack}/${name}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-pill ui-pill-ghost ui-pill-sm"
            >
              View on Iconify
            </a>
          )}
        </div>
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

const PAGE_SIZE = 120
const DEFAULT_PACK = 'lucide'

export default function IconLibrary({ onCopy }) {
  const { t } = useI18n()
  const { design } = useProject()
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])      // full result set (browse or search)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [mode, setMode] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeCat] = useState('all')
  const [pack, setPack] = useState(DEFAULT_PACK)
  const [group, setGroup] = useState(null)   // active cross-pack collection, or null for single-pack mode
  const [selected, setSelected] = useState(null)
  const timer = useRef(null)
  const cdnOk = useRef(null)
  const reqId = useRef(0)            // guards against out-of-order async responses
  const didInit = useRef(false)
  const sentinelRef = useRef(null)

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

  // Browse an entire icon set via the /collection endpoint — this is what fills
  // the grid with thousands of icons instead of a handful of search hits.
  const browsePack = useCallback((packFilter) => {
    setGroup(null)
    if (!packFilter) { renderLocal('', '') ; return }
    const rid = ++reqId.current
    setLoading(true)
    fetchWithFallback(`/collection?prefix=${packFilter}`, 6000)
      .then(r => r.json())
      .then(d => {
        if (rid !== reqId.current) return
        cdnOk.current = true
        const names = collectionToNames(d)
        if (!names.length) { renderLocal('', packFilter); return }
        setIcons(names.map(n => ({ id: `${packFilter}:${n}`, pack: packFilter, name: n, cdn: true })))
        setVisible(PAGE_SIZE)
        setMode(`${d.title || packFilter} · ${names.length.toLocaleString()} icons`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        renderLocal('', packFilter)
      })
  }, [renderLocal])

  // Browse a whole collection (chip): fetch every pack in the group in parallel
  // and round-robin interleave them so the grid mixes packs instead of dumping
  // one pack before the next. This is what makes "Coloured" show colour icons
  // from ALL colour packs at once.
  const browseGroup = useCallback((groupKey) => {
    const g = ICON_GROUPS[groupKey]
    if (!g) return
    const rid = ++reqId.current
    setGroup(groupKey)
    setPack('')
    setLoading(true)
    Promise.all(g.packs.map(p =>
      fetchWithFallback(`/collection?prefix=${p}`, 6000)
        .then(r => r.json())
        .then(d => ({ names: collectionToNames(d).slice(0, PER_PACK_CAP), pack: p, ok: true }))
        .catch(() => ({ names: [], pack: p, ok: false }))
    ))
      .then(results => {
        if (rid !== reqId.current) return
        if (!results.some(r => r.ok)) { cdnOk.current = false; renderLocal('', ''); return }
        cdnOk.current = true
        const lists = results.map(r => r.names.map(n => ({ pack: r.pack, name: n })))
        const maxLen = lists.reduce((m, l) => Math.max(m, l.length), 0)
        const merged = []
        for (let i = 0; i < maxLen; i++) for (const l of lists) if (i < l.length) merged.push(l[i])
        if (!merged.length) { renderLocal('', ''); return }
        setIcons(merged.map(({ pack, name }) => ({ id: `${pack}:${name}`, pack, name, cdn: true })))
        setVisible(PAGE_SIZE)
        const hits = results.filter(r => r.names.length).length
        setMode(`${g.label} · ${merged.length.toLocaleString()} icons · ${hits} packs`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        renderLocal('', '')
      })
  }, [renderLocal])

  const doSearch = useCallback((q, scope = {}) => {
    q = (q || '').trim()
    const { pack: packFilter = '', group: groupKey = null } = scope
    // Empty query: browse the active collection or pack (or fall back to local).
    if (!q || q.length < 2) {
      if (groupKey) browseGroup(groupKey)
      else browsePack(packFilter)
      return
    }
    if (cdnOk.current === false) {
      renderLocal(q, groupKey ? '' : packFilter)
      return
    }
    const rid = ++reqId.current
    setLoading(true)
    // A group scopes the search to its packs (Iconify `prefixes=`); a single pack
    // uses `prefix=`; neither searches every set.
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
        setIcons(d.icons.map(id => {
          const [p, n] = id.split(':')
          return { id, pack: p, name: n, cdn: true }
        }))
        setVisible(PAGE_SIZE)
        const scopeLabel = groupKey ? ICON_GROUPS[groupKey].label : 'Iconify'
        setMode(`${d.icons.length.toLocaleString()} matches${d.total > d.icons.length ? '+' : ''} · ${scopeLabel}`)
        setLoading(false)
      })
      .catch(() => {
        if (rid !== reqId.current) return
        cdnOk.current = false
        renderLocal(q, groupKey ? '' : packFilter)
      })
  }, [renderLocal, browsePack, browseGroup])

  // Initial load: browse the default pack so the grid is full on first paint.
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    // Defer out of the effect body so the kickoff fetch's setState isn't synchronous.
    const id = setTimeout(() => browsePack(DEFAULT_PACK), 0)
    return () => clearTimeout(id)
  }, [browsePack])

  // Infinite scroll — reveal another page as the sentinel comes into view.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, icons.length))
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [icons.length])

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
    else browsePack(pack)
  }

  const handlePackChange = (e) => {
    const p = e.target.value
    if (p.startsWith('group:')) return   // synthetic active-collection label — not selectable
    setPack(p)
    setGroup(null)
    // Switching packs with no query browses the new pack immediately (no debounce).
    clearTimeout(timer.current)
    if (query.trim().length >= 2) doSearch(query, { pack: p, group: null })
    else browsePack(p)
  }

  // Toggle a cross-pack collection chip: on → aggregate the group, off → back to
  // the default pack.
  const handleGroupToggle = (key) => {
    setQuery('')
    clearTimeout(timer.current)
    if (group === key) { setPack(DEFAULT_PACK); browsePack(DEFAULT_PACK) }
    else browseGroup(key)
  }

  const handleIconClick = (icon) => {
    setSelected(icon)
    if (icon.cdn) {
      addRecentIcon({ cdn: true, pack: icon.pack, name: icon.name })
    } else {
      addRecentIcon({ cdn: false, name: icon.name, d: icon.d, filled: icon.filled })
    }
  }

  const shown = icons.slice(0, visible)
  const hasMore = visible < icons.length

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('iconLibrary.title')}</h1>
        <p>{t('tools.iconLibrary.description')}</p>
      </div>
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

          <select className="pl-select" value={group ? `group:${group}` : pack} onChange={handlePackChange} aria-label="Icon pack">
            {group && <option value={`group:${group}`}>◆ {ICON_GROUPS[group].label} collection</option>}
            <option value="">All packs (search)</option>
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
              <option value="carbon">Carbon</option>
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

          <div className="pl-chips">
            {GROUP_ORDER.map(key => (
              <button key={key} type="button" className={`pl-chip${group === key ? ' active' : ''}`}
                onClick={() => handleGroupToggle(key)}
              >{ICON_GROUPS[key].label}</button>
            ))}
          </div>
        </div>

        {!pack && !group && query.trim().length < 2 && !loading && (
          <p style={{ fontSize: 12, color: 'var(--t2)', padding: '8px 0 4px' }}>
            Pick a pack to browse, or type at least 2 characters to search across every Iconify set.
          </p>
        )}

        <div className="ig">
          {shown.map((icon, idx) => (
            <div key={`${idx}-${icon.pack || ''}-${icon.name || ''}`} className="ic" onClick={() => handleIconClick(icon)}>
              {icon.cdn ? (
                <img
                  src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`}
                  width="24" height="24"
                  style={{ filter: iconFilter(icon.pack) }}
                  loading="lazy"
                  alt={icon.name}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill={icon.filled ? 'currentColor' : 'none'} stroke={icon.filled ? 'none' : 'currentColor'}>
                  <path d={icon.d} />
                </svg>
              )}
              <span>{icon.name}</span>
              <span style={{ fontSize: 6, color: 'var(--t3)' }}>{icon.pack}</span>
            </div>
          ))}
        </div>

        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

        {loading && (
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 16, textAlign: 'center' }}>Loading icons…</p>
        )}

        {!loading && icons.length === 0 && (
          <div className="pl-empty" style={{ padding: '48px 20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>No icons match — try a different search, or refresh if the icon set didn&apos;t load.</p>
          </div>
        )}

        {!loading && icons.length > 0 && (
          <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 12 }}>
            Showing {shown.length.toLocaleString()} of {icons.length.toLocaleString()} &middot; {mode}
          </p>
        )}
      </div>
      <UIKitGuide step="icons" />

      {selected && (
        <IconDetail
          icon={selected}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
          paletteColors={design?.palette?.colors}
        />
      )}
    </div>
  )
}

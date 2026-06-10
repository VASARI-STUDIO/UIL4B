import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
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

function IconDetail({ icon, onClose, onCopy }) {
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
        <button className="fg-detail-close" onClick={onClose}>
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
                <button className="il-detail-reset" onClick={() => { setColor(''); setColorInput('') }} title="Reset color">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
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
          <button className="btn btn-accent" onClick={() => { doCopy(svgCode, 'svg'); if (onCopy) onCopy(svgCode) }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
          </button>
          {isCdn && (
            <a
              href={buildSvgUrl(API_HOSTS[0], pack, name, { ...previewParams, download: true })}
              className="btn"
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
              className="btn"
            >
              View on Iconify
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IconLibrary({ onCopy }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])
  const [mode, setMode] = useState('Embedded')
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState(null)
  const timer = useRef(null)
  const cdnOk = useRef(null)
  const didInit = useRef(false)

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
    setCount(filtered.length)
    setMode(cdnOk.current === false ? 'Offline' : 'Embedded')
  }, [activeCat])

  const doSearch = useCallback((q, packFilter) => {
    q = (q || '').trim()
    if (!q || q.length < 2) {
      renderLocal(q, packFilter)
      return
    }
    if (cdnOk.current === false) {
      renderLocal(q, packFilter)
      return
    }
    const pfx = packFilter ? `prefix=${packFilter}&` : ''
    fetchWithFallback(`/search?${pfx}query=${encodeURIComponent(q)}&limit=${API_LIMIT}`)
      .then(r => r.json())
      .then(d => {
        cdnOk.current = true
        if (!d.icons || !d.icons.length) {
          renderLocal(q, packFilter)
          return
        }
        setIcons(d.icons.map(id => {
          const [p, n] = id.split(':')
          return { id, pack: p, name: n, cdn: true }
        }))
        setCount(d.icons.length)
        setMode('Live via Iconify')
      })
      .catch(() => {
        cdnOk.current = false
        renderLocal(q, packFilter)
      })
  }, [renderLocal])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetchWithFallback(`/search?query=arrow&limit=${API_LIMIT}`)
      .then(r => r.json())
      .then(d => {
        cdnOk.current = true
        if (d.icons?.length) {
          setIcons(d.icons.map(id => { const [p, n] = id.split(':'); return { id, pack: p, name: n, cdn: true } }))
          setCount(d.icons.length)
          setMode('Live via Iconify')
        } else {
          renderLocal('', '')
        }
      })
      .catch(() => { cdnOk.current = false; renderLocal('', '') })
  }, [renderLocal])

  const debounceSearch = useCallback((q, p) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => doSearch(q, p), 300)
  }, [doSearch])

  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    debounceSearch(q, pack)
  }

  const handlePackChange = (e) => {
    const p = e.target.value
    setPack(p)
    debounceSearch(query, p)
  }

  const handleIconClick = (icon) => {
    setSelected(icon)
    if (icon.cdn) {
      addRecentIcon({ cdn: true, pack: icon.pack, name: icon.name })
    } else {
      addRecentIcon({ cdn: false, name: icon.name, d: icon.d, filled: icon.filled })
    }
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('iconLibrary.title')}</h1>
        <p>{t('tools.iconLibrary.description')}</p>
      </div>
      <div className="sub">
        <div className="row" style={{ marginBottom: 14, gap: 10 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="seg-label">Search</div>
            <input type="text" placeholder="Search icons..." style={{ width: '100%' }} value={query} onChange={handleQueryChange} />
          </div>
          <div style={{ minWidth: 130 }}>
            <div className="seg-label">Pack</div>
            <select style={{ width: '100%' }} value={pack} onChange={handlePackChange}>
              <option value="">All packs</option>
              <optgroup label="Interface">
                <option value="tabler">Tabler</option>
                <option value="lucide">Lucide</option>
                <option value="iconoir">Iconoir</option>
                <option value="heroicons">Heroicons</option>
                <option value="ph">Phosphor</option>
                <option value="mdi">Material Design</option>
                <option value="material-symbols">Material Symbols</option>
                <option value="solar">Solar</option>
                <option value="fa6-solid">Font Awesome</option>
                <option value="carbon">Carbon</option>
              </optgroup>
              <optgroup label="Brand logos">
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
          </div>
        </div>

        <div className="ig">
          {icons.map((icon, idx) => (
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

        <p style={{ fontSize: 11, color: 'var(--t2)', marginTop: 12 }}>
          {count} icons &middot; {mode}
        </p>
      </div>
      <UIKitGuide step="icons" />

      {selected && (
        <IconDetail
          icon={selected}
          onClose={() => setSelected(null)}
          onCopy={onCopy}
        />
      )}
    </div>
  )
}

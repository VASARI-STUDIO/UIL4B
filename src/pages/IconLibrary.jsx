import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import UIKitGuide from '../components/UIKitGuide'
import { addRecentIcon } from '../utils/recentIcons'

const API_LIMIT = 999

// Multi-colour Iconify collections (brand logos, flags, flat/emoji art) must not
// be colour-inverted in dark mode, or their colours break. Only monochrome icons
// get the --icon-inv treatment so black glyphs stay visible on dark backgrounds.
const COLORED_PACKS = new Set([
  'logos', 'flat-color-icons', 'fxemoji', 'noto', 'noto-v1', 'twemoji', 'emojione',
  'emojione-v1', 'openmoji', 'fluent-emoji', 'fluent-emoji-flat', 'circle-flags',
  'flag', 'flagpack', 'cif', 'skill-icons', 'devicon', 'vscode-icons', 'token-branded',
])
const iconFilter = (pack) => (COLORED_PACKS.has(pack) ? 'none' : 'var(--icon-inv)')

export default function IconLibrary({ onCopy }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])
  const [mode, setMode] = useState('Embedded')
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  const [count, setCount] = useState(0)
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
    fetch(`https://api.iconify.design/search?${pfx}query=${encodeURIComponent(q)}&limit=${API_LIMIT}`, {
      signal: AbortSignal.timeout(4000)
    })
      .then(r => r.json())
      .then(d => {
        cdnOk.current = true
        if (!d.icons || !d.icons.length) {
          renderLocal(q, packFilter)
          return
        }
        setIcons(d.icons.map(id => {
          const [p, name] = id.split(':')
          return { id, pack: p, name, cdn: true }
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
    fetch(`https://api.iconify.design/search?query=arrow&limit=${API_LIMIT}`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then(d => {
        cdnOk.current = true
        if (d.icons?.length) {
          setIcons(d.icons.map(id => { const [p, name] = id.split(':'); return { id, pack: p, name, cdn: true } }))
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

  const fetchCdnSvg = (packName, name) => {
    fetch(`https://api.iconify.design/${packName}/${name}.svg?width=24&height=24`)
      .then(r => r.text())
      .then(s => onCopy(s))
      .catch(() => onCopy('Failed to fetch SVG'))
  }

  const handleIconClick = (icon) => {
    if (icon.cdn) {
      const [p, n] = icon.id.split(':')
      fetchCdnSvg(p, n)
      addRecentIcon({ cdn: true, pack: p, name: n })
    } else {
      const fill = icon.filled
      const svg = fill
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
      onCopy(svg)
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
    </div>
  )
}

import { useState, useCallback, useRef } from 'react'

export default function IconLibrary({ onCopy }) {
  const [query, setQuery] = useState('')
  const [icons, setIcons] = useState([])
  const [mode, setMode] = useState('Embedded')
  const [activeCat] = useState('all')
  const [pack, setPack] = useState('')
  const [count, setCount] = useState(0)
  const timer = useRef(null)
  const cdnOk = useRef(null)

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
    fetch(`https://api.iconify.design/search?${pfx}query=${encodeURIComponent(q)}&limit=80`, {
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
    } else {
      const fill = icon.filled
      const svg = fill
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="${icon.d}"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`
      onCopy(svg)
    }
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Icon Library</h1>
        <p>Search thousands of icons across major open-source packs via Iconify, or browse the embedded collection offline.</p>
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
              <option value="tabler">Tabler</option>
              <option value="lucide">Lucide</option>
              <option value="iconoir">Iconoir</option>
              <option value="heroicons">Heroicons</option>
              <option value="simple-icons">Simple Icons</option>
              <option value="ph">Phosphor</option>
              <option value="mdi">Material Design</option>
            </select>
          </div>
        </div>

        <div className="ig">
          {icons.map(icon => (
            <div key={icon.id + icon.name} className="ic" onClick={() => handleIconClick(icon)}>
              {icon.cdn ? (
                <img
                  src={`https://api.iconify.design/${icon.pack}/${icon.name}.svg?width=24&height=24`}
                  width="24" height="24"
                  style={{ filter: 'var(--icon-inv)' }}
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
    </div>
  )
}

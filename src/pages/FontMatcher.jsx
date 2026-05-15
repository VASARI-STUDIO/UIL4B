import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useProject } from '../contexts/ProjectContext'
import {
  fetchFonts,
  searchFonts,
  loadFont,
  generatePairings,
  getFontImportUrl,
  getFontCSSRule,
} from '../utils/googleFonts'

const CATS = [
  { id: 'all', label: 'All' },
  { id: 'sans-serif', label: 'Sans Serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'display', label: 'Display' },
  { id: 'handwriting', label: 'Handwriting' },
  { id: 'monospace', label: 'Monospace' },
]

const SORT_OPTS = [
  { id: 'popularity', label: 'Popular' },
  { id: 'trending', label: 'Trending' },
  { id: 'alphabetical', label: 'A–Z' },
]

const VIEWS = [
  { id: 'discover', label: 'Discover' },
  { id: 'pairings', label: 'Pairings' },
  { id: 'compare', label: 'Compare' },
  { id: 'specimen', label: 'Specimen' },
]

const FALLBACK = { 'serif': 'serif', 'sans-serif': 'sans-serif', 'display': 'cursive', 'handwriting': 'cursive', 'monospace': 'monospace' }

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  )
}

const PAGE_SIZE = 40

export default function FontMatcher({ onCopy, toast }) {
  const { t } = useI18n()
  const { design, setFonts } = useProject()

  const applyPairing = useCallback((heading, body) => {
    const hWeight = heading.variants.includes(700) ? 700 : (heading.variants[heading.variants.length - 1] || 400)
    const bWeight = body.variants.includes(400) ? 400 : (body.variants[0] || 400)
    setFonts({
      heading: { family: heading.family, weight: hWeight, category: heading.category },
      body: { family: body.family, weight: bWeight, category: body.category },
    })
    if (toast) toast(`Applied: ${heading.family} + ${body.family}`)
  }, [setFonts, toast])

  const [view, setView] = useState('discover')
  const [allFonts, setAllFonts] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popularity')
  const [page, setPage] = useState(1)

  // Pairing state
  const [headingFont, setHeadingFont] = useState(null)
  const [pairings, setPairings] = useState([])
  const [pairingLoading, setPairingLoading] = useState(false)

  // Compare state
  const [compareA, setCompareA] = useState(null)
  const [compareB, setCompareB] = useState(null)

  // Specimen state
  const [specimenFont, setSpecimenFont] = useState(null)
  const [specimenWeight, setSpecimenWeight] = useState(400)

  // Preview text
  const [previewText, setPreviewText] = useState('')
  const sampleText = previewText || 'The quick brown fox jumps over the lazy dog'

  const searchTimer = useRef(null)

  useEffect(() => {
    fetchFonts().then(fonts => {
      setAllFonts(fonts)
      setLoading(false)
      if (fonts.length > 0) {
        setHeadingFont(fonts[0])
        setCompareA(fonts[0])
        setCompareB(fonts.find(f => f.category === 'serif') || fonts[1])
        setSpecimenFont(fonts[0])
      }
    })
  }, [])

  const filtered = useMemo(() => {
    if (!allFonts.length) return []
    let result = allFonts

    if (query) {
      const q = query.toLowerCase()
      result = result.filter(f => f.family.toLowerCase().includes(q))
    }

    if (category !== 'all') {
      result = result.filter(f => f.category === category)
    }

    if (sortBy === 'alphabetical') {
      result = [...result].sort((a, b) => a.family.localeCompare(b.family))
    } else if (sortBy === 'trending') {
      result = [...result].sort((a, b) => {
        const sa = (1 / (a.popularity + 1)) * (a.variants.length / 10)
        const sb = (1 / (b.popularity + 1)) * (b.variants.length / 10)
        return sb - sa
      })
    }

    return result
  }, [allFonts, query, category, sortBy])

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page])
  const hasMore = paged.length < filtered.length

  useEffect(() => {
    setPage(1)
  }, [query, category, sortBy])

  // Load visible fonts
  useEffect(() => {
    const toLoad = view === 'discover' ? paged : []
    toLoad.forEach(f => loadFont(f.family, f.variants.slice(0, 3)))
  }, [paged, view])

  // Load pairing fonts
  useEffect(() => {
    if (!headingFont || view !== 'pairings') return
    loadFont(headingFont.family, headingFont.variants)
    pairings.forEach(p => loadFont(p.family, p.variants.slice(0, 3)))
  }, [headingFont, pairings, view])

  // Load compare fonts
  useEffect(() => {
    if (view !== 'compare') return
    if (compareA) loadFont(compareA.family, compareA.variants)
    if (compareB) loadFont(compareB.family, compareB.variants)
  }, [compareA, compareB, view])

  // Load specimen font
  useEffect(() => {
    if (!specimenFont || view !== 'specimen') return
    loadFont(specimenFont.family, specimenFont.variants)
  }, [specimenFont, view])

  const doPairing = useCallback(async (font) => {
    if (!font) return
    setHeadingFont(font)
    setPairingLoading(true)
    loadFont(font.family, font.variants)
    const pairs = await generatePairings(font)
    pairs.forEach(p => loadFont(p.family, p.variants.slice(0, 3)))
    setPairings(pairs)
    setPairingLoading(false)
  }, [])

  const shufflePairing = useCallback(async () => {
    if (!allFonts.length) return
    const idx = Math.floor(Math.random() * Math.min(200, allFonts.length))
    await doPairing(allFonts[idx])
  }, [allFonts, doPairing])

  useEffect(() => {
    if (headingFont && view === 'pairings' && pairings.length === 0) {
      doPairing(headingFont)
    }
  }, [headingFont, view, pairings.length, doPairing])

  const openSpecimen = useCallback((font) => {
    setSpecimenFont(font)
    setSpecimenWeight(font.variants.includes(400) ? 400 : font.variants[0] || 400)
    setView('specimen')
  }, [])

  const openPairing = useCallback((font) => {
    doPairing(font)
    setView('pairings')
  }, [doPairing])

  const fb = (font) => FALLBACK[font?.category] || 'sans-serif'
  const css = (font) => getFontCSSRule(font.family, fb(font))

  const copyImport = useCallback((families) => {
    const url = getFontImportUrl(families)
    onCopy(url)
  }, [onCopy])

  const fontSelect = useCallback((setter) => (
    <select
      onChange={e => {
        const f = allFonts.find(x => x.family === e.target.value)
        if (f) setter(f)
      }}
      style={{ minWidth: 200 }}
    >
      <option value="">Select a font...</option>
      {allFonts.slice(0, 300).map(f => (
        <option key={f.family} value={f.family}>{f.family}</option>
      ))}
    </select>
  ), [allFonts])

  if (loading) {
    return (
      <div className="sec">
        <div style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--t2)' }}>Loading {allFonts.length > 0 ? allFonts.length.toLocaleString() : ''} fonts from Google Fonts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="sec">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 8 }}>
          {t('fontMatcher.title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--t1)', maxWidth: 560, lineHeight: 1.7 }}>
          Browse {allFonts.length.toLocaleString()} Google Fonts, discover pairings, and compare typefaces side by side.
        </p>
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {VIEWS.map(v => (
          <button
            key={v.id}
            className={`pt-t${view === v.id ? ' on' : ''}`}
            onClick={() => setView(v.id)}
            style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600 }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Preview text input (shared across views) */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Custom preview text..."
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          style={{ width: '100%', fontSize: 13 }}
        />
      </div>

      {/* ====== DISCOVER VIEW ====== */}
      {view === 'discover' && (
        <>
          {/* Filters */}
          <div className="card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="seg-label">Search</div>
                <input
                  type="text"
                  placeholder="Search fonts..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>
              <div>
                <div className="seg-label">Category</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {CATS.map(c => (
                    <button
                      key={c.id}
                      className={`pt-t${category === c.id ? ' on' : ''}`}
                      onClick={() => setCategory(c.id)}
                      style={{ padding: '5px 10px', fontSize: 11 }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="seg-label">Sort</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {SORT_OPTS.map(s => (
                    <button
                      key={s.id}
                      className={`pt-t${sortBy === s.id ? ' on' : ''}`}
                      onClick={() => setSortBy(s.id)}
                      style={{ padding: '5px 10px', fontSize: 11 }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12 }}>
            Showing {paged.length} of {filtered.length.toLocaleString()} fonts
          </div>

          {/* Font gallery */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 12 }}>
            {paged.map(font => (
              <div key={font.family} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 12px' }}>
                  <div
                    style={{
                      fontFamily: css(font),
                      fontSize: 28,
                      fontWeight: font.variants.includes(700) ? 700 : font.variants[font.variants.length - 1] || 400,
                      lineHeight: 1.2,
                      marginBottom: 8,
                      minHeight: 68,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {sampleText}
                  </div>
                  <div style={{ fontFamily: css(font), fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: 'var(--t1)', marginBottom: 10, minHeight: 48 }}>
                    {sampleText}
                  </div>
                </div>
                <div style={{ padding: '10px 20px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{font.family}</div>
                    <div style={{ fontSize: 10, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>
                      {font.category} · {font.variants.length} weight{font.variants.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-s" onClick={() => openPairing(font)} title="Find pairings" style={{ fontSize: 10 }}>
                      Pair
                    </button>
                    <button className="btn btn-s" onClick={() => openSpecimen(font)} title="View specimen" style={{ fontSize: 10 }}>
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn" onClick={() => setPage(p => p + 1)}>
                Load more fonts ({filtered.length - paged.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* ====== PAIRINGS VIEW ====== */}
      {view === 'pairings' && (
        <>
          <div className="card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <div className="seg-label">Heading Font</div>
                <select
                  value={headingFont?.family || ''}
                  onChange={e => {
                    const f = allFonts.find(x => x.family === e.target.value)
                    if (f) doPairing(f)
                  }}
                  style={{ minWidth: 220 }}
                >
                  {allFonts.slice(0, 400).map(f => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-s" onClick={shufflePairing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShuffleIcon /> Shuffle
              </button>
            </div>
          </div>

          {headingFont && (
            <>
              {/* Heading preview */}
              <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontFamily: css(headingFont), fontWeight: headingFont.variants.includes(700) ? 700 : headingFont.variants[headingFont.variants.length - 1], fontSize: 'clamp(28px, 4vw, 52px)', lineHeight: 1.15, marginBottom: 10 }}>
                  {sampleText}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
                  {headingFont.family} · {headingFont.category} · {headingFont.variants.length} weights
                </div>
              </div>

              {pairingLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--t2)', fontSize: 13 }}>Finding best pairings...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px,100%), 1fr))', gap: 14, marginBottom: 20 }}>
                  {pairings.map(body => {
                    const hw = headingFont.variants.includes(700) ? 700 : headingFont.variants[headingFont.variants.length - 1]
                    return (
                      <div key={body.family} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 20 }}>
                          <div style={{ fontFamily: css(headingFont), fontWeight: hw }}>
                            <div style={{ fontSize: 28, lineHeight: 1.2, marginBottom: 6 }}>{previewText || 'Heading One'}</div>
                            <div style={{ fontSize: 20, lineHeight: 1.3, marginBottom: 6, fontWeight: Math.min(hw, 600) }}>{previewText || 'Heading Two'}</div>
                            <div style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 10, fontWeight: Math.min(hw, 500) }}>{previewText || 'Heading Three'}</div>
                          </div>
                          <div style={{ fontFamily: css(body), fontSize: 14, color: 'var(--t1)', lineHeight: 1.7 }}>
                            Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump. The five boxing wizards jump quickly.
                          </div>
                        </div>
                        <div style={{ padding: '10px 20px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>
                            {headingFont.family} + {body.family}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-s btn-accent"
                              onClick={() => applyPairing(headingFont, body)}
                              style={{ fontSize: 10 }}
                              title="Use this pair in your current project"
                            >
                              Apply
                            </button>
                            <button
                              className="btn btn-s"
                              onClick={() => copyImport([
                                { family: headingFont.family, weights: headingFont.variants },
                                { family: body.family, weights: body.variants.slice(0, 4) },
                              ])}
                              style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              <CopyIcon size={9} /> Copy
                            </button>
                            <button className="btn btn-s" onClick={() => openSpecimen(body)} style={{ fontSize: 10 }}>
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Article preview */}
              {pairings.length > 0 && (
                <div className="card" style={{ padding: 32, maxWidth: 680, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Article Preview</div>
                  <div style={{ fontFamily: css(headingFont) }}>
                    <div style={{ fontSize: 36, fontWeight: headingFont.variants.includes(700) ? 700 : headingFont.variants[headingFont.variants.length - 1], lineHeight: 1.15, marginBottom: 16 }}>The Art of Visual Design</div>
                    <div style={{ fontSize: 20, fontWeight: headingFont.variants.includes(500) ? 500 : 400, lineHeight: 1.3, marginBottom: 24, color: 'var(--t1)' }}>How typography shapes the way we experience the web</div>
                  </div>
                  <div style={{ fontFamily: css(pairings[0]), fontSize: 16, lineHeight: 1.75, color: 'var(--t1)' }}>
                    <p style={{ marginBottom: 16 }}>Typography is the foundation of effective visual communication. The right pairing of heading and body fonts can transform a layout from amateur to professional, guiding the reader&apos;s eye and establishing a clear hierarchy.</p>
                    <div style={{ fontFamily: css(headingFont), fontSize: 22, fontWeight: headingFont.variants.includes(600) ? 600 : 400, lineHeight: 1.3, marginBottom: 12 }}>Choosing the Right Pairing</div>
                    <p>The best font pairings create contrast while maintaining harmony. A serif heading paired with a clean sans-serif body is a classic approach that works across industries and design styles.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ====== COMPARE VIEW ====== */}
      {view === 'compare' && (
        <>
          <div className="card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
              <div>
                <div className="seg-label">Font A</div>
                <select
                  value={compareA?.family || ''}
                  onChange={e => {
                    const f = allFonts.find(x => x.family === e.target.value)
                    if (f) { setCompareA(f); loadFont(f.family, f.variants) }
                  }}
                  style={{ minWidth: 200 }}
                >
                  {allFonts.slice(0, 400).map(f => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 18, color: 'var(--t2)', fontWeight: 700, alignSelf: 'center' }}>vs</div>
              <div>
                <div className="seg-label">Font B</div>
                <select
                  value={compareB?.family || ''}
                  onChange={e => {
                    const f = allFonts.find(x => x.family === e.target.value)
                    if (f) { setCompareB(f); loadFont(f.family, f.variants) }
                  }}
                  style={{ minWidth: 200 }}
                >
                  {allFonts.slice(0, 400).map(f => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {compareA && compareB && (
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                {[compareA, compareB].map(font => (
                  <div key={font.family}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{font.family}</div>
                        <div style={{ fontSize: 10, color: 'var(--t2)', marginTop: 2 }}>{font.category} · {font.variants.length} weights</div>
                      </div>
                      <button className="btn btn-s" onClick={() => openSpecimen(font)} style={{ fontSize: 10 }}>Full view</button>
                    </div>
                    {[52, 40, 32, 24, 18, 14].map(size => (
                      <div
                        key={size}
                        style={{
                          fontFamily: css(font),
                          fontSize: size,
                          fontWeight: font.variants.includes(700) ? 700 : font.variants[font.variants.length - 1],
                          lineHeight: 1.25,
                          marginBottom: 10,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sampleText}
                      </div>
                    ))}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {font.variants.map(w => (
                        <span key={w} style={{ fontSize: 10, padding: '3px 8px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-s)', fontFamily: 'var(--mono)', color: 'var(--t2)' }}>
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ====== SPECIMEN VIEW ====== */}
      {view === 'specimen' && specimenFont && (
        <>
          <div className="card" style={{ padding: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
              <div>
                <div className="seg-label">Font</div>
                <select
                  value={specimenFont.family}
                  onChange={e => {
                    const f = allFonts.find(x => x.family === e.target.value)
                    if (f) { setSpecimenFont(f); loadFont(f.family, f.variants); setSpecimenWeight(f.variants.includes(400) ? 400 : f.variants[0]) }
                  }}
                  style={{ minWidth: 220 }}
                >
                  {allFonts.slice(0, 400).map(f => (
                    <option key={f.family} value={f.family}>{f.family}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="seg-label">Weight</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {specimenFont.variants.map(w => (
                    <button
                      key={w}
                      className={`pt-t${specimenWeight === w ? ' on' : ''}`}
                      onClick={() => setSpecimenWeight(w)}
                      style={{ padding: '4px 8px', fontSize: 10 }}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button className="btn btn-s" onClick={() => openPairing(specimenFont)} style={{ fontSize: 10 }}>Find Pairings</button>
                <button
                  className="btn btn-s"
                  onClick={() => copyImport([{ family: specimenFont.family, weights: specimenFont.variants }])}
                  style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <CopyIcon size={9} /> Copy import
                </button>
              </div>
            </div>
          </div>

          {/* Font metadata */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Family</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{specimenFont.family}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Category</div>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{specimenFont.category}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Weights</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{specimenFont.variants.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Subsets</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{specimenFont.subsets?.length || 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--t2)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Popularity</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>#{specimenFont.popularity + 1}</div>
              </div>
            </div>
          </div>

          {/* Large specimen */}
          <div className="card" style={{ padding: 32, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 1.1, marginBottom: 16 }}>
              {previewText || 'Aa'}
            </div>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 'clamp(24px, 3vw, 36px)', lineHeight: 1.3, marginBottom: 20 }}>
              {sampleText}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
              {specimenFont.family} · {specimenWeight} · {specimenFont.category}
            </div>
          </div>

          {/* Size scale */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Type Scale</div>
            {[72, 60, 48, 36, 28, 24, 20, 18, 16, 14, 12, 10].map(size => (
              <div key={size} style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', minWidth: 36, textAlign: 'right' }}>{size}px</span>
                <span style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: size, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {sampleText}
                </span>
              </div>
            ))}
          </div>

          {/* Weight showcase */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>All Weights</div>
            {specimenFont.variants.map(w => (
              <div key={w} style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t2)', minWidth: 36, textAlign: 'right' }}>{w}</span>
                <span style={{ fontFamily: css(specimenFont), fontWeight: w, fontSize: 24, lineHeight: 1.3 }}>
                  {sampleText}
                </span>
              </div>
            ))}
          </div>

          {/* Alphabet & glyphs */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Character Set</div>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 28, lineHeight: 1.5, letterSpacing: '.02em', marginBottom: 12 }}>
              ABCDEFGHIJKLMNOPQRSTUVWXYZ
            </div>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 28, lineHeight: 1.5, letterSpacing: '.02em', marginBottom: 12 }}>
              abcdefghijklmnopqrstuvwxyz
            </div>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 28, lineHeight: 1.5, letterSpacing: '.02em' }}>
              0123456789 !@#$%&*()+-=[]
            </div>
          </div>

          {/* Paragraph preview */}
          <div className="card" style={{ padding: 32, maxWidth: 680 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>Paragraph</div>
            <div style={{ fontFamily: css(specimenFont), fontWeight: specimenWeight, fontSize: 16, lineHeight: 1.75, color: 'var(--t1)' }}>
              <p style={{ marginBottom: 16 }}>Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters.</p>
              <p>The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process. Type design is a closely related craft, sometimes considered part of typography; most typographers do not design typefaces, and some type designers do not consider themselves typographers.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

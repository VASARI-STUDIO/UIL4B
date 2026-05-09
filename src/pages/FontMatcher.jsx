import { useState, useEffect, useMemo } from 'react'
import { useI18n } from '../contexts/I18nContext'

const FONT_DB = {
  'Playfair Display': { w: [400, 700, 900], cat: 'serif', pairs: ['Source Sans 3', 'DM Sans', 'Inter', 'Instrument Sans', 'Commissioner', 'Karla'] },
  'Fraunces': { w: [400, 700, 900], cat: 'serif', pairs: ['Commissioner', 'Instrument Sans', 'Inter Tight', 'Source Sans 3', 'DM Sans', 'Nunito Sans'] },
  'Lora': { w: [400, 600, 700], cat: 'serif', pairs: ['Open Sans', 'Roboto', 'Source Sans 3', 'Nunito Sans', 'DM Sans', 'Inter'] },
  'Merriweather': { w: [400, 700, 900], cat: 'serif', pairs: ['Open Sans', 'Roboto', 'Source Sans 3', 'Lato', 'DM Sans', 'Inter'] },
  'Bitter': { w: [400, 600, 700], cat: 'serif', pairs: ['Source Sans 3', 'Raleway', 'DM Sans', 'Open Sans', 'Inter', 'Karla'] },
  'Cormorant Garamond': { w: [400, 600, 700], cat: 'serif', pairs: ['Proza Libre', 'Fira Sans', 'Source Sans 3', 'Nunito Sans', 'DM Sans', 'Inter'] },
  'Spectral': { w: [400, 600, 700], cat: 'serif', pairs: ['Open Sans', 'Karla', 'Source Sans 3', 'DM Sans', 'Inter', 'Nunito Sans'] },
  'DM Serif Display': { w: [400], cat: 'serif', pairs: ['DM Sans', 'Source Sans 3', 'Inter', 'Nunito Sans', 'Open Sans', 'Commissioner'] },
  'Abril Fatface': { w: [400], cat: 'display', pairs: ['Poppins', 'Open Sans', 'Lato', 'Source Sans 3', 'Roboto', 'DM Sans'] },
  'Sora': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['DM Sans', 'Inter Tight', 'Commissioner', 'Source Sans 3', 'Karla', 'Open Sans'] },
  'Bricolage Grotesque': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Inter Tight', 'Source Sans 3', 'Commissioner', 'DM Sans', 'Nunito Sans', 'Open Sans'] },
  'Outfit': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['DM Sans', 'Source Sans 3', 'Commissioner', 'Instrument Sans', 'Karla', 'Inter'] },
  'Manrope': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Inter Tight', 'Source Sans 3', 'DM Sans', 'Commissioner', 'Nunito Sans', 'Open Sans'] },
  'Space Grotesk': { w: [400, 600, 700], cat: 'sans', pairs: ['DM Sans', 'Inter', 'Source Sans 3', 'Open Sans', 'Karla', 'Nunito Sans'] },
  'Plus Jakarta Sans': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Inter', 'DM Sans', 'Source Sans 3', 'Open Sans', 'Nunito Sans', 'Commissioner'] },
  'Poppins': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Open Sans', 'DM Sans', 'Source Sans 3', 'Nunito Sans', 'Inter', 'Karla'] },
  'Montserrat': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Open Sans', 'Source Sans 3', 'Merriweather', 'Lora', 'DM Sans', 'Hind'] },
  'Raleway': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Roboto', 'Open Sans', 'Lato', 'Source Sans 3', 'Nunito Sans', 'DM Sans'] },
  'Work Sans': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Source Sans 3', 'DM Sans', 'Open Sans', 'Inter', 'Bitter', 'Merriweather'] },
  'Inter': { w: [400, 500, 600, 700, 800], cat: 'sans', pairs: ['Source Serif 4', 'DM Sans', 'Merriweather', 'Lora', 'Source Sans 3', 'Open Sans'] },
  'Instrument Sans': { w: [400, 600, 700], cat: 'sans', pairs: ['Source Sans 3', 'Commissioner', 'Inter Tight', 'DM Sans', 'Open Sans', 'Karla'] },
  'Rubik': { w: [400, 500, 600, 700, 800], cat: 'sans', pairs: ['Open Sans', 'Karla', 'DM Sans', 'Source Sans 3', 'Nunito Sans', 'Inter'] },
  'Nunito': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Open Sans', 'Source Sans 3', 'DM Sans', 'Inter', 'Karla', 'Nunito Sans'] },
  'Cabin': { w: [400, 600, 700], cat: 'sans', pairs: ['Open Sans', 'Source Sans 3', 'DM Sans', 'Lora', 'Merriweather', 'Inter'] },
  'Archivo': { w: [400, 600, 700, 800], cat: 'sans', pairs: ['Open Sans', 'DM Sans', 'Source Sans 3', 'Inter', 'Karla', 'Roboto'] },
}

const CAT_LABELS = { all: 'All', serif: 'Serif', sans: 'Sans-Serif', display: 'Display' }

function CopyIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export default function FontMatcher({ onCopy }) {
  const { t } = useI18n()
  const [heading, setHeading] = useState('Playfair Display')
  const [headingWeight, setHeadingWeight] = useState(700)
  const [catFilter, setCatFilter] = useState('all')
  const [viewMode, setViewMode] = useState('pairings')
  const [compareFont, setCompareFont] = useState('Sora')
  const [sampleText, setSampleText] = useState('')
  const [showArticle, setShowArticle] = useState(false)

  const db = FONT_DB[heading]
  const filteredFonts = Object.keys(FONT_DB).filter(f => catFilter === 'all' || FONT_DB[f].cat === catFilter)

  const fontsToLoad = useMemo(() => {
    const fonts = new Set([heading])
    if (viewMode === 'pairings') db.pairs.slice(0, 4).forEach(p => fonts.add(p))
    if (viewMode === 'compare') fonts.add(compareFont)
    return [...fonts]
  }, [heading, db, viewMode, compareFont])

  useEffect(() => {
    const families = fontsToLoad.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800;900`).join('&')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`
    link.id = 'fm-gfonts'
    const prev = document.getElementById('fm-gfonts')
    if (prev) prev.remove()
    document.head.appendChild(link)
    return () => { const el = document.getElementById('fm-gfonts'); if (el) el.remove() }
  }, [fontsToLoad])

  useEffect(() => {
    const w = FONT_DB[heading]?.w
    if (w && !w.includes(headingWeight)) setHeadingWeight(w[w.length - 1])
  }, [heading, headingWeight])

  const headingText = sampleText || 'The quick brown fox jumps over the lazy dog'
  const bodyText = 'Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump. The five boxing wizards jump quickly at dawn.'

  const getImportUrl = (h, b) => {
    const hData = FONT_DB[h]
    const imp = `${h.replace(/ /g, '+')}:wght@${hData?.w?.join(';') || '400;700'}&family=${b.replace(/ /g, '+')}:wght@400;500`
    return `https://fonts.googleapis.com/css2?family=${imp}&display=swap`
  }

  return (
    <div className="sec">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1.1, marginBottom: 8 }}>{t('fontMatcher.title')}</h1>
        <p style={{ fontSize: 14, color: 'var(--t1)', maxWidth: 540, lineHeight: 1.7 }}>
          {t('tools.fontPairs.description')}
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          {/* Category filter */}
          <div>
            <div className="seg-label">Category</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(CAT_LABELS).map(([k, l]) => (
                <button key={k} className={`pt-t${catFilter === k ? ' on' : ''}`} onClick={() => setCatFilter(k)} style={{ padding: '5px 10px', fontSize: 11 }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Heading font */}
          <div>
            <div className="seg-label">Heading Font</div>
            <select value={heading} onChange={e => setHeading(e.target.value)} style={{ minWidth: 200 }}>
              {filteredFonts.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Weight */}
          <div>
            <div className="seg-label">Weight</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {db.w.map(w => (
                <button key={w} className={`pt-t${headingWeight === w ? ' on' : ''}`} onClick={() => setHeadingWeight(w)} style={{ padding: '4px 8px', fontSize: 10 }}>{w}</button>
              ))}
            </div>
          </div>

          {/* View mode */}
          <div>
            <div className="seg-label">View</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className={`pt-t${viewMode === 'pairings' ? ' on' : ''}`} onClick={() => setViewMode('pairings')} style={{ padding: '5px 10px', fontSize: 11 }}>Pairings</button>
              <button className={`pt-t${viewMode === 'compare' ? ' on' : ''}`} onClick={() => setViewMode('compare')} style={{ padding: '5px 10px', fontSize: 11 }}>Compare</button>
            </div>
          </div>
        </div>

        {/* Custom text */}
        <div style={{ marginTop: 12 }}>
          <input type="text" placeholder="Custom preview text..." value={sampleText} onChange={e => setSampleText(e.target.value)}
            style={{ width: '100%', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Heading preview */}
      <div className="card" style={{ padding: 24, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontFamily: `'${heading}', ${db.cat === 'serif' || db.cat === 'display' ? 'serif' : 'sans-serif'}`, fontWeight: headingWeight, fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.15, marginBottom: 8 }}>
          {headingText}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t2)' }}>
          {heading} · {headingWeight} · {db.cat}
        </div>
      </div>

      {viewMode === 'pairings' ? (
        <>
          {/* Pairing cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px,100%), 1fr))', gap: 14, marginBottom: 20 }}>
            {db.pairs.map(body => {
              const url = getImportUrl(heading, body)
              return (
                <div key={body} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => onCopy(url)}>
                  <div style={{ padding: 20 }}>
                    {/* Mini style guide */}
                    <div style={{ fontFamily: `'${heading}', ${db.cat === 'serif' || db.cat === 'display' ? 'serif' : 'sans-serif'}`, fontWeight: headingWeight }}>
                      <div style={{ fontSize: 28, lineHeight: 1.2, marginBottom: 4 }}>{sampleText || 'Heading One'}</div>
                      <div style={{ fontSize: 20, lineHeight: 1.3, marginBottom: 4, fontWeight: Math.min(headingWeight, 600) }}>{sampleText || 'Heading Two'}</div>
                      <div style={{ fontSize: 16, lineHeight: 1.4, marginBottom: 8, fontWeight: Math.min(headingWeight, 500) }}>{sampleText || 'Heading Three'}</div>
                    </div>
                    <div style={{ fontFamily: `'${body}', sans-serif`, fontSize: 14, color: 'var(--t1)', lineHeight: 1.65, marginBottom: 8 }}>
                      {bodyText}
                    </div>
                  </div>
                  <div style={{ padding: '10px 20px', background: 'var(--bg-1)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t2)' }}>
                      {heading} + {body}
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CopyIcon size={9} /> Click to copy import
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Article preview toggle */}
          <div style={{ marginBottom: 20 }}>
            <button className="btn btn-s" onClick={() => setShowArticle(!showArticle)} style={{ fontSize: 11 }}>
              {showArticle ? 'Hide' : 'Show'} Article Preview
            </button>
          </div>

          {showArticle && (
            <div className="card" style={{ padding: 32, maxWidth: 640, marginBottom: 20 }}>
              <div style={{ fontFamily: `'${heading}', ${db.cat === 'serif' || db.cat === 'display' ? 'serif' : 'sans-serif'}` }}>
                <div style={{ fontSize: 36, fontWeight: headingWeight, lineHeight: 1.15, marginBottom: 16 }}>The Art of Visual Design</div>
                <div style={{ fontSize: 20, fontWeight: Math.min(headingWeight, 500), lineHeight: 1.3, marginBottom: 24, color: 'var(--t1)' }}>How typography shapes the way we experience the web</div>
              </div>
              <div style={{ fontFamily: `'${db.pairs[0]}', sans-serif`, fontSize: 16, lineHeight: 1.75, color: 'var(--t1)' }}>
                <p style={{ marginBottom: 16 }}>Typography is the foundation of effective visual communication. The right pairing of heading and body fonts can transform a layout from amateur to professional, guiding the reader&apos;s eye and establishing a clear hierarchy.</p>
                <div style={{ fontFamily: `'${heading}', ${db.cat === 'serif' || db.cat === 'display' ? 'serif' : 'sans-serif'}`, fontSize: 22, fontWeight: Math.min(headingWeight, 600), lineHeight: 1.3, marginBottom: 12 }}>Choosing the Right Pairing</div>
                <p style={{ marginBottom: 16 }}>The best font pairings create contrast while maintaining harmony. A serif heading paired with a clean sans-serif body is a classic approach that works across industries and design styles.</p>
                <p>Consider the mood, readability, and brand personality when selecting your typefaces. The fonts you choose communicate as much as the words they display.</p>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Compare view */
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)' }}>Compare with:</span>
            <select value={compareFont} onChange={e => setCompareFont(e.target.value)} style={{ minWidth: 200 }}>
              {filteredFonts.filter(f => f !== heading).map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[heading, compareFont].map(font => {
              const fd = FONT_DB[font]
              const cat = fd?.cat === 'serif' || fd?.cat === 'display' ? 'serif' : 'sans-serif'
              return (
                <div key={font}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>{font}</div>
                  {[48, 36, 28, 20, 16].map(size => (
                    <div key={size} style={{ fontFamily: `'${font}', ${cat}`, fontSize: size, fontWeight: headingWeight, lineHeight: 1.2, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {headingText}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

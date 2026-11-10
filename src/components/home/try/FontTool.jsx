import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PhIcon from '../../spectrum/PhIcon'
import { route } from '../../spectrum/spectrumFacts'
import { Radios, ToolLink, Well } from './tryParts'
import { useNear } from './useNear'

// FONT GALLERY. Thirteen families in one list, Kerbside's two first, set in the
// visitor's own words. All of the faces come in one stylesheet request once the
// frame is near the window; until a family's face is in, its row shows a skeleton
// block, never fallback text. "Open in Font Gallery" carries the first picked
// family as ?font=, which the full tool reads.

// Category labels are the full tool's own ("handwriting" is shown there as "Script").
// `n` is the weight count the full tool prints for the family; `w` lists only the
// weights the stylesheet below loads, so every name in a row's ladder is a real face.
const CATS = ['All', 'Sans serif', 'Serif', 'Display', 'Script']
const FAMILIES = [
  { f: 'Archivo', c: 1, n: 9, w: [800] },
  { f: 'IBM Plex Sans', c: 1, n: 7, w: [400, 500, 600] },
  { f: 'Bricolage Grotesque', c: 1, n: 7, w: [200, 400, 500, 700, 800] },
  { f: 'DM Sans', c: 1, n: 10, w: [400, 500, 600, 700] },
  { f: 'Fraunces', c: 2, n: 9, w: [400, 500, 600, 700] },
  { f: 'Young Serif', c: 2, n: 1, w: [400] },
  { f: 'Gloock', c: 2, n: 1, w: [400] },
  { f: 'Big Shoulders', c: 3, n: 9, w: [400, 500, 600, 700, 800] },
  { f: 'Abril Fatface', c: 3, n: 1, w: [400] },
  { f: 'Bungee', c: 3, n: 1, w: [400] },
  { f: 'Caveat', c: 4, n: 4, w: [400, 500, 600, 700] },
  { f: 'Dancing Script', c: 4, n: 4, w: [400, 500, 600, 700] },
  { f: 'Kalam', c: 4, n: 3, w: [400, 700] },
]
const WEIGHT_NAMES = { 200: 'ExtraLight', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' }
const STYLESHEET = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&family=IBM+Plex+Sans:wght@400;500;600&family=Bricolage+Grotesque:wght@200;400;500;700;800&family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@400;500;600;700&family=Young+Serif&family=Gloock&family=Big+Shoulders:wght@400;500;600;700;800&family=Abril+Fatface&family=Bungee&family=Caveat:wght@400;500;600;700&family=Dancing+Script:wght@400;500;600;700&family=Kalam:wght@400;700&display=swap'

const SAMPLE = 'Bikes, not vans.'
const MAX_COMPARE = 3
const SIZE_MIN = 22
const SIZE_MAX = 72
const SIZE_STEP = 2
// Until the visitor changes it, a phone's sample is smaller than a desktop's.
const SIZE_START = 40
const SIZE_START_PHONE = 24
const PHONE_MODES = ['Words', 'Size', 'Side by side']
// The list's height inside the frame; the rows share it evenly, as many as fit whole.
const LIST_H = 327
const LOAD_GIVE_UP = 10000

const CHEVRON = 'M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32'
const CARET = '<path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32"/>'

// Archivo is shown at 800 and its widest cut, whatever other pages have loaded of it.
const face = (f) => (f === 'Archivo'
  ? { fontFamily: "'Archivo', system-ui, sans-serif", fontWeight: 800, fontStretch: '125%' }
  : { fontFamily: `'${f}', system-ui, sans-serif` })
const probe = (f) => `${f === 'Archivo' ? 800 : 400} 40px "${f}"`

// One stylesheet request for the page's life; resolves true once the rules are in.
let sheet = null
function loadSheet() {
  if (!sheet) {
    sheet = new Promise((resolve) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = STYLESHEET
      link.onload = () => resolve(true)
      link.onerror = () => resolve(false)
      document.head.appendChild(link)
    })
  }
  return sheet
}

/** 'ok' once the family's face is in, 'fail' if it never arrives. */
function faceReady(f, sheetLoaded) {
  if (!sheetLoaded || !document.fonts) return Promise.resolve(sheetLoaded ? 'ok' : 'fail')
  const gaveUp = new Promise((resolve) => setTimeout(() => resolve([]), LOAD_GIVE_UP))
  return Promise.race([document.fonts.load(probe(f)), gaveUp])
    .then((faces) => (faces.length ? 'ok' : 'fail'))
    .catch(() => 'fail')
}

// A family that fails loses its "+". If that button has focus, focus moves to
// the next row's "+" (the previous row's, for the last) before the button goes.
function keepFocus(f) {
  const a = document.activeElement
  if (!a || !a.matches || !a.matches('.ht-fn-list .ht-fn-pick')) return
  const label = a.getAttribute('aria-label')
  if (label !== `Pick ${f}` && label !== `Remove ${f}`) return
  const li = a.closest('li')
  for (const sib of [li.nextElementSibling, li.previousElementSibling]) {
    const next = sib && sib.querySelector('.ht-fn-pick')
    if (next) { next.focus(); return }
  }
}

export default function FontTool() {
  const root = useRef(null)
  const dead = useRef(false)
  const [text, setText] = useState(SAMPLE)
  const [cat, setCat] = useState(0)
  const [open, setOpen] = useState('')
  // family -> 'ok' | 'fail'; absent while its face is on the way.
  const [ready, setReady] = useState({})
  // null until the visitor sets a size, so each width keeps its own starting size.
  const [size, setSize] = useState(null)
  const [mode, setMode] = useState(0)
  const [picks, setPicks] = useState(['Archivo', 'IBM Plex Sans'])
  const [compare, setCompare] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    dead.current = false
    return () => { dead.current = true }
  }, [])

  const startLoading = useCallback(() => {
    loadSheet().then((sheetLoaded) => {
      FAMILIES.forEach(({ f }) => {
        faceReady(f, sheetLoaded).then((state) => {
          if (dead.current) return
          if (state === 'fail') keepFocus(f)
          setReady((r) => (r[f] === state ? r : { ...r, [f]: state }))
        })
      })
    })
  }, [])
  useNear(root, startLoading)

  const pickCat = (i) => { setCat(i); setCompare(false); setMsg('') }
  const step = (by) => setSize((s) => Math.min(SIZE_MAX, Math.max(SIZE_MIN, (s ?? SIZE_START) + by)))
  // A fourth pick is refused, in words (the tray is a live region).
  const togglePick = (f) => {
    const on = picks.includes(f)
    if (!on && picks.length >= MAX_COMPARE) { setMsg('Three at a time. Remove one first.'); setMode(2); return }
    setPicks(on ? picks.filter((x) => x !== f) : [...picks, f])
    setMsg('')
  }
  const toggleCompare = () => {
    if (compare) setCompare(false)
    else if (picks.length >= 2) { setCompare(true); setMsg('') }
  }

  const typed = text.trim()
  const rows = FAMILIES.filter((x) => cat === 0 || x.c === cat)
  const shown = size ?? SIZE_START
  const fit = Math.max(1, Math.floor(LIST_H / (shown * 1.1 + 51)))
  const pitch = (LIST_H / fit).toFixed(2)
  const tray = msg || (picks.length >= 2 ? `${picks.slice(0, -1).join(', ')} and ${picks[picks.length - 1]}` : '')
  const first = picks[0]
  const to = first ? `${route('font-gallery')}?font=${encodeURIComponent(first)}` : route('font-gallery')

  return (
    <>
      <div className="ht-tool ht-fn" ref={root} style={{ '--fs': `${shown}px`, '--fp': `${size ?? SIZE_START_PHONE}px`, '--pitch': `${pitch}px` }}>
      <div className="ht-tb">
        <input
          className="ht-input"
          type="text"
          aria-label="Your words"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={72}
          spellCheck="false"
          autoComplete="off"
          placeholder="Type your own words"
        />
        <div className="ht-step" role="group" aria-label="Size">
          <button type="button" aria-label="Smaller" disabled={shown <= SIZE_MIN} onClick={() => step(-SIZE_STEP)}>−</button>
          <span className="ht-val" role="status" aria-label={`Size ${shown} pixels`}>{shown}px</span>
          <button type="button" aria-label="Larger" disabled={shown >= SIZE_MAX} onClick={() => step(SIZE_STEP)}>+</button>
        </div>
      </div>

      <div className="ht-fn-cat">
        <Radios label="Category" items={CATS} value={cat} onPick={pickCat} />
      </div>
      {/* Phone: the five category chips become one choice. */}
      <span className="ht-selw ht-selw--cat">
        <label htmlFor="ht-fn-cat-p">Category</label>
        <select id="ht-fn-cat-p" className="ht-sel" value={cat} onChange={(e) => pickCat(Number(e.target.value))}>
          {CATS.map((c, i) => <option key={c} value={i}>{c}</option>)}
        </select>
        <svg className="ht-chev" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={CHEVRON} /></svg>
      </span>

      {!compare && (
        <ul className="ht-fn-list" aria-label="Font families">
          {rows.map(({ f, c, n, w }) => {
            const state = ready[f]
            const picked = picks.includes(f)
            const style = state === 'fail' ? { fontFamily: 'var(--hm-font)' } : face(f)
            return (
              <li key={f}>
                <button
                  type="button"
                  className="ht-fn-row"
                  aria-expanded={open === f}
                  data-load={!state}
                  onClick={() => setOpen(open === f ? '' : f)}
                >
                  <span className="ht-fn-top">
                    <span className="ht-sr">{`${f}. `}</span>
                    <span className="ht-fn-spec" style={style}>{typed || f}</span>
                    <span className="ht-fn-skel" aria-hidden="true" />
                    <span className="ht-fn-meta">
                      {state === 'fail' ? `${f} didn’t load.` : `${CATS[c]} · ${n} ${n === 1 ? 'weight' : 'weights'}`}
                      <PhIcon body={CARET} className="ht-fn-caret" />
                    </span>
                  </span>
                  <span className="ht-fn-ladder" style={style}>
                    {w.map((weight) => <span key={weight} style={{ fontWeight: weight }}>{WEIGHT_NAMES[weight]}</span>)}
                  </span>
                </button>
                {state !== 'fail' && (
                  <button
                    type="button"
                    className="ht-fn-pick"
                    aria-pressed={picked}
                    aria-label={`${picked ? 'Remove' : 'Pick'} ${f}`}
                    onClick={() => togglePick(f)}
                  >
                    <PhIcon name={picked ? 'check' : 'plus'} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {compare && (
        <div className="ht-fn-cmp" style={{ '--n': Math.max(2, picks.length) }}>
          {picks.map((f) => (
            <div key={f} className="ht-fn-col">
              <b>{f}</b>
              <p style={face(f)}>{typed || f}</p>
            </div>
          ))}
        </div>
      )}

      <div className="ht-fn-tray">
        <p className="ht-fn-trn" role="status" data-empty={!tray}>{tray}</p>
        {picks.length >= 2 && <button type="button" className="ht-btn ht-chip" aria-pressed={compare} onClick={toggleCompare}>Side by side</button>}
        <Link className="ht-btn ht-fn-fp" to={route('font-pair')}>Build a font pair</Link>
      </div>

      {/* Phone: the words, the size and the comparison become one control under a three-way choice. */}
      <Well label="What the Font Gallery can do" items={PHONE_MODES} value={mode} onPick={setMode}>
        {mode === 0 && (
          <input
            className="ht-pin ht-grow"
            type="text"
            aria-label="Your words"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={72}
            spellCheck="false"
            autoComplete="off"
            placeholder="Type your own words"
          />
        )}
        {mode === 1 && (
          <>
            <span className="ht-end" aria-hidden="true">Aa</span>
            <input
              className="ht-rng"
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={1}
              value={size ?? SIZE_START_PHONE}
              aria-label="Sample size"
              aria-valuetext={`${size ?? SIZE_START_PHONE} pixels`}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span className="ht-end ht-end--big" aria-hidden="true">Aa</span>
          </>
        )}
        {mode === 2 && (
          <>
            <p className="ht-fn-trn">{tray || 'Pick two or three families with the plus.'}</p>
            <button type="button" className="ht-btn ht-chip" aria-pressed={compare} disabled={picks.length < 2} onClick={toggleCompare}>Side by side</button>
          </>
        )}
      </Well>
      </div>

      <ToolLink
        to={to}
        fill={picks.length > 0}
        line={first ? `Opens on ${first}.` : 'Pick a family and the link opens on it.'}
        short={first ? 'Opens on your pick.' : 'Pick a family and the link opens on it.'}
      >
        Open in Font Gallery
      </ToolLink>
    </>
  )
}

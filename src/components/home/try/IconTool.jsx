import { useCallback, useEffect, useRef, useState } from 'react'
import PhIcon from '../../spectrum/PhIcon'
import { route } from '../../spectrum/spectrumFacts'
import { ratio } from '../../spectrum/spectrumKit'
import { iconifyFetch, ICONIFY_HOST, HELD_HEADER } from '../../../utils/iconifyFetch'
import { ICON_START, KERBSIDE_BODIES } from './kerbsideIcons'
import { safeBody } from './iconBody'
import { Radios, ToolLink, Well } from './tryParts'
import { useNear } from './useNear'

// ICON LIBRARY. Kerbside's sixteen icons lead a list of Phosphor's first names;
// the sixteen are drawn from data held here, so the resting frame needs no network.
// Every other name and every other weight is read from Iconify once the frame
// is near the window, and each drawing is checked (iconBody.js) before it is
// drawn inline.

const WEIGHTS = [['Regular', ''], ['Bold', '-bold'], ['Fill', '-fill'], ['Duo', '-duotone']]
const DUO = 3
// Default (the icon's own two tones) is offered only at Duo.
const COLOURS = [['Default', ''], ['Signal', '#FF5A1F'], ['White', '#FFFFFF']]
const SIGNAL = COLOURS[1][1]
const PHONE_MODES = ['Search', 'Weight', 'Colour']
const PACK = 'Phosphor'
const WEIGHT_SUFFIX = /-(bold|fill|duotone|light|thin)$/
const NAME = /^[a-z0-9-]{1,48}$/
const HEX = /^#[0-9A-F]{6}$/
// The grid shows nine rows at most. The list is the whole starting set, so the
// count read out comes from the data, not a typed number.
const CAP = ICON_START.length
const CHUNK = 60
const SEARCH_DELAY = 250
const SLOW_AFTER = 400

// id (name plus weight suffix) -> checked drawing. Kept for the session.
const BODIES = new Map(Object.entries(KERBSIDE_BODIES))
const ASKED = new Set()

const MAGNIFIER = 'm229.66 218.34l-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72'

const isOk = (r) => r && r.ok && !r.headers.get(HELD_HEADER)

/** The drawing for a name at a weight, or the Regular one while that weight is on its way. */
const drawing = (base, weight) => BODIES.get(base + WEIGHTS[weight][1]) || BODIES.get(base) || ''

export default function IconTool() {
  const root = useRef(null)
  const dead = useRef(false)
  const token = useRef(0)
  const delay = useRef(0)
  const slowTimer = useRef(0)
  const [near, setNear] = useState(false)
  const [, repaint] = useState(0)
  const [mode, setMode] = useState(0)
  const [weight, setWeight] = useState(0)
  const [sel, setSel] = useState(ICON_START[0])
  const [q, setQ] = useState('')
  const [ran, setRan] = useState('')
  const [results, setResults] = useState(ICON_START.slice(0, CAP))
  const [slow, setSlow] = useState(false)
  const [failed, setFailed] = useState(false)
  const [col, setCol] = useState(SIGNAL)
  // The kinds of move made so far (search, pick, colour): they decide what the status line says next.
  const [kinds, setKinds] = useState([])

  useEffect(() => {
    dead.current = false
    return () => { dead.current = true; clearTimeout(delay.current); clearTimeout(slowTimer.current) }
  }, [])
  const startFetching = useCallback(() => setNear(true), [])
  useNear(root, startFetching)

  const mark = (kind) => setKinds((k) => (k.includes(kind) ? k : [...k, kind]))

  // Read the drawings not held yet, 60 names to a request.
  const ensure = useCallback((ids) => {
    const need = [...new Set(ids)].filter((id) => NAME.test(id) && !BODIES.has(id) && !ASKED.has(id))
    for (let i = 0; i < need.length; i += CHUNK) {
      const chunk = need.slice(i, i + CHUNK)
      chunk.forEach((id) => ASKED.add(id))
      iconifyFetch(`${ICONIFY_HOST}/ph.json?icons=${chunk.join(',')}`, { timeout: 8000 })
        .then((r) => (isOk(r) ? r.json() : Promise.reject(new Error('refused'))))
        .then((j) => {
          chunk.forEach((id) => {
            const body = safeBody(j?.icons?.[id]?.body)
            if (body) BODIES.set(id, body)
          })
          if (!dead.current) repaint((n) => n + 1)
        })
        // A later attempt may ask again.
        .catch(() => { chunk.forEach((id) => ASKED.delete(id)) })
    }
  }, [])

  // The selected icon and the grid, at the chosen weight, once the frame is near.
  useEffect(() => {
    if (!near) return
    const suffix = WEIGHTS[weight][1]
    ensure([sel + suffix, ...results.map((n) => n + suffix)])
  }, [near, weight, sel, results, ensure])

  const run = (raw) => {
    const text = raw.trim()
    const mine = ++token.current
    clearTimeout(slowTimer.current)
    if (!text) {
      setRan(''); setResults(ICON_START.slice(0, CAP)); setSlow(false); setFailed(false)
      return
    }
    if (text.length < 2) return
    setFailed(false)
    mark('search')
    slowTimer.current = setTimeout(() => { if (mine === token.current) setSlow(true) }, SLOW_AFTER)
    iconifyFetch(`${ICONIFY_HOST}/search?query=${encodeURIComponent(text)}&prefixes=ph&limit=200`, { timeout: 8000 })
      .then((r) => (isOk(r) ? r.json() : Promise.reject(new Error('refused'))))
      .then((j) => {
        if (mine !== token.current || dead.current) return
        const bases = []
        ;(Array.isArray(j?.icons) ? j.icons : []).forEach((n) => {
          const b = String(n).replace(/^ph:/, '').replace(WEIGHT_SUFFIX, '')
          if (NAME.test(b) && !bases.includes(b)) bases.push(b)
        })
        clearTimeout(slowTimer.current)
        setRan(text); setResults(bases.slice(0, CAP)); setSlow(false); setFailed(false)
      })
      .catch(() => {
        if (mine !== token.current || dead.current) return
        clearTimeout(slowTimer.current)
        setSlow(false); setFailed(true)
      })
  }

  const onQ = (e) => {
    const v = e.target.value
    setQ(v)
    clearTimeout(delay.current)
    delay.current = setTimeout(() => run(v), SEARCH_DELAY)
  }
  const clearSearch = () => { clearTimeout(delay.current); setQ(''); run('') }

  const pickWeight = (w) => {
    if (w === weight) return
    // Leaving Duo while Default is picked: Default is no longer offered, so the icon goes to Signal.
    if (w !== DUO && col === '') setCol(SIGNAL)
    setWeight(w)
  }
  const pick = (base) => { setSel(base); mark('pick') }
  const paint = (hex) => {
    const v = hex ? String(hex).toUpperCase() : ''
    if ((v && !HEX.test(v)) || v === col) return
    setCol(v)
    mark('colour')
  }

  const duo = weight === DUO
  const opts = COLOURS.filter((_, i) => i > 0 || duo)
  const colIndex = opts.findIndex(([, v]) => v === col)
  // A colour too dark for the stage puts the icon on the light ground.
  const dark = !!col && ratio('#000000', col) < ratio('#FFFFFF', col)
  const total = results.length
  const noun = total === 1 ? 'icon' : 'icons'
  const count = ran
    ? (total ? `${total} ${PACK} ${noun} for “${ran}”.` : `No ${PACK} icons for “${ran}”.`)
    : `${total} ${PACK} icons. Type to search.`

  let line = 'Search for an icon, or colour this one.'
  let short = line
  if (slow) line = short = 'Searching…'
  else if (failed) line = short = ''
  else if (kinds.includes('pick') || kinds.includes('colour')) {
    line = `Search “${sel}” there to copy it as SVG.`
    short = 'Search for this icon to copy it as SVG.'
  } else if (kinds.includes('search') && total) line = short = 'Pick one to colour it.'

  // The controls are drawn twice, once in the toolbar and preview pane and once in the
  // phone well; CSS shows one set. The phone search field has its own class so the
  // toolbar's stays the only `.ht-input` in the frame.
  const searchField = (cls, wrap) => (
    <div className={wrap}>
      <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d={MAGNIFIER} /></svg>
      <input
        className={`${cls} ht-input--icon`}
        type="text"
        aria-label="Search icons"
        value={q}
        onChange={onQ}
        placeholder="bike, map pin, clock"
        spellCheck="false"
        autoComplete="off"
        maxLength={40}
      />
    </div>
  )
  const weightSeg = (className) => (
    <Radios label="Weight" className={className} items={WEIGHTS.map(([label]) => label)} value={weight} onPick={pickWeight} />
  )
  const colourSeg = (className) => (
    <Radios className={className} label="Colour" items={opts.map(([label]) => label)} value={colIndex} onPick={(i) => paint(opts[i][1])} />
  )
  const swatch = (
    <>
      <span className="ht-swatch">
        <input type="color" aria-label="Any colour" value={col || '#FFFFFF'} onChange={(e) => paint(e.target.value)} />
      </span>
      <span className="ht-val">{col || '#FFFFFF'}</span>
    </>
  )

  return (
    <>
      <div className="ht-tool ht-icn" ref={root}>
      <div className="ht-tb">
        {searchField('ht-input', 'ht-field')}
        {weightSeg('')}
      </div>

      <div className="ht-ic">
        <div className="ht-ic-res">
          {!failed && total > 0 && (
            <div className="ht-ic-grid" role="group" aria-label={`${PACK} icons`}>
              {results.map((base) => {
                const on = base === sel
                return (
                  <button
                    key={base}
                    type="button"
                    className="ht-ic-t"
                    aria-pressed={on}
                    aria-label={base}
                    style={on ? { color: col || undefined, background: dark ? '#EFEEEA' : undefined } : undefined}
                    onClick={() => pick(base)}
                  >
                    <PhIcon body={drawing(base, weight)} className="ht-ic-g" />
                  </button>
                )
              })}
            </div>
          )}
          {!failed && total === 0 && !slow && (
            <>
              <p className="ht-msg">{`No icons for “${ran || q.trim()}”. Try a shorter word.`}</p>
              <button type="button" className="ht-btn" onClick={clearSearch}>Clear search</button>
            </>
          )}
          {failed && (
            <>
              <p className="ht-msg">Icons didn’t load. Check your connection, then try again.</p>
              <button type="button" className="ht-btn" onClick={() => run(q)}>Try again</button>
            </>
          )}
        </div>

        <div className="ht-ic-pv">
          <div
            className="ht-ic-stage"
            role="img"
            aria-label={`${sel}, ${WEIGHTS[weight][0]}, ${col || 'two tones'}`}
            style={{ background: dark ? '#EFEEEA' : '#16171A', color: col || undefined }}
          >
            <PhIcon body={drawing(sel, weight)} className="ht-ic-big" />
          </div>
          <p className="ht-ic-name">{sel}</p>
          <p className="ht-ic-meta">{`${PACK} · ${WEIGHTS[weight][0]}`}</p>
          {colourSeg('ht-ic-cols')}
          <div className="ht-ic-sw">{swatch}</div>
        </div>
      </div>

      {/* Phone: the search field, the weights and the colours become one control under a three-way choice. */}
      <Well label="What the Icon Library can do" items={PHONE_MODES} value={mode} onPick={setMode}>
        {mode === 0 && searchField('ht-pin', 'ht-field ht-grow')}
        {mode === 1 && weightSeg('ht-grow')}
        {mode === 2 && <>{colourSeg('ht-grow')}{swatch}</>}
      </Well>

        <span className="ht-sr" role="status">{failed ? '' : slow ? 'Searching…' : count}</span>
      </div>
      <ToolLink to={route('icons')} line={line} short={short}>Open in Icon Library</ToolLink>
    </>
  )
}

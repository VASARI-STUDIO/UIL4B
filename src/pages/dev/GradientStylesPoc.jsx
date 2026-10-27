// /dev/gradient-poc: the S0 proof-of-concept board for the gradient style
// families. DEV ONLY. App.jsx registers the route behind `import.meta.env.DEV`,
// so the page, its stylesheet and the engine chunk are not in a production
// build. It is never linked.
//
// Each row sets a reference crop beside our recreation, drawn by the same
// engine that will ship (src/utils/gradientStyles.js), with the family, its
// parameters, the colours, the generated name, the CSS size and what the
// family's colour rules say about those colours. Dylan marks each row Go or
// Not yet; a family goes into the build if one of its rows is Go.
//
// THE REFERENCES NEVER ENTER THE REPO. The repo is public and the images are a
// third-party gallery and a stock photo. They are picked here through two file
// inputs and kept in this browser's IndexedDB. Only the crop rectangles, in
// pixels of the original files, are in code.
//
// The rule guard SHOWS what is outside a family's colour rules; it does not
// fit the colours. A row that fails the guard is evidence for or against the
// family, not something to hide.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../../styles/pages/gradient-poc.css'
import {
  CLOSENESS_LABEL,
  STYLES,
  STYLE_LABEL,
  checkColourRules,
  hexToOk,
  liveTree,
  paramRows,
  recipe,
  toCss,
} from '../../utils/gradientStyles'
import { generateName } from '../../utils/gradientNames'
import { rollDesign } from '../../utils/gradientHarmony'

/* ── the references: crop rectangles in pixels of Dylan's original files ─── */

const SHEET_COLS = [100, 256, 412, 569]
const SHEET_ROWS = [76, 256]
const card = (c, r) => ({ file: 'sheet', x: SHEET_COLS[c], y: SHEET_ROWS[r], w: 143, h: 166 })

const AXIS_UP = [[0.5, 0.15], [0.5, 0.85]]

const ROWS = [
  {
    id: 'sunrise-drift', ref: 'Sunrise Drift', refNote: 'Blue into orange, high key', crop: card(0, 0),
    style: 'horizon', stops: ['#d6e7f1', '#e4484a'], params: { light: 180, height: 40, spread: 60, haze: 35 }, sample: AXIS_UP,
  },
  {
    id: 'golden-hour', ref: 'Golden Hour', refNote: 'Amber melting into burnt sienna', crop: card(1, 0),
    style: 'horizon', stops: ['#fbecd8', '#ce3c08'], params: { light: 180, height: 55, spread: 55, haze: 45 }, sample: AXIS_UP,
  },
  {
    id: 'midnight-sapphire', ref: 'Midnight Sapphire', refNote: 'Deep cobalt bleeding into violet ink', crop: card(2, 0),
    style: 'horizon', stops: ['#232446', '#dbdef1'], params: { light: 0, height: 35, spread: 70, haze: 30 }, sample: [[0.5, 0.85], [0.5, 0.15]],
  },
  {
    id: 'dusty-rose', ref: 'Dusty Rose', refNote: 'Muted rose with soft vintage film grain', crop: card(3, 0),
    style: 'mesh', stops: ['#fed4d9', '#f1587c'], params: { points: 4, softness: 70, drift: 40, layout: 12 }, finishes: { grain: 4.5 }, sample: AXIS_UP,
  },
  {
    id: 'aurora-nova', ref: 'Aurora Nova', refNote: 'No colours measured yet', crop: card(0, 1),
    style: 'horizon', stops: ['#08131f', '#2fd0a2'], params: { light: 180, height: 45, spread: 65, haze: 40 }, sample: AXIS_UP, unmeasured: true,
  },
  {
    id: 'aurora-borealis', ref: 'Aurora Borealis', refNote: 'Layered emerald and cyan aurora curtains', crop: card(1, 1),
    style: 'curtains', stops: ['#0a0b0a', '#9dbabe'], params: { bands: 3, tilt: -12, length: 65, sky: 30 }, finishes: { grain: 4.5 }, sample: AXIS_UP,
  },
  {
    id: 'aurora-beams', ref: 'Aurora Beams', refNote: 'Diagonal repeating light beams, heavily blurred', crop: card(2, 1),
    style: 'beams', stops: ['#111111', '#45474a'], params: { angle: 115, width: 9, softness: 70, base: 50 }, sample: AXIS_UP,
  },
  {
    id: 'midnight-horizon', ref: 'Midnight Horizon', refNote: 'Deep space blue to a bright sunrise band', crop: card(3, 1),
    style: 'horizon', stops: ['#071577', '#12061d'], params: { light: 180, height: 30, spread: 45, haze: 30 }, sample: [[0.5, 0.15], [0.5, 0.93]],
  },
  {
    id: 'orange-arches', ref: 'Orange arches poster', refNote: 'Stepped arches on a dark ground', crop: { file: 'poster', x: 315, y: 37, w: 133, h: 185 },
    style: 'steps', stops: ['#e98724', '#201810'], params: { shape: 'arches', steps: 10, offset: 40, ground: 'dark' }, sample: [[0.5, 0.12], [0.5, 0.78]], poster: true,
  },
]

const FILES = [
  { key: 'sheet', label: 'Gallery sheet (2.png)', hint: 'The 203 backgrounds gallery' },
  { key: 'poster', label: 'Poster (3.png)', hint: 'The orange arches poster' },
]

/* ── IndexedDB: the two reference files stay in this browser ─────────────── */

const DB_NAME = 'uil4b-gradpoc'
const STORE = 'refs'

const openDb = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE)
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})

async function idb(mode, run) {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const req = run(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

const idbGet = (key) => idb('readonly', (s) => s.get(key))
const idbPut = (key, blob) => idb('readwrite', (s) => s.put(blob, key))
const idbDelete = (key) => idb('readwrite', (s) => s.delete(key))

/* ── picks, in localStorage ──────────────────────────────────────────────── */

const PICKS_KEY = 'uil4b.gradpoc.picks'

function readPicks() {
  try {
    const raw = JSON.parse(localStorage.getItem(PICKS_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

/* ── sampling the reference ──────────────────────────────────────────────── */

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`

// Median of a 9 x 9 patch around each sample point, in the crop's own pixels.
function sampleHexes(bitmap, crop, points) {
  if (!bitmap || crop.x + crop.w > bitmap.width || crop.y + crop.h > bitmap.height) return null
  const c = document.createElement('canvas')
  c.width = crop.w
  c.height = crop.h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  return points.map(([fx, fy]) => {
    const x = Math.min(crop.w - 9, Math.max(0, Math.round(fx * crop.w) - 4))
    const y = Math.min(crop.h - 9, Math.max(0, Math.round(fy * crop.h) - 4))
    const d = ctx.getImageData(x, y, 9, 9).data
    const ch = [0, 1, 2].map((k) => median(Array.from({ length: 81 }, (_, i) => d[i * 4 + k])))
    return toHex(ch)
  })
}

/* ── small pieces ────────────────────────────────────────────────────────── */

function Tree({ nodes }) {
  return nodes.map((n, i) => (n.svg
    // The SVG string is made by our own engine from our own numbers.
    ? <div key={i} style={n.style} dangerouslySetInnerHTML={{ __html: n.svg }} />
    : <div key={i} style={n.style}>{n.children ? <Tree nodes={n.children} /> : null}</div>))
}

function Swatch({ hex }) {
  return <span className="gpoc-swatch" style={{ background: hex }} aria-hidden="true" />
}

// Ink for type over a colour, by lightness. Sample content only.
const inkOver = (hex) => (hexToOk(hex).L < 0.55 ? 'oklch(0.95 0.01 85)' : 'oklch(0.2 0.01 85)')

function RefCrop({ bitmap, crop, label, needs }) {
  const ref = useRef(null)
  const outside = bitmap && (crop.x + crop.w > bitmap.width || crop.y + crop.h > bitmap.height)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !bitmap || outside) return
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, crop.w, crop.h)
    ctx.drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  }, [bitmap, crop, outside])
  const frameStyle = { aspectRatio: `${crop.w} / ${crop.h}` }
  if (!bitmap || outside) {
    return (
      <div className="gpoc-frame gpoc-empty" style={frameStyle}>
        <p>{outside ? `This image is ${bitmap.width} x ${bitmap.height}, so the crop at ${crop.x},${crop.y} is outside it.` : `Load ${needs} to see the reference.`}</p>
      </div>
    )
  }
  return (
    <div className="gpoc-frame" style={frameStyle}>
      <canvas ref={ref} width={crop.w} height={crop.h} role="img" aria-label={`Reference crop: ${label}`} />
    </div>
  )
}

function Ours({ rec, finishes, crop, poster, label }) {
  const nodes = useMemo(() => liveTree(rec, finishes || {}), [rec, finishes])
  const ground = rec.steps ? rec.steps.ground : null
  return (
    <div className="gpoc-frame" style={{ aspectRatio: `${crop.w} / ${crop.h}` }} role="img" aria-label={`Our recreation: ${label}`}>
      <Tree nodes={nodes} />
      {poster && ground ? (
        <div className="gpoc-poster-type" style={{ color: inkOver(ground) }}>
          <strong>TIDE LINES</strong>
          <span>Prints by Mara Okafor</span>
        </div>
      ) : null}
    </div>
  )
}

const paramText = (rec) => paramRows(rec.style, rec.params)
  .map((r) => `${r.label} ${rec.params[r.key]}${r.unit || ''}`)
  .join(' · ')

function PickControls({ id, pick, onChange }) {
  const set = (value) => onChange(id, { pick: pick.pick === value ? null : value, note: pick.note || '' })
  return (
    <div className="gpoc-pick">
      <div role="group" aria-label="Your pick" className="gpoc-pick-btns">
        <button type="button" className="gpoc-btn" aria-pressed={pick.pick === 'go'} onClick={() => set('go')}>Go</button>
        <button type="button" className="gpoc-btn" aria-pressed={pick.pick === 'not-yet'} onClick={() => set('not-yet')}>Not yet</button>
      </div>
      <label className="gpoc-note">
        <span>Note</span>
        <input type="text" value={pick.note || ''} onChange={(e) => onChange(id, { pick: pick.pick || null, note: e.target.value })} autoComplete="off" />
      </label>
    </div>
  )
}

function Row({ row, bitmap, pick, onPick }) {
  const [useSampled, setUseSampled] = useState(false)
  const sampled = useMemo(() => sampleHexes(bitmap, row.crop, row.sample), [bitmap, row])
  const stops = useSampled && sampled ? sampled : row.stops
  const rec = useMemo(() => recipe(row.style, stops, row.params, 1), [row, stops])
  const css = useMemo(() => toCss(rec), [rec])
  const guard = useMemo(() => checkColourRules(row.style, stops), [row, stops])
  const named = useMemo(() => generateName({ style: row.style, stops, params: rec.params, finishes: row.finishes, seed: 1 }), [row, stops, rec])
  const bytes = useMemo(() => new Blob([css]).size, [css])
  const finishText = row.finishes && row.finishes.grain ? `Film grain ${row.finishes.grain}%` : 'None'
  const needs = row.crop.file === 'poster' ? '3.png' : '2.png'
  return (
    <article className="gpoc-row" aria-labelledby={`gpoc-${row.id}`}>
      <div className="gpoc-cell">
        <h2 id={`gpoc-${row.id}`} className="gpoc-row-title">{row.ref}</h2>
        <p className="gpoc-sub">{row.refNote}</p>
        <RefCrop bitmap={bitmap} crop={row.crop} label={row.ref} needs={needs} />
        <p className="gpoc-cap">Reference</p>
      </div>
      <div className="gpoc-cell gpoc-cell-ours">
        <Ours rec={rec} finishes={row.finishes} crop={row.crop} poster={row.poster} label={row.ref} />
        <p className="gpoc-cap">Ours, live CSS</p>
      </div>
      <dl className="gpoc-facts">
        <div>
          <dt>Family</dt>
          <dd>{STYLE_LABEL[row.style]}: {paramText(rec)}</dd>
        </div>
        <div>
          <dt>Finish</dt>
          <dd>{finishText}</dd>
        </div>
        <div>
          <dt>Colours</dt>
          <dd>
            <ul className="gpoc-hexes">
              {stops.map((h, i) => <li key={`${h}-${i}`}><Swatch hex={h} /><code>{h}</code> <span>{useSampled && sampled ? 'sampled' : row.unmeasured ? 'placeholder' : 'measured'}</span></li>)}
            </ul>
            {sampled ? (
              <p className="gpoc-sub">
                Sampled here: {sampled.map((h, i) => <span key={i} className="gpoc-sampled"><Swatch hex={h} /><code>{h}</code></span>)}
              </p>
            ) : <p className="gpoc-sub">Sampled colours appear when the reference is loaded.</p>}
            <label className="gpoc-check">
              <input type="checkbox" checked={useSampled} disabled={!sampled} onChange={(e) => setUseSampled(e.target.checked)} />
              <span>Use sampled colours</span>
            </label>
          </dd>
        </div>
        <div>
          <dt>Name</dt>
          <dd><strong>{named.name}</strong><br />{named.description}</dd>
        </div>
        <div>
          <dt>CSS</dt>
          <dd>{bytes.toLocaleString()} bytes. {CLOSENESS_LABEL[rec.kind]}</dd>
        </div>
        <div>
          <dt>Colour rules</dt>
          <dd>
            {guard.ok ? <span className="gpoc-ok">Inside the {STYLE_LABEL[row.style]} rules.</span> : (
              <>
                <span className="gpoc-warn">Outside the {STYLE_LABEL[row.style]} rules (shown, not fitted):</span>
                <ul className="gpoc-problems">{guard.problems.map((p) => <li key={p}>{p}</li>)}</ul>
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Your pick</dt>
          <dd><PickControls id={row.id} pick={pick} onChange={onPick} /></dd>
        </div>
      </dl>
    </article>
  )
}

/* ── finishes strip ──────────────────────────────────────────────────────── */

const FINISHES = [
  { label: 'No finish', finishes: {} },
  { label: 'Film grain 4.5%', finishes: { grain: 4.5 } },
  { label: 'Glass bars', finishes: { glass: {} } },
]

function FinishStrip() {
  const row = ROWS.find((r) => r.id === 'golden-hour')
  const rec = useMemo(() => recipe(row.style, row.stops, row.params, 1), [row])
  return (
    <section className="gpoc-section" aria-labelledby="gpoc-finishes">
      <h2 id="gpoc-finishes">Finishes, on Golden Hour</h2>
      <p className="gpoc-sub">The same gradient three ways, so the finishes are judged in the same pass.</p>
      <div className="gpoc-strip">
        {FINISHES.map((f) => (
          <figure key={f.label} className="gpoc-cell">
            <Ours rec={rec} finishes={f.finishes} crop={row.crop} label={`Golden Hour, ${f.label}`} />
            <figcaption className="gpoc-cap">{f.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ── CSS.supports self-check ─────────────────────────────────────────────── */

const SEEDS = 200

function runSelfCheck() {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return null
  return STYLES.map((style) => {
    let passed = 0
    let firstFail = null
    for (let seed = 1; seed <= SEEDS; seed++) {
      const d = rollDesign(style, seed)
      const css = toCss(recipe(d.style, d.stops, d.params, d.seed))
      if (CSS.supports('background', css) && !css.includes('url(')) passed++
      else if (!firstFail) firstFail = seed
    }
    return { style, passed, firstFail }
  })
}

function SelfCheck() {
  const results = useMemo(() => runSelfCheck(), [])
  return (
    <section className="gpoc-section" aria-labelledby="gpoc-selfcheck">
      <h2 id="gpoc-selfcheck">CSS.supports self-check</h2>
      <p className="gpoc-sub">{SEEDS} seeded designs per family, each family's CSS asked of this browser. Every one should pass.</p>
      {results ? (
        <table className="gpoc-table">
          <thead><tr><th scope="col">Family</th><th scope="col">Passed</th><th scope="col">First failing seed</th></tr></thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.style}>
                <th scope="row">{STYLE_LABEL[r.style]}</th>
                <td>{r.passed} of {SEEDS}</td>
                <td>{r.firstFail ?? 'none'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p>This browser has no CSS.supports, so the check did not run.</p>}
    </section>
  )
}

/* ── the board ───────────────────────────────────────────────────────────── */

const FAMILY_OF = Object.fromEntries(ROWS.map((r) => [r.id, r.style]))

function summarise(picks) {
  const mark = (v) => ROWS.filter((r) => (picks[r.id] || {}).pick === v)
  const go = mark('go')
  const notYet = mark('not-yet')
  const families = [...new Set(go.map((r) => STYLE_LABEL[r.style]))]
  const left = ROWS.length - go.length - notYet.length
  return {
    go,
    notYet,
    line: `${go.length} Go, ${notYet.length} Not yet, ${left} not marked. Families with a Go: ${families.length ? families.join(', ') : 'none yet'}.`,
  }
}

function picksText(picks) {
  const lines = ROWS.map((r) => {
    const p = picks[r.id] || {}
    const verdict = p.pick === 'go' ? 'Go' : p.pick === 'not-yet' ? 'Not yet' : 'Not marked'
    return `${r.ref} (${STYLE_LABEL[FAMILY_OF[r.id]]}): ${verdict}${p.note ? `. ${p.note}` : ''}`
  })
  return `Gradient styles proof of concept picks\n${lines.join('\n')}\n${summarise(picks).line}`
}

export default function GradientStylesPoc() {
  const [blobs, setBlobs] = useState({ sheet: null, poster: null })
  const [bitmaps, setBitmaps] = useState({ sheet: null, poster: null })
  const [picks, setPicks] = useState(readPicks)
  const [status, setStatus] = useState('')
  const statusTimer = useRef(0)

  // Whatever was picked on an earlier visit is still in IndexedDB.
  useEffect(() => {
    let live = true
    Promise.all(FILES.map((f) => idbGet(f.key).catch(() => null))).then(([sheet, poster]) => {
      if (live) setBlobs({ sheet: sheet || null, poster: poster || null })
    })
    return () => { live = false }
  }, [])

  useEffect(() => {
    let live = true
    const made = []
    Promise.all(FILES.map(async (f) => {
      const b = blobs[f.key]
      if (!b) return null
      try { const bm = await createImageBitmap(b); made.push(bm); return bm } catch { return null }
    })).then(([sheet, poster]) => {
      if (live) setBitmaps({ sheet, poster })
    })
    return () => { live = false; made.forEach((b) => b.close()) }
  }, [blobs])

  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  const say = useCallback((text) => {
    setStatus(text)
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(''), 2400)
  }, [])

  const onFile = async (key, file) => {
    if (!file) return
    try { await idbPut(key, file) } catch { say('This browser would not keep the file, so it will need loading again next visit.') }
    setBlobs((b) => ({ ...b, [key]: file }))
  }

  const clearFiles = async () => {
    await Promise.all(FILES.map((f) => idbDelete(f.key).catch(() => null)))
    setBlobs({ sheet: null, poster: null })
    say('References cleared from this browser.')
  }

  const onPick = useCallback((id, value) => {
    setPicks((prev) => {
      const next = { ...prev, [id]: value }
      try { localStorage.setItem(PICKS_KEY, JSON.stringify(next)) } catch { /* private mode: the picks stay for this visit */ }
      return next
    })
  }, [])

  const summary = summarise(picks)

  const copyPicks = async () => {
    try {
      await navigator.clipboard.writeText(picksText(picks))
      say('Picks copied')
    } catch {
      say('Copy was blocked. Select the summary line and copy it by hand.')
    }
  }

  return (
    <div className="sec gpoc">
      <div className="sec-h">
        <h1>Gradient styles, proof of concept</h1>
        <p>
          Each row puts a reference beside our recreation, drawn by the engine that will ship. Mark each row
          Go or Not yet. A family goes into the build if one of its rows is Go. Dev only: this page is not in
          a production build.
        </p>
      </div>

      <section className="gpoc-load" aria-labelledby="gpoc-load-h">
        <h2 id="gpoc-load-h">References</h2>
        <p className="gpoc-sub">Pick your two files. They stay in this browser and are never added to the repo.</p>
        <div className="gpoc-files">
          {FILES.map((f) => (
            <label key={f.key} className="gpoc-file">
              <span className="gpoc-file-name">{f.label}</span>
              <span className="gpoc-sub">{blobs[f.key] ? `Loaded: ${blobs[f.key].name || 'saved file'}` : f.hint}</span>
              <input type="file" accept="image/*" onChange={(e) => onFile(f.key, e.target.files && e.target.files[0])} />
            </label>
          ))}
          <button type="button" className="gpoc-btn" onClick={clearFiles} disabled={!blobs.sheet && !blobs.poster}>Clear references</button>
        </div>
      </section>

      <section className="gpoc-summary" aria-label="Picks so far">
        <p id="gpoc-summary-line" aria-live="polite">{summary.line}</p>
        <button type="button" className="gpoc-btn gpoc-btn-main" onClick={copyPicks}>Copy picks</button>
        <p className="gpoc-status" role="status">{status}</p>
      </section>

      <div className="gpoc-rows">
        {ROWS.map((row) => (
          <Row key={row.id} row={row} bitmap={bitmaps[row.crop.file]} pick={picks[row.id] || {}} onPick={onPick} />
        ))}
      </div>

      <FinishStrip />
      <SelfCheck />
    </div>
  )
}

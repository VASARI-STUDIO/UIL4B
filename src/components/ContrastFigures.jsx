import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { contrastRatio, hexToRgb, luminance } from '../utils/colors'
import { blendWhite, ratioText } from '../utils/contrastFormat'
import { CONTRAST_PICKS, parseHex, pickContrastHex, typeContrastHex, useContrastPick } from '../hooks/useContrastPick'
import { prefersReducedMotion } from './spectrum/reducedMotion'
import '../styles/pages/learn-contrast.css'

// The figures of the colour contrast guide. Every ratio printed here comes from
// contrastRatio(), the function the Contrast Checker runs on; every lightness
// figure from luminance(). Nothing is a number typed in from memory.

const WHITE = '#FFFFFF'
const f2 = (n) => n.toFixed(2)
const f4 = (n) => n.toFixed(4)
const f5 = (n) => n.toFixed(5)
const ratioOf = (a, b) => contrastRatio(a, b)
const lumOf = (hex) => luminance(...hexToRgb(hex))
const verdict = (ratio, need) => (ratio >= need ? 'Passes' : 'Fails')

// ── Disclosure ─────────────────────────────────────────────────────────────

/** "Show the working": the quoted standard and the full arithmetic, opened in place. */
export function Working({ children }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <div className="lcc-w">
      <button type="button" className="lcc-disc" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        Show the working
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      <div className="lcc-wk" id={id} hidden={!open}>{children}</div>
    </div>
  )
}

// ── Hero specimen ──────────────────────────────────────────────────────────

const ROWS = [
  ['Body text, AA', 4.5],
  ['Large text, AA', 3],
  ['Body text, AAA', 7],
  ['Large text, AAA', 4.5],
  ['Field edges and icons, AA', 3],
]

/** The five grey swatches, a sheet of white with text in the pick, and the five verdicts. */
export function ContrastSpecimen() {
  const { hex } = useContrastPick()
  const labelId = useId()
  const ratio = ratioOf(hex, WHITE)
  const at = CONTRAST_PICKS.indexOf(hex)

  const onKeyDown = (e) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = at < 0 ? (d > 0 ? 0 : CONTRAST_PICKS.length - 1) : (at + d + CONTRAST_PICKS.length) % CONTRAST_PICKS.length
    pickContrastHex(CONTRAST_PICKS[n])
    const group = e.currentTarget
    requestAnimationFrame(() => group.querySelectorAll('[role="radio"]')[n]?.focus())
  }

  return (
    <div className="lcc-spec" role="group" aria-label="Contrast specimen">
      <p className="lcc-lab" id={labelId}>Text colour</p>
      <div className="lcc-sws" role="radiogroup" aria-labelledby={labelId} onKeyDown={onKeyDown}>
        {CONTRAST_PICKS.map((h, i) => (
          <div className="lcc-swi" key={h}>
            <button
              type="button"
              className="lcc-sw"
              role="radio"
              aria-checked={h === hex}
              aria-label={h}
              tabIndex={(at < 0 ? i === 0 : h === hex) ? 0 : -1}
              style={{ background: h }}
              onClick={() => pickContrastHex(h)}
            />
            <span className="lcc-swh">{h}</span>
          </div>
        ))}
      </div>
      <div className="lcc-paper lcc-field" aria-live="polite">
        <div className="lcc-tx">
          <p className="lcc-tl" style={{ color: hex }}>Large text, 24px</p>
          <p className="lcc-tb" style={{ color: hex }}>Body text at 17px, the size you are reading now.</p>
        </div>
        <span className="lcc-rt" aria-label={`Contrast ratio ${f2(ratio)}:1`}>{f2(ratio)}:1</span>
      </div>
      <ul className="lcc-vr">
        {ROWS.map(([name, need]) => (
          <li key={name}>
            <span>{name}</span>
            <span className="lcc-nd">needs {need}:1</span>
            <span className="lcc-vd">{verdict(ratio, need)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Section 2: the size ruler ──────────────────────────────────────────────

const RULER = [
  { text: '24px, regular: large, 3:1 applies', css: { fontSize: 24, fontWeight: 400 }, need: 3 },
  { text: '18.5px, bold (700): large, 3:1 applies', css: { fontSize: 18.5, fontWeight: 700 }, need: 3 },
  { text: '20px, semibold (600): treat as normal, 4.5:1', css: { fontSize: 20, fontWeight: 600 }, need: 4.5 },
]

export function SizeRuler() {
  const { hex } = useContrastPick()
  const ratio = ratioOf(hex, WHITE)
  return (
    <div className="lcc-paper lcc-rul" role="group" aria-label="Three lines of text in the picked colour">
      {RULER.map((r) => (
        <div className="lcc-ln" key={r.text}>
          <span style={{ ...r.css, lineHeight: 1.3, color: hex }}>{r.text}</span>
          <span className="lcc-vd">{verdict(ratio, r.need)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Section 3: the channel bars ────────────────────────────────────────────

const TOPS = [0, 40, 80]
const L_TOP = 144
const W_TOP = 184
const WEIGHTS = [0.2126, 0.7152, 0.0722]
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const same = (a) => (a.every((v) => Math.abs(v - a[0]) < 1e-9) ? f4(a[0]) : a.map(f4).join(', '))

/**
 * Three bars at the sRGB value of the pick, then each at its linear value, then
 * each at its weighted share, stacked into one lightness bar beside white.
 * Three stages of 300ms, once, when 40% of the figure is in view. After that,
 * and for anyone who reads with reduced motion, the last frame stands and a new
 * pick moves it with no replay.
 */
export function ChannelBars() {
  const { hex } = useContrastPick()
  const ref = useRef(null)
  const reduced = prefersReducedMotion()
  const [stage, setStage] = useState(reduced ? 3 : 1)
  const [seen, setSeen] = useState(false)
  const [played, setPlayed] = useState(reduced)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => { setStage(3); setSeen(true); setPlayed(true) }, 0)
      return () => clearTimeout(t)
    }
    let t1
    let t2
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      setSeen(true)
      if (reduced) return
      t1 = setTimeout(() => setStage(2), 300)
      t2 = setTimeout(() => { setStage(3); setPlayed(true) }, 600)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); clearTimeout(t1); clearTimeout(t2) }
  }, [reduced])

  const rgb = hexToRgb(hex)
  const ch = rgb.map((v) => v / 255)
  const li = ch.map(lin)
  const wt = li.map((v, i) => v * WEIGHTS[i])
  const L = lumOf(hex)
  const ratio = ratioOf(hex, WHITE)
  const cum = [0, wt[0], wt[0] + wt[1]]
  const names = ['Red', 'Green', 'Blue']
  const tone = ['r', 'g', 'b']

  const transformOf = (i) => {
    const sc = stage === 1 ? ch[i] : stage === 2 ? li[i] : wt[i]
    const tx = stage === 3 ? cum[i] * 100 : 0
    const ty = stage === 3 ? L_TOP - TOPS[i] : 0
    return `translate(${tx.toFixed(2)}%, ${ty}px) scaleX(${Math.max(sc, 0.0001).toFixed(4)})`
  }

  return (
    <div className="lcc-chw">
      <p className="lcc-chcap"><i style={{ background: hex }} /><code>{hex}</code><span>on white</span></p>
      <div
        ref={ref}
        className={`lcc-ch lcc-st${stage}${played ? ' lcc-done' : ''}`}
        data-seen={seen}
        role="img"
        aria-label={`Channel bars for ${hex}: lightness ${f4(L)}`}
      >
        <div className="lcc-grid" aria-hidden="true">
          <div className="lcc-chlab">
            {names.map((n, i) => <span key={n} style={{ top: TOPS[i] }}>{n}</span>)}
            <span style={{ top: L_TOP }}>Lightness (L)</span>
            <span style={{ top: W_TOP }}>White</span>
          </div>
          <div className="lcc-chval">
            {names.map((n, i) => (
              <span className="lcc-vs" key={n} style={{ top: TOPS[i] }}>
                <i className="v1">{f4(ch[i])}</i>
                <i className="v2">{f4(li[i])}</i>
                <i className="v3">{f4(wt[i])}</i>
              </span>
            ))}
            <span className="lcc-vs" style={{ top: W_TOP }}><i className="v1 v2 v3 lcc-on">1</i></span>
          </div>
          <div className="lcc-trk">
            {[0, 40, 80, L_TOP, W_TOP].map((t) => <span className="lcc-tr" key={t} style={{ top: t }} />)}
            {wt.map((w, i) => (
              <span className="lcc-gh" key={`g${i}`} style={{ top: TOPS[i], transform: `scaleX(${Math.max(w, 0.0001).toFixed(4)})` }} />
            ))}
            {tone.map((c, i) => <span className={`lcc-bar lcc-${c}`} key={c} style={{ top: TOPS[i], transform: transformOf(i) }} />)}
            <span className="lcc-bar lcc-w" style={{ top: W_TOP }} />
            <span className="lcc-lend" style={{ top: L_TOP, left: `calc(${(L * 100).toFixed(2)}% + 12px)` }}>{f4(L)}</span>
          </div>
        </div>
        <p className="lcc-res">L = {f4(L)}, white L = 1, ratio (1 + 0.05) / ({f4(L)} + 0.05) = {f2(ratio)}:1</p>
        <ol className="lcc-steps">
          <li>1. Each channel ÷ 255: <code>{same(ch)}</code></li>
          <li>2. Linearised: <code>{same(li)}</code></li>
          <li>3. Weighted and added: <code>{wt.map(f5).join(' + ')} = {f5(L)}</code></li>
        </ol>
      </div>
    </div>
  )
}

// ── Section 4: two fields ──────────────────────────────────────────────────

const FIELD_PALE = '#E5E5E5'
const FIELD_DARK = '#949494'

export function FieldPair() {
  const a = useId()
  const b = useId()
  const rows = [
    { id: a, border: FIELD_PALE, name: 'Email, pale border' },
    { id: b, border: FIELD_DARK, name: 'Email, darker border' },
  ]
  return (
    <div className="lcc-paper lcc-fld" role="group" aria-label="Two text fields, one with a pale border and one with a darker border">
      {rows.map((r) => {
        const ratio = ratioOf(r.border, WHITE)
        return (
          <div className="lcc-fl" key={r.id}>
            <label htmlFor={r.id}>Email</label>
            <input className="lcc-in" id={r.id} style={{ '--lcc-bc': r.border }} type="text" readOnly aria-label={r.name} />
            <p className="lcc-rr"><b>{f2(ratio)}:1</b><i>{verdict(ratio, 3)}</i></p>
          </div>
        )
      })}
    </div>
  )
}

// ── Section 5: four failures the ratio does not see ────────────────────────

const HUE_A = '#C25E00'
const HUE_B = '#4D8000'
const THIN = '#6B7280'
const RED = '#DC2626'
const SPLIT = '#949494'

export function FailureSpecimens() {
  const blended = blendWhite(RED, 0.9)
  return (
    <div className="lcc-fg">
      <figure className="lcc-fs">
        <div className="lcc-paper lcc-fr">
          <div className="lcc-col"><span className="lcc-sq" style={{ background: HUE_A }} /><span className="lcc-rl">{HUE_A}</span></div>
          <div className="lcc-col"><span className="lcc-big">{ratioText(HUE_A, HUE_B)}</span></div>
          <div className="lcc-col"><span className="lcc-sq" style={{ background: HUE_B }} /><span className="lcc-rl">{HUE_B}</span></div>
        </div>
        <figcaption>
          <b>Hue.</b> <code>{HUE_A}</code> and <code>{HUE_B}</code> look nothing alike, but they measure {ratioText(HUE_A, HUE_B)} because they are almost equally light. A red and a green that pass can still look the same to someone with deuteranopia. That is why WCAG has a separate rule, 1.4.1 Use of Color at Level A: colour must never be the only signal.
        </figcaption>
      </figure>

      <figure className="lcc-fs">
        <div className="lcc-paper lcc-fr">
          <div className="lcc-col"><span style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 300, color: THIN }}>Readable?</span><span className="lcc-rl">300</span><span className="lcc-rn">{ratioText(THIN, WHITE)}</span></div>
          <div className="lcc-col"><span style={{ fontSize: 24, lineHeight: 1.2, fontWeight: 700, color: THIN }}>Readable?</span><span className="lcc-rl">700</span><span className="lcc-rn">{ratioText(THIN, WHITE)}</span></div>
        </div>
        <figcaption>
          <b>Stroke weight.</b> 4.5:1 is the same bar for a 300 and a 700 weight word, yet the thin word looks fainter. WCAG&rsquo;s numbers don&rsquo;t measure stroke width, though a note in the standard warns that very thin fonts are harder to read. The WCAG 3 draft of 10 September 2026 hasn&rsquo;t chosen a contrast method yet. With a light weight, set yourself a target above 4.5.
        </figcaption>
      </figure>

      <figure className="lcc-fs">
        <div className="lcc-paper lcc-fr">
          <div className="lcc-col"><span className="lcc-btn" style={{ color: WHITE }}>Save changes</span><span className="lcc-rn">{ratioText(WHITE, RED)}</span></div>
          <div className="lcc-col"><span className="lcc-btn" style={{ color: blended }}>Save changes</span><span className="lcc-rn">{ratioText(blended, RED)}</span></div>
        </div>
        <figcaption>
          <b>Alpha.</b> Measure the colour that ends up on screen. White on <code>{RED}</code> measures {ratioText(WHITE, RED)}. The same white at 90% opacity blends to <code>{blended}</code> and drops to {ratioText(blended, RED)}, under AA.
        </figcaption>
      </figure>

      <figure className="lcc-fs">
        <div className="lcc-paper lcc-fr lcc-fr--split">
          <div className="lcc-split" aria-hidden="true"><div style={{ background: WHITE }} /><div style={{ background: SPLIT }} /></div>
          <p className="lcc-wl" style={{ color: THIN }}>The worst pixel decides.</p>
        </div>
        <p className="lcc-splcap"><span>{ratioText(THIN, WHITE)} on white</span><span>{ratioText(THIN, SPLIT)} on {SPLIT}</span></p>
        <figcaption>
          <b>The background you assumed.</b> Text over a photo, a gradient or a see-through panel has a different ratio at every pixel. The worst pixel decides the result.
        </figcaption>
      </figure>
    </div>
  )
}

// ── Try it: any colour ─────────────────────────────────────────────────────

/** The hex field, the two swatches and the note that sit beside the tool link. */
export function TryColour() {
  const { hex, text } = useContrastPick()
  const id = useId()
  const errId = useId()
  const shown = text ?? hex
  const v = shown.trim().replace(/^#/, '')
  const invalid = v.length > 0 && !parseHex(shown) && (/[^0-9a-fA-F]/.test(v) || v.length > 6)
  const custom = !CONTRAST_PICKS.includes(hex)
  return (
    <>
      <div className="lcc-hx">
        <div className="lcc-hxrow">
          <label htmlFor={id}>Any colour</label>
          <input
            id={id}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck="false"
            maxLength={8}
            value={shown}
            aria-describedby={errId}
            aria-invalid={invalid}
            onChange={(e) => typeContrastHex(e.target.value)}
          />
        </div>
        <p className="lcc-hxerr" id={errId} role="status">{invalid ? 'Use a hex like #949494' : ''}</p>
      </div>
      <div className="lcc-tsw">
        <div><i style={{ background: hex }} />{hex}</div>
        <div><i style={{ background: WHITE }} />{WHITE}</div>
      </div>
      <p className="lcc-ntry">{custom ? 'Opens with this colour, on white.' : 'Opens with the grey you picked, on white.'}</p>
    </>
  )
}

/** The try-it column: the hex field, the two swatches, the note and the tool link carrying the pick. */
export function TryColourAction({ to, label }) {
  const { hex } = useContrastPick()
  return (
    <div className="lart-next-act lcc-try">
      <TryColour />
      <Link className="lart-next-go" to={`${to}?fg=${hex.slice(1)}&bg=FFFFFF`}>
        Open in {label}
      </Link>
    </div>
  )
}

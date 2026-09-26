import { useCallback, useEffect, useRef, useState } from 'react'
import PhIcon from './PhIcon'
import { FREE_SAVE_LIMITS } from '../../config/plans'
import { numberWord } from './spectrumFacts'
import { prefersReducedMotion } from './reducedMotion'
import {
  BASES,
  EX_FILES,
  EX_FMTS,
  EX_PIECES,
  FONTS,
  GLYPHS,
  KIT_FILES,
  KIT_PAGES,
  PROJECTS,
  TYPE_STEPS,
  exFileOf,
  rampOf,
  ratio,
} from './spectrumKit'

// ═════════════════════════════════════════════════════════════════════════════
// STUDIO QUALITY EXPORTS — the three stacking cards.
// ═════════════════════════════════════════════════════════════════════════════
//
// ── THE NESTING IS THE MECHANISM ────────────────────────────────────────────
// A sticky box pins only inside its own containing block. The design nests:
//
//   nest A ─ card 0 (sticky 84) · pad · nest B ─ card 1 (sticky 116) · pad ·
//                                              nest C ─ card 2 (sticky 148) · tail
//
// so card 0 stays pinned for the whole length of A (which holds 1 and 2), card
// 1 for the length of B, card 2 for C and its 26dvh tail. Built as three sibling
// slots, the previous version never pinned at all (tops 203 → −142 → −492).
//
// ── THE COVERED CARDS SHRINK AND DIM (`syncStack`) ─────────────────────────
// For each card, count the cards after it that are docked at their own top;
// scale it by 1 − 0.045 per docked card and dim it by 1 − 0.05, from its top
// edge, over the .4s transition in spectrum.css. Two cards on top of card 0
// give .91; one on card 1 gives .955. Skipped under reduced motion and, by the
// CSS, below 900px, where the stack is three ordinary cards.
//
// ── WHAT IS LIVE ────────────────────────────────────────────────────────────
// Card 1's panel builds a real file from the seed chosen in the bench's palette
// window (and the family chosen in its font window), and "Copy file" copies it.
// Card 2's document is the exported UI kit's own four pages, recoloured by the
// same seed. The design's links between the windows are kept: change a seed
// above and both cards follow.

const TOPS = [84, 116, 148]

function stackPass(els) {
  const off = prefersReducedMotion() || window.innerWidth <= 900
  for (let i = 0; i < els.length; i += 1) {
    const el = els[i]
    if (!el) continue
    let docked = 0
    if (!off) {
      for (let j = i + 1; j < els.length; j += 1) {
        const r = els[j]?.getBoundingClientRect()
        if (r && r.top <= TOPS[j] + 6 && r.bottom > TOPS[j]) docked += 1
      }
    }
    el.style.transform = docked ? `scale(${(1 - docked * 0.045).toFixed(3)})` : ''
    el.style.filter = docked ? `brightness(${(1 - docked * 0.05).toFixed(3)})` : ''
  }
}

function useStackSync(cards) {
  useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      stackPass(cards.current)
    }
    const request = () => { if (!raf) raf = requestAnimationFrame(run) }
    run()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request, { passive: true })
    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [cards])
}

function Card({ index, setRef, children }) {
  return (
    <div className="sp-stack-card" data-stack-card={index} ref={setRef} style={{ '--sp-stack-top': `${TOPS[index]}px` }}>
      <div className="sp-stack-grid">{children}</div>
    </div>
  )
}

/* ── card 1 · one piece ───────────────────────────────────────────────────── */

function OnePiece({ base, font }) {
  const [piece, setPiece] = useState(0)
  const [fmt, setFmt] = useState(0)
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const seed = BASES[base]
  const ramp = rampOf(seed)
  const file = exFileOf(piece, fmt, seed)
  const spec = FONTS[font]
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(file.text).catch(() => {})
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1200)
  }, [file.text])

  return (
    <div className="sp-ex">
      <div className="sp-ex-pieces" role="group" aria-label="What to export">
        {EX_PIECES.map((label, i) => (
          <button key={label} type="button" className="sp-ex-piece" aria-pressed={piece === i} onClick={() => { setPiece(i); setCopied(false) }}>{label}</button>
        ))}
      </div>

      <div className="sp-ex-body">
        {piece === 0 && (
          <div className="sp-ex-rows">
            {ramp.map((r) => (
              <span key={r.step}>
                <span className="sp-ex-sw" style={{ background: r.hex }} />
                <span className="sp-ex-step">{r.step}</span>
                <span className="sp-ex-hex">{r.hex}</span>
                <span className={r.aa === 'AA' ? 'sp-ex-aa is-pass' : 'sp-ex-aa'}>{r.aa}</span>
              </span>
            ))}
          </div>
        )}
        {piece === 1 && (
          <div className="sp-ex-type">
            {TYPE_STEPS.map(([name, value]) => (
              <span key={name}>
                <small>{name}</small>
                <b style={{ fontFamily: spec.family, fontSize: `${Math.min(34, Math.round(parseFloat(value) * 13))}px` }}>{spec.name}</b>
                <i>{value}</i>
              </span>
            ))}
          </div>
        )}
        {piece === 2 && (
          <div className="sp-ex-files">
            {EX_FILES.map(([icon, name, was, now]) => (
              <span className="sp-ex-file" key={name}>
                <span>
                  <PhIcon name={icon} />
                  <b>{name}</b>
                  <small>{was < 1024 ? `${was} KB` : `${(was / 1024).toFixed(2)} MB`}</small>
                  <PhIcon name="arrow-right" className="sp-ex-arrow" />
                  <strong>{now < 1024 ? `${now} KB` : `${(now / 1024).toFixed(2)} MB`}</strong>
                </span>
                <span className="sp-ex-track"><span style={{ width: `${Math.max(4, Math.round((now / was) * 100))}%` }} /></span>
              </span>
            ))}
          </div>
        )}
        {piece === 3 && (
          <div className="sp-ex-icons">
            {GLYPHS.map(([slug, name]) => (
              <span key={slug}>
                <PhIcon name={slug} />
                <small>{name}</small>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sp-ex-filebar">
        <PhIcon name={piece >= 2 ? 'file-zip' : piece === 1 ? 'text-aa' : 'file-css'} />
        <b>{file.name}</b>
        <small>{file.kb}</small>
      </div>
      <div className="sp-ex-actions">
        <div className="sp-ex-fmts" role="group" aria-label="File format">
          {EX_FMTS.map(([label], i) => (
            <button key={label} type="button" className="sp-ex-fmt" aria-pressed={fmt === i} onClick={() => { setFmt(i); setCopied(false) }}>{label}</button>
          ))}
        </div>
        <button type="button" className="sp-pill sp-ex-copy" onClick={copy}>
          <PhIcon name="copy" /><span aria-live="polite">{copied ? 'Copied' : 'Copy file'}</span>
        </button>
      </div>
    </div>
  )
}

/* ── card 2 · the UI kit document ─────────────────────────────────────────── */

function KitDocument({ base, font }) {
  const [page, setPage] = useState(0)
  const seed = BASES[base]
  const ramp = rampOf(seed)
  const spec = FONTS[font]
  const inkOnPaper = (hex) => (ratio(hex, '#F7F6F1') >= ratio(hex, '#18221E') ? '#F7F6F1' : '#18221E')
  const swatches = [
    [seed.label, ramp[4].hex, 'Signature accent. Moments that deserve attention.'],
    ['Anchor', ramp[7].hex, 'Ground expressive layouts and key actions.'],
    ['Support', ramp[2].hex, 'The softer side. Quiet moments and stories.'],
    ['Canvas', ramp[0].hex, 'The breathing room. Let content come forward.'],
    ['Ink', ramp[8].hex, 'The definition. Keep reading clear.'],
  ]
  const headStyle = { fontFamily: spec.family }

  return (
    <div className="sp-kit">
      <div className="sp-kit-paper">
        <div className="sp-kit-tabs">
          {KIT_PAGES.map((label, i) => (
            <button key={label} type="button" className="sp-kit-tab" aria-pressed={page === i} onClick={() => setPage(i)}>{label}</button>
          ))}
          <span className="sp-kit-ed">Free edition</span>
        </div>

        <div className="sp-kit-body">
          {page === 0 && (
            <div className="sp-kit-colour">
              <span className="sp-kit-h" style={headStyle}>A palette with purpose.</span>
              <span className="sp-kit-sws">
                {swatches.map(([name, hex, role]) => (
                  <span className="sp-kit-sw" key={name}>
                    <span style={{ background: hex, color: inkOnPaper(hex) }}>
                      <b>{name}</b>
                      <code>{hex}</code>
                    </span>
                    <small>{role}</small>
                  </span>
                ))}
              </span>
            </div>
          )}
          {page === 1 && (
            <div className="sp-kit-type">
              <span className="sp-kit-h" style={headStyle}>Type that does the work.</span>
              <span className="sp-kit-pair">
                <span>
                  <small><span>{spec.name}</span><span>Display / 600</span></small>
                  <span className="sp-kit-aa" style={headStyle}>Aa</span>
                </span>
                <span>
                  <small><span>Body face</span><span>Body / 400</span></small>
                  <span className="sp-kit-body-face">The everyday deserves a little extra thought.</span>
                </span>
              </span>
              {TYPE_STEPS.map(([name, value]) => (
                <span className="sp-kit-step" key={name}>
                  <small>{name}</small>
                  <b style={{ ...headStyle, fontSize: `${Math.min(34, Math.round(parseFloat(value) * 13))}px` }}>A fresh perspective.</b>
                  <code>{value}</code>
                </span>
              ))}
            </div>
          )}
          {page === 2 && (
            <div className="sp-kit-found">
              <span className="sp-kit-h" style={headStyle}>The quiet foundations.</span>
              <span>
                <small>Space to breathe.</small>
                <span className="sp-kit-space">
                  {[4, 8, 12, 16, 24, 32, 48].map((n, i) => (
                    <span key={n}><i style={{ height: `${8 + i * 8}px` }} /><code>{n}</code></span>
                  ))}
                </span>
              </span>
              <span>
                <small>Structure with flexibility. 12 columns, 1,200 px.</small>
                <span className="sp-kit-cols">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</span>
              </span>
            </div>
          )}
          {page === 3 && (
            <div className="sp-kit-files">
              <span>
                <span className="sp-kit-h" style={headStyle}>Ready for your next build.</span>
                <small>Take the colour, type and spacing tokens straight into the project.</small>
              </span>
              <ul>
                {KIT_FILES.map(([name, meta]) => (
                  <li key={name}>
                    <span><b>{name}</b><small>{meta}</small></span>
                    <PhIcon name="download-simple" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="sp-kit-foot">
          <span>{`${seed.label} kit, page ${page + 1} of 4`}</span>
          <span>UI kit / Free edition</span>
        </div>
      </div>
    </div>
  )
}

/* ── the stack ────────────────────────────────────────────────────────────── */

export default function SpectrumExports({ base, font }) {
  const cards = useRef([])
  useStackSync(cards)
  const setRef = (i) => (el) => { cards.current[i] = el }

  return (
    <div className="sp-stack">
      <div className="sp-stack-nest">
        <Card index={0} setRef={setRef(0)}>
          <div className="sp-stack-say">
            <h3>Whether it&apos;s just one thing.</h3>
            <p>
              Pull out the palette on its own, the type scale on its own, a folder of compressed
              assets or a custom icon kit. Each one leaves as a real file, named and ready to commit.
            </p>
            <p className="sp-stack-note">Free on every plan.</p>
          </div>
          <OnePiece base={base} font={font} />
        </Card>
        <div className="sp-stack-pad" aria-hidden="true" />

        <div className="sp-stack-nest">
          <Card index={1} setRef={setRef(1)}>
            <div className="sp-stack-say">
              <h3>Or a whole design system.</h3>
              <p className="sp-stack-wide">
                One click lays your colour, type and spacing into a full kit: a colour page with named
                roles, the type specimen and scale, the spacing and grid foundations, and a files page
                holding every download.
              </p>
              {/* The design's chip row, minus Figma and React, which the product
                  does not export. */}
              <div className="sp-kitchips">
                <span className="is-on">PDF</span>
                <span>Tokens</span>
              </div>
              <p className="sp-stack-note">The Free edition exports every page. Pro removes the mark.</p>
            </div>
            <KitDocument base={base} font={font} />
          </Card>
          <div className="sp-stack-pad" aria-hidden="true" />

          <div className="sp-stack-nest">
            <Card index={2} setRef={setRef(2)}>
              <div className="sp-stack-say">
                <h3>You can come back to it anytime.</h3>
                {/* The design's sentence, cut to what is true: a project keeps
                    no version history and no record of exports, and saved work
                    is a "project", never a "kit". */}
                <p>Reopen a project and pull the exact version you shipped.</p>
                <p className="sp-stack-note">
                  {numberWord(FREE_SAVE_LIMITS.projects, { capital: true })} projects on Free, unlimited on Pro.
                </p>
              </div>
              <ul className="sp-projects">
                {PROJECTS.map(([name, when, parts]) => (
                  <li key={name}>
                    <span className="sp-projects-ico" aria-hidden="true"><PhIcon name="folder-simple" /></span>
                    <span><b>{name}</b><small>{when}, {parts}</small></span>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="sp-stack-pad sp-stack-pad--tail" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}

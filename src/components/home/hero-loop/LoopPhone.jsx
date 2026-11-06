import { Fragment } from 'react'
import { buildLoopModel, useLoop } from './useLoop'
import { PHONE_PANEL_LABEL, PK_FROM, PK_HUE, PK_TO, SEARCH_KEYS_PHONE, FIELD_KEYS_PHONE, ALT_WORDS, dragSteps, keyBeats, pickerPlacers } from './loopData'
import { derivePhoneVals, touchPositions } from './loopValsPhone'
import { LoopImage } from './LoopParts'
import { PhoneChapters, PhonePause } from './PhoneParts'
import './hero-loop.css'

// The colour picker sheet, in panel pixels: its thumbs ride the pad and the hue bar.
const { padAt, hueAt } = pickerPlacers({ box: [4, 214], padW: 326, padH: 96, hueY: 153 })
const HUE0 = hueAt(PK_FROM).map(Math.round)
const PAD0 = padAt(PK_HUE).map(Math.round)

// [scene, beat, ms, x, y, touch]. touch 1 shows the finger, 2 taps, 3 holds it down along a drag.
// Scenes: 0 palette, 1 export, 2 icons, 3 font pair, 4 type scale, 5 alt text.
const APPROACH = 220 // the finger arrives and shows
const TAP = 180 // 120 ms press scale plus a beat to read it
const CH_X = [121, 173, 225, 276, 328] // the chapter buttons' centres in the strip
const CH_Y = 72
const TL = [
  // Palette: one Randomise, lock the accent, one more Randomise to show the lock holds, then on to Icons.
  [0, 'h0', 500, 0, 0, 0],
  [0, 'aR1', APPROACH, 248, 26, 1], [0, 'pR1', TAP, 248, 26, 2], [0, 'h1', 900, 0, 0, 0],
  [0, 'aLock', APPROACH, 330, 134, 1], [0, 'pLock', TAP, 330, 134, 2], [0, 'h2', 600, 0, 0, 0],
  [0, 'aR2', APPROACH, 248, 26, 1], [0, 'pR2', TAP, 248, 26, 2], [0, 'h3', 900, 0, 0, 0],
  [0, 'aN0', APPROACH, CH_X[1], CH_Y, 1], [0, 'pN0', TAP, CH_X[1], CH_Y, 2],

  // Icons: type the search, pick, the colour picker, flip, copy. The results filter a beat after the last key (q0).
  [2, 'i0', 300, 0, 0, 0],
  [2, 'aSrch', APPROACH, 179, 129, 1], [2, 'pSrch', TAP, 179, 129, 2], [2, 'f0', 250, 0, 0, 0],
  ...keyBeats(2, 'sk', 0, 0, SEARCH_KEYS_PHONE), [2, 'q0', 400, 0, 0, 0],
  [2, 'aCup', APPROACH, 178, 190, 1], [2, 'pCup', TAP, 178, 190, 2], [2, 'i1', 350, 0, 0, 0],
  [2, 'aSw', APPROACH, 214, 267, 1], [2, 'pSw', TAP, 214, 267, 2], [2, 'i2', 250, 0, 0, 0],
  [2, 'aHue', APPROACH, ...HUE0, 1], [2, 'grabH', 100, ...HUE0, 3], ...dragSteps(2, 'dh', PK_FROM, PK_HUE, 500, 2, hueAt, 3), [2, 'relH', 100, 0, 0, 0],
  [2, 'aPad', APPROACH, ...PAD0, 1], [2, 'grabP', 100, ...PAD0, 3], ...dragSteps(2, 'dp', PK_HUE, PK_TO, 700, 2, padAt, 3), [2, 'relP', 150, 0, 0, 0],
  [2, 'aDone', APPROACH, 310, 225, 1], [2, 'pDone', TAP, 310, 225, 2], [2, 'i3', 250, 0, 0, 0],
  [2, 'aFlip', APPROACH, 208, 335, 1], [2, 'pFlip', TAP, 208, 335, 2], [2, 'i4', 700, 0, 0, 0],
  [2, 'aCopy', APPROACH, 253, 381, 1], [2, 'pCopy', TAP, 253, 381, 2], [2, 'i5', 600, 0, 0, 0],
  [2, 'aN1', APPROACH, CH_X[2], CH_Y, 1], [2, 'pN1', TAP, CH_X[2], CH_Y, 2],

  // Type: Fonts and Type scale as one short chapter. The header changes with the body.
  [3, 't0', 300, 0, 0, 0],
  [3, 'aS', APPROACH, 179, 285, 1], [3, 'pS', TAP, 179, 285, 2], [3, 't1', 500, 0, 0, 0],
  [3, 'aF', APPROACH, 179, 361, 1], [3, 'pF', TAP, 179, 361, 2], [3, 'h7', 200, 0, 0, 0],
  ...keyBeats(3, 'k', 0, 0, FIELD_KEYS_PHONE), [3, 't2', 500, 0, 0, 0],
  [4, 's0', 350, 0, 0, 0],
  [4, 'aRat', APPROACH, 288, 153, 1], [4, 'pRat', TAP, 288, 153, 2], [4, 's1', 900, 0, 0, 0],
  [4, 'aN2', APPROACH, CH_X[3], CH_Y, 1], [4, 'pN2', TAP, CH_X[3], CH_Y, 2],

  // Alt text: the keyword alt text. The page context is already filled in.
  [5, 'a0', 350, 0, 0, 0],
  [5, 'aGen', APPROACH, 179, 313, 1], [5, 'pGen', TAP, 179, 313, 2], [5, 'shim', 500, 0, 0, 0],
  ...ALT_WORDS.map((w, i) => [5, 'w' + i, 30 + (i % 3) * 10, 0, 0, 0]),
  [5, 'hAlt', 1300, 0, 0, 0],
  [5, 'aExp', APPROACH, 330, 26, 1], [5, 'pExp', TAP, 330, 26, 2],

  // Export, last: the payoff. The saved style guide opens as a sheet and holds long enough to read.
  [1, 'e0', 400, 0, 0, 0],
  [1, 'aSG', APPROACH, 179, 178, 1], [1, 'pSG', TAP, 179, 178, 2], [1, 'e1', 600, 0, 0, 0],
  [1, 'aGo', APPROACH, 179, 404, 1], [1, 'pGo', TAP, 179, 404, 2], [1, 'prog', 800, 0, 0, 0], [1, 'saved', 900, 0, 0, 0],
  [1, 'aOpen', APPROACH, 304, 404, 1], [1, 'pOpen', TAP, 304, 404, 2], [1, 'guide', 4000, 0, 0, 0],

  // Seam: back to the opening Palette, the same frame the loop restarts on.
  [0, 'pEnd', 500, 0, 0, 0],
]

// Flat timing: each beat lasts the ms written. Export is the settled chapter under reduced motion.
const MODEL = buildLoopModel({
  timeline: TL,
  flat: true,
  chapters: [
    { name: 'Palette', first: 'h0', end: 'h3' },
    { name: 'Icons', first: 'i0', end: 'i5' },
    { name: 'Type', first: 't0', end: 's1' },
    { name: 'Alt text', first: 'a0', end: 'hAlt' },
    { name: 'Export', first: 'e0', end: 'guide' },
  ],
  settle: 4,
})
const GEO = { pos: touchPositions(TL) }

export default function LoopPhone({ active }) {
  const loop = useLoop(MODEL, { active })
  const v = derivePhoneVals(loop, MODEL, GEO)
  return (
    <div
      className={`lp-root ${v.rootClass}`} aria-label={PHONE_PANEL_LABEL} data-phone="" role="group"
      {...loop.rootProps}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 21,
        background: '#0B0C0E', color: '#EFEEEA', fontFamily: "'Geist', system-ui, sans-serif",
        boxSizing: 'border-box', isolation: 'isolate',
      }}
    >
      <span
        aria-live="polite"
        style={{
          position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {v.say}
      </span>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: 52,
            borderBottom: '1px solid rgba(239,238,234,.08)', zIndex: 3, background: '#0B0C0E',
          }}
        >
          <span
            style={{
              position: 'absolute', left: 10, top: 8, height: 36, padding: '0 14px', boxSizing: 'border-box',
              borderRadius: 999, border: '1px solid rgba(239,238,234,.14)', display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                flex: 'none', width: 12, height: 12, borderRadius: 999, background: v.toolDot,
                transition: `background-color 220ms cubic-bezier(.23,1,.32,1) ${v.dotDelay}`,
              }}
            />
            <span style={{ display: 'grid' }}>
              {v.toolLabels.map((t, idx) => (
                  <span key={idx} aria-hidden={t.hid} style={{ gridArea: '1 / 1', opacity: t.op, transition: t.tr }}>{t.name}</span>
              ))}
            </span>
          </span>
          <span
            style={{
              position: 'absolute', left: 196, top: 8, width: 104, height: 36, boxSizing: 'border-box',
              borderRadius: 999, border: '1px solid rgba(239,238,234,.14)', background: v.actionBg,
              display: 'grid', placeItems: 'center', fontSize: 13, opacity: v.actionOp,
              transform: `scale(${v.actionScale})`,
              transition: `background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1) ${v.actionDelay}`,
            }}
          >
            Randomise
          </span>
          <span
            style={{
              position: 'absolute', left: 312, top: 8, width: 36, height: 36, boxSizing: 'border-box',
              borderRadius: 999, border: '1px solid rgba(239,238,234,.14)', background: v.exportBg,
              display: 'grid', placeItems: 'center', opacity: v.exportOp, transform: `scale(${v.exportScale})`,
              transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <svg
              aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
              strokeWidth="2" strokeLinecap="round"
            >
              <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
            </svg>
          </span>
        </div>
        {/* Palette */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op0, transition: v.tr0,
          }}
        >
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: 0, height: 299, display: 'flex',
              flexDirection: 'column',
            }}
          >
            {v.rows.map((r, idx) => (
                <div key={idx} style={{ flex: '1 1 0', position: 'relative', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute', inset: 0, background: r.bg, color: r.fg, transition: r.tr,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 12px 0 16px',
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13 }}>{r.hex}</span>
                      <span style={{ fontSize: 12 }}>{r.role}</span>
                    </span>
                    <span
                      style={{
                        position: 'relative', width: 32, height: 32, borderRadius: 999, background: r.lockBg,
                        opacity: r.lockOp, transform: `scale(${r.lockScale})`,
                        transition: 'opacity 200ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1), background-color 200ms cubic-bezier(.23,1,.32,1)',
                      }}
                    >
                      <svg
                        aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{
                          position: 'absolute', left: 8, top: 8, opacity: r.openOp,
                          transition: 'opacity 150ms ease',
                        }}
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8.5 11V7.5a3.5 3.5 0 0 1 6.8-1.2" />
                      </svg>
                      <svg
                        aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        style={{
                          position: 'absolute', left: 8, top: 8, opacity: r.shutOp,
                          transition: 'opacity 150ms ease',
                        }}
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11" />
                      </svg>
                    </span>
                  </div>
                </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: 299, bottom: 0,
              borderTop: '1px solid rgba(239,238,234,.08)', display: 'flex', alignItems: 'center', gap: 8,
              padding: '0 16px', fontSize: 13, color: 'rgba(239,238,234,.72)',
            }}
          >
            <svg
              aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add colour
          </div>
        </div>
        {/* Export, the panel's own body */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op1, transition: v.tr1,
          }}
        >
          <p style={{ position: 'absolute', left: 16, top: 10, margin: 0, fontSize: 15, fontWeight: 600 }}>
            Export your design system
          </p>
          <div
            style={{
              position: 'absolute', left: 10, right: 10, top: 34, display: 'flex', flexDirection: 'column',
              gap: 2,
            }}
          >
            {v.formats.map((f, idx) => (
                <span key={idx}
                  style={{
                    height: 30, marginTop: `${f.mt}px`, padding: '0 12px', borderRadius: 999, background: f.bg,
                    color: f.c, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                    transform: `scale(${f.sc})`,
                    transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
                  }}
                >
                  <span
                    style={{
                      flex: 'none', position: 'relative', width: 12, height: 12, boxSizing: 'border-box',
                      borderRadius: 999, border: `1.5px solid ${f.ring}`,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute', inset: 2, borderRadius: 999, background: '#EFEEEA',
                        opacity: f.dot, transition: 'opacity 120ms ease',
                      }}
                    />
                  </span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{f.n}</span>
                  <span style={{ fontSize: 12, color: 'rgba(239,238,234,.62)' }}>{f.tag}</span>
                  <span
                    style={{
                      display: f.swDisp, height: 22, boxSizing: 'border-box', padding: 2, gap: 0,
                      borderRadius: 999, border: '1px solid rgba(239,238,234,.16)', fontSize: 12,
                      opacity: f.swOp, transition: 'opacity 200ms cubic-bezier(.23,1,.32,1)',
                    }}
                  >
                    <span
                      style={{
                        padding: '0 7px', borderRadius: 999, background: 'rgba(239,238,234,.16)',
                        display: 'grid', placeItems: 'center', lineHeight: 1,
                      }}
                    >
                      HTML
                    </span>
                    <span
                      style={{
                        padding: '0 7px', display: 'grid', placeItems: 'center', color: 'rgba(239,238,234,.62)',
                        lineHeight: 1,
                      }}
                    >
                      PNG
                    </span>
                    <span
                      style={{
                        padding: '0 7px', display: 'grid', placeItems: 'center', color: 'rgba(239,238,234,.62)',
                        lineHeight: 1,
                      }}
                    >
                      JPEG
                    </span>
                    <span
                      style={{
                        padding: '0 7px', display: 'grid', placeItems: 'center', color: 'rgba(239,238,234,.62)',
                        lineHeight: 1,
                      }}
                    >
                      Markdown
                    </span>
                  </span>
                </span>
            ))}
          </div>
          {/* Thumbnails of the real files, both built by the app's own exporters for this kit */}
          <div style={{ position: 'absolute', left: 16, right: 16, top: 168, height: 109 }}>
            <div
              style={{
                position: 'absolute', inset: 0, display: 'flex', gap: 8, opacity: v.kitOp, transition: v.kitTr,
              }}
            >
              <span
                style={{
                  position: 'relative', flex: 'none', width: 159, height: 109, overflow: 'hidden',
                  borderRadius: 8, background: '#FFFFFF',
                }}
              >
                <LoopImage
                  name="kit" width="1920" height="888"
                  style={{
                    position: 'absolute', left: 0, top: 0, display: 'block', maxWidth: 'none', width: 318,
                    height: 147,
                  }}
                />
                <i
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 8, outline: '1px solid oklch(1 0 0 / .1)',
                    outlineOffset: -1,
                  }}
                />
              </span>
              <span
                style={{
                  position: 'relative', flex: 'none', width: 159, height: 109, overflow: 'hidden',
                  borderRadius: 8, background: '#FFFFFF',
                }}
              >
                <LoopImage
                  name="kit" width="1920" height="888"
                  style={{
                    position: 'absolute', right: 0, top: 0, display: 'block', maxWidth: 'none', width: 318,
                    height: 147,
                  }}
                />
                <i
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 8, outline: '1px solid oklch(1 0 0 / .1)',
                    outlineOffset: -1,
                  }}
                />
              </span>
            </div>
            <div
              style={{
                position: 'absolute', inset: 0, display: 'flex', gap: 8, opacity: v.sgOp, transition: v.sgTr,
              }}
            >
              <LoopImage
                name="guide-1" width="635" height="898"
                style={{
                  display: 'block', flex: 'none', width: 159, height: 109, objectFit: 'cover',
                  objectPosition: 'top', borderRadius: 8, background: '#FFFFFF',
                  outline: '1px solid oklch(1 0 0 / .1)', outlineOffset: -1,
                }}
              />
              <LoopImage
                name="guide-2" width="635" height="898"
                style={{
                  display: 'block', flex: 'none', width: 159, height: 109, objectFit: 'cover',
                  objectPosition: 'top', borderRadius: 8, background: '#FFFFFF',
                  outline: '1px solid oklch(1 0 0 / .1)', outlineOffset: -1,
                }}
              />
            </div>
          </div>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 285, height: 44, borderRadius: 999,
              overflow: 'hidden', background: '#EFEEEA', color: '#0B0C0E', display: 'grid',
              placeItems: 'center', fontSize: 14, fontWeight: 500, opacity: v.goOp,
              transform: `scale(${v.goScale})`,
              transition: 'transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              style={{
                position: 'absolute', inset: 0, background: 'rgba(11,12,14,.14)', transformOrigin: '0 50%',
                transform: `scaleX(${v.prog})`, transition: `transform ${v.progMs}ms linear`,
              }}
            />
            <span style={{ position: 'relative' }}>{v.goLabel}</span>
          </span>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 285, height: 44, boxSizing: 'border-box',
              paddingLeft: 18, borderRadius: 999, background: 'rgba(239,238,234,.1)', display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 14, opacity: v.doneOp,
              transition: 'opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <svg
              aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#98B98C"
              strokeWidth="2.4" strokeLinecap="round"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            <span style={{ display: 'grid', gap: 2, lineHeight: 1.15 }}>
              Downloaded
              <span
                style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'rgba(239,238,234,.62)' }}
              >
                kerbside-style-guide.html
              </span>
            </span>
            <span
              style={{
                position: 'absolute', right: 4, top: 4, height: 36, padding: '0 16px', borderRadius: 999,
                background: v.openBg, display: 'grid', placeItems: 'center', fontWeight: 500,
                transform: `scale(${v.openScale})`,
                transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              Open
            </span>
          </span>
          {/* The saved style guide, opened: a sheet with its first three pages, rendered by the app's own exporter for this kit */}
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden',
              borderRadius: '18px 18px 0 0', background: '#F4F4F6', transform: `translateY(${v.guideY})`,
              transition: v.guideTr,
            }}
          >
            <span
              style={{
                position: 'absolute', left: 16, top: 16, fontFamily: "'Geist Mono', monospace", fontSize: 12,
                color: '#5F5F69',
              }}
            >
              kerbside-style-guide.html
            </span>
            <div
              style={{
                position: 'absolute', left: 16, top: 48, display: 'flex', gap: 12,
                transform: `translateX(${v.panX}px)`, transition: v.panTr,
              }}
            >
              <LoopImage
                name="guide-1" width="176" height="249"
                style={{
                  display: 'block', flex: 'none', width: 176, height: 249, background: '#FFFFFF',
                  boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                  transition: `opacity 280ms cubic-bezier(.23,1,.32,1) ${v.gD0}, transform 400ms cubic-bezier(.23,1,.32,1) ${v.gD0}`,
                }}
              />
              <LoopImage
                name="guide-2" width="176" height="249"
                style={{
                  display: 'block', flex: 'none', width: 176, height: 249, background: '#FFFFFF',
                  boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                  transition: `opacity 280ms cubic-bezier(.23,1,.32,1) ${v.gD1}, transform 400ms cubic-bezier(.23,1,.32,1) ${v.gD1}`,
                }}
              />
              <LoopImage
                name="guide-3" width="176" height="249"
                style={{
                  display: 'block', flex: 'none', width: 176, height: 249, background: '#FFFFFF',
                  boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                  transition: `opacity 280ms cubic-bezier(.23,1,.32,1) ${v.gD2}, transform 400ms cubic-bezier(.23,1,.32,1) ${v.gD2}`,
                }}
              />
            </div>
          </div>
        </div>
        {/* Icon Library, with the colour picker as a bottom sheet */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op2, transition: v.tr2,
          }}
        >
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 12, height: 40, boxSizing: 'border-box',
              padding: '0 14px', borderRadius: 999, border: `1px solid ${v.searchBorder}`, display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 14,
              transition: 'border-color 120ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <svg
              aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="rgba(239,238,234,.62)" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span style={{ color: v.searchC }}>{v.searchText}</span>
            <span
              style={{ width: 1.5, height: 18, marginLeft: -7, background: '#EFEEEA', opacity: v.searchCaret }}
            />
          </span>
          <div
            style={{
              position: 'absolute', left: 16, top: 64, width: 326, display: 'grid',
              gridTemplateColumns: 'repeat(5, 57px)', gap: 10,
            }}
          >
            {v.tiles.map((t, idx) => (
                <span key={idx}
                  style={{
                    height: 57, boxSizing: 'border-box', borderRadius: 14, border: `1px solid ${t.border}`,
                    display: 'grid', placeItems: 'center', opacity: t.op, transform: `scale(${t.sc})`,
                    transition: `opacity 200ms cubic-bezier(.23,1,.32,1) ${t.delay}, border-color 120ms ease, transform 120ms cubic-bezier(.23,1,.32,1)`,
                  }}
                >
                  <svg
                    aria-hidden="true" width="22" height="22" viewBox={t.vb} fill={t.fill} stroke={t.stroke}
                    strokeWidth={t.sw} strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d={t.d} fillRule={t.fr} />
                  </svg>
                </span>
            ))}
          </div>
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: 132, height: 172, opacity: v.custOp,
              transition: 'opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              style={{
                position: 'absolute', left: 16, top: 0, width: 132, height: 132, borderRadius: 18,
                background: '#16171A', display: 'grid', placeItems: 'center',
              }}
            >
              <svg
                aria-hidden="true" width="76" height="76" viewBox="0 0 24 24" fill="none" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"
                style={{
                  stroke: v.custColour, transform: `perspective(420px) rotateY(${v.flipDeg}deg)`,
                  transition: `transform 560ms cubic-bezier(.77,0,.175,1), stroke ${v.pkMs}ms linear`,
                }}
              >
                <path d={v.cupPath} />
              </svg>
            </span>
            <span
              style={{
                position: 'absolute', left: 16, top: 140, fontFamily: "'Geist Mono', monospace", fontSize: 12,
                color: 'rgba(239,238,234,.62)',
              }}
            >
              bike
            </span>
            <span
              style={{ position: 'absolute', left: 164, top: 4, fontSize: 12, color: 'rgba(239,238,234,.62)' }}
            >
              Colour
            </span>
            <span
              style={{
                position: 'absolute', left: 164, top: 24, width: 28, height: 28, borderRadius: 999,
                background: '#EFEEEA', boxShadow: v.whiteRing,
              }}
            />
            <span
              style={{
                position: 'absolute', left: 200, top: 24, width: 28, height: 28, borderRadius: 999,
                background: v.customBg, boxShadow: v.customRing, transform: `scale(${v.customScale})`,
                transition: `background-color ${v.pkMs}ms linear, transform 120ms cubic-bezier(.23,1,.32,1)`,
              }}
            />
            <span
              style={{
                position: 'absolute', left: 164, right: 16, top: 66, fontSize: 12,
                color: 'rgba(239,238,234,.62)',
              }}
            >
              Flip
            </span>
            <span
              role="group" aria-label="Flip"
              style={{
                position: 'absolute', left: 164, right: 16, top: 88, height: 36, display: 'flex', gap: 4,
              }}
            >
              <span
                style={{
                  flex: 1, boxSizing: 'border-box', borderRadius: 999, border: `1px solid ${v.flipHBorder}`,
                  background: v.flipHBg, color: v.flipHC, display: 'grid', placeItems: 'center', fontSize: 12,
                  transform: `scale(${v.flipHScale})`,
                  transition: 'background-color 150ms cubic-bezier(.23,1,.32,1), color 150ms cubic-bezier(.23,1,.32,1), border-color 150ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
                }}
              >
                Horizontal
              </span>
              <span
                style={{
                  flex: 1, boxSizing: 'border-box', borderRadius: 999,
                  border: '1px solid rgba(239,238,234,.12)', color: 'rgba(239,238,234,.72)', display: 'grid',
                  placeItems: 'center', fontSize: 12,
                }}
              >
                Vertical
              </span>
            </span>
            <span
              style={{
                position: 'absolute', left: 164, right: 16, top: 134, height: 36, borderRadius: 999,
                background: '#EFEEEA', color: '#0B0C0E', display: 'grid', placeItems: 'center', fontSize: 13,
                fontWeight: 500, transform: `scale(${v.copyScale})`,
                transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              {v.copyLabel}
            </span>
          </div>
          <div
            style={{
              position: 'absolute', inset: 0, background: 'rgba(6,6,7,.55)', opacity: v.pkOp,
              transition: 'opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          />
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: 99, height: 248, boxSizing: 'border-box',
              border: '1px solid rgba(239,238,234,.14)', borderBottom: 0, borderRadius: '22px 22px 0 0',
              background: '#18191C', transform: `translateY(${v.pkY})`,
              transition: 'transform 320ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              style={{
                position: 'absolute', left: '50%', top: 8, width: 36, height: 4, marginLeft: -18,
                borderRadius: 999, background: 'rgba(239,238,234,.24)',
              }}
            />
            <p
              style={{
                position: 'absolute', left: 16, top: 20, margin: 0, display: 'flex', alignItems: 'center',
                gap: 8, fontSize: 14, fontWeight: 600,
              }}
            >
              Icon colour
              <span
                style={{
                  width: 16, height: 16, borderRadius: 999, background: v.pkHex,
                  boxShadow: 'inset 0 0 0 1px rgba(239,238,234,.2)',
                  transition: `background-color ${v.pkMs}ms linear`,
                }}
              />
            </p>
            <span
              style={{
                position: 'absolute', right: 16, top: 14, width: 64, height: 30, borderRadius: 999,
                background: '#EFEEEA', color: '#0B0C0E', display: 'grid', placeItems: 'center', fontSize: 13,
                fontWeight: 500, transform: `scale(${v.doneScale})`,
                transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              Done
            </span>
            <span
              style={{
                position: 'absolute', left: 16, top: 58, width: 326, height: 96, borderRadius: 12,
                overflow: 'hidden', backgroundColor: v.pkHue, transition: `background-color ${v.pkMs}ms linear`,
              }}
            >
              <span
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to right, #FFFFFF, rgba(255,255,255,0))',
                }}
              />
              <span
                style={{
                  position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))',
                }}
              />
            </span>
            <span
              style={{
                position: 'absolute', left: `${v.pdX}px`, top: `${v.pdY}px`, width: 18, height: 18,
                margin: '-9px 0 0 -9px', boxSizing: 'border-box', borderRadius: 999,
                border: '2px solid #FFFFFF', background: v.pkHex, boxShadow: '0 1px 4px rgba(0,0,0,.5)',
                transition: `left ${v.pkMs}ms ${v.dEase}, top ${v.pkMs}ms ${v.dEase}, background-color ${v.pkMs}ms linear`,
              }}
            />
            <span
              style={{
                position: 'absolute', left: 16, top: 166, width: 326, height: 10, borderRadius: 999,
                background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
              }}
            />
            <span
              style={{
                position: 'absolute', left: `${v.hX}px`, top: 171, width: 18, height: 18,
                margin: '-9px 0 0 -9px', boxSizing: 'border-box', borderRadius: 999,
                border: '2px solid #FFFFFF', background: v.pkHue, boxShadow: '0 1px 4px rgba(0,0,0,.5)',
                transition: `left ${v.pkMs}ms ${v.dEase}, background-color ${v.pkMs}ms linear`,
              }}
            />
            <span
              style={{
                position: 'absolute', left: 16, top: 192, width: 220, height: 32, boxSizing: 'border-box',
                padding: '0 14px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: "'Geist Mono', monospace", fontSize: 13,
              }}
            >
              {v.pkHex}
              <span style={{ fontSize: 12, color: 'rgba(239,238,234,.62)' }}>HEX</span>
            </span>
          </div>
        </div>
        {/* Font Pair */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op3, transition: v.tr3,
          }}
        >
          <p
            style={{
              position: 'absolute', left: 16, right: 16, top: 16, margin: 0, fontFamily: v.headFont,
              fontWeight: v.headWeight, fontSize: 34, lineHeight: 1.06, letterSpacing: '-0.02em',
            }}
          >
            {v.specimen}
          </p>
          <p
            style={{
              position: 'absolute', left: 16, top: 146, margin: 0, fontSize: 12, color: 'rgba(239,238,234,.62)',
            }}
          >
            Heading family
          </p>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 166, height: 44, boxSizing: 'border-box',
              padding: '0 16px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
              background: v.famBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transform: `scale(${v.famScale})`,
              transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span style={{ fontFamily: v.headFont, fontWeight: v.headWeight, fontSize: 17 }}>{v.headName}</span>
            <span style={{ fontSize: 12, color: 'rgba(239,238,234,.62)' }}>{v.headMeta}</span>
          </span>
          <p
            style={{
              position: 'absolute', left: 16, top: 222, margin: 0, fontSize: 12, color: 'rgba(239,238,234,.62)',
            }}
          >
            Preview text
          </p>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 242, height: 44, boxSizing: 'border-box',
              padding: '0 16px', borderRadius: 999, border: `1px solid ${v.fieldBorder}`, display: 'flex',
              alignItems: 'center', fontSize: 15, transition: 'border-color 120ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span style={{ color: v.fieldC, whiteSpace: 'nowrap' }}>{v.fieldText}</span>
            <span
              style={{ width: 1.5, height: 18, marginLeft: 1, background: '#EFEEEA', opacity: v.caretOp }}
            />
          </span>
        </div>
        {/* Type Scale */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op4, transition: v.tr4,
          }}
        >
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 14, display: 'flex',
              justifyContent: 'space-between', fontSize: 12, color: 'rgba(239,238,234,.62)',
            }}
          >
            Scale ratio
            <span style={{ color: '#EFEEEA' }}>{v.ratioName}</span>
          </span>
          <div
            style={{
              position: 'absolute', left: 16, right: 16, top: 36, height: 44, padding: 4,
              boxSizing: 'border-box', borderRadius: 999, border: '1px solid rgba(239,238,234,.14)',
              display: 'flex', gap: 2,
            }}
          >
            {v.segs.map((g, idx) => (
                <span key={idx}
                  style={{
                    flex: 1, borderRadius: 999, background: g.bg, color: g.c, display: 'grid',
                    placeItems: 'center', fontFamily: "'Geist Mono', monospace", fontSize: 13,
                    transform: `scale(${g.sc})`,
                    transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
                  }}
                >
                  {g.n}
                </span>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 16, right: 16, top: 98 }}>
            {v.ladder.map((l, idx) => (
                <div key={idx}
                  style={{
                    height: 36, display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid rgba(239,238,234,.06)',
                  }}
                >
                  <span
                    style={{
                      width: 68, fontFamily: "'Geist Mono', monospace", fontSize: 12,
                      color: 'rgba(239,238,234,.62)',
                    }}
                  >
                    {l.tag}
                  </span>
                  <span
                    style={{
                      width: 28, fontFamily: "'Geist Mono', monospace", fontSize: 12.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {l.px}
                  </span>
                  <span
                    style={{
                      flex: 1, height: 8, borderRadius: 999, background: '#FF5A1F', transformOrigin: '0 50%',
                      transform: `scaleX(${l.sx})`, transition: 'transform 300ms cubic-bezier(.23,1,.32,1)',
                    }}
                  />
                </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute', left: 16, right: 16, top: 250, height: 79, borderRadius: 16,
              background: '#FFFFFF', color: '#1A1A1A', overflow: 'hidden',
            }}
          >
            <p
              style={{
                position: 'absolute', left: 16, top: 12, margin: 0, fontFamily: "'Archivo', sans-serif",
                fontWeight: 800, fontSize: 24, lineHeight: 1.02, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                transformOrigin: '0 0', transform: `scale(${v.hScale})`,
                transition: 'transform 300ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              Kerbside
            </p>
            <p
              style={{
                position: 'absolute', left: 16, top: 54, margin: 0, fontSize: 13,
                fontFamily: "'IBM Plex Sans', system-ui, sans-serif", color: '#6B6A66',
              }}
            >
              Across town before lunch.
            </p>
          </div>
        </div>
        {/* Alt Text Generator */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 97, bottom: 0, opacity: v.op5, transition: v.tr5,
          }}
        >
          <p
            style={{
              position: 'absolute', left: 16, right: 16, top: 8, margin: 0, fontSize: 11, lineHeight: 1.4,
              color: 'rgba(239,238,234,.62)',
            }}
          >
            Images you upload here are sent to Google Gemini to generate the text, and Google may use them to improve its products.
          </p>
          <span style={{ position: 'absolute', left: 16, top: 46, width: 132, height: 80, borderRadius: 10,
              overflow: 'hidden', background: '#3A3936' }}>
<LoopImage name="riders" width={1600} height={974} drawn={132} loading="lazy" fetchPriority="low" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
</span>
          <span
            style={{
              position: 'absolute', left: 160, top: 62, fontFamily: "'Geist Mono', monospace", fontSize: 13,
            }}
          >
            riders.jpg
          </span>
          <span
            style={{ position: 'absolute', left: 160, top: 86, fontSize: 12, color: 'rgba(239,238,234,.62)' }}
          >
            1600×974 · 268 KB
          </span>
          <p
            style={{
              position: 'absolute', left: 16, top: 132, margin: 0, fontSize: 12, color: 'rgba(239,238,234,.62)',
            }}
          >
            Page context
          </p>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 150, height: 36, boxSizing: 'border-box',
              padding: '0 16px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)', display: 'flex',
              alignItems: 'center', fontSize: 13.5, whiteSpace: 'nowrap',
            }}
          >
            Kerbside homepage
          </span>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 196, height: 40, borderRadius: 999,
              background: '#EFEEEA', color: '#0B0C0E', display: 'grid', placeItems: 'center', fontSize: 14,
              fontWeight: 500, transform: `scale(${v.genScale})`,
              transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            {v.genLabel}
          </span>
          <span
            style={{
              position: 'absolute', left: 16, right: 16, top: 244, height: 85, boxSizing: 'border-box',
              padding: '12px 14px', borderRadius: 16, border: `1px solid ${v.resBorder}`, background: '#111215',
              fontSize: 13, lineHeight: 1.5, transition: 'border-color 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              style={{ opacity: v.emptyOp, color: 'rgba(239,238,234,.62)', transition: 'opacity 120ms ease' }}
            >
              Alt text appears here.
            </span>
            <span style={{ position: 'absolute', left: 14, top: 14, right: 14, opacity: v.resOp }}>
              {v.resWords.map((rw, idx) => (
                <Fragment key={idx}>
                  <span
                    style={{
                      borderRadius: 4, background: rw.bg, boxShadow: rw.ring, color: rw.c,
                      transition: 'background-color 200ms cubic-bezier(.23,1,.32,1), box-shadow 200ms cubic-bezier(.23,1,.32,1), color 200ms cubic-bezier(.23,1,.32,1)',
                    }}
                  >
                    {rw.w}
                  </span>
                  {rw.tail}{rw.sp}
                </Fragment>
              ))}
            </span>
            <span
              style={{
                position: 'absolute', left: 14, top: 16, display: 'flex', flexDirection: 'column', gap: 9,
                opacity: v.shimOp, transition: 'opacity 120ms ease',
              }}
            >
              <span style={{ width: 260, height: 8, borderRadius: 999, background: 'rgba(239,238,234,.14)' }} />
              <span style={{ width: 220, height: 8, borderRadius: 999, background: 'rgba(239,238,234,.14)' }} />
              <span style={{ width: 150, height: 8, borderRadius: 999, background: 'rgba(239,238,234,.14)' }} />
            </span>
          </span>
        </div>
        {/* The finger: shown just before a tap, carried along a drag */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', zIndex: 7, left: `${v.tx}px`, top: `${v.ty}px`, width: 30, height: 30,
            margin: '-15px 0 0 -15px', boxSizing: 'border-box', borderRadius: 999,
            boxShadow: '0 0 0 1.5px rgba(255,255,255,.85), 0 0 0 3px rgba(11,12,14,.35)',
            background: 'rgba(255,255,255,.22)', opacity: v.dotOp,
            transition: `left ${v.dotMs}ms ${v.dEase}, top ${v.dotMs}ms ${v.dEase}, opacity 120ms cubic-bezier(.23,1,.32,1)`,
            pointerEvents: 'none',
          }}
        />
      </div>
      {/* Chapter strip: progress and navigation */}
      <div
        role="group" aria-label="Animation controls"
        style={{
          position: 'absolute', zIndex: 6, left: 0, right: 0, top: 52, height: 45, boxSizing: 'border-box',
          borderBottom: '1px solid rgba(239,238,234,.08)', background: '#0B0C0E', display: 'flex',
          alignItems: 'flex-start', padding: '0 4px',
        }}
      >
        <PhonePause loop={loop} v={v} />
        <span
          aria-hidden="true"
          style={{
            flex: 'none', display: v.pauseDisplay, width: 1, height: 20, margin: '12px 8px 0 8px',
            background: 'rgba(239,238,234,.16)',
          }}
        />
        <PhoneChapters loop={loop} v={v} />
      </div>
    </div>
  )
}

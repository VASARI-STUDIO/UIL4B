import { Fragment } from 'react'
import { buildLoopModel, useLoop } from './useLoop'
import { PANEL_LABEL, RESULTS, PK_FROM, PK_HUE, PK_TO, FIELD_KEYS, SEARCH_KEYS, ALT_WORDS, dragSteps, keyBeats, pickerPlacers } from './loopData'
import { deriveVals, stackedRows } from './loopVals'
import { ChapterButtons, ExportRows, LoopImage, NextButton, PauseButton } from './LoopParts'
import './hero-loop.css'

const PK_BOX = [822, 209]
const { padAt, hueAt } = pickerPlacers({ box: PK_BOX, padW: 216, padH: 96, hueY: 153 })
const HUE0 = hueAt(PK_FROM).map(Math.round)
const HUE1 = hueAt(PK_HUE).map(Math.round)
const PAD0 = padAt(PK_HUE).map(Math.round)
const PAD1 = padAt(PK_TO).map(Math.round)
const DISPLAY_X = 468 // the centre of the Display chip while the font dialog is open (measured)
const NEXT_XY = [923, 26]

// [scene, beat, ms, cursorX, cursorY, press]. Scenes: 0 palette, 1 font pair, 2 type scale, 3 icons, 4 export, 6 alt text.
const TL = [
  // Palette: randomise, lock the accent, randomise again (the lock holds), add a colour, open its tints.
  [0, 'p0', 800, 620, 330, 0],
  [0, 'goR1', 0, 270, 28, 0], [0, 'pR1', 200, 270, 28, 1], [0, 'h1', 650, 274, 31, 0],
  [0, 'goLock', 0, 334, 87, 0], [0, 'pLock', 200, 334, 87, 1], [0, 'h2', 450, 339, 92, 0],
  [0, 'goR2', 0, 270, 28, 0], [0, 'pR2', 200, 270, 28, 1], [0, 'h3', 600, 330, 150, 0],
  [0, 'goAdd', 0, 1114, 258, 0], [0, 'pAdd', 200, 1114, 258, 1], [0, 'h4', 450, 1060, 300, 0],
  [0, 'goStrip', 0, 137, 369, 0], [0, 'pStrip', 200, 137, 369, 1], [0, 'h5', 900, 304, 183, 0],
  [0, 'goN0', 0, ...NEXT_XY, 0], [0, 'pN0', 200, ...NEXT_XY, 1],

  // Icons: type the search, pick, recolour with the picker, flip, copy. The results filter a beat after the last key (q).
  [3, 'enter3', 300, ...NEXT_XY, 0],
  [3, 'goSearch', 0, 154, 93, 0], [3, 'pSearch', 300, 154, 93, 1],
  ...keyBeats(3, 's', 154, 93, SEARCH_KEYS),
  [3, 'q', 450, 156, 95, 0], [3, 'goCup', 0, 200, 161, 0], [3, 'pCup', 200, 200, 161, 1], [3, 'h13', 150, 500, 260, 0],
  [3, 'goColour', 0, 942, 187, 0], [3, 'pColour', 200, 942, 187, 1],
  [3, 'goHue', 0, ...HUE0, 0], [3, 'grabH', 120, ...HUE0, 2], ...dragSteps(3, 'dh', PK_FROM, PK_HUE, 320, 2, hueAt), [3, 'relH', 100, ...HUE1, 0],
  [3, 'goPad', 0, ...PAD0, 0], [3, 'grabP', 120, ...PAD0, 2], ...dragSteps(3, 'dp', PK_HUE, PK_TO, 390, 3, padAt), [3, 'relP', 200, ...PAD1, 0],
  [3, 'goShut', 0, 744, 177, 0], [3, 'pShut', 200, 744, 177, 1], [3, 'h14', 150, 747, 180, 0],
  [3, 'goFlip', 0, 704, 335, 0], [3, 'pFlip', 200, 704, 335, 1], [3, 'h15', 600, 716, 384, 0],
  [3, 'goCopy', 0, 910, 387, 0], [3, 'pCopy', 200, 910, 387, 1], [3, 'h16', 450, 913, 384, 0],
  [3, 'goN1', 0, ...NEXT_XY, 0], [3, 'pN1', 200, ...NEXT_XY, 1],

  // Type: the heading font, previewed with the brand's name, then Next to the scale and base size.
  [1, 'enter1', 300, ...NEXT_XY, 0],
  [1, 'goHead', 0, 954, 133, 0], [1, 'pHead', 200, 954, 133, 1], [1, 'h7', 250, 900, 170, 0],
  [1, 'goDisp', 0, DISPLAY_X, 181, 0], [1, 'pDisp', 200, DISPLAY_X, 181, 1],
  [1, 'goFr', 0, 354, 258, 0], [1, 'pFr', 200, 354, 258, 1], [1, 'h8', 300, 600, 220, 0],
  [1, 'goField', 0, 954, 327, 0], [1, 'pField', 200, 954, 327, 1],
  ...keyBeats(1, 'k', 954, 327, FIELD_KEYS),
  [1, 'h9', 450, 990, 370, 0],
  [1, 'goN2', 0, ...NEXT_XY, 0], [1, 'pN2', 200, ...NEXT_XY, 1],
  [2, 'enter2', 250, ...NEXT_XY, 0],
  [2, 'goDrop', 0, 134, 93, 0], [2, 'pDrop', 200, 134, 93, 1], [2, 'hov3', 0, 150, 320, 0], [2, 'pPick', 200, 150, 320, 1],
  [2, 'h10', 300, 700, 240, 0],
  [2, 'goThumb', 0, 410, 93, 0], [2, 'grab', 120, 410, 93, 2], [2, 'drag', 500, 390, 93, 2], [2, 'rel', 120, 390, 93, 0],
  [2, 'h11', 650, 760, 300, 0],
  [2, 'goN3', 0, ...NEXT_XY, 0], [2, 'pN3', 200, ...NEXT_XY, 1],

  // Alt text: generate, read it, keywords marked, copy. Then the kit is done and Export appears.
  [6, 'enter6', 300, ...NEXT_XY, 0],
  [6, 'goGen', 0, 724, 377, 0], [6, 'pGen', 200, 724, 377, 1], [6, 'gen', 800, 730, 386, 0],
  ...ALT_WORDS.map((w, i) => [6, 'w' + i, 40 + (i % 3) * 10, 730, 386, 0]), [6, 'hAlt', 800, 520, 300, 0],
  [6, 'goCopy6', 0, 477, 339, 0], [6, 'pCopy6', 200, 477, 339, 1], [6, 'h6c', 650, 560, 360, 0],
  [6, 'goExp', 0, 1068, 28, 0],

  // Export, last: the finished kit, saved as one style guide, then opened from its file chip and held long enough to read.
  [4, 'pExp', 200, 1068, 28, 1], [4, 'h17', 650, 700, 120, 0],
  [4, 'goSG', 0, 230, 176, 0], [4, 'pSG', 200, 230, 176, 1], [4, 'h18', 750, 400, 300, 0],
  [4, 'goGo', 0, 160, 407, 0], [4, 'pGo', 200, 160, 407, 1], [4, 'prog', 750, 168, 413, 0], [4, 'done', 900, 240, 421, 0],
  [4, 'goOpen', 0, 995, 105, 0], [4, 'pOpen', 200, 995, 105, 1], [4, 'guide', 4200, 1050, 150, 0],

  // Seam: the panel returns to the opening Palette, the same frame the loop restarts on.
  [0, 'pEnd', 600, 620, 330, 0],
];

const MODEL = buildLoopModel({
  timeline: TL,
  chapters: [
    { name: 'Palette', first: 'p0', end: 'h5' },
    { name: 'Icons', first: 'enter3', end: 'h16' },
    { name: 'Type', first: 'enter1', end: 'h11' },
    { name: 'Alt text', first: 'enter6', end: 'h6c' },
    { name: 'Export', first: 'pExp', end: 'guide' },
  ],
  extraSteps: [{ name: 'Type scale', beat: 'enter2' }],
  settle: 4,
})

const GEO = {
  picker: { box: PK_BOX, padAt, hueAt },
  next: NEXT_XY,
  tileW: 176,
  icons: { count: 32, shown: RESULTS.length, browse: 32, perRow: 8 },
  rows: stackedRows({ row: 30, gap: 4, run: 16, shift: 32 }),
  bars: { base: 180, size: 256 },
}
const EXPORT_ROW = { width: 340, height: 30, padX: 14, gap: 10, font: 13, dot: 14, dotIn: 6, tagH: 18, tagPadX: 8, tagFont: 10.5 }

export default function LoopStandard({ active }) {
  const loop = useLoop(MODEL, { active })
  const v = deriveVals(loop, MODEL, GEO)
  return (
    <div
      className={`lp-root ${v.rootClass}`} aria-label={PANEL_LABEL} role="group" {...loop.rootProps}
      style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 17, background: '#0B0C0E', color: '#EFEEEA',
        fontFamily: "'Geist', system-ui, sans-serif", boxSizing: 'border-box',
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
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, height: 56,
          borderBottom: '1px solid rgba(239,238,234,.08)', zIndex: 3, background: '#0B0C0E',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', left: 12, top: 10, width: 36, height: 36, borderRadius: 999,
            border: '1px solid rgba(239,238,234,.14)', display: 'grid', placeItems: 'center',
          }}
        >
          <svg
            aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
            strokeWidth="2" strokeLinecap="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </span>
        <span
          style={{
            position: 'absolute', left: 56, top: 10, height: 36, padding: '0 16px', borderRadius: 999,
            border: '1px solid rgba(239,238,234,.14)', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: 14, height: 14, borderRadius: 999, background: v.toolDot,
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
          aria-hidden="true"
          style={{
            position: 'absolute', left: 200, top: 10, width: 140, height: 36, boxSizing: 'border-box',
            padding: '0 14px', borderRadius: 999, border: '1px solid rgba(239,238,234,.14)',
            background: v.actionBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13.5, opacity: v.actionOp, transform: `scale(${v.actionScale})`,
            transition: `background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1) ${v.actionDelay}`,
          }}
        >
          {v.actionName}
          <kbd
            style={{
              fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '.06em',
              color: 'rgba(239,238,234,.6)', opacity: v.kbdOp,
            }}
          >
            SPACE
          </kbd>
        </span>
        <div
          role="group" aria-label="Animation controls"
          style={{ position: 'absolute', left: 352, top: 6, height: 44, display: 'flex', alignItems: 'center' }}
        >
          <PauseButton loop={loop} v={v} box={{ width: 84, height: 44 }} />
          <span
            aria-hidden="true"
            style={{
              flex: 'none', width: 1, height: 20, margin: '0 6px 0 4px', background: 'rgba(239,238,234,.16)',
            }}
          />
          <ChapterButtons loop={loop} v={v} box={{ width: 72, height: 44, marginLeft: 4 }} />
          <span
            aria-hidden="true"
            style={{
              flex: 'none', width: 1, height: 20, margin: '0 8px 0 10px', background: 'rgba(239,238,234,.16)',
            }}
          />
          <NextButton loop={loop} v={v} box={{ flex: 'none', width: 160, height: 36 }} />
        </div>
        <div style={{ position: 'absolute', right: 12, top: 10, display: 'flex', gap: 8 }}>
          <span
            aria-hidden="true"
            style={{
              position: 'relative', width: 100, height: 36, boxSizing: 'border-box', borderRadius: 999,
              border: '1px solid rgba(239,238,234,.14)', background: v.exportBg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13.5, opacity: v.exportOp,
              transform: `scale(${v.exportScale})`,
              transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <svg
              aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
              strokeWidth="2" strokeLinecap="round"
            >
              <path d="M12 15V3M7 8l5-5 5 5M5 21h14" />
            </svg>
            Export
          </span>
        </div>
      </div>
      <div aria-hidden="true">
        {/* Palette */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op0, transition: v.tr0,
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 44, display: 'flex' }}>
            {v.columns.map((c, idx) => (
                <div key={idx}
                  style={{
                    flex: `${c.grow} 1 0`, minWidth: 0, position: 'relative', overflow: 'hidden',
                    transition: c.growTr,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute', inset: 0, background: c.bg, color: c.fg,
                      transform: `translateY(${c.ty})`, opacity: c.op, transition: c.tr, display: 'flex',
                      flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 4,
                      paddingBottom: 24,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 999,
                        background: c.lockBg, display: 'grid', placeItems: 'center', opacity: c.lockOp,
                        transform: `scale(${c.lockScale})`,
                        transition: `opacity 200ms ease-out ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1), background 200ms ease`,
                      }}
                    >
                      <svg
                        aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c.fg}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ position: 'absolute', opacity: c.openOp, transition: 'opacity 150ms ease' }}
                      >
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 7.5-2" />
                      </svg>
                      <svg
                        aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill={c.fg} stroke={c.fg}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ position: 'absolute', opacity: c.shutOp, transition: 'opacity 150ms ease' }}
                      >
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" />
                      </svg>
                    </span>
                    <span
                      style={{
                        display: 'flex', gap: 3, marginBottom: 12, padding: '5px 8px', borderRadius: 12,
                        boxShadow: c.stripRing, transform: `scale(${c.stripScale})`,
                        transition: `box-shadow 200ms ease ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1)`,
                      }}
                    >
                      <span
                        style={{
                          width: 9, height: 26, borderRadius: 999, background: c.r0,
                          transition: `background 600ms ease ${c.delay}`,
                        }}
                      />
                      <span
                        style={{
                          width: 9, height: 26, borderRadius: 999, background: c.r1,
                          transition: `background 600ms ease ${c.delay}`,
                        }}
                      />
                      <span
                        style={{
                          width: 9, height: 26, borderRadius: 999, background: c.r2,
                          transition: `background 600ms ease ${c.delay}`,
                        }}
                      />
                      <span
                        style={{
                          width: 9, height: 26, borderRadius: 999, background: c.r3,
                          transition: `background 600ms ease ${c.delay}`,
                        }}
                      />
                      <span
                        style={{
                          width: 9, height: 26, borderRadius: 999, background: c.r4,
                          transition: `background 600ms ease ${c.delay}`,
                        }}
                      />
                    </span>
                    <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 14, whiteSpace: 'nowrap' }}>{c.hex}</span>
                    <span style={{ fontSize: 12.5, opacity: 0.8, whiteSpace: 'nowrap' }}>{c.role}</span>
                  </div>
                </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 44,
              borderLeft: '1px solid rgba(239,238,234,.08)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, background: v.addBg,
              transition: 'background 150ms ease-out',
            }}
          >
            <span
              style={{
                width: 30, height: 30, borderRadius: 999, border: '1px solid rgba(239,238,234,.2)',
                display: 'grid', placeItems: 'center', transform: `scale(${v.addScale})`,
                transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              <svg
                aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
                strokeWidth="2.2" strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace", fontSize: 9.5, letterSpacing: '.08em',
                color: 'rgba(239,238,234,.6)',
              }}
            >
              ADD
            </span>
          </div>
          <div
            style={{
              position: 'absolute', left: 196, top: 16, width: 232, boxSizing: 'border-box', padding: 8,
              borderRadius: 20, border: '1px solid rgba(239,238,234,.14)', background: '#141518',
              boxShadow: '0 18px 48px rgba(0,0,0,.45)', opacity: v.tintOp, transform: `scale(${v.tintScale})`,
              transformOrigin: '0 100%',
              transition: 'opacity 200ms cubic-bezier(.23,1,.32,1), transform 220ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <p
              style={{
                margin: 0, height: 32, padding: '0 10px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', fontSize: 13, fontWeight: 600,
              }}
            >
              Tints
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace", fontSize: 11, fontWeight: 400,
                  color: 'rgba(239,238,234,.6)',
                }}
              >
                {v.tintBase}
              </span>
            </p>
            {v.tints.map((t, idx) => (
                <span key={idx}
                  style={{
                    height: 25, padding: '0 6px 0 10px', borderRadius: 999, display: 'flex',
                    alignItems: 'center', gap: 10, fontSize: 12, background: t.hl,
                    transition: `background 150ms ease ${v.hd}`,
                  }}
                >
                  <span
                    style={{ width: 34, fontFamily: "'Geist Mono', monospace", color: 'rgba(239,238,234,.6)' }}
                  >
                    {t.tone}
                  </span>
                  <span style={{ flex: 1, height: 15, borderRadius: 999, background: t.c }} />
                  <span style={{ width: 64, fontFamily: "'Geist Mono', monospace", textAlign: 'right' }}>{t.c}</span>
                </span>
            ))}
            <span
              style={{
                marginTop: 6, height: 32, borderRadius: 999, border: '1px solid rgba(239,238,234,.14)',
                display: 'grid', placeItems: 'center', fontSize: 12.5,
              }}
            >
              Open in Tint Generator
            </span>
          </div>
        </div>
        {/* Font Pair */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op1, transition: v.tr1,
          }}
        >
          <div style={{ position: 'absolute', left: 40, top: 22, display: 'flex', gap: 6 }}>
            <span
              style={{
                height: 30, padding: '0 14px', borderRadius: 999, background: '#EFEEEA', color: '#0B0C0E',
                display: 'grid', placeItems: 'center', fontSize: 12.5,
              }}
            >
              Article
            </span>
            <span
              style={{
                height: 30, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(239,238,234,.14)',
                display: 'grid', placeItems: 'center', fontSize: 12.5, color: 'rgba(239,238,234,.72)',
              }}
            >
              Product page
            </span>
            <span
              style={{
                height: 30, padding: '0 14px', borderRadius: 999, border: '1px solid rgba(239,238,234,.14)',
                display: 'grid', placeItems: 'center', fontSize: 12.5, color: 'rgba(239,238,234,.72)',
              }}
            >
              Letterforms
            </span>
          </div>
          <div
            style={{
              position: 'absolute', left: 40, width: 680, top: 76, display: 'flex', flexDirection: 'column',
              gap: 22,
            }}
          >
            <p
              style={{
                margin: 0, fontFamily: v.headFont, fontWeight: v.headWeight, fontSize: 54, lineHeight: 1.04,
                letterSpacing: '-0.02em', minHeight: 169, textWrap: 'balance',
              }}
            >
              {v.specimen}
            </p>
            <p
              style={{
                margin: 0, width: 560, fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: 15,
                lineHeight: 1.6, color: 'rgba(239,238,234,.72)',
              }}
            >
              Book a pickup, track the rider, and see the time it was delivered. Set the heading face, then read it at the size people will see it.
            </p>
          </div>
          <div
            style={{
              position: 'absolute', left: 768, top: 0, bottom: 0, right: 0,
              borderLeft: '1px solid rgba(239,238,234,.08)',
            }}
          >
            <p
              style={{
                position: 'absolute', left: 20, top: 22, margin: 0, fontSize: 12, color: 'rgba(239,238,234,.6)',
              }}
            >
              Heading family
            </p>
            <span
              style={{
                position: 'absolute', left: 20, top: 44, width: 332, height: 64, boxSizing: 'border-box',
                padding: '0 18px 0 22px', borderRadius: 999, border: `1px solid ${v.headBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transform: `scale(${v.headScale})`,
                transition: `transform 120ms cubic-bezier(.23,1,.32,1), border-color 150ms ease ${v.hd}`,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{ fontFamily: v.headFont, fontWeight: v.headWeight, fontSize: 20, lineHeight: 1.1 }}
                >
                  {v.headName}
                </span>
                <span style={{ fontSize: 11.5, color: 'rgba(239,238,234,.6)' }}>{v.headMeta}</span>
              </span>
              <span style={{ fontSize: 12, color: 'rgba(239,238,234,.68)' }}>Browse</span>
            </span>
            <p
              style={{
                position: 'absolute', left: 20, top: 122, margin: 0, fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Body family
            </p>
            <span
              style={{
                position: 'absolute', left: 20, top: 144, width: 332, height: 64, boxSizing: 'border-box',
                padding: '0 18px 0 22px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 18, fontWeight: 500, lineHeight: 1.1,
                  }}
                >
                  IBM Plex Sans
                </span>
                <span style={{ fontSize: 11.5, color: 'rgba(239,238,234,.6)' }}>Sans · 7 weights</span>
              </span>
              <span style={{ fontSize: 12, color: 'rgba(239,238,234,.68)' }}>Browse</span>
            </span>
            <p
              style={{
                position: 'absolute', left: 20, top: 226, margin: 0, fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Preview text
            </p>
            <span
              style={{
                position: 'absolute', left: 20, top: 248, width: 332, height: 44, boxSizing: 'border-box',
                padding: '0 18px', borderRadius: 999, border: `1px solid ${v.fieldBorder}`, display: 'flex',
                alignItems: 'center', fontSize: 15, transition: 'border-color 150ms ease',
              }}
            >
              <span style={{ color: v.fieldC, whiteSpace: 'nowrap' }}>{v.fieldText}</span>
              <span
                className={v.caretClass}
                style={{ width: 1.5, height: 18, marginLeft: 1, background: '#EFEEEA', opacity: v.caretOp }}
              />
            </span>
          </div>
          <div
            style={{
              position: 'absolute', inset: 0, background: `rgba(6,6,7,${v.dlgScrim})`,
              transition: 'background 220ms ease', pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute', left: 228, top: 13, width: 680, height: 360, boxSizing: 'border-box',
              borderRadius: 24, border: '1px solid rgba(239,238,234,.14)', background: '#141518',
              boxShadow: '0 24px 64px rgba(0,0,0,.5)', opacity: v.dlgOp, transform: `scale(${v.dlgScale})`,
              transformOrigin: '726px 76px',
              transition: 'opacity 200ms cubic-bezier(.23,1,.32,1), transform 240ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <p style={{ position: 'absolute', left: 24, top: 18, margin: 0, fontSize: 15, fontWeight: 600 }}>
              Heading family
            </p>
            <span
              style={{
                position: 'absolute', left: 24, top: 48, width: 400, height: 36, boxSizing: 'border-box',
                padding: '0 16px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(239,238,234,.6)',
              }}
            >
              <svg
                aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              Search font families
            </span>
            <div style={{ position: 'absolute', left: 24, top: 96, display: 'flex', gap: 6 }}>
              {v.chips.map((ch, idx) => (
                  <span key={idx}
                    style={{
                      height: 30, padding: '0 14px', borderRadius: 999, boxSizing: 'border-box',
                      border: '1px solid rgba(239,238,234,.14)', background: ch.bg, color: ch.c,
                      display: 'grid', placeItems: 'center', fontSize: 12.5, transform: `scale(${ch.sc})`,
                      transition: 'background 150ms ease, color 150ms ease, transform 120ms cubic-bezier(.23,1,.32,1)',
                    }}
                  >
                    {ch.n}
                  </span>
              ))}
            </div>
            <div
              style={{
                position: 'absolute', left: 24, top: 140, width: 636, display: 'grid',
                gridTemplateColumns: 'repeat(3, 204px)', gap: 12,
              }}
            >
              {v.tiles.map((ti, idx) => (
                  <span key={idx}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 7, transform: `scale(${ti.sc})`,
                      transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
                    }}
                  >
                    <span
                      style={{
                        height: 66, boxSizing: 'border-box', padding: '0 14px', borderRadius: 14,
                        border: `1px solid ${ti.border}`, background: ti.bg, display: 'flex',
                        alignItems: 'center', overflow: 'hidden',
                        transition: `background 150ms ease ${v.hd}, border-color 150ms ease ${v.hd}`,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: ti.font, fontWeight: ti.w, fontSize: `${ti.size}px`, lineHeight: 1.1,
                          whiteSpace: 'nowrap', opacity: ti.op, transition: `opacity 260ms ease ${ti.delay}`,
                        }}
                      >
                        {ti.name}
                      </span>
                    </span>
                    <span
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '0 2px 0 4px',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 12, lineHeight: 1.2, color: '#EFEEEA', whiteSpace: 'nowrap' }}>
                          {ti.name}
                        </span>
                        <span style={{ fontSize: 10.5, lineHeight: 1.2, color: 'rgba(239,238,234,.55)' }}>{ti.meta}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          flex: 'none', width: 22, height: 22, boxSizing: 'border-box', borderRadius: 999,
                          border: '1px solid rgba(239,238,234,.2)', display: 'grid', placeItems: 'center',
                        }}
                      >
                        <svg
                          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(239,238,234,.75)"
                          strokeWidth="2.5" strokeLinecap="round"
                        >
                          <path d="M12 11v7M12 6.5v.5" />
                        </svg>
                      </span>
                    </span>
                  </span>
              ))}
            </div>
          </div>
        </div>
        {/* Type Scale */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op2, transition: v.tr2,
          }}
        >
          <span
            style={{
              position: 'absolute', left: 24, top: 16, width: 220, height: 40, boxSizing: 'border-box',
              padding: '0 16px', borderRadius: 999, border: `1px solid ${v.dropBorder}`, display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5,
              transform: `scale(${v.dropScale})`,
              transition: `transform 120ms cubic-bezier(.23,1,.32,1), border-color 150ms ease ${v.hd}`,
            }}
          >
            {v.ratioLabel}
            <svg
              aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
              strokeWidth="2"
            >
              <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
            </svg>
          </span>
          <span
            style={{ position: 'absolute', left: 268, top: 27, fontSize: 12.5, color: 'rgba(239,238,234,.6)' }}
          >
            Base size
          </span>
          <span
            style={{
              position: 'absolute', left: 340, top: 34, width: 180, height: 4, borderRadius: 999,
              background: 'rgba(239,238,234,.16)',
            }}
          >
            <span
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 180, borderRadius: 999,
                background: '#EFEEEA', transformOrigin: '0 50%', transform: `scaleX(${v.baseFill})`,
                transition: `transform ${v.dragMs}ms cubic-bezier(.45,.05,.2,1)`,
              }}
            />
            <span
              style={{
                position: 'absolute', top: -8, left: -10, width: 20, height: 20, borderRadius: 999,
                background: '#EFEEEA', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                transform: `translateX(${v.baseX}px) scale(${v.thumbScale})`,
                transition: `transform ${v.dragMs}ms cubic-bezier(.45,.05,.2,1)`,
              }}
            />
          </span>
          <span
            style={{
              position: 'absolute', left: 534, top: 26, fontFamily: "'Geist Mono', monospace", fontSize: 12.5,
            }}
          >
            {v.baseLabel}
          </span>
          <div
            style={{
              position: 'absolute', right: 24, top: 16, height: 40, padding: 4, boxSizing: 'border-box',
              borderRadius: 999, border: '1px solid rgba(239,238,234,.14)', display: 'flex', gap: 2,
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                padding: '0 14px', borderRadius: 999, background: '#EFEEEA', color: '#0B0C0E', display: 'grid',
                placeItems: 'center',
              }}
            >
              Desktop
            </span>
            <span
              style={{
                padding: '0 14px', borderRadius: 999, display: 'grid', placeItems: 'center',
                color: 'rgba(239,238,234,.72)',
              }}
            >
              Tablet · 768px
            </span>
            <span
              style={{
                padding: '0 14px', borderRadius: 999, display: 'grid', placeItems: 'center',
                color: 'rgba(239,238,234,.72)',
              }}
            >
              Mobile · 375px
            </span>
          </div>
          <div style={{ position: 'absolute', left: 24, top: 80, width: 420 }}>
            {v.ladder.map((l, idx) => (
                <div key={idx}
                  style={{
                    height: 48, display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid rgba(239,238,234,.06)',
                  }}
                >
                  <span
                    style={{
                      width: 92, fontFamily: "'Geist Mono', monospace", fontSize: 12,
                      color: 'rgba(239,238,234,.6)',
                    }}
                  >
                    {l.tag}
                  </span>
                  <span style={{ width: 48, fontFamily: "'Geist Mono', monospace", fontSize: 12.5 }}>{l.px}</span>
                  <span
                    style={{
                      width: 240, height: 10, borderRadius: 999, background: '#FF5A1F',
                      transformOrigin: '0 50%', transform: `scaleX(${l.sx})`,
                      transition: `transform 700ms cubic-bezier(.23,1,.32,1) ${l.delay}`,
                    }}
                  />
                </div>
            ))}
          </div>
          <div
            style={{
              position: 'absolute', left: 468, right: 24, top: 80, bottom: 16, borderRadius: 22,
              background: '#FFFFFF', color: '#1A1A1A', overflow: 'hidden',
            }}
          >
            <p
              style={{
                position: 'absolute', left: 32, top: 26, margin: 0, fontFamily: "'Geist Mono', monospace",
                fontSize: 11, letterSpacing: '.08em', color: '#6B6A66',
              }}
            >
              --text-xl · {v.h1Label}
            </p>
            <div
              style={{
                position: 'absolute', left: 32, right: 32, top: 50, display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', gap: 16,
              }}
            >
              <p
                style={{
                  margin: 0, fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: `${v.h1Px}px`,
                  lineHeight: 1.02, letterSpacing: '-0.02em',
                  transition: 'font-size 300ms cubic-bezier(.23,1,.32,1)',
                }}
              >
                Kerbside
              </p>
              <p
                style={{
                  margin: 0, fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: `${v.bodyPx}px`,
                  lineHeight: 1.55, color: '#6B6A66', transition: 'font-size 300ms cubic-bezier(.23,1,.32,1)',
                }}
              >
                Book a pickup, track the rider, and see the time it was delivered.
              </p>
              <p
                style={{
                  margin: '6px 0 0', fontFamily: "'Archivo', sans-serif", fontWeight: 800,
                  fontSize: `${v.h4Px}px`, color: '#1A1A1A',
                  transition: 'font-size 300ms cubic-bezier(.23,1,.32,1)',
                }}
              >
                Across town before lunch.
              </p>
            </div>
          </div>
          <div
            style={{
              position: 'absolute', left: 24, top: 60, width: 240, boxSizing: 'border-box', padding: 4,
              borderRadius: 20, border: '1px solid rgba(239,238,234,.14)', background: '#141518',
              boxShadow: '0 18px 48px rgba(0,0,0,.45)', opacity: v.menuOp, transform: `scale(${v.menuScale})`,
              transformOrigin: '110px 0',
              transition: 'opacity 180ms cubic-bezier(.23,1,.32,1), transform 200ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            {v.ratios.map((r, idx) => (
                <span key={idx}
                  style={{
                    height: 36, padding: '0 14px', borderRadius: 999, display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', fontSize: 13, background: r.hl,
                    transition: `background 120ms ease ${v.hd}`,
                  }}
                >
                  {r.n}
                  <span
                    style={{
                      fontFamily: "'Geist Mono', monospace", fontSize: 12, color: 'rgba(239,238,234,.6)',
                    }}
                  >
                    {r.v}
                    <span style={{ marginLeft: 8, opacity: r.tick }}>✓</span>
                  </span>
                </span>
            ))}
          </div>
        </div>
        {/* Icon Library (stays behind the export dialog) */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op3, transition: v.tr3,
          }}
        >
          <span
            style={{
              position: 'absolute', left: 24, top: 16, width: 260, height: 40, boxSizing: 'border-box',
              padding: '0 16px', borderRadius: 999, border: `1px solid ${v.searchBorder}`, display: 'flex',
              alignItems: 'center', gap: 8, fontSize: 13.5, transition: 'border-color 150ms ease',
            }}
          >
            <svg
              aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="rgba(239,238,234,.6)" strokeWidth="2" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span style={{ color: v.searchC }}>{v.searchText}</span>
            <span
              className={v.searchCaretClass}
              style={{ width: 1.5, height: 16, marginLeft: -7, background: '#EFEEEA', opacity: v.searchCaret }}
            />
          </span>
          <div
            style={{
              position: 'absolute', left: 300, top: 16, height: 40, padding: 4, boxSizing: 'border-box',
              borderRadius: 999, border: '1px solid rgba(239,238,234,.14)', display: 'flex', gap: 2,
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                width: 72, borderRadius: 999, background: '#EFEEEA', color: '#0B0C0E', display: 'grid',
                placeItems: 'center',
              }}
            >
              Regular
            </span>
            <span
              style={{
                width: 72, borderRadius: 999, display: 'grid', placeItems: 'center',
                color: 'rgba(239,238,234,.72)',
              }}
            >
              Bold
            </span>
            <span
              style={{
                width: 72, borderRadius: 999, display: 'grid', placeItems: 'center',
                color: 'rgba(239,238,234,.72)',
              }}
            >
              Fill
            </span>
            <span
              style={{
                width: 72, borderRadius: 999, display: 'grid', placeItems: 'center',
                color: 'rgba(239,238,234,.72)',
              }}
            >
              Duo
            </span>
          </div>
          <div
            style={{
              position: 'absolute', left: 24, top: 72, display: 'grid', gridTemplateColumns: 'repeat(8, 64px)',
              gap: 8,
            }}
          >
            {v.icons.map((i, idx) => (
                <span key={idx}
                  style={{
                    height: 64, borderRadius: 18, border: `1px solid ${i.border}`, background: i.bg,
                    display: 'grid', placeItems: 'center', opacity: i.op, transform: `scale(${i.sc})`,
                    transition: `opacity 200ms cubic-bezier(.23,1,.32,1) ${i.delay}, transform 200ms cubic-bezier(.23,1,.32,1) ${i.delay}, border-color 150ms ease ${v.hd}, background 150ms ease ${v.hd}`,
                  }}
                >
                  <svg
                    aria-hidden="true" width="24" height="24" viewBox={i.vb} fill={i.fill} stroke={i.stroke}
                    strokeWidth={i.sw} strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d={i.d} fillRule={i.fr} />
                  </svg>
                </span>
            ))}
          </div>
          <p
            style={{
              position: 'absolute', left: 640, right: 16, top: 190, margin: 0, textAlign: 'center',
              fontSize: 13, color: 'rgba(239,238,234,.5)', opacity: v.hintOp, transition: 'opacity 200ms ease',
            }}
          >
            Pick an icon to customise it
          </p>
          <div
            style={{
              position: 'absolute', left: 640, right: 16, top: 16, bottom: 16, borderRadius: 22,
              border: '1px solid rgba(239,238,234,.12)', background: '#111215', opacity: v.custOp,
              transform: `translateX(${v.custX}px)`,
              transition: 'opacity 260ms cubic-bezier(.23,1,.32,1), transform 320ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              style={{
                position: 'absolute', left: 24, top: 24, width: 160, height: 160, borderRadius: 18,
                background: 'rgba(239,238,234,.04)', display: 'grid', placeItems: 'center',
              }}
            >
              <svg
                aria-hidden="true" width="92" height="92" viewBox="0 0 24 24" fill="none" stroke={v.custColour}
                strokeWidth={v.custStroke} strokeLinecap={v.capType} strokeLinejoin={v.joinType}
                style={{
                  transform: `perspective(480px) rotateY(${v.flipDeg}deg)`,
                  transition: `transform 560ms cubic-bezier(.77,0,.175,1), stroke ${v.pkMs}ms linear, stroke-width 200ms ease`,
                }}
              >
                <path d={v.cupPath} />
              </svg>
            </span>
            <p
              style={{
                position: 'absolute', left: 24, top: 196, margin: 0, fontFamily: "'Geist Mono', monospace",
                fontSize: 12, color: 'rgba(239,238,234,.6)',
              }}
            >
              bike
            </p>
            <p
              style={{
                position: 'absolute', left: 24, width: 160, top: 222, margin: 0, fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Flip
            </p>
            <div
              role="group" aria-label="Flip"
              style={{ position: 'absolute', left: 24, top: 244, width: 160, display: 'flex', gap: 2 }}
            >
              <span
                style={{
                  width: 79, height: 36, boxSizing: 'border-box', borderRadius: 999,
                  border: `1px solid ${v.flipHBorder}`, background: v.flipHBg, color: v.flipHC, display: 'grid',
                  placeItems: 'center', fontSize: 12, transform: `scale(${v.flipHScale})`,
                  transition: `background 150ms ease, color 150ms ease, border-color 150ms ease ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1)`,
                }}
              >
                Horizontal
              </span>
              <span
                style={{
                  width: 79, height: 36, boxSizing: 'border-box', borderRadius: 999,
                  border: `1px solid ${v.flipVBorder}`, background: v.flipVBg, color: v.flipVC, display: 'grid',
                  placeItems: 'center', fontSize: 12, transform: `scale(${v.flipVScale})`,
                  transition: `background 150ms ease, color 150ms ease, border-color 150ms ease ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1)`,
                }}
              >
                Vertical
              </span>
            </div>
            <p
              style={{
                position: 'absolute', left: 208, top: 24, right: 16, margin: 0, display: 'flex',
                justifyContent: 'space-between', fontSize: 12, color: 'rgba(239,238,234,.6)',
              }}
            >
              Size
              <span style={{ fontFamily: "'Geist Mono', monospace", color: '#EFEEEA' }}>{v.sizeLabel}</span>
            </p>
            <span
              style={{
                position: 'absolute', left: 208, top: 50, width: 256, height: 4, borderRadius: 999,
                background: 'rgba(239,238,234,.16)',
              }}
            >
              <span
                style={{
                  position: 'absolute', inset: 0, borderRadius: 999, background: '#EFEEEA',
                  transformOrigin: '0 50%', transform: `scaleX(${v.sizeFill})`,
                  transition: `transform ${v.sizeMs}ms cubic-bezier(.45,.05,.2,1)`,
                }}
              />
              <span
                style={{
                  position: 'absolute', top: -8, left: -10, width: 20, height: 20, borderRadius: 999,
                  background: '#EFEEEA', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                  transform: `translateX(${v.sizeX}px) scale(${v.sizeThumb})`,
                  transition: `transform ${v.sizeMs}ms cubic-bezier(.45,.05,.2,1)`,
                }}
              />
            </span>
            <p
              style={{
                position: 'absolute', left: 208, top: 78, margin: 0, fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Colour
            </p>
            <div style={{ position: 'absolute', left: 216, top: 100, display: 'flex', gap: 8 }}>
              <span
                style={{
                  width: 28, height: 28, borderRadius: 999, background: '#EFEEEA', boxShadow: v.whiteRing,
                  transition: 'box-shadow 200ms ease',
                }}
              />
              <span
                style={{
                  width: 28, height: 28, borderRadius: 999, background: '#0B0C0E',
                  border: '1px solid rgba(239,238,234,.2)', boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  width: 28, height: 28, borderRadius: 999, background: v.customBg, boxShadow: v.customRing,
                  transform: `scale(${v.customScale})`,
                  transition: 'background 300ms ease, box-shadow 200ms ease, transform 120ms cubic-bezier(.23,1,.32,1)',
                }}
              />
            </div>
            <p
              style={{
                position: 'absolute', left: 208, top: 144, right: 16, margin: 0, display: 'flex',
                justifyContent: 'space-between', fontSize: 12, color: 'rgba(239,238,234,.6)',
              }}
            >
              Stroke
              <span style={{ fontFamily: "'Geist Mono', monospace", color: '#EFEEEA' }}>{v.strokeLabel}</span>
            </p>
            <span
              style={{
                position: 'absolute', left: 208, top: 170, width: 256, height: 4, borderRadius: 999,
                background: 'rgba(239,238,234,.16)',
              }}
            >
              <span
                style={{
                  position: 'absolute', inset: 0, borderRadius: 999, background: '#EFEEEA',
                  transformOrigin: '0 50%', transform: `scaleX(${v.strokeFill})`,
                  transition: `transform ${v.strokeMs}ms cubic-bezier(.45,.05,.2,1)`,
                }}
              />
              <span
                style={{
                  position: 'absolute', top: -8, left: -10, width: 20, height: 20, borderRadius: 999,
                  background: '#EFEEEA', boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                  transform: `translateX(${v.strokeX}px) scale(${v.strokeThumb})`,
                  transition: `transform ${v.strokeMs}ms cubic-bezier(.45,.05,.2,1)`,
                }}
              />
            </span>
            <p
              style={{
                position: 'absolute', left: 208, top: 192, right: 16, margin: 0, display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Line style
              <span
                style={{
                  height: 18, padding: '0 8px', borderRadius: 999, background: 'rgba(239,238,234,.1)',
                  color: '#EFEEEA', fontSize: 10.5, display: 'grid', placeItems: 'center',
                }}
              >
                Pro
              </span>
            </p>
            <span
              style={{
                position: 'absolute', left: 208, top: 220, fontSize: 12, color: 'rgba(239,238,234,.72)',
              }}
            >
              Ends
            </span>
            <div style={{ position: 'absolute', left: 260, top: 214, display: 'flex', gap: 2 }}>
              {v.ends.map((e, idx) => (
                  <span key={idx}
                    style={{
                      width: 66, height: 28, borderRadius: 999, boxSizing: 'border-box',
                      border: `1px solid ${e.border}`, background: e.bg, color: e.c, display: 'grid',
                      placeItems: 'center', fontSize: 11.5, transform: `scale(${e.sc})`,
                      transition: `background 150ms ease, color 150ms ease, border-color 150ms ease ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1)`,
                    }}
                  >
                    <svg
                      aria-label={e.n} width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="5"
                    >
                      <line x1="7" y1="12" x2="17" y2="12" strokeLinecap={e.v} />
                    </svg>
                  </span>
              ))}
            </div>
            <span
              style={{
                position: 'absolute', left: 208, top: 256, fontSize: 12, color: 'rgba(239,238,234,.72)',
              }}
            >
              Corners
            </span>
            <div style={{ position: 'absolute', left: 260, top: 250, display: 'flex', gap: 2 }}>
              {v.corners.map((o, idx) => (
                  <span key={idx}
                    style={{
                      width: 66, height: 28, borderRadius: 999, boxSizing: 'border-box',
                      border: `1px solid ${o.border}`, background: o.bg, color: o.c, display: 'grid',
                      placeItems: 'center', fontSize: 11.5, transform: `scale(${o.sc})`,
                      transition: `background 150ms ease, color 150ms ease, border-color 150ms ease ${v.hd}, transform 120ms cubic-bezier(.23,1,.32,1)`,
                    }}
                  >
                    <svg
                      aria-label={o.n} width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="4"
                    >
                      <path d="M6 18 L12 7 L18 18" strokeLinejoin={o.v} />
                    </svg>
                  </span>
              ))}
            </div>
            <span
              style={{
                position: 'absolute', left: 208, top: 294, width: 124, height: 40, borderRadius: 999,
                background: '#EFEEEA', color: '#0B0C0E', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 500,
                transform: `scale(${v.copyScale})`, transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              {v.copyLabel}
            </span>
            <span
              style={{
                position: 'absolute', left: 340, top: 294, width: 124, height: 40, boxSizing: 'border-box',
                borderRadius: 999, border: '1px solid rgba(239,238,234,.16)', display: 'grid',
                placeItems: 'center', fontSize: 13,
              }}
            >
              Save to project
            </span>
            <div
              style={{
                position: 'absolute', zIndex: 3, left: 182, top: 136, width: 240, height: 210,
                boxSizing: 'border-box', borderRadius: 18, border: '1px solid rgba(239,238,234,.14)',
                background: '#18191C', boxShadow: '0 18px 40px rgba(0,0,0,.55)', opacity: v.pkOp,
                transform: `scale(${v.pkScale})`, transformOrigin: '120px -10px',
                transition: 'opacity 200ms cubic-bezier(.23,1,.32,1), transform 200ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              <p
                style={{
                  position: 'absolute', left: 12, right: 12, top: 10, margin: 0, display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                Icon colour
                <span
                  style={{
                    width: 16, height: 16, borderRadius: 999, background: v.pkHex,
                    boxShadow: 'inset 0 0 0 1px rgba(239,238,234,.2)',
                    transition: `background ${v.pkMs}ms linear`,
                  }}
                />
              </p>
              <span
                style={{
                  position: 'absolute', left: 12, top: 40, width: 216, height: 96, borderRadius: 10,
                  overflow: 'hidden', backgroundColor: v.pkHue,
                  transition: `background-color ${v.pkMs}ms linear`,
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
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, #000000, rgba(0,0,0,0))',
                  }}
                />
              </span>
              <span
                style={{
                  position: 'absolute', left: `${v.pdX}px`, top: `${v.pdY}px`, width: 14, height: 14,
                  margin: '-7px 0 0 -7px', boxSizing: 'border-box', borderRadius: 999,
                  border: '2px solid #FFFFFF', background: v.pkHex, boxShadow: '0 1px 4px rgba(0,0,0,.5)',
                  transition: `left ${v.pkMs}ms ${v.dEase}, top ${v.pkMs}ms ${v.dEase}, background ${v.pkMs}ms linear`,
                }}
              />
              <span
                style={{
                  position: 'absolute', left: 12, top: 148, width: 216, height: 10, borderRadius: 999,
                  background: 'linear-gradient(to right, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)',
                }}
              />
              <span
                style={{
                  position: 'absolute', left: `${v.hX}px`, top: 153, width: 14, height: 14,
                  margin: '-7px 0 0 -7px', boxSizing: 'border-box', borderRadius: 999,
                  border: '2px solid #FFFFFF', background: v.pkHue, boxShadow: '0 1px 4px rgba(0,0,0,.5)',
                  transition: `left ${v.pkMs}ms ${v.dEase}, background-color ${v.pkMs}ms linear`,
                }}
              />
              <span
                style={{
                  position: 'absolute', left: 12, top: 170, width: 164, height: 28, boxSizing: 'border-box',
                  padding: '0 12px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
                  display: 'flex', alignItems: 'center', fontFamily: "'Geist Mono', monospace", fontSize: 12,
                }}
              >
                {v.pkHexText}
              </span>
              <span
                style={{
                  position: 'absolute', left: 182, top: 170, width: 46, height: 28, boxSizing: 'border-box',
                  borderRadius: 999, background: 'rgba(239,238,234,.08)', display: 'grid', placeItems: 'center',
                  fontFamily: "'Geist Mono', monospace", fontSize: 10.5, color: 'rgba(239,238,234,.72)',
                }}
              >
                HEX
              </span>
            </div>
          </div>
        </div>
        {/* Alt Text Generator */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op6, transition: v.tr6,
          }}
        >
          <p
            style={{
              position: 'absolute', left: 24, top: 16, width: 572, margin: 0, fontSize: 11.5, lineHeight: 1.45,
              color: 'rgba(239,238,234,.55)',
            }}
          >
            Images you upload here are sent to Google Gemini to generate the text, and Google may use them to improve its products.
          </p>
          <div
            style={{
              position: 'absolute', left: 24, top: 68, width: 572, height: 320, boxSizing: 'border-box',
              padding: 16, borderRadius: 22, border: '1px solid rgba(239,238,234,.12)', background: '#111215',
              display: 'flex', gap: 20, opacity: v.card6Op, transform: `translateY(${v.card6Y})`,
              transition: 'opacity 300ms ease, transform 420ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <span
              className="lp-photo"
              style={{
                position: 'relative', display: 'block', flex: 'none', width: 240, height: 146, borderRadius: 14,
                overflow: 'hidden',
              }}
            />
            <div
              style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}
            >
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13 }}>riders.jpg</span>
              <span style={{ fontSize: 12.5, color: 'rgba(239,238,234,.6)' }}>1600×974 · 268 KB</span>
              <span
                style={{
                  position: 'relative', marginTop: 10, minHeight: 112, boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 18, border: `1px solid ${v.resBorder}`, fontSize: 14,
                  lineHeight: 1.5, transition: 'border-color 200ms ease',
                }}
              >
                <span style={{ opacity: v.resOp }}>
                  {v.resWords.map((rw, idx) => (
                    <Fragment key={idx}>
                      <span
                        style={{
                          borderRadius: 4, background: rw.bg, boxShadow: rw.ring, color: rw.c,
                          transition: `background 300ms ease ${rw.delay}, box-shadow 300ms ease ${rw.delay}, color 300ms ease ${rw.delay}`,
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
                    position: 'absolute', left: 14, top: 14, display: 'flex', flexDirection: 'column', gap: 8,
                    opacity: v.shimOp, transition: 'opacity 200ms ease',
                  }}
                >
                  <span className="shim" style={{ width: 236, height: 10, borderRadius: 999 }} />
                  <span className="shim" style={{ width: 196, height: 10, borderRadius: 999 }} />
                  <span className="shim" style={{ width: 140, height: 10, borderRadius: 999 }} />
                </span>
              </span>
              <span
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, opacity: v.resActOp,
                  transition: 'opacity 250ms ease',
                }}
              >
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(239,238,234,.6)' }}>
                  <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 11.5 }}>{v.charCount}</span>
                  chars
                </span>
                <span
                  style={{
                    height: 32, padding: '0 16px', borderRadius: 999, background: '#EFEEEA', color: '#0B0C0E',
                    display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 500,
                    transform: `scale(${v.copy6Scale})`,
                    transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
                  }}
                >
                  {v.copy6Label}
                </span>
                <span
                  style={{
                    height: 32, padding: '0 16px', boxSizing: 'border-box', borderRadius: 999,
                    border: '1px solid rgba(239,238,234,.16)', display: 'grid', placeItems: 'center',
                    fontSize: 12.5,
                  }}
                >
                  Retry
                </span>
              </span>
            </div>
          </div>
          <div
            style={{
              position: 'absolute', left: 620, top: 0, bottom: 0, right: 0,
              borderLeft: '1px solid rgba(239,238,234,.08)',
            }}
          >
            <p
              style={{
                position: 'absolute', left: 24, top: 44, margin: 0, fontSize: 12, color: 'rgba(239,238,234,.6)',
              }}
            >
              Page context
            </p>
            <span
              style={{
                position: 'absolute', left: 24, top: 64, width: 444, height: 40, boxSizing: 'border-box',
                padding: '0 16px', borderRadius: 999, border: '1px solid rgba(239,238,234,.16)',
                display: 'flex', alignItems: 'center', fontSize: 13.5,
              }}
            >
              <span style={{ whiteSpace: 'nowrap' }}>{v.ctxText}</span>
            </span>
            <p
              style={{
                position: 'absolute', left: 24, top: 124, margin: 0, fontSize: 12,
                color: 'rgba(239,238,234,.6)',
              }}
            >
              Length
            </p>
            <div style={{ position: 'absolute', left: 24, top: 144, display: 'flex', gap: 6, fontSize: 12.5 }}>
              <span
                style={{
                  height: 32, padding: '0 16px', borderRadius: 999, background: '#EFEEEA', color: '#0B0C0E',
                  display: 'grid', placeItems: 'center',
                }}
              >
                Concise
              </span>
              <span
                style={{
                  height: 32, padding: '0 16px', boxSizing: 'border-box', borderRadius: 999,
                  border: '1px solid rgba(239,238,234,.14)', display: 'grid', placeItems: 'center',
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                Detailed
              </span>
              <span
                style={{
                  height: 32, padding: '0 16px', boxSizing: 'border-box', borderRadius: 999,
                  border: '1px solid rgba(239,238,234,.14)', display: 'grid', placeItems: 'center',
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                Technical
              </span>
            </div>
            <span
              style={{
                position: 'absolute', left: 24, top: 300, width: 160, height: 40, borderRadius: 999,
                background: '#EFEEEA', color: '#0B0C0E', display: 'grid', placeItems: 'center', fontSize: 13.5,
                fontWeight: 500, transform: `scale(${v.genScale})`,
                transition: 'transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              {v.genLabel}
            </span>
          </div>
        </div>
        {/* Export */}
        <div
          className="lp-scene"
          style={{
            position: 'absolute', left: 0, right: 0, top: 57, bottom: 0, opacity: v.op4, transition: v.tr4,
          }}
        >
          <p
            style={{
              position: 'absolute', left: 24, top: 22, margin: 0, fontFamily: "'Geist Mono', monospace",
              fontSize: 11, letterSpacing: '.08em', color: 'rgba(239,238,234,.6)',
            }}
          >
            EXPORT
          </p>
          <p style={{ position: 'absolute', left: 24, top: 40, margin: 0, fontSize: 17, fontWeight: 600 }}>
            Export your design system
          </p>
          <div style={{ position: 'absolute', left: 24, top: 70, width: 340, height: 248 }}>
            <ExportRows rows={v.formats} m={EXPORT_ROW} />
            {/* The Style guide row's switch: its formats, as the app shows them under the chosen row (option labels from exportFormats.js) */}
            <div
              style={{
                position: 'absolute', left: 38, top: 68, height: 28, boxSizing: 'border-box', padding: 2,
                borderRadius: 999, border: '1px solid rgba(239,238,234,.12)', display: 'flex',
                alignItems: 'stretch', fontSize: 12, opacity: v.swOp, transform: `translateY(${v.swY}px)`,
                transition: 'opacity 200ms ease-out 60ms, transform 220ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              <span
                style={{
                  height: '100%', padding: '0 12px', borderRadius: 999, display: 'grid', placeItems: 'center',
                  background: '#EFEEEA', color: '#0B0C0E',
                }}
              >
                HTML
              </span>
              <span
                style={{
                  height: '100%', padding: '0 12px', borderRadius: 999, display: 'grid', placeItems: 'center',
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                PNG
              </span>
              <span
                style={{
                  height: '100%', padding: '0 12px', borderRadius: 999, display: 'grid', placeItems: 'center',
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                JPEG
              </span>
              <span
                style={{
                  height: '100%', padding: '0 12px', borderRadius: 999, display: 'grid', placeItems: 'center',
                  color: 'rgba(239,238,234,.72)',
                }}
              >
                Markdown
              </span>
            </div>
          </div>
          <span
            style={{
              position: 'absolute', left: 24, top: 330, width: 224, height: 40, borderRadius: 999,
              overflow: 'hidden', background: '#EFEEEA', color: '#0B0C0E', display: 'grid',
              placeItems: 'center', fontSize: 13.5, fontWeight: 500, opacity: v.goOp,
              transform: `scale(${v.goScale})`,
              transition: 'transform 120ms cubic-bezier(.23,1,.32,1), opacity 250ms ease',
            }}
          >
            <span
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%',
                background: 'rgba(11,12,14,.14)', transformOrigin: '0 50%', transform: `scaleX(${v.prog})`,
                transition: `transform ${v.progMs}ms linear`,
              }}
            />
            <span style={{ position: 'relative' }}>{v.goLabel}</span>
          </span>
          <span
            style={{
              position: 'absolute', left: 24, top: 330, width: 340, height: 40, borderRadius: 999,
              background: 'rgba(239,238,234,.1)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, fontSize: 13.5, opacity: v.doneOp,
              transform: `translateY(${v.doneY})`,
              transition: 'opacity 300ms ease-out, transform 400ms cubic-bezier(.23,1,.32,1)',
            }}
          >
            <svg
              aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
              strokeWidth="2.4" strokeLinecap="round"
            >
              <path d="M5 12l5 5L20 7" />
            </svg>
            Downloaded kerbside-style-guide.html
          </span>
          <span
            style={{
              position: 'absolute', left: 258, top: 330, height: 40, padding: '0 16px', display: 'grid',
              placeItems: 'center', fontSize: 13.5, color: 'rgba(239,238,234,.72)', opacity: v.goOp,
              transition: 'opacity 250ms ease',
            }}
          >
            Cancel
          </span>
          <div
            style={{
              position: 'absolute', left: 388, top: 20, right: 24, bottom: 20, borderRadius: 18,
              background: '#1B1C20', overflow: 'hidden',
            }}
          >
            {/* The format previews, both built by the app's own exporters for this kit: the top of the free UI kit, and the style guide's cover */}
            <div style={{ position: 'absolute', inset: 0, opacity: v.kitOp, transition: v.kitTr }}>
              <LoopImage
                name="kit" width="674" height="312"
                style={{
                  position: 'absolute', left: 24, top: 50, width: 674, height: 312, display: 'block',
                  borderRadius: '10px 10px 0 0',
                }}
              />
            </div>
            <div style={{ position: 'absolute', inset: 0, opacity: v.sgOp, transition: v.sgTr }}>
              <LoopImage
                name="guide-1" width="204" height="288"
                style={{
                  position: 'absolute', left: '50%', top: 50, width: 204, height: 288, marginLeft: -102,
                  display: 'block', background: '#FFFFFF', boxShadow: '0 8px 24px rgba(0,0,0,.35)',
                  transform: `translateY(${v.sgY})`,
                  transition: 'transform 420ms cubic-bezier(.23,1,.32,1) 100ms',
                }}
              />
            </div>
            {/* The saved style guide, opened from its file chip: its first three pages, rendered by the app's own exporter for this kit */}
            <div
              style={{
                position: 'absolute', inset: 0, background: '#F4F4F6', opacity: v.guideOp,
                transform: `scale(${v.guideSc})`, transformOrigin: '84% 8%', transition: v.guideTr,
              }}
            >
              <div
                style={{
                  position: 'absolute', left: 0, right: 0, top: 50, display: 'flex', justifyContent: 'center',
                  gap: 14,
                }}
              >
                <LoopImage
                  name="guide-1" width="204" height="288"
                  style={{
                    display: 'block', flex: 'none', width: 204, height: 288, background: '#FFFFFF',
                    boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                    transition: `opacity 300ms cubic-bezier(.23,1,.32,1) ${v.gD0}, transform 420ms cubic-bezier(.23,1,.32,1) ${v.gD0}`,
                  }}
                />
                <LoopImage
                  name="guide-2" width="204" height="288"
                  style={{
                    display: 'block', flex: 'none', width: 204, height: 288, background: '#FFFFFF',
                    boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                    transition: `opacity 300ms cubic-bezier(.23,1,.32,1) ${v.gD1}, transform 420ms cubic-bezier(.23,1,.32,1) ${v.gD1}`,
                  }}
                />
                <LoopImage
                  name="guide-3" width="204" height="288"
                  style={{
                    display: 'block', flex: 'none', width: 204, height: 288, background: '#FFFFFF',
                    boxShadow: '0 1px 7px rgba(16,16,20,.12)', opacity: v.gOp, transform: `translateY(${v.gY})`,
                    transition: `opacity 300ms cubic-bezier(.23,1,.32,1) ${v.gD2}, transform 420ms cubic-bezier(.23,1,.32,1) ${v.gD2}`,
                  }}
                />
              </div>
            </div>
            <span
              style={{
                position: 'absolute', right: 14, top: 14, height: 28, padding: '0 12px', borderRadius: 999,
                background: v.chipBg, boxShadow: v.chipRing, color: '#EFEEEA', display: 'flex',
                alignItems: 'center', gap: 6, fontFamily: "'Geist Mono', monospace", fontSize: 11,
                transform: `scale(${v.chipScale})`,
                transition: 'background-color 120ms cubic-bezier(.23,1,.32,1), box-shadow 120ms cubic-bezier(.23,1,.32,1), transform 120ms cubic-bezier(.23,1,.32,1)',
              }}
            >
              <svg
                aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EFEEEA"
                strokeWidth="2.4" strokeLinecap="round"
                style={{
                  flex: 'none', width: `${v.tickW}px`, marginRight: `${v.tickM}px`, opacity: v.fileTick,
                  transition: 'width 150ms cubic-bezier(.23,1,.32,1), margin-right 150ms cubic-bezier(.23,1,.32,1), opacity 150ms ease 100ms',
                }}
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
              {v.fileName}
            </span>
          </div>
        </div>
        <svg
          aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"
          style={{
            position: 'absolute', zIndex: 6, left: `${v.cx}px`, top: `${v.cy}px`, opacity: v.cOp,
            transform: `scale(${v.cScale})`, transformOrigin: '2px 2px',
            transition: `left ${v.cMs}ms ${v.cEx}, top ${v.cMs}ms ${v.cEy}, transform 120ms cubic-bezier(.23,1,.32,1), opacity 200ms cubic-bezier(.23,1,.32,1)`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.5))',
          }}
        >
          <path
            d="M3 2l17 9.5-7.4 1.6L9 20z" fill="#FFFFFF" stroke="#0B0C0E" strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

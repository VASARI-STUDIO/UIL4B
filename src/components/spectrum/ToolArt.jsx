import { CREATE_GROUPS } from '../../data/toolTree'
import { LIBRARY_GRADIENT_ROWS } from '../../data/gradientLibrary'
import { buildRamp } from '../../utils/tintRamp'
import { hexToOklchRaw } from '../tool/oklch'
import { STROKE_PX } from '../../utils/iconStroke'
import { DEFAULT_EXPORT_SIZE } from '../../utils/iconSize'
import { BASES } from './spectrumKit'
import { ICON_PLATE } from './toolArtIcons'
import measured from './toolMeasured.json'

// The drawn plate for a tool: one artefact, in the tool's category colour, built
// from the same helpers the tools use. Plates are decoration (aria-hidden); the
// link around one names the tool. Literal values (a ratio, a size, a saving) sit
// in .v so a page can restyle them.

const HUE = Object.fromEntries(CREATE_GROUPS.flatMap((g) => g.tools.map((t) => [t.id, g.hue])))

// Icon Library: 6 x 3 grid on a 36px pitch, the picked cell on a tile. The size and
// stroke are the tool's own defaults; the hover shows the next stroke stop it offers.
const PITCH = 36
const PICK = 2
const ICON_SIZE = DEFAULT_EXPORT_SIZE
const STROKE_REST = STROKE_PX.default
const STROKE_HOVER = STROKE_PX.snaps.find((s) => s > STROKE_REST) ?? STROKE_REST + STROKE_PX.step
const PICK_NAME = ICON_PLATE[PICK][0]

// File Converter: the saving and the bar fractions come from the measured run.
const { source, output } = measured.fileConverter
const KEPT = output.kb / source.kb
const SAVED = Math.round((1 - KEPT) * 100)
// Bar geometry is in percent of the bar's width. The removed part's outline starts
// TUCK under the kept bar so its open left side never shows, and stops INSET short of
// the right edge so the dashed stroke is not clipped by the svg.
const TUCK = 0.02
const INSET = 0.002
const pct = (f) => `${(f * 100).toFixed(2)}%`
const fmtKb = (kb) => `${kb.toFixed(1)} KB`

// Tint: the Tint tool's own nine-step ramp off the colour it opens with.
const [, TINT_C, TINT_H] = hexToOklchRaw(BASES[0].color)
const TINT = buildRamp(TINT_H, TINT_C, 9, 0)

// Gradient: the library's first gradient with stops, as an SVG gradient on the
// same CSS angle rule (the line runs corner to corner of the box).
const GRAD = LIBRARY_GRADIENT_ROWS.find((g) => g.stops)
const GRAD_BOX = { x: 22, y: 20, w: 116, h: 38 }
function gradientLine({ x, y, w, h }, deg) {
  const a = (deg * Math.PI) / 180
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))
  const dx = (Math.sin(a) * len) / 2
  const dy = (-Math.cos(a) * len) / 2
  const cx = x + w / 2
  const cy = y + h / 2
  return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy }
}
const GRAD_LINE = gradientLine(GRAD_BOX, GRAD.angle)

// Aspect & Resolution: three frames sharing one corner; widths follow the ratios.
const FRAMES = [['16:9', 55], ['4:5', 50], ['1:1', 45]].map(([label, h]) => {
  const [a, b] = label.split(':').map(Number)
  return { label, h, w: Math.round((h * a) / b) }
})

function Plate({ id, size, children }) {
  return (
    <div className={`spt-art spt-art--${size}`} data-hue={HUE[id]} data-art={id} aria-hidden="true">
      {children}
    </div>
  )
}

function Label({ children, ink, v, cls = "" }) {
  return <span className={`spt-lab${ink ? " spt-ink" : ""}${v ? " v" : ""} ${cls}`.trim()}>{children}</span>
}

function Icons() {
  return (
    <div className="spt-ic">
      <svg className="spt-ic-grid" viewBox="-8 -8 218 136" preserveAspectRatio="xMidYMid meet">
        <g className="spt-ln">
          <rect className="spt-mix" x={PICK * PITCH - 6} y="-6" width="36" height="36" rx="9" />
          {ICON_PLATE.map(([name, d], i) => (
            <path key={name} d={d} className={i === PICK ? 'spt-hs' : undefined} transform={`translate(${(i % 6) * PITCH} ${Math.floor(i / 6) * 48})`} />
          ))}
        </g>
      </svg>
      <div className="spt-ic-pick">
        <svg className="spt-pick" viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}>
          <path className="spt-i1" d={ICON_PLATE[PICK][1]} strokeWidth={STROKE_REST} />
          <path className="spt-i2" d={ICON_PLATE[PICK][1]} strokeWidth={STROKE_HOVER} />
        </svg>
        <div className="spt-meta">
          <Label ink>{PICK_NAME}</Label>
          <span className="spt-swap">
            <span className="spt-lab spt-l1"><span className="v">{ICON_SIZE}px</span> · stroke <span className="v">{STROKE_REST}</span></span>
            <span className="spt-lab spt-l2"><span className="v">{ICON_SIZE}px</span> · stroke <span className="v">{STROKE_HOVER}</span></span>
          </span>
        </div>
      </div>
    </div>
  )
}

function Converter() {
  return (
    <div className="spt-fc">
      <div className="spt-fc-top">
        <span className="spt-big v">−{SAVED}%</span>
        <Label>smaller, same pixels</Label>
      </div>
      <div className="spt-fc-bars">
        <div>
          <div className="spt-fc-lab"><Label ink>Original {source.format}</Label><Label ink v>{fmtKb(source.kb)}</Label></div>
          <svg className="spt-fc-svg" width="100%" height="16">
            <rect className="spt-bar1" width="100%" height="16" rx="4" />
          </svg>
        </div>
        <div>
          <div className="spt-fc-lab"><Label ink>{output.format}, quality {output.quality}</Label><Label ink v>{fmtKb(output.kb)}</Label></div>
          <svg className="spt-fc-svg" width="100%" height="16">
            <defs>
              <pattern id="spt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" /></pattern>
            </defs>
            <rect className="spt-ghost" x={pct(KEPT - TUCK)} y=".5" width={pct(1 - KEPT + TUCK - INSET)} height="15" rx="4" fill="url(#spt-hatch)" />
            <rect className="spt-cut" x={pct(KEPT - TUCK)} width={pct(1 - KEPT + TUCK)} height="16" rx="4" />
            <rect className="spt-bar2" width={pct(KEPT)} height="16" rx="4" />
          </svg>
        </div>
      </div>
    </div>
  )
}

const ROLES = [['--ok', 26], ['--warn', 43], ['--err', 58], ['--accent', 75]]

function Semantic() {
  return (
    <svg viewBox="0 0 160 100">
      <circle className="spt-fill" cx="40" cy="50" r="14" />
      <path className="spt-ln" d={ROLES.map(([, y]) => `M54 50C80 50 84 ${y} 104 ${y}`).join('')} />
      {ROLES.map(([token, y]) => <rect key={token} className={`spt-role spt-role${token}`} x="104" y={y - 6} width="28" height="12" rx="6" />)}
    </svg>
  )
}

function Tint() {
  return (
    <svg viewBox="0 0 160 100">
      {TINT.map((s, i) => {
        const base = i === 4
        return <rect key={s.label} className={base ? 'spt-base' : 'spt-step'} fill={s.hex} x={17 + i * 14} y={base ? 28 : 34} width="12" height={base ? 44 : 32} rx="3" />
      })}
    </svg>
  )
}

function Gradient() {
  const { x, y, w, h } = GRAD_BOX
  const last = GRAD.stops.length - 1
  return (
    <svg viewBox="0 0 160 100">
      <defs>
        <linearGradient id="spt-grad" gradientUnits="userSpaceOnUse" {...GRAD_LINE}>
          {GRAD.stops.map((s) => <stop key={s.position} offset={s.position / 100} stopColor={s.color} />)}
        </linearGradient>
      </defs>
      <rect className="spt-gbar" x={x} y={y} width={w} height={h} rx="8" fill="url(#spt-grad)" />
      <path className="spt-ln" d={`M${x} 78h${w}`} />
      {GRAD.stops.map((s, i) => <circle key={s.position} className="spt-gstop" cx={x + (w * s.position) / 100} cy="78" r="6" fill={s.color} data-end={i === 0 || i === last ? '' : undefined} />)}
    </svg>
  )
}

function FontPair() {
  return (
    <svg viewBox="0 0 160 100">
      <path className="spt-rule" d="M22 70h116" />
      <text className="spt-ft-a" x="28" y="70">Ag</text>
      <text className="spt-ft-b" x="94" y="70">Ag</text>
    </svg>
  )
}

const EMOJI = ['🎨', '✏️', '🚀']

function Emoji() {
  return (
    <>
      <svg viewBox="0 0 160 100"><rect className="spt-mix" x="58" y="28" width="44" height="44" rx="10" /></svg>
      <span className="spt-emo">{EMOJI.map((e) => <span key={e}>{e}</span>)}</span>
    </>
  )
}

function Ratio({ size }) {
  const x = 30
  const base = 86
  return (
    <>
      <svg viewBox="0 0 160 100">
        {FRAMES.map((f, i) => (
          <rect key={f.label} className={i === 0 ? 'spt-fr spt-fr-pick' : 'spt-fr spt-ln'} x={x} y={base - f.h} width={f.w} height={f.h} rx="3" />
        ))}
      </svg>
      {size === 'thumb' && <span className="spt-lab v spt-fr-lab">{FRAMES[0].label}</span>}
    </>
  )
}

function AltText() {
  return (
    <>
      <svg viewBox="0 0 160 100">
        <rect className="spt-mix" x="30" y="12" width="100" height="50" rx="6" />
        <path className="spt-fill" d="M30 62l28-24 20 14 16-10 36 20z" />
        <circle className="spt-sun" cx="110" cy="27" r="7" />
      </svg>
      <Label ink v cls="spt-alt-l">alt="Ridge at dusk"</Label>
      <Label ink v cls="spt-alt-s">alt</Label>
    </>
  )
}

const DRAW = { icons: Icons, 'file-converter': Converter, semantic: Semantic, tint: Tint, gradient: Gradient, 'font-pair': FontPair, emoji: Emoji, ratio: Ratio, 'alt-text': AltText }

export default function ToolArt({ id, size = 'thumb' }) {
  const Draw = DRAW[id]
  if (!Draw) return null
  return <Plate id={id} size={size}><Draw size={size} /></Plate>
}

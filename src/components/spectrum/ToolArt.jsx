import { useId } from 'react'
import NavIcon from '../NavIcon'
import { CREATE_GROUPS, NAV_SECTIONS } from '../../data/toolTree'
import { LIBRARY_GRADIENT_ROWS } from '../../data/gradientLibrary'
import { buildRamp } from '../../utils/tintRamp'
import { hexToOklchRaw } from '../tool/oklch'
import { STROKE_PX } from '../../utils/iconStroke'
import { DEFAULT_EXPORT_SIZE } from '../../utils/iconSize'
import { BASES, rampOf, ratio } from './spectrumKit'
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

// The thumb is the 3 x 2 corner of the 6 x 3 grid that holds the picked cell.
const THUMB_ICONS = [0, 1, 2, 6, 7, 8]

function IconsThumb() {
  return (
    <svg viewBox="0 0 160 100">
      <g className="spt-ln" transform="translate(27 14) scale(1.1)">
        <rect className="spt-mix" x={PICK * PITCH - 6} y="-6" width="36" height="36" rx="9" />
        {THUMB_ICONS.map((i) => (
          <path key={ICON_PLATE[i][0]} d={ICON_PLATE[i][1]} className={i === PICK ? 'spt-hs' : undefined} transform={`translate(${(i % 6) * PITCH} ${Math.floor(i / 6) * 48})`} />
        ))}
      </g>
    </svg>
  )
}

function Icons({ size }) {
  if (size === 'thumb') return <IconsThumb />
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

function ConverterThumb() {
  return (
    <div className="spt-fct">
      <span className="spt-fct-n v">−{SAVED}%</span>
      <svg className="spt-fct-svg" width="100%" height="22">
        <rect className="spt-bar1" width="100%" height="8" rx="3" />
        <rect className="spt-bar2" y="14" width={pct(KEPT)} height="8" rx="3" />
      </svg>
    </div>
  )
}

function Converter({ size }) {
  const hatch = `spt-hatch${useId().replace(/:/g, '')}`
  if (size === 'thumb') return <ConverterThumb />
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
              <pattern id={hatch}width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" /></pattern>
            </defs>
            <rect className="spt-ghost" x={pct(KEPT - TUCK)} y=".5" width={pct(1 - KEPT + TUCK - INSET)} height="15" rx="4" fill={`url(#${hatch})`} />
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
  const gid = `spt-grad${useId().replace(/:/g, '')}`
  const { x, y, w, h } = GRAD_BOX
  const last = GRAD.stops.length - 1
  return (
    <svg viewBox="0 0 160 100">
      <defs>
        <linearGradient id={gid}gradientUnits="userSpaceOnUse" {...GRAD_LINE}>
          {GRAD.stops.map((s) => <stop key={s.position} offset={s.position / 100} stopColor={s.color} />)}
        </linearGradient>
      </defs>
      <rect className="spt-gbar" x={x} y={y} width={w} height={h} rx="8" fill={`url(#${gid})`} />
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

// Values for the drawings the site map adds. Palette and Contrast read the ramp the
// Palette and Contrast demos open with; Type Scale the 1.25 ratio the scale demo offers.
const RAMP = rampOf(BASES[0])
const PALETTE = [1, 3, 4, 5, 7].map((i) => RAMP[i])
const CT_FG = RAMP[1].hex
const CT_BG = RAMP[7].hex
const CT_RATIO = Math.round(ratio(CT_FG, CT_BG) * 10) / 10
const CT_VERDICT = CT_RATIO >= 7 ? 'AAA' : CT_RATIO >= 4.5 ? 'AA' : 'Fails'
const SCALE_RATIO = 1.25
const SCALE = [0, 1, 2, 3, 4].map((n) => Math.round(16 * SCALE_RATIO ** n))
// The site's own display face, named and set in itself, so no extra font request.
const DISPLAY_FACE = 'Switzer'

// Set CSS custom properties on a node: the no-inline-styles route for per-item values.
function varsRef(vars) {
  return (el) => {
    if (!el) return
    for (const key of Object.keys(vars)) el.style.setProperty(key, vars[key])
  }
}

function Palette() {
  return (
    <svg viewBox="0 0 160 100">
      {PALETTE.map((r, i) => <rect key={r.step} className="spt-step" fill={r.hex} x={27 + i * 22} y={i === 2 ? 24 : 28} width="18" height={i === 2 ? 52 : 44} rx="5" />)}
    </svg>
  )
}

function Contrast() {
  return (
    <div className="spt-ct">
      <span className="spt-ct-b" ref={varsRef({ '--ct-bg': CT_BG, '--ct-fg': CT_FG })}>Aa</span>
      <span className="spt-ct-r">
        <span className="spt-ct-n v">{CT_RATIO.toFixed(1)}:1</span>
        <Label>{CT_VERDICT}</Label>
      </span>
    </div>
  )
}

function FontGallery() {
  return (
    <svg viewBox="0 0 160 100">
      <path className="spt-rule" d="M22 64h116" />
      <text className="spt-fg-t" x="80" y="64" textAnchor="middle">{DISPLAY_FACE}</text>
    </svg>
  )
}

function TypeScale() {
  return (
    <div className="spt-ts">
      {SCALE.map((px, i) => <span key={px} className={i === SCALE.length - 1 ? 'spt-ts-top' : undefined} ref={varsRef({ '--ts-px': String(px) })}>A</span>)}
    </div>
  )
}

function Model3D() {
  return (
    <svg viewBox="0 0 160 100">
      <g className="spt-ln">
        <rect x="28" y="40" width="28" height="28" rx="1" />
        <rect x="38" y="30" width="28" height="28" rx="1" />
        <path d="M28 40l10-10M56 40l10-10M28 68l10-10M56 68l10-10M72 49h20" />
      </g>
      <g className="spt-solid">
        <path d="M96 40l10-10h28l-10 10z" />
        <path d="M124 40l10-10v28l-10 10z" />
        <rect x="96" y="40" width="28" height="28" />
      </g>
    </svg>
  )
}

// A tool still in the workshop: the menu's own tile for it, centred, nothing invented.
const MENU_ICON = Object.fromEntries(
  NAV_SECTIONS.find((s) => s.id === 'create').columns.flat().flatMap((g) => g.tools.map((t) => [t.id, t.icon])),
)
function SoonTile({ id }) {
  return <span className="spt-tile"><NavIcon id={MENU_ICON[id] || id} /></span>
}

const DRAW = { palette: Palette, contrast: Contrast, 'font-gallery': FontGallery, 'type-scale': TypeScale, '3d-converter': Model3D, icons: Icons, 'file-converter': Converter, semantic: Semantic, tint: Tint, gradient: Gradient, 'font-pair': FontPair, emoji: Emoji, ratio: Ratio, 'alt-text': AltText }

export default function ToolArt({ id, size = 'thumb', soon = false }) {
  if (soon) return <Plate id={id} size={size}><SoonTile id={id} /></Plate>
  const Draw = DRAW[id]
  if (!Draw) return null
  return <Plate id={id} size={size}><Draw size={size} /></Plate>
}

import { Glyph } from './BookmarkGlyphs.jsx'
import {
  ALT_TEXT, ASPHALT, CONTRAST_PAIR, CONTRAST_TEXT, EMOJI, EMOJI_CODE, PALETTE, PASSES_AA,
  TOOLS, TYPE_RATIO, TYPE_SCALE,
} from './bookmarksData.js'

// THE WINDOW'S MAIN PANE: four layers (Colour, Type, Icons, Images) stacked in
// one grid cell, each holding the cards of that folder's tools. They show the
// Kerbside sample. The cards are decoration over the sidebar, which is the real
// set of links, so they are hidden from assistive tech and out of the tab order.

const ink = (a) => `rgba(239,238,234,${a})`
const PASS = '#84BF9F'
const mono = 'bm-mono'

// Sample ramps, 50 to 950. Not computed: they show what the tool prints.
const SEMANTIC = [
  ['Success', ['#E7F2EC', '#BDD7C4', '#96BCA0', '#70A17E', '#49865D', '#1E6B45', '#145C33', '#0C4D29', '#053E1F', '#013015']],
  ['Warning', ['#FBF0D9', '#E4CEA8', '#C9AE7F', '#AE8F56', '#93712B', '#7A5200', '#654701', '#543B00', '#442F00', '#342300']],
  ['Error', ['#FCEBEA', '#F2C6BE', '#E6A195', '#D77C6D', '#C75445', '#B42318', '#9B190D', '#820E05', '#6A0400', '#530000']],
  ['Information', ['#E9F0F8', '#C3D0E0', '#9CB2CB', '#7694B6', '#5176A0', '#2B5A8A', '#234C78', '#1B3F66', '#143354', '#0C2743']],
]
const TINT = ['#FFDABA', '#FFBC96', '#FF9D72', '#FF7D4D', '#EE5C1F', '#DA3500', '#B72300', '#950E00', '#750000', '#560000', '#380000']
const ICON_SET = [
  <><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>,
  <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  <><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><path d="M3.29 7 12 12l8.71-5" /><path d="m7.5 4.27 9 5.15" /></>,
  <path d="M20 6 9 17l-5-5" />,
]

const swatchText = { fontSize: 12, lineHeight: '16px' }
const caption = { fontSize: 12, lineHeight: '16px', color: ink(0.62) }
const inkRing = { outline: `1.5px solid #EFEEEA`, outlineOffset: '-1.5px', borderRadius: 2 }
const imgStyle = (extra) => ({ display: 'block', flex: 'none', objectFit: 'cover', outline: '1px solid oklch(1 0 0 / .1)', outlineOffset: '-1px', ...extra })

function Picture({ name, w1, w, h, style }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/home-bookmarks/${name}-${w1}.avif 1x, /home-bookmarks/${name}-${w1 * 2}.avif 2x`} />
      <source type="image/webp" srcSet={`/home-bookmarks/${name}-${w1}.webp 1x, /home-bookmarks/${name}-${w1 * 2}.webp 2x`} />
      <img className="bm-chroma" src={`/home-bookmarks/${name}-${w1}.webp`} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async" style={imgStyle(style)} />
    </picture>
  )
}

function Card({ j, cls, width, height, wide, children, ink: inked = false, pvStyle }) {
  const tool = TOOLS[j]
  return (
    <a className={cls(j)} data-card={j} href={tool.href} tabIndex={-1} aria-hidden="true" style={{ width, height, gridColumn: wide ? '1 / -1' : undefined }}>
      <div className={inked ? 'pv ink' : 'pv'} style={{ display: 'flex', flexDirection: 'column', ...pvStyle }}>{children}</div>
      <div className="ft"><span className="fg"><Glyph name={tool.key} /></span><span>{tool.name}</span></div>
    </a>
  )
}

function Layer({ on, title, rows, cols = '168px 168px', children }) {
  return (
    <div className={on ? 'bm-lay on' : 'bm-lay'}>
      <div className="bm-lay-h">{title}</div>
      <div className="bm-lay-g" style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}>{children}</div>
    </div>
  )
}

const Swatch = ({ c }) => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10, whiteSpace: 'nowrap', textAlign: 'center', background: c.hex, color: c.ink }}>
    <span style={{ ...swatchText, fontWeight: 600 }}>{c.name}</span>
    <span className={mono}>{c.hex}</span>
    <span style={{ ...swatchText, fontWeight: 400 }}>{c.role}</span>
  </div>
)

const Row = ({ label, children }) => (
  <div style={{ display: 'flex', gap: 6 }}><span style={{ color: ink(0.62) }}>{label}</span><span style={{ color: ink(0.86) }}>{children}</span></div>
)

export default function BookmarkPanes({ open, cardCls }) {
  const card = { cls: cardCls }
  const [signal] = PALETTE
  const gradient = `${ASPHALT}, ${signal.hex} 55%, ${PALETTE[2].hex}`
  return (
    <div className="bm-panes" aria-hidden="true">
      <Layer on={open === 0} title="Colour" cols="168px 168px" rows="180px 166px 166px">
        <Card {...card} j={0} width={344} height={180} wide>
          <div className="bm-chroma" style={{ height: 128, display: 'grid', gridTemplateColumns: 'repeat(4, 80px)', borderRadius: 8, overflow: 'hidden', outline: `1px solid ${ink(0.12)}`, outlineOffset: -1 }}>
            {PALETTE.map((c) => <Swatch key={c.name} c={c} />)}
          </div>
        </Card>
        <Card {...card} j={1} width={168} height={166}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SEMANTIC.map(([name, ramp]) => (
              <div key={name} style={{ height: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div className="ink" style={{ height: 14, fontSize: 12, lineHeight: '14px', fontWeight: 500, color: ink(0.86) }}>{name}</div>
                <div className="bm-chroma" style={{ height: 8, display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', borderRadius: 3, overflow: 'hidden' }}>
                  {ramp.map((c, k) => <span key={c} style={{ background: c, ...(k === 5 ? inkRing : null) }} />)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card {...card} j={2} width={168} height={166}>
          <div className="bm-chroma" style={{ height: 84, display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', borderRadius: 6, overflow: 'hidden' }}>
            {TINT.map((c, k) => <span key={c} style={{ background: c, ...(k === 5 ? inkRing : null) }} />)}
          </div>
          <div className={`ink ${mono}`} style={{ marginTop: 8, height: 16, display: 'grid', gridTemplateColumns: '1fr auto 1fr', color: ink(0.62) }}>
            <span>50</span><span>500</span><span style={{ justifySelf: 'end' }}>950</span>
          </div>
        </Card>
        <Card {...card} j={3} width={168} height={166}>
          <div className="bm-chroma bm-gr" style={{ height: 66, borderRadius: 8, '--g': gradient }} />
          <div className="bm-chroma" style={{ position: 'relative', marginTop: 10, height: 12 }}>
            <div className="bm-gr bm-gt" style={{ position: 'absolute', left: 0, right: 0, top: 3, height: 6, borderRadius: 3, '--g': gradient }} />
            {[[0, ASPHALT], [73, signal.hex], [132, PALETTE[2].hex]].map(([x, c]) => (
              <span key={x} style={{ position: 'absolute', left: x, top: 0, width: 12, height: 12, boxSizing: 'border-box', borderRadius: 6, border: '2px solid #EFEEEA', background: c }} />
            ))}
          </div>
          <div className="ink" style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6, height: 16, lineHeight: '16px' }}>
            <span className={mono} style={{ color: ink(0.62) }}>135&deg;</span><span style={caption}>3 stops</span>
          </div>
        </Card>
        <Card {...card} j={4} width={168} height={166}>
          <div className="bm-chroma" style={{ height: 40, boxSizing: 'border-box', padding: '0 8px', borderRadius: 6, background: CONTRAST_PAIR.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: CONTRAST_PAIR.fg }}>
            <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 16, lineHeight: 1 }}>Aa</span>
            <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>Asphalt on Signal</span>
          </div>
          <div className="bm-chroma" style={{ marginTop: 10, height: 36, display: 'flex', alignItems: 'baseline', color: PASS, fontWeight: 600, lineHeight: 1 }}>
            <span style={{ fontSize: 36, fontVariantNumeric: 'tabular-nums' }}>{CONTRAST_TEXT}</span><span style={{ fontSize: 16 }}>:1</span>
          </div>
          {PASSES_AA ? (
            <div className="ink" style={{ marginTop: 6, height: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, lineHeight: '16px', fontWeight: 500, color: ink(0.86) }}>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={PASS} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.2 9.5" /></svg>Passes AA.
            </div>
          ) : null}
        </Card>
      </Layer>

      <Layer on={open === 1} title="Type" rows="260px 260px">
        <Card {...card} j={5} width={344} height={260} wide>
          {[['Archivo', "'Archivo', sans-serif", 800, 'Sans serif · 9 weights', true], ['IBM Plex Sans', "'IBM Plex Sans', sans-serif", 400, 'Sans serif · 7 weights', false]].map(([name, family, weight, meta, first]) => (
            <div key={name} className="ink" style={{ height: first ? 103 : 104, boxSizing: 'border-box', borderTop: first ? undefined : `1px solid ${ink(0.08)}`, display: 'grid', gridTemplateColumns: '1fr 24px', alignContent: 'center', columnGap: 12 }}>
              <div style={{ gridColumn: 1, whiteSpace: 'nowrap', fontSize: 28, lineHeight: '32px', color: '#EFEEEA', fontFamily: family, fontWeight: weight, fontStretch: first ? '125%' : undefined, letterSpacing: first ? '-0.02em' : undefined }}>{name}</div>
              <div style={{ gridColumn: 1, marginTop: 6, ...caption }}>{meta}</div>
              <span style={{ gridColumn: 2, gridRow: '1 / 3', alignSelf: 'center', width: 24, height: 24, boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${ink(0.16)}`, display: 'grid', placeItems: 'center', color: ink(0.72) }}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              </span>
            </div>
          ))}
        </Card>
        <Card {...card} j={6} width={168} height={260} ink>
          <div style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontStretch: '125%', fontSize: 21, lineHeight: 1, letterSpacing: '-0.01em', color: '#EFEEEA', whiteSpace: 'nowrap' }}>KERBSIDE</div>
          <div style={{ marginTop: 10, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, fontSize: 16, lineHeight: 1.45, color: ink(0.86) }}>Booked by ten. There by twelve.</div>
          <div style={{ marginTop: 12, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, fontSize: 13, lineHeight: 1.5, color: ink(0.72) }}>Across town before lunch.</div>
          <div style={{ marginTop: 'auto', fontSize: 12, lineHeight: '16px' }}>
            <Row label="Heading">Archivo</Row>
            <Row label="Body">IBM Plex Sans</Row>
          </div>
        </Card>
        <Card {...card} j={7} width={168} height={260} ink>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TYPE_SCALE.map((size) => (
              <div key={size} style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className={mono} style={{ flex: 'none', width: 24, color: ink(0.62) }}>{size}</span>
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: size, lineHeight: 1.1, color: '#EFEEEA' }}>Aa</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 12, lineHeight: '16px', color: ink(0.72) }}>Golden ratio</span>
            <span className={mono} style={{ color: ink(0.62) }}>{TYPE_RATIO}</span>
          </div>
        </Card>
      </Layer>

      <Layer on={open === 2} title="Icons" cols="344px" rows="340px 180px">
        <Card {...card} j={8} width={344} height={340} ink>
          <div style={{ width: 320, height: 168, borderRadius: 8, background: ink(0.03), display: 'grid', placeItems: 'center', color: '#EFEEEA' }}>
            <svg aria-hidden="true" width="112" height="112" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>{ICON_SET[0]}</svg>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 5 }}>
            {ICON_SET.map((shape, k) => (
              <span key={k} style={{ flex: 'none', width: 60, height: 60, borderRadius: 8, display: 'grid', placeItems: 'center', color: ink(0.72), background: k === 0 ? ink(0.08) : undefined }}>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flex: 'none' }}>{shape}</svg>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: ink(0.86) }}>bike</span>
            <span style={{ marginLeft: 8, ...caption }}>SVG &middot;</span>
            <span className={mono} style={{ marginLeft: 4, color: ink(0.62) }}>24px</span>
          </div>
        </Card>
        <Card {...card} j={9} width={344} height={180} pvStyle={{ justifyContent: 'center' }}>
          <div className="bm-chroma" style={{ display: 'flex', gap: 6 }}>
            {EMOJI.map((e, k) => (
              <span key={e} style={{ flex: 'none', width: 48, height: 48, borderRadius: 8, background: k === EMOJI.length - 1 ? ink(0.08) : undefined, display: 'grid', placeItems: 'center', fontSize: 32, lineHeight: 1 }}>{e}</span>
            ))}
          </div>
          <div className="ink" style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: ink(0.86) }}>delivery truck</span>
            <span className={mono} style={{ color: ink(0.62) }}>{EMOJI_CODE}</span>
          </div>
        </Card>
      </Layer>

      <Layer on={open === 3} title="Images" rows="260px 260px">
        <Card {...card} j={10} width={344} height={260} wide>
          <div style={{ display: 'flex', gap: 16 }}>
            <Picture name="riders" w1={322} w={120} h={196} style={{ width: 120, height: 196, borderRadius: 8, objectPosition: '80% 50%' }} />
            <div className="ink" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className={mono} style={{ color: ink(0.62) }}>riders.jpg</span>
              <span style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, lineHeight: '24px', fontWeight: 600, color: '#EFEEEA' }}>
                <Glyph name="convert" size={18} /> JPG &rarr; WEBP
              </span>
              <span className={mono} style={{ marginTop: 12, color: '#EFEEEA' }}>riders.webp</span>
            </div>
          </div>
        </Card>
        <Card {...card} j={11} width={168} height={260} pvStyle={{ alignItems: 'center' }}>
          <Picture name="evening" w1={224} w={112} h={140} style={{ width: 112, height: 140, borderRadius: 6, objectPosition: 'center 45%' }} />
          <div className="ink" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 20, lineHeight: '20px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: '#EFEEEA' }}>1080 &times; 1350</span>
            <span style={{ marginTop: 6, ...caption }}>4:5 &middot; Portrait</span>
          </div>
        </Card>
        <Card {...card} j={12} width={168} height={260}>
          <Picture name="riders" w1={322} w={144} h={96} style={{ width: 144, height: 96, borderRadius: 6, objectPosition: 'center 45%' }} />
          <div className="ink" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, color: ink(0.72) }}>{ALT_TEXT}</div>
          <div className="ink" style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4, lineHeight: '16px' }}>
            <span className={mono} style={{ color: ink(0.62) }}>{ALT_TEXT.length}</span><span style={caption}>characters</span>
          </div>
        </Card>
      </Layer>
    </div>
  )
}

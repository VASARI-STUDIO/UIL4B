import { Glyph } from './BookmarkGlyphs.jsx'
import {
  ALT_TEXT, CONTRAST_TEXT, EMOJI, PALETTE, PASSES_AA, TOOLS, TYPE_RATIO, TYPE_SCALE,
} from './bookmarksData.js'
import { ICON_SET, SEMANTIC, TINT } from './bookmarksSample.jsx'

// THE PHONE LAYOUT'S PANE: the open folder's tools at work, four layers in one
// grid cell, 296px tall so nothing below it moves. The same Kerbside sample as
// the desktop window, drawn for a narrow column. It is decoration over the
// toolkit list below it, so it is hidden from assistive tech.
//
// A card is a tool's output. The hot card takes a ring, the others lose their
// hairline and their words drop to .40; colour is never dimmed.

const TOOL = (j) => TOOLS[j].name

function Card({ j, hot, wide, children, footClass }) {
  return (
    <div className={`bmp-card${wide ? ' bmp-wide' : ''}${hot === j ? ' hot' : ''}`} data-j={j}>
      {children}
      <div className={`bmp-ft bmp-dim${footClass ? ` ${footClass}` : ''}`}>
        <span className="bmp-gl"><Glyph name={TOOLS[j].key} /></span>
        <span>{TOOL(j)}</span>
      </div>
    </div>
  )
}

/** A photo from the section's own encodes, chosen by the width the column needs. */
function Photo({ name, w, className, sizes }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/home-bookmarks/${name}-${w}.avif ${w}w, /home-bookmarks/${name}-${w * 2}.avif ${w * 2}w`} sizes={sizes} />
      <source type="image/webp" srcSet={`/home-bookmarks/${name}-${w}.webp ${w}w, /home-bookmarks/${name}-${w * 2}.webp ${w * 2}w`} sizes={sizes} />
      <img className={`bmp-ph ${className}`} src={`/home-bookmarks/${name}-${w}.webp`} alt="" aria-hidden="true" width={w} height={Math.round(w * (name === 'riders' ? 0.608 : 1.25))} loading="lazy" decoding="async" />
    </picture>
  )
}

export default function BookmarkPhonePane({ open, hot, paneRef }) {
  const [signal] = PALETTE
  const gradient = `${PALETTE[1].hex}, ${signal.hex} 55%, ${PALETTE[2].hex}`
  const lyr = (i) => (i === open ? 'bmp-lyr on' : 'bmp-lyr')
  return (
    <div className={hot == null ? 'bmp-pane' : 'bmp-pane has-hot'} data-r7ap-pane ref={paneRef} aria-hidden="true">
      <div className="bmp-lyrs">
        <div className={lyr(0)}>
          <div className="bmp-grid bmp-grid0">
            <Card j={0} hot={hot?.j} wide>
              <div className="bmp-pv">
                <div className="bmp-pal">
                  {PALETTE.map((c) => (
                    <div key={c.name} style={{ background: c.hex, color: c.ink }}><b>{c.name}</b><span className="bmp-mono">{c.hex}</span></div>
                  ))}
                </div>
              </div>
            </Card>
            <Card j={1} hot={hot?.j}>
              <div className="bmp-pv bmp-mid">
                <div className="bmp-sem">
                  {SEMANTIC.map(([name, ramp]) => (
                    <div key={name}>{ramp.map((c, k) => <i key={c} className={k === 5 ? 'b' : undefined} style={{ background: c }} />)}</div>
                  ))}
                </div>
              </div>
            </Card>
            <Card j={2} hot={hot?.j}>
              <div className="bmp-pv">
                <div className="bmp-tint">{TINT.map((c, k) => <i key={c} className={k === 5 ? 'b' : undefined} style={{ background: c }} />)}</div>
              </div>
            </Card>
            <Card j={3} hot={hot?.j}>
              <div className="bmp-pv"><div className="bmp-grad" style={{ '--g': gradient }} /></div>
            </Card>
            <Card j={4} hot={hot?.j}>
              <div className="bmp-pv bmp-mid">
                <div className="bmp-ctr"><b>{CONTRAST_TEXT}<small>:1</small></b>{PASSES_AA ? <span className="bmp-dim">AA</span> : null}</div>
              </div>
            </Card>
          </div>
        </div>

        <div className={lyr(1)}>
          <div className="bmp-grid bmp-grid1">
            <Card j={5} hot={hot?.j} wide>
              <div className="bmp-pv bmp-dim">
                <div className="bmp-gal">
                  <div><div className="bmp-gn bmp-word">Archivo</div><div className="bmp-gm">Sans serif &middot; 9 weights</div></div>
                  <div><div className="bmp-gn bmp-dms">IBM Plex Sans</div><div className="bmp-gm">Sans serif &middot; 7 weights</div></div>
                </div>
              </div>
            </Card>
            <Card j={6} hot={hot?.j}>
              <div className="bmp-pv bmp-dim bmp-fp">
                <div className="bmp-word bmp-w22">KERBSIDE</div>
                <div className="bmp-dm">Booked by ten. There by twelve.</div>
                <div className="bmp-fpc"><div>Heading<span>Archivo</span></div><div>Body<span>IBM Plex Sans</span></div></div>
              </div>
            </Card>
            <Card j={7} hot={hot?.j}>
              <div className="bmp-pv bmp-dim">
                {[TYPE_SCALE[1], TYPE_SCALE[2], TYPE_SCALE[3]].map((size) => (
                  <div key={size} className="bmp-aa" style={{ fontSize: size }}>Aa</div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className={lyr(2)}>
          <div className="bmp-grid bmp-grid2">
            <Card j={8} hot={hot?.j} wide>
              <div className="bmp-pv bmp-dim bmp-ic">
                <div className="bmp-sunbox">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_SET[0]}</svg>
                </div>
                <div className="bmp-ic5">
                  {ICON_SET.map((shape, k) => (
                    <span key={k} className={k === 0 ? 'sel' : undefined}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>
                    </span>
                  ))}
                </div>
                <div className="bmp-meta"><span>bike</span><span className="bmp-sv">SVG &middot;<code className="bmp-mono">24px</code></span></div>
              </div>
            </Card>
            <Card j={9} hot={hot?.j} wide>
              <div className="bmp-pv bmp-em">
                <div className="bmp-em6">{EMOJI.map((e, k) => <span key={e} className={k === EMOJI.length - 1 ? 'sel' : undefined}>{e}</span>)}</div>
              </div>
            </Card>
          </div>
        </div>

        <div className={lyr(3)}>
          <div className="bmp-grid bmp-grid3">
            <Card j={10} hot={hot?.j} wide>
              <div className="bmp-pv bmp-fc">
                <Photo name="riders" w={322} className="bmp-fcp" sizes="78px" />
                <div className="bmp-fcc bmp-dim">
                  <code className="bmp-mono">riders.jpg</code>
                  <div className="bmp-cv"><span className="bmp-gl"><Glyph name="convert" /></span><span>JPG &rarr; WEBP</span></div>
                  <code className="bmp-mono bmp-out">riders.webp</code>
                </div>
              </div>
            </Card>
            <Card j={11} hot={hot?.j} footClass="bmp-nog">
              <div className="bmp-pv bmp-asr">
                <Photo name="evening" w={224} className="bmp-asp" sizes="62px" />
                <div className="bmp-dim"><b>1080<i>w</i></b><b>1350<i>h</i></b><small>4:5</small></div>
              </div>
            </Card>
            <Card j={12} hot={hot?.j} footClass="bmp-nog">
              <div className="bmp-pv">
                <Photo name="riders" w={322} className="bmp-alt" sizes="(max-width: 767px) 50vw, 280px" />
                <p className="bmp-at bmp-dim">{ALT_TEXT}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

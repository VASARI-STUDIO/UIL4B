import { IMAGES } from './loopData'

// THE PARTS EVERY SIZE OF THE PANEL SHARES: the pause control, the chapter
// buttons, Next, the export rows and the pictures. A size passes `box`, the few
// style values (width, height, position) that differ; the rest is fixed here.

const FONT = "'Geist', system-ui, sans-serif"
const INK = '#EFEEEA'
const EASE = 'cubic-bezier(.23,1,.32,1)'

export function PauseButton({ loop, v, box }) {
  return (
    <button
      type="button"
      className="lp-pause"
      onClick={loop.toggle}
      aria-label={v.toggleLabel}
      style={{
        padding: '0 8px 0 4px', border: 0, borderRadius: 999, background: 'transparent', color: INK,
        display: v.showControl, alignItems: 'center', gap: 6, cursor: 'pointer', font: `500 12px/16px ${FONT}`, ...box,
      }}
    >
      <span
        style={{
          flex: 'none', width: 36, height: 36, boxSizing: 'border-box', borderRadius: 999, border: '1px solid rgba(239,238,234,.2)',
          display: 'grid', placeItems: 'center', transition: `background-color 120ms ${EASE}`,
        }}
      >
        {v.showPause && (
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
        {v.showPlay && (
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5l11 7-11 7z" />
          </svg>
        )}
        {v.showReplay && (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
          </svg>
        )}
      </span>
      <span style={{ color: 'rgba(239,238,234,.86)' }}>{v.toggleText}</span>
    </button>
  )
}

export function ChapterButtons({ loop, v, box }) {
  return v.chapters.map((ch) => (
    <button
      key={ch.i}
      type="button"
      className="lp-seg"
      onClick={() => loop.goChapter(ch.i)}
      aria-current={ch.cur}
      aria-label={ch.aria}
      style={{
        padding: 0, border: 0, background: 'transparent', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 7, textAlign: 'left', cursor: 'pointer', font: `500 12px/16px ${FONT}`, ...box,
      }}
    >
      <span className="lp-seg-l" style={{ color: ch.c, transition: `color 160ms ${EASE}` }}>{ch.n}</span>
      <span style={{ display: 'block', height: 2, borderRadius: 999, overflow: 'hidden', background: 'rgba(239,238,234,.14)' }}>
        <span
          style={{
            display: 'block', height: '100%', transformOrigin: '0 50%', transform: `scaleX(${ch.fill})`,
            background: ch.fillBg, transition: ch.tr,
          }}
        />
      </span>
    </button>
  ))
}

// After the last chapter Next scrolls the page past the panel (useLoop), and
// focus goes with it to the first heading below, so a keyboard user lands
// where the page now is.
function focusNextSection() {
  const heading = document.querySelector('#bookmarks h2')
  if (!heading) return
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
}

export function NextButton({ loop, v, box }) {
  const onClick = (e) => {
    const leaving = !loop.nextInfo
    loop.next(e)
    if (leaving) focusNextSection()
  }
  return (
    <button
      type="button"
      className="lp-next"
      data-sim={v.nextSim}
      onClick={onClick}
      aria-label={v.nextAria}
      style={{
        '--hd': v.nextHd, padding: '0 12px 0 16px', border: '1px solid rgba(239,238,234,.2)', borderRadius: 999, color: INK,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, font: `500 13px ${FONT}`,
        whiteSpace: 'nowrap', cursor: 'pointer', ...box,
      }}
    >
      {v.nextLabel}
      <svg
        aria-hidden="true"
        className={`mi-nx ${v.nextDirCls}`}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={v.nextD} />
      </svg>
    </button>
  )
}

/**
 * The export list. `m` is the size's metrics: row width and height, text
 * sizes, the radio dot and the Pro tag.
 */
export function ExportRows({ rows, m }) {
  return rows.map((f) => (
    <div
      key={f.n}
      style={{
        position: 'absolute', left: 0, top: 0, width: m.width,
        transform: `translate(${f.x}px, ${f.y}px)`, transition: `transform 220ms ${EASE}`,
      }}
    >
      <span
        style={{
          height: m.height, padding: `0 ${m.padX}px`, borderRadius: 999, display: 'flex', alignItems: 'center', gap: m.gap,
          fontSize: m.font, background: f.bg, transform: `scale(${f.sc})`, transition: `background 150ms ease, transform 120ms ${EASE}`,
        }}
      >
        <span
          style={{
            width: m.dot, height: m.dot, boxSizing: 'border-box', borderRadius: 999, border: `1.5px solid ${f.dot}`,
            display: 'grid', placeItems: 'center',
          }}
        >
          <span style={{ width: m.dotIn, height: m.dotIn, borderRadius: 999, background: INK, opacity: f.on, transition: 'opacity 150ms ease' }} />
        </span>
        <span style={{ flex: 1, color: f.c }}>{f.n}</span>
        <span
          style={{
            height: m.tagH, padding: `0 ${m.tagPadX}px`, borderRadius: 999, background: f.tierBg, fontSize: m.tagFont,
            color: 'rgba(239,238,234,.72)', display: 'grid', placeItems: 'center',
          }}
        >
          {f.tier}
        </span>
      </span>
    </div>
  ))
}

/**
 * A panel picture: AVIF with a WebP fallback, in the widths the asset set
 * holds. The browser picks from `sizes`, the width the panel draws it at.
 */
export function LoopImage({ name, width, height, style, ...rest }) {
  const img = IMAGES[name]
  const drawn = typeof style?.width === 'number' ? style.width : width
  const set = (ext) => img.widths.map((w) => `${img.path}-${w}.${ext} ${w}w`).join(', ')
  return (
    <picture style={{ display: 'contents' }}>
      <source type="image/avif" srcSet={set('avif')} sizes={`${drawn}px`} />
      <img
        src={`${img.path}-${img.widths[img.widths.length - 1]}.webp`}
        srcSet={set('webp')}
        sizes={`${drawn}px`}
        alt=""
        width={width}
        height={height}
        decoding="async"
        draggable={false}
        style={style}
        {...rest}
      />
    </picture>
  )
}

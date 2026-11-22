import { useEffect, useRef, useState } from 'react'
import { pageAlt, pageImage } from './exportPages'
import { liveHtml, liveSize } from './exportLiveSize'

// The main picture of the Export dialog: one page of the chosen template, as large as the stage allows with its whole page in
// view (object-fit: contain), sharp on a retina screen when the manifest has a 2x picture for it (srcset).
//
// The page is one of two things:
//   - the stock picture (a raster in public/export-themes, addressed through exportPages), or
//   - the live page, made on the server with the person's brand: HTML in a frame with no permissions (sandbox=""), drawn at
//     the page's own size and scaled down to the stage with a transform.
//
// The box keeps one shape from the moment a live page is on its way (`expectLive`): the shape the live page will have, which is the
// stock page's but for the brand book (see exportLiveSize). The stock picture stays under the live frame and the frame fades in over it
// (opacity only), so nothing moves when the page arrives. `loading` marks the stage aria-busy while the page is being drawn.
//
// A page the viewer cannot export (`sample`) is drawn sharp but as a sample: the 1x picture only, with no retina version, under a
// tiled "Pro sample" mark that takes no clicks and is hidden from assistive tech; `locked` adds the Pro mark over it. A document
// with no templates (the style guide, the code files) hands in `plain`, its own preview, and the stage only frames it.

function LiveFrame({ html, size, title }) {
  const box = useRef(null)
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    // Both sides: the box is the page's shape, so they agree to within a pixel or two, and the smaller keeps the whole page inside it.
    const fit = () => setScale(Math.min(el.clientWidth / size.w, el.clientHeight / size.h))
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watch = new ResizeObserver(fit)
    watch.observe(el)
    return () => watch.disconnect()
  }, [size.w, size.h])
  return (
    <div className="xd-live" ref={box}>
      <iframe
        title={title}
        srcDoc={liveHtml(html)}
        sandbox=""
        tabIndex={-1}
        style={{ width: size.w, height: size.h, transform: `scale(${scale})`, visibility: scale > 0 ? 'visible' : 'hidden' }}
      />
    </div>
  )
}

export default function ExportStage({ page, theme, sample = false, locked = false, html = '', expectLive = false, loading = false, plain = null }) {
  if (plain) return <div className="xd-stage xd-stage--plain">{plain}</div>
  if (!page) return <div className="xd-stage" />
  const image = pageImage(page, sample)
  const live = Boolean(html) && !sample
  // The box is the shape the live page will have as soon as one is expected, and stays so when it lands; the frame inside is drawn at the
  // size the document itself says (exportLiveSize), a pixel or two different at most.
  const expect = (live || expectLive) && !sample
  const shape = expect ? liveSize('', page) : { w: page.w, h: page.h }
  const doc = live ? liveSize(html, page) : shape
  return (
    <div className="xd-stage" aria-busy={loading || undefined}>
      <div className={`xd-box${sample ? ' is-locked' : ''}`} style={{ '--xd-w': shape.w, '--xd-h': shape.h }}>
        {image.src && (
          <img
            key={image.src}
            className="xd-img"
            src={image.src}
            srcSet={image.srcSet}
            width={page.w}
            height={page.h}
            alt={live ? '' : pageAlt(theme, page)}
            aria-hidden={live || undefined}
            data-pin-nopin="true"
            decoding="async"
          />
        )}
        {live && <LiveFrame key={`${page.id}|${html.length}`} html={html} size={doc} title={`${theme.name} ${page.label} page, with your brand`} />}
        {sample && <span className="xd-mark" aria-hidden="true" />}
        {locked && <span className="xd-stage-pro">Pro template</span>}
      </div>
    </div>
  )
}

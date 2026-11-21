import { useEffect, useRef, useState } from 'react'
import { pageAlt, pageImage } from './exportPages'

// The main picture of the Export dialog: one page of the chosen template, as large as the stage allows with its whole page in
// view (object-fit: contain), sharp on a retina screen when the manifest has a 2x picture for it (srcset).
//
// The page is one of two things:
//   - the stock picture (a raster in public/export-themes, addressed through exportPages), or
//   - the live page, made on the server with the person's brand: HTML in a frame with no permissions (sandbox=""), drawn at
//     the page's own size and scaled down to the stage with a transform.
//
// A page the viewer cannot export (`sample`) is drawn sharp but as a sample: the 1x picture only, with no retina version, under a
// tiled "Pro sample" mark that takes no clicks and is hidden from assistive tech; `locked` adds the Pro mark over it. A document
// with no templates (the style guide, the code files) hands in `plain`, its own preview, and the stage only frames it.

function LiveFrame({ html, page, title }) {
  const box = useRef(null)
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const fit = () => setScale(el.clientWidth / page.w)
    fit()
    if (typeof ResizeObserver === 'undefined') return undefined
    const watch = new ResizeObserver(fit)
    watch.observe(el)
    return () => watch.disconnect()
  }, [page.w])
  return (
    <div className="xd-live" ref={box}>
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        tabIndex={-1}
        style={{ width: page.w, height: page.h, transform: `scale(${scale})` }}
      />
    </div>
  )
}

export default function ExportStage({ page, theme, sample = false, locked = false, html = '', plain = null }) {
  if (plain) return <div className="xd-stage xd-stage--plain">{plain}</div>
  if (!page) return <div className="xd-stage" />
  const image = pageImage(page, sample)
  return (
    <div className="xd-stage">
      <div className={`xd-box${sample ? ' is-locked' : ''}`} style={{ '--xd-w': page.w, '--xd-h': page.h }}>
        {html && !sample
          ? <LiveFrame html={html} page={page} title={`${theme.name} ${page.label} page, with your brand`} />
          : image.src && (
            <img
              key={image.src}
              className="xd-img"
              src={image.src}
              srcSet={image.srcSet}
              width={page.w}
              height={page.h}
              alt={pageAlt(theme, page)}
              data-pin-nopin="true"
              decoding="async"
            />
          )}
        {sample && <span className="xd-mark" aria-hidden="true" />}
        {locked && <span className="xd-stage-pro">Pro template</span>}
      </div>
    </div>
  )
}

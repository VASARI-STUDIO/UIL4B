import { carouselCanPlay, windowIndexes } from './pageCarousel'
import { pageImage } from './exportPages'

// The strip of page thumbnails beside the main image (under it on a phone): three at a time, the chosen page among them, with
// an arrow at each end, and Pause / Play for the auto-advance. State and clock are usePageCarousel's.
//
// A click on a thumbnail, an arrow, or Pause stops the auto-advance for good (pageCarousel); hovering or focusing the gallery
// only holds it while the pointer or focus is there (the parent wires that). Up and Down page through (Left and Right too, for the
// phone layout where the strip lies on its side). Every control is a button, so Tab reaches them all. One page needs no gallery.
const Chevron = ({ up }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PlayIcon = ({ playing }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    {playing
      ? <path d="M8 6v12M16 6v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      : <path d="M8 5.5v13l11-6.5z" fill="currentColor" />}
  </svg>
)

export default function ExportPageGallery({ pages, state, dispatch, standin = false }) {
  if (pages.length < 2) return null
  const shown = windowIndexes(state.index, pages.length)
  const playing = state.auto && !state.reduced
  const step = (delta) => dispatch({ type: 'step', delta })
  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1)
    else return
    e.preventDefault()
  }
  return (
    <div className="xd-gal" role="group" aria-label="Pages" onKeyDown={onKeyDown}>
      <button type="button" className="xd-gal-b xd-gal-prev" aria-label="Previous page" disabled={state.index <= 0} onClick={() => step(-1)}>
        <Chevron up />
      </button>
      <div className="xd-gal-list">
        {shown.map((i) => {
          const page = pages[i]
          const image = pageImage(page, standin)
          const on = i === state.index
          return (
            <button
              key={page.id}
              type="button"
              className={`xd-thumb${on ? ' is-on' : ''}`}
              aria-label={`${page.label}, page ${i + 1} of ${pages.length}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => dispatch({ type: 'select', index: i })}
            >
              {image.src && <img src={image.src} width={page.w} height={page.h} alt="" data-pin-nopin="true" decoding="async" loading="lazy" />}
            </button>
          )
        })}
      </div>
      <button type="button" className="xd-gal-b xd-gal-next" aria-label="Next page" disabled={state.index >= pages.length - 1} onClick={() => step(1)}>
        <Chevron />
      </button>
      {carouselCanPlay(state) && (
        <button
          type="button"
          className="xd-gal-b xd-gal-play"
          aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
          onClick={() => dispatch({ type: 'toggle' })}
        >
          <PlayIcon playing={playing} />
        </button>
      )}
    </div>
  )
}

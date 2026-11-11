// Small pieces of the /plans page that more than one section prints.

// The go arrow inside an ink pill. The stylesheet turns it on hover and focus.
export function GoArrow() {
  return (
    <span className="mi-go hpl-go-icon" aria-hidden="true">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
    </span>
  )
}

// The two Pro exports, as a sample brand's covers. Widths are the encoded files
// in public/plans; the `sizes` attribute says which one is drawn.
const COVERS = [
  {
    id: 'book',
    file: 'kerbside-book',
    widths: [100, 200],
    width: 100,
    height: 141,
    sizes: '(max-width: 767px) 90px, (max-width: 1199px) 170px, 100px',
    alt: 'Cover of the Kerbside design system book, a sample brand',
  },
  {
    id: 'deck',
    file: 'kerbside-deck',
    widths: [242, 484],
    width: 242,
    height: 136,
    sizes: '(max-width: 767px) 214px, (max-width: 1199px) 428px, 242px',
    alt: 'Cover slide of the Kerbside brand guidelines, a sample brand',
  },
]

const srcSet = (file, widths, ext) => widths.map((w) => `/plans/${file}-${w}.${ext} ${w}w`).join(', ')

export function PlanFigure() {
  return (
    <figure className="pa-fig">
      <div className="pa-covers">
        {COVERS.map((cover) => (
          <picture key={cover.id}>
            <source type="image/avif" srcSet={srcSet(cover.file, cover.widths, 'avif')} sizes={cover.sizes} />
            <source type="image/webp" srcSet={srcSet(cover.file, cover.widths, 'webp')} sizes={cover.sizes} />
            <img
              className={`pa-cover pa-cover--${cover.id}`}
              src={`/plans/${cover.file}-${cover.widths[1]}.webp`}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              loading="lazy"
              decoding="async"
            />
          </picture>
        ))}
      </div>
      <figcaption className="pa-cap">
        Two Pro exports for Kerbside, a sample brand: the design system book and the brand guidelines.
      </figcaption>
    </figure>
  )
}

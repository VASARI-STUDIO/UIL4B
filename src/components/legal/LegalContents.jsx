// The contents for /privacy and /terms: one list of clause links, two shapes.
//
//   · 768px and wider: the list sits open under the title, one link per line.
//   · 767px and narrower: a closed "Contents" disclosure over the same list, so
//     a phone opens on the title and the first clause rather than on a screen
//     of links. Every title wraps in full; nothing scrolls sideways.
//
// Choosing a link moves focus to the clause heading once the browser has made
// the jump, so a keyboard or screen-reader reader lands in the clause rather
// than back on the link. On a phone it also closes the disclosure.
//
// `useMediaQuery` picks ONE tree rather than hiding the other with CSS, so the
// links exist once in the DOM. The look is in styles/pages/plain-v3.css.
import { useRef } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'

/* The link at the end of each clause that returns to the contents. It is shown
   only where the contents is the disclosure (the stylesheet hides it beside the
   open list), and it opens the disclosure so the clause list is there once the
   page has jumped. */
export function BackToContents() {
  const back = () => {
    const details = document.querySelector('.pv-toc-m')
    if (details) details.open = true
    setTimeout(() => details?.querySelector('summary')?.focus({ preventScroll: true }), 0)
  }
  return (
    <a className="lgl-back" href="#legal-contents" onClick={back}>
      <span aria-hidden="true">&uarr;</span> Contents
    </a>
  )
}

/* items: [{ id, label, lang? }]. `lang` marks a clause that is not in the
   page's language, on both the list entry and (set by the page) the clause. */
export default function LegalContents({ items }) {
  const narrow = useMediaQuery('(max-width: 767px)')
  const detailsRef = useRef(null)

  const choose = (id) => {
    if (detailsRef.current) detailsRef.current.open = false
    // The browser performs the jump after this handler returns, and a jump to
    // a non-focusable target clears focus. Focus the heading once it has run.
    setTimeout(() => {
      document.getElementById(id)?.querySelector('h2')?.focus({ preventScroll: true })
    }, 0)
  }

  const list = (
    <ol className="pv-toc-list">
      {items.map((it) => (
        <li key={it.id}>
          <a className="pv-toc-link" href={`#${it.id}`} lang={it.lang} onClick={() => choose(it.id)}>
            {it.label}
          </a>
        </li>
      ))}
    </ol>
  )

  // `aria-label`, not a visible heading: the list is a landmark whose own name
  // says what it is, and a heading above it would add an entry to a document
  // whose headings are the clauses.
  if (narrow) {
    return (
      <div className="pv-toc-wrap lgl-toc-col" id="legal-contents">
        <details className="pv-toc-m" ref={detailsRef}>
          <summary className="pv-toc-sum">Contents</summary>
          <nav aria-label="On this page">{list}</nav>
        </details>
      </div>
    )
  }

  return (
    <div className="pv-toc-wrap lgl-toc-col" id="legal-contents">
      <nav className="pv-toc" aria-label="On this page">{list}</nav>
    </div>
  )
}

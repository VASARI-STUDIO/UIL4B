// The contents for /privacy and /terms: one list of clause links, two shapes.
//
//   · 1001px and wider: the sticky rail beside the document, with the clause
//     being read marked (`is-on`, `aria-current="location"`).
//   · 1000px and narrower: a closed "On this page" disclosure above the
//     document, holding the same links as a plain vertical list. The list is
//     the whole contents at full width, not a row of pills that scrolls
//     sideways with its scrollbar hidden. Choosing a link closes the
//     disclosure and moves focus to the clause heading, so a keyboard or
//     screen-reader reader lands in the clause rather than back on the link.
//
// `useMediaQuery` picks ONE tree rather than hiding the other with CSS, so the
// links exist once in the DOM. The query matches content.css's collapse point.
import { useEffect, useRef } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import useActiveSection from '../../hooks/useActiveSection'

/* Scroll the rail's own column so the current row is in view, without
   scrolling the page (`scrollIntoView` would move both). */
function keepRowVisible(col, row) {
  if (!col || !row || col.scrollHeight <= col.clientHeight) return
  const c = col.getBoundingClientRect()
  const r = row.getBoundingClientRect()
  if (r.top < c.top) col.scrollTop -= c.top - r.top
  else if (r.bottom > c.bottom) col.scrollTop += r.bottom - c.bottom
}

/* items: [{ id, label, lang? }]. `lang` marks a clause that is not in the
   page's language, on both the rail entry and (set by the page) the clause. */
export default function LegalContents({ items }) {
  const narrow = useMediaQuery('(max-width: 1000px)')
  const active = useActiveSection(items, { enabled: !narrow, pinLastAtBottom: true })
  const colRef = useRef(null)
  const detailsRef = useRef(null)

  useEffect(() => {
    if (!active || !colRef.current) return
    keepRowVisible(colRef.current, colRef.current.querySelector('[aria-current="location"]'))
  }, [active])

  const choose = (id) => {
    if (detailsRef.current) detailsRef.current.open = false
    // The browser performs the jump after this handler returns, and a jump to
    // a non-focusable target clears focus. Focus the heading once it has run.
    setTimeout(() => {
      document.getElementById(id)?.querySelector('h2')?.focus({ preventScroll: true })
    }, 0)
  }

  if (narrow) {
    return (
      <div className="cpg-rail-col lgl-toc-col">
        <details className="lgl-toc-m" ref={detailsRef}>
          <summary className="lgl-toc-m-sum">On this page</summary>
          <nav aria-label="On this page">
            <ol>
              {items.map((it) => (
                <li key={it.id}>
                  <a className="lgl-toc-m-row" href={`#${it.id}`} lang={it.lang} onClick={() => choose(it.id)}>
                    {it.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </details>
      </div>
    )
  }

  return (
    <div className="cpg-rail-col lgl-toc-col" ref={colRef}>
      {/* `aria-label`, not a visible heading: the rail is a landmark whose own
          name says what it is, and a heading above it would add an entry to a
          document whose headings are the clauses. */}
      <nav className="cpg-rail lgl-toc" aria-label="On this page">
        <ol>
          {items.map((it) => {
            const on = active === it.id
            return (
              <li key={it.id}>
                <a
                  className={on ? 'cpg-rail-row is-on' : 'cpg-rail-row'}
                  href={`#${it.id}`}
                  lang={it.lang}
                  aria-current={on ? 'location' : undefined}
                >
                  <span className="cpg-rail-label">{it.label}</span>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

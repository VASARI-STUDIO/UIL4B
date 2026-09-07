// The prose primitives every Learn article is built from.
//
// There are four, and the count is the point. An article surface accumulates
// callout boxes — "tip", "warning", "pro technique", "key insight" — until the
// reader cannot tell which box is load-bearing, and the pre-Learn DocsDesign
// draft in this repo had already got to three variants plus a stat tile plus a
// before/after grid (that file was deleted as dead source on 2026-09-06; the
// lesson it taught is why this list stays at four). Emphasis only works while it is scarce.
//
// So: a citation, a table, a formula, and a one-line aside. Everything else is
// a paragraph, a heading or a list.
//
// <Spec> is the one that carries the section's weight. These articles state
// rules that a published standard specifies, and a rule with no source is the
// exact failure the brief for this surface named. Every threshold in an article
// is either inside a <Spec> with a link to the clause, or computed in front of
// the reader by the product's own functions.

import { useId } from 'react'

/**
 * A requirement, attributed. `source` is the human citation (e.g.
 * "WCAG 2.2 — SC 1.4.3 Contrast (Minimum)"), `href` the clause itself,
 * `level` an optional conformance badge.
 *
 * The children are the requirement in the standard's own words wherever the
 * wording is short enough to quote; a paraphrase that drops a qualifier is how
 * "4.5:1" turns into a rule about buttons.
 */
export function Spec({ source, href, level, children }) {
  return (
    <figure className="lart-spec">
      <blockquote className="lart-spec-quote">{children}</blockquote>
      <figcaption className="lart-spec-cite">
        <a href={href} target="_blank" rel="noreferrer noopener">{source}</a>
        {level && <span className="lart-spec-level">{level}</span>}
      </figcaption>
    </figure>
  )
}

/**
 * A small data table. `caption` says where the numbers came from and is not
 * optional in practice — a table of figures with no provenance is the thing
 * these articles exist to avoid.
 *
 * `head` is an array of column labels; `rows` an array of arrays. A cell may be
 * a string, a number or a node. `numeric` lists the column indices to align
 * right and set in the mono face, because a column of ratios that is not
 * aligned cannot be compared down its own length.
 */
export function DataTable({ head, rows, caption, numeric = [] }) {
  const id = useId()
  const num = new Set(numeric)
  return (
    <figure className="lart-table-wrap">
      <div className="lart-table-scroll" tabIndex={0} role="group" aria-labelledby={`${id}-cap`}>
        <table className="lart-table">
          <thead>
            <tr>{head.map((h, i) => (
              <th key={i} scope="col" data-num={num.has(i) ? 'true' : undefined}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  c === 0
                    ? <th key={c} scope="row">{cell}</th>
                    : <td key={c} data-num={num.has(c) ? 'true' : undefined}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lart-table-cap" id={`${id}-cap`}>{caption}</figcaption>
    </figure>
  )
}

/** A formula or a code fragment, set in the mono face. */
export function Formula({ children, caption }) {
  return (
    <figure className="lart-formula">
      <pre><code>{children}</code></pre>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

/**
 * One line of clarification that would break the sentence it belongs to.
 * Not a callout — it has no icon, no label and no colour, because it is not
 * more important than the paragraph above it, it is just to one side of it.
 */
export function Aside({ children }) {
  return <p className="lart-aside">{children}</p>
}

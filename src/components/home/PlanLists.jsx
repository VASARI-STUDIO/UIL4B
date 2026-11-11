import {
  FREE_EXCLUSION_FULL,
  PRO_PHONE_COLLAPSED_ROWS,
  freeLines,
  proRows,
} from '../../config/planFacts'
import { PLAN_ICON_PATHS, bandHue } from './planListArt'

// The Free and Pro lists, one markup for every surface that prints them. The
// words come from planFacts.js; the drawing and colour of each icon from
// planListArt.js. The styles are in styles/pages/home-plans.css, which the
// surface imports.
//
// `live` is the export-themes switch, handed in so a test or a preview can show
// either state.

// A list is one DOM. The phone shows the same rows in another order, with the
// AI row lifted among the first few, so each row carries its phone position
// (--hpl-phone-order) and the hue it takes there (--hpl-c-phone). The stylesheet
// applies them under 768px.

/** The Free card's lines, then the one minus line. */
export function FreeList({ live }) {
  const lines = freeLines(live)
  return (
    <ul className="hpl-freelist">
      {lines.map((line, i) => (
        <li key={line}>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={bandHue('free', i, lines.length)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
          {line}
        </li>
      ))}
      <li className="hpl-minus">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 12h12" />
        </svg>
        {FREE_EXCLUSION_FULL}
      </li>
    </ul>
  )
}

/**
 * The Pro card's rows. `collapsed` hides the rows past the first few on a
 * phone, and only there: a wider screen always shows all of them. Its id is
 * what a "Show all" button points `aria-controls` at.
 */
export function ProList({ live, collapsed = false }) {
  const rows = proRows(live)
  const phoneIds = proRows(live, { phone: true }).map((row) => row.id)
  return (
    <ul id="pp-prolist" className="hpl-prolist" data-collapsed={collapsed ? 'true' : 'false'}>
      {rows.map((row, i) => {
        const phoneAt = phoneIds.indexOf(row.id)
        const hasPhoneSub = row.phoneSub !== row.sub
        return (
          <li
            key={row.id}
            data-extra={phoneAt >= PRO_PHONE_COLLAPSED_ROWS ? '' : undefined}
            style={{
              '--hpl-phone-order': phoneAt,
              '--hpl-c': bandHue('pro', i, rows.length),
              '--hpl-c-phone': bandHue('pro', phoneAt, rows.length),
            }}
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={PLAN_ICON_PATHS[row.icon]} />
            </svg>
            <span>
              <span className="hpl-row-t">{row.title}</span>
              {/* The short sub-line replaces the full one under 768px. */}
              <span className={`hpl-row-s${hasPhoneSub ? ' hpl-row-s--full' : ''}`}>{row.sub}</span>
              {hasPhoneSub && <span className="hpl-row-s hpl-row-s--phone">{row.phoneSub}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

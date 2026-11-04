import { Link } from 'react-router-dom'

// THE LICENCE CREDITS FOR THE ICON SETS ON SCREEN, as the footer's notice row.
//
// Several of these sets are Creative Commons Attribution sets, and attribution
// is a condition of those licences, so the credit must be on the page whenever
// their glyphs are. It lives in the footer (inside the contentinfo landmark,
// where licence notices belong) and is rendered by SpectrumFooter's `notice`
// slot. `rows` come from creditRows() in data/iconPackCredits.js: each set's
// name and set page, and the licence name the registry (or the table) gives it.
//
// Sets read as a comma-separated list with each licence in brackets, so a
// screen reader announces a list rather than a run of separator glyphs. With no
// rows (the Emoji tab, the Groups index) there is nothing to credit and the row
// is not drawn; /credits is still one of the footer's Legal links.
export default function IconCredits({ rows, scope = 'page' }) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="sp-footer-notice">
      <p className="sp-footer-notice-h">{scope === 'group' ? 'Icon sets in this group' : 'Icon sets on this page'}</p>
      <p className="sp-footer-notice-list">
        {rows.map((row, i) => (
          <span key={row.prefix}>
            <a href={row.url} target="_blank" rel="noopener noreferrer">{row.name}</a>
            {` (${row.licenceName})`}
            {i < rows.length - 1 ? ', ' : '. '}
          </span>
        ))}
        <Link to="/credits">Every licence in full</Link>
      </p>
    </div>
  )
}

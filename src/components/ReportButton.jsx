import { requestContentReport } from '../utils/contentReport'

// The one Report control for community content. It does not open anything
// itself: it asks ContentReportDialog (mounted app-wide beside the feedback
// bubble) to open for this item, so every surface reports through the same
// form and the same endpoint. If nothing answers, /feedback is the fallback.
//
// `variant="icon"` is a flag in a small chip for the corner of a card; the
// button around it is 44px square so the chip is not the target. `variant="text"`
// is the labelled button for a dialog footer. Both are named "Report <item>",
// so a screen reader tells one card's control from the next, and the visible
// word "Report" leads that name (WCAG 2.5.3).
//
// `beforeOpen` runs first, for a control inside a dialog that has to get out of
// the way (the report form sits under a taller overlay otherwise).
export default function ReportButton({ target, variant = 'icon', className = '', beforeOpen }) {
  if (!target) return null
  const onClick = (e) => {
    e.stopPropagation()
    beforeOpen?.()
    if (!requestContentReport(target) && typeof window !== 'undefined') window.location.assign('/feedback')
  }
  const flag = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  )
  const label = `Report ${target.name}`
  if (variant === 'text') {
    return (
      <button type="button" className={`report-btn report-btn--text ${className}`.trim()} aria-label={label} aria-haspopup="dialog" onClick={onClick}>
        {flag}
        <span>Report</span>
      </button>
    )
  }
  return (
    <button type="button" className={`report-btn report-btn--icon ${className}`.trim()} aria-label={label} aria-haspopup="dialog" title="Report" onClick={onClick}>
      <span className="report-btn-chip">{flag}</span>
    </button>
  )
}

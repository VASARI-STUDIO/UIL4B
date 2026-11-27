// The template line under the rail's choice: the template's name, whether it is free or Pro, and the one way to change it. "Change
// template" opens the grid of templates in place of the preview; while that grid is open the same link reads "Back to preview".
// There is no other template link in the dialog (the footer has none). The mark comes from the template config, not the plan: a Pro
// account sees the same Free or Pro word, and the server still decides what downloads.
export default function ExportTemplateLine({ name, pro, open, onToggle, disabled }) {
  return (
    <div className="xd-tline">
      <p className="xd-tline-n">
        <span className="xd-tline-k">Template</span>
        <strong>{name}</strong>
        <span className="xd-tline-m">· {pro ? 'Pro' : 'Free'}</span>
      </p>
      <button type="button" className="xd-link xd-tline-b" id="xd-change-template" aria-pressed={open} onClick={onToggle} disabled={disabled}>
        {open ? 'Back to preview' : 'Change template'}
      </button>
    </div>
  )
}

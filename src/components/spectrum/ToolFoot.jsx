import { Link } from 'react-router-dom'
import OpenPill from './OpenPill'

// ONE FOOTER FOR ALL FOUR BENCH WINDOWS.
// At 761px and up it is one 64px row: the secondary link as a plain text link on
// the left, the Open pill on the right. On a phone the pill is full width at the
// foot (thumb reach) with the text link centred above it. A window with no
// secondary destination (Icons) leaves the left empty.
export default function ToolFoot({ secondary, to, onClick, children }) {
  return (
    <div className="sp-tool-foot">
      {secondary ? <Link className="sp-tool-link" to={secondary.to}>{secondary.label}</Link> : null}
      <OpenPill to={to} onClick={onClick}>{children}</OpenPill>
    </div>
  )
}

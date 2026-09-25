import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import { toolRoute } from '../../data/toolTree'
import { tintConfigFor } from '../../data/designDefaults'
import { generateTintScale } from '../../utils/colors'
import Glyph from './Glyph'
import { liveToolCount, numberWord } from './workspace'

// "Start something" — the design's quick-start grid (UIL4B App.dc.html,
// `projects` screen): the Palette Builder as a lead tile spanning two columns
// and three rows with a live ramp, six tools with their own hue chips, and a
// button that opens the Create menu.
//
// Every tile is a link to a live route, read from the tool tree, so a renamed
// route fails the build instead of shipping a dead tile. None of it needs an
// account, which is why a signed-out visitor landing here from the sales page
// gets the same grid.

// The design's six, in the design's order, with the design's notes. `hue` is the design's fixed OKLCH hue per chip.
const QUICK = [
  { id: 'gradient', icon: 'gradient', label: 'Gradient', note: 'Two stops and an angle', to: toolRoute('gradient') },
  { id: 'tint', icon: 'drop-half', label: 'Tint', note: 'Even ramp steps', to: toolRoute('tint') },
  { id: 'semantic', icon: 'circles-three', label: 'Semantic', note: 'Brand and state colours', to: toolRoute('semantic') },
  { id: 'contrast', icon: 'check-square', label: 'Contrast', note: 'Check any pair for AA', to: toolRoute('contrast') },
  { id: 'icons', icon: 'shapes', label: 'Icon set', note: 'Search, restyle, export', to: toolRoute('icons') },
  { id: 'palettes', icon: 'squares-four', label: 'Palette Library', note: 'Browse and load a system', to: '/discover/palettes' },
]

/**
 * Open the header's Create menu from the page.
 *
 * The header is a separate component and has no public "open this menu" call,
 * so this asks first — a cancelable `uil4b:open-menu` event the header can
 * answer with preventDefault() — and otherwise presses the same control a
 * person would: the Create trigger where the bar shows it, or the menu button
 * that opens the sheet (whose Create section is open by default) on a phone.
 */
function openCreateMenu() {
  const asked = new CustomEvent('uil4b:open-menu', { detail: { section: 'create' }, cancelable: true })
  if (!window.dispatchEvent(asked)) return
  const trigger = [...document.querySelectorAll('.pnav-trigger')]
    .find((b) => b.offsetParent !== null && b.textContent.trim().startsWith('Create'))
  if (trigger) {
    if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
    trigger.focus()
    return
  }
  const sheet = document.querySelector('.pnav-mobile')
  if (sheet && sheet.offsetParent !== null && sheet.getAttribute('aria-expanded') !== 'true') sheet.click()
}

export default function StartSomething() {
  const { design } = useProject()

  // THE LIVE RAMP. The design's lead tile shows the Palette Builder's current columns.
  // Ours is the working design: its palette when it has one, otherwise the
  // eleven-stop ramp the Tint tool builds from its base — the same ramp /help
  // shows as "what a new project starts from".
  const ramp = useMemo(() => {
    const colors = (design?.palette?.colors || []).filter(Boolean)
    if (colors.length > 1) return colors
    try { return generateTintScale(tintConfigFor(design)) } catch { return colors }
  }, [design])

  const count = liveToolCount()

  return (
    <section className="uh-start" aria-labelledby="uh-start-h">
      <div className="uh-start-head">
        <h2 id="uh-start-h" className="uh-start-h">Start something</h2>
        <button type="button" className="uh-alltools" onClick={openCreateMenu}>
          <span>All {numberWord(count)} tools</span>
          <Glyph name="caret-right" size={12} className="uh-alltools-caret" />
        </button>
      </div>
      <div className="uh-quick">
        <Link className="uh-lead" to={toolRoute('palette')}>
          <span className="uh-lead-top">
            <span className="uh-lead-ico" aria-hidden="true"><Glyph name="palette" size={18} /></span>
            <span className="uh-lead-text">
              <span className="uh-lead-name">Palette Builder</span>
              <span className="uh-lead-note">Start from a seed colour and the roles, ramp and tokens follow.</span>
            </span>
            <span className="uh-lead-go" aria-hidden="true"><Glyph name="arrow-up-right" size={12} /></span>
          </span>
          <span className="uh-lead-ramp" aria-hidden="true">
            {ramp.map((c, i) => <span key={`${c}-${i}`} style={{ background: c }} />)}
          </span>
        </Link>
        {QUICK.map((q) => (
          <Link key={q.id} className="uh-tool" data-tool={q.id} to={q.to}>
            <span className="uh-tool-ico" aria-hidden="true"><Glyph name={q.icon} size={16} /></span>
            <span className="uh-tool-text">
              <span className="uh-tool-name">{q.label}</span>
              <span className="uh-tool-note">{q.note}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

import { useTheme } from '../../contexts/ThemeContext'
import { PH_CIRCLE_HALF, PH_MOON, PH_SUN } from '../spectrum/phosphorNav'

// THE ONE-BUTTON THEME CONTROL, from both design sources.
//
// `UIL4B - Spectrum.dc.html` line 230 and `UIL4B App.dc.html` line 108 are the
// same control: a single square icon button carrying `cycleTheme`, labelled
// `themeNextLabel` — the name of the state it is about to move TO, not the one
// it is in. Both navs in this product now render it, so it lives here rather
// than twice.
//
// IT IS NOT A REPLACEMENT FOR ThemeChoice. The three-way segmented control
// still ships in the account popover, the compact menu, the mobile sheet and
// /settings, and it is the only one of the two that can be READ — a cycle
// button announces where it is going, never where it is. This is the fast path
// for a pointer; that is the reachable, statable one. Deleting either would
// take a path away from someone: the segment is display:none on a phone bar,
// the cycle is one tap.
//
// THE CYCLE IS light → dark → system → light, and it cycles `themePref` (the
// raw preference), never `theme` (the resolved one). Cycling the resolved value
// would make System unreachable — you would land on whatever System currently
// resolves to and there would be no third stop.
const ORDER = ['light', 'dark', 'system']

// One glyph set for both navs: Phosphor's own sun, moon and circle-half, as the
// Spectrum design's control draws them (line 230, and `themeIcon` at 1935).
// System is the half-filled circle. The paths ship inline from phosphorNav, so
// there is no icon font and no extra request on first paint.
function phosphor(d) {
  return function PhosphorGlyph() {
    return (
      <svg viewBox="0 0 256 256" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }
}
const PHOSPHOR = { light: phosphor(PH_SUN), dark: phosphor(PH_MOON), system: phosphor(PH_CIRCLE_HALF) }
const NAME = { light: 'Light', dark: 'Dark', system: 'System' }

export default function ThemeCycle({ className = 'pnav-iconbtn pnav-theme', glyphs }) {
  const { theme, themePref, setTheme } = useTheme()
  const current = ORDER.includes(themePref) ? themePref : 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Glyph = PHOSPHOR[current]

  // The accessible name says what the press DOES, which is the only thing a
  // non-sighted user can act on — and it names how System currently resolves,
  // for the same reason ThemeChoice does: otherwise "System theme" is an
  // instruction to pick something whose outcome is unstated.
  // The marketing pill takes the design's own label too — `themeNextLabel`,
  // "Theme: auto. Switch to light." (line 1936) — which names the state it is
  // in as well as the one it moves to. The design calls System "auto".
  const word = (t) => (t === 'system' ? 'auto' : t)
  const label = glyphs === 'phosphor'
    ? `Theme: ${word(current)}. Switch to ${word(next)}.`
    : next === 'system'
      ? `Switch to the system theme — currently ${theme}`
      : `Switch to the ${NAME[next].toLowerCase()} theme`

  return (
    <button
      type="button"
      className={className}
      // Not aria-pressed: this is not a two-state toggle, it is a three-stop
      // cycle, and a boolean would have to lie about one of the three.
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
    >
      <Glyph />
    </button>
  )
}

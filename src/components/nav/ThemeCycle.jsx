import { useTheme } from '../../contexts/ThemeContext'

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

// Phosphor's `sun`, `moon` and `monitor`, drawn as inline SVG.
//
// SPECTRUM LOADS PHOSPHOR FROM A CDN (`class="ph ph-{{ themeIcon }}"`). This
// product does not add origins to the first-paint path and ships every glyph
// inline, so the three shapes are ported by hand at the same 16px optical size
// the design sets. Same silhouettes, no request, no icon font.
function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.6v2.3M12 19.1v2.3M4.95 4.95l1.63 1.63M17.42 17.42l1.63 1.63M2.6 12h2.3M19.1 12h2.3M4.95 19.05l1.63-1.63M17.42 6.58l1.63-1.63" />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 13.4A9.2 9.2 0 1 1 10.6 3.2a7.2 7.2 0 0 0 10.2 10.2Z" />
    </svg>
  )
}

// A display, not a time of day — the same reasoning ThemeChoice.jsx records for
// its own System glyph: a half-sun/half-moon reads as a third colour scheme.
function SystemGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.8" y="4.2" width="18.4" height="12.4" rx="2.2" />
      <path d="M8.8 20.2h6.4M12 16.6v3.6" />
    </svg>
  )
}

const GLYPH = { light: SunGlyph, dark: MoonGlyph, system: SystemGlyph }
const NAME = { light: 'Light', dark: 'Dark', system: 'System' }

export default function ThemeCycle({ className = 'pnav-iconbtn pnav-theme' }) {
  const { theme, themePref, setTheme } = useTheme()
  const current = ORDER.includes(themePref) ? themePref : 'system'
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
  const Glyph = GLYPH[current]

  // The accessible name says what the press DOES, which is the only thing a
  // non-sighted user can act on — and it names how System currently resolves,
  // for the same reason ThemeChoice does: otherwise "System theme" is an
  // instruction to pick something whose outcome is unstated.
  const label = next === 'system'
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

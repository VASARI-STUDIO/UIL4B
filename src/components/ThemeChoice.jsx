import { useTheme } from '../contexts/ThemeContext'
import { PH_CIRCLE_HALF, PH_MOON, PH_SUN } from './spectrum/phosphorNav'

// The one theme control, rendered in three places: the nav popover (signed in
// and signed out), the mobile sheet, and /settings › Accessibility.
//
// ONE COMPONENT ON PURPOSE. The site shipped a complete dark theme that no
// visitor could reach partly because the control was in one popover that is
// display:none below 768px, while two comments elsewhere — the `.pnav-more-wrap`
// media query and the Settings › Accessibility blurb — both claimed the theme
// lived somewhere it did not. A second implementation is how that comes back.
//
// THREE STATES, and the third is the default. It renders `themePref` — the raw
// preference — not `theme`, the resolved one. Rendering the resolved value would
// light up "Dark" for someone sitting in System on a dark device, and there
// would then be no way to tell the two apart or to get back to System.
//
// `aria-pressed` rather than a radiogroup: these are three toggle buttons in a
// group, they are all always reachable by Tab, and the panel around them is a
// disclosure, not a menu (see 28-account-menu-keyboard.spec.js). Roving tabindex
// would fight the popover's own arrow-key movement.

// The same Phosphor sun, moon and circle-half as the theme cycle button, so
// System looks the same wherever it is offered.
function phosphor(d) {
  return function PhosphorIcon() {
    return (
      <svg viewBox="0 0 256 256" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d={d} />
      </svg>
    )
  }
}
const SunIcon = phosphor(PH_SUN)
const MoonIcon = phosphor(PH_MOON)
const SystemIcon = phosphor(PH_CIRCLE_HALF)

// Not destructured in the map below: `no-unused-vars` here is configured with
// varsIgnorePattern '^[A-Z_]', which exempts top-level component consts but not
// a destructured parameter, and no eslint-plugin-react is installed to mark JSX
// identifiers as used. `c.Glyph` sidesteps both.
const THEME_CHOICES = [
  { value: 'light', label: 'Light', Glyph: SunIcon },
  { value: 'dark', label: 'Dark', Glyph: MoonIcon },
  { value: 'system', label: 'System', Glyph: SystemIcon },
]

export default function ThemeChoice() {
  const { theme, themePref, setTheme } = useTheme()

  return (
    <div className="theme-seg" role="group" aria-label="Theme">
      {THEME_CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          className="theme-seg-btn"
          data-theme-choice={c.value}
          aria-pressed={themePref === c.value}
          // Says WHICH way System currently resolves, so a screen-reader user
          // choosing it is not left guessing what they just asked for.
          aria-label={c.value === 'system' ? `System theme — currently ${theme}` : `${c.label} theme`}
          onClick={() => setTheme(c.value)}
        >
          <c.Glyph />
          {c.label}
        </button>
      ))}
    </div>
  )
}

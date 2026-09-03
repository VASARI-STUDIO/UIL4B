import { useTheme } from '../contexts/ThemeContext'

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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// "System" is a display, not a time of day — a monitor reads as "whatever your
// device says", where a half-sun/half-moon would read as a third colour scheme.
function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 20h6M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

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

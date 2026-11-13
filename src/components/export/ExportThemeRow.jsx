import { useId } from 'react'
import useRovingRadio from '../../hooks/useRovingRadio'
import { pickerThemesFor, preloadTheme, themeShots, shapeClass, themedFileIsPro } from '../../config/exportThemePicker'
import { preloadThemeStandins, themeStandinShots } from '../../utils/lockedStandin'

// The Theme step of the Export dialog: the themes that can draw the file, listed in place (a guidelines-only theme is listed for
// the guidelines only), and a line naming the sample brand the pictures come from. For an account that is not Pro the list
// is in two groups, "Free" (the themes this file is free in) then "In Pro", and nothing is tagged row by row: the group is the
// tier, and the dock says what the button does. A Pro account, or one whose plan is still being read, sees one plain list.
//
// The list is a radiogroup with one Tab stop (the chosen theme): arrows choose the next or previous theme, and the ends wrap.
// Choosing a theme changes the picture at once, so there is nothing to confirm and nothing that covers the rest of the dialog.
//
// The previews are pictures (public/export-themes), so no theme code is in the page. A theme's pictures are fetched when its
// row gets hover or focus, so choosing it finds them in.
//
// A file the viewer cannot export in that theme is previewed from a tiny blurred stand-in (utils/lockedStandin), fetched and drawn
// in place of the real picture, so the real file never reaches the page or the network for that viewer.

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// `standin` swaps the real pictures for their stand-ins; `locked` adds the Pro lock over them. They differ while the plan is still
// being read: the pictures are held back at once, and the lock waits until the account is known not to be Pro.
export function ThemeStage({ kind, theme, locked, standin = locked, lockText }) {
  const shots = standin ? themeStandinShots(kind, theme) : themeShots(kind, theme)
  const cls = kind === 'book' ? 'book' : shapeClass(theme.shape)
  return (
    <div className={`xd-theme-stage xd-theme-stage--${cls}${standin ? ' is-locked' : ''}`}>
      {shots.map((s) => <img key={s.src} src={s.src} data-pin-nopin="true" alt={s.alt} decoding="async" />)}
      {locked && <span className="xd-theme-lock">{lockText}</span>}
    </div>
  )
}

export default function ExportThemeRow({ value, onChange, isPro, checking, yourName, kind = 'kit', file = 'kit' }) {
  const uid = useId()
  const all = pickerThemesFor(file)
  // Free then Pro, by the dock's own call (themedFileIsPro), so a group never says Free for a file the dock locks.
  const grouped = !isPro && !checking
  const free = grouped ? all.filter((t) => !themedFileIsPro(file, t.id)) : all
  const pro = grouped ? all.filter((t) => themedFileIsPro(file, t.id)) : []
  const groups = [
    { id: 'free', label: 'Free', themes: free },
    { id: 'pro', label: 'In Pro', themes: pro },
  ].filter((g) => g.themes.length)
  const themes = groups.flatMap((g) => g.themes)
  const chosen = Math.max(0, themes.findIndex((t) => t.id === value))
  const shown = themes[chosen] || all[0]
  const roving = useRovingRadio(themes.length, (i) => onChange(themes[i].id))

  // Fetch a theme's pictures ahead of choosing it. A file this account cannot export in that theme gets its stand-ins, never the real pictures.
  const warm = (id) => {
    if (kind !== 'kit' && !isPro && themedFileIsPro(file, id)) preloadThemeStandins(kind, id)
    else preloadTheme(kind, id)
  }

  return (
    <div className="xd-theme">
      <div className="xd-theme-list" role="radiogroup" aria-label="Theme">
        {groups.map((g) => (
          <div key={g.id} className="xd-theme-group" role={grouped ? 'group' : undefined} aria-labelledby={grouped ? `${uid}-${g.id}` : undefined}>
            {grouped && <p className="xd-theme-gh" id={`${uid}-${g.id}`}>{g.label}</p>}
            {g.themes.map((t) => {
              const i = themes.indexOf(t)
              const on = i === chosen
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className={`xd-theme-opt${on ? ' is-on' : ''}`}
                  ref={(el) => { roving.refs.current[i] = el }}
                  onClick={() => onChange(t.id)}
                  onKeyDown={(e) => roving.onKeyDown(e, i)}
                  onPointerEnter={() => warm(t.id)}
                  onFocus={() => warm(t.id)}
                >
                  <span className="xd-theme-opt-t"><span className="xd-theme-opt-n">{t.name}</span><span className="xd-theme-opt-b">{t.brand}</span></span>
                  {on && <CheckIcon />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <p className="xd-theme-sample">Shown with {shown.brand}. Yours uses {yourName}.</p>
    </div>
  )
}

import { useMemo } from 'react'
import ExportProTag from '../ExportProTag'
import { orderedThemesFor, shapeClass, themeThumb, themeThumb2x, themedFileIsPro } from '../../config/exportThemePicker'

// "View templates": every template the chosen file can be made in, as a grid inside the dialog (not a page of its own).
// A card is the template's picture, its name and sample brand. A template that is Pro for this account carries the Pro mark; its
// picture stays as sharp as the others (the card uses the public thumbnail, not the page picture the stage draws).
// Premium templates first (21 up), then the ones free for this file, then the rest. One order for every account.
// Choosing a card hands its id to `onPick`, which returns to the main view with it selected.

// One template card. The premium strip in the main view draws these too, so there is one card and one Pro rule.
export function ThemeCard({ theme: t, pro, on, onPick }) {
  return (
    <button
      type="button"
      className={`xd-theme-opt xd-tpl-card${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={`${t.name}, ${t.brand} sample brand${pro ? ', Pro' : ''}${on ? ', chosen' : ''}`}
      onClick={() => onPick(t.id)}
    >
      <span className={`xd-tpl-pic ${shapeClass(t.shape)}`}>
        <img src={themeThumb(t)} srcSet={`${themeThumb(t)} 1x, ${themeThumb2x(t)} 2x`} width="142" height="80" alt="" data-pin-nopin="true" loading="lazy" decoding="async" />
      </span>
      <span className="xd-tpl-n">{t.name}</span>
      <span className="xd-tpl-b">{t.brand}</span>
      {pro && <ExportProTag className="xd-tpl-pro" />}
    </button>
  )
}

export default function ExportTemplates({ file, value, onPick, isPro, checking, label }) {
  const cards = useMemo(
    () => orderedThemesFor(file).map((t) => ({ theme: t, pro: !isPro && !checking && themedFileIsPro(file, t.id) })),
    [file, isPro, checking])
  return (
    <section className="xd-tpl" aria-label={label}>
      <ul className="xd-tpl-grid">
        {cards.map(({ theme: t, pro }) => (
          <li key={t.id}>
            <ThemeCard theme={t} pro={pro} on={t.id === value} onPick={onPick} />
          </li>
        ))}
      </ul>
    </section>
  )
}

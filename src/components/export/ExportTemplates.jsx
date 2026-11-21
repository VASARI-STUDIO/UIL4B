import { useMemo } from 'react'
import ExportProTag from '../ExportProTag'
import { pickerThemesFor, shapeClass, themeThumb, themeThumb2x, themedFileIsPro } from '../../config/exportThemePicker'

// "View templates": every template the chosen file can be made in, as a grid inside the dialog (not a page of its own).
// A card is the template's picture, its name and sample brand. A template that is Pro for this account carries the Pro mark; its
// picture stays as sharp as the others (the card uses the public thumbnail, not the page picture the stage draws). A free account
// sees the templates it can export first. Choosing a card hands its id to `onPick`, which returns to the main view with it selected.
export default function ExportTemplates({ file, value, onPick, isPro, checking, label }) {
  const cards = useMemo(() => {
    const all = pickerThemesFor(file).map((t) => ({ theme: t, pro: !isPro && !checking && themedFileIsPro(file, t.id) }))
    return isPro || checking ? all : [...all.filter((c) => !c.pro), ...all.filter((c) => c.pro)]
  }, [file, isPro, checking])
  return (
    <section className="xd-tpl" aria-label={label}>
      <ul className="xd-tpl-grid">
        {cards.map(({ theme: t, pro }) => {
          const on = t.id === value
          return (
            <li key={t.id}>
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
            </li>
          )
        })}
      </ul>
    </section>
  )
}

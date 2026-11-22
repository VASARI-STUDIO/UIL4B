import { useId } from 'react'
import { premiumThemesFor, themedFileIsPro, pickerThemesFor } from '../../config/exportThemePicker'
import { ThemeCard } from './ExportTemplates'

// The first few premium templates under the preview, in the main view: a click chooses one in place; "See all" opens the gallery.
export default function ExportPremiumStrip({ file, value, onPick, isPro, checking, count, catName, onSeeAll }) {
  const headId = useId()
  const themes = premiumThemesFor(file).slice(0, count)
  const total = pickerThemesFor(file).length
  if (!themes.length) return null
  return (
    <section className="xd-prem" aria-labelledby={headId}>
      <div className="xd-prem-head">
        <h3 className="xd-step-l" id={headId}>Premium templates</h3>
        <button type="button" className="xd-link" onClick={onSeeAll} aria-label={`See all ${total} ${catName} templates`}>See all {total}</button>
      </div>
      <ul className="xd-tpl-grid xd-prem-grid" style={{ '--xd-prem-n': count }}>
        {themes.map((t) => (
          <li key={t.id}>
            <ThemeCard theme={t} on={t.id === value} pro={!isPro && !checking && themedFileIsPro(file, t.id)} onPick={onPick} />
          </li>
        ))}
      </ul>
    </section>
  )
}

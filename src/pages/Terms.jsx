// /terms — Terms of Service.
//
// TYPOGRAPHY AND STRUCTURE ONLY. NOT ONE WORD OF THE LEGAL TEXT IS TOUCHED
// HERE, and none should be. Every string on this page still comes from
// `t('terms.*')`, in the same order, with the same punctuation — the SECTIONS
// table below is a list of translation KEYS, not a copy of the text.
//
// ── What the Spectrum pass changed, and why ────────────────────────────────
//
// The page was eight headings and eight paragraphs inside one
// `.card.legal-card` box, with every paragraph carrying its own inline
// `style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}`. Three
// problems, none of them about the words:
//
//   · A legal document is the one surface on a site a reader ARRIVES AT
//     LOOKING FOR ONE CLAUSE. There was no way to see the eight clauses at
//     once and no way to jump to one. Every legal surface in the Mobbin corpus
//     worth copying solves that the same way — a table of contents that stays
//     put beside the document:
//       https://mobbin.com/sites/sections/7daeaf18-5ea6-4d3b-96ad-6e87fd114dc7  Miro
//       https://mobbin.com/sites/sections/9d751164-5282-43ef-8f89-ec642922c329  Intercom
//       https://mobbin.com/sites/sections/99c5b5d0-94d4-4e79-8ff3-6afadd19f8a3  Customer.io
//       https://mobbin.com/sites/sections/5a9e5e01-f8ab-4890-af79-e3f9dbee7515  Harvest
//     and the ones that cannot fit a rail put a numbered index at the top
//     instead, which is exactly what this rail becomes below 1000px:
//       https://mobbin.com/sites/sections/25be7dfb-8c1f-4647-92fe-4c673a7ad04d  TIDAL
//       https://mobbin.com/sites/sections/e9dbc73f-fc73-437a-8cf9-ac04a6031b7b  Shopify
//
//   · Inline `style` is unthemeable and unmeasurable. Twenty-two of them on
//     this file and Privacy.jsx between them, hard-coding 14px and one grey,
//     where no stylesheet could reach them and no computed-style sweep could
//     explain them. They are gone; legal.css carries the same intent as rules.
//
//   · The card. `.legal-card` drew a box around the entire document, which is
//     the "every idea enclosed in an equally weighted rounded rectangle"
//     construction the quality bar names — and around a 3,000-word document it
//     does not even do the one thing a card is for, which is to separate that
//     idea from the next one. The separation a legal page needs is BETWEEN
//     CLAUSES, so the clauses are separated by a rule and the box is gone.
//
// ── The table is derived, so a heading and its index entry cannot drift ────
//
// SECTIONS is read twice — once to build the rail, once to build the document
// — so there is exactly one place a section exists. A clause added to en.json
// and listed here appears in both; it cannot appear in one.
//
// The ids are `terms-sN`, keyed off the translation key rather than slugified
// from the title, so a deep link survives translation. `t('terms.s1Title')` is
// "1. Acceptance" in English and something else in the nine other locales; an
// id cut from the rendered title would change with the language and every
// bookmark to it would break.
import { useI18n } from '../contexts/I18nContext'
import '../styles/pages/content.css'
import '../styles/pages/legal.css'

/* Each row names the keys it renders and nothing else. `items` marks the one
   clause that is a list rather than a paragraph; `contact` marks the one that
   ends in a mailto. Both were already true of this page — they are recorded
   here so the renderer below has no per-section special cases in its markup. */
const SECTIONS = [
  { id: 'terms-s1', title: 'terms.s1Title', text: 'terms.s1Text' },
  { id: 'terms-s2', title: 'terms.s2Title', text: 'terms.s2Text' },
  { id: 'terms-s3', title: 'terms.s3Title', text: 'terms.s3Text' },
  { id: 'terms-s4', title: 'terms.s4Title', text: 'terms.s4Text' },
  { id: 'terms-s5', title: 'terms.s5Title', intro: 'terms.s5Intro', items: 'terms.s5Items' },
  { id: 'terms-s6', title: 'terms.s6Title', text: 'terms.s6Text' },
  { id: 'terms-s7', title: 'terms.s7Title', text: 'terms.s7Text' },
  { id: 'terms-s8', title: 'terms.s8Title', text: 'terms.s8Text', contact: 'legal@uil4b.com' },
]

export default function Terms() {
  const { t } = useI18n()

  return (
    <div className="sec cpg lgl">
      <header className="lgl-head">
        <h1 className="cpg-h1">{t('terms.title')}</h1>
        <p className="cpg-cap lgl-updated">{t('terms.lastUpdated')}</p>
      </header>

      <div className="cpg-split">
        <div className="cpg-rail-col">
          {/* `aria-label`, not a visible heading: the rail is a landmark whose
              own name says what it is, and a heading above it would add a
              ninth entry to a document whose headings are numbered 1–8. */}
          <nav className="cpg-rail lgl-toc" aria-label="On this page">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a className="cpg-rail-row" href={`#${s.id}`}>
                    <span className="cpg-rail-label">{t(s.title)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="legal-card lgl-doc">
          {SECTIONS.map((s) => {
            const items = s.items ? t(s.items) : null
            return (
              <section className="lgl-sec" id={s.id} key={s.id}>
                <h2 className="legal-h lgl-h">{t(s.title)}</h2>
                {s.intro && <p className="lgl-p">{t(s.intro)}</p>}
                {items && (
                  <ul className="lgl-list">
                    {(Array.isArray(items) ? items : []).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
                {s.text && (
                  <p className="lgl-p">
                    {t(s.text)}
                    {s.contact && (
                      <>
                        {' '}
                        <a className="lgl-a" href={`mailto:${s.contact}`}>{s.contact}</a>.
                      </>
                    )}
                  </p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

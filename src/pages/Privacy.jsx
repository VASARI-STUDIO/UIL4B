// /privacy — Privacy & data.
//
// TYPOGRAPHY AND STRUCTURE ONLY. NOT ONE WORD OF THE POLICY IS TOUCHED HERE.
// The translated clauses still come from `t('privacy.*')` and the three
// English-only sections below — the storage disclosure, the aggregate usage
// counts and the Vercel Web Analytics notice — are reproduced verbatim,
// character for character, from the version this replaced. A privacy policy is
// a disclosure, and a disclosure that an agent has smoothed is a different
// disclosure. See the note in Terms.jsx for the same rule and the Mobbin
// evidence behind the shape.
//
// ── What moved ────────────────────────────────────────────────────────────
//
//   · Eleven headings and their paragraphs came out of one `.card.legal-card`
//     box and became eleven rule-separated clauses with a table of contents
//     beside them. The document is ~3,400 words; it had no index and no way to
//     jump to a clause.
//   · Twenty inline `style={{ fontSize: 14, color: 'var(--t1)', … }}`
//     attributes are gone. They were unthemeable, unmeasurable by the
//     computed-style sweep, and hard-coded a 14px body size on the one page in
//     the product a reader is most likely to be squinting at.
//   · The storage table keeps every cell, every `data-label` and its stacked
//     phone layout. legal.css only restyles it — see the note there about
//     `.storage-key`, which global.css paints in `--accent-strong`, the one
//     accent token that does not track `--accent`.
//
// ── The index is derived from the same list the document is ───────────────
//
// SECTIONS is read twice, so a clause cannot exist in the rail and not in the
// page, or the reverse. The ids are keyed off the translation key rather than
// slugified from the rendered title, so a deep link survives translation into
// the nine other locales this app ships.
import { useI18n } from '../contexts/I18nContext'
import { KEY_PURPOSES } from '../utils/dataExport'
import '../styles/pages/content.css'
import '../styles/pages/legal.css'

// Generated from the single shared table in utils/dataExport.js, which is also
// what the exporter and "Clear local data" enumerate. It used to be a third
// hand-written copy, and it had drifted badly enough to be actively wrong:
//
//   • It listed 13 of the ~40 keys the app writes.
//   • It disclosed `vs-users` — "Account credentials (email + hashed password)
//     for local accounts" — and `vs-session`. NEITHER KEY EXISTS. The app moved
//     to Firebase Auth and has stored no password, hashed or otherwise, since.
//     A privacy policy claiming to hold credentials it does not hold is a
//     disclosure defect in its own right.
//
// Deriving it means the policy cannot fall behind the code again.
const STORAGE_DISCLOSURE = Object.entries(KEY_PURPOSES)
  .map(([key, meta]) => ({ key, ...meta }))
  .sort((a, b) => a.key.localeCompare(b.key))

function StorageSection() {
  return (
    <>
      <p className="lgl-p">
        UIL4B writes the following keys to your browser&apos;s localStorage. With one narrow exception described below, this data stays on your device. You can inspect, export, or clear all of this from <a className="lgl-a" href="/settings">Settings → Your data</a>.
      </p>
      <div className="lgl-table-wrap">
        <table className="storage-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Purpose</th>
              <th>Personal data</th>
            </tr>
          </thead>
          <tbody>
            {/* `data-label` is not decoration. Below 640px the table stacks
                into one card per row and the <thead> is display:none, so
                without these each card was three unlabelled lines: a key, a
                sentence, and a bare YES / NO / ACCOUNT-BOUND floating with
                nothing to say what it answered. On the page where we disclose
                what we store, "vs-accounts … YES" that does not say YES to
                WHAT is worse than no table at all. The CSS renders these as
                the row labels the <th> cells would have been. */}
            {STORAGE_DISCLOSURE.map(row => (
              <tr key={row.key}>
                <td data-label="Key"><span className="storage-key">{row.key}</span></td>
                <td className="storage-purpose" data-label="Purpose">{row.purpose}</td>
                <td data-label="Personal data"><span className={`storage-pii ${row.pii}`}>{row.pii === 'yes' ? 'Yes' : row.pii === 'local' ? 'Account-bound' : 'No'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lgl-aside">
        <strong>Note:</strong> "Account-bound" means the data is keyed to an account but never leaves your device. We keep no copy of it.
      </p>
    </>
  )
}

function AggregateSection() {
  return (
    <p className="lgl-p">
      When you are <strong>signed in</strong>, UIL4B records anonymous, aggregate usage counts in our Firestore database (Sydney region) to understand which features are useful and where to invest. Specifically, we increment per-day tallies of which page paths are visited (for example <span className="storage-key">/create/color</span>) and how many times tools are used (for example a font copy or a colour pick). These are running totals shared across all users — they contain <strong>no message content, no prompt text, no colours or fonts you chose, and nothing that identifies you</strong>. We cannot tie a count back to an individual account. Signed-out visitors send nothing; their usage is tracked only in localStorage on their own device.
    </p>
  )
}

/* Named because src/main.jsx mounts <Analytics /> from @vercel/analytics
   on every route. This page said nothing about it, and /help once
   claimed "no third-party analytics trackers" while it ran. The
   sentence states what Vercel's own privacy page states
   (vercel.com/docs/analytics/privacy-policy, read 2026-09-08) and
   nothing more; tests/unit/analytics-environment.test.js holds it to
   the import in main.jsx in both directions. */
function VercelSection() {
  return (
    <p className="lgl-p">
      UIL4B also runs Vercel Web Analytics, which records each page view with the page URL, referrer, approximate location, device type, operating system and browser; it sets no cookies, ties nothing to your IP address, and tells visits apart by a hash of the request that Vercel discards after 24 hours.
    </p>
  )
}

/* Three of the eleven clauses have no translation key — they were written
   directly into the page — so they carry a literal `heading` and a `render`
   instead of a key. They stay in the document order they were in: between
   clause 3 (how we use your information) and clause 4 (storage and security),
   which is where the disclosure of what is stored belongs. */
const SECTIONS = [
  { id: 'privacy-s1', title: 'privacy.s1Title', text: 'privacy.s1Text' },
  { id: 'privacy-s2', title: 'privacy.s2Title', intro: 'privacy.s2Intro', items: 'privacy.s2Items' },
  { id: 'privacy-s3', title: 'privacy.s3Title', intro: 'privacy.s3Intro', items: 'privacy.s3Items' },
  { id: 'privacy-storage', heading: 'What we store on your device', render: StorageSection },
  { id: 'privacy-aggregate', heading: 'Aggregate usage counts', render: AggregateSection },
  { id: 'privacy-vercel', heading: 'Vercel Web Analytics', render: VercelSection },
  { id: 'privacy-s4', title: 'privacy.s4Title', intro: 'privacy.s4Text', items: 'privacy.s4Items' },
  { id: 'privacy-s5', title: 'privacy.s5Title', intro: 'privacy.s5Intro', items: 'privacy.s5Items' },
  { id: 'privacy-s6', title: 'privacy.s6Title', items: 'privacy.s6Items' },
  { id: 'privacy-s7', title: 'privacy.s7Title', contact: true },
]

export default function Privacy() {
  const { t } = useI18n()

  return (
    <div className="sec cpg lgl">
      <header className="lgl-head">
        {/* NO TAXONOMY EYEBROW. Founder, 2026-09-14: "remove this text its such a
            common AI trait, scan the whole site and remove alot of them where
            applied." This continues #382 and #386, where he marked this exact
            element "AI" and it was deleted from the Font Gallery, Font Pair,
            the Type Scale and the Tint tool. A 10px mono-caps label restating
            the page's own section, directly above an h1 that names the page,
            on a route the nav already has lit. Hierarchy is a control, not a
            label. */}
        <h1 className="cpg-h1">Privacy &amp; <em>data</em>.</h1>
        <p className="cpg-cap lgl-updated">{t('privacy.lastUpdated')}</p>
      </header>

      <div className="cpg-split">
        <div className="cpg-rail-col">
          <nav className="cpg-rail lgl-toc" aria-label="On this page">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a className="cpg-rail-row" href={`#${s.id}`}>
                    <span className="cpg-rail-label">{s.heading || t(s.title)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <div className="legal-card lgl-doc">
          {SECTIONS.map((s) => {
            const items = s.items ? t(s.items) : null
            const Body = s.render
            return (
              <section className="lgl-sec" id={s.id} key={s.id}>
                <h2 className="legal-h lgl-h">{s.heading || t(s.title)}</h2>
                {Body && <Body />}
                {s.text && <p className="lgl-p">{t(s.text)}</p>}
                {s.intro && <p className="lgl-p">{t(s.intro)}</p>}
                {items && (
                  <ul className="lgl-list">
                    {(Array.isArray(items) ? items : []).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
                {s.contact && (
                  <>
                    <p className="lgl-p">
                      {t('privacy.s7Text')}{' '}
                      <a className="lgl-a" href="mailto:privacy@uil4b.com">privacy@uil4b.com</a>
                    </p>
                    <p className="lgl-p">
                      {t('privacy.s7Complaint')}{' '}
                      <a className="lgl-a" href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
                    </p>
                  </>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

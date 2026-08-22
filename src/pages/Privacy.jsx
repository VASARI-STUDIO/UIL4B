import { useI18n } from '../contexts/I18nContext'
import { KEY_PURPOSES } from '../utils/dataExport'

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

export default function Privacy() {
  const { t } = useI18n()
  const s2Items = t('privacy.s2Items')
  const s3Items = t('privacy.s3Items')
  const s4Items = t('privacy.s4Items')
  const s5Items = t('privacy.s5Items')
  const s6Items = t('privacy.s6Items')

  const renderList = (items) => (
    <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20, lineHeight: 1.75 }}>
      {(Array.isArray(items) ? items : []).map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
    </ul>
  )

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">Legal</div>
        <h1>Privacy &amp; <em>data</em>.</h1>
        <p>{t('privacy.lastUpdated')}</p>
      </div>

      <div className="card" style={{ maxWidth: 820, lineHeight: 1.8 }}>
        <h2 className="legal-h">{t('privacy.s1Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24 }}>{t('privacy.s1Text')}</p>

        <h2 className="legal-h">{t('privacy.s2Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s2Intro')}</p>
        {renderList(s2Items)}

        <h2 className="legal-h">{t('privacy.s3Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s3Intro')}</p>
        {renderList(s3Items)}

        {/* Storage disclosure table — full transparency */}
        <h2 className="legal-h legal-h--tight">What we store on your device</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>
          UIL4B writes the following keys to your browser's localStorage. With one narrow exception described below, this data stays on your device. You can inspect, export, or clear all of this from <a href="/settings">Settings → Your data</a>.
        </p>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
          <table className="storage-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Purpose</th>
                <th>Personal data</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_DISCLOSURE.map(row => (
                <tr key={row.key}>
                  <td><span className="storage-key">{row.key}</span></td>
                  <td className="storage-purpose">{row.purpose}</td>
                  <td><span className={`storage-pii ${row.pii}`}>{row.pii === 'yes' ? 'Yes' : row.pii === 'local' ? 'Account-bound' : 'No'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24, fontStyle: 'italic' }}>
          <strong style={{ color: 'var(--t1)' }}>Note:</strong> "Account-bound" means the data is keyed to an account but never leaves your device. We keep no copy of it.
        </p>

        <h2 className="legal-h legal-h--tight">Aggregate usage counts</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>
          When you are <strong>signed in</strong>, UIL4B records anonymous, aggregate usage counts in our Firestore database (Sydney region) to understand which features are useful and where to invest. Specifically, we increment per-day tallies of which page paths are visited (for example <span className="storage-key">/create/color</span>) and how many times tools are used (for example a font copy or a colour pick). These are running totals shared across all users — they contain <strong>no message content, no prompt text, no colours or fonts you chose, and nothing that identifies you</strong>. We cannot tie a count back to an individual account. Signed-out visitors send nothing; their usage is tracked only in localStorage on their own device.
        </p>

        <h2 className="legal-h">{t('privacy.s4Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s4Text')}</p>
        {renderList(s4Items)}

        <h2 className="legal-h">{t('privacy.s5Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s5Intro')}</p>
        {renderList(s5Items)}

        <h2 className="legal-h">{t('privacy.s6Title')}</h2>
        {renderList(s6Items)}

        <h2 className="legal-h">{t('privacy.s7Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>
          {t('privacy.s7Text')}{' '}
          <a href="mailto:privacy@uil4b.com">privacy@uil4b.com</a>
        </p>
        <p style={{ fontSize: 14, color: 'var(--t1)' }}>
          {t('privacy.s7Complaint')}{' '}
          <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
        </p>
      </div>
    </div>
  )
}

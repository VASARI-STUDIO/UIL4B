import { useI18n } from '../contexts/I18nContext'

const STORAGE_DISCLOSURE = [
  { key: 'vs-lang', purpose: 'Selected interface language', pii: 'no' },
  { key: 'vs-t', purpose: 'Theme preference (light/dark)', pii: 'no' },
  { key: 'vs-t-v', purpose: 'Theme schema version', pii: 'no' },
  { key: 'vs-nav-open', purpose: 'Sidebar category expand/collapse state', pii: 'no' },
  { key: 'vs-pinned-tools', purpose: 'Tools you pinned for quick access', pii: 'no' },
  { key: 'vs-recent-tools', purpose: 'Recently used tools list', pii: 'no' },
  { key: 'vs-current-design', purpose: 'Active palette, fonts, type scale, gradient', pii: 'no' },
  { key: 'vs-projects', purpose: 'Saved design projects (per account)', pii: 'local' },
  { key: 'vs-prompts', purpose: 'Your AI prompt library', pii: 'local' },
  { key: 'vs-state-shades', purpose: 'Cached state colour shades', pii: 'no' },
  { key: 'vs-users', purpose: 'Account credentials (email + hashed password) for local accounts', pii: 'yes' },
  { key: 'vs-session', purpose: 'Active session info (no password)', pii: 'yes' },
  { key: 'vs-admin-unlocked', purpose: 'Admin panel unlock flag', pii: 'no' },
]

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
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s1Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 24 }}>{t('privacy.s1Text')}</p>

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s2Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s2Intro')}</p>
        {renderList(s2Items)}

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s3Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s3Intro')}</p>
        {renderList(s3Items)}

        {/* Storage disclosure table — full transparency */}
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 8 }}>What we store on your device</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 16 }}>
          UIL4B writes the following keys to your browser's localStorage. Nothing is sent to a server. You can inspect, export, or clear all of this from <a href="/#/settings">Settings → Your data</a>.
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
          <strong style={{ color: 'var(--t1)' }}>Note:</strong> "Account-bound" means the data is keyed to an account but never leaves your device. We have no servers and no copy of it.
        </p>

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s4Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s4Text')}</p>
        {renderList(s4Items)}

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s5Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s5Intro')}</p>
        {renderList(s5Items)}

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s6Title')}</h3>
        {renderList(s6Items)}

        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, letterSpacing: '-.015em', marginBottom: 12 }}>{t('privacy.s7Title')}</h3>
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

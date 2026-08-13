import { useI18n } from '../contexts/I18nContext'

export default function Terms() {
  const { t } = useI18n()
  const s5Items = t('terms.s5Items')

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('terms.title')}</h1>
        <p>{t('terms.lastUpdated')}</p>
      </div>

      <div className="card" style={{ maxWidth: 720, lineHeight: 1.8 }}>
        <h2 className="legal-h legal-h--sm">{t('terms.s1Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s1Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s2Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s2Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s3Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s3Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s4Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s4Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s5Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('terms.s5Intro')}</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          {(Array.isArray(s5Items) ? s5Items : []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 className="legal-h legal-h--sm">{t('terms.s6Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s6Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s7Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s7Text')}</p>

        <h2 className="legal-h legal-h--sm">{t('terms.s8Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)' }}>
          {t('terms.s8Text')}{' '}
          <a href="mailto:legal@uil4b.com">legal@uil4b.com</a>.
        </p>
      </div>
    </div>
  )
}

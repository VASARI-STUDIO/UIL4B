import { useI18n } from '../contexts/I18nContext'

export default function Privacy() {
  const { t } = useI18n()
  const s2Items = t('privacy.s2Items')
  const s3Items = t('privacy.s3Items')
  const s4Items = t('privacy.s4Items')
  const s5Items = t('privacy.s5Items')
  const s6Items = t('privacy.s6Items')

  const renderList = (items) => (
    <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
      {(Array.isArray(items) ? items : []).map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('privacy.title')}</h1>
        <p>{t('privacy.lastUpdated')}</p>
      </div>

      <div className="card" style={{ maxWidth: 720, lineHeight: 1.8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s1Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('privacy.s1Text')}</p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s2Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s2Intro')}</p>
        {renderList(s2Items)}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s3Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s3Intro')}</p>
        {renderList(s3Items)}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s4Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s4Text')}</p>
        {renderList(s4Items)}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s5Title')}</h3>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('privacy.s5Intro')}</p>
        {renderList(s5Items)}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s6Title')}</h3>
        {renderList(s6Items)}

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{t('privacy.s7Title')}</h3>
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

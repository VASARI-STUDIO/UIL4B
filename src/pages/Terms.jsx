// TYPOGRAPHY ONLY. NOT ONE WORD OF THE LEGAL TEXT IS TOUCHED HERE, and none
// should be.
// The eight section headings ran .legal-h--sm - 16px, body font, weight 700 -
// while /privacy's ran .legal-h at 22px display. Same content type, same
// component shape, same <h2> level, two different answers to how a section
// heading looks. The 2026-09-11 marketing pass measured it and deliberately
// left it, on the grounds that guessing wrong about a legal page's typography
// is worse than writing the inconsistency down.
//
// SOURCE FOR THE DECISION: the pipeline row quality-marketing-breakpoints-
// 2026-09-13, whose note opens "Founder decisions taken 2026-09-13 on the
// marketing, wayfinding and Discover-browse surfaces" and carries this as its
// item (3). That row is the backlog of record and ships in the same commit as
// this file. It is the lane's own minute of a conversation, not a PROPOSALS.md
// verdict - so if you need the stronger form, ask him to confirm it there.
// PROPOSALS.md is local-only since 2026-09-16 and is not in this repository
// (.gitignore carries why), which is one more reason to ask rather than assume.
// .legal-h--sm went with it: Terms was its only caller.
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

      <div className="card legal-card">
        <h2 className="legal-h">{t('terms.s1Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s1Text')}</p>

        <h2 className="legal-h">{t('terms.s2Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s2Text')}</p>

        <h2 className="legal-h">{t('terms.s3Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s3Text')}</p>

        <h2 className="legal-h">{t('terms.s4Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s4Text')}</p>

        <h2 className="legal-h">{t('terms.s5Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 8 }}>{t('terms.s5Intro')}</p>
        <ul style={{ fontSize: 14, color: 'var(--t1)', paddingLeft: 20, marginBottom: 20 }}>
          {(Array.isArray(s5Items) ? s5Items : []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <h2 className="legal-h">{t('terms.s6Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s6Text')}</p>

        <h2 className="legal-h">{t('terms.s7Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)', marginBottom: 20 }}>{t('terms.s7Text')}</p>

        <h2 className="legal-h">{t('terms.s8Title')}</h2>
        <p style={{ fontSize: 14, color: 'var(--t1)' }}>
          {t('terms.s8Text')}{' '}
          <a href="mailto:legal@uil4b.com">legal@uil4b.com</a>.
        </p>
      </div>
    </div>
  )
}

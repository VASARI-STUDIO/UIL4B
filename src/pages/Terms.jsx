// TYPOGRAPHY ONLY. NOT ONE WORD OF THE LEGAL TEXT IS TOUCHED HERE, and none
// should be.
// The eight section headings ran .legal-h--sm - 16px, body font, weight 700 -
// while /privacy's ran .legal-h at 22px display. Same content type, same
// component shape, same <h2> level, two different answers to how a section
// heading looks. The 2026-09-11 marketing pass measured it and deliberately
// left it, on the grounds that guessing wrong about a legal page's typography
// is worse than writing the inconsistency down.
//
// UNVERIFIED WHETHER THE FOUNDER RULED ON THIS. An earlier version of this
// comment said he had decided it on 2026-09-13; no PROPOSALS.md verdict,
// CHANGELOG founder-decision record, commit or PR says so, so the claim was
// removed rather than left to harden into a cited precedent. What stands on
// its own is the consistency argument above: two legal pages of the same
// shape should set a section heading the same way, and /privacy's is the one
// that matches the rest of the reading surfaces. .legal-h--sm went with it -
// Terms was its only caller. Reverse it freely if he wants the smaller mark.
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

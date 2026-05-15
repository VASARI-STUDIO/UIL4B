import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'

export default function Feedback({ toast }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { t } = useI18n()
  const { user } = useAuth()

  const submit = (e) => {
    e.preventDefault()
    if (!message.trim()) { toast(t('feedback.enterFeedback')); return }

    saveFeedback({
      type,
      subject: subject.trim() || `[${type}] Submission`,
      message: message.trim(),
      email: user?.email || '',
      source: 'feedback-form',
    })

    toast(t('feedback.thankYou'))
    setMessage('')
    setSubject('')
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('feedback.title')}</h1>
        <p>{t('feedback.subtitle')}</p>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        {submitted ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{t('feedback.thankYou')}</h3>
            <p style={{ fontSize: 13, color: 'var(--t2)' }}>Your submission has been received and will be reviewed.</p>
            <button className="btn btn-s" style={{ marginTop: 16 }} onClick={() => setSubmitted(false)}>Submit another</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div className="seg-label">{t('common.type')}</div>
              <div className="row" style={{ gap: 6 }}>
                {[['feature', t('feedback.featureRequest')], ['bug', t('feedback.bugReport')], ['general', t('feedback.general')], ['help', 'Help Request']].map(([key, label]) => (
                  <button key={key} type="button" className={`pt-t${type === key ? ' on' : ''}`} onClick={() => setType(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="seg-label">Subject</div>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary (optional)"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div className="seg-label">{t('common.message')}</div>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('feedback.messagePlaceholder')}
                style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
              />
            </div>
            <button className="btn btn-accent" type="submit">{t('common.submit')}</button>
          </form>
        )}
      </div>
    </div>
  )
}

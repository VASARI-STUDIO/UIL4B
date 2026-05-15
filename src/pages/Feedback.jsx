import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { saveFeedback } from '../utils/analytics'

export default function Feedback({ toast }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')
  const { t } = useI18n()
  const { user } = useAuth()

  const submit = (e) => {
    e.preventDefault()
    if (!message.trim()) { toast(t('feedback.enterFeedback')); return }

    saveFeedback({ type, message: message.trim(), email: user?.email || '' })

    const subject = encodeURIComponent(`[${type}] Feedback — UIl4b Design Toolkit`)
    const body = encodeURIComponent(`Type: ${type}\n\n${message}`)
    window.open(`mailto:hello@uil4b.com?subject=${subject}&body=${body}`, '_self')

    toast(t('feedback.thankYou'))
    setMessage('')
  }

  const openGitHubIssue = () => {
    window.open('https://github.com/VASARI-STUDIO/Web-Design-Toolkit/issues/new', '_blank')
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>{t('feedback.title')}</h1>
        <p>{t('feedback.subtitle')}</p>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="seg-label">{t('common.type')}</div>
            <div className="row" style={{ gap: 6 }}>
              {[['feature', t('feedback.featureRequest')], ['bug', t('feedback.bugReport')], ['general', t('feedback.general')]].map(([key, label]) => (
                <button key={key} type="button" className={`pt-t${type === key ? ' on' : ''}`} onClick={() => setType(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="seg-label">{t('common.message')}</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t('feedback.messagePlaceholder')} style={{ width: '100%', minHeight: 120, resize: 'vertical' }} />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-accent" type="submit">{t('feedback.sendViaEmail')}</button>
            <button className="btn" type="button" onClick={openGitHubIssue}>{t('feedback.openGitHubIssue')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

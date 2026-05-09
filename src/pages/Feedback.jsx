import { useState } from 'react'
import { useI18n } from '../contexts/I18nContext'

export default function Feedback({ toast }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')
  const { t } = useI18n()

  const submit = (e) => {
    e.preventDefault()
    if (!message.trim()) { toast(t('feedback.enterFeedback')); return }
    toast(t('feedback.thankYou'))
    setMessage('')
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
          <button className="btn btn-accent" type="submit">{t('feedback.submitFeedback')}</button>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'

export default function Feedback({ toast }) {
  const [type, setType] = useState('feature')
  const [message, setMessage] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!message.trim()) { toast('Please enter your feedback'); return }
    // Future: send to backend/Firestore
    toast('Thank you for your feedback!')
    setMessage('')
  }

  return (
    <div className="sec">
      <div className="sec-h">
        <h1>Feedback</h1>
        <p>Help us improve Visari Studio. Share bugs, feature requests, or general feedback.</p>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="seg-label">Type</div>
            <div className="row" style={{ gap: 6 }}>
              {['feature', 'bug', 'general'].map(t => (
                <button key={t} type="button" className={`pt-t${type === t ? ' on' : ''}`} onClick={() => setType(t)}>
                  {t === 'feature' ? 'Feature Request' : t === 'bug' ? 'Bug Report' : 'General'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="seg-label">Message</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what you think..." style={{ width: '100%', minHeight: 120, resize: 'vertical' }} />
          </div>
          <button className="btn btn-accent" type="submit">Submit Feedback</button>
        </form>
      </div>
    </div>
  )
}

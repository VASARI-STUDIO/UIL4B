import { useCallback, useEffect, useState } from 'react'

// The administrator's setting for "email me about new community submissions".
// The values live in a server-only document and are read and written through
// /api/support (type 'admin-settings'), which accepts only the admin allowlist;
// this component only decides what to render.

const EVERY_N_MIN = 1
const EVERY_N_MAX = 100

async function callSettings(body) {
  const { auth } = await import('../../utils/firebase')
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in again to change this setting.')
  const res = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type: 'admin-settings', ...body }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok !== true) {
    throw new Error(data?.error || 'The setting could not be reached. Try again shortly.')
  }
  return data
}

export default function CommunityNotifySettings() {
  const [state, setState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [everyN, setEveryN] = useState('1')
  const [sinceLast, setSinceLast] = useState(0)
  const [emailConfigured, setEmailConfigured] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const apply = (data) => {
    setEnabled(data.enabled)
    setEveryN(String(data.everyN))
    setSinceLast(data.sinceLast)
    setEmailConfigured(data.emailConfigured !== false)
  }

  const load = useCallback(async () => {
    setState('loading')
    setLoadError('')
    try {
      apply(await callSettings({ action: 'get' }))
      setState('ready')
    } catch (err) {
      setLoadError(err?.message || 'The setting could not be read.')
      setState('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const parsed = Number(everyN)
  const valid = everyN.trim() !== '' && Number.isInteger(parsed) && parsed >= EVERY_N_MIN && parsed <= EVERY_N_MAX

  const save = async (e) => {
    e.preventDefault()
    if (!valid) {
      setResult({ ok: false, text: `Enter a whole number from ${EVERY_N_MIN} to ${EVERY_N_MAX}.` })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      apply(await callSettings({ action: 'set', enabled, everyN: parsed }))
      setResult({ ok: true, text: 'Saved.' })
    } catch (err) {
      setResult({ ok: false, text: err?.message || 'That did not save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-card cns">
      <div className="adm-card-header">
        <div className="adm-card-title">Community emails</div>
      </div>
      <div className="adm-card-body">
        {state === 'loading' && <div className="cq-msg">Reading the settings…</div>}

        {state === 'error' && (
          <div className="cq-msg cq-msg--error" role="alert">
            <strong>The settings could not be read.</strong>
            <span>{loadError}</span>
            <button type="button" className="btn btn-s" onClick={load}>Try again</button>
          </div>
        )}

        {state === 'ready' && (
          <form className="cns-form" onSubmit={save}>
            {!emailConfigured && (
              <p className="cns-warn" role="note">
                Email is not set up on the server yet, so nothing will be sent until it is.
              </p>
            )}

            <label className="cns-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => { setEnabled(e.target.checked); setResult(null) }}
              />
              <span>Email me about new community submissions</span>
            </label>

            <div className="cns-field">
              <label htmlFor="cns-every">Email me every</label>
              <div className="cns-row">
                <input
                  id="cns-every"
                  className="cns-num mono"
                  type="number"
                  inputMode="numeric"
                  min={EVERY_N_MIN}
                  max={EVERY_N_MAX}
                  step="1"
                  value={everyN}
                  disabled={!enabled}
                  aria-describedby="cns-every-hint"
                  aria-invalid={!valid}
                  onChange={(e) => { setEveryN(e.target.value); setResult(null) }}
                />
                <span>submissions</span>
              </div>
              <p id="cns-every-hint" className="cns-hint">1 = every submission. You can pick up to {EVERY_N_MAX}.</p>
            </div>

            <p className="cns-count">
              Waiting since the last email: <span className="mono">{sinceLast}</span>
            </p>

            <div className="cns-actions">
              <button type="submit" className="btn btn-s" disabled={saving || !valid}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {result && (
                <span
                  className={`cns-result${result.ok ? ' is-ok' : ' is-err'}`}
                  role={result.ok ? 'status' : 'alert'}
                >
                  {result.text}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

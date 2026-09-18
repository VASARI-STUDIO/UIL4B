import { useCallback, useEffect, useState } from 'react'
import { listQueue, decideSubmission, deleteSubmission } from '../../utils/communityQueueApi'
import { gradientCss } from '../../data/gradientGallery'

// The community review queue — the thing that did not exist.
//
// Gradient and design submissions were written to localStorage and nowhere
// else, so there was no queue for anyone to review. Every submission sat
// "pending" forever by construction. This is the reviewer's side of
// utils/communityQueue.js.
//
// Kept as its own component rather than a tenth block inside Admin.jsx, which
// is already 2,200 lines — a moderation surface that needs its own loading,
// empty, error and busy states does not belong inlined in a file that big.

const FILTERS = [
  { id: 'pending', label: 'Awaiting review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function Preview({ item }) {
  const p = item.payload || {}
  if (item.kind === 'gradient' && Array.isArray(p.stops) && p.stops.length >= 2) {
    // Rendered with the same gradientCss the library uses, so a reviewer sees
    // exactly what would be published rather than an approximation.
    return (
      <span
        className="cq-preview cq-preview--gradient"
        ref={(el) => el && el.style.setProperty('--cq-grad', gradientCss(p.type || 'Linear', p.angle ?? 90, p.stops))}
        aria-label={`${p.type || 'Linear'} gradient, ${p.stops.length} stops`}
      />
    )
  }
  if (Array.isArray(p.colors) && p.colors.length) {
    return (
      <span className="cq-preview cq-preview--palette" aria-label={`${p.colors.length} colours`}>
        {p.colors.slice(0, 6).map((c, i) => (
          <i key={i} ref={(el) => el && el.style.setProperty('--cq-sw', c)} />
        ))}
      </span>
    )
  }
  return <span className="cq-preview cq-preview--none" aria-hidden="true" />
}

export default function CommunityQueue({ toast }) {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async (which) => {
    setState('loading')
    setError('')
    try {
      setItems(await listQueue(which))
      setState('ready')
    } catch (err) {
      // A failed read must not render as "no submissions" — an empty queue and
      // a broken queue look identical otherwise, and the second one is the
      // reason someone's work goes unreviewed.
      setState('error')
      setError(err?.message || 'Could not read the review queue.')
    }
  }, [])

  useEffect(() => { load(status) }, [load, status])

  const decide = async (item, next) => {
    setBusyId(item.id)
    try {
      await decideSubmission(item.id, next, null)
      setItems(list => list.filter(i => i.id !== item.id))
      toast?.(next === 'approved' ? 'Approved' : 'Rejected')
    } catch (err) {
      // The most likely cause is the `admin` custom claim missing from this
      // session's token — it is granted by /api/verify-admin, and a token
      // minted before that does not carry it. Saying so beats "permission
      // denied", which sends you to the rules file instead of to a refresh.
      toast?.(/permission|insufficient/i.test(err?.message || '')
        ? 'Firestore refused that. Reload the dashboard to pick up admin permissions, then retry.'
        : (err?.message || 'That did not save.'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (item) => {
    setBusyId(item.id)
    try {
      await deleteSubmission(item.id)
      setItems(list => list.filter(i => i.id !== item.id))
      toast?.('Deleted')
    } catch (err) {
      toast?.(err?.message || 'Could not delete that.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="cq">
      <div className="cq-head">
        <div className="cq-filters" role="tablist" aria-label="Submission status">
          {FILTERS.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={status === f.id}
              id={`cq-filter-${f.id}`}
              aria-controls="cq-panel"
              className={`cq-filter${status === f.id ? ' is-on' : ''}`}
              onClick={() => setStatus(f.id)}
            >
              {f.label}
              {status === f.id && state === 'ready' && <span className="cq-filter-count">{items.length}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-s" onClick={() => load(status)} disabled={state === 'loading'}>
          {state === 'loading' ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* THE ROLE WAS LYING. These filters carried role="tab" with no tabpanel
          and no aria-controls anywhere in the file, so a screen reader was told
          "tab, selected" and given nothing to move into — the same defect the
          2026-09-18 review found on the Admin tablist, and this was its second
          instance.

          They ARE tabs rather than toggles: choosing one replaces everything
          below it, which is a panel swap, not a filter applied in place. So the
          role stays and the missing half is supplied. One panel, because only
          the selected status is ever fetched and rendered; its accessible name
          follows the selection. */}
      <div
        id="cq-panel"
        role="tabpanel"
        aria-labelledby={`cq-filter-${status}`}
        tabIndex={-1}
      >

      {state === 'loading' && <div className="cq-msg">Reading the queue…</div>}

      {state === 'error' && (
        <div className="cq-msg cq-msg--error" role="alert">
          <strong>The queue could not be read.</strong>
          <span>{error}</span>
          <button className="btn btn-s" onClick={() => load(status)}>Try again</button>
        </div>
      )}

      {state === 'ready' && items.length === 0 && (
        <div className="cq-msg">
          {status === 'pending'
            ? 'Nothing waiting for review.'
            : `No ${status} submissions.`}
        </div>
      )}

      {state === 'ready' && items.length > 0 && (
        <ul className="cq-list">
          {items.map(item => (
            <li key={item.id} className="cq-item">
              <Preview item={item} />
              <div className="cq-item-body">
                <p className="cq-item-name">{item.name}</p>
                <p className="cq-item-meta">
                  <span className="cq-kind">{item.kind}</span>
                  {item.authorName || 'Unknown'}
                  {/* The date is a value, so it carries the dashboard's mono
                      treatment like every other figure on the surface. */}
                  {item.createdAt && <> · <span className="mono">{new Date(item.createdAt).toLocaleDateString()}</span></>}
                </p>
              </div>
              <div className="cq-item-actions">
                {status === 'pending' ? (
                  <>
                    <button className="btn btn-s cq-approve" disabled={busyId === item.id} onClick={() => decide(item, 'approved')}>
                      {busyId === item.id ? '…' : 'Approve'}
                    </button>
                    <button className="btn btn-s" disabled={busyId === item.id} onClick={() => decide(item, 'rejected')}>
                      Reject
                    </button>
                  </>
                ) : (
                  <button className="btn btn-s cq-delete" disabled={busyId === item.id} onClick={() => remove(item)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      </div>
    </div>
  )
}

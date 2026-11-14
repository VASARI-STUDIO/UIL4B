import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useCommunityHub from '../components/community/useCommunityHub'
import ShareDialogs from '../components/community/ShareDialogs'
import IconSubmissionPreview from '../components/discover/IconSubmissionPreview'
import { PieceGrid } from '../components/community/pieceUi'
import { usePageTitle, usePieceActions, useTileMenu } from '../components/community/pieceActions'
import { MakerMark } from './CommunityPiece'
import { isInspiration, makerByHandle, piecesBy } from '../data/communityShowcase'
import '../styles/pages/community.css'

const HEX = /^#[0-9a-fA-F]{6}$/
const TABS = [{ id: 'made', label: 'Made' }, { id: 'inspiration', label: 'Inspiration' }]
const KIND_WORD = { icon: 'Icon', design: 'Design', image: 'Image' }

const dateOf = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const BackLink = () => (
  <Link to="/community" className="cm-back">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
    Community
  </Link>
)

function Tabs({ value, onChange, counts }) {
  const refs = useRef({})
  const onKey = (e) => {
    const i = TABS.findIndex((t) => t.id === value)
    const next = e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length] : e.key === 'ArrowLeft' ? TABS[(i + TABS.length - 1) % TABS.length] : null
    if (!next) return
    e.preventDefault()
    onChange(next.id)
    refs.current[next.id]?.focus()
  }
  return (
    <div className="cm-tabs" role="tablist" aria-label="Profile sections" onKeyDown={onKey}>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          id={`cm-tab-${t.id}`}
          aria-selected={t.id === value}
          aria-controls="cm-tabpanel"
          tabIndex={t.id === value ? 0 : -1}
          ref={(el) => { refs.current[t.id] = el }}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {counts && <span className="cm-tab-n">{counts[t.id]}</span>}
        </button>
      ))}
    </div>
  )
}

function Thumb({ row }) {
  if (row.kind === 'icon') {
    return <span className="cm-thumb"><IconSubmissionPreview svg={row.svg} name={row.name} size={28} /></span>
  }
  if (row.kind === 'design') {
    const a = HEX.test(row.c1) ? row.c1 : '#1A1A1A'
    const b = HEX.test(row.c2) ? row.c2 : '#E6E4DE'
    return <span className="cm-thumb cm-thumb-strip" aria-hidden="true"><i style={{ background: a }} /><i style={{ background: b }} /></span>
  }
  return (
    <span className="cm-thumb" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
    </span>
  )
}

function Submissions({ hub }) {
  const headRef = useRef(null)
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#your-submissions') headRef.current?.focus()
  }, [hash])
  const { rows } = hub
  return (
    <section className="cm-subs" id="your-submissions" aria-labelledby="cm-subs-h">
      <h2 className="cm-h2" id="cm-subs-h" tabIndex={-1} ref={headRef}>Your submissions</h2>
      {rows.length === 0 ? (
        <div className="cm-empty cm-empty-left">
          <h3 className="cm-empty-h">Nothing shared yet</h3>
          <p className="cm-empty-t">Share a project from your dashboard, or upload an image that shaped your work.</p>
          <div className="cm-row">
            <button type="button" className="cm-btn cm-btn-ink" onClick={() => hub.ask('pick')}>Share your work</button>
            <button type="button" className="cm-btn cm-btn-tonal" onClick={() => hub.ask('upload')}>Upload inspiration</button>
          </div>
        </div>
      ) : (
        <ul className="cm-sub-list">
          {rows.map((row) => {
            const status = hub.statusOf(row)
            const busy = hub.busyIds.has(row.id)
            const retryable = row.kind !== 'image' && row.synced === false && !busy
            return (
              <li key={row.id} className="cm-sub">
                <Thumb row={row} />
                <div className="cm-sub-text">
                  <p className="cm-sub-name">{row.name}</p>
                  <p className="cm-sub-meta">{[KIND_WORD[row.kind], dateOf(row.createdAt)].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="cm-sub-status" data-status={status}>{status}</span>
                <div className="cm-sub-actions">
                  {retryable && <button type="button" className="cm-btn cm-btn-text" onClick={() => hub.retry(row)}>Retry</button>}
                  <button type="button" className="cm-btn cm-btn-text" disabled={busy} onClick={() => hub.withdraw(row)}>Withdraw</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="cm-note-line">Submissions are saved to your account and queued for review, so they follow you across devices.</p>
    </section>
  )
}

function NotFound() {
  usePageTitle('UI L4B | Profile not found')
  return (
    <div className="cm-page">
      <BackLink />
      <div className="cm-empty cm-empty-page">
        <h1 className="cm-empty-h">We couldn’t find that profile</h1>
        <p className="cm-empty-t">Public profiles aren’t open yet. You can see the sample makers, and your own profile when you’re signed in.</p>
        <Link to="/community" className="cm-btn cm-btn-tonal">Browse the showcase</Link>
      </div>
    </div>
  )
}

export default function CommunityProfile({ toast }) {
  const { handle = '' } = useParams()
  const hub = useCommunityHub(toast)
  const { profileName } = useAuth()
  const maker = makerByHandle(handle)
  const own = !maker && !!hub.uid && handle === hub.ownHandle
  if (hub.authLoading && !maker) return <div className="cm-page" aria-busy="true" />
  if (!maker && !own) return <NotFound />
  const person = maker || { handle, name: profileName || `@${handle}`, line: '', mark: 'var(--v3-ink)', on: 'var(--v3-on-ink)' }
  return <Profile key={handle} hub={hub} person={person} own={own} toast={toast} />
}

function Profile({ hub, person, own, toast }) {
  const actions = usePieceActions(toast)
  const tileMenu = useTileMenu(actions)
  const [tab, setTab] = useState('made')
  usePageTitle(`${person.name} | UI L4B`)
  const all = own ? [] : piecesBy(person.handle)
  const shown = all.filter((p) => (tab === 'inspiration') === isInspiration(p))
  const counts = { made: all.filter((p) => !isInspiration(p)).length, inspiration: all.filter(isInspiration).length }
  const n = hub.rows.length

  return (
    <div className="cm-page cm-profile">
      <BackLink />
      <header className="cm-p-head">
        <MakerMark maker={person} size={72} />
        <div className="cm-p-copy">
          <h1 className="cm-h1 cm-p-h1">{person.name}</h1>
          {person.line && <p className="cm-lead">{person.line}</p>}
          <p className="cm-sample-line">{own ? `@${person.handle} · ${n} ${n === 1 ? 'submission' : 'submissions'}` : 'Sample brand'}</p>
        </div>
        {own && <Link to="/settings" className="cm-btn cm-btn-tonal cm-p-edit">Edit profile</Link>}
      </header>

      <Tabs value={tab} onChange={setTab} counts={own ? null : counts} />
      <div role="tabpanel" id="cm-tabpanel" aria-labelledby={`cm-tab-${tab}`} className="cm-tabpanel">
        {shown.length > 0 ? (
          <div className="cm-swap" key={tab}>
            <PieceGrid pieces={shown} actions={actions} tileMenu={tileMenu} showMaker={false} label={tab === 'made' ? 'Made' : 'Inspiration'} />
          </div>
        ) : (
          <div className="cm-empty cm-empty-left">
            <h2 className="cm-empty-h">{tab === 'made' ? 'Nothing made here yet' : 'No inspiration here yet'}</h2>
            <p className="cm-empty-t">{own ? 'What you have shared is listed under Your submissions below.' : 'This sample brand has nothing in this section.'}</p>
          </div>
        )}
      </div>
      {tileMenu.menu}

      {own && <Submissions hub={hub} />}
      <ShareDialogs hub={hub} />
    </div>
  )
}

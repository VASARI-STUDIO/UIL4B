import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { STAGE_STEPS, STAGE_WORD, formatShipped, voteWord } from '../../utils/roadmapItems'

// The roadmap vote list, shared by the /tools foot (compact) and /roadmap (full).
// `votes` is the useToolVotes() controller; `items` are its rows. Styles: spectrum-tools.css, .vl / .vr.

const Icon = ({ children, sw = 1.75 }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const ArrowUp = () => <Icon><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></Icon>
const Check = () => <Icon sw={2}><path d="m3 8.5 3.2 3L13 4.5" /></Icon>
const Out = () => <Icon><path d="M5 11 11 5M6 5h5v5" /></Icon>

export const IdeaLine = () => (
  <p className="vl-more">
    <span className="sent">Want a tool that isn&rsquo;t listed?</span>{' '}
    <span className="sent">Tell us on the <Link to="/feedback">feedback form</Link>.</span>
  </p>
)

function Name({ t, level }) {
  const H = level
  if (t.stage === 'workshop') return <H className="vr-name">{t.label}</H>
  const cut = t.label.lastIndexOf(' ') + 1
  return (
    <H className="vr-name">
      <Link to={t.route}>{t.label.slice(0, cut)}<span className="nw">{t.label.slice(cut)}<Out /></span></Link>
    </H>
  )
}

// One live region per row, always in the page and empty until there is something to
// say: a region inserted with its text already in it is often not announced.
function Status({ t, votes }) {
  const s = t.status
  const again = <button type="button" onClick={() => votes.retryRow(t.id)}>Try again</button>
  let body = null
  let err = false
  switch (s?.kind) {
    case undefined: break
    case 'saved': body = 'Your vote is in. Press Voted to take it back.'; break
    case 'undone': body = 'Vote taken back.'; break
    case 'already': body = <>You&rsquo;d already voted for {t.label}.</>; break
    case 'offline': err = true; body = <>You&rsquo;re offline, so your vote didn&rsquo;t save. {again}</>; break
    case 'closed': body = <>Voting on {t.label} has closed because it&rsquo;s now live. <Link to={t.route}>Open {t.label}</Link></>; break
    default: err = true; body = <>{s.retry === 'takeback' ? 'We couldn’t take your vote back.' : 'Your vote didn’t save.'} {again}</>
  }
  return <p className={err ? 'vr-status is-err' : 'vr-status'} role="status">{body}</p>
}

// The load-error line. The region is always mounted, and once a load has failed it
// stays mounted through "Try again" (the button stays too, aria-disabled, so focus
// keeps its place), so nothing jumps and a screen reader hears the change.
function LoadLine({ votes }) {
  const loading = votes.phase === 'loading'
  let body = null
  if (votes.loadFailed) {
    body = loading
      ? <>Loading the counts&hellip; <button type="button" aria-disabled="true">Try again</button></>
      : <>The vote counts didn&rsquo;t <span className="nw">load. <button type="button" onClick={votes.retryLoad}>Try again</button></span></>
  }
  return <p className={votes.phase === 'error' ? 'vl-more vl-load is-err' : 'vl-more vl-load'} role="status">{body}</p>
}

function Count({ t, votes }) {
  if (t.count === null && votes.phase === 'loading') {
    return <div className="count" aria-hidden="true"><span className="sk" /><small>votes</small></div>
  }
  if (t.count === null) {
    return <div className="count dash"><b><span aria-hidden="true">&ndash;</span><span className="sr-only">Count unavailable</span></b><small>votes</small></div>
  }
  return (
    <div className="count" id={`c-${t.id}`}>
      <b key={t.count} className={t.bump ? 'is-bump' : undefined}>{t.count.toLocaleString('en-AU')}</b>
      <small>{voteWord(t.count)}</small>
    </div>
  )
}

function VoteButton({ t, votes }) {
  const on = t.voted === true
  const unavailable = !votes.authKnown || (votes.signedIn && (votes.phase !== 'ready' || !votes.votesKnown))
  return (
    <button
      type="button"
      className="vote"
      data-voted={on}
      aria-disabled={unavailable || undefined}
      aria-busy={t.busy || undefined}
      aria-describedby={t.count === null ? undefined : `c-${t.id}`}
      onClick={() => votes.press(t.id)}
    >
      {on ? <Check /> : <ArrowUp />}
      {on ? 'Voted' : 'Vote'}
      <span className="sr-only"> for {t.label}</span>
    </button>
  )
}

function Row({ t, votes, compact, shipped }) {
  const word = shipped && t.shipped ? `Live since ${formatShipped(t.shipped)}` : STAGE_WORD[t.stage]
  const steps = shipped ? 3 : STAGE_STEPS[t.stage]
  return (
    <li className="vr" id={`vote-${t.id}`}>
      <div className="vr-text">
        <Name t={t} level={compact ? 'h4' : 'h3'} />
        {!compact && t.description && <p className="vr-desc">{t.description}</p>}
        {!shipped && <Status t={t} votes={votes} />}
      </div>
      <div className="stage">
        <div className="track" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} className={n <= steps ? 'on' : undefined} />)}</div>
        <span>{word}</span>
      </div>
      <div className="votes">
        <Count t={t} votes={votes} />
        {shipped ? <span className="vote-slot" aria-hidden="true" /> : <VoteButton t={t} votes={votes} />}
      </div>
    </li>
  )
}

/**
 * @param {object} props
 * @param {object[]} props.items rows from useToolVotes()
 * @param {boolean} [props.compact] /tools foot: name only
 * @param {object} props.votes the useToolVotes() controller
 * @param {boolean} [props.shipped] the frozen Shipped list: no buttons, no foot lines
 * @param {string} [props.label] accessible name of the list
 */
export default function VoteList({ items, compact = false, votes, shipped = false, label }) {
  const deepLinked = useRef(false)
  useEffect(() => {
    if (shipped || deepLinked.current || votes.phase !== 'ready') return
    const hit = /^#vote-([a-z0-9-]+)$/.exec(window.location.hash)
    const row = hit ? document.getElementById(`vote-${hit[1]}`) : null
    deepLinked.current = true
    if (!row) return
    row.scrollIntoView({ block: 'center' })
    row.querySelector('.vote')?.focus({ preventScroll: true })
  }, [shipped, votes.phase])

  if (shipped) {
    return <ol className="vl" aria-label={label}>{items.map((t) => <Row key={t.id} t={t} votes={votes} compact={compact} shipped />)}</ol>
  }
  if (!items.length) {
    return (
      <>
        {compact && <p className="vl-more lead">Everything we started is live, so there&rsquo;s nothing to vote on right now.</p>}
        <IdeaLine />
      </>
    )
  }
  return (
    <>
      <ol className="vl" aria-label={label}>{items.map((t) => <Row key={t.id} t={t} votes={votes} compact={compact} />)}</ol>
      <LoadLine votes={votes} />
      {items.every((t) => t.stage === 'beta') && <p className="vl-more">Nothing else is in the workshop right now.</p>}
      {votes.authKnown && !votes.signedIn && (
        <p className="vl-more">Voting needs a free account, so each person counts <span className="nw">once. <button type="button" onClick={votes.signIn}>Sign in</button></span></p>
      )}
      <IdeaLine />
    </>
  )
}

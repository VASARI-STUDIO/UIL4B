import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Menu from '../components/menu/Menu'
import { menuOpenKey } from '../components/menu/menuModel'
import useMediaQuery from '../hooks/useMediaQuery'
import useCommunityHub from '../components/community/useCommunityHub'
import ShareDialogs from '../components/community/ShareDialogs'
import { PieceGrid, SampleLine } from '../components/community/pieceUi'
import { usePieceActions, useTileMenu } from '../components/community/pieceActions'
import { SHOWCASE_PIECES, SHOWCASE_TOPICS, pieceHaystack } from '../data/communityShowcase'
import '../styles/pages/community.css'

const KINDS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'kits', label: 'Kits', test: (p) => p.kind === 'UI kit' },
  { id: 'exports', label: 'Exports', test: (p) => p.kind === 'Brand guide' || p.kind === 'Palette' },
  { id: 'icons', label: 'Icons', test: (p) => p.kind === 'Icon' },
  { id: 'inspiration', label: 'Inspiration', test: (p) => p.kind === 'Photo' },
]
const SORTS = [{ id: 'newest', label: 'Newest' }, { id: 'saved', label: 'Saved' }]
const PHONE = '(max-width: 767px)'

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
)

/** A select that opens the shared menu (a popover on desktop, a sheet on a phone). */
function Picker({ label, valueLabel, groups }) {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState(null)
  const [how, setHow] = useState({ keyboard: false, at: 'first' })
  const items = groups.flatMap((g, i) => [
    ...(i > 0 ? ['sep'] : []),
    ...(g.title ? [{ type: 'section', label: g.title }] : []),
    ...g.options.map((o) => ({
      id: `${g.id}-${o.id}`, label: o.label, role: 'menuitemradio', checked: o.id === g.value, onSelect: () => g.onChange(o.id),
    })),
  ])
  return (
    <>
      <button
        type="button"
        ref={setTrigger}
        className="cm-select"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { setHow({ keyboard: e.detail === 0, at: 'first' }); setOpen((v) => !v) }}
        onKeyDown={(e) => {
          const at = menuOpenKey(e)
          if (!at) return
          e.preventDefault()
          setHow({ keyboard: true, at })
          setOpen(true)
        }}
      >
        <span>{label}: {valueLabel}</span>
        <Chevron />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchor={trigger} label={label} items={items} viaKeyboard={how.keyboard} startAt={how.at} className="cm-menu" />
    </>
  )
}

/** A radiogroup shown as joined buttons. */
function Segmented({ label, options, value, onChange }) {
  return (
    <div className="cm-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.id} data-on={o.id === value}>
          <input type="radio" name={`cm-seg-${label}`} checked={o.id === value} onChange={() => onChange(o.id)} />
          {o.label}
        </label>
      ))}
    </div>
  )
}

const unit = (n) => `${n} ${n === 1 ? 'piece' : 'pieces'}`

export default function Community({ toast }) {
  const hub = useCommunityHub(toast)
  const actions = usePieceActions(toast)
  const tileMenu = useTileMenu(actions)
  const phone = useMediaQuery(PHONE)
  const [typed, setTyped] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [topic, setTopic] = useState('All')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(typed.trim().toLowerCase()), 150)
    return () => window.clearTimeout(id)
  }, [typed])

  const shown = useMemo(() => {
    const kindTest = KINDS.find((k) => k.id === kind).test
    return SHOWCASE_PIECES.filter((p) => kindTest(p)
      && (topic === 'All' || p.topic === topic)
      && (!query || pieceHaystack(p).includes(query))
      && (sort !== 'saved' || actions.saves.has(p.id)))
  }, [kind, topic, query, sort, actions.saves])

  const waiting = hub.rows.filter((r) => r.kind !== 'image' && hub.statusOf(r) === 'Pending review').length
  const clear = () => { setTyped(''); setQuery('') }
  const reset = () => { clear(); setKind('all'); setTopic('All'); setSort('newest') }
  const busy = hub.authLoading

  const share = (
    <button type="button" className="cm-btn cm-btn-ink" onClick={() => hub.ask('pick')} disabled={busy} aria-busy={busy || undefined}>Share your work</button>
  )

  const kindGroup = { id: 'kind', title: phone ? 'Kind' : null, value: kind, onChange: setKind, options: KINDS }
  const topicGroup = { id: 'topic', title: 'Topic', value: topic, onChange: setTopic, options: [{ id: 'All', label: 'All' }, ...SHOWCASE_TOPICS.map((t) => ({ id: t, label: t }))] }
  const sortGroup = { id: 'sort', value: sort, onChange: setSort, options: SORTS }

  let empty = null
  if (shown.length === 0) {
    if (sort === 'saved' && !query && kind === 'all' && topic === 'All') {
      empty = (
        <>
          <p className="cm-empty-t">No saved designs yet. Tap the heart on any design to save it here.</p>
          <button type="button" className="cm-btn cm-btn-tonal" onClick={() => setSort('newest')}>Browse all pieces</button>
        </>
      )
    } else if (query) {
      empty = (
        <>
          <h2 className="cm-empty-h">{`Nothing matches “${typed.trim()}”`}</h2>
          <p className="cm-empty-t">Try a brand name, a kind such as kit, or a topic.</p>
          <button type="button" className="cm-btn cm-btn-tonal" onClick={clear}>Clear search</button>
        </>
      )
    } else {
      empty = (
        <>
          <h2 className="cm-empty-h">Nothing here yet</h2>
          <p className="cm-empty-t">No pieces match these filters. Show everything, or share something of your own.</p>
          <div className="cm-row">
            <button type="button" className="cm-btn cm-btn-tonal" onClick={reset}>Show everything</button>
            {share}
          </div>
        </>
      )
    }
  }

  return (
    <div className="cm-page">
      <header className="cm-head">
        <div className="cm-head-copy">
          <h1 className="cm-h1">Community Hub</h1>
          <p className="cm-lead">Brand kits, exports and inspiration made with UIL4B.</p>
          <SampleLine />
        </div>
        <div className="cm-head-actions">
          {share}
          <button type="button" className="cm-btn cm-btn-line" onClick={() => hub.ask('upload')} disabled={busy} aria-busy={busy || undefined}>
            {phone && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>}
            Upload inspiration
          </button>
        </div>
      </header>

      <div className="cm-toolbar" role="search">
        <div className="cm-search">
          <label className="cm-sr" htmlFor="cm-q">Search the showcase</label>
          <svg className="cm-search-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            id="cm-q"
            type="search"
            className="cm-input"
            value={typed}
            placeholder="Brand, kind or topic"
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && typed) { e.preventDefault(); clear() } }}
          />
        </div>
        {!phone && <p className="cm-count" aria-live="polite">{unit(shown.length)}</p>}
        {phone ? (
          <div className="cm-selects">
            <Picker label="Kind" valueLabel={KINDS.find((k) => k.id === kind).label} groups={[kindGroup, topicGroup]} />
            <Picker label="Sort" valueLabel={SORTS.find((s) => s.id === sort).label} groups={[sortGroup]} />
          </div>
        ) : (
          <>
            <Segmented label="Kind" options={KINDS} value={kind} onChange={setKind} />
            <Picker label="Topic" valueLabel={topic} groups={[{ ...topicGroup, title: null }]} />
          </>
        )}
        {phone && <p className="cm-count" aria-live="polite">{unit(shown.length)}</p>}
        {!phone && <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} />}
      </div>

      {waiting > 0 && (
        <p className="cm-waiting">
          {`You have ${unit(waiting)} waiting for review. `}
          <Link to={`/u/${hub.ownHandle}#your-submissions`}>See your profile</Link>
        </p>
      )}

      {empty ? (
        <div className="cm-empty">{empty}</div>
      ) : (
        <section className="cm-swap" key={`${kind}|${topic}|${query}|${sort}`} aria-labelledby="cm-pieces-h">
          <h2 id="cm-pieces-h" className="sr-only">Pieces</h2>
          <PieceGrid pieces={shown} actions={actions} tileMenu={tileMenu} label="Showcase pieces" />
        </section>
      )}
      {tileMenu.menu}

      <section className="cm-close" aria-label="Share your work">
        <p>Made something with UIL4B?</p>
        <button type="button" className="cm-btn cm-btn-tonal" onClick={() => hub.ask('pick')} disabled={busy}>Share your work</button>
      </section>

      <ShareDialogs hub={hub} />
    </div>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { reportUpgradeGate } from '../../contexts/ProModalContext'
import { LIBRARY_RULES } from '../../utils/libraryRules'
import { galleryLimit } from '../../utils/lockedPreview'
import { hasPromptPreview, promptPosterSrc } from '../../data/promptPreviewAssets'
import { buildOverview, countLine } from './promptGallery'
import PromptCard from './PromptCard'
import PromptLockedCard, { LockMark } from './PromptLockedCard'

// The gallery's default view: one section per category, each with its heading,
// "N prompts · M open to you" and "View more", then a closing section that says
// what this viewer's access covers.
//
// What this component does not decide: who may open what. The page hands in
//   rows       the whole library, canonical order (open rows and locked stubs)
//   openRows   the rows this viewer may open (splitLockedLibrary's `open`)
//   tier       'anonymous' | 'free' | 'pro' (galleryTier)
// and every number below is computed from those. Which prompts a section
// shows, and in what order, is promptGallery.buildOverview. A locked prompt
// is drawn only by PromptLockedCard / the cover tile, from its id and tags.
//
// Hooks for the page:
//   #pl-shelf-<slug> .pl-viewmore   a section's View more buttons. Two per
//       section (top right, and full width at the bottom on a phone), one
//       visible at a time, so pick the visible one to restore focus.
//   #pl-browse-all                  the closing "Browse all N with filters".
// No element id equals a category slug: the app's hash-landing code scrolls
// to an element whose id matches the URL hash, and the list state lives there.

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

function ViewMore({ cat, where, more = true, count, onViewMore }) {
  return (
    <button
      type="button"
      className={`btn pl-ov-btn pl-viewmore pl-viewmore--${where}`}
      aria-label={more ? `View more ${cat.label} prompts` : `See all ${count} ${cat.label} prompts`}
      onClick={() => onViewMore(cat.slug)}
    >
      {more ? 'View more' : `See all ${count}`} <ArrowRight />
    </button>
  )
}

function SectionHead({ section, showsOpen, isOpen, onViewMore }) {
  const { cat, members, more } = section
  const hid = `pl-shelf-h-${cat.slug}`
  return (
    <div className="pl-shelf-head">
      <div className="pl-shelf-hgroup">
        <div className="pl-shelf-hline">
          <h2 id={hid}>{cat.label}</h2>
          <p className="pl-shelf-count">{countLine(members, isOpen, showsOpen)}</p>
        </div>
        {cat.desc && <p className="pl-shelf-desc">{cat.desc}</p>}
      </div>
      <ViewMore cat={cat} where="top" more={more} count={members.length} onViewMore={onViewMore} />
    </div>
  )
}

export default function PromptOverview({
  rows,
  openRows,
  tier,
  proPending = false,
  loadingStatus = null,
  savedIds,
  onOpen,
  onToggleSave,
  onViewMore,
  onBrowseAll,
  onSignup,
  onSubmit,
}) {
  const openIds = useMemo(() => new Set(openRows.map((p) => p.id)), [openRows])

  // The prompts a free account opens: the first `free` rung's worth of the
  // rows the flag allows, in canonical order. A signed-out visitor's locked
  // card says "Free account" only for these; every other locked prompt is Pro.
  const freeSet = useMemo(() => {
    const flagged = rows.filter((p) => LIBRARY_RULES.prompts.isOpen(p) === true)
    return new Set(flagged.slice(0, galleryLimit('free')).map((p) => p.id))
  }, [rows])

  // While a Pro account's library is still arriving, `rows` holds locked stubs
  // that will open. Showing them as "Pro" would tell a paying viewer the wrong
  // thing, so only what is open is drawn until the answer lands.
  const visibleRows = useMemo(() => (proPending ? rows.filter((p) => openIds.has(p.id)) : rows), [proPending, rows, openIds])
  const isOpen = (p) => openIds.has(p.id)
  const kindOf = (p) => (isOpen(p) ? null : tier === 'anonymous' && freeSet.has(p.id) ? 'account' : 'pro')

  const { shelves, covers } = useMemo(() => buildOverview(visibleRows, (p) => openIds.has(p.id)), [visibleRows, openIds])
  const showsOpen = tier !== 'pro'

  const previewOf = (p) => ({ id: p.id, tags: lockTagLineTags(p) })

  const renderItem = (p, variant) => (
    isOpen(p) ? (
      <PromptCard
        p={p}
        variant={variant}
        isCommunity
        isSaved={savedIds.has(p.id)}
        onOpen={onOpen}
        onToggleSave={onToggleSave}
      />
    ) : (
      <PromptLockedCard preview={previewOf(p)} kind={kindOf(p)} variant={variant} onSignup={onSignup} />
    )
  )

  const total = rows.length
  const openCount = openRows.length

  return (
    <div className="pl-overview">
      {shelves.length > 0 && (
        <div className="pl-shelves">
          {shelves.map((section) => {
            const { cat, shown } = section
            return (
              <section key={cat.slug} className="pl-shelf" id={`pl-shelf-${cat.slug}`} aria-labelledby={`pl-shelf-h-${cat.slug}`}>
                <SectionHead section={section} showsOpen={showsOpen} isOpen={isOpen} onViewMore={onViewMore} />
                <ul className="pl-shelf-grid">
                  {shown.map((p, i) => (
                    <li key={p.id} className={`pl-shelf-item ${i === 0 ? 'pl-shelf-item--lead' : 'pl-shelf-item--rest'}`}>
                      {renderItem(p, i === 0 ? 'lead' : 'rest')}
                    </li>
                  ))}
                </ul>
                <ViewMore cat={cat} where="bottom" more={section.moreOnPhone} count={section.members.length} onViewMore={onViewMore} />
              </section>
            )
          })}
        </div>
      )}

      {covers.length > 0 && (
        <div className="pl-covers">
          {covers.map((section) => {
            const { cat, shown } = section
            // A cover with no partner of the same size takes the whole row
            // (see buildOverview); larger mosaics sit below the heading.
            const spans = !!section.span
            return (
              <section
                key={cat.slug}
                className={`pl-cover${spans ? ' pl-cover--span' : ''}${spans && shown.length > 2 ? ' pl-cover--wide' : ''}`}
                id={`pl-shelf-${cat.slug}`}
                aria-labelledby={`pl-shelf-h-${cat.slug}`}
              >
                <SectionHead section={section} showsOpen={showsOpen} isOpen={isOpen} onViewMore={onViewMore} />
                {/* A picture of the outputs, for the pointer; the View more
                    button is the keyboard and screen-reader route into the list. */}
                <div className="pl-mosaic" aria-hidden="true" onClick={() => onViewMore(cat.slug)}>
                  {shown.map((p) => {
                    const kind = kindOf(p)
                    return (
                      <div key={p.id} className={`pl-mosaic-tile${kind ? ' is-locked' : ''}`}>
                        {hasPromptPreview(p.id) ? (
                          <img src={promptPosterSrc(p.id)} alt="" loading="lazy" decoding="async" width="960" height="600" />
                        ) : !kind && <span className="pl-mosaic-name">{p.title}</span>}
                        {kind && <LockMark kind={kind} />}
                      </div>
                    )
                  })}
                </div>
                <ViewMore cat={cat} where="bottom" more={section.moreOnPhone} count={section.members.length} onViewMore={onViewMore} />
              </section>
            )
          })}
        </div>
      )}

      {proPending ? loadingStatus : (
        <section className="pl-close" aria-labelledby="pl-close-h">
          <div className="pl-close-text">
            {tier === 'pro' ? (
              <>
                <h2 id="pl-close-h">{`All ${total} community prompts are open to you.`}</h2>
                <p>Submit one of your own. Every submission is reviewed before it appears in the library.</p>
              </>
            ) : tier === 'anonymous' ? (
              <>
                <h2 id="pl-close-h">{`Signed out, you can open ${openCount} of the ${total} community prompts.`}</h2>
                <p>{`A free account opens ${freeSet.size}. Pro opens all ${total}.`}</p>
              </>
            ) : (
              <>
                <h2 id="pl-close-h">{`Free covers ${openCount} of the ${total} community prompts.`}</h2>
                <p>{`Pro opens the other ${total - openCount}, each as the full brief its author wrote, ready to copy.`}</p>
              </>
            )}
          </div>
          <div className="pl-close-actions">
            {tier === 'pro' ? (
              <button type="button" className="btn btn-accent pl-ov-btn" onClick={() => onSubmit?.()}>
                Create and submit your own
              </button>
            ) : tier === 'anonymous' ? (
              <button type="button" className="btn btn-accent pl-ov-btn" onClick={() => onSignup?.()}>
                Create your free account
              </button>
            ) : (
              <Link
                className="btn btn-accent pl-ov-btn"
                to="/plans"
                onClick={() => { reportUpgradeGate('prompt-library-community-lock') }}
              >
                See what Pro includes
              </Link>
            )}
            <button type="button" id="pl-browse-all" className="btn pl-ov-btn" onClick={() => onBrowseAll()}>
              {`Browse all ${total} with filters`}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

// The tags a locked card may show: the row's own tag set, first two, lowercased
// as the library's preview rule does. Kept here so the card is handed an id and
// tags only, whatever else the row carries.
function lockTagLineTags(p) {
  return LIBRARY_RULES.prompts.preview(p).tags
}

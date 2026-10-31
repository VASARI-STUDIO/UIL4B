import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GradientGalleryGrid from '../components/discover/GradientGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import LibraryGrid from '../components/library/LibraryGrid'
import { LockedPaletteCard, LockedTeaseCta } from '../components/library/LockedTease'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import ProLibraryStatus from '../components/library/ProLibraryStatus'
import { useProLibrary } from '../hooks/useProLibrary'
import { GRADIENT_TAGS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { LIBRARY_GRADIENT_ROWS } from '../data/gradientLibrary'
import { LIBRARY_RULES } from '../utils/libraryRules'
import { openGradientRows, matchesGradientFacets } from '../utils/gradientMoods'
import { countLegacyGradientSubmissions, sanitizeGradientSubmission, removeLegacyGradientSubmission } from '../utils/gradientSubmissions'
import { listMySubmissions, deleteSubmission } from '../utils/communityQueueApi'
import useGradientSubmissionMigration from '../hooks/useGradientSubmissionMigration'
import LegacyGradientsPrompt from '../components/LegacyGradientsPrompt'
import { splitLockedLibrary, accountTierGain, galleryLimit, galleryTier, tierSentence } from '../utils/lockedPreview'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet — every selector rooted at the page root's two classes.
import '../styles/pages/gradient-gallery.css'

// /discover/gradients — the Gradient Library. A designgradients-style browse
// surface over the local static set (src/data/gradientGallery.js): search by
// name/hex/tag, filter by mood tag and gradient type, copy the CSS or open any
// gradient straight in the Gradient Generator. No network, no loading state —
// the only Murphy state is "no results", which is never a dead end (one-tap
// clear).
//
// The masthead and results row come from the shared Discover Library
// components, so this page and the Palette Library stay in lockstep by
// construction rather than by copy-paste.

const TYPES = ['Linear', 'Radial', 'Conic']

// What the queue's status says on a submission row. 'approved' and 'rejected'
// are a reviewer's words; anything unknown reads as pending.
const QUEUE_STATUS_LABEL = { pending: 'Pending review', approved: 'Approved', rejected: 'Not approved' }

// Filter options are built once at module scope: they are pure functions of
// static data, and rebuilding them per render would hand LibraryFilterGroup a
// new array identity every keystroke and re-measure the sliding indicator.
//
// The four mood tags that name a colour carry a colour dot. The other three
// (pastel, vivid, mono) describe saturation rather than hue, so a single
// swatch would misrepresent them — a dot is only added where it can be honest.
const MOOD_OPTIONS = [
  { id: 'all', label: 'All' },
  ...GRADIENT_TAGS.map(t => ({
    id: t,
    label: t[0].toUpperCase() + t.slice(1),
    ...(['warm', 'cool', 'dark', 'light'].includes(t) ? { dot: t } : {}),
  })),
]

const TYPE_OPTIONS = [
  { id: 'all', label: 'All types' },
  ...TYPES.map(t => ({ id: t, label: t })),
]

export default function GradientGallery({ toast }) {
  const { user, loading: authLoading } = useAuth()
  const { isPro } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // A Pro account's full library comes from the server (src/utils/proLibrary.js);
  // the bundle holds the free rows and name-only stubs. Until it arrives a Pro
  // viewer sees the free rows and a status line, never the upsell.
  const pro = useProLibrary('gradients')
  const ready = pro.status === 'ready'
  const proPending = pro.active && !ready
  const rows = pro.items ?? LIBRARY_GRADIENT_ROWS
  // Anonymous → free account → Pro, exactly as on the Palette Library. Both
  // inputs must be an exact `true` to climb a rung: an entitlement or an auth
  // state still resolving shows the tier below, never the one above.
  const tier = galleryTier({ isPro: ready, signedIn: user != null })
  const [rawQuery, setRawQuery] = useState('')
  // `?mood=warm` opens the library already filtered (the Gradient Generator's
  // taste chips link here). Anything that is not a known mood reads as All.
  const [searchParams, setSearchParams] = useSearchParams()
  const urlMood = searchParams.get('mood')
  const moodFromUrl = GRADIENT_TAGS.includes(urlMood) ? urlMood : 'all'
  const [tag, setTag] = useState(moodFromUrl)
  // Following a mood link while already on the library (or Back / Forward
  // between two of them) changes the URL without remounting, so the filter
  // follows it. Keyed on the URL's mood only: picking a mood in the tray does
  // not touch the URL and so is not undone here.
  useEffect(() => { setTag(moodFromUrl) }, [moodFromUrl])
  // An ARRAY, because the type tray is multi-select (founder request,
  // 2026-08-08). `['all']` is the unfiltered state; picking every type collapses
  // straight back to it, which LibraryFilterGroup handles.
  const [types, setTypes] = useState(['all'])
  // "Your submissions" belongs to the ACCOUNT, not to this browser: it is read
  // from the review queue under the signed-in uid and nowhere else.
  //
  // Gradients an earlier visit held in this browser are never listed here.
  // Signed in, the page asks whether they are this account's (Keep moves them
  // and the list picks them up; they are never moved unasked, as a shared
  // machine's browser can hold someone else's). Signed out, the page offers to
  // keep them (the sign-in note below) rather than show a list that lives in one
  // browser. Either way they stay OUT of the browse grid: they are not in the
  // library, and showing them there would imply they had been published.
  const [queue, setQueue] = useState({ uid: null, items: [] })
  const [queueRefresh, setQueueRefresh] = useState(0)
  const [withdrawingId, setWithdrawingId] = useState(null)
  // How many an earlier visit left in this browser (withdrawn ones are not counted); read once, never written.
  const [legacyCount] = useState(() => countLegacyGradientSubmissions())
  const keepGradients = useGradientSubmissionMigration({ toast, onMigrated: () => setQueueRefresh(n => n + 1) })

  useEffect(() => {
    let cancelled = false
    const uid = user?.uid
    if (!uid) return undefined
    listMySubmissions(uid, 'gradient')
      .then((server) => {
        if (cancelled) return
        const items = server
          .filter(s => s.status !== 'withdrawn')
          .map((s) => {
            // The server's copy gets the same clean-up a local entry did: a
            // document that doesn't describe a gradient is skipped, not drawn.
            const g = sanitizeGradientSubmission({
              id: s.id,
              name: s.name,
              author: s.authorName,
              type: s.payload?.type,
              angle: s.payload?.angle,
              stops: s.payload?.stops,
            })
            return g && { ...g, docId: s.id, localId: s.localId, status: s.status, createdAt: s.createdAt }
          })
          .filter(Boolean)
        setQueue({ uid, items })
      })
      .catch(() => { /* the list stays as it was; nothing is lost */ })
    return () => { cancelled = true }
  }, [user?.uid, queueRefresh])
  // Another person's list never shows through after a sign-out or account switch.
  const submissions = user?.uid && queue.uid === user.uid ? queue.items : []

  const withdraw = async (s) => {
    if (withdrawingId) return
    setWithdrawingId(s.docId)
    try {
      // Forget the browser-held copy first, so a withdrawn gradient can never
      // be found there and published again.
      removeLegacyGradientSubmission(s.localId)
      keepGradients.recount()
      await deleteSubmission(s.docId)
      setQueue(q => ({ ...q, items: q.items.filter(x => x.docId !== s.docId) }))
      toast?.(s.status === 'pending' ? 'Submission withdrawn' : 'Submission removed')
    } catch {
      toast?.('Couldn’t withdraw that one. Try again.', 'error')
    } finally {
      setWithdrawingId(null)
    }
  }
  const query = rawQuery.trim().toLowerCase()

  // THE GATE, BEFORE THE DATA IS PRODUCED — not on a control, not in CSS.
  //
  // Every gradient is eligible (`isOpen` is unconditional): unlike the palette
  // and prompt libraries this collection has no per-row paid flag, so the tier
  // CAP is the whole gate here. It still runs over the rows in their own
  // order, before the filters and the search see anything, which is what stops
  // it being the positional gate utils/lockedPreview.js was written after.
  //
  // Closing the search oracle is the reason it has to sit here rather than in
  // the grid: the haystack below indexes every stop's HEX, so filtering the
  // full collection would let a signed-out visitor confirm a withheld
  // gradient's colours by typing them, and read its name back from the result.
  const { open: browsable, locked: lockedPreviews, remaining: lockedCount, eligible } = useMemo(() => (
    // A gradient's NAME is the tease and its stops are the product — the same
    // split as a brand palette, and the opposite of a community prompt, whose
    // title IS the thing being sold. `slots` is the stop count: how many values
    // the row holds, never the values (src/utils/libraryRules.js).
    splitLockedLibrary(rows, {
      unlocked: ready,
      isOpen: LIBRARY_RULES.gradients.isOpen,
      preview: LIBRARY_RULES.gradients.preview,
      limit: galleryLimit(tier),
    })
  ), [rows, ready, tier])

  const accountAdds = accountTierGain({ tier, eligible, shown: browsable.length })

  const visible = useMemo(() => browsable.filter(g => {
    if (!matchesGradientFacets(g, tag, types)) return false
    if (query) {
      const hay = `${g.name} ${g.type} ${g.tags.join(' ')} ${g.stops.map(s => s.color).join(' ')}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  }), [browsable, query, tag, types])

  const clearAll = () => {
    setRawQuery(''); setTag('all'); setTypes(['all'])
    // A mood in the URL would otherwise survive the reset and come back on reload.
    if (searchParams.has('mood')) {
      const next = new URLSearchParams(searchParams)
      next.delete('mood')
      setSearchParams(next, { replace: true })
    }
  }

  // When a signed-out visitor's mood or type filter comes up empty, say so if
  // the cap is the reason: a free account opens more rows, and some of them fit.
  // Counted over the free tier's open rows by mood and type ONLY. A typed search
  // is deliberately left out — it indexes hex values, so reporting whether
  // withheld rows match it would be the oracle the gate above exists to close.
  // Mood and type are public facets, so the count discloses nothing new.
  //
  // While auth is still resolving the tier reads anonymous even for a signed-in
  // account, so nothing is claimed (and no sign-in action offered) until it has.
  const accountMatches = useMemo(() => {
    if (authLoading || tier !== 'anonymous' || query) return 0
    if (tag === 'all' && types.includes('all')) return 0
    return openGradientRows(rows, 'free').filter(g => matchesGradientFacets(g, tag, types)).length
  }, [authLoading, tier, query, tag, types, rows])

  // The teased tail. Shown only while the view is unnarrowed: under a search or
  // a filter the visitor has asked a narrower question, and answering it with a
  // paywall is an interruption rather than an offer (same rule as the Palette
  // and Prompt libraries).
  //
  // The anonymous rung gets the wall WITHOUT placeholders, because
  // LockedPaletteCard stamps every placeholder "Pro" and the next rows are not
  // Pro's — they come with a free account. See the longer note in
  // PaletteGallery.jsx.
  const anonymous = tier === 'anonymous'
  const teaseVisible = !proPending && lockedCount > 0 && !query && tag === 'all' && types.includes('all')
  // Where the viewer stands on the ladder, in words, for the wall and the close.
  const ladderLine = tierSentence({ tier, shown: browsable.length, total: rows.length, eligible, noun: 'gradients' })
  const lockedBlock = teaseVisible ? (
    anonymous ? (
      <div className="lockt-cta">
        <div className="lockt-cta-copy">
          <p className="lockt-cta-head">{`Another ${accountAdds} ${accountAdds === 1 ? 'gradient' : 'gradients'} with a free account`}</p>
          <p className="lockt-cta-body">{ladderLine}</p>
        </div>
        <button
          type="button"
          className="btn btn-accent lockt-cta-btn"
          onClick={() => requireLogin('browse more of the gradient library', { free: true, signup: true })}
        >
          Create your free account
        </button>
      </div>
    ) : (
      <>
        {/* The locked grid names itself. A screen-reader user meets three more
            cards after the open ones and needs to know why they differ; without
            a name this is an unexplained second grid. The placeholder SHAPES are
            hidden inside the card, and the name it does carry is the gradient's
            own — a fact, not an invention. */}
        <h2 className="sr-only" id="grg-locked-more">Gradients included with Pro</h2>
        <LibraryGrid className="grg-grid" min={280} labelledBy="grg-locked-more">
          {lockedPreviews.map((preview) => <LockedPaletteCard key={preview.id} preview={preview} gate="gradient-library-locked-card" />)}
        </LibraryGrid>
        <LockedTeaseCta
          gate="gradient-library-tier-lock"
          heading={`Another ${lockedCount} ${lockedCount === 1 ? 'gradient' : 'gradients'} with Pro`}
          body={`Free covers ${browsable.length} of the ${rows.length}. Pro opens the remaining ${lockedCount}, each one editable in the Gradient Generator.`}
          action="See what Pro includes"
        />
      </>
    )
  ) : null

  return (
    <div className="sec lib-surface grg-wrap">
      {/* NO `description` (founder decision, 2026-09-13): the sentence here ran
          the same template as the Palette Library’s — "…with a point of view …
          make it yours." — which is what held both pages at 7 on
          purpose-and-content. Deleted, not rewritten. The masthead is sized by
          its content now, so losing a line costs nothing above the headline. */}
      <DiscoverGalleryHero
        title="Gradient Library"
        action={(
          <Link className="btn" to="/create/gradient">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
            Open the Gradient Generator
          </Link>
        )}
      />

      {user && keepGradients.waiting > 0 && (
        <section className="grg-queue" aria-labelledby="grg-keep-heading">
          <div className="section-h">
            <h2 id="grg-keep-heading">Left in this browser</h2>
          </div>
          <LegacyGradientsPrompt
            count={keepGradients.waiting}
            busy={keepGradients.busy}
            onKeep={keepGradients.keep}
            onDismiss={keepGradients.notMine}
          />
        </section>
      )}

      {submissions.length > 0 && (
        <section className="grg-queue" aria-labelledby="grg-queue-heading">
          <div className="section-h">
            <h2 id="grg-queue-heading">Your submissions</h2>
            <span className="meta">Saved with your account</span>
          </div>
          <p className="grg-queue-note">
            A reviewer has to approve a gradient before it joins the library above, so a
            pending one is not live yet.
          </p>
          <ul className="grg-queue-list">
            {submissions.map(s => (
              <li key={s.docId} className="grg-queue-item">
                <span className="grg-queue-swatch" style={{ background: gradientCss(s.type, s.angle, s.stops) }} aria-hidden="true" />
                <span className="grg-queue-id">
                  <strong>{s.name}</strong>
                  <span className="meta">{s.type} · {s.stops.length} stops · by {s.author}</span>
                </span>
                <span className={`grg-queue-status${s.status === 'pending' ? '' : ' is-decided'}`}>{QUEUE_STATUS_LABEL[s.status] || 'Pending review'}</span>
                <Link className="btn btn-s btn-ghost" to={gradientToolUrl({ ...s, name: s.name, src: 'link' })}>Open</Link>
                {s.status !== 'approved' && (
                  <button
                    type="button"
                    className="btn btn-s btn-ghost"
                    disabled={withdrawingId === s.docId}
                    onClick={() => withdraw(s)}
                  >
                    {s.status === 'pending' ? 'Withdraw' : 'Remove'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Signed out with gradients left in this browser by an earlier visit. They
          are not listed (a browser-only list is the thing this replaces); signing
          in moves them to the account. Held back until auth has resolved, so a
          signed-in person never sees it flash. */}
      {!authLoading && !user && legacyCount > 0 && (
        <section className="grg-queue" aria-labelledby="grg-queue-heading">
          <div className="section-h">
            <h2 id="grg-queue-heading">Your submissions</h2>
          </div>
          <p className="grg-queue-note">
            {legacyCount} {legacyCount === 1 ? 'gradient' : 'gradients'} from this browser {legacyCount === 1 ? 'is' : 'are'} waiting.
            {' '}Sign in to keep {legacyCount === 1 ? 'it' : 'them'} with your account.
          </p>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => requireLogin('keep your gradients with your account', { free: true })}
          >
            Sign in
          </button>
        </section>
      )}

      {/* Toolbar — search joins the mood + type filters (AND semantics).
          Both filter groups now use the one shared segmented idiom. This
          toolbar previously ran outlined pills for mood and a filled segmented
          control for type, side by side, so a single row asked "which subset?"
          in two visually unrelated ways. */}
      <LibraryToolbar
        className="grg-toolbar"
        quick={1}
        activeFilters={(tag !== 'all' ? 1 : 0) + (types.includes('all') ? 0 : 1)}
        search={{
          value: rawQuery,
          onChange: setRawQuery,
          placeholder: 'Search gradients by name, hex or mood…',
          label: 'Search gradients',
        }}
      >
        {/* A MENU at every width, as the Palette Library's Mood group is and
            for the same measured reason. Eight options beside the four-option
            Type tray and the search field: MEASURED 2026-09-16 on the live
            site, 122px of two-row sticky toolbar at 1024 (iPad landscape,
            small laptops) against 68px at 1280. Neither mechanism the tray
            already has reaches that width — the measured `overflows` path is
            deliberately blind to sibling groups (LibraryFilterGroup's
            oscillation note) and the collapse band stops at 980 — so, as on
            palettes, it is a decision about the OPTIONS taken here: a facet
            with eight values is a labelled control that opens a list, and
            the trigger states the selection ("MOOD · Warm"). */}
        <LibraryFilterGroup
          label="Filter by mood"
          triggerLabel="Mood"
          value={tag}
          onChange={setTag}
          options={MOOD_OPTIONS}
          alwaysCollapsed
        />
        <LibraryFilterGroup
          label="Filter by gradient type"
          triggerLabel="Type"
          value={types}
          onChange={setTypes}
          options={TYPE_OPTIONS}
          multiSelect
          hint="Shift-click to combine types"
        />
      </LibraryToolbar>

      {/* THE RESULTS REGION IS THE SAME REGION IN EVERY STATE.

          It used to wrap only the populated arm, so filtering to nothing
          DELETED it. Measured on the built preview at 1440x900: on arrival
          the landmark list carried region("Colours worth building with");
          after a search that matched nothing it read

            navigation("Primary") | main
            | region("Can’t find what you’re looking for?")
            | contentinfo | navigation("Footer")

          — the results landmark gone, and the closing CTA left as the only
          landmark on the page describing content. A reader who filters to
          zero and then navigates by landmark to get back to the results
          cannot: the heading naming them is still rendered, and there is no
          longer any region for it to name.

          The head moves INSIDE the region it labels for the same reason. A
          section may legally be labelled by an element outside it, but the
          effect was that the one heading answering "what am I looking at"
          sat in no landmark at all. Nothing here is new copy — the same
          head, the same empty state, one element moved. */}
      <section aria-labelledby="grg-grid-heading">
        <DiscoverResultHead
          eyebrow="Curated collection"
          title="Gradients worth building with"
          // No count while a Pro library is on its way: the number of free
          // rows would be the wrong one. Otherwise the whole library's size sits
          // beside the part this viewer has, on the unnarrowed view only.
          count={proPending ? undefined : visible.length}
          total={teaseVisible ? rows.length : undefined}
          noun="gradient"
          id="grg-grid-heading"
        />

        {visible.length > 0 ? (
          <GradientGalleryGrid toast={toast} gradients={visible} />
        ) : proPending ? null : (
          // The reset is unconditional now. It used to render only when the page
          // could prove a filter was set, which hid it in precisely the case
          // where working out what to undo by hand was hardest.
          <LibraryEmpty
            className="grg-empty"
            title={accountMatches > 0
              ? 'Nothing open to you matches those filters.'
              : `No gradients match ${query ? `“${rawQuery.trim()}”` : 'those filters'}.`}
            detail={accountMatches > 0
              ? `Signed out, you can browse ${browsable.length} of the ${rows.length} gradients. A free account opens ${accountMatches} that ${accountMatches === 1 ? 'fits' : 'fit'} these filters.`
              : 'Try a broader search, or reset the mood and type filters to see all of them again.'}
            onClear={clearAll}
            action={accountMatches > 0 ? (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => requireLogin('browse more of the gradient library', { free: true, signup: true })}
              >
                {`Open ${accountMatches === 1 ? 'it' : accountMatches} with a free account`}
              </button>
            ) : null}
          />
        )}
      </section>

      {/* The tier wall, after the grid and before the closing line — the reading
          order Savee's paywall uses and the one the Palette and Prompt libraries
          already run: what you have, then a glimpse of more, then how to get it. */}
      {lockedBlock}
      {proPending && <ProLibraryStatus library={pro} noun="gradient library" />}

      {/* The closing line, last child of the page. Same reasoning as the Palette
          Library: the Gradient Generator is where a gradient gets made, so the
          link goes there and carries no intent ahead of the user. */}
      {/* "Make your own" is for Pro viewers only; everyone else, at the end of a capped
          result, is offered more access instead. Where the locked tease is
          already on screen it IS that offer, so the close does not repeat it. */}
      {isPro === true ? (
        <GalleryCloseCta
          className="grg-cta"
          detail="Make your own in the Gradient Generator and save it to your account."
          action="Make your own"
          to="/create/gradient"
        />
      ) : !teaseVisible && !proPending && lockedCount > 0 ? (
        // A signed-out visitor's next step is the free account, with the same
        // numbers the wall states; a free account's next step is Pro.
        anonymous ? (
          <GalleryCloseCta
            className="grg-cta"
            detail={ladderLine}
            action="Create your free account"
            onAction={() => requireLogin('browse more of the gradient library', { free: true, signup: true })}
            busy={authLoading}
          />
        ) : (
          <GalleryCloseCta
            className="grg-cta"
            detail={ladderLine}
            action="See what Pro includes"
            to="/plans"
          />
        )
      ) : null}
    </div>
  )
}

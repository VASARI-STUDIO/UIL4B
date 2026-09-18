import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GradientGalleryGrid from '../components/discover/GradientGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import LibraryGrid from '../components/library/LibraryGrid'
import { LockedPaletteCard, LockedTeaseCta } from '../components/library/LockedTease'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { GALLERY_GRADIENTS, GRADIENT_TAGS, gradientCss, gradientToolUrl } from '../data/gradientGallery'
import { readGradientSubmissions, withdrawGradientSubmission } from '../utils/gradientSubmissions'
import { mergeSubmissions } from '../utils/communityQueue'
import { listMySubmissions } from '../utils/communityQueueApi'
import { splitLockedLibrary, accountTierGain, galleryLimit, galleryTier } from '../utils/lockedPreview'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/tool-shell.css'

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
  const { user } = useAuth()
  const { isPro } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  // Anonymous → free account → Pro, exactly as on the Palette Library. Both
  // inputs must be an exact `true` to climb a rung: an entitlement or an auth
  // state still resolving shows the tier below, never the one above.
  const tier = galleryTier({ isPro, signedIn: user != null })
  const [rawQuery, setRawQuery] = useState('')
  const [tag, setTag] = useState('all')
  // An ARRAY, because the type tray is multi-select (founder request,
  // 2026-08-08). `['all']` is the unfiltered state; picking every type collapses
  // straight back to it, which LibraryFilterGroup handles.
  const [types, setTypes] = useState(['all'])
  // Gradients this browser has queued for review. They are deliberately kept
  // OUT of the browse grid: they are not in the library, and showing them there
  // would imply they had been published. See utils/gradientSubmissions.js.
  const [submissions, setSubmissions] = useState(readGradientSubmissions)

  // "My pending submissions" is a property of the ACCOUNT, not of this browser.
  //
  // This list used to come from localStorage alone, so a gradient submitted on
  // a phone was invisible on a laptop and vice versa — the reported symptom was
  // "I submitted other gradients that I do not see here". They were never lost;
  // they were simply only ever in one browser's storage, and no reviewer could
  // see them either.
  //
  // The local list still renders first (instant, works offline); the account's
  // copy merges in when it arrives. Local-only entries are KEPT and marked
  // unsynced rather than dropped — they are real submissions that have not
  // reached the queue yet, and hiding them would look exactly like the bug.
  useEffect(() => {
    let cancelled = false
    if (!user?.uid) return undefined
    listMySubmissions(user.uid, 'gradient')
      .then((server) => {
        if (cancelled) return
        setSubmissions(prev => mergeSubmissions(
          server.map(s => ({
            id: s.localId || s.id,
            name: s.name,
            status: s.status,
            createdAt: s.createdAt,
            ...(s.payload || {}),
          })),
          prev,
        ))
      })
      .catch(() => { /* the local list still stands; nothing is lost */ })
    return () => { cancelled = true }
  }, [user?.uid])
  const query = rawQuery.trim().toLowerCase()

  // THE GATE, BEFORE THE DATA IS PRODUCED — not on a control, not in CSS.
  //
  // Every gradient is eligible (`isOpen` is unconditional): unlike the palette
  // and prompt libraries this collection has no per-row paid flag, so the tier
  // CAP is the whole gate here. It still runs over GALLERY_GRADIENTS in its own
  // order, before the filters and the search see anything, which is what stops
  // it being the positional gate utils/lockedPreview.js was written after.
  //
  // Closing the search oracle is the reason it has to sit here rather than in
  // the grid: the haystack below indexes every stop's HEX, so filtering the
  // full collection would let a signed-out visitor confirm a withheld
  // gradient's colours by typing them, and read its name back from the result.
  const { open: browsable, locked: lockedPreviews, remaining: lockedCount, eligible } = useMemo(() => (
    splitLockedLibrary(GALLERY_GRADIENTS, {
      unlocked: isPro === true,
      isOpen: () => true,
      // A gradient's NAME is the tease and its stops are the product — the same
      // split as a brand palette, and the opposite of a community prompt, whose
      // title IS the thing being sold. `slots` is the stop count: how many
      // values the row holds, never the values.
      preview: (g) => ({ id: g.id, label: g.name, slots: g.stops.length }),
      limit: galleryLimit(tier),
    })
  ), [isPro, tier])

  const accountAdds = accountTierGain({ tier, eligible, shown: browsable.length })

  const visible = useMemo(() => browsable.filter(g => {
    if (tag !== 'all' && !g.tags.includes(tag)) return false
    if (!types.includes('all') && !types.includes(g.type)) return false
    if (query) {
      const hay = `${g.name} ${g.type} ${g.tags.join(' ')} ${g.stops.map(s => s.color).join(' ')}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  }), [browsable, query, tag, types])

  const clearAll = () => { setRawQuery(''); setTag('all'); setTypes(['all']) }

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
  const teaseVisible = lockedCount > 0 && !query && tag === 'all' && types.includes('all')
  const lockedBlock = teaseVisible ? (
    anonymous ? (
      <div className="lockt-cta">
        <div className="lockt-cta-copy">
          <p className="lockt-cta-head">{`Another ${accountAdds} ${accountAdds === 1 ? 'gradient' : 'gradients'} with a free account`}</p>
          <p className="lockt-cta-body">{`A free account opens ${browsable.length + accountAdds} of the ${GALLERY_GRADIENTS.length} gradients. Pro opens all ${GALLERY_GRADIENTS.length}.`}</p>
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
          {lockedPreviews.map((preview) => <LockedPaletteCard key={preview.id} preview={preview} />)}
        </LibraryGrid>
        <LockedTeaseCta
          gate="gradient-library-tier-lock"
          heading={`Another ${lockedCount} ${lockedCount === 1 ? 'gradient' : 'gradients'} with Pro`}
          body={`Free covers ${browsable.length} of the ${GALLERY_GRADIENTS.length}. Pro opens the remaining ${lockedCount}, each one editable in the Gradient Generator.`}
          action="See what Pro includes"
          modal={{
            eyebrow: 'Pro colour tools',
            title: 'The full gradient library',
            subtitle: `Free covers ${browsable.length} of the ${GALLERY_GRADIENTS.length} gradients. Pro opens the remaining ${lockedCount}, each one with its CSS to copy and its stops to edit.`,
          }}
        />
      </>
    )
  ) : null

  return (
    <div className="sec grg-wrap">
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

      {submissions.length > 0 && (
        <section className="grg-queue" aria-labelledby="grg-queue-heading">
          <div className="section-h">
            <h2 id="grg-queue-heading">Your submissions</h2>
            <span className="meta">Queued for review — not published</span>
          </div>
          <p className="grg-queue-note">
            These are held on this browser while shared publishing is built. A reviewer has
            to approve a gradient before it joins the library above, so nothing here is live yet.
          </p>
          <ul className="grg-queue-list">
            {submissions.map(s => (
              <li key={s.id} className="grg-queue-item">
                <span className="grg-queue-swatch" style={{ background: gradientCss(s.type, s.angle, s.stops) }} aria-hidden="true" />
                <span className="grg-queue-id">
                  <strong>{s.name}</strong>
                  <span className="meta">{s.type} · {s.stops.length} stops · by {s.author}</span>
                </span>
                <span className="grg-queue-status">Pending review</span>
                <Link className="btn btn-s btn-ghost" to={gradientToolUrl({ ...s, name: s.name })}>Open</Link>
                <button
                  type="button"
                  className="btn btn-s btn-ghost"
                  onClick={() => {
                    setSubmissions(withdrawGradientSubmission(s.id))
                    toast?.('Submission withdrawn')
                  }}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Toolbar — search joins the mood + type filters (AND semantics).
          Both filter groups now use the one shared segmented idiom. This
          toolbar previously ran outlined pills for mood and a filled segmented
          control for type, side by side, so a single row asked "which subset?"
          in two visually unrelated ways. */}
      <LibraryToolbar
        className="grg-toolbar"
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
          count={visible.length}
          noun="gradient"
          id="grg-grid-heading"
        />

        {visible.length > 0 ? (
          <GradientGalleryGrid toast={toast} gradients={visible} />
        ) : (
          // The reset is unconditional now. It used to render only when the page
          // could prove a filter was set, which hid it in precisely the case
          // where working out what to undo by hand was hardest.
          <LibraryEmpty
            className="grg-empty"
            title={`No gradients match ${query ? `“${rawQuery.trim()}”` : 'those filters'}.`}
            detail="Try a broader search, or reset the mood and type filters to see all of them again."
            onClear={clearAll}
          />
        )}
      </section>

      {/* The tier wall, after the grid and before the closing line — the reading
          order Savee's paywall uses and the one the Palette and Prompt libraries
          already run: what you have, then a glimpse of more, then how to get it. */}
      {lockedBlock}

      {/* The closing line, last child of the page. Same reasoning as the Palette
          Library: the Gradient Generator is where a gradient gets made and where
          its own "Submit to community" button already lives, running the
          requireLogin gate 09-auth-modal-accessibility covers. Sending a submit
          intent ahead of the user would open that form over a gradient they had
          not built. */}
      <GalleryCloseCta
        className="grg-cta"
        detail="Build one in the Gradient Generator — then submit it to the community from there."
        action="Create and submit your own"
        to="/create/gradient"
      />
    </div>
  )
}

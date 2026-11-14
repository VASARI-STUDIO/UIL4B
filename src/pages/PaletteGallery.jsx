import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import LibraryGate from '../components/library/LibraryGate'
import { reportUpgradeGate } from '../contexts/ProModalContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { splitLockedLibrary, freeOpens, galleryLimit, galleryTier, tierSentence } from '../utils/lockedPreview'
import { classifyPalette, MOOD_IDS, MOOD_LABELS } from '../utils/paletteMood'
import { paletteHaystack } from '../utils/paletteSearch'
import ProLibraryStatus from '../components/library/ProLibraryStatus'
import { useProLibrary } from '../hooks/useProLibrary'
import { LIBRARY_PALETTE_ROWS } from '../data/paletteLibrary'
import { LIBRARY_TOTALS } from '../data/libraryTotals'
import { LIBRARY_RULES } from '../utils/libraryRules'
import { countGallery, gateFor, palettePublicMatch } from '../utils/galleryCounts'
import { filterNoun } from '../utils/galleryFilterNoun'
import useResultsScroll from '../hooks/useResultsScroll'
import { paletteMeta } from '../utils/galleryMeta'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet — every selector rooted at the page root's two classes.
import '../styles/pages/palette-gallery.css'
// The V3 roles for the three Discover libraries, last so they win ties.
import '../styles/pages/library-v3.css'

// ── TWO QUESTIONS, TWO TRAYS ────────────────────────────────────────
//
// Mood filters: all eight of Neutral, Warm, Cool, Pastel, Vivid, Dark, Light,
// Monochrome.
//
// Those eight did not go into the tray the page already had, and the reason is
// the whole of this change. That tray was ONE single-select group holding
// Curated, Brand, Dark, Light and Vivid — provenance and mood in one row, where
// choosing a mood silently cleared the collection you had chosen. With three
// mood options that was a small annoyance you could re-click your way out of.
// With eleven it becomes a control that cannot express "warm brand palettes" at
// all, and that drops a choice the user made without telling them.
//
// So: WHERE a palette came from and WHAT it feels like are separate questions,
// and they are now separate groups whose answers combine (AND). This is the
// shape /discover/gradients has run since #323 — Mood beside Type — so it is
// the surface joining the system rather than inventing a layout.
//
// Mobbin, for mood facets on a colour library:
//   Relume     https://mobbin.com/screens/d9bf5b94-f50f-4449-9a75-666acc54178c
//     Its palette library sorts under plain-word headings ("Neutrals") with a
//     sentence explaining what the group is FOR, and its facet control is a row
//     of text tabs. No icon chips anywhere on the surface.
//   Squarespace https://mobbin.com/screens/593eed1f-c7a6-47d6-8250-0425afbf7767
//     Names moods as words — Innovative, Playful, Sophisticated, Friendly —
//     each over a strip of the actual swatches. The colours do the identifying;
//     the label does the naming; nothing is iconified.
//
// Both are the same lesson and it is the one the anti-slop bar states as
// "icons or abstract shapes fill space without strengthening recognition":
// a mood is a word, and a uniform strip of glyphs in front of eight words adds
// eight things to look at and nothing to read.
//
// ── WHICH CHIPS CARRY A DOT, AND WHY IT IS NOT ALL OF THEM ─────────────────
//
// The rule was already here and it still holds: a chip shows a colour only when
// the filter SELECTS ON THAT COLOUR. Dark and Light select on lightness, Warm
// and Cool on the two hue poles the classifier measures against (WARM_HUE, and
// its opposite), Neutral on the absence of chroma — each of those dots is a
// picture of the actual test. Pastel, Vivid and Monochrome select on how much
// chroma there is or how many hue families, neither of which is a colour, so
// they carry nothing. Five dots and three plain chips is not an inconsistency;
// giving the other three a dot would be, because the dot would be decoration
// pretending to be a legend.
const GROUP_FILTERS = [
  { id: 'all', label: 'All palettes' },
  { id: 'curated', label: 'Curated' },
  { id: 'brand', label: 'Brand' },
]

// The dots the shared tray already knows how to draw. Anything not named here
// renders as a plain word, which is the default and the right one.
const MOOD_DOTS = { neutral: 'neutral', warm: 'warm', cool: 'cool', dark: 'dark', light: 'light' }

// Built from MOOD_IDS rather than typed out, so the tray cannot fall out of
// step with the classifier: adding a mood to utils/paletteMood.js puts a chip
// on this page, and there is no second list to forget.
const MOOD_FILTERS = [
  // 'All', not 'Any mood'. Two reasons and both are measured. It is the exact
  // label /discover/gradients uses for the reset on ITS mood group, so the two
  // Discover libraries say the same word for the same thing. And the collapsed
  // trigger prints this label beside the group name, so "Any mood" rendered as
  // "MOOD  Any mood" — the noun twice, in 30px this toolbar does not have in
  // the 641–980 band. See the .lbry-search note in that band's block.
  { id: 'all', label: 'All' },
  ...MOOD_IDS.map((id) => ({ id, label: MOOD_LABELS[id], dot: MOOD_DOTS[id] })),
]

// ── Categories, in browse order ─────────────────────────────────────────────
//
// The intended order is trending/popular first, then brand palettes, then
// community. Two of those three do not exist yet, and neither is faked:
//
//   TRENDING is blocked on real usage data. There is no ranking signal in the
//   product — see the `upgrade-activation-events` queue item — and sorting by
//   anything else while calling it trending would be an invention dressed as a
//   measurement. The curated collection therefore leads in its catalogue order
//   and is not labelled trending.
//
//   COMMUNITY has no source. Community publishing is the `community-backend`
//   item and is not built. An empty "Community" heading would be a promise the
//   product cannot keep, so there isn't one.
//
// What ships is the ordering and the sectioning, over the two categories that
// hold real palettes today. Adding trending later is one entry in this array.
const SECTIONS = [
  {
    id: 'curated',
    label: 'Curated collection',
    // Says WHEN you would reach for this group rather than the other one. The
    // previous line — "Colour systems with a point of view, built here." —
    // opened on the same seven words as the hero description sitting about two
    // hundred pixels above it, so on one screen the page introduced itself
    // twice and distinguished the two groups not at all.
    blurb: 'Invented here, for work with no brand to follow.',
    match: (palette) => palette.kind === 'curated',
  },
  {
    id: 'brand',
    label: 'Brand systems',
    blurb: 'Published identity colours from interfaces you already know.',
    match: (palette) => palette.kind === 'brand',
  },
]

// Moods are a pure function of the hexes, classified once per set of rows the
// page actually holds (see the useMemo in the component). They used to be built
// at module scope over the whole library; the Pro rows are no longer in the
// bundle, so the map is built over what this viewer was given.
//
// The maths itself lives in utils/paletteMood.js, not here, for the reason the
// unit suite depends on: a classifier reachable only through a React page can
// only be checked through a browser, and the sweep that proves every one of the
// eight controls selects something has to be able to import it directly.
//
// NOTHING IS HAND-TAGGED. The key is the palette id; the ANSWER comes from the
// hexes alone. No `mood:` field exists on a palette and none should — a tag is
// written once and keeps its answer after an edit changes the colours under it.
// The tile's meta line: the palette's first mood in MOOD_IDS order, then its
// size ("Warm · 5 colours"); a brand system says so instead of a mood. Every mood
// comes from the classifier, so the word is measured, not tagged.
const cardMetaFor = (moodsById) => (palette) => {
  if (palette.kind === 'brand') return paletteMeta(palette.colors.length, 'Brand system')
  const moods = moodsById.get(palette.id) || {}
  const first = MOOD_IDS.find((id) => moods[id])
  return paletteMeta(palette.colors.length, first ? MOOD_LABELS[first] : null)
}

export default function PaletteGallery({ toast }) {
  const [query, setQuery] = useState('')
  // Two independent axes. `group` is provenance, `mood` is what the colours
  // feel like, and they intersect — which is the point of splitting them.
  const [group, setGroup] = useState('all')
  const [mood, setMood] = useState('all')
  const { isPro } = useSubscription()
  const { user, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // A Pro account's full library comes from the server (src/utils/proLibrary.js);
  // the bundle holds only the free rows and name-only stubs. Until it arrives, a
  // Pro viewer sees the free rows and a status line, never the upsell.
  const pro = useProLibrary('palettes')
  const ready = pro.status === 'ready'
  const rows = pro.items ?? LIBRARY_PALETTE_ROWS
  // Three rungs: anonymous → free account → Pro (utils/lockedPreview.js). Both
  // inputs must be an exact `true` to climb, so an entitlement or an auth state
  // that is still resolving shows the tier BELOW rather than the one above.
  const tier = galleryTier({ isPro: ready, signedIn: user != null })

  // The gate, before the data is produced rather than on a control.
  //
  // `browsable` is what this viewer may have; the Pro brand systems are not in
  // it at all, and neither is anything past this tier's cap. Everything
  // downstream — the filters, the search haystack, the grid — reads from
  // `browsable`, so a locked palette has no route to the page. That closes the
  // search oracle in particular: the haystack indexes each palette's hex
  // values, so filtering the FULL library would have let a signed-out visitor
  // confirm a locked brand's colours by typing them.
  //
  // The rows are handed in whole and in their own order (the bundle's list, with
  // stubs standing in for the withheld ones, or the server's full list). The cap
  // counts down THAT list, never the filtered one — the distinction is the whole of
  // the prompt-library defect this module was written after.
  const split = useMemo(() => (
    splitLockedLibrary(rows, {
      unlocked: ready,
      isOpen: LIBRARY_RULES.palettes.isOpen,
      preview: LIBRARY_RULES.palettes.preview,
      limit: galleryLimit(tier),
    })
  ), [rows, ready, tier])
  const { open: browsable, remaining: lockedCount, eligible } = split

  // Over the rows this viewer was handed, so a free viewer classifies ten and a
  // Pro viewer the lot. Every row in `browsable` is a full record (open rows are
  // never stubs), which is what the classifier and the haystack need.
  const { moodsById, haystacks } = useMemo(() => {
    const moods = new Map(browsable.map((palette) => [palette.id, classifyPalette(palette.colors)]))
    return {
      moodsById: moods,
      haystacks: new Map(browsable.map((palette) => [palette.id, paletteHaystack(palette, moods.get(palette.id))])),
    }
  }, [browsable])
  const cardMeta = useMemo(() => cardMetaFor(moodsById), [moodsById])

  const q = query.trim().toLowerCase()

  // COUNTED OVER THE WHOLE LIBRARY (utils/galleryCounts.js), not over `browsable`
  // alone. A collection or mood whose matches all sit behind the tier used to
  // read "0 palettes" with its own gated state; now S is what this viewer has, T
  // every match in the library, and the gate speaks for the difference. A row the
  // viewer cannot open is matched on public facets only (never its colours, never
  // a typed query against its hexes), so no count here is an oracle.
  const counts = useMemo(() => countGallery(rows, split, {
    matchOpen: (palette) => {
      if (group !== 'all' && palette.kind !== group) return false
      // One line for all eight moods, because there is no per-mood branching
      // left to get wrong: the classifier answers, the id indexes the answer.
      if (mood !== 'all' && !moodsById.get(palette.id)[mood]) return false
      if (q && !haystacks.get(palette.id).includes(q)) return false
      return true
    },
    matchPublic: palettePublicMatch({ group, mood, query: q }),
  }), [rows, split, group, mood, q, moodsById, haystacks])
  const visible = counts.open

  const brandCount = useMemo(() => visible.filter((p) => p.kind === 'brand').length, [visible])

  // Sections are for BROWSING. The moment a search or a category filter is
  // applied the user has already said which subset they want, and splitting
  // that answer back into headed groups — often one of them empty — buries it.
  // So a narrowed view is one flat grid, exactly as before.
  const browsing = group === 'all' && mood === 'all' && !query.trim()
  const grouped = useMemo(() => (
    browsing
      ? SECTIONS.map((section) => ({ ...section, palettes: visible.filter(section.match) }))
        .filter((section) => section.palettes.length > 0)
      : []
  ), [browsing, visible])

  // Resetting leaves focus in the search field, so the next keystroke starts a
  // new search instead of landing on a button that has just left the page.
  const root = useRef(null)
  const clear = () => {
    setQuery('')
    setGroup('all')
    setMood('all')
    root.current?.querySelector('.lbry-search input')?.focus()
  }

  // The results row names a CATEGORY only when the view actually IS that
  // category. This was the half of the sectioning work that never landed: the
  // shared head kept saying "Curated collection" after the sections went in
  // beneath it, which broke in two ways at once. It MIS-DESCRIBED the page —
  // browse mode shows curated AND brand, so the head named the first of two
  // groups as if it were the whole library — and it put a taxonomy eyebrow
  // roughly forty pixels above an <h3> that repeated it word for word, a motif
  // that reads as generated. Measured on the rendered page:
  // "CURATED COLLECTION / Colours worth building with / 71 palettes" sat
  // directly on top of "Curated collection / 64".
  //
  // The same untruth reached the flat views. A search or a mood filter matches
  // both kinds, so labelling those results "Curated collection" was false too —
  // it was simply less visible without a heading under it to disagree with.
  //
  // Splitting the tray in two makes this test SHARPER rather than harder. The
  // eyebrow keys off the COLLECTION group alone, and that group is now the only
  // thing that can narrow provenance: "Brand systems" over Brand+Warm is true
  // (every card really is a brand system), and no mood on its own can ever make
  // it say a collection name, because a mood does not touch `group`.
  //
  // Only the collection filter names the heading; moods span collections.
  const heading = group === 'brand' ? 'Brand palettes'
    : group === 'curated' ? 'Curated collection'
      : 'Colours worth building with'

  // The gate (components/library/LibraryGate) shows whenever the viewer is withheld
  // a match, under a collection, a mood or a search too: a narrower question that
  // the cap answers with "none" is exactly when the way on is wanted. Never while
  // a Pro library is on its way.
  const anonymous = tier === 'anonymous'
  const proPending = pro.active && !ready
  const proFailed = pro.status === 'error' || pro.status === 'refused'
  const gate = gateFor({ tier, counts, pending: proPending })
  // Where the viewer stands on the ladder, in words, for the close.
  const ladderLine = tierSentence({ tier, shown: browsable.length, total: rows.length, eligible, noun: 'palettes' })
  // What a free account opens in all; the gate names it, not the count on screen.
  const opens = freeOpens({ eligible })
  // What a filter leaves, as a noun, for the count line and the gate.
  const nounFilters = {
    collection: group !== 'all' ? group : null,
    mood: mood !== 'all' ? MOOD_LABELS[mood] : null,
    query,
  }
  const nounFor = (count) => filterNoun('palettes', nounFilters, count)

  // After a filter or a search the results change length. When the heading has
  // ended up under the sticky toolbar, put it back below it.
  const results = useRef(null)
  useResultsScroll(results, [group, mood, q])

  return (
    <div ref={root} className="sec lib-surface lib-v3 pgl-page">
      {/* The blurb names the library's size only for a Pro viewer whose full
          library has arrived or is arriving: when it failed to load, the number
          would promise what is not on screen. The number is derived rather than
          typed. */}
      <DiscoverGalleryHero
        title="Palette Library"
        description={`${isPro === true && !proFailed ? `${LIBRARY_TOTALS.palettes} palettes` : 'Palettes'}, named for the job they do. Open one and it lands in the builder with every stop editable.`}
      />

      <LibraryToolbar
        className="pgl-toolbar"
        sheetTitle="Mood"
        sheetClassName="lib-v3"
        quick={0}
        activeFilters={(group !== 'all' ? 1 : 0) + (mood !== 'all' ? 1 : 0)}
        search={{
          value: query,
          onChange: setQuery,
          // Short enough to show whole in the field at 390px; the field still
          // matches name, hex, colour and mood.
          placeholder: 'Search palettes',
          label: 'Search palettes',
        }}
        action={(
          <Link className="pgl-build-link ui-pill ui-pill-out" to="/create/palette">
            <span className="pgl-build-label">Create a palette</span>
            <span className="pgl-build-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </span>
          </Link>
        )}
      >
        <LibraryFilterGroup
          label="Filter palettes by collection"
          triggerLabel="Collection"
          value={group}
          onChange={setGroup}
          options={GROUP_FILTERS}
        />
        {/* A MENU, at every width, and that is measured rather than assumed —
            see the `alwaysCollapsed` note in LibraryFilterGroup. Nine options
            wrapped this toolbar to 314px on a 320px phone and to two rows at
            1280px. It also gives the two groups different shapes on purpose:
            the three-way provenance split is the page's primary control and
            stays a visible segmented row; mood is a facet with nine values, and
            a facet with nine values is a labelled control that opens a list —
            the pattern Relume, Deel and Vanta all use, and the one the collapsed
            form here was built for. The trigger states the current selection
            ("MOOD · Warm"), so nothing about the filter is hidden. */}
        <LibraryFilterGroup
          label="Filter palettes by mood"
          triggerLabel="Mood"
          value={mood}
          onChange={setMood}
          options={MOOD_FILTERS}
          alwaysCollapsed
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
      <section ref={results} className="lib-results" aria-labelledby="pgl-grid-heading">
        <DiscoverResultHead
          title={heading}
          // No count while a Pro library is on its way: the number of free rows
          // would be the wrong one. Otherwise S is what this viewer has and T the
          // whole library's matches, under every filter. Where the locked rows
          // cannot say whether they match (their stubs lack the facet) T is only
          // a floor, so it is left off, and with nothing shown the line goes.
          count={proPending || (counts.lockedUnknown && counts.S === 0) ? undefined : counts.S}
          total={counts.lockedUnknown ? undefined : counts.T}
          noun={nounFor(1)}
          nounPlural={nounFor(2)}
          id="pgl-grid-heading"
        />

        {/* A Pro viewer's library is loading or failed: the line sits directly
            under the heading it qualifies, with Retry beside it. */}
        {proPending && <ProLibraryStatus library={pro} noun="palette library" row />}

        {visible.length ? (
          <>
            {/* Every card is about a dozen tab stops, so a keyboard user gets a
                way past the lot. It reuses the site's skip link: out of view
                until focused, then shown at the top of the screen. */}
            <a className="skip-link" href="#pgl-after-grid">Skip past the palettes</a>
            {browsing ? (
              <>
                {grouped.map((section) => (
                  <div className="pgl-section" key={section.id}>
                    {/* Sticky, so the category you are inside stays legible while
                        you scroll a hundred cards — which is the whole point of
                        sectioning a list this long rather than filtering it. */}
                    <div className="pgl-section-head">
                      <h3 id={`pgl-section-${section.id}`}>{section.label}</h3>
                      <span className="pgl-section-count">{section.palettes.length} {section.palettes.length === 1 ? 'palette' : 'palettes'}</span>
                      <p className="pgl-section-blurb">{section.blurb}</p>
                    </div>
                    <PaletteGalleryGrid
                      toast={toast}
                      metaOf={cardMeta}
                      hexChips
                      palettes={section.palettes}
                      labelledBy={`pgl-section-${section.id}`}
                    />
                  </div>
                ))}
                <div id="pgl-after-grid" className="pgl-after" tabIndex={-1} />
              </>
            ) : (
              <>
                {brandCount > 0 && group !== 'brand' && (
                  <p className="pgl-note">
                    {brandCount} of these {brandCount === 1 ? 'is a' : 'are'} published brand
                    {brandCount === 1 ? ' system' : ' systems'}, badged <strong>Brand</strong> on the card.
                  </p>
                )}
                <PaletteGalleryGrid toast={toast} palettes={visible} metaOf={cardMeta} hexChips />
                <div id="pgl-after-grid" className="pgl-after" tabIndex={-1} />
              </>
            )}
          </>
        ) : proPending || counts.T > 0 || counts.lockedUnknown ? null : (
          // Shown only when the whole library holds no match: a match behind the
          // tier is the gate's to answer, never an empty state.
          <LibraryEmpty
            className="pgl-empty"
            title="No palettes match that combination."
            detail="Try a broader search, or reset the mood and collection filters."
            onClear={clear}
          />
        )}
      </section>

      {/* The tier gate, after the results and before the closing line, in every
          view: what you have, a glimpse of more, then how to get it. It stands
          after the section so it is there too when a filter leaves nothing open. */}
      <LibraryGate
        kind="palettes"
        id="pgl-gate-h"
        gate={gate}
        counts={counts}
        opens={opens}
        nounFor={nounFor}
        onSignup={() => requireLogin('browse more of the palette library', { free: true, signup: true })}
        onLogin={() => requireLogin('browse more of the palette library', { free: true })}
        onPlans={() => reportUpgradeGate('palette-library-tier-lock')}
      />

      {/* AFTER the grid, the locked tease and the empty state alike — last child
          of the page, which is what "at the very bottom" has to mean if it is to
          survive the branch above. Rendering it inside either arm would put it
          above the Pro tease in one and above nothing in the other.

          It leads to the Palette Builder and NOT to a staged submit intent, and
          that is a deliberate departure worth saying out loud. Every other
          submit entry point in the product sits where the thing being submitted
          already exists — the Builder's own Submit button, with a palette on
          the board. Staging `setSubmitIntent('palette')` here would fire
          PaletteBuilder's resume effect on arrival and open "Submit to
          community" over the default palette, asking the user to publish work
          they have not done yet. The gate is not skipped, it is kept where it
          belongs: the Builder's Submit button runs the same requireLogin flow
          09-auth-modal-accessibility covers, and the user reaches it having
          actually made something. */}
      {/* "create and submit your
          own" is for Pro viewers only; everyone else, at the end of a capped
          result, is offered more access instead. Where the locked tease is
          already on screen (every unsearched, mood-free view) it IS that offer,
          so the close does not repeat it. */}
      {proPending ? null : isPro === true ? (
        <GalleryCloseCta
          className="pgl-cta"
          detail="Build one in the Palette Builder, then submit it to the community from there."
          action="Create and submit your own"
          to="/create/palette"
        />
      ) : !gate && lockedCount > 0 ? (
        // A signed-out visitor's next step is the free account, with the same
        // numbers the wall states; a free account's next step is Pro.
        anonymous ? (
          <GalleryCloseCta
            className="pgl-cta"
            detail={ladderLine}
            action="Create your free account"
            onAction={() => requireLogin('browse more of the palette library', { free: true, signup: true })}
            busy={authLoading}
          />
        ) : (
          <GalleryCloseCta
            className="pgl-cta"
            detail={ladderLine}
            action="See what Pro includes"
            to="/plans"
          />
        )
      ) : null}
    </div>
  )
}

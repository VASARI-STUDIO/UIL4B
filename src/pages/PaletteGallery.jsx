import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PaletteGalleryGrid from '../components/discover/PaletteGalleryGrid'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import LibraryGrid from '../components/library/LibraryGrid'
import { LockedPaletteCard, LockedTeaseCta } from '../components/library/LockedTease'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { splitLockedLibrary, accountTierGain, galleryLimit, galleryTier } from '../utils/lockedPreview'
import { classifyPalette, MOOD_IDS, MOOD_LABELS } from '../utils/paletteMood'
import { paletteHaystack } from '../utils/paletteSearch'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/tool-shell.css'

// ── TWO QUESTIONS, TWO TRAYS ────────────────────────────────────────
//
// Founder request (2026-09-07): "for our pallete library lets include filters
// of neutral, and others" — all eight of Neutral, Warm, Cool, Pastel, Vivid,
// Dark, Light, Monochrome.
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
// Founder request (2026-08-08): "trending/popular first, then brand palettes,
// then community". Two of those three do not exist yet, and neither is faked:
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

// Moods are a pure function of static data, so classify once at module scope
// rather than on every keystroke — the library is ~100 palettes, the search
// input filters on every character, and classifyPalette runs CAM16 per swatch.
//
// The maths itself lives in utils/paletteMood.js, not here, for the reason the
// unit suite depends on: a classifier reachable only through a React page can
// only be checked through a browser, and the sweep that proves every one of the
// eight controls selects something has to be able to import it directly.
//
// NOTHING IS HAND-TAGGED. The key is the palette id; the ANSWER comes from the
// hexes alone. No `mood:` field exists on a palette and none should — a tag is
// written once and keeps its answer after an edit changes the colours under it.
const MOODS = new Map(LIBRARY_PALETTES.map((palette) => [palette.id, classifyPalette(palette.colors)]))
// Name, kind, hex — and the palette's moods and the hue name of every swatch
// (utils/paletteSearch.js). MEASURED on the live site at 1280 before this:
// "blue", "green", "warm" and "pastel" each returned 0 palettes while the
// Gradient Library answered all four. The moods were classified one line up
// and never indexed. The classification is handed in rather than re-run.
const HAYSTACKS = new Map(LIBRARY_PALETTES.map((palette) => [palette.id, paletteHaystack(palette, MOODS.get(palette.id))]))

export default function PaletteGallery({ toast }) {
  const [query, setQuery] = useState('')
  // Two independent axes. `group` is provenance, `mood` is what the colours
  // feel like, and they intersect — which is the point of splitting them.
  const [group, setGroup] = useState('all')
  const [mood, setMood] = useState('all')
  const { isPro } = useSubscription()
  const { user } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // Three rungs: anonymous → free account → Pro (utils/lockedPreview.js). Both
  // inputs must be an exact `true` to climb, so an entitlement or an auth state
  // that is still resolving shows the tier BELOW rather than the one above.
  const tier = galleryTier({ isPro, signedIn: user != null })

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
  // LIBRARY_PALETTES is handed in whole and in its own order. The cap counts
  // down THAT list, never the filtered one — the distinction is the whole of
  // the prompt-library defect this module was written after.
  const { open: browsable, locked: lockedPreviews, remaining: lockedCount, eligible } = useMemo(() => (
    splitLockedLibrary(LIBRARY_PALETTES, {
      unlocked: isPro === true,
      isOpen: (palette) => palette.pro !== true,
      preview: (palette) => ({ id: palette.id, label: palette.name, slots: palette.colors.length }),
      limit: galleryLimit(tier),
    })
  ), [isPro, tier])

  // How many more a free account opens. Zero above the anonymous rung.
  const accountAdds = accountTierGain({ tier, eligible, shown: browsable.length })

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return browsable.filter((palette) => {
      if (group === 'brand' && palette.kind !== 'brand') return false
      if (group === 'curated' && palette.kind !== 'curated') return false
      // One line for all eight moods, because there is no per-mood branching
      // left to get wrong: the classifier answers, the id indexes the answer.
      // The previous shape spelled out one comparison per mood inline, which is
      // how a threshold ends up living in a page instead of a module.
      if (mood !== 'all' && !MOODS.get(palette.id)[mood]) return false
      if (q && !HAYSTACKS.get(palette.id).includes(q)) return false
      return true
    })
  }, [browsable, group, mood, query])

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

  const clear = () => {
    setQuery('')
    setGroup('all')
    setMood('all')
  }

  // The results row names a CATEGORY only when the view actually IS that
  // category. This was the half of the sectioning work that never landed: the
  // shared head kept saying "Curated collection" after the sections went in
  // beneath it, which broke in two ways at once. It MIS-DESCRIBED the page —
  // browse mode shows curated AND brand, so the head named the first of two
  // groups as if it were the whole library — and it put a taxonomy eyebrow
  // roughly forty pixels above an <h3> that repeated it word for word, which is
  // the exact motif the founder marked "AI" on the Font Gallery masthead and
  // that #391 was meant to have finished off. Measured on the rendered page:
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
  // Shape follows CuratedResources.jsx, the other Discover library that browses
  // in bands and narrows to a flat list: when it bands, its eyebrow is a claim
  // about scope ("Hand-picked, not scraped") precisely so it cannot restate the
  // band headings; when it narrows, it names what was matched.
  const eyebrow = group === 'brand' ? 'Brand systems'
    : group === 'curated' ? 'Curated collection'
      : browsing ? 'Everything you can browse'
        : 'Across both collections'

  // The teased tail of the library: on the Pro rung's near side, three
  // placeholders and one wall. Three is the gallery's desktop column count, so
  // the tease reads as the next ROW of the collection rather than as a stub —
  // see LOCKED_TEASE.
  //
  // Shown only while the view is unnarrowed. Under a search or a mood filter
  // the user has asked a narrower question, and answering it with a paywall
  // would be an interruption rather than an offer.
  //
  // ── WHY A SIGNED-OUT VISITOR GETS THE WALL AND NO PLACEHOLDERS ────────────
  //
  // LockedPaletteCard stamps every placeholder "Pro". For a signed-in free
  // viewer that is true — the next rows really are the paid ones. For a
  // signed-out visitor it is NOT: the next seven arrive with a free account
  // that costs nothing, so three cards reading "Pro" would price them wrong on
  // the one screen where the offer is being made. The pill is inside
  // components/library/LockedTease.jsx and is not this stream's file, so rather
  // than mislabel the rows, the anonymous rung ships the wall alone and states
  // the two numbers. If that card ever takes a tier-aware label, the
  // placeholders belong here too — see the report note.
  const anonymous = tier === 'anonymous'
  const lockedBlock = lockedCount > 0 ? (
    anonymous ? (
      // Same shape and the same stylesheet as LockedTeaseCta, with the one
      // difference that makes it a different rung: the action opens the app's
      // own sign-in gate (LoginPromptContext, `free: true` — a free account, not
      // a purchase) instead of the Pro modal. Nothing here is a second gate;
      // the data was already withheld above.
      <div className="lockt-cta">
        <div className="lockt-cta-copy">
          <p className="lockt-cta-head">{`Another ${accountAdds} ${accountAdds === 1 ? 'palette' : 'palettes'} with a free account`}</p>
          <p className="lockt-cta-body">{`A free account opens ${browsable.length + accountAdds} of the ${LIBRARY_PALETTES.length} palettes. Pro opens all ${LIBRARY_PALETTES.length}.`}</p>
        </div>
        <button
          type="button"
          className="btn btn-accent lockt-cta-btn"
          onClick={() => requireLogin('browse more of the palette library', { free: true, signup: true })}
        >
          Create your free account
        </button>
      </div>
    ) : (
      <>
        {/* NOT aria-hidden as a group. The placeholder SHAPES are hidden inside
            the card, but a palette's name is a real fact and the whole tease, so
            a screen-reader user hears "Figma · Pro" exactly as a sighted one
            reads it. Nothing announced here is invented, because the card holds
            no values to invent. */}
        {/* The locked grid names itself too. A screen-reader user meets three
            more cards after the free ones and needs to know why they differ;
            without a name this is an unexplained second grid. */}
        <h4 className="sr-only" id="pgl-locked-more">Palettes included with Pro</h4>
        <LibraryGrid className="pgal-grid" labelledBy="pgl-locked-more">
          {lockedPreviews.map((preview) => <LockedPaletteCard key={preview.id} preview={preview} />)}
        </LibraryGrid>
        <LockedTeaseCta
          gate="palette-library-brand-lock"
          heading={`Another ${lockedCount} ${lockedCount === 1 ? 'palette' : 'palettes'} with Pro`}
          body={`Free covers ${browsable.length} of the ${LIBRARY_PALETTES.length}. Pro opens the remaining ${lockedCount}, including every brand system.`}
          action="See what Pro includes"
          modal={{
            eyebrow: 'Pro colour tools',
            title: 'The full brand library',
            subtitle: `Free covers ${browsable.length} of the ${LIBRARY_PALETTES.length} palettes. Pro opens the remaining ${lockedCount}, and a brand system applies the brand’s whole colour system rather than its swatches alone.`,
          }}
        />
      </>
    )
  ) : null

  return (
    <div className="sec pgl-page">
      {/* NO `description` (founder decision, 2026-09-13). The sentence that sat
          here — "Colour systems with a point of view … make it yours." — was the
          same template line the Gradient Library ran, word for word in its second
          half, and it is why both pages scored 7 on purpose-and-content: a
          sentence written to fit any catalogue describes none of them. It is
          deleted rather than replaced; the founder owns the replacement if one is
          wanted, and the /discover card already says what this library holds.
          The masthead no longer opens a hole when the copy is short — see the
          height note above .dgh-hero in global.css. */}
      <DiscoverGalleryHero title="Palette Library" />

      <LibraryToolbar
        className="pgl-toolbar"
        search={{
          value: query,
          onChange: setQuery,
          // Says what the field now matches. The Gradient Library's reads
          // "by name, hex or mood"; this one also has the hue names.
          placeholder: 'Search by name, hex, colour or mood…',
          label: 'Search palettes',
        }}
        action={<Link className="pgl-build-link" to="/create/palette">Create a palette <span aria-hidden="true">↗</span></Link>}
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
      <section aria-labelledby="pgl-grid-heading">
        <DiscoverResultHead
          eyebrow={eyebrow}
          title={group === 'brand' ? 'Identities you already know' : 'Colours worth building with'}
          count={visible.length}
          noun="palette"
          id="pgl-grid-heading"
        />

        {visible.length ? (
          <>
            {browsing ? (
              <>
                {grouped.map((section) => (
                  <div className="pgl-section" key={section.id}>
                    {/* Sticky, so the category you are inside stays legible while
                        you scroll a hundred cards — which is the whole point of
                        sectioning a list this long rather than filtering it. */}
                    <div className="pgl-section-head">
                      <h3 id={`pgl-section-${section.id}`}>{section.label}</h3>
                      <span className="pgl-section-count">{section.palettes.length}</span>
                      <p className="pgl-section-blurb">{section.blurb}</p>
                    </div>
                    <PaletteGalleryGrid
                      toast={toast}
                      palettes={section.palettes}
                      labelledBy={`pgl-section-${section.id}`}
                    />
                  </div>
                ))}
                {/* AFTER the sections, not inside the last one. It used to hang
                    off the Brand systems group, because the only locked rows
                    were brands and that group was always rendered. Under the
                    tier cap neither is true: the withheld tail starts in
                    whichever group the cap fell in, and a group with nothing
                    open is not rendered at all — so a wall nested in it would
                    vanish exactly when it is the only thing left to say. */}
                {lockedBlock}
              </>
            ) : (
              <>
                {brandCount > 0 && group !== 'brand' && (
                  <p className="pgl-note">
                    {brandCount} of these {brandCount === 1 ? 'is a' : 'are'} published brand
                    {brandCount === 1 ? ' system' : ' systems'}, badged <strong>Brand</strong> on the card.
                  </p>
                )}
                <PaletteGalleryGrid toast={toast} palettes={visible} />
                {/* `mood === 'all'` is now written out. It used to be implied — one
                    tray meant picking Dark cleared Brand — and with two trays
                    the rule two comments above ("under a search or a mood filter
                    the user has asked a narrower question") has to be stated or
                    it silently stops being true. */}
                {mood === 'all' && !query.trim() && lockedBlock}
              </>
            )}
          </>
        ) : (
          <>
            <LibraryEmpty
              className="pgl-empty"
              title="No palettes match that combination."
              detail="Try a broader search, or reset the mood and collection filters."
              onClear={clear}
            />
            {/* A collection can now be empty because the cap fell before it —
                pick Brand signed out and every brand system is still withheld.
                The empty state alone would read as "there are none", which is
                false, so the wall stays and says how many there are. */}
            {mood === 'all' && !query.trim() && lockedBlock}
          </>
        )}
      </section>

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
      <GalleryCloseCta
        className="pgl-cta"
        detail="Build one in the Palette Builder — then submit it to the community from there."
        action="Create and submit your own"
        to="/create/palette"
      />
    </div>
  )
}

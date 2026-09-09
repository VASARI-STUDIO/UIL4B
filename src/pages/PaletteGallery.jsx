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
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { splitLockedLibrary } from '../utils/lockedPreview'
import { classifyPalette, MOOD_IDS, MOOD_LABELS } from '../utils/paletteMood'
import { LIBRARY_PALETTES } from '../data/paletteLibrary'

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
const HAYSTACKS = new Map(LIBRARY_PALETTES.map((palette) => [
  palette.id,
  `${palette.name} ${palette.kind === 'brand' ? 'brand system' : 'curated'} ${palette.colors.join(' ')}`.toLowerCase(),
]))

export default function PaletteGallery({ toast }) {
  const [query, setQuery] = useState('')
  // Two independent axes. `group` is provenance, `mood` is what the colours
  // feel like, and they intersect — which is the point of splitting them.
  const [group, setGroup] = useState('all')
  const [mood, setMood] = useState('all')
  const { isPro } = useSubscription()

  // The gate, before the data is produced rather than on a control.
  //
  // `browsable` is what this viewer may have; the Pro brand systems are not in
  // it at all. Everything downstream — the filters, the search haystack, the
  // grid — reads from `browsable`, so a locked palette has no route to the
  // page. That closes the search oracle in particular: the haystack indexes
  // each palette's hex values, so filtering the FULL library would have let a
  // signed-out visitor confirm a locked brand's colours by typing them.
  const { open: browsable, locked: lockedBrands, remaining: lockedCount } = useMemo(() => (
    splitLockedLibrary(LIBRARY_PALETTES, {
      unlocked: isPro === true,
      isOpen: (palette) => palette.pro !== true,
      preview: (palette) => ({ id: palette.id, label: palette.name, slots: palette.colors.length }),
    })
  ), [isPro])

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

  // The teased tail of the Brand systems group: three placeholders, then one
  // wall. Three is the gallery's desktop column count, so the tease reads as
  // the next ROW of the collection rather than as a stub — see LOCKED_TEASE.
  //
  // Shown only where the brand group is shown whole. Under a search or a mood
  // filter the user has asked a narrower question, and answering it with a
  // paywall would be an interruption rather than an offer.
  const lockedBlock = lockedCount > 0 ? (
    <>
      {/* NOT aria-hidden as a group. The placeholder SHAPES are hidden inside
          the card, but a brand's name is a real fact and the whole tease, so a
          screen-reader user hears "Figma · Pro" exactly as a sighted one reads
          it. Nothing announced here is invented, because the card holds no
          values to invent. */}
      {/* The locked grid names itself too. A screen-reader user meets three
          more cards after the free ones and needs to know why they differ;
          without a name this is an unexplained second grid. */}
      <h4 className="sr-only" id="pgl-locked-brands">Brand systems included with Pro</h4>
      <LibraryGrid className="pgal-grid" labelledBy="pgl-locked-brands">
        {lockedBrands.map((preview) => <LockedPaletteCard key={preview.id} preview={preview} />)}
      </LibraryGrid>
      <LockedTeaseCta
        gate="palette-library-brand-lock"
        heading={`Another ${lockedCount} brand ${lockedCount === 1 ? 'system' : 'systems'} with Pro`}
        body="Each one loads the brand’s whole colour system into the Palette Builder — its harmony and its roles, not only the five swatches."
        action="See what Pro includes"
        modal={{
          eyebrow: 'Pro colour tools',
          title: 'The full brand library',
          subtitle: `Free covers ${LIBRARY_PALETTES.length - lockedCount} palettes including a handful of starter brands. Pro opens the remaining ${lockedCount}, and each one applies the brand’s whole colour system rather than its swatches alone.`,
        }}
      />
    </>
  ) : null

  return (
    <div className="sec pgl-page">
      {/* No description under the title — anti-slop audit, 2026-09-09. It read
          "Colour systems with a point of view — ours, plus the published brand
          palettes behind the interfaces you already know. Copy a swatch, save a
          favourite, or open the complete palette in the builder and make it
          yours." — the Gradient Library's sentence with the nouns swapped, and
          every action it listed is a control on the cards. The collection
          filter under it already names the two sets. */}
      <DiscoverGalleryHero title="Palette Library" />

      <LibraryToolbar
        className="pgl-toolbar"
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Search by name or hex…',
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

      <DiscoverResultHead
        eyebrow={eyebrow}
        title={group === 'brand' ? 'Identities you already know' : 'Colours worth building with'}
        count={visible.length}
        noun="palette"
        id="pgl-grid-heading"
      />

      {visible.length ? (
        <section aria-labelledby="pgl-grid-heading">
          {browsing ? (
            grouped.map((section) => (
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
                {section.id === 'brand' && lockedBlock}
              </div>
            ))
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
              {group === 'brand' && mood === 'all' && !query.trim() && lockedBlock}
            </>
          )}
        </section>
      ) : (
        <LibraryEmpty
          className="pgl-empty"
          title="No palettes match that combination."
          detail="Try a broader search, or reset the mood and collection filters."
          onClear={clear}
        />
      )}

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

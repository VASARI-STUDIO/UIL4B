import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import DiscoverResultHead from '../components/discover/DiscoverResultHead'
import CategoryGlyph from '../components/discover/CategoryGlyph'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
import { DISCOVER_RESOURCES } from '../data/discoverResources'
import { FILTER_CATEGORIES, CATEGORY_MAP } from '../data/discoverCategories'
import { primaryAvailableTool, buildToolHandoffUrl } from '../components/discover/discoverUtils'

// /discover/resources — the Curated Resources library.
//
// THE PROMISE WAS ALREADY IN THE NAV AND THE PAGE DID NOT EXIST. toolTree.js
// has advertised `{ id: 'curated', label: 'Curated Resources', route:
// '/discover', soon: true }` for months, and src/data/discoverResources.js has
// held 22 hand-written, curated resources the whole time — the founder's own
// bookmarks, each with a reason and a hand-off into the tool that finishes the
// job. #196 deleted the Discover shell that used to render them as "dead
// pages"; the DATA survived and nothing has imported it since. This page is
// that data given its home, not a new invention.
//
// ── Why rows and not a card grid ───────────────────────────────────────────
//
// A curated set is SMALL BY DESIGN — 22 items across seven categories, three
// or four each — and it has to look deliberate at that size, because it starts
// nearly empty and grows one hand-picked entry at a time.
//
// Mobbin, "AI in Design Report 2026" → Relevant posts & resources: five
// external links as hairline-ruled rows, each a title over a bare hostname
// with a ↗. Five rows read as an edited shortlist. Five cards in a four-up
// grid read as a grid that failed to fill. Webflow's rule-separated category
// index is the same answer at a larger size. This repo has already reached it
// once: #font-gallery-one-per-row took the Font Gallery's rows off cards and
// onto hairline rules, because "on a full-width row a card is chrome around
// type that is itself the content".
//
// The card grid was the OTHER option and it is the one to avoid. Patreon's and
// Kit's resource directories both work, and both work because every tile
// carries a real product logo. We cannot: DiscoverCard.jsx generates a
// monogram from the title hash instead, deliberately — we never fetch an
// external URL (that would be an SSRF surface on a user-supplied link). A grid
// of generated letter-tiles is decoration standing in for hierarchy, which is
// the exact pattern the founder has named as slop. So DiscoverCard is NOT used
// here; see the report for the recommendation to retire it.
//
// ── Why each category band has a lead item ─────────────────────────────────
//
// Upwork's Resource Centre gives its featured item real size before dropping
// into a list. Applied per CATEGORY rather than once per page, that buys the
// pacing a flat list cannot have — one resource per category is opened up
// (its `whyUseful` reasoning, its use-case and difficulty, its real palette if
// it has one, its hand-off as a button), and the rest are compact rows beneath
// it. The band varies internally, so seven bands are not seven identical
// blocks, and NOTHING IS DUPLICATED: the lead is a member of its category, not
// a copy promoted into a separate featured rail.
//
// The lead is chosen from the data (`featured: true`, the staff picks the
// founder marked) and falls back to the first item, so a category he adds
// later with nothing marked still renders correctly.
//
// ── What is deliberately NOT here ──────────────────────────────────────────
//
// No save counts, no view counts, no "trending". There are no users yet, so
// every such number would be zero or invented — the homepage community strip
// was just fixed for printing "0 saves" on every card. When there is a count
// worth showing there will be a backend to source it from.

// Filter options are built once at module scope — a fresh array identity every
// keystroke would re-measure LibraryFilterGroup's sliding indicator.
const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All' },
  ...FILTER_CATEGORIES.map(c => ({ id: c.key, label: c.label })),
]

// Display order for the bands. Driven by the category table rather than by the
// order resources happen to appear in, so adding a resource cannot reorder the
// page.
const BAND_ORDER = FILTER_CATEGORIES.map(c => c.key)

function ExternalArrow() {
  return <span className="cur-ext" aria-hidden="true">&#8599;</span>
}

// Every external link in one place: the third-party convention this app already
// uses in AppFooter, DiscoverCard and CommunityCard — noopener/noreferrer to
// close the opener channel, nofollow because a curated outbound link is not an
// endorsement we want to pass ranking through, plus a visible arrow and an
// sr-only phrase (the arrow is decorative, so it cannot carry the meaning).
function ResourceLink({ resource, className }) {
  return (
    <a
      className={className}
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {resource.title}
      <ExternalArrow />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

// The real sample swatches a palette resource carries in its own record. Shown
// ONLY where `palette` exists (3 of 22): a swatch strip under a resource that
// has no colours to show would be decoration pretending to be content.
function PaletteStrip({ colors }) {
  return (
    <span className="cur-pal" aria-hidden="true">
      {colors.map(hex => (
        <span key={hex} className="cur-pal-chip" style={{ background: hex }} />
      ))}
    </span>
  )
}

// The in-product hand-off — the spine of Discover. `primaryAvailableTool`
// returns the first related tool that is NOT `soon`, so a resource whose only
// destination has not shipped renders no button at all rather than a CTA that
// dead-ends on the Coming Soon screen. Nine of the 22 are in that state today
// (everything pointing at Component Designer or Box Shadow); that is a
// curation fact, and the page shows it honestly by staying quiet.
function ToolHandoff({ resource, compact }) {
  const tool = primaryAvailableTool(resource)
  if (!tool) return null
  return (
    <Link
      className={compact ? 'cur-go' : 'btn btn-s'}
      to={buildToolHandoffUrl(tool)}
    >
      Open in {tool.label}
      <span aria-hidden="true">&nbsp;&rarr;</span>
    </Link>
  )
}

function PriceTag({ free }) {
  return (
    <span className={`cur-tag${free ? '' : ' cur-tag--paid'}`}>
      {free ? 'Free' : 'Paid'}
    </span>
  )
}

// The opened-up item at the head of a category band.
function LeadResource({ resource }) {
  return (
    <article className="cur-lead">
      <div className="cur-lead-head">
        <h4 className="cur-lead-title">
          <ResourceLink resource={resource} className="cur-link" />
        </h4>
        <PriceTag free={resource.free} />
      </div>
      <p className="cur-host">{resource.host}</p>
      {Array.isArray(resource.palette) && resource.palette.length > 0 && (
        <PaletteStrip colors={resource.palette} />
      )}
      <p className="cur-why">{resource.whyUseful}</p>
      <div className="cur-lead-foot">
        <ToolHandoff resource={resource} />
        <span className="cur-chips">
          {resource.useCase && <span className="cur-chip">{resource.useCase}</span>}
          {resource.difficulty && <span className="cur-chip">{resource.difficulty}</span>}
        </span>
      </div>
    </article>
  )
}

// The compact hairline row — the shape the whole list takes when filtering.
function ResourceRow({ resource }) {
  return (
    <li className="cur-row">
      <div className="cur-row-main">
        <h4 className="cur-row-title">
          <ResourceLink resource={resource} className="cur-link" />
          <PriceTag free={resource.free} />
        </h4>
        <p className="cur-row-desc">{resource.shortDescription}</p>
        {Array.isArray(resource.palette) && resource.palette.length > 0 && (
          <PaletteStrip colors={resource.palette} />
        )}
      </div>
      <div className="cur-row-aside">
        <span className="cur-host">{resource.host}</span>
        <ToolHandoff resource={resource} compact />
      </div>
    </li>
  )
}

export default function CuratedResources() {
  const [rawQuery, setRawQuery] = useState('')
  const [category, setCategory] = useState('all')

  const query = rawQuery.trim().toLowerCase()
  const filtering = query !== '' || category !== 'all'

  const visible = useMemo(() => DISCOVER_RESOURCES.filter((r) => {
    if (category !== 'all' && r.category !== category) return false
    if (query) {
      const hay = `${r.title} ${r.host} ${r.shortDescription} ${r.useCase || ''} ${(r.tags || []).join(' ')}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  }), [query, category])

  // Bands are only built for the unfiltered view. A filtered result is a
  // RESULT LIST — one uniform shape, easiest to scan — so it deliberately drops
  // the lead treatment rather than re-promoting an item inside three matches.
  const bands = useMemo(() => {
    if (filtering) return []
    return BAND_ORDER.map((key) => {
      const items = DISCOVER_RESOURCES.filter(r => r.category === key)
      if (items.length === 0) return null
      const lead = items.find(r => r.featured) || items[0]
      return { key, lead, rest: items.filter(r => r !== lead) }
    }).filter(Boolean)
  }, [filtering])

  const clearAll = () => { setRawQuery(''); setCategory('all') }

  return (
    <div className="sec cur-wrap">
      <DiscoverGalleryHero
        title="Curated Resources"
        description="Hand-picked tools from outside UI L4B that are genuinely worth a tab — each one with the reason it earned its place, and a way straight into the UI L4B tool that finishes the job."
        action={(
          <Link className="btn" to="/feedback">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
            Suggest a resource
          </Link>
        )}
      />

      <LibraryToolbar
        className="cur-toolbar"
        search={{
          value: rawQuery,
          onChange: setRawQuery,
          placeholder: 'Search resources by name, site or what it is for…',
          label: 'Search curated resources',
        }}
      >
        <LibraryFilterGroup
          label="Filter by resource category"
          triggerLabel="Category"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
        />
      </LibraryToolbar>

      {filtering ? (
        <>
          <DiscoverResultHead
            eyebrow="Curated resources"
            title="Matching resources"
            count={visible.length}
            noun="resource"
            id="cur-results-heading"
          />
          {visible.length > 0 ? (
            <section aria-labelledby="cur-results-heading">
              <ul className="cur-list">
                {visible.map(r => <ResourceRow key={r.id} resource={r} />)}
              </ul>
            </section>
          ) : (
            <LibraryEmpty
              className="cur-empty"
              title={`No resources match ${query ? `“${rawQuery.trim()}”` : 'that category'}.`}
              detail="This is a small, hand-picked list rather than a search engine — try a broader word, or clear the filters to read all of them."
              onClear={clearAll}
            />
          )}
        </>
      ) : (
        <>
          <DiscoverResultHead
            eyebrow="Hand-picked, not scraped"
            title="Everything worth a tab"
            count={DISCOVER_RESOURCES.length}
            noun="resource"
            id="cur-bands-heading"
          />
          <div className="cur-bands" aria-labelledby="cur-bands-heading">
            {bands.map(({ key, lead, rest }) => {
              const cat = CATEGORY_MAP[key]
              return (
                <section className="cur-band" key={key} data-cat={key} aria-labelledby={`cur-band-${key}`}>
                  <div className="cur-band-head">
                    <span className="cur-band-glyph" aria-hidden="true">
                      <CategoryGlyph category={key} size={16} />
                    </span>
                    <h3 className="cur-band-title" id={`cur-band-${key}`}>{cat?.label || key}</h3>
                    <span className="cur-band-count">{rest.length + 1}</span>
                  </div>
                  <LeadResource resource={lead} />
                  {rest.length > 0 && (
                    <ul className="cur-list">
                      {rest.map(r => <ResourceRow key={r.id} resource={r} />)}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}

      {/* The closing line, below the last resource in either view.

          THIS GALLERY IS THE ONE WITH NO SUBMISSION SURFACE, and the CTA says
          so rather than pretending otherwise. `SUBMIT_SURFACES` in
          utils/submitIntent.js is exactly ['community','gradient','palette',
          'prompt'] — there is no resource queue, no review path and no
          moderation route for a link somebody sends in. What DOES exist is the
          route this page's own masthead already uses for the same job: the
          feedback form, behind the "Suggest a resource" button at the top. The
          closing CTA leads to the same place, so the page answers the question
          the same way at both ends, and the wording drops "submit" because
          nothing is submitted — a human reads it and decides. */}
      <GalleryCloseCta
        className="cur-cta"
        detail="This is a hand-picked list, not a search index. Send us the tool you were hoping to find and we will look at it."
        action="Suggest a resource"
        to="/feedback"
      />
    </div>
  )
}

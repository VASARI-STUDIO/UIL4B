import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { COMMUNITY_PROMPTS } from '../data/communityPrompts'
import { TAG_CATEGORIES } from '../data/promptCategories'
import { getPrompts, setPromptsStore, getSavedIds, setSavedIdsStore, parseTags } from '../utils/promptStore'
import { splitLockedLibrary, accountTierGain, galleryLimit, galleryTier } from '../utils/lockedPreview'
import { LockedPromptCard, LockedTeaseCta } from '../components/library/LockedTease'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import LibraryToolbar from '../components/library/LibraryToolbar'
import LibraryFilterGroup from '../components/library/LibraryFilterGroup'
import LibraryEmpty from '../components/library/LibraryEmpty'
import PromptCard from '../components/prompt/PromptCard'
import PromptModal from '../components/prompt/PromptModal'
import AddPromptPanel from '../components/prompt/AddPromptPanel'
import SubmitPromptPanel from '../components/prompt/SubmitPromptPanel'
import GalleryCloseCta from '../components/discover/GalleryCloseCta'
// The stylesheet families this surface needs, split out of the one
// render-blocking global sheet (see src/styles/deferred/). They ride this
// route's own lazy chunk, so they arrive with it and never with the homepage.
import '../styles/deferred/colour.css'
import '../styles/deferred/library.css'
import '../styles/deferred/tool-shell.css'
// This page's own sheet — every selector rooted at `.plib-page`.
import '../styles/pages/prompt-library.css'

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'prompt'

// Filter options for the shared LibraryFilterGroup trays. Module scope: they
// derive from static data, and rebuilding them per render would hand the group
// a new array identity every keystroke and re-measure the sliding indicator —
// the same reason the Gradient Library hoists its own (GradientGallery.jsx).
const SORT_OPTIONS = [
  { id: 'popular', label: 'Popular' },
  { id: 'new', label: 'Newest' },
]

// `activeCategory` is null for "no filter" but a filter tray needs a real id
// for its reset option, so 'all' is the wire value and null is the state. The
// two are mapped at the boundary rather than changing the filter predicate.
const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All' },
  ...TAG_CATEGORIES.map(cat => ({ id: cat.label, label: cat.label })),
]

export default function PromptLibrary({ onCopy, toast }) {
  const { t } = useI18n()
  const { user, userProfile, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // Stable primitive so the gate effect doesn't re-run on every AuthContext render.
  const uid = user?.uid || null
  const { isPro } = useSubscription()
  const [prompts, setPrompts] = useState(getPrompts)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [modalPrompt, setModalPrompt] = useState(null)
  const [savedIds, setSavedIds] = useState(getSavedIds)
  const [communitySort, setCommunitySort] = useState('popular') // 'popular' | 'new'
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('vs-prompt-tab') === 'my' ? 'my' : 'community' }
    catch { return 'community' }
  })

  useEffect(() => {
    try { localStorage.setItem('vs-prompt-tab', tab) } catch { /* ignore */ }
  }, [tab])

  // Persist a freshly-created personal prompt (built by AddPromptPanel).
  const addPrompt = useCallback((prompt) => {
    setPrompts(prev => {
      const updated = [prompt, ...prev]
      setPromptsStore(updated)
      return updated
    })
    toast(t('promptLibrary.promptSaved'))
  }, [toast, t])

  const saveCommunityPrompt = useCallback((cp) => {
    if (savedIds.has(cp.id)) { toast('Already in your library'); return }
    const prompt = {
      id: Date.now(),
      title: cp.title,
      text: cp.text,
      tags: cp.tags,
      img: cp.img || '',
      date: new Date().toLocaleDateString('en-AU'),
    }
    setPrompts(prev => {
      const updated = [prompt, ...prev]
      setPromptsStore(updated)
      return updated
    })
    const newSaved = new Set(savedIds)
    newSaved.add(cp.id)
    setSavedIds(newSaved)
    setSavedIdsStore(newSaved)
    toast('Saved to your library')
  }, [savedIds, toast])

  const remove = useCallback((e, id) => {
    e.stopPropagation()
    setPrompts(prev => {
      const updated = prev.filter(p => p.id !== id)
      setPromptsStore(updated)
      return updated
    })
    setModalPrompt(null)
    toast(t('promptLibrary.promptDeleted'))
  }, [toast, t])

  const copyPrompt = useCallback((e, txt) => {
    e.stopPropagation()
    onCopy(txt)
  }, [onCopy])

  const switchTab = (next) => { setTab(next); setActiveCategory(null); setSearch('') }

  // The one way out of a filtered-to-nothing grid. Named rather than inlined
  // because the empty state and any future toolbar reset must clear the SAME
  // pair of controls — a reset that clears the search but leaves the category
  // set is the half-escape that sends a user back round the loop.
  const clearFilters = useCallback(() => { setSearch(''); setActiveCategory(null) }, [])

  // Community submission gate. The panel is only ever mounted for a signed-in
  // user, so a signed-out visitor is asked to sign in first instead of typing a
  // prompt they cannot post. Auth still resolving = neither answer is known, so
  // the trigger waits rather than flashing the wrong prompt. For a signed-in
  // user this is exactly the old toggle.
  // The single place the submission panel is opened. Both the gate below and the
  // post-sign-in resume go through it, so there is exactly one path to a form.
  const openSubmitPanel = useCallback(() => {
    consumeSubmitIntent()
    setSubmitOpen(true)
  }, [])

  const openSubmit = useCallback(async () => {
    if (authLoading) return
    if (submitOpen) { setSubmitOpen(false); return }
    if (!uid) {
      setSubmitIntent(SUBMIT_SURFACE)
      const signedIn = await requireLogin('submit a prompt to the community', {
        free: true,
        reasons: COMMUNITY_SUBMIT_REASONS,
      })
      if (!signedIn) { resetSubmitIntent(); return }
    }
    openSubmitPanel()
  }, [authLoading, submitOpen, uid, requireLogin, openSubmitPanel])

  // Resume the intent when signing in remounted this surface. In-memory only —
  // a full page reload finds nothing and the page opens normally.
  useEffect(() => {
    if (authLoading || !uid) return
    if (!hasSubmitIntent(SUBMIT_SURFACE)) return
    openSubmitPanel()
  }, [authLoading, uid, openSubmitPanel])

  // ── The closing CTA reaches the SAME trigger, from the other end of the page ─
  //
  // The submission panel mounts near the masthead. The closing CTA is the last
  // thing on a page of a hundred cards, so a user who presses it and is left
  // where they are has pressed a button that did nothing they can see — the
  // panel opened several thousand pixels above them.
  //
  // So the CTA scrolls to what it opened. A ref FLAG rather than a timer or a
  // rAF after the await: `openSubmit` awaits the sign-in prompt, and there is no
  // fixed delay after which React is guaranteed to have committed the panel.
  // Keying the scroll off `submitOpen` waits for the actual mount instead of
  // guessing at one, and the flag keeps the masthead's own Submit button —
  // which is already on screen — from scrolling the page out from under itself.
  const submitPanelRef = useRef(null)
  const scrollToPanel = useRef(false)
  useEffect(() => {
    if (!submitOpen || !scrollToPanel.current) return
    scrollToPanel.current = false
    submitPanelRef.current?.scrollIntoView({ block: 'center' })
  }, [submitOpen])

  // A plain function, not useCallback: it closes over `switchTab`, which the
  // page rebuilds every render, so memoising would either hold a stale one or
  // memoise nothing. Nothing downstream is memoised on this prop either.
  const openSubmitFromClose = async () => {
    scrollToPanel.current = true
    // The panel only mounts on the community tab, so the CTA has to put the
    // page on it. `switchTab` rather than a bare setTab: it is the page's own
    // tab contract (it clears the search and category too), and a My-Prompts
    // filter left applied to the community list is a view nobody chose.
    if (tab !== 'community') switchTab('community')
    await openSubmit()
  }

  const isCommunity = tab === 'community'

  // Anonymous → free account → Pro. `uid` rather than `user` so the rung does
  // not change identity on every AuthContext render, and an exact null check
  // rather than a truthy one: while auth is resolving there is no account, so
  // the page shows the rung BELOW and climbs when the answer arrives.
  const tier = galleryTier({ isPro, signedIn: uid !== null })

  // The gate, applied BEFORE search and sort can reach the data.
  //
  // It used to be positional — the grid locked every card past the twelfth of
  // the FILTERED list — so "free" meant the first twelve of whatever view you
  // had built, and the search box built the view. Typing a phrase that only a
  // locked prompt contained brought it back at index 0, unlocked. All twenty
  // were reachable that way, and the sort control did the same thing more
  // slowly.
  //
  // `browsable` is what this viewer may have. A locked prompt is not in it, so
  // it has no route to the page: not the grid, not the modal, and not the
  // search predicate, which reads `p.text` and would otherwise answer "does a
  // locked prompt contain this phrase" for anyone who asked.
  //
  // `unlocked` is `isPro === true` and nothing looser: a subscription still
  // resolving is not a subscription. See utils/lockedPreview for why a preview
  // can never carry the payload.
  //
  // ── THE SORT MOVED BELOW THE GATE, AND IT HAD TO ──────────────────────────
  //
  // This call used to be handed `sortedCommunity` — the library AFTER the Sort
  // control had reordered it. With a flag-only gate that was harmless, because
  // the answer did not depend on position. The tier cap does depend on
  // position, so feeding it a sorted list would have rebuilt the original
  // defect in a new place: flipping Sort to Newest would reverse the array,
  // hand the cap a different first three, and a visitor could collect six
  // prompts out of a three-prompt allowance by toggling one control.
  //
  // So COMMUNITY_PROMPTS goes in, in the order the data file declares, and the
  // OPEN set is sorted afterwards. Which prompts are free is now a property of
  // the library; the order they are shown in is the reader's choice, and the
  // two can no longer reach each other.
  const { open: openCommunity, locked: lockedPrompts, remaining: lockedCount, eligible } = useMemo(() => (
    splitLockedLibrary(COMMUNITY_PROMPTS, {
      unlocked: isPro === true,
      isOpen: (p) => p.free === true,
      // No label. A brand palette's name is the tease and its hexes are the
      // product; a prompt is the opposite — the TITLE is the idea being sold,
      // so it stays behind the gate with the text. Tags are already the
      // library's public filter facet, so they may show.
      //
      // `slots` is a fixed 3 rather than a measurement. On a palette it is the
      // swatch count, a real fact about the row; a prompt has no count worth
      // publishing, and deriving one from the text length would leak the size
      // of what is being withheld. Three lines is the card's shape, not data.
      preview: (p) => ({ id: p.id, tags: parseTags(p.tags).slice(0, 2), slots: 3 }),
      // The rung's cap, over the canonical list above. A prompt that fails the
      // `free` flag is still locked at every rung below Pro, so the cap narrows
      // the free tier and can never widen it.
      limit: galleryLimit(tier),
    })
  ), [isPro, tier])

  // Display order, chosen by the reader, applied to what the gate already
  // opened. Nothing here can move a prompt across the gate.
  const browsableCommunity = useMemo(() => {
    const list = [...openCommunity]
    if (communitySort === 'new') return list.reverse()
    return list.sort((a, b) => (b.saves || 0) - (a.saves || 0))
  }, [openCommunity, communitySort])

  const accountAdds = accountTierGain({ tier, eligible, shown: openCommunity.length })

  const sourceList = isCommunity ? browsableCommunity : prompts

  const q = search.toLowerCase()
  const activeTags = activeCategory ? TAG_CATEGORIES.find(c => c.label === activeCategory)?.tags || [] : []

  // Only while browsing the whole community library, and only when something
  // is actually locked. `lockedCount` is 0 for a Pro viewer, so the block
  // disappears for them without a second condition.
  const lockedBlockVisible = isCommunity && lockedCount > 0 && !q.trim() && !activeCategory

  const filtered = sourceList.filter(p => {
    if (activeCategory) {
      const pTags = parseTags(p.tags)
      if (!pTags.some(tag => activeTags.includes(tag))) return false
    }
    if (!q) return true
    return p.text.toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q)
  })

  return (
    <div className="sec lib-surface plib-page">
      {/* The shared Discover masthead, same as the Palette, Gradient, Icon and
          Emoji libraries. This surface was the last one still on the site-wide
          `.sec-h`, where the eyebrow was rendered from the SAME i18n key as the
          h1 — so every locale printed the page title twice, which reads as
          unfinished rather than as a choice. The eyebrow is a taxonomy path
          here, matching its siblings.

          `mark` is the library's SIZE, not the filtered count: the galleries
          pass their total for the same reason — it is a decorative, aria-hidden
          statistic about the collection, and a number that moved on every
          keystroke would be neither. */}
      <DiscoverGalleryHero
        title={t('promptLibrary.title')}
        description={t('promptLibrary.subtitle')}
        action={isCommunity ? (
          <button
            className="btn pl-add-btn"
            onClick={openSubmit}
            disabled={authLoading}
            aria-busy={authLoading || undefined}
            aria-expanded={submitOpen}
            title={authLoading ? 'Checking your account…' : 'Submit a prompt to the community'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Submit prompt
          </button>
        ) : (
          <button className="btn btn-accent pl-add-btn" onClick={() => setAddOpen(!addOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('promptLibrary.addPrompt')}
          </button>
        )}
      />

      {/* Tab switcher */}
      <div className="pl-tabs">
        <button type="button" className={`pl-tab${tab === 'my' ? ' active' : ''}`} aria-pressed={tab === 'my'} onClick={() => switchTab('my')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          My Prompts
          {prompts.length > 0 && <span className="pl-tab-count">{prompts.length}</span>}
        </button>
        <button type="button" className={`pl-tab${tab === 'community' ? ' active' : ''}`} aria-pressed={tab === 'community'} onClick={() => switchTab('community')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Community
          {/* The number of prompts THIS TAB WILL SHOW, not the size of the
              library behind it. Its sibling counts the prompts you have, so a
              badge reading 20 over a grid of three would be the one number on
              the page that disagrees with the page. How many are withheld is
              the wall's job, and the wall states it exactly. */}
          <span className="pl-tab-count">{browsableCommunity.length}</span>
        </button>
      </div>

      {/* Toolbar — the shared Library control block, as used by the Palette,
          Gradient, Icon, Emoji and Font surfaces. This page ran the one-off
          `.pl-toolbar` with outlined `.pl-chip` pills, which meant the tablet
          band fix in #318 (the tray collapses to a menu between 641 and 980px)
          reached every browse surface EXCEPT this one — measured 172px of
          sticky chrome at both 641 and 834px against 80px at 1280, with the
          sort pills stranded hard-right on the first line and the categories
          on a second.

          Sort is a filter group rather than its own control for the same
          reason the Font Gallery's is: it asks "which subset, in which order?"
          in the one idiom, instead of adding a second visual language to a row
          that already has one.

          The primary action lives in the HERO, not here. The shared masthead is
          430px tall, and with the action in the toolbar underneath it the
          "Submit prompt" CTA left the viewport entirely at 320x800 — caught by
          21-reflow-320, which has guarded that exact button since it was found
          off screen horizontally in the 2026-08-11 audit. The sibling galleries
          already put their primary action in the hero, so this is the shared
          shape rather than a workaround. */}
      <LibraryToolbar
        className="pl-lbry-toolbar"
        quick={1}
        activeFilters={isCommunity ? (communitySort !== 'popular' ? 1 : 0) + (activeCategory ? 1 : 0) : 0}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: isCommunity ? 'Search community prompts…' : t('promptLibrary.searchPlaceholder'),
          label: isCommunity ? 'Search community prompts' : 'Search your prompts',
        }}
      >
        {/* An ARRAY, not a fragment: LibraryToolbar reads its groups with
            Children.toArray, which flattens arrays and does not flatten
            fragments, and it needs to see two groups to keep the category
            chips on a phone's quick row and put the sort in the sheet. */}
        {isCommunity && [
            <LibraryFilterGroup
              key="sort"
              label="Sort community prompts"
              triggerLabel="Sort"
              value={communitySort}
              onChange={setCommunitySort}
              options={SORT_OPTIONS}
            />,
            <LibraryFilterGroup
              key="category"
              label="Filter prompts by category"
              triggerLabel="Category"
              value={activeCategory || 'all'}
              onChange={(id) => setActiveCategory(id === 'all' ? null : id)}
              options={CATEGORY_OPTIONS}
            />,
        ]}
      </LibraryToolbar>

      {/* Add prompt panel (slide-down) — only for My Prompts */}
      {!isCommunity && (
        <AddPromptPanel open={addOpen} onClose={() => setAddOpen(false)} onAdd={addPrompt} toast={toast} t={t} />
      )}

      {/* Submit to community panel — signed-in only; see openSubmit above. */}
      {isCommunity && submitOpen && uid && (
        <div ref={submitPanelRef}>
          <SubmitPromptPanel onClose={() => setSubmitOpen(false)} user={user} userProfile={userProfile} toast={toast} />
        </div>
      )}

      {/* THE RESULTS WERE THE ONE REGION ON THIS PAGE THAT NAMED NOTHING, and
          the count they turn on was announced nowhere.

          Its three sibling libraries — Palette, Gradient and Curated Resources
          — all render DiscoverResultHead, which is a labelled <section> plus an
          aria-live count. This page was the only one of the four without
          either: the grid was a bare <div className="pl-gallery">, so a reader
          navigating by landmark found the masthead and the closing CTA and
          nothing naming the thing the page is for, and filtering from 20 to 0
          changed the screen while saying nothing.

          It does NOT adopt DiscoverResultHead, deliberately. That component
          renders a VISIBLE eyebrow and h2, and the titles its siblings pass
          ("Colours worth building with") are exactly the marketing lines the
          re-score flagged as the founder's to write. Adding a visible heading
          here would be a design change and a copy decision inside an
          accessibility fix.

          So this uses the pattern THIS PAGE already established forty lines
          below, where the locked grid names itself with an sr-only h2: nothing
          moves on screen, and the region, its name and its count all exist for
          anyone reading the outline. The name is the tab the visitor is
          standing in — their own choice, already rendered as the tab's label —
          and the count is counted. No sentence was written. */}
      <section aria-labelledby="pl-results-heading">
        <h2 className="sr-only" id="pl-results-heading">
          {isCommunity ? 'Community' : 'My Prompts'}
        </h2>
        <p className="sr-only" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'prompt' : 'prompts'}
        </p>
      {filtered.length > 0 ? (
        <div className="pl-gallery">
          {filtered.map((p) => (
            <PromptCard
              key={p.id}
              p={p}
              onOpen={setModalPrompt}
              isCommunity={isCommunity}
              isSaved={savedIds.has(p.id)}
            />
          ))}
        </div>
      ) : (
        isCommunity ? (
          /* The shared Library empty state, as used by the Palette, Gradient,
             Font and Curated Resources galleries. This page was the last one
             still rendering its own: a <p> with no control and no role, so the
             grid emptying was announced to nobody and the only way back was to
             work out by hand which of the search, sort and category controls
             was still set. Both halves are LibraryEmpty's stated job. */
          <LibraryEmpty
            className="pl-empty"
            title="No prompts match your search"
            onClear={clearFilters}
          />
        ) : (
          <div className="pl-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
            <p>{t('promptLibrary.noPrompts')}</p>
            <button className="btn btn-accent" onClick={() => setAddOpen(true)}>{t('promptLibrary.addPrompt')}</button>
          </div>
        )
      )}
      </section>

      {/* The teased tail of the community library: three placeholders, then one
          wall. Shown only while BROWSING — under a search or a category filter
          the user has asked a narrower question, and answering it with a
          paywall is an interruption rather than an offer (same rule as the
          Palette Library).

          It is also why the empty state stays "No prompts match your search"
          and does not say how many locked prompts DID match. That sentence
          would be the search oracle rebuilt in words: it answers "does a Pro
          prompt contain my phrase" for anyone willing to type. */}
      {lockedBlockVisible && (
        tier === 'anonymous' ? (
          /* The anonymous rung gets the wall and no placeholders.
             LockedPromptCard stamps each one "Pro", and for a signed-out
             visitor that is the wrong price: the next seven arrive with a free
             account. The pill lives in components/library/LockedTease.jsx,
             which this stream does not own, so the rows are left out rather
             than mislabelled — see the note in PaletteGallery.jsx. The action
             is the app's own sign-in gate with `free: true`, the same one the
             Submit button above uses, so this is a rung and not a second gate. */
          <div className="lockt-cta">
            <div className="lockt-cta-copy">
              <p className="lockt-cta-head">{`Another ${accountAdds} community ${accountAdds === 1 ? 'prompt' : 'prompts'} with a free account`}</p>
              <p className="lockt-cta-body">{`A free account opens ${browsableCommunity.length + accountAdds} of the ${COMMUNITY_PROMPTS.length} community prompts. Pro opens all ${COMMUNITY_PROMPTS.length}.`}</p>
            </div>
            <button
              type="button"
              className="btn btn-accent lockt-cta-btn"
              onClick={() => requireLogin('browse more of the community prompts', { free: true, signup: true })}
            >
              Create your free account
            </button>
          </div>
        ) : (
          <>
            {/* The locked grid names itself. A screen-reader user meets three more
                cards after the free ones and needs to know why they differ. The
                placeholder SHAPES are hidden inside the card; nothing announced
                here is invented, because the card holds nothing to invent. */}
            {/* h2, not h3: this labels a top-level region of the page, and the
                only other landmark heading here (the closing CTA) is an h2. As an
                h3 it made the page read h1 -> h3 -> h2 to anyone navigating by
                heading level. */}
            <h2 className="sr-only" id="pl-locked-community">Community prompts included with Pro</h2>
            <div className="pl-gallery pl-gallery--continues" role="group" aria-labelledby="pl-locked-community">
              {lockedPrompts.map((preview) => <LockedPromptCard key={preview.id} preview={preview} gate="prompt-library-locked-card" />)}
            </div>
            <LockedTeaseCta
              gate="prompt-library-community-lock"
              heading={`Another ${lockedCount} community ${lockedCount === 1 ? 'prompt' : 'prompts'} with Pro`}
              body="Each one opens as the complete brief its author wrote — the full prompt text to copy, not a preview of it."
              action="See what Pro includes"
            />
          </>
        )
      )}

      {/* The closing line, below the last card and below the Pro tease. The
          prompt submission entry is ON this page rather than behind a route, so
          the CTA calls it directly — which means a signed-out visitor meets
          exactly the requireLogin gate the masthead's Submit button uses, with
          the same COMMUNITY_SUBMIT_REASONS, because it IS that code path and
          not a second copy of it. */}
      {/* "create and submit your
          own" is for Pro viewers only; everyone else is offered more access
          instead, except where the locked tease above already is that offer. */}
      {isPro === true ? (
        <GalleryCloseCta
          className="pl-cta"
          detail="Write one and submit it to the community library — every submission is reviewed before it appears."
          action="Create and submit your own"
          onAction={openSubmitFromClose}
          busy={authLoading}
        />
      ) : !lockedBlockVisible && lockedCount > 0 ? (
        <GalleryCloseCta
          className="pl-cta"
          detail={`Free covers ${openCommunity.length} of the ${COMMUNITY_PROMPTS.length} community prompts. Pro opens all of them.`}
          action="See what Pro includes"
          to="/plans"
        />
      ) : null}

      {/* Detail Modal */}
      {modalPrompt && (
        <PromptModal
          prompt={modalPrompt}
          onClose={() => setModalPrompt(null)}
          onCopy={copyPrompt}
          onSave={saveCommunityPrompt}
          onRemove={remove}
          isCommunity={isCommunity}
          isSaved={savedIds.has(modalPrompt.id)}
        />
      )}
    </div>
  )
}

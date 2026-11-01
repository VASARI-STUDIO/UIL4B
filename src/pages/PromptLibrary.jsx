import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { reportUpgradeGate } from '../contexts/ProModalContext'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { COMMUNITY_PROMPT_ROWS } from '../data/communityPrompts'
import { LIBRARY_RULES, isStub } from '../utils/libraryRules'
import { useProLibrary } from '../hooks/useProLibrary'
import ProLibraryStatus from '../components/library/ProLibraryStatus'
import { TAG_CATEGORIES } from '../data/promptCategories'
import { getLenis } from '../hooks/useSmoothScroll'
import { getPrompts, setPromptsStore, getSavedIds, removeStoredPrompt, readPromptLibrary, toggleStoredCommunitySave, undoStoredUnsave, PROMPT_STORE_KEYS } from '../utils/promptStore'
import { onAccountApplied } from '../utils/accountEvents'
import { splitLockedLibrary, galleryLimit, galleryTier } from '../utils/lockedPreview'
import DiscoverGalleryHero from '../components/discover/DiscoverGalleryHero'
import LibraryEmpty from '../components/library/LibraryEmpty'
import PromptCard from '../components/prompt/PromptCard'
import PromptLockedCard from '../components/prompt/PromptLockedCard'
import PromptOverview from '../components/prompt/PromptOverview'
import PromptFilters from '../components/prompt/PromptFilters'
import { categoryBySlug, categoryMembers, countLine } from '../components/prompt/promptGallery'
import PromptModal from '../components/prompt/PromptModal'
import AddPromptPanel from '../components/prompt/AddPromptPanel'
import SubmitPromptPanel from '../components/prompt/SubmitPromptPanel'
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

// The list state lives in the URL hash: `#website` is that category's list and
// `#all` is every prompt. No hash is the overview. The router's hash landing
// looks for an element with this id and finds none, so it does not scroll.
const ALL_SLUG = 'all'

// Move the page to an element the way the rest of the app does: through Lenis
// when it owns the scroll, otherwise natively with `behavior: 'auto'`, which
// follows the stylesheet (smooth, or instant under reduced motion).
function scrollToElement(el, block = 'start') {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const top = block === 'center'
    ? window.scrollY + rect.top - (window.innerHeight - rect.height) / 2
    : window.scrollY + rect.top - margin
  const y = Math.max(0, Math.round(top))
  const lenis = getLenis()
  if (lenis) {
    // Lenis clamps to the page height it last measured, and it re-measures on a
    // delay. Right after the list swaps for the overview that height is still
    // the list's, so a section lower down would stop short. Measure now.
    lenis.resize()
    lenis.scrollTo(y)
  }
  else window.scrollTo({ top: y, behavior: 'auto' })
}

// A section has two View more buttons and only one is displayed at a given
// width, so focus goes to the one that is.
const firstVisible = (nodes) => [...nodes].find((el) => el.offsetParent !== null) || null

export default function PromptLibrary({ onCopy, toast }) {
  const { t } = useI18n()
  const { user, userProfile, loading: authLoading } = useAuth()
  const { requireLogin } = useLoginPrompt()
  // Stable primitive so the gate effect doesn't re-run on every AuthContext render.
  const uid = user?.uid || null
  // A Pro account's full community set comes from the server
  // (src/utils/proLibrary.js); the bundle holds the free prompts and tag-only
  // stubs. Until it arrives a Pro viewer sees the free prompts and a status
  // line, never the upsell.
  const pro = useProLibrary('prompts')
  const ready = pro.status === 'ready'
  const proPending = pro.active && !ready
  const communityRows = pro.items ?? COMMUNITY_PROMPT_ROWS
  // Whole prompts only: a stub has no title or text to match a saved copy on.
  const communityCatalog = useMemo(() => communityRows.filter((p) => !isStub(p)), [communityRows])
  const [prompts, setPrompts] = useState(getPrompts)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [modalPrompt, setModalPrompt] = useState(null)
  const [savedIds, setSavedIds] = useState(getSavedIds)
  const [communitySort, setCommunitySort] = useState('popular') // 'popular' | 'new'
  const [access, setAccess] = useState('all') // 'all' | 'free' | 'pro'
  // The list state is the URL hash, so the browser's Back button is "back to the
  // overview" and a list can be linked to. Entering a list from the overview is
  // a push; switching chips inside it replaces, so Back is one step either way.
  const location = useLocation()
  const navigate = useNavigate()
  const hashSlug = (() => {
    try { return decodeURIComponent(location.hash.slice(1)) } catch { return location.hash.slice(1) }
  })()
  const listCat = hashSlug === ALL_SLUG ? null : categoryBySlug(hashSlug)
  const hashIsList = hashSlug === ALL_SLUG || listCat !== null

  const [savedTab, setTab] = useState(() => {
    if (hashIsList) return 'community'
    try { return localStorage.getItem('vs-prompt-tab') === 'my' ? 'my' : 'community' }
    catch { return 'community' }
  })

  // A list is a Community view, so arriving at one (a link, the browser's Back)
  // puts the page on Community. That happens once per list, when the address
  // CHANGES to it. Forcing it on every render would undo "My Prompts" clicked
  // from inside a list: the tab is set before the router has dropped the hash.
  // The stored choice is written only by `switchTab`, so a shared link never
  // overwrites it.
  const listKey = hashIsList ? hashSlug : null
  const [seenList, setSeenList] = useState(listKey)
  if (listKey !== seenList) {
    setSeenList(listKey)
    if (listKey && savedTab !== 'community') setTab('community')
  }
  const tab = hashIsList ? 'community' : savedTab

  // ── The overview and the list ─────────────────────────────────────────────
  // Persist a freshly-created personal prompt (built by AddPromptPanel).
  const addPrompt = useCallback((prompt) => {
    const updated = [prompt, ...getPrompts()]
    setPromptsStore(updated)
    setPrompts(updated)
    toast(t('promptLibrary.promptSaved'))
  }, [toast, t])

  // The library and the saved set are account-bound. When the account writes
  // a newer copy into storage (another device, a sign-in), read it again, so
  // this page never shows, or writes back, a set that is out of date. The
  // library copy of a prompt unsaved elsewhere is pruned on the way in, since
  // the two keys can arrive separately. It runs on mount too: an update can
  // land while the page is closed.
  useEffect(() => {
    const refresh = () => {
      const next = readPromptLibrary()
      setPrompts(next.prompts)
      setSavedIds(next.savedIds)
    }
    refresh()
    const onStorage = (e) => { if (!e.key || PROMPT_STORE_KEYS.includes(e.key)) refresh() }
    window.addEventListener('storage', onStorage)
    const off = onAccountApplied(PROMPT_STORE_KEYS, refresh)
    return () => { window.removeEventListener('storage', onStorage); off() }
  }, [])

  // Save is a toggle, the same on the card and in the modal. Saving adds the
  // saved id and a copy in My Prompts; saving again removes both and offers
  // Undo. The store is read fresh inside the toggle (utils/promptStore).
  // Signed out, a press asks to sign in first and saves once it succeeds.
  const toggleCommunitySave = useCallback(async (cp) => {
    if (!await requireLogin('save prompts', { free: true, signup: true })) return
    const result = toggleStoredCommunitySave(cp)
    setPrompts(result.prompts)
    setSavedIds(result.savedIds)
    if (result.saved) { toast('Saved to your library'); return }
    const undo = result.undo
    toast(
      result.edited ? 'Removed from your library, including your edits' : 'Removed from your library',
      'success',
      {
        action: {
          label: 'Undo',
          onAction: () => {
            const back = undoStoredUnsave(undo)
            setPrompts(back.prompts)
            setSavedIds(back.savedIds)
          },
        },
      },
    )
  }, [requireLogin, toast])

  const closeModal = useCallback(() => setModalPrompt(null), [])

  const remove = useCallback((e, id) => {
    e.stopPropagation()
    // Deleting the copy a community Save made also clears that Save (found by
    // `sourceId`, or by title and text for an older copy), so the community
    // card does not read "Saved" and the repair does not add the copy back.
    const result = removeStoredPrompt(id, { catalog: communityCatalog })
    setPrompts(result.prompts)
    setSavedIds(result.savedIds)
    setModalPrompt(null)
    toast(t('promptLibrary.promptDeleted'))
  }, [toast, t, communityCatalog])

  const copyPrompt = useCallback((e, txt) => {
    e.stopPropagation()
    onCopy(txt)
  }, [onCopy])

  // A tab switch leaves any list behind: the hash is dropped (replace, so Back
  // does not return to a list of the other tab) and the filters reset.
  const switchTab = (next) => {
    setTab(next)
    try { localStorage.setItem('vs-prompt-tab', next) } catch { /* ignore */ }
    setSearch('')
    setAccess('all')
    setCommunitySort('popular')
    if (hashIsList) navigate({ hash: '' }, { replace: true })
  }

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
  const tier = galleryTier({ isPro: ready, signedIn: uid !== null })

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
  // `unlocked` is the server's full set having arrived and nothing looser: a subscription still
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
  // So the rows go in, in the order the data declares, and the
  // OPEN set is sorted afterwards. Which prompts are free is now a property of
  // the library; the order they are shown in is the reader's choice, and the
  // two can no longer reach each other.
  const { open: openCommunity, remaining: lockedCount } = useMemo(() => (
    splitLockedLibrary(communityRows, {
      unlocked: ready,
      isOpen: LIBRARY_RULES.prompts.isOpen,
      // No label. A brand palette's name is the tease and its hexes are the
      // product; a prompt is the opposite — the TITLE is the idea being sold,
      // so it stays behind the gate with the text. Tags are already the
      // library's public filter facet, so they may show.
      //
      // `slots` is a fixed 3 rather than a measurement. On a palette it is the
      // swatch count, a real fact about the row; a prompt has no count worth
      // publishing, and deriving one from the text length would leak the size
      // of what is being withheld. Three lines is the card's shape, not data.
      preview: LIBRARY_RULES.prompts.preview,
      // The rung's cap, over the canonical list above. A prompt that fails the
      // `free` flag is still locked at every rung below Pro, so the cap narrows
      // the free tier and can never widen it.
      limit: galleryLimit(tier),
    })
  ), [communityRows, ready, tier])

  const openIds = useMemo(() => new Set(openCommunity.map((p) => p.id)), [openCommunity])

  // "Free" in the Access control means what a free account opens: the first
  // `free` rung's worth of the rows the flag allows, in canonical order. Taken
  // from the library, not from a view of it, so no control can change it.
  const freeIds = useMemo(() => {
    const flagged = communityRows.filter((p) => LIBRARY_RULES.prompts.isOpen(p) === true)
    return new Set(flagged.slice(0, galleryLimit('free')).map((p) => p.id))
  }, [communityRows])
  const byAccess = useCallback((items) => (
    access === 'free' ? items.filter((p) => freeIds.has(p.id))
      : access === 'pro' ? items.filter((p) => !freeIds.has(p.id))
        : items
  ), [access, freeIds])

  // ── Which state the page is in ────────────────────────────────────────────
  // The list is the hash on the Community tab; My Prompts has no overview.
  const inList = isCommunity && hashIsList
  const cat = inList ? listCat : null
  const q = search.trim().toLowerCase()

  // Each chip says how many prompts it returns under the current Access.
  const chips = useMemo(() => ({
    all: byAccess(communityRows).length,
    categories: TAG_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, count: byAccess(categoryMembers(c, communityRows)).length })),
  }), [byAccess, communityRows])

  // The list: this category's primary prompts and tag matches, narrowed by Access,
  // then split by the gate. Open ones are searched and sorted; locked ones are
  // drawn from their tags alone and never read by the search.
  const listItems = useMemo(() => {
    if (!inList) return { open: [], locked: [] }
    const base = byAccess(cat ? categoryMembers(cat, communityRows) : communityRows)
    let open = base.filter((p) => openIds.has(p.id))
    const locked = base.filter((p) => !openIds.has(p.id))
    if (q) {
      open = open.filter((p) => (p.text || '').toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q))
    }
    open = communitySort === 'new' ? [...open].reverse() : [...open].sort((a, b) => (b.saves || 0) - (a.saves || 0))
    return { open, locked: q || proPending ? [] : locked }
  }, [inList, byAccess, cat, communityRows, openIds, q, communitySort, proPending])

  const filtered = useMemo(() => {
    if (isCommunity) return listItems.open
    return prompts.filter((p) => !q || (p.text || '').toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q))
  }, [isCommunity, listItems, prompts, q])
  const listCount = listItems.open.length + listItems.locked.length

  // ── Moving between the overview and the list ─────────────────────────────
  // `entry` remembers how the list was reached, so "Back to overview" can step
  // back through history when the overview is what is behind it, and replace
  // when the visitor landed on a linked list.
  const entry = useRef({ fromOverview: false, focusResults: false })

  const openList = useCallback((slug, { focusResults = true } = {}) => {
    entry.current = { fromOverview: true, focusResults }
    navigate({ hash: `#${slug}` })
  }, [navigate])
  const chooseCategory = useCallback((slug) => {
    navigate({ hash: `#${slug || ALL_SLUG}` }, { replace: true })
  }, [navigate])
  const backToOverview = useCallback(() => {
    if (entry.current.fromOverview) navigate(-1)
    else navigate({ hash: '' }, { replace: true })
  }, [navigate])

  // Typing a search enters the list, as View more does. Only the first
  // keystroke navigates; after that the list is already the state.
  const onSearch = useCallback((value) => {
    setSearch(value)
    if (isCommunity && !hashIsList && value.trim()) openList(ALL_SLUG, { focusResults: false })
  }, [isCommunity, hashIsList, openList])

  // One reset for every way out of a list, including the browser's Back
  // button: the filters belong to the list, so the overview starts clean.
  const [wasList, setWasList] = useState(inList)
  if (wasList !== inList) {
    setWasList(inList)
    if (!inList) { setSearch(''); setAccess('all'); setCommunitySort('popular') }
  }

  // The one way out of a filtered-to-nothing list. The empty state and the
  // toolbar must clear the SAME controls: a reset that clears the search but
  // leaves Access narrowed is the half-escape that sends a user round the loop.
  const clearFilters = useCallback(() => {
    setSearch('')
    setAccess('all')
    if (isCommunity && hashIsList) navigate({ hash: `#${ALL_SLUG}` }, { replace: true })
  }, [isCommunity, hashIsList, navigate])

  // Land the visitor where they were going. Entering a list from a button
  // puts the controls at the top and the heading under the screen reader's
  // cursor; leaving it puts focus on the View more of the section of the last
  // list shown (or on Browse all after the all-prompts list), scrolled into
  // view, so Back never means "top of the page".
  const resultsHeadRef = useRef(null)
  const listSlugRef = useRef(null)
  const wasListRef = useRef(false)
  useEffect(() => {
    const was = wasListRef.current
    wasListRef.current = inList
    if (inList) listSlugRef.current = listCat ? listCat.slug : ALL_SLUG
    if (!was && inList) {
      const { focusResults } = entry.current
      entry.current = { ...entry.current, focusResults: false }
      if (focusResults) {
        scrollToElement(document.getElementById('pl-toolbar'))
        resultsHeadRef.current?.focus({ preventScroll: true })
      }
    } else if (was && !inList) {
      entry.current = { fromOverview: false, focusResults: false }
      if (!isCommunity) return
      const slug = listSlugRef.current
      const section = slug && slug !== ALL_SLUG ? document.getElementById(`pl-shelf-${slug}`) : null
      const target = (section && firstVisible(section.querySelectorAll('.pl-viewmore')))
        || document.getElementById('pl-browse-all')
      if (target) {
        target.focus({ preventScroll: true })
        // The section's top, unless the button then sits below the screen (a
        // phone's View more is under the whole shelf, and the first shelf is
        // taller than the screen): then the button is what is centred.
        let toSection = !!section
        if (section) {
          const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0
          const reach = target.getBoundingClientRect().bottom - (section.getBoundingClientRect().top - margin)
          toSection = reach <= window.innerHeight - 16
        }
        scrollToElement(toSection ? section : target, toSection ? 'start' : 'center')
      }
    }
  }, [inList, listCat, isCommunity])

  const filtersProp = inList ? {
    categories: chips.categories,
    allCount: chips.all,
    activeSlug: cat ? cat.slug : null,
    onCategory: chooseCategory,
    sort: communitySort,
    onSort: setCommunitySort,
    access,
    onAccess: setAccess,
    resultCount: listCount,
    activeCount: (communitySort !== 'popular' ? 1 : 0) + (access !== 'all' ? 1 : 0),
  } : null

  // The list's heading and the count line under it.
  const catLabel = cat ? cat.label : null
  const listTitle = q
    ? `Results for “${search.trim()}”${catLabel ? ` in ${catLabel}` : ''}`
    : (catLabel || 'All prompts')
  const listCountLine = q
    ? `${filtered.length} ${filtered.length === 1 ? 'prompt matches' : 'prompts match'}`
    : countLine([...listItems.open, ...listItems.locked], (p) => openIds.has(p.id), tier !== 'pro')
  const signupFree = useCallback(() => {
    requireLogin('browse more of the community prompts', { free: true, signup: true })
  }, [requireLogin])
  const lockedKind = (p) => (tier === 'anonymous' && freeIds.has(p.id) ? 'account' : 'pro')

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
              the page that disagrees with the page. While anything is
              withheld, neither number is the right one, so the badge stands
              down: how many are withheld is the wall's job, and the wall
              states it exactly. */}
          {lockedCount === 0 && <span className="pl-tab-count">{openCommunity.length}</span>}
        </button>
      </div>

      {/* Search always; the filters only in the list state. Not sticky, and the
          primary action lives in the HERO, not here, as on the sibling
          galleries: under the masthead it would leave the viewport at
          320x800 (guarded by 21-reflow-320). The label stays "Search
          community prompts" for assistive tech; the placeholder is short so
          it fits a phone. */}
      <PromptFilters
        search={{
          value: search,
          onChange: onSearch,
          label: isCommunity ? 'Search community prompts' : 'Search your prompts',
        }}
        filters={filtersProp}
      />

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

      {/* The overview is the Community tab's default: one section per category.
          Everything else (a category, Browse all, a search, My Prompts) is the
          list below. */}
      {isCommunity && !inList ? (
        <PromptOverview
          rows={communityRows}
          openRows={openCommunity}
          tier={tier}
          proPending={proPending}
          loadingStatus={<ProLibraryStatus library={pro} noun="community prompt library" />}
          savedIds={savedIds}
          onOpen={setModalPrompt}
          onToggleSave={toggleCommunitySave}
          onViewMore={openList}
          onBrowseAll={() => openList(ALL_SLUG)}
          onSignup={signupFree}
          onSubmit={openSubmitFromClose}
        />
      ) : (
        <section aria-labelledby={inList ? 'pl-results-h' : 'pl-results-heading'}>
          {inList ? (
            <div className="pl-results-head">
              <button type="button" className="btn pl-ov-btn pl-back" onClick={backToOverview}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Back to overview
              </button>
              <h2 id="pl-results-h" ref={resultsHeadRef} tabIndex={-1}>{listTitle}</h2>
              <p className="pl-shelf-count">{listCountLine}</p>
              {/* Search reads only the prompts this viewer can open, so a
                  locked prompt can never be found by a phrase from its text;
                  the list says so rather than leaving a short result unexplained. */}
              {q && tier !== 'pro' && <p className="pl-note">{`Search covers the ${openCommunity.length} prompts open to you.`}</p>}
            </div>
          ) : (
            <h2 className="sr-only" id="pl-results-heading">My Prompts</h2>
          )}
          {inList && <ProLibraryStatus library={pro} noun="community prompt library" />}
          <p className="sr-only" aria-live="polite">
            {inList ? listCount : filtered.length} {(inList ? listCount : filtered.length) === 1 ? 'prompt' : 'prompts'}
          </p>
          {(inList ? listCount : filtered.length) > 0 ? (
            <div className="pl-gallery">
              {(inList ? listItems.open : filtered).map((p) => (
                <PromptCard
                  key={p.id}
                  p={p}
                  onOpen={setModalPrompt}
                  isCommunity={isCommunity}
                  isSaved={savedIds.has(p.id)}
                  onToggleSave={isCommunity ? toggleCommunitySave : undefined}
                />
              ))}
              {/* What this viewer cannot open: the real output, blurred, a lock
                  and the tags. Never the title or the text. */}
              {inList && listItems.locked.map((p) => (
                <PromptLockedCard
                  key={p.id}
                  preview={{ id: p.id, tags: LIBRARY_RULES.prompts.preview(p).tags }}
                  kind={lockedKind(p)}
                  variant="list"
                  onSignup={signupFree}
                />
              ))}
            </div>
          ) : (
            isCommunity ? (
              /* LibraryEmpty announces empty results and lets visitors clear filters.
                 While a Pro library is on its way the status block above speaks
                 instead: the full set may well match. */
              proPending ? null : (
                <LibraryEmpty
                  className="pl-empty"
                  title="No prompts match your search"
                  detail="Try a shorter word, or clear the search and filters to see every prompt."
                  clearLabel="Clear search and filters"
                  onClear={clearFilters}
                />
              )
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
      )}

      {/* The offer under a list: what the locked cards above open with, or the
          way to add one's own. A search or an empty list gets none: the visitor
          has asked a narrower question, and answering it with a paywall is an
          interruption (and would say how many locked prompts matched). */}
      {inList && !proPending && !q && (
        tier === 'pro' ? (
          <section className="pl-close" aria-labelledby="pl-wall-h">
            <div className="pl-close-text">
              <h2 id="pl-wall-h">Submit a prompt of your own</h2>
              <p>Every submission is reviewed before it appears in the library.</p>
            </div>
            <div className="pl-close-actions">
              <button type="button" className="btn btn-accent pl-ov-btn" onClick={openSubmitFromClose} disabled={authLoading}>
                Create and submit your own
              </button>
            </div>
          </section>
        ) : listItems.locked.length > 0 ? (
          <section className="pl-close" aria-labelledby="pl-wall-h">
            {(() => {
              const total = listItems.locked.length
              const viaAccount = tier === 'anonymous' ? listItems.locked.filter((p) => freeIds.has(p.id)).length : 0
              const plural = (n) => `${n} more ${n === 1 ? 'prompt' : 'prompts'}`
              return viaAccount > 0 ? (
                <>
                  <div className="pl-close-text">
                    <h2 id="pl-wall-h">{`${plural(viaAccount)} open with a free account`}</h2>
                    <p>{`A free account opens ${freeIds.size} of the ${communityRows.length} community prompts. Pro opens all ${communityRows.length}.`}</p>
                  </div>
                  <div className="pl-close-actions">
                    <button type="button" className="btn btn-accent pl-ov-btn" onClick={signupFree}>Create your free account</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="pl-close-text">
                    <h2 id="pl-wall-h">{`${plural(total)} open with Pro`}</h2>
                    <p>Each opens as the full brief its author wrote, ready to copy.</p>
                  </div>
                  <div className="pl-close-actions">
                    <Link className="btn btn-accent pl-ov-btn" to="/plans" onClick={() => { reportUpgradeGate('prompt-library-community-lock') }}>
                      See what Pro includes
                    </Link>
                  </div>
                </>
              )
            })()}
          </section>
        ) : null
      )}

      {/* Detail Modal */}
      {modalPrompt && (
        <PromptModal
          prompt={modalPrompt}
          onClose={closeModal}
          onCopy={copyPrompt}
          onToggleSave={toggleCommunitySave}
          onRemove={remove}
          isCommunity={isCommunity}
          isSaved={savedIds.has(modalPrompt.id)}
        />
      )}
    </div>
  )
}

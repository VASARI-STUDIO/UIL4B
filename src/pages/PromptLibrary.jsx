import { useState, useCallback, useMemo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { COMMUNITY_SUBMIT_REASONS, consumeSubmitIntent, hasSubmitIntent, resetSubmitIntent, setSubmitIntent } from '../utils/submitIntent'
import { COMMUNITY_PROMPTS } from '../data/communityPrompts'
import { TAG_CATEGORIES, FREE_PROMPT_LIMIT } from '../data/promptCategories'
import { getPrompts, setPromptsStore, getSavedIds, setSavedIdsStore, parseTags } from '../utils/promptStore'
import PromptCard from '../components/prompt/PromptCard'
import PromptModal from '../components/prompt/PromptModal'
import AddPromptPanel from '../components/prompt/AddPromptPanel'
import SubmitPromptPanel from '../components/prompt/SubmitPromptPanel'

// Community submission surface name for the sign-in gate (utils/submitIntent).
const SUBMIT_SURFACE = 'prompt'

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

  const isCommunity = tab === 'community'
  const sortedCommunity = useMemo(() => {
    const list = [...COMMUNITY_PROMPTS]
    if (communitySort === 'new') return list.reverse()
    return list.sort((a, b) => (b.saves || 0) - (a.saves || 0))
  }, [communitySort])
  const sourceList = isCommunity ? sortedCommunity : prompts

  const q = search.toLowerCase()
  const activeTags = activeCategory ? TAG_CATEGORIES.find(c => c.label === activeCategory)?.tags || [] : []

  const filtered = sourceList.filter(p => {
    if (activeCategory) {
      const pTags = parseTags(p.tags)
      if (!pTags.some(tag => activeTags.includes(tag))) return false
    }
    if (!q) return true
    return p.text.toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q)
  })

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">{t('promptLibrary.title')}</div>
        <h1>{t('promptLibrary.title')}</h1>
        <p>{t('promptLibrary.subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div className="pl-tabs">
        <button className={`pl-tab${tab === 'my' ? ' active' : ''}`} onClick={() => switchTab('my')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          My Prompts
          {prompts.length > 0 && <span className="pl-tab-count">{prompts.length}</span>}
        </button>
        <button className={`pl-tab${tab === 'community' ? ' active' : ''}`} onClick={() => switchTab('community')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Community
          <span className="pl-tab-count">{COMMUNITY_PROMPTS.length}</span>
        </button>
      </div>

      {/* Toolbar: search + category chips */}
      <div className="pl-toolbar">
        <div className="pl-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {/* A placeholder is not an accessible name — it is unreadable to a
              screen reader as a label and it disappears the moment you type. */}
          <input
            type="text"
            className="pl-search"
            aria-label={isCommunity ? 'Search community prompts' : 'Search your prompts'}
            placeholder={isCommunity ? 'Search community prompts...' : t('promptLibrary.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        {isCommunity && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              <button className={`pl-chip${communitySort === 'popular' ? ' active' : ''}`} onClick={() => setCommunitySort('popular')}>
                Popular
              </button>
              <button className={`pl-chip${communitySort === 'new' ? ' active' : ''}`} onClick={() => setCommunitySort('new')}>
                Newest
              </button>
            </div>
            <div className="pl-chips">
              <button
                className={`pl-chip${!activeCategory ? ' active' : ''}`}
                onClick={() => setActiveCategory(null)}
              >All</button>
              {TAG_CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  className={`pl-chip${activeCategory === cat.label ? ' active' : ''}`}
                  onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                >{cat.label}</button>
              ))}
            </div>
          </>
        )}

        {isCommunity && (
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
        )}

        {!isCommunity && (
          <button className="btn btn-accent pl-add-btn" onClick={() => setAddOpen(!addOpen)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('promptLibrary.addPrompt')}
          </button>
        )}
      </div>

      {/* Add prompt panel (slide-down) — only for My Prompts */}
      {!isCommunity && (
        <AddPromptPanel open={addOpen} onClose={() => setAddOpen(false)} onAdd={addPrompt} toast={toast} t={t} />
      )}

      {/* Submit to community panel — signed-in only; see openSubmit above. */}
      {isCommunity && submitOpen && uid && (
        <SubmitPromptPanel onClose={() => setSubmitOpen(false)} user={user} userProfile={userProfile} toast={toast} />
      )}

      {/* Pro CTA cards */}
      {isCommunity && !isPro && (
        <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Unlock all community prompts</div>
            <div style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5 }}>
              Free users can access {FREE_PROMPT_LIMIT} prompts. Upgrade to Pro to unlock the full library and get +25 bonus AI generations for every approved prompt you submit.
            </div>
          </div>
          <NavLink to="/checkout?plan=yearly" className="btn btn-accent" style={{ whiteSpace: 'nowrap' }}>
            Upgrade to Pro
          </NavLink>
        </div>
      )}

      {/* Gallery Grid */}
      {filtered.length > 0 ? (
        <div className="pl-gallery">
          {filtered.map((p, idx) => {
            const isLocked = isCommunity && !isPro && idx >= FREE_PROMPT_LIMIT
            return (
              <PromptCard
                key={p.id}
                p={p}
                onOpen={isLocked ? () => toast?.('Upgrade to Pro to access this prompt') : setModalPrompt}
                isCommunity={isCommunity}
                isSaved={savedIds.has(p.id)}
                isLocked={isLocked}
              />
            )
          })}
        </div>
      ) : (
        <div className="pl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            {isCommunity ? (
              <>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </>
            ) : (
              <>
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </>
            )}
          </svg>
          <p>{isCommunity ? 'No prompts match your search' : t('promptLibrary.noPrompts')}</p>
          {!isCommunity && (
            <button className="btn btn-accent" onClick={() => setAddOpen(true)}>{t('promptLibrary.addPrompt')}</button>
          )}
        </div>
      )}

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

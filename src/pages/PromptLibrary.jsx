import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { COMMUNITY_PROMPTS } from '../data/communityPrompts'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../utils/firebase'
import { processImageForUpload } from '../utils/imageProcessing'

function getPrompts() {
  try { return JSON.parse(localStorage.getItem('vs-prompts') || '[]') }
  catch { return [] }
}
function setPromptsStore(p) { localStorage.setItem('vs-prompts', JSON.stringify(p)) }

function getSavedIds() {
  try { return new Set(JSON.parse(localStorage.getItem('vs-saved-prompt-ids') || '[]')) }
  catch { return new Set() }
}
function setSavedIdsStore(ids) {
  localStorage.setItem('vs-saved-prompt-ids', JSON.stringify([...ids]))
}

function parseTags(tagStr) {
  if (!tagStr) return []
  return tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
}

function PromptCard({ p, onOpen, isCommunity, isSaved, isLocked }) {
  const pTags = parseTags(p.tags)

  return (
    <div className={`pl-card no-img${isLocked ? ' pl-card-locked' : ''}`} onClick={() => !isLocked && onOpen(p)} style={isLocked ? { cursor: 'default', opacity: 0.7 } : undefined}>
      <div className="pl-card-text-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="pl-card-title" style={{ flex: 1 }}>{p.title || p.text.slice(0, 60)}</div>
          {isLocked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          )}
        </div>
        {pTags.length > 0 && (
          <div className="pl-card-tags">
            {pTags.slice(0, 3).map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            {pTags.length > 3 && <span className="pl-tag">+{pTags.length - 3}</span>}
          </div>
        )}
        {isCommunity && (
          <div className="pl-card-author">
            <span>{p.author}{p.authorProfile ? '' : ''}</span>
            {p.saves > 0 && <span className="pl-card-saves">{p.saves} saves</span>}
            {isSaved && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            )}
          </div>
        )}
        {!isCommunity && <div className="pl-card-date-inline">{p.date}</div>}
        {isLocked && (
          <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
            Pro only
          </div>
        )}
      </div>
    </div>
  )
}

function PromptModal({ prompt, onClose, onCopy, onSave, onRemove, isCommunity, isSaved }) {
  const pTags = parseTags(prompt.tags)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pl-modal-backdrop" onClick={onClose}>
      <div className="pl-modal" onClick={e => e.stopPropagation()}>
        <button className="pl-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pl-modal-header">
          <h2>{prompt.title || prompt.text.slice(0, 60)}</h2>
          {pTags.length > 0 && (
            <div className="pl-card-tags" style={{ marginTop: 8 }}>
              {pTags.map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            </div>
          )}
          {isCommunity && prompt.author && (
            <div className="pl-modal-author">
              <span>{prompt.author}</span>
              {prompt.authorProfile && (
                <a
                  href={prompt.authorProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginLeft: 4 }}
                  onClick={e => e.stopPropagation()}
                >
                  View profile
                </a>
              )}
              {prompt.saves > 0 && <span className="pl-card-saves">{prompt.saves} saves</span>}
            </div>
          )}
        </div>

        <div className="pl-modal-body">
          <div className="pl-modal-prompt" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
            <pre>{prompt.text}</pre>
            <div className="pl-card-copy-hint" style={{ opacity: 1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </div>
          </div>
        </div>

        <div className="pl-modal-footer">
          {isCommunity ? (
            <button className={`btn ${isSaved ? '' : 'btn-accent'}`} onClick={(e) => { e.stopPropagation(); onSave(prompt) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              {isSaved ? 'Saved' : 'Save to my library'}
            </button>
          ) : (
            <button className="btn pl-modal-delete" onClick={(e) => { e.stopPropagation(); onRemove(e, prompt.id) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete
            </button>
          )}
          <button className="btn btn-accent" onClick={(e) => { e.stopPropagation(); onCopy(e, prompt.text) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy prompt
          </button>
        </div>
      </div>
    </div>
  )
}

const TAG_CATEGORIES = [
  { label: 'Website', tags: ['business', 'local', 'one-page', 'restaurant', 'portfolio', 'freelancer', 'construction', 'ecommerce', 'real-estate', 'coffee', 'fitness', 'saas', 'listing', 'property', 'landing', 'blog', 'editorial'] },
  { label: '3D & Motion', tags: ['3d', 'threejs', 'animation', 'motion', 'hero', 'scroll', 'gsap', 'transitions', 'lottie', 'particles', 'wave', 'blob', 'shader', 'glsl', 'text'] },
  { label: 'UI Components', tags: ['dashboard', 'cards', 'pricing', 'component', 'carousel', 'glass', 'menu', 'onboarding', 'loading', 'micro'] },
  { label: 'CSS & Visual', tags: ['css', 'no-js', 'gallery', 'hover', 'dark', 'interactive'] },
  { label: 'Branding', tags: ['branding', 'identity', 'creative', 'premium', 'elegant', 'warm', 'typography'] },
]

const FREE_PROMPT_LIMIT = 5

export default function PromptLibrary({ onCopy, toast }) {
  const { t } = useI18n()
  const { user, userProfile } = useAuth()
  const { isPro } = useSubscription()
  const [prompts, setPrompts] = useState(getPrompts)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [modalPrompt, setModalPrompt] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [savedIds, setSavedIds] = useState(getSavedIds)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem('vs-prompt-tab') === 'my' ? 'my' : 'community' }
    catch { return 'community' }
  })
  const fileRef = useRef(null)

  useEffect(() => {
    try { localStorage.setItem('vs-prompt-tab', tab) } catch { /* ignore */ }
  }, [tab])

  const save = useCallback(() => {
    if (!text.trim()) { toast(t('promptLibrary.enterPromptFirst')); return }
    const fileInput = fileRef.current
    const prompt = {
      id: Date.now(),
      title: title.trim() || text.trim().slice(0, 60),
      text: text.trim(),
      tags: tags.trim(),
      img: '',
      date: new Date().toLocaleDateString('en-AU'),
    }

    const finish = (p) => {
      const updated = [p, ...prompts]
      setPromptsStore(updated)
      setPrompts(updated)
      setText('')
      setTags('')
      setTitle('')
      if (fileInput) fileInput.value = ''
      setAddOpen(false)
      toast(t('promptLibrary.promptSaved'))
    }

    const picked = fileInput?.files?.[0]
    if (picked && picked.type.startsWith('image/')) {
      // Compress images to WebP before persisting locally (SVGs pass through).
      processImageForUpload(picked, { maxDimension: 1200, quality: 0.8 })
        .then(({ dataUrl }) => { prompt.img = dataUrl; finish(prompt) })
        .catch(() => {
          const reader = new FileReader()
          reader.onload = (e) => { prompt.img = e.target.result; finish(prompt) }
          reader.readAsDataURL(picked)
        })
    } else if (picked) {
      const reader = new FileReader()
      reader.onload = (e) => { prompt.img = e.target.result; finish(prompt) }
      reader.readAsDataURL(picked)
    } else {
      finish(prompt)
    }
  }, [text, tags, title, prompts, toast, t])

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
    const updated = [prompt, ...prompts]
    setPromptsStore(updated)
    setPrompts(updated)
    const newSaved = new Set(savedIds)
    newSaved.add(cp.id)
    setSavedIds(newSaved)
    setSavedIdsStore(newSaved)
    toast('Saved to your library')
  }, [prompts, savedIds, toast])

  const remove = useCallback((e, id) => {
    e.stopPropagation()
    const updated = prompts.filter(p => p.id !== id)
    setPromptsStore(updated)
    setPrompts(updated)
    setModalPrompt(null)
    toast(t('promptLibrary.promptDeleted'))
  }, [prompts, toast, t])

  const copyPrompt = useCallback((e, txt) => {
    e.stopPropagation()
    onCopy(txt)
  }, [onCopy])

  const [communitySort, setCommunitySort] = useState('popular') // 'popular' | 'new'

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

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/') && fileRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileRef.current.files = dt.files
    }
  }, [])

  const [submitTitle, setSubmitTitle] = useState('')
  const [submitText, setSubmitText] = useState('')
  const [submitTags, setSubmitTags] = useState('')
  const [submitProfile, setSubmitProfile] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMedia, setSubmitMedia] = useState(null)
  const [submitMediaPreview, setSubmitMediaPreview] = useState(null)
  const submitFileRef = useRef(null)

  const handleSubmitMedia = useCallback(async (file) => {
    if (!file) return
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) { toast('Only images and videos are supported'); return }
    if (file.size > 10 * 1024 * 1024) { toast('File must be under 10 MB'); return }
    setSubmitMedia(file)
    if (isImage) {
      // Compress to WebP (SVGs pass through) so the stored demo stays small.
      try {
        const { dataUrl } = await processImageForUpload(file, { maxDimension: 1200, quality: 0.8 })
        setSubmitMediaPreview({ url: dataUrl, type: 'image' })
      } catch (err) {
        toast(err.message || 'Could not process image')
      }
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setSubmitMediaPreview({ url: e.target.result, type: 'video' })
    reader.readAsDataURL(file)
  }, [toast])

  const submitToComm = useCallback(async () => {
    if (!submitText.trim()) { toast('Enter a prompt to submit'); return }
    if (!user) { toast('Sign in to submit prompts'); return }
    setSubmitting(true)
    try {
      const doc = {
        title: submitTitle.trim() || submitText.trim().slice(0, 60),
        text: submitText.trim(),
        tags: submitTags.trim(),
        authorEmail: user.email,
        authorName: userProfile?.displayName || user.email?.split('@')[0],
        authorUid: user.uid,
        authorProfile: submitProfile.trim() || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      }
      if (submitMediaPreview) {
        doc.mediaType = submitMediaPreview.type
        doc.mediaUrl = submitMediaPreview.url.length < 900_000 ? submitMediaPreview.url : ''
      }
      await addDoc(collection(db, 'community-prompts'), doc)
      toast('Prompt submitted for review — you\'ll get +25 AI generations if approved!')
      setSubmitTitle('')
      setSubmitText('')
      setSubmitTags('')
      setSubmitProfile('')
      setSubmitMedia(null)
      setSubmitMediaPreview(null)
      if (submitFileRef.current) submitFileRef.current.value = ''
      setSubmitOpen(false)
    } catch {
      toast('Failed to submit — try again')
    }
    setSubmitting(false)
  }, [submitTitle, submitText, submitTags, submitProfile, submitMediaPreview, user, userProfile, toast])

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">{t('promptLibrary.title')}</div>
        <h1>{t('promptLibrary.title')}</h1>
        <p>{t('promptLibrary.subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div className="pl-tabs">
        <button className={`pl-tab${tab === 'my' ? ' active' : ''}`} onClick={() => { setTab('my'); setActiveCategory(null); setSearch('') }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          My Prompts
          {prompts.length > 0 && <span className="pl-tab-count">{prompts.length}</span>}
        </button>
        <button className={`pl-tab${tab === 'community' ? ' active' : ''}`} onClick={() => { setTab('community'); setActiveCategory(null); setSearch('') }}>
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="pl-search"
            placeholder={isCommunity ? 'Search community prompts...' : t('promptLibrary.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearch('')}>
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

        {isCommunity && user && (
          <button className="btn pl-add-btn" onClick={() => setSubmitOpen(!submitOpen)}>
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
        <div className={`pl-add-panel${addOpen ? ' open' : ''}`}>
          <div className="pl-add-inner">
            <div className="pl-add-fields">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Prompt title (optional)"
                className="pl-input-title"
              />
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={t('promptLibrary.promptPlaceholder')}
                className="pl-textarea"
              />
              <div className="pl-add-row">
                <div className="pl-add-field">
                  <label>{t('promptLibrary.tagsPlaceholder')}</label>
                  <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="hero, product, dark" />
                </div>
                <div
                  className={`pl-drop-zone${dragOver ? ' over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>{t('promptLibrary.referenceImage')}</span>
                  <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} />
                </div>
              </div>
            </div>
            <div className="pl-add-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={save}>{t('promptLibrary.addPrompt')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit to community panel */}
      {isCommunity && submitOpen && (
        <div className="pl-add-panel open">
          <div className="pl-add-inner">
            <div className="pl-add-fields">
              <div
                className={`pl-drop-zone${submitMedia ? ' has-file' : ''}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleSubmitMedia(e.dataTransfer?.files?.[0]) }}
                onClick={() => submitFileRef.current?.click()}
                style={{ marginBottom: 8 }}
              >
                {submitMediaPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {submitMediaPreview.type === 'image' ? (
                      <img src={submitMediaPreview.url} alt="Preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{submitMedia?.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--t2)' }}>{submitMediaPreview.type === 'image' ? 'Image' : 'Video'} · {(submitMedia?.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setSubmitMedia(null); setSubmitMediaPreview(null) }}
                      style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}
                    >&times;</button>
                  </div>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>Drop an image or video here (optional, max 10 MB)</span>
                  </>
                )}
                <input ref={submitFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
                  onChange={e => handleSubmitMedia(e.target.files?.[0])} />
              </div>
              <input type="text" value={submitTitle} onChange={e => setSubmitTitle(e.target.value)} placeholder="Prompt title" className="pl-input-title" />
              <textarea value={submitText} onChange={e => setSubmitText(e.target.value)} placeholder="Your prompt..." className="pl-textarea" />
              <input type="text" value={submitTags} onChange={e => setSubmitTags(e.target.value)} placeholder="Tags (comma separated)" />
              <input type="url" value={submitProfile} onChange={e => setSubmitProfile(e.target.value)} placeholder="Your profile link (optional — portfolio, X, Dribbble)" />
            </div>
            <div className="pl-add-actions">
              <button className="btn" onClick={() => setSubmitOpen(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={submitToComm} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit for review'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 8 }}>
              Submissions are reviewed before appearing in the community library. Approved prompts earn you <strong style={{ color: 'var(--accent)' }}>+25 bonus AI generations</strong>.
            </div>
          </div>
        </div>
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

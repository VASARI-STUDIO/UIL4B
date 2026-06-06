import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { COMMUNITY_PROMPTS } from '../data/communityPrompts'

function getPrompts() {
  try { return JSON.parse(localStorage.getItem('vs-prompts') || '[]') }
  catch { return [] }
}
function setPromptsStore(p) { localStorage.setItem('vs-prompts', JSON.stringify(p)) }

function parseTags(tagStr) {
  if (!tagStr) return []
  return tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
}

function PromptCard({ p, isExpanded, onToggle, onCopy, onRemove, onSave, isCommunity }) {
  const pTags = parseTags(p.tags)

  return (
    <div
      className={`pl-card${isExpanded ? ' expanded' : ''}${p.img ? '' : ' no-img'}`}
      onClick={() => onToggle(p.id)}
    >
      {p.img ? (
        <div className="pl-card-img">
          <img src={p.img} alt="" loading="lazy" />
          <div className="pl-card-overlay">
            <div className="pl-card-title">{p.title || p.text.slice(0, 60)}</div>
            {pTags.length > 0 && (
              <div className="pl-card-tags">
                {pTags.map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="pl-card-text-hero">
          <div className="pl-card-title">{p.title || p.text.slice(0, 60)}</div>
          {pTags.length > 0 && (
            <div className="pl-card-tags">
              {pTags.map(tag => <span key={tag} className="pl-tag">{tag}</span>)}
            </div>
          )}
          {isCommunity && p.author && (
            <div className="pl-card-author">
              <span>{p.author}</span>
              {p.saves > 0 && <span className="pl-card-saves">{p.saves} saves</span>}
            </div>
          )}
        </div>
      )}

      <div className={`pl-card-detail${isExpanded ? ' open' : ''}`}>
        <div className="pl-card-prompt" onClick={e => { e.stopPropagation(); onCopy(e, p.text) }}>
          <pre>{p.text}</pre>
          <div className="pl-card-copy-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            Copy
          </div>
        </div>
        <div className="pl-card-meta">
          {isCommunity ? (
            <button className="btn btn-accent btn-s" onClick={e => { e.stopPropagation(); onSave(p) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
              Save to my library
            </button>
          ) : (
            <>
              <span className="pl-card-date">{p.date}</span>
              <button className="pl-card-delete" onClick={e => onRemove(e, p.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PromptLibrary({ onCopy, toast }) {
  const { t } = useI18n()
  const [prompts, setPrompts] = useState(getPrompts)
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  // Default to the community feed unless the user last left off on "my prompts".
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

    if (fileInput?.files?.[0]) {
      const reader = new FileReader()
      reader.onload = (e) => { prompt.img = e.target.result; finish(prompt) }
      reader.readAsDataURL(fileInput.files[0])
    } else {
      finish(prompt)
    }
  }, [text, tags, title, prompts, toast, t])

  const saveCommunityPrompt = useCallback((cp) => {
    const exists = prompts.some(p => p.title === cp.title && p.text === cp.text)
    if (exists) { toast('Already in your library'); return }
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
    toast('Saved to your library')
  }, [prompts, toast])

  const remove = useCallback((e, id) => {
    e.stopPropagation()
    const updated = prompts.filter(p => p.id !== id)
    setPromptsStore(updated)
    setPrompts(updated)
    toast(t('promptLibrary.promptDeleted'))
  }, [prompts, toast, t])

  const copyPrompt = useCallback((e, txt) => {
    e.stopPropagation()
    onCopy(txt)
  }, [onCopy])

  const isCommunity = tab === 'community'
  const sourceList = isCommunity ? COMMUNITY_PROMPTS : prompts

  const allTags = useMemo(() => {
    const tagSet = new Set()
    sourceList.forEach(p => parseTags(p.tags).forEach(tag => tagSet.add(tag)))
    return [...tagSet].sort()
  }, [sourceList])

  const q = search.toLowerCase()
  const filtered = sourceList.filter(p => {
    if (activeTag && !parseTags(p.tags).includes(activeTag)) return false
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

  return (
    <div className="sec">
      <div className="sec-h">
        <div className="sec-h-eyebrow">{t('promptLibrary.title')}</div>
        <h1>{t('promptLibrary.title')}</h1>
        <p>{t('promptLibrary.subtitle')}</p>
      </div>

      {/* Tab switcher */}
      <div className="pl-tabs">
        <button className={`pl-tab${tab === 'my' ? ' active' : ''}`} onClick={() => { setTab('my'); setActiveTag(null); setSearch('') }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          My Prompts
          {prompts.length > 0 && <span className="pl-tab-count">{prompts.length}</span>}
        </button>
        <button className={`pl-tab${tab === 'community' ? ' active' : ''}`} onClick={() => { setTab('community'); setActiveTag(null); setSearch('') }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Community
          <span className="pl-tab-count">{COMMUNITY_PROMPTS.length}</span>
        </button>
      </div>

      {/* Toolbar: search + filter chips + add button */}
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

        {allTags.length > 0 && (
          <div className="pl-chips">
            <button
              className={`pl-chip${!activeTag ? ' active' : ''}`}
              onClick={() => setActiveTag(null)}
            >All</button>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`pl-chip${activeTag === tag ? ' active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >{tag}</button>
            ))}
          </div>
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
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} />
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

      {/* Gallery Grid */}
      {filtered.length > 0 ? (
        <div className="pl-gallery">
          {filtered.map(p => (
            <PromptCard
              key={p.id}
              p={p}
              isExpanded={expandedId === p.id}
              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
              onCopy={copyPrompt}
              onRemove={remove}
              onSave={saveCommunityPrompt}
              isCommunity={isCommunity}
            />
          ))}
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
    </div>
  )
}

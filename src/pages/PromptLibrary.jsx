import { useState, useCallback, useRef, useMemo } from 'react'
import { useI18n } from '../contexts/I18nContext'

function getPrompts() {
  try { return JSON.parse(localStorage.getItem('vs-prompts') || '[]') }
  catch { return [] }
}
function setPromptsStore(p) { localStorage.setItem('vs-prompts', JSON.stringify(p)) }

function parseTags(tagStr) {
  if (!tagStr) return []
  return tagStr.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
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
  const fileRef = useRef(null)

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

  const allTags = useMemo(() => {
    const tagSet = new Set()
    prompts.forEach(p => parseTags(p.tags).forEach(tag => tagSet.add(tag)))
    return [...tagSet].sort()
  }, [prompts])

  const q = search.toLowerCase()
  const filtered = prompts.filter(p => {
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

      {/* Toolbar: search + filter chips + add button */}
      <div className="pl-toolbar">
        <div className="pl-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="pl-search"
            placeholder={t('promptLibrary.searchPlaceholder')}
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

        <button className="btn btn-accent pl-add-btn" onClick={() => setAddOpen(!addOpen)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('promptLibrary.addPrompt')}
        </button>
      </div>

      {/* Add prompt panel (slide-down) */}
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

      {/* Gallery Grid */}
      {filtered.length > 0 ? (
        <div className="pl-gallery">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id
            const pTags = parseTags(p.tags)
            return (
              <div
                key={p.id}
                className={`pl-card${isExpanded ? ' expanded' : ''}${p.img ? '' : ' no-img'}`}
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
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
                  </div>
                )}

                {/* Expanded detail */}
                <div className={`pl-card-detail${isExpanded ? ' open' : ''}`}>
                  <div className="pl-card-prompt" onClick={e => copyPrompt(e, p.text)}>
                    <pre>{p.text}</pre>
                    <div className="pl-card-copy-hint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </div>
                  </div>
                  <div className="pl-card-meta">
                    <span className="pl-card-date">{p.date}</span>
                    <button className="pl-card-delete" onClick={e => remove(e, p.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="pl-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          <p>{t('promptLibrary.noPrompts')}</p>
          <button className="btn btn-accent" onClick={() => setAddOpen(true)}>{t('promptLibrary.addPrompt')}</button>
        </div>
      )}
    </div>
  )
}

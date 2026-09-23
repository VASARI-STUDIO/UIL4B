import { useState, useRef, useCallback } from 'react'
import { processImageForUpload } from '../../utils/imageProcessing'

// Slide-down form for adding a personal prompt. Owns its own form state and
// image processing; hands the finished prompt up via onAdd, which persists it.
export default function AddPromptPanel({ open, onClose, onAdd, toast, t }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
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
      onAdd(p)
      setText('')
      setTags('')
      setTitle('')
      if (fileInput) fileInput.value = ''
      onClose()
    }

    const picked = fileInput?.files?.[0]
    // Guard localStorage: a large file becomes a ~33%-bigger base64 string.
    if (picked && picked.size > 4 * 1024 * 1024) {
      toast('That file is too large to attach — saving the prompt text only.')
      return finish(prompt)
    }
    // If a FileReader can't read the file, still save the text rather than hang.
    const readFallback = (file) => {
      const reader = new FileReader()
      reader.onload = (e) => { prompt.img = e.target.result; finish(prompt) }
      reader.onerror = () => { toast('Could not read the file — saving the prompt text only.'); finish(prompt) }
      reader.readAsDataURL(file)
    }
    if (picked && picked.type.startsWith('image/')) {
      // Compress images to WebP before persisting locally (SVGs pass through).
      processImageForUpload(picked, { maxDimension: 1200, quality: 0.8 })
        .then(({ dataUrl }) => { prompt.img = dataUrl; finish(prompt) })
        .catch(() => readFallback(picked))
    } else if (picked) {
      readFallback(picked)
    } else {
      finish(prompt)
    }
  }, [text, tags, title, onAdd, onClose, toast, t])

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
    <div className={`pl-add-panel${open ? ' open' : ''}`}>
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
              <input ref={fileRef} type="file" accept="image/*,video/*" className="pl-file-input" />
            </div>
          </div>
        </div>
        <div className="pl-add-actions">
          <button type="button" className="lib-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="lib-btn lib-btn--primary" onClick={save}>{t('promptLibrary.addPrompt')}</button>
        </div>
      </div>
    </div>
  )
}

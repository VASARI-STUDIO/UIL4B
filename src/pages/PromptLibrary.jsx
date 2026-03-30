import { useState, useCallback, useRef } from 'react'

function getPrompts() {
  try { return JSON.parse(localStorage.getItem('vs-prompts') || '[]') }
  catch { return [] }
}
function setPromptsStore(p) { localStorage.setItem('vs-prompts', JSON.stringify(p)) }

export default function PromptLibrary({ onCopy, toast }) {
  const [prompts, setPrompts] = useState(getPrompts)
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [search, setSearch] = useState('')
  const fileRef = useRef(null)

  const save = useCallback(() => {
    if (!text.trim()) { toast('Enter a prompt first'); return }
    const fileInput = fileRef.current
    const prompt = { id: Date.now(), text: text.trim(), tags, img: '', date: new Date().toLocaleDateString('en-AU') }

    const finish = (p) => {
      const updated = [p, ...prompts]
      setPromptsStore(updated)
      setPrompts(updated)
      setText('')
      setTags('')
      if (fileInput) fileInput.value = ''
      toast('Prompt saved')
    }

    if (fileInput?.files?.[0]) {
      const reader = new FileReader()
      reader.onload = (e) => { prompt.img = e.target.result; finish(prompt) }
      reader.readAsDataURL(fileInput.files[0])
    } else {
      finish(prompt)
    }
  }, [text, tags, prompts, toast])

  const remove = useCallback((id) => {
    const updated = prompts.filter(p => p.id !== id)
    setPromptsStore(updated)
    setPrompts(updated)
    toast('Deleted')
  }, [prompts, toast])

  const q = search.toLowerCase()
  const filtered = prompts.filter(p =>
    !q || p.text.toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q)
  )

  return (
    <div className="sec on">
      <div className="sec-h">
        <h1>Prompt Library</h1>
        <p>Save AI image generation prompts with output previews.</p>
      </div>

      <div className="sub">
        <div className="sl">Add Prompt</div>
        <div className="card" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter your prompt..." style={{ minHeight: 80, resize: 'vertical' }} />
            <div className="row">
              <label style={{ fontSize: 10, color: 'var(--t2)' }}>Output image</label>
              <input ref={fileRef} type="file" accept="image/*" style={{ fontSize: 11 }} />
            </div>
            <div className="row">
              <label style={{ fontSize: 10, color: 'var(--t2)' }}>Tags</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. hero, product" style={{ width: 200 }} />
            </div>
            <div><button className="btn btn-accent" onClick={save}>Save Prompt</button></div>
          </div>
        </div>
      </div>

      <div className="sub">
        <div className="sl">Saved Prompts</div>
        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', maxWidth: 260, margin: '8px 0 12px' }} />
        <div className="prompt-grid">
          {filtered.map(p => (
            <div key={p.id} className="prompt-card">
              {p.img ? (
                <img src={p.img} alt="Output" />
              ) : (
                <div style={{ width: '100%', height: 80, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 10, color: 'var(--t2)', borderRadius: 10 }}>No image</div>
              )}
              <div className="prompt-text" onClick={() => onCopy(p.text)}>{p.text}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--t2)' }}>{p.tags ? p.tags + ' · ' : ''}{p.date}</div>
                <button className="btn btn-s" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 10 }}>No prompts saved yet.</p>}
      </div>
    </div>
  )
}

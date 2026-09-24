import { useRef, useState } from 'react'

// The one way a file gets into any converter mode: click, Enter/Space, or a
// drop. `compact` is the slim "add more" strip shown once a mode already has
// files, so the visitor's own files — not the empty-state invitation — are the
// biggest thing on screen.
export default function DropZone({ accept, multiple, onFiles, hint, sub, compact = false }) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  return (
    <div
      className={`fc-drop${compact ? ' fc-drop--compact' : ''}${hover ? ' fc-drop--over' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={hint}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setHover(true) }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault()
        setHover(false)
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
      }}
    >
      <span className="fc-drop-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
        </svg>
      </span>
      <span className="fc-drop-text">
        <span className="fc-drop-hint">{hint}</span>
        {sub && <span className="fc-drop-sub">{sub}</span>}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

import { useId, useRef, useState } from 'react'

// The one way a file gets into any converter mode: click, Enter/Space, or a
// drop.
//
// Three shapes:
//  - the default: the whole zone is one button (the other modes use this);
//  - `compact`: the slim "add more" strip shown once a mode already has files,
//    so the visitor's own files, not the invitation, are the biggest thing on
//    screen;
//  - `hero`: the empty state of a mode that has a lot to say before a file
//    arrives. The zone is a drop target; the way in is a real "Choose a file"
//    button, so a keyboard or screen-reader visitor lands on a named control
//    rather than on a div. It can name what it takes (`formats`) and what it
//    makes (`makes`), and offer a sample (`onSample`).
//
// Dragging a file over any shape draws the same ink "over" state, and the hero
// says so in words too, for anyone not watching the border.
export default function DropZone({
  accept, multiple, onFiles, hint, sub, compact = false,
  hero = false, formats, makes, buttonLabel = 'Choose a file', overHint = 'Drop to add', onSample, sampleLabel = 'Try a sample',
}) {
  const inputRef = useRef(null)
  const [hover, setHover] = useState(false)
  const uid = useId()
  const open = () => inputRef.current?.click()

  // A drag of text or a link is not ours to answer; only files light the zone.
  const hasFiles = e => Array.from(e.dataTransfer?.types || []).includes('Files')
  const dropProps = {
    onDragOver: e => { if (hasFiles(e)) { e.preventDefault(); setHover(true) } },
    // dragleave also fires when the pointer moves onto a child; only a real
    // exit from the zone clears the state, or the border would flicker.
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false) },
    onDrop: e => {
      e.preventDefault()
      setHover(false)
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
    },
  }
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      hidden
      onChange={e => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }}
    />
  )
  const cls = `fc-drop${compact ? ' fc-drop--compact' : ''}${hero ? ' fc-drop--hero' : ''}${hover ? ' fc-drop--over' : ''}`

  if (hero) {
    return (
      <div
        className={cls}
        role="group"
        aria-labelledby={`${uid}-hint`}
        data-over={hover ? 'true' : undefined}
        onClick={e => { if (!e.target.closest('button')) open() }}
        {...dropProps}
      >
        <span className="fc-drop-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
          </svg>
        </span>
        <span className="fc-drop-text">
          <span className="fc-drop-hint" id={`${uid}-hint`}>{hover ? overHint : hint}</span>
          {sub && <span className="fc-drop-sub">{sub}</span>}
        </span>
        <span className="fc-drop-actions">
          <button type="button" className="fc-btn fc-btn--primary fc-drop-choose" onClick={open}>{buttonLabel}</button>
          {onSample && <button type="button" className="fc-btn fc-drop-sample" onClick={onSample}>{sampleLabel}</button>}
        </span>
        {formats?.length > 0 && (
          <span className="fc-drop-formats">
            <span className="fc-drop-formats-k" id={`${uid}-in`}>Opens</span>
            <ul className="fc-chips" aria-labelledby={`${uid}-in`}>
              {formats.map(f => <li key={f} className="fc-chip">{f}</li>)}
            </ul>
          </span>
        )}
        {makes?.length > 0 && (
          <span className="fc-drop-formats">
            <span className="fc-drop-formats-k" id={`${uid}-out`}>Saves as</span>
            <ul className="fc-chips" aria-labelledby={`${uid}-out`}>
              {makes.map(f => <li key={f} className="fc-chip fc-chip--out">{f}</li>)}
            </ul>
          </span>
        )}
        {input}
      </div>
    )
  }

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      aria-label={hint}
      onClick={open}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
      {...dropProps}
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
      {input}
    </div>
  )
}

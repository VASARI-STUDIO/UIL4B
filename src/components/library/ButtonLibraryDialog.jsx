import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useModalDialog from '../../hooks/useModalDialog'
import { useCloseOnBack } from '../../hooks/useCloseOnBack'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { reportUpgradeGate } from '../../contexts/ProModalContext'
import {
  BUTTON_ACCENTS,
  BUTTON_EDIT_GROUPS,
  buttonCss,
  buttonHtml,
  buttonPrompt,
  isEdited,
  resolveEdits,
} from '../../data/buttonLibrary'

// The detail dialog on /discover/buttons: one design, running, with the HTML and
// CSS to copy and, for Pro, the quick edits and the AI prompt.
//
// What is free and what is not. The preview, the HTML and the CSS are free and
// work signed out; copying them needs no account. Quick edits and the prompt are
// Pro. The edits are held in this component's state and applied only when the
// plan is Pro, so a free viewer can neither see a control nor reach the state
// behind one. The prompt is not assembled for a viewer who cannot read it.
//
// The preview, the code shown and the code copied are one string:
// buttonCss(item, edits). The preview is that string scoped under `.blib-live`
// and the copy is the same string unscoped, so they cannot disagree.

const LIVE_SCOPE = '.blib-live'
const NO_EDITS = Object.freeze({})

// A design's note marks code with backticks; draw those runs as <code>.
const noteParts = (text) => text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))

function CopyButton({ text, label, onCopy }) {
  const [done, setDone] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const press = async () => {
    const ok = await onCopy(text)
    if (ok === false) return
    setDone(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" className="lib-btn blib-copy" onClick={press}>
      {done ? 'Copied' : label}
    </button>
  )
}

function CodeBlock({ title, code, copyLabel, onCopy, wrap = false }) {
  const headId = useId()
  return (
    <div className="blib-code">
      <div className="blib-code-head">
        <h3 id={headId}>{title}</h3>
        <CopyButton text={code} label={copyLabel} onCopy={onCopy} />
      </div>
      {/* Focusable so a keyboard user can scroll a long line; named by its heading. */}
      <pre className={wrap ? 'blib-pre blib-pre--wrap' : 'blib-pre'} tabIndex={0} role="group" aria-labelledby={headId}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// What a Pro block says to everyone else. While the plan is still on the way it
// says so and offers nothing; a free viewer gets the plans link, reported by name.
function ProLock({ title, body, gate, checking }) {
  return (
    <div className="blib-lock">
      <h3>{title}</h3>
      {checking ? (
        <p role="status">Checking your plan…</p>
      ) : (
        <>
          <p>{body}</p>
          <Link className="lib-btn lib-btn--primary blib-lock-cta" to="/plans" onClick={() => { reportUpgradeGate(gate) }}>
            See Pro plans
          </Link>
        </>
      )}
    </div>
  )
}

function EditGroup({ name, group, value, onPick }) {
  const uid = useId()
  return (
    <fieldset className="blib-edit">
      <legend>{group.label}</legend>
      <div className="blib-edit-opts">
        {group.options.map((opt) => (
          <label key={opt.id} className="blib-opt">
            <input
              type="radio"
              name={`${uid}-${name}`}
              checked={value === opt.id}
              onChange={() => onPick(name, opt.id)}
            />
            <span>
              {name === 'accent' && <i className="blib-dot" style={{ background: BUTTON_ACCENTS[opt.id].solid }} aria-hidden="true" />}
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function ButtonLibraryDialog({ item, onClose, onCopy }) {
  const { isPro, planKnown } = useSubscription()
  const checking = planKnown !== true
  const pro = isPro === true && !checking
  const [edits, setEdits] = useState({})

  const dialogRef = useModalDialog(onClose)
  useCloseOnBack(true, onClose)

  // A free viewer's edits are always empty, whatever the state says.
  const live = pro ? edits : NO_EDITS
  const resolved = resolveEdits(item, live)
  const css = useMemo(() => buttonCss(item, live), [item, live])
  const scopedCss = useMemo(() => buttonCss(item, live, { scope: LIVE_SCOPE }), [item, live])
  const html = buttonHtml(item)
  const disabledHtml = html.replace('<button ', '<button disabled ')
  const prompt = useMemo(() => (pro ? buttonPrompt(item, live) : ''), [pro, item, live])

  const pick = (key, id) => setEdits((e) => ({ ...e, [key]: id }))

  return (
    <div className="pl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="pl-modal blib-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="blib-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button type="button" className="pl-modal-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="pl-modal-header">
          <h2 id="blib-dialog-title">{item.name} button</h2>
          <p className="blib-use">{item.use}</p>
        </div>

        <div className="pl-modal-body blib-body">
          <div className="blib-live">
            <style>{scopedCss}</style>
            <figure className="blib-live-cell" style={item.previewWidth ? { width: item.previewWidth } : undefined}>
              <div className="blib-live-demo" dangerouslySetInnerHTML={{ __html: html }} />
              <figcaption>Enabled</figcaption>
            </figure>
            <figure className="blib-live-cell" style={item.previewWidth ? { width: item.previewWidth } : undefined}>
              <div className="blib-live-demo" dangerouslySetInnerHTML={{ __html: disabledHtml }} />
              <figcaption>Disabled</figcaption>
            </figure>
          </div>
          <p className="blib-note">{noteParts(item.note)}</p>

          {pro ? (
            <div className="blib-edits" role="group" aria-labelledby="blib-edits-title">
              <div className="blib-edits-head">
                <h3 id="blib-edits-title">Quick edits</h3>
                <button type="button" className="lib-btn blib-reset" onClick={() => setEdits({})} disabled={!isEdited(item, live)}>
                  Reset
                </button>
              </div>
              {item.edits.map((key) => (
                <EditGroup key={key} name={key} group={BUTTON_EDIT_GROUPS[key]} value={resolved[key]} onPick={pick} />
              ))}
            </div>
          ) : (
            <ProLock
              title="Quick edits"
              body="Change the size, the corners and the colour, and the code below changes with it. Included with Pro."
              gate="button-library-quick-edits"
              checking={checking}
            />
          )}

          <CodeBlock title="HTML" code={html.trimEnd()} copyLabel="Copy HTML" onCopy={onCopy} />
          <CodeBlock title="CSS" code={css.trimEnd()} copyLabel="Copy CSS" onCopy={onCopy} />

          {pro ? (
            <CodeBlock title="AI prompt" code={prompt.trimEnd()} copyLabel="Copy prompt" onCopy={onCopy} wrap />
          ) : (
            <ProLock
              title="AI prompt"
              body="A brief for your AI coding assistant, written from this design and your edits. Included with Pro."
              gate="button-library-prompt"
              checking={checking}
            />
          )}
        </div>
      </div>
    </div>
  )
}

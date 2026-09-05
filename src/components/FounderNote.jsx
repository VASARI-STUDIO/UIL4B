import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useModalDialog from '../hooks/useModalDialog'
import {
  FOUNDER_SIGNATURE,
  NOTE_PROMPTS,
  noteIsWritten,
  noteParagraphs,
} from '../data/founderNote'

// An OPT-IN note about this project. A footer link, and a short panel behind it.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS NOT THE POPUP THE BACKLOG ITEM ASKED FOR
// ─────────────────────────────────────────────────────────────────────────────
// `founder-intro-popup` in src/data/pipeline.js describes a welcome popup that
// greets a new visitor. The founder was offered exactly that and chose something
// else: "maybe we make it visable when a user clicks a certian section or button,
// it will just be a short welcome from me and a what this app is for and what
// state its in also asking for feedback support as im a solo developr".
//
// Read literally, that is a different surface with a different contract, and the
// difference is the whole design:
//
//   • It APPEARS ON A CLICK. It must never auto-open — not on a first visit, not
//     on a timer, not at a scroll depth, not once-per-account. Nothing in this
//     file opens the panel except a person pressing the trigger.
//   • It is orientation, not marketing. Who made this, what it is for, how far
//     along it is, and what would help.
//   • It says the state honestly, including that the state is early.
//
// Everything the popup version needed and this one does not follows from that
// first bullet. The "once per person" rule from #240 does not apply, because
// nothing is being shown to anyone unasked. "Must not fire on top of onboarding"
// does not apply, because nothing fires. And "reachable again afterwards", which
// that item flagged as the failure mode of one-time popups, is satisfied by
// construction: the trigger is in the footer of every page that has one, and it
// never goes away.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOTHING IS REMEMBERED, AND THAT IS THE DECISION
// ─────────────────────────────────────────────────────────────────────────────
// No localStorage, no "seen" flag, no unread dot on the trigger. This was the
// one open question worth spending thought on, and every use for a memory turned
// out to be the same use: knowing whether you have read it only has value if we
// intend to CHANGE WHAT WE SHOW YOU NEXT — nudge the unread, dim the read, badge
// a new version. Each of those is a small step back toward the popup that was
// turned down.
//
// The side benefit is that the private-mode failure mode does not exist here.
// `localStorage` can throw rather than return empty, so every read of it needs a
// try/catch and a correct render with no stored value; the correct render with no
// stored value is the only render this component has.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCES (Mobbin)
// ─────────────────────────────────────────────────────────────────────────────
//   • Zellerfeld's "Open Letter" — a founder's letter reached by a plain link in
//     the footer, sitting among Contact and Legal rather than in the page.
//     That drove WHERE the trigger lives.
//   • KÖPPEN's "Founders' Note" — a titled block of short unadorned paragraphs
//     signed with a name and a role, no CTA furniture inside it.
//     That drove the SHAPE of the panel: heading, prose, signature.
//   • Framer's "This feature is in beta" — states the state plainly and offers
//     exactly ONE way to respond ("Open Discord →") rather than a row of
//     choices. That drove the single action at the foot of this panel.
export default function FounderNote() {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const dialogId = useId()
  const overlayRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])

  // The scroll lock, Escape, the focus trap and focus restoration all come from
  // the shared hook, which is also what makes the `aria-modal="true"` below an
  // honest claim rather than a promise Tab walks straight out of.
  //
  // `enabled: open` rather than unmounting the whole component: the TRIGGER has
  // to stay mounted while the panel is up, because the hook restores focus to
  // whatever was focused when it opened, and that is the trigger.
  const dialogRef = useModalDialog(close, { enabled: open })

  const written = noteIsWritten()
  const paragraphs = noteParagraphs()

  return (
    <>
      <button
        type="button"
        className="app-footer-note"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
      >
        About this project
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fnote-overlay"
          // mousedown, not click: a click that STARTED inside the panel and
          // finished on the scrim (a drag that overshoots while selecting text)
          // would otherwise close the panel out from under the selection.
          onMouseDown={(e) => { if (e.target === overlayRef.current) close() }}
        >
          <div
            id={dialogId}
            className="fnote"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            ref={dialogRef}
          >
            <div className="fnote-head">
              <h2 id={titleId} className="fnote-title">About this project</h2>
              <button type="button" className="fnote-close" onClick={close} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* The scroller. `useModalDialog` measures the dialog's subtree when
                it opens and marks every real scroll container `data-lenis-prevent`,
                which is what lets a wheel gesture over a long note scroll the note
                instead of the page underneath it — Lenis intercepts the wheel
                globally, and `allowNestedScroll` plus that attribute is how the
                app already answers this everywhere else. */}
            <div className="fnote-body">
              {written ? (
                paragraphs.map((text, i) => (
                  // Index keys are correct here and only here: this list is a
                  // fixed four-slot structure read straight out of a module, in a
                  // fixed order, with no insertion, removal or reordering
                  // possible at runtime.
                  <p className="fnote-para" key={i}>{text}</p>
                ))
              ) : (
                // THE PLACEHOLDER, and it is deliberately unmistakable.
                //
                // No lorem, no plausible-looking draft, nothing a reader could
                // mistake for the real note — a convincing placeholder is how a
                // placeholder ships. It doubles as the brief: the four prompts
                // below are the four lines that need writing, and the moment all
                // four land in src/data/founderNote.js this whole branch stops
                // rendering on its own.
                <div className="fnote-todo">
                  <p className="fnote-todo-lead">
                    Not written yet — this note is Dylan&apos;s to write, and it is four lines:
                  </p>
                  <ol className="fnote-todo-list">
                    {NOTE_PROMPTS.map(({ key, prompt }) => (
                      <li key={key}>{prompt}</li>
                    ))}
                  </ol>
                  <p className="fnote-todo-where">
                    They go in <code>src/data/founderNote.js</code>. Nothing else needs to change.
                  </p>
                </div>
              )}
            </div>

            <div className="fnote-foot">
              <p className="fnote-sign">
                {FOUNDER_SIGNATURE.name}
                <span className="fnote-sign-place">{FOUNDER_SIGNATURE.place}</span>
              </p>
              {/* ONE action, and it is the feedback channel this app already has.
                  /feedback is the same destination the footer's own "Send
                  feedback" link points at and the same form the floating feedback
                  button opens, so a note that asks for feedback and a footer that
                  offers it cannot drift into two channels wearing one name.

                  A Link rather than opening FeedbackModal directly, because that
                  modal is owned by FeedbackButton, which App.jsx renders ONLY
                  inside the PillNav app shell — the homepage, the Create tool
                  landings, Discover and Learn all render this footer with no
                  FeedbackModal anywhere on the page. A route works from all of
                  them. Nothing here sends mail: transactional email is blocked on
                  a key that does not exist yet, and this deliberately does not
                  wait on it. */}
              <Link className="btn btn-accent fnote-action" to="/feedback" onClick={close}>
                Send feedback
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

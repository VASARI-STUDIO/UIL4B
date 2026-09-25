import { useState } from 'react'
import usePopover from '../../hooks/usePopover'
import { SYSTEM_PARTS } from '../../utils/userHome'

// Everything you can do to one project, from the ⋯ beside Save on its page
// (/projects/:id). It sat on every row of the old list; the rows are gone.
//
// ── WHY A MENU AND NOT A ROW OF BUTTONS ────────────────────────────────
//
// The card used to carry Load, Overwrite, Rename, Archive and Delete as five
// equally weighted pills in a wrapping row. The founder asked for MORE actions
// (duplicate, export, open straight into a tool), and adding three more pills to
// that row would have produced the anti-slop bar's exact complaint: “pills used
// for navigation, metadata, actions and decoration until roles become
// indistinguishable”. Eight identical pills is not eight affordances, it is
// noise with a destructive action hidden in it.
//
// Vercel's project cards (mobbin.com/screens/e2a9b3a7-e0e6-485f-925a-2de04392aeb0)
// are the reference: ONE primary action on the card, everything else behind a
// ⋯ with a grouped menu — theirs runs Remove Favorite / Visit with Toolbar /
// View Logs / Manage Domains / Transfer Project / Settings under a Repository
// group header. Same shape here, same reason: the primary action stays a button,
// the long tail stops competing with it, and Delete stops sitting beside Load.
//
// ── KEYBOARD AND DISMISSAL ───────────────────────────────────────
//
// usePopover, not a hand-rolled dropdown, so this inherits the contract every
// other popover in the app already owes: Escape closes and returns focus to the
// trigger, an outside press closes, opening moves focus in, tabbing past either
// end closes and lets focus continue, and it flips at the viewport edge instead
// of being clipped. Not role="menu" — see the note in usePopover.js.

function Dots() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
    </svg>
  )
}

/**
 * @param project    the raw project record.
 * @param digest     projectDigest(project) — used to label the "open in" rows
 *                   with what each tool would actually be working on.
 * @param onOpenIn   (id, route) — loads the project, THEN navigates. That is what
 *                   "open this project in the Type Scale" means: the tool has to
 *                   be working on this design, not on whatever was there before.
 */
export default function ProjectActions({
  project, digest, onOpenIn, onDuplicate, onRename, onExportCss, onOverwrite, onArchive, onDelete,
}) {
  const [open, setOpen] = useState(false)
  const { triggerRef, popRef, closeToTrigger } = usePopover(open, () => setOpen(false), { arrowNav: true })

  // Every item closes the menu and returns focus to the trigger before acting,
  // so a keyboard user is never stranded on an element that just unmounted.
  const run = (fn) => () => { closeToTrigger(); fn?.() }

  return (
    <div className="uh-actions">
      <button
        type="button"
        ref={triggerRef}
        className="uh-actions-trigger"
        aria-expanded={open}
        aria-label={`Actions for ${project.name}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Dots />
      </button>

      {open && (
        <div ref={popRef} className="pop uh-menu" role="group" aria-label={`Actions for ${project.name}`} tabIndex={-1}>
          <div className="pop-head">Open in</div>
          {SYSTEM_PARTS.map((part) => (
            <button key={part.id} type="button" className="pop-item" onClick={run(() => onOpenIn?.(project.id, part.tool))}>
              <span>{part.label}</span>
              {/* Which of these would be starting from scratch, said on the row
                  itself rather than left for the user to discover after the
                  navigation. */}
              {!digest?.parts?.find((p) => p.id === part.id)?.done && (
                <span className="uh-menu-hint">empty</span>
              )}
            </button>
          ))}

          <div className="pop-sep" />
          <button type="button" className="pop-item" onClick={run(() => onDuplicate?.(project.id))}>Duplicate</button>
          <button type="button" className="pop-item" onClick={run(() => onRename?.(project.id))}>Rename</button>
          <button type="button" className="pop-item" onClick={run(() => onExportCss?.(project.id))}>Copy CSS variables</button>
          {!project.archived && (
            <button type="button" className="pop-item" onClick={run(() => onOverwrite?.(project.id))}>
              Overwrite with current design
            </button>
          )}

          <div className="pop-sep" />
          <button type="button" className="pop-item" onClick={run(() => onArchive?.(project.id))}>
            {project.archived ? 'Restore' : 'Archive'}
          </button>
          {/* Deletion still goes through the card's type-the-name confirmation.
              This row only ARMS it — a one-click destroy inside a menu that also
              holds "Rename" is how people lose work. */}
          <button type="button" className="pop-item uh-menu-danger" onClick={run(() => onDelete?.(project.id))}>
            Delete…
          </button>
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import Menu from '../menu/Menu'
import { menuOpenKey } from '../menu/menuModel'
import { SYSTEM_PARTS } from '../../utils/userHome'

// Everything you can do to one project, from the ⋯ beside Save on its page
// (/projects/:id). It sat on every row of the old list; the rows are gone.
//
// ── WHY A MENU AND NOT A ROW OF BUTTONS ────────────────────────────────
//
// The card used to carry Load, Overwrite, Rename, Archive and Delete as five
// equally weighted pills in a wrapping row. The card needed MORE actions
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
// The shared Menu (components/menu/Menu.jsx), so this inherits the one keyboard
// model every menu in the app owes: arrows between rows, Escape closes and
// returns focus to the trigger, an outside press closes, Tab closes and carries
// on, and it flips at the viewport edge instead of being clipped. Below 768px it
// is a bottom action sheet with 52px rows.

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
  const [trigger, setTrigger] = useState(null)
  const [how, setHow] = useState({ keyboard: false, at: 'first' })

  const items = useMemo(() => [
    { type: 'section', label: 'Open in' },
    // Which of these would be starting from scratch, said on the row itself
    // rather than left for the user to discover after the navigation.
    ...SYSTEM_PARTS.map((part) => ({
      id: `open-${part.id}`,
      label: part.label,
      hint: digest?.parts?.find((p) => p.id === part.id)?.done ? undefined : 'Not set',
      onSelect: () => onOpenIn?.(project.id, part.tool),
    })),
    'sep',
    { id: 'duplicate', label: 'Duplicate', onSelect: () => onDuplicate?.(project.id) },
    { id: 'rename', label: 'Rename', onSelect: () => onRename?.(project.id) },
    { id: 'css', label: 'Copy CSS variables', onSelect: () => onExportCss?.(project.id) },
    ...(project.archived ? [] : [{ id: 'overwrite', label: 'Overwrite with current design', onSelect: () => onOverwrite?.(project.id) }]),
    'sep',
    { id: 'archive', label: project.archived ? 'Restore' : 'Archive', onSelect: () => onArchive?.(project.id) },
    // Deletion still goes through the card's type-the-name confirmation. This
    // row only ARMS it: a one-click destroy inside a menu that also holds
    // "Rename" is how people lose work.
    { id: 'delete', label: 'Delete…', danger: true, onSelect: () => onDelete?.(project.id) },
  ], [project.id, project.archived, digest, onOpenIn, onDuplicate, onRename, onExportCss, onOverwrite, onArchive, onDelete])

  const onTriggerKey = (e) => {
    const at = menuOpenKey(e)
    if (!at) return
    e.preventDefault()
    if (open) return
    setHow({ keyboard: true, at })
    setOpen(true)
  }

  return (
    <div className="uh-actions">
      <button
        type="button"
        ref={setTrigger}
        className="uh-actions-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${project.name}`}
        onClick={(e) => { setHow({ keyboard: e.detail === 0, at: 'first' }); setOpen((v) => !v) }}
        onKeyDown={onTriggerKey}
      >
        <Dots />
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchor={trigger}
        label={`Actions for ${project.name}`}
        items={items}
        viaKeyboard={how.keyboard}
        startAt={how.at}
        className="uh-menu"
      />
    </div>
  )
}

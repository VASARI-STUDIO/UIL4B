import { useState } from 'react'
import { projectDigest, relativeTime, paletteBands, partsLabel } from '../../utils/userHome'
import ProjectActions from './ProjectActions'

// One saved design system, read at a glance.
//
// Lives here rather than inside Projects.jsx so the acceptance suite can mount
// it directly. /projects needs a signed-in session to show a single card, and
// the suite has no way to create one — Firebase is unreachable in the sandboxed
// runner — so the card's rendered behaviour is covered by a fixture, the same way
// UiSystemBuilder and the type-save flow already are
// (tests/user-sim/fixtures/). A page-private component could not be.

export default function ProjectCard({
  project, isCurrent, onLoad, onDelete, onRename, onOverwrite, onArchive,
  folder, onFolderChange, folders, onOpenDetail, icon,
  onDuplicate, onExportCss, onOpenIn,
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const digest = projectDigest(project)
  const when = relativeTime(digest.updatedAt)

  return (
    <article className={`card proj-card uh-card${isCurrent ? ' proj-card-active' : ''}${project.archived ? ' is-archived' : ''}`}>
      {/* The palette itself, full-bleed across the top. No text sits on it, which
          is deliberate: the old header set the project name in white over a
          two-colour blend, so its contrast depended entirely on which colours the
          user had picked. Any palette could make the name unreadable. */}
      <div className="uh-card-art" style={{ background: paletteBands(digest.colors) }} aria-hidden="true" />

      <div className="uh-card-body">
        <div className="uh-card-top">
          {icon && <img src={icon} alt="" className="uh-card-icon" />}
          {/* The name is set in the UI face, NOT in the project's own heading
              family. Setting it in the project's family was the first build and
              it is a lie in the common case: a family is only fetched when a
              tool asks for it, so the card would render in Fraunces for a
              project whose font happened to be loaded and in the fallback for
              one whose was not — typography that varies for a reason the reader
              cannot see. Both families are named in the meta line below, which
              is true whatever is loaded. */}
          <button
            type="button"
            className="uh-card-name"
            onClick={() => onOpenDetail?.(project)}
            title="View project details"
          >
            {project.name}
          </button>
          {project.archived && <span className="uh-tag">Archived</span>}
          {isCurrent && !project.archived && <span className="uh-tag uh-tag--live">Loaded</span>}
          <ProjectActions
            project={project}
            digest={digest}
            onOpenIn={onOpenIn}
            onDuplicate={onDuplicate}
            onRename={() => setEditing(true)}
            onExportCss={onExportCss}
            onOverwrite={onOverwrite}
            onArchive={onArchive}
            onDelete={() => setConfirmDelete(true)}
          />
        </div>

        {editing ? (
          <div className="uh-card-rename">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { onRename(project.id, name); setEditing(false) } }}
              aria-label={`Rename ${project.name}`}
              autoFocus
            />
            <button className="btn btn-s btn-accent" onClick={() => { onRename(project.id, name); setEditing(false) }}>Save</button>
            <button className="btn btn-s" onClick={() => { setName(project.name); setEditing(false) }}>Cancel</button>
          </div>
        ) : (
          /* What is actually in it, in one mono line: the two faces, the scale,
             the colour count. Every value read off the project. */
          <p className="uh-card-meta">
            {digest.heading} / {digest.body}
            <span className="uh-dot">·</span>
            {digest.scaleBase}px / {digest.scaleRatio.toFixed(2)}×
            <span className="uh-dot">·</span>
            {digest.colourCount} colour{digest.colourCount === 1 ? '' : 's'}
            {digest.tintCount > 0 && (<><span className="uh-dot">·</span>{digest.tintCount} tints</>)}
          </p>
        )}

        <div className="uh-parts">
          <span
            className="uh-parts-dots"
            role="img"
            aria-label={`${digest.done} of ${digest.total} parts built: ${digest.parts.map(p => `${p.label} ${p.done ? 'built' : 'empty'}`).join(', ')}`}
          >
            {digest.parts.map((part) => (
              <span key={part.id} className={`uh-part${part.done ? ' is-done' : ''}`} />
            ))}
          </span>
          <span className={`uh-parts-label${digest.missing.length ? '' : ' is-complete'}`}>{partsLabel(digest)}</span>
          {when && <span className="uh-card-when">{when}</span>}
        </div>

        {confirmDelete ? (
          <div className="uh-card-confirm">
            <p>Type <strong>{project.name}</strong> to delete it. This cannot be undone.</p>
            <input
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder={project.name}
              aria-label={`Type the project name to confirm deleting ${project.name}`}
              autoFocus
            />
            <div className="uh-card-confirm-actions">
              <button
                className="btn btn-s uh-danger"
                onClick={() => { onDelete(project.id); setConfirmDelete(false); setDeleteConfirmText('') }}
                disabled={deleteConfirmText !== project.name}
              >
                Permanently delete
              </button>
              <button className="btn btn-s" onClick={() => { setConfirmDelete(false); setDeleteConfirmText('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="uh-card-foot">
            {!project.archived ? (
              <button className="btn btn-s btn-accent" onClick={() => onLoad(project.id)}>
                {isCurrent ? 'Reload' : 'Load'}
              </button>
            ) : (
              <button className="btn btn-s" onClick={() => onArchive(project.id)}>Restore</button>
            )}
            <label className="uh-card-folder">
              <span className="sr-only">Folder for {project.name}</span>
              <select value={folder || ''} onChange={e => onFolderChange(project.id, e.target.value)}>
                <option value="">No folder</option>
                {(folders || []).filter(f => f !== 'all').map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </article>
  )
}

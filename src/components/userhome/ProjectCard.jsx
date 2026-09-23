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
//
// ── IT IS A ROW NOW, NOT A CARD ────────────────────────────────────────
//
// The founder's call on 2026-09-16 was "the projects dashboard could use a full
// overhaul its terrible for design", on a surface he had already named once on
// 2026-09-13 as one of four that "feel AI generated". The card was the largest
// single reason, and the reading was made off the rendered page rather than off
// this file — three untouched projects at 1440, free plan:
//
//   · Each one was a bordered, filled, rounded, shadowed container topped with
//     a 40px full-bleed slab of the project's "palette" — which for a project
//     nobody has been in is one colour, so the row read as three identical
//     40px blocks of #0051FF. The loudest thing on the page belonged to the
//     three projects that contained nothing.
//   · The same container, art band and all, is what StarterRow draws for the
//     four rotating promos below. A person's own saved work and a suggestion
//     the product made up this morning were the same object.
//   · :hover lifted the whole thing 2px and dropped a large shadow under it.
//     Nothing about the project changed; the card just moved.
//
// So the container is gone. A project here is a set of VALUES — a palette, two
// faces, a scale, four parts of which some are built — and values belong in a
// ruled list, which is how Supabase
// (mobbin.com/screens/7d933e08-5076-4cf8-aef2-b16d6b2dba55), Squarespace
// (mobbin.com/screens/383a3ad2-fcdb-407a-a708-0f6d23a1ca44) and Descript
// (mobbin.com/screens/98e5fb4b-da68-40dc-a473-d08dbd12aa6a) all list projects.
// One hairline between rows, no fill, no radius, no shadow, and the palette
// shown as a specimen chip you can read the colours off rather than as a banner.
//
// THE CLASS NAMES ARE UNCHANGED ON PURPOSE. `.proj-card`, `.uh-card`,
// `.uh-card-art`, `.uh-card-meta`, `.uh-parts-label` and `.uh-card-name` are
// pinned by seven acceptance specs that measure this surface's geometry and
// contents. Renaming them would have made a design change look like a
// behavioural one in every one of those diffs. What the names MEAN is in
// src/styles/pages/projects.css.

export default function ProjectCard({
  project, isCurrent, onLoad, onDelete, onRename, onOverwrite, onArchive,
  onOpenDetail, icon, onDuplicate, onExportCss, onOpenIn,
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const digest = projectDigest(project)
  const when = relativeTime(digest.updatedAt)

  // HAS ANYBODY CHOSEN THESE COLOURS? Not "are there colours" — every saved
  // project has a palette, because ProjectContext snapshots the whole working
  // design on save, so an untouched one carries the single default seed.
  //
  // This is the SAME read the four dots use (utils/userHome.js, partsPresent),
  // deliberately: the chip and the dots are now one fact drawn twice rather
  // than two facts that can disagree. A project whose dots say "Nothing built
  // yet" cannot render a palette, because it does not have one.
  const hasPalette = digest.parts.some((p) => p.id === 'palette' && p.done)

  return (
    <article className={`proj-card uh-card${isCurrent ? ' proj-card-active' : ''}${project.archived ? ' is-archived' : ''}`}>
      {/* The palette, as a specimen chip at the head of the row. Hard stops, so
          these are the colours that are in the project and not an interpolation
          between them. No text sits on it, which is deliberate: the old header
          set the project name in white over a two-colour blend, so its contrast
          depended entirely on which colours the user had picked. Any palette
          could make the name unreadable. It was 40px tall and full-bleed until
          2026-09-16 — see the note at the top of this file for why it is not.

          AND IT IS ONLY FILLED IF SOMEBODY FILLED IT. Shrinking the slab was
          half a fix: three untouched projects still rendered three identical
          saturated blue squares — the first thing the eye landed on, on the
          three projects that contained nothing, every one of them meaning "the
          default, which nobody chose". A project with no palette gets the chip
          as an outline: same size, so the rows still align, no fill, so it
          carries no weight it has not earned. Colour on this page now means
          somebody picked a colour.

          The inline background is OMITTED rather than overridden, because an
          inline style outranks the stylesheet and `background:none` fighting
          `background:<gradient>` is a rule that breaks the moment either side
          is edited. */}
      <div
        className={`uh-card-art${hasPalette ? '' : ' is-unset'}`}
        style={hasPalette ? { background: paletteBands(digest.colors) } : undefined}
        aria-hidden="true"
      />

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
      </div>

      {/* The four parts and when it was last touched. A COLUMN of the row on a
          wide screen and a line under the name on a phone — one element either
          way, because what it says does not change with the width. */}
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
      </div>

      {/* "When" left the parts group and became its own column on 2026-09-16.
          It was the cause of the dead air mid-row at 1440: inside the parts
          flex it was pushed to that column's far right, so the row read as
          THREE loose clusters with two holes between them rather than as a
          row. Out here it right-aligns into the same group as Load and ⋯ —
          what the project is on the left, how it stands and what you can do to
          it on the right, one division. It is also the arrangement Descript
          (mobbin.com/screens/98e5fb4b-da68-40dc-a473-d08dbd12aa6a) and
          Squarespace (mobbin.com/screens/383a3ad2-fcdb-407a-a708-0f6d23a1ca44)
          both use: the time column sits beside the row's actions, not beside
          its contents. */}
      {when && <span className="uh-card-when">{when}</span>}

      {/* BOTH WAYS TO ACT ON THIS PROJECT NOW LIVE AT THE END OF ITS ROW. The ⋯
          used to sit immediately after the name while the primary control sat at
          the far side of the card, so the two affordances for one record were as
          far apart as the card was wide. Vercel's project rows
          (mobbin.com/screens/e2a9b3a7-e0e6-485f-925a-2de04392aeb0) and Toggl's
          (mobbin.com/screens/dfbf80d8-999d-4267-b6ff-633d5b86443c) both put the
          primary and the overflow together at the row's end; so does this. */}
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

      {confirmDelete ? (
        /* Spans the whole row rather than sitting in the action column: it is a
           form with a field in it, and a field squeezed into the width of a
           button is how somebody mistypes the name of the thing they are about
           to destroy. */
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
        /* NOT btn-accent any more. One filled control per screen, and on this
           page it is "New Project" in the masthead — the action a person came
           here to take that no row can offer. A filled blue pill repeated down
           every row made the page's loudest mark its most repeated one, and
           told a reader nothing about which project to open. */
        <div className="uh-card-foot">
          {!project.archived ? (
            <button className="btn btn-s" onClick={() => onLoad(project.id)}>
              {isCurrent ? 'Reload' : 'Load'}
            </button>
          ) : (
            <button className="btn btn-s" onClick={() => onArchive(project.id)}>Restore</button>
          )}
        </div>
      )}
    </article>
  )
}

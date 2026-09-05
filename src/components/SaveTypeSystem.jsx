import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { useProModal } from '../contexts/ProModalContext'
import { projectQuota } from '../utils/projectQuota'

// Where the typography tools meet the paywall — and the ONLY place they do.
//
// ── The decision this implements ────────────────────────────────────────────
//
// Founder, 2026-09-05, settling [typography-paywall-model]: "Browsing is free.
// Saving is Pro." Anyone may browse fonts, pair them and build a scale without
// an account. What costs money is KEEPING a type system.
//
// He chose that option because it matches how the colour tools already work, so
// the requirement is consistency with them rather than a scheme of our own. The
// colour line, read off the code rather than off the intention:
//
//   PaletteBuilder      building, seeding, extracting from an image, sharing a
//                       link, copying CSS, copying hex and downloading the PNG
//                       card are ALL free and need no account.
//   PaletteBuilder      "Save / export" → requireLogin(..., { free: true }).
//     :2374             Saving is free; it just needs somewhere to save TO.
//   ProjectContext      saveProject() throws once the account holds
//     .saveProject      plan.limits.projects. Free is 3, Pro is Infinity.
//   IconLibrary :693    the same, in the same words: "Saving is FREE — it just
//                       needs an account (projects are account-scoped)."
//
// So the colour tools gate the SLOT, not the work and not the export. This
// component is that same gate, moved to typography, and it deliberately adds
// nothing the colour tools do not already have.
//
// ── What is NOT gated, and why that is the point ────────────────────────────
//
// Export stays free here because it is free in colour ("Copy CSS variables" is
// an ungated item in the same menu the save gate sits in) and because the
// pricing page already SELLS it that way: the Free column of Plans.jsx reads
// "Unlimited palettes, scales, gradients and exports", and the comparison table
// repeats it. Gating Copy CSS in the Type Scale would have contradicted a live
// promise on the pricing page while calling itself consistency.
//
// The catalogue is not gated either. It is Google Fonts — public by
// construction, fetched from a public API, rendered from public URLs — so a
// gate over it would withhold nothing while destroying the browse experience
// that is what sells the tools. Mobbin, platform web, has the counter-example:
// Polywork (mobbin.com/screens/e1c3e76e-1625-4355-be2e-478c72275fea) marks
// "Font Pack 1 · Free" against "Font Pack 2 · Premium" in its typography
// picker, and Base44 (mobbin.com/screens/86131911-784e-4258-861a-c2bfd9216662)
// answers Export to ZIP with "Upgrade Required". Both are the shape this
// component refuses.
//
// ── Why the wall is a wall and not a disabled button ────────────────────────
//
// Twice now this repo has shipped a gate that only LOOKED like one: brand
// palette hexes rendered as visible text behind a lock, and a prompt library
// that counted positions in a FILTERED list so search walked straight through
// it. The lesson written into utils/lockedPreview.js is that the check belongs
// where the data is produced, not on the control that consumes it.
//
// There is no payload to strip here — a save button holds no secret — so
// splitLockedLibrary has nothing to wrap. The equivalent discipline is that at
// the cap this component renders NO name field and NO save button at all,
// rather than rendering them disabled or hidden by CSS. Deleting a stylesheet
// cannot produce a working control that was never in the tree, and `commit()`
// re-resolves the quota before it calls anything, so even a synthesised click
// on a control that does not exist would meet the same refusal. ProjectContext
// .saveProject() then throws on its own count as the innermost layer.
//
// Be honest about the ceiling: that innermost layer is client JavaScript over
// localStorage, and the Firestore rules let an owner write their own
// users/{uid}/sync/projects document freely. Someone who edits either can hold
// more than three projects. That is not a weakness introduced here — it is
// exactly the enforcement the colour tools, the icon library and the Projects
// page have had all along, because api/ is full at 12/12 routes and a test
// fails the build on a thirteenth. What is gated is storage, not information.
//
// ── The shape of the menu ───────────────────────────────────────────────────
//
// Mobbin, platform web. Mixpanel's Save Report dialog
// (mobbin.com/screens/73beb7a4-4ce4-4a88-acc1-2bd0cda5307a) and Amplitude's
// Save Chart dialog (mobbin.com/screens/2068eea3-4484-43d2-8231-dd4f5297feb7)
// both put the allowance INSIDE the save dialog as a live count — "0 of 5
// Saved Reports", "10 charts left in your Org's plan" — beside a save control
// that still works. That is the pattern: the number appears where the decision
// is made, not as a badge on a locked button.
//
// It is also why the count is conditional. projectQuota() stays silent while
// the allowance is comfortable (P-003: a countdown from the first project turns
// a foot in the door into a meter), speaks at 'approaching', and explains
// itself at 'full'.
//
// Savee (mobbin.com/screens/ced87a42-02f5-4010-ac2c-c4009cd0fa26) supplied the
// at-cap behaviour: its publish paywall sits over a toast that still reads
// "Site saved". The paid step is blocked; the work is not. So the overwrite
// list survives into the wall — a user at the cap can still commit this type
// system over a project they already own, and only the NEW slot is withheld.
//
// Gamma (mobbin.com/screens/ad4dc9a0-ad1b-440c-a7ec-2c7a577af805) placed the
// control: in its Fonts panel "Save theme" is the panel's terminal action,
// after the live editing rather than above it. Both tools mount this in their
// delivery section for that reason.
//
// -- Why this file exports two components -----------------------------------
//
// SaveTypeSystemMenu is the VIEW and holds no entitlement logic at all. It is
// handed a resolved quota and renders what that quota allows; at the cap it is
// given nothing to draw a save control WITH. SaveTypeSystem is the connected
// half that resolves the quota from the real store and owns every refusal.
//
// That is the same split utils/lockedPreview.js makes and for the same reason:
// a view that cannot receive a payload cannot leak one by mistake. It also
// makes the wall reachable in a real browser -- the acceptance fixture at
// tests/user-sim/fixtures/type-save.html mounts the view at 'clear',
// 'approaching' and 'full' side by side, which is the only way to SEE the
// at-cap state without a signed-in Firebase account in the suite.

// How many existing projects the overwrite list offers. Matches
// PaletteBuilder's `projects.slice(-5)` so the two menus behave alike.
const OVERWRITE_SHOWN = 5

function BookmarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/**
 * THE VIEW. No contexts, no entitlement checks, no store -- everything it knows
 * arrives as a prop, so it is incapable of deciding who may save.
 *
 * The one rule it does carry is structural rather than logical: when
 * `quota.atLimit` is true it renders the wall INSTEAD OF the name field and the
 * save button, not alongside them and not around them. There is no hidden
 * input, no `disabled` attribute and no CSS-hidden control, so nothing here can
 * be revealed by editing a stylesheet or flipping a class.
 */
export function SaveTypeSystemMenu({
  quota, projects, isPro, label, summary, name, onName, onSave, onOverwrite, onUpgrade,
}) {
  const recent = projects.slice(-OVERWRITE_SHOWN)
  return (
    <div className="svt-menu" role="dialog" aria-label={`Save ${label} to a project`}>
      {summary && <p className="svt-summary">{summary}</p>}

      {quota.atLimit ? (
        // THE WALL. No input, no save button -- absent, not disabled.
        <div className="svt-wall" data-testid="type-save-wall">
          <p className="svt-wall-head">
            You&rsquo;ve used all {quota.limit} projects on the free plan
          </p>
          <p className="svt-wall-body">
            Nothing has been removed and nothing here is locked &mdash; {label} is still
            yours to build, copy and export. To keep it as its own project, free a slot
            on <NavLink to="/projects" className="svt-link">your projects</NavLink>, or
            overwrite one below.
          </p>
          <button type="button" className="btn btn-accent btn-s svt-wall-btn" onClick={onUpgrade}>
            See what Pro adds
          </button>
        </div>
      ) : (
        <>
          <div className="svt-menu-title">Save to a project</div>
          <div className="svt-row">
            <input
              type="text"
              value={name}
              onChange={(e) => onName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSave() }}
              placeholder="Project name&hellip;"
              aria-label="Project name"
              className="svt-input"
            />
            <button type="button" className="btn btn-s btn-accent svt-save" onClick={onSave}>Save</button>
          </div>
          {/* Silent while the allowance is comfortable -- projectQuota owns that
              judgement, and it is pinned across every cap from 1 to 40 in
              tests/unit/project-quota.test.js. A countdown that starts on the
              first project turns a foot in the door into a meter (P-003). */}
          {quota.shouldTell && (
            <p className="svt-allowance" data-testid="type-save-allowance">
              {quota.remaining} more project{quota.remaining === 1 ? '' : 's'} on the free
              plan. <NavLink to="/plans" className="svt-link">Pro lifts the cap</NavLink>.
            </p>
          )}
        </>
      )}

      {recent.length > 0 && (
        <>
          {/* Survives into the wall on purpose. Savee blocks the paid step over a
              toast that still reads "Site saved": at the cap the NEW slot is
              withheld, never the work. */}
          <div className="svt-menu-sub">Overwrite existing</div>
          <div className="svt-list">
            {recent.map((p) => (
              <button key={p.id} type="button" className="svt-item" onClick={() => onOverwrite(p)}>
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}

      {!isPro && (
        <p className="svt-foot">
          Browsing, pairing, scales and exports stay free &mdash; the plan only decides
          how many systems you can keep.
        </p>
      )}
    </div>
  )
}

/**
 * The connected control. Owns the store, the entitlement and every refusal.
 *
 * @param {string} gate     the id this wall reports to trackUpgradeGate. Names
 *                          WHICH surface converted, so two tools sharing one
 *                          component still measure separately.
 * @param {string} label    what is being saved, in the user's words ("this
 *                          pairing", "this type scale"). Used in the login
 *                          prompt and the saved-confirmation toast.
 * @param {string} summary  one line naming the families/values that will be
 *                          written, so the user can see what a save captures.
 * @param {Function} toast  the page's toast channel.
 */
export default function SaveTypeSystem({ gate, label, summary, toast }) {
  const { saveProject, overwriteProject, projects, canSaveProjects, projectLimit } = useProject()
  const { isPro } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  const { openProModal } = useProModal()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const wrapRef = useRef(null)

  // The count that refuses the save is the SAME array saveProject() counts, so
  // the number shown and the rule enforced cannot drift apart. Pro resolves to
  // Infinity upstream, which projectQuota answers as 'unlimited' -- no count,
  // no wall, nothing to dismiss.
  const quota = useMemo(
    () => projectQuota(projects.length, projectLimit),
    [projects.length, projectLimit],
  )

  // Dismiss on outside pointerdown or Escape, matching every other menu on
  // these surfaces. Focus returns to the trigger on Escape so a keyboard user
  // is not dropped onto <body>.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      wrapRef.current?.querySelector('.svt-trigger')?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const raiseWall = useCallback(() => {
    openProModal({
      gate,
      eyebrow: 'Pro projects',
      title: 'Keep every type system you build',
      subtitle: `The free plan holds ${quota.limit} saved projects — palette, fonts and type scale together. Pro removes the cap, so every pairing and scale you build keeps its own project.`,
    })
  }, [gate, openProModal, quota.limit])

  // Saving is free and only needs an account, exactly as in PaletteBuilder and
  // IconLibrary. `free: true` keeps the login popup's copy off the Pro pitch --
  // this is not the upsell, it is the prerequisite.
  const trigger = useCallback(async () => {
    if (!canSaveProjects) {
      const user = await requireLogin(`save ${label}`, { free: true })
      if (!user) return
    }
    setOpen((v) => !v)
  }, [canSaveProjects, label, requireLogin])

  // Re-resolve rather than trust the render that drew the button. The at-cap
  // branch renders no save control at all, so this is belt-and-braces -- but it
  // is the brace that survives someone reintroducing a disabled button later.
  const commit = useCallback(() => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (projectQuota(projects.length, projectLimit).atLimit) {
      setOpen(false)
      raiseWall()
      return
    }
    try {
      saveProject(trimmed)
      setName('')
      setOpen(false)
      toast?.(`${trimmed} saved — fonts and type scale included`)
    } catch {
      // saveProject throws only on the cap. Name the paid edge rather than
      // surfacing its raw message as a failure (P-003: a gate must never read
      // as the product breaking).
      setOpen(false)
      raiseWall()
    }
  }, [name, projects.length, projectLimit, raiseWall, saveProject, toast])

  const overwrite = useCallback((project) => {
    overwriteProject(project.id)
    setOpen(false)
    toast?.(`Updated: ${project.name}`)
  }, [overwriteProject, toast])

  return (
    <div className="svt-wrap" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-s btn-accent svt-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={trigger}
      >
        <BookmarkIcon /> Save to a project
      </button>

      {open && (
        <SaveTypeSystemMenu
          quota={quota}
          projects={projects}
          isPro={isPro}
          label={label}
          summary={summary}
          name={name}
          onName={setName}
          onSave={commit}
          onOverwrite={overwrite}
          onUpgrade={raiseWall}
        />
      )}
    </div>
  )
}

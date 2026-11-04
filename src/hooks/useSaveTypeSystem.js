import { useCallback, useMemo, useState } from 'react'
import usePopover from './usePopover'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { reportUpgradeGate, useProModal } from '../contexts/ProModalContext'
import { projectQuota } from '../utils/projectQuota'

// The connected half of components/SaveTypeSystem.jsx: the store, the
// entitlement and every refusal, with no markup. That file's header explains
// the decision it implements and why the cap is a wall rather than a disabled
// button; SaveTypeSystemMenu there is the view these hooks feed.

/**
 * The connected logic, with no trigger of its own: it owns the store, the
 * entitlement and every refusal, and the caller draws the trigger and menu.
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
 * @returns {{open: boolean, setOpen: Function, trigger: Function, menuProps: object}}
 *          `trigger` asks for the account when one is needed, then toggles the
 *          menu; `menuProps` is everything SaveTypeSystemMenu takes.
 */
export function useSaveTypeSystem({ gate, label, summary, toast }) {
  const { saveProject, overwriteProject, projects, canSaveProjects, projectLimit } = useProject()
  const { isPro } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  const { openProModal } = useProModal()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  // The count that refuses the save is the SAME array saveProject() counts, so
  // the number shown and the rule enforced cannot drift apart. Pro resolves to
  // Infinity upstream, which projectQuota answers as 'unlimited' -- no count,
  // no wall, nothing to dismiss.
  const quota = useMemo(
    () => projectQuota(projects.length, projectLimit),
    [projects.length, projectLimit],
  )

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
  //
  // `signup: true` OPENS ON THE CREATE-ACCOUNT FORM, and it was missing here.
  // The branch only runs for somebody who cannot save projects, which signed
  // out means somebody with no account — and they were being greeted with
  // "Log in to continue", a form for an account they do not have, at the moment
  // they first tried to keep their work. PaletteBuilder's save and the export
  // gate both pass it (useExportGate.js:81 records the rule); this and the
  // Gradient community submit were the two that did not.
  const trigger = useCallback(async () => {
    if (!canSaveProjects) {
      const user = await requireLogin(`save ${label}`, { free: true, signup: true })
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

  return {
    open,
    setOpen,
    trigger,
    menuProps: {
      quota,
      projects,
      isPro,
      label,
      summary,
      name,
      onName: setName,
      onSave: commit,
      onOverwrite: overwrite,
      onUpgrade: () => { reportUpgradeGate('type-save-cap'); setOpen(false) },
    },
  }
}

/**
 * The same control for a tool toolbar. The page draws the trigger as a toolbar
 * button (and as an overflow row when the row is full) and mounts
 * <SaveTypeSystemPanel> once. usePopover owns outside-press, Escape and focus;
 * its trigger ref is empty while the button sits in the overflow, which it
 * tolerates.
 */
export function useSaveTypeSystemToolbar(options) {
  const save = useSaveTypeSystem(options)
  const { setOpen } = save
  const close = useCallback(() => setOpen(false), [setOpen])
  const { triggerRef, popRef } = usePopover(save.open, close)
  return { ...save, triggerRef, popRef }
}

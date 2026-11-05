import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import { useSubscription } from '../../contexts/SubscriptionContext'
import { useLoginPrompt } from '../../contexts/LoginPromptContext'
import SaveRefusal from '../SaveRefusal'
import ProjectPlate from './ProjectPlate'
import {
  BRAND_KIT_STEPS,
  clearAcceptedSteps,
  firstIncompleteStep,
  startGuide,
  withDefaults,
} from '../../utils/brandKitGuide'
import { whenText } from '../../utils/brandKitChooser'
import { partsPresent } from '../../utils/userHome'

// The one "Unsaved brand kit" row: work that was put aside when a new brand kit,
// a project or a shared palette took the working design's place. It lives in a
// single slot, so there is never more than one row. Continue takes it back as the
// working design, Save as project files it (the Free plan's cap applies, and a
// signed-out visitor signs in first), and Discard empties the slot with an Undo.

const toast = (detail) => window.dispatchEvent(new CustomEvent('uil4b:toast', { detail }))

export default function ParkedRow() {
  const navigate = useNavigate()
  const { parked, canSaveProjects, saveProject, continueParked, discardParked, putBackParked } = useProject()
  const { planKnown } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  const headId = useId()
  const [refusal, setRefusal] = useState('')
  const [saving, setSaving] = useState(false)
  // Set while the sign-in the save asked for is open; the save runs once the
  // account's own plan has arrived, so the cap is checked against the right plan.
  const pendingRef = useRef(false)

  const name = parked?.design?.identity?.name?.trim() || ''

  const saveParked = useCallback(() => {
    if (!parked) { setSaving(false); return }
    const projectName = name || 'Brand kit'
    try {
      saveProject(projectName, { from: parked.design })
      discardParked()
      toast({ message: `Saved ${projectName} to your projects.`, type: 'success' })
    } catch (err) {
      setRefusal(err?.message || 'That project could not be saved.')
    }
    setSaving(false)
  }, [discardParked, name, parked, saveProject])

  useEffect(() => {
    if (!pendingRef.current || !canSaveProjects || !planKnown) return
    pendingRef.current = false
    queueMicrotask(saveParked)
  }, [canSaveProjects, planKnown, saveParked])

  if (!parked?.design) return null

  const design = parked.design
  const colours = partsPresent(withDefaults(design)).palette ? design.palette?.colors || [] : []

  const onContinue = () => {
    const kept = continueParked()
    if (!kept) return
    startGuide()
    clearAcceptedSteps()
    navigate((firstIncompleteStep(kept, { accepted: [] }) || BRAND_KIT_STEPS[0]).path)
  }

  const onSave = async () => {
    setRefusal('')
    if (canSaveProjects) { saveParked(); return }
    setSaving(true)
    pendingRef.current = true
    const user = await requireLogin('save your project', { free: true, signup: true })
    if (!user) {
      pendingRef.current = false
      setSaving(false)
    }
  }

  const onDiscard = () => {
    const slot = discardParked()
    if (!slot) return
    toast({
      message: 'Unsaved brand kit discarded.',
      type: 'info',
      action: { label: 'Undo', onAction: () => putBackParked(slot) },
    })
    // The row is gone from under focus; the page's main landmark takes it.
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  return (
    <section className="uh-parked" aria-labelledby={headId}>
      <div className="spt-thumb"><ProjectPlate size="thumb" colors={colours} /></div>
      <div className="uh-parked-text">
        <h2 id={headId} className="uh-parked-name" title={name || undefined}>{name || 'Unsaved brand kit'}</h2>
        <p className="uh-parked-meta">Not saved yet · edited {whenText(parked.parkedAt)}</p>
      </div>
      <div className="uh-parked-actions">
        <button type="button" className="uh-ghost" onClick={onContinue}>Continue</button>
        <button type="button" className="uh-ghost" onClick={onSave} disabled={saving}>Save as project</button>
        <button type="button" className="uh-textbtn" onClick={onDiscard}>Discard</button>
      </div>
      {refusal && <SaveRefusal message={refusal} testId="parked-save-refusal" />}
    </section>
  )
}

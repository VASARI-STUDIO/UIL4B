import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useLoginPrompt } from '../contexts/LoginPromptContext'
import { BRAND_KIT_STEPS, clearAcceptedSteps, firstIncompleteStep, startGuide } from '../utils/brandKitGuide'

// The put-aside brand kit and what can be done with it: work that was put aside when a new brand kit, a
// project or a shared palette took the working design's place. One kit shows, the newest; older ones wait
// behind it (`more` counts them) and take its place when it is continued, saved or discarded. Continue takes
// it back as the working design, Save as project files it (the Free plan's cap applies, and a signed-out
// visitor signs in first), and Discard empties the slot with an Undo.

const toast = (detail) => window.dispatchEvent(new CustomEvent('uil4b:toast', { detail }))

export default function useParkedKit() {
  const navigate = useNavigate()
  const { parked, parkedMore = 0, canSaveProjects, projectCountPending, saveProject, continueParked, discardParked, putBackParked } = useProject()
  const { planKnown } = useSubscription()
  const { requireLogin } = useLoginPrompt()
  const [refusal, setRefusal] = useState('')
  const [saving, setSaving] = useState(false)
  // Set while the sign-in the save asked for is open; the save runs once the
  // account's own plan has arrived, so the cap is checked against the right plan.
  const pendingRef = useRef(false)

  // The kit may have come straight from the account (a first sign-in), so its shape is
  // not taken on trust: a name that is not text reads as none.
  const rawName = parked?.design?.identity?.name
  const name = typeof rawName === 'string' ? rawName.trim() : ''

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
    if (!pendingRef.current || !canSaveProjects || !planKnown || projectCountPending) return
    pendingRef.current = false
    queueMicrotask(saveParked)
  }, [canSaveProjects, planKnown, projectCountPending, saveParked])

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

  return { parked: parked?.design ? parked : null, more: parkedMore, name, refusal, saving, onContinue, onSave, onDiscard }
}

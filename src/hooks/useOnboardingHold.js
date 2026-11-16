import { useSyncExternalStore } from 'react'
import { onboardingHeld, subscribeOnboardingHold } from '../utils/exportHold'

/** True while an export started signed out is still running. */
export default function useOnboardingHold() {
  return useSyncExternalStore(subscribeOnboardingHold, onboardingHeld, () => false)
}

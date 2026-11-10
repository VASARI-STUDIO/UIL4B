import { useSyncExternalStore } from 'react'

// The search shortcut as a label: the command key on Apple platforms, Control
// elsewhere. The server snapshot is the non-Apple one, so the markup the server
// renders matches the first client render.
const noopSubscribe = () => () => {}
const isApplePlatform = () => /Mac|iPhone|iPad|iPod/i.test(
  navigator.userAgentData?.platform || navigator.platform || '',
)

export function useShortcutHint() {
  const apple = useSyncExternalStore(noopSubscribe, isApplePlatform, () => false)
  return apple ? '⌘K' : 'Ctrl K'
}

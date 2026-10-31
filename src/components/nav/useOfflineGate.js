import { useId } from 'react'
import useOnline from '../../hooks/useOnline'

/**
 * The offline gate for a menu's sign-in rows. `gate` spreads onto each such
 * control (aria-disabled plus the describedby link to the offline note, nothing
 * when online); the control's own handler must still check `online`, because
 * aria-disabled does not stop a click.
 */
export default function useOfflineGate() {
  const online = useOnline()
  const noteId = useId()
  return {
    online,
    noteId,
    gate: online ? {} : { 'aria-disabled': 'true', 'aria-describedby': noteId },
  }
}

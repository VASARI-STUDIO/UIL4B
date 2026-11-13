// The maintenance switch. Nothing in the app turns it on by itself.
//
//   · Build flag: set VITE_MAINTENANCE=1 for a deploy and every visitor sees the
//     maintenance page inside the full shell. A deploy without it clears it.
//   · Test seam: in dev and test builds, `uil4b-maintenance` = `on` in
//     sessionStorage shows the page without a rebuild. It does nothing in a
//     production build.
//
// The switch is a notice, not access control: it replaces what the app shows,
// and gates nothing behind it.

export const MAINTENANCE_KEY = 'uil4b-maintenance'

const BUILD_FLAG = import.meta.env.VITE_MAINTENANCE === '1'
const SEAM = import.meta.env.DEV || import.meta.env.MODE === 'test'

function seamOn() {
  try {
    return window.sessionStorage.getItem(MAINTENANCE_KEY) === 'on'
  } catch {
    return false
  }
}

export function maintenanceOn() {
  if (typeof window === 'undefined') return BUILD_FLAG
  if (SEAM && seamOn()) return true
  return BUILD_FLAG
}

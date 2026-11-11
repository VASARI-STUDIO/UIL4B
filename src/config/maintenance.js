// The maintenance switch. Nothing in the app turns it on by itself.
//
//   · Build flag: set VITE_MAINTENANCE=1 for a deploy and every visitor sees the
//     maintenance page inside the full shell. A deploy without it clears it.
//   · Per tab: a successful "Check again" stores `off` for the tab, so the person
//     who just confirmed the site is reachable gets the app instead of the page.
//   · Test seam: in dev and test builds, `uil4b-maintenance` = `on` in
//     sessionStorage shows the page without a rebuild. It does nothing in a
//     production build.

export const MAINTENANCE_KEY = 'uil4b-maintenance'

const BUILD_FLAG = import.meta.env.VITE_MAINTENANCE === '1'
const SEAM = import.meta.env.DEV || import.meta.env.MODE === 'test'

function read() {
  try {
    return window.sessionStorage.getItem(MAINTENANCE_KEY) || ''
  } catch {
    return ''
  }
}

export function maintenanceOn() {
  if (typeof window === 'undefined') return BUILD_FLAG
  const tab = read()
  if (tab === 'off') return false
  if (tab === 'on' && SEAM) return true
  return BUILD_FLAG
}

/** Remember, for this tab, that UIL4B answered. */
export function clearMaintenanceForTab() {
  try {
    window.sessionStorage.setItem(MAINTENANCE_KEY, 'off')
  } catch {
    // Storage blocked: the page still reloads, and the flag decides again.
  }
}

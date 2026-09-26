import { useEffect, useState } from 'react'
import { readRecentExports, RECENT_EXPORTS_EVENT, RECENT_EXPORTS_KEY } from '../utils/recentExports'
import { onAccountApplied } from '../utils/accountEvents'

function read() {
  try { return readRecentExports(localStorage) } catch { return [] }
}

/**
 * The signed-in person's recent exports, newest first (up to 20), live: a new
 * export, another tab's export and the account's copy arriving from another
 * device all update it. Each entry:
 *
 *   { id, tool, toolLabel, format, filename, bytes, at, projectId }
 *
 * Render with formatBytes / formatWhen from utils/recentExports for the rows
 * the design draws (TYPE · NAME · SIZE · WHEN).
 */
export default function useRecentExports() {
  const [list, setList] = useState(read)
  useEffect(() => {
    const refresh = () => setList(read())
    const onStorage = (e) => { if (!e.key || e.key === RECENT_EXPORTS_KEY) refresh() }
    window.addEventListener(RECENT_EXPORTS_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    const off = onAccountApplied([RECENT_EXPORTS_KEY], refresh)
    return () => {
      window.removeEventListener(RECENT_EXPORTS_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
      off()
    }
  }, [])
  return list
}

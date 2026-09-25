import { useState } from 'react'
import useRecentExports from '../../hooks/useRecentExports'
import { formatBytes, formatWhen } from '../../utils/recentExports'

// The workspace's "Recent exports" list: one row per file this account
// exported, newest first — the file type, its name, its size and when. The
// list follows the account (useRecentExports), so it is the same on every
// device. With nothing exported yet there is nothing to list, and the section
// is not drawn.
const SHOWN = 6

export default function RecentExports() {
  const list = useRecentExports()
  // Read once per mount: the relative times are for a glance, not a clock.
  const [now] = useState(() => Date.now())
  if (!list.length) return null
  return (
    <section className="uh-exports" aria-labelledby="uh-exports-h">
      <h2 className="uh-exports-h" id="uh-exports-h">Recent exports</h2>
      <ul className="uh-exports-list">
        {list.slice(0, SHOWN).map((e) => (
          <li key={e.id} className="uh-export">
            <span className="uh-export-type">{e.format}</span>
            <span className="uh-export-name" title={e.filename}>{e.filename}</span>
            {formatBytes(e.bytes) && <span className="uh-export-meta">{formatBytes(e.bytes)}</span>}
            <span className="uh-export-meta">{formatWhen(e.at, now)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

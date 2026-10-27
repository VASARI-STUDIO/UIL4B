import { useState } from 'react'
import useRecentExports from '../../hooks/useRecentExports'
import { formatWhen } from '../../utils/recentExports'

// The workspace's "Recent exports" list, in the rail under Today: one row per file this account
// exported, newest first — the file type, its name and when. The list follows the account
// (useRecentExports), so it is the same on every device. With nothing exported yet there is nothing to
// list, and the section is not drawn.
//
// Six are rendered; the stylesheet shows four at every width (the dashboard spec), so the list stays as
// short as the column beside it and the same length on a phone.
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
            <span className="uh-export-meta">{formatWhen(e.at, now)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

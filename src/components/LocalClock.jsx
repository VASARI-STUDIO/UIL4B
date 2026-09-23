import { useEffect, useState } from 'react'

// The dashboard's date and time, read from the VIEWER'S OWN MACHINE.
//
// Founder request, 2026-09-18: "in the dashboard page lets show a date and time
// make it connect to their browser / computer."
//
// ── Why it renders nothing on the first pass ────────────────────────────────
//
// This app prerenders 39 route shells at build time (scripts/prerender.mjs).
// A component that formatted `new Date()` during render would bake BUILD TIME
// into those shells — so a visitor's first paint would show the moment the
// deploy ran, sometimes days old, and search engines would index it. Worse, it
// is the classic hydration mismatch: the server's string and the client's
// string differ by definition, and React would swap the text under the reader.
//
// So `now` starts as null and is only ever set from inside an effect, which
// does not run during prerender. The element is absent until the browser has
// answered, and the browser is the only thing that can answer this question.
//
// ── Why it ticks on the minute, not the second ─────────────────────────────
//
// A seconds display on a dashboard is noise — nobody is timing anything here —
// and it would re-render this subtree sixty times a minute for the whole visit.
// The interval is aligned to the next real minute boundary first, so the
// display flips when the clock does rather than up to 59s late.
//
// ── Accessibility ──────────────────────────────────────────────────────────
//
// No `aria-live`. A live region here would announce the time to a screen reader
// every minute, interrupting whatever the reader was doing, to deliver
// something they did not ask for and can get from their own OS. It is a <time>
// element with a machine-readable dateTime, which is what actually helps.
export default function LocalClock({ className }) {
  const [now, setNow] = useState(null)

  useEffect(() => {
    // Set immediately so the element appears on mount rather than up to a
    // minute later.
    setNow(new Date())
    let interval = null
    // Align to the next minute boundary, then tick once a minute from there.
    const toNextMinute = 60000 - (Date.now() % 60000)
    const timeout = setTimeout(() => {
      setNow(new Date())
      interval = setInterval(() => setNow(new Date()), 60000)
    }, toNextMinute)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  if (!now) return null

  // `[]` as the locale argument, not a hardcoded 'en-GB' or 'en-US': it means
  // "use the browser's own preference", which is the whole point of the
  // request and matches how this page already formats project dates.
  // Omitting timeZone likewise resolves to the machine's own zone.
  const date = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <time className={className} dateTime={now.toISOString()}>
      {date}
      <span aria-hidden="true"> · </span>
      {time}
    </time>
  )
}

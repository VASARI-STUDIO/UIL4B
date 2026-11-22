// One shared clock for the animated icon grid's play-once icons.
//
// A play-once icon stops when it finishes, so while it is on screen it is
// restarted on this clock. Every subscriber shares one interval, which runs only
// while at least one cell is subscribed and the page is visible: a hidden tab or
// a grid with nothing animated in view keeps no timer at all.
export const LOOP_MS = 3200

const subs = new Set()
let timer = null
let listening = false

const hidden = () => typeof document !== 'undefined' && document.hidden

function sync() {
  if (subs.size > 0 && !hidden()) {
    if (timer == null) timer = setInterval(() => { for (const cb of [...subs]) cb() }, LOOP_MS)
  } else if (timer != null) {
    clearInterval(timer)
    timer = null
  }
}

/** Call `cb` every LOOP_MS while subscribed. Returns the unsubscribe function. */
export function subscribeLoopClock(cb) {
  subs.add(cb)
  if (!listening && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', sync)
    listening = true
  }
  sync()
  return () => { subs.delete(cb); sync() }
}

/** Whether the interval is running (for checks). */
export const loopClockRunning = () => timer != null

// How long a toast stays on screen.
//
// Every toast used to get 1.8 seconds, whatever it said. That is right for
// "Project saved" (13 characters, read before it has finished sliding in) and
// wrong for "Free plan saves up to 3 projects — go Pro for unlimited." (56
// characters), which the flow audit (#436) watched disappear before a person
// could finish it. Reading speed is the rule here: a second to notice the
// toast, then roughly 50ms a character, which puts a 13-character success at
// the old floor and a 56-character refusal at 3.8 seconds.
//
// An error is different in kind, not just in length. It is telling the person
// that what they tried did not happen, and it may be the only place that is
// said — so it holds for at least six seconds and carries a dismiss control
// (Toast.jsx) for anyone who has read it sooner. Success stays short: a green
// tick that lingers is noise on the next action.
//
// DOM-free and React-free so the numbers can be tested as numbers.

export const TOAST_MIN_MS = 1800
export const TOAST_MAX_MS = 6000
export const TOAST_ERROR_MIN_MS = 6000
export const TOAST_MS_PER_CHAR = 50
export const TOAST_NOTICE_MS = 1000

export function toastDuration(message, kind = 'success') {
  const chars = String(message ?? '').length
  const read = Math.min(TOAST_MAX_MS, Math.max(TOAST_MIN_MS, TOAST_NOTICE_MS + chars * TOAST_MS_PER_CHAR))
  return kind === 'error' ? Math.max(TOAST_ERROR_MIN_MS, read) : read
}

// The first-palette coach: the rules that decide whether the Palette Builder
// shows its two-beat hint, apart from the component that draws it.
//
// DOM-free and React-free, so the rules can be tested without a browser (the
// same split utils/brandKitGuide.js makes for the walkthrough).
//
// WHEN IT SHOWS. Only when the builder is opened by one of the two doors that
// mean "make your first palette": the workspace's first-palette card and the
// onboarding palette card. Both pass FIRST_PALETTE_STATE as router state, so a
// plain visit to /create/palette never meets it.
//
// WHEN IT STOPS. For good, once it is dismissed (the close, Hide tips, Escape)
// or the palette is saved. The flag lives in localStorage under a key that
// utils/accountSync.js lists as account-bound, so a dismissal made on one
// device holds on the others; signed out, localStorage is the whole record.
//
// The flag is READ when the page mounts and WRITTEN on dismissal. Rendering
// never writes it: React can render, discard and render again.

/** Set to '1' once the person has dismissed the coach or saved their palette. */
export const COACH_KEY = 'vs-palette-coach'

/** Router state the two doors navigate with. */
export const FIRST_PALETTE_STATE = Object.freeze({ firstPalette: true })

/** The name the save field opens with while the coach is up. */
export const FIRST_PALETTE_NAME = 'My first palette'

/** Did this navigation ask for the coach? */
export const coachRequested = (state) => !!state && state.firstPalette === true

function store(storage) {
  if (storage) return storage
  try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null }
}

/** Has the coach been dismissed already, on this device or (through sync) any other? */
export function coachDismissed(storage) {
  try { return store(storage)?.getItem(COACH_KEY) === '1' } catch { return false }
}

/** Record the dismissal. Called on a dismiss or a save, never while rendering. */
export function dismissCoach(storage) {
  try { store(storage)?.setItem(COACH_KEY, '1') } catch { /* quota / blocked */ }
}

/**
 * The two beats. Beat 1 points at the seed control and waits for the edit;
 * beat 2 points at Save. `count` is the label above the title.
 */
export const COACH_BEATS = Object.freeze([
  Object.freeze({
    id: 'edit',
    count: '1 of 2',
    title: 'Make it yours',
    body: 'Change the first colour to your brand colour. Every other colour updates with it.',
  }),
  Object.freeze({
    id: 'save',
    count: '2 of 2',
    title: 'Keep it',
    body: 'Save puts this palette in your projects, on any device.',
  }),
])

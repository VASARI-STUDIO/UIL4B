// Opens an interruption prompt (login / plans / checkout) in a new tab so the
// user keeps their working context — an in-progress icon edit, a half-built
// palette — instead of being navigated away. Firebase auth and the user-doc
// subscription snapshot both sync across tabs, so the original tab picks up
// the sign-in / Pro upgrade on its own once it completes over there.
// Deliberate navigation (the top-bar Log in / Get started) stays same-tab.
export function openInNewTab(path) {
  const win = window.open(path, '_blank')
  if (win) { win.opener = null; return }
  // Popup blocked — same-tab navigation beats a silently dead button.
  window.location.assign(path)
}

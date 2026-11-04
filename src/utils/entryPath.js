// The path this tab first loaded, read before the app renders or the router
// rewrites history. Pages use it to tell a fresh load from in-app navigation.
export const ENTRY_PATH = typeof window !== 'undefined' ? window.location.pathname : ''

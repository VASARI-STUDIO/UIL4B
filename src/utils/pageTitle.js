// The tab title has one owner: the route effect in App. A page whose title cannot
// come from the route table (one that depends on what it finds, at an address the
// table has no entry for) sets an override here instead of writing
// document.title, because the route effect runs after the page's own effects on
// every navigation and would overwrite a direct write.
let override = null
let routeTitle = ''

/** The title the route effect should show: the page's override, else the route's own. */
export function resolveRouteTitle(title) {
  routeTitle = title
  return override || title
}

/** Holds `title` until the returned release runs, then goes back to the route's title. */
export function holdPageTitle(title) {
  override = title
  document.title = title
  return () => {
    if (override !== title) return
    override = null
    if (routeTitle) document.title = routeTitle
  }
}

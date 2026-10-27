// A destination this app can navigate to without leaving it: a path on this
// origin. A browser reads `//host` and `/\host` as another origin, and strips
// tabs and line breaks from a URL before it reads it, so `/\t/host` becomes
// `//host`. A `from` taken from router state or storage is accepted only when
// it clears all of those.
export function isLocalPath(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !/[\t\r\n\\]/.test(value)
    && !value.startsWith('//')
}

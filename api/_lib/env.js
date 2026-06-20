// Shared env-var sanitiser for serverless functions. Files in /api/_lib are
// underscore-prefixed and NOT deployed as routes, so this adds no function count.
//
// API keys pasted into a dashboard frequently arrive with surrounding quotes or
// a trailing newline. Those survive into `Bearer <key>` headers and `?key=<key>`
// URLs, where a stray newline is an invalid HTTP header value (the fetch throws)
// and wrapping quotes make the provider reject the key — which looks exactly like
// "the key is wrong" even when the key itself is correct.

export function cleanKey(v) {
  if (!v) return ''
  let s = String(v).trim()
  // Strip one pair of wrapping quotes (e.g. "sk-abc" or 'sk-abc').
  if (s.length >= 2 && ((s[0] === '"' && s[s.length - 1] === '"') || (s[0] === "'" && s[s.length - 1] === "'"))) {
    s = s.slice(1, -1).trim()
  }
  // Remove any embedded CR/LF that would corrupt a header or URL.
  return s.replace(/[\r\n]+/g, '')
}

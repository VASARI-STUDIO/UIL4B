// What the sign-up form accepts before it asks Firebase to make an account.
// Pure, so the rules are testable without a browser; AuthForm calls these.

export const PASSWORD_MIN = 6
// Same cap as the display name in Settings; 254 is the longest address SMTP allows.
export const NAME_MAX = 200
export const EMAIL_MAX = 254

// A password of spaces passes the input's own `minLength` (it counts spaces),
// so the check counts only the characters that are not whitespace.
export function passwordIsWeak(password) {
  return String(password ?? '').replace(/\s/g, '').length < PASSWORD_MIN
}

// Which error line a refused password gets, or null if it is fine. Long enough
// to look like six characters but not once spaces are set aside: the plain
// "at least 6 characters" would tell the person they had already done that.
export function passwordProblem(password) {
  if (!passwordIsWeak(password)) return null
  return String(password ?? '').length >= PASSWORD_MIN ? 'weakPasswordSpaces' : 'weakPassword'
}

// The name is optional: whitespace alone is no name, and the ends are cut.
export function cleanDisplayName(name) {
  return String(name ?? '').trim().slice(0, NAME_MAX)
}

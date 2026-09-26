// The identity a Pro UI kit is personalised with: a name and an optional
// description, kept on the working design (`design.identity`) beside the logo,
// so they follow the account and travel with a saved project like every other
// design choice.
//
// DOM-free so the renderer, the panel and the unit tests read one contract.
// Every field is treated as untrusted: the working design is also a
// localStorage blob that any version of the app, or a person, may have written.

/** The longest name the kit sets, in characters. */
export const IDENTITY_NAME_MAX = 120
/** The longest description the kit sets, in characters. */
export const IDENTITY_DESCRIPTION_MAX = 280

const clean = (value, max) => (typeof value === 'string'
  ? value.replace(/\s+/g, ' ').trim().slice(0, max)
  : '')

/** `design.identity` as { name, description }, both strings, trimmed and capped. */
export function readIdentity(design) {
  const raw = design?.identity
  if (!raw || typeof raw !== 'object') return { name: '', description: '' }
  return {
    name: clean(raw.name, IDENTITY_NAME_MAX),
    description: clean(raw.description, IDENTITY_DESCRIPTION_MAX),
  }
}

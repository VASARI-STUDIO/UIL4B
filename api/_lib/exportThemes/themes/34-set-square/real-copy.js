// Which words Set Square prints for real in the slot edition (meta.realCopy, read by engine/placeholders.js).
// What the project itself gave stays as words: its name, its colours' names and what each is for, and how a pair is used.
// Everything else the user still has to write (the voice, the lines, the type samples, the logo's use) stays a designed
// placeholder. Returning undefined leaves the placeholder.
export function realCopy(path, value) {
  // no project name: the user still has to write it
  if (path === 'name' || path === 'logo.showcase.wordmark') return value === 'Your brand' ? undefined : value;
  if (/^colours\.\d+\.(name|lands|roleText)$/.test(path)) return value;
  if (/^pairs\.\d+\.use$/.test(path)) return value;
  return undefined;
}

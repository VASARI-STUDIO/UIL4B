// Which words Flyleaf prints for real in the slot edition (meta.realCopy, read by engine/placeholders.js).
// What the project itself gave stays as words: its name, its colours' names and what each is for, and how a pair is used. The type pages
// show pangrams, which nobody mistakes for the brand's own copy. Everything else the user still has to write (the voice, the lines, the
// logo's use, the sample UI copy) stays a dashed placeholder. Returning undefined leaves the placeholder.
const SPECIMEN = {
  headline: 'Pack my box with five dozen liquor jugs',
  paragraph: 'How vexingly quick daft zebras jump. The job requires extra pluck and zeal from every young wage earner, and the five boxing wizards jump quickly.',
  caption: 'Figure 1. Sphinx of black quartz, judge my vow.',
};

export function realCopy(path, value) {
  // no project name: the user still has to write it
  if (path === 'name' || path === 'logo.showcase.wordmark') return value === 'Your brand' ? undefined : value;
  if (/^colours\.\d+\.(name|lands|roleText)$/.test(path)) return value;
  if (/^pairs\.\d+\.use$/.test(path)) return value;
  const m = /^type\.sample\.(headline|paragraph|caption)$/.exec(path);
  return m ? SPECIMEN[m[1]] : undefined;
}

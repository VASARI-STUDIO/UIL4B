// Which words theme 21 prints for real in the slot edition (meta.realCopy, read by engine/placeholders.js).
// What the project itself gave (its name, its colours and what each is for) and the generic sample copy a component needs to read as a
// component (a button label, a form field, a type specimen) stay as words. A dashed placeholder is left only for what the user still
// has to write: the voice, the imagery, the logo's use, the contact lines. Returning undefined leaves the placeholder.

const SENTENCE = (s) => { const t = String(s).trim(); return t ? t[0].toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.') : t; };

// Pangram specimens for the type pages: they show the faces, and nobody mistakes them for the brand's own copy.
const SPECIMEN = {
  headline: 'Pack my box with five dozen liquor jugs',
  paragraph: 'How vexingly quick daft zebras jump. The job requires extra pluck and zeal from every young wage earner, and the five boxing wizards jump quickly.',
  caption: 'Figure 1. Sphinx of black quartz, judge my vow.',
};

// The kit's sample copy where the skeleton's wording reads as unfilled ("First field", "Say how to fix it."): plain product copy instead.
const UI_SAMPLE = {
  'ui.screen.title': 'Overview',
  'ui.screen.content.pickup': 'Status changed a moment ago.',
  'ui.screen.content.rider': 'Alex Morgan',
  'ui.screen.content.initials': 'AM',
  'ui.screen.content.riderNote': 'Step 3 of 5',
  'ui.screen.content.form.title': 'Details',
  'ui.screen.content.form.pickup': 'Name',
  'ui.screen.content.form.pickupValue': 'Alex Morgan',
  'ui.screen.content.form.dropoff': 'Email',
  'ui.screen.content.form.dropoffValue': 'alex@example.com',
  'ui.screen.content.form.ready': 'Quantity',
  'ui.screen.content.form.readyError': 'Enter a number from 1 to 50.',
  'ui.screen.content.form.size': 'Size',
  'ui.screen.content.form.notes': 'Notes',
  'ui.screen.content.form.notesHelp': 'Anything we should know.',
  'ui.screen.content.form.bookWhy': 'Fill in the fields above to continue.',
  'ui.screen.content.empty.body': 'Add your first item and it shows up here.',
  'ui.screen.content.dialog.title': 'Move this item?',
  'ui.screen.content.dialog.body': 'You can undo this for the next 24 hours.',
  'ui.screen.content.toast': 'Changes saved.',
  'ui.screen.content.alert': 'Your changes are waiting to be saved.',
  'ui.screen.content.inline': 'You can change this later.',
  'ui.screen.content.example.statLabel': 'Items done',
  'ui.screen.content.paidLabel': 'Total',
  'ui.screen.content.paid': '$24.50',
};
const UI_LIST = {
  'ui.screen.content.form.sizes': ['Small', 'Large'],
  'ui.screen.content.example.checks': ['Email me updates', 'Show hints', 'Remember me'],
  'ui.screen.content.example.switches': ['Notifications', 'Dark mode'],
  'ui.screen.content.example.radios': ['Standard', 'Express'],
  'ui.screen.content.example.tabs': ['Overview', 'Activity', 'Settings'],
};
const LINKS = ['Home', 'Search', 'Profile'];

export function realCopy(path, value) {
  if (path === 'name' || path === 'logo.showcase.wordmark') return value === 'Your brand' ? undefined : value;  // no project name: the user still has to write it
  let m;
  if ((m = /^colours\.\d+\.(name|lands|roleText)$/.exec(path))) return m[1] === 'lands' ? SENTENCE(value) : value;
  if (/^pairs\.\d+\.use$/.test(path)) return value;
  if ((m = /^type\.sample\.(headline|paragraph|caption)$/.exec(path))) return SPECIMEN[m[1]];
  if (!path.startsWith('ui.')) return undefined;
  if (path in UI_SAMPLE) return UI_SAMPLE[path];
  if ((m = /^(.*)\.(\d+)$/.exec(path)) && UI_LIST[m[1]]) return UI_LIST[m[1]][Number(m[2])] ?? value;
  if ((m = /^ui\.screen\.content\.example\.links\.(\d+)\.0$/.exec(path))) return LINKS[Number(m[1])] ?? value;
  if (/^ui\.screen\.content\.deliveries\.\d+\.when$/.test(path)) return value.replace('A short note', 'on schedule');
  return value;
}

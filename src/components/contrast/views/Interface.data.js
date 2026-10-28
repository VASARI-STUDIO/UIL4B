// Rostra: the copy and numbers of the Interface view. A rostering app for a
// small cafe group, open at Settings > Notifications. Plain data, no React, so a
// test can read the words without a DOM.
//
// Every string here is printed in the pair's two colours at a fixed size, so the
// sizes are part of the data: 28px title, 16px field name, 14px labels, 12px
// helper and meta text.

export const BRAND = 'Rostra'

// Settings is the current page. Each item gets a 20px line icon in the view.
export const NAV = [
  { id: 'roster', label: 'Roster' },
  { id: 'team', label: 'Team' },
  { id: 'timesheets', label: 'Timesheets' },
  { id: 'settings', label: 'Settings', current: true },
  { id: 'billing', label: 'Billing' },
]

export const HEAD = {
  title: 'Notifications',
  meta: 'Fitzroy and Collingwood \u00b7 14 people',
}

// This week's shifts. A shift is its start and finish hour, drawn as an outline.
export const WEEK = {
  label: 'This week',
  days: [
    { name: 'Mon', shifts: ['6\u20132', '2\u20139'] },
    { name: 'Tue', shifts: ['6\u20132'] },
    { name: 'Wed', shifts: ['6\u20132', '2\u20139'] },
    { name: 'Thu', shifts: ['2\u20139'] },
    { name: 'Fri', shifts: ['6\u20132', '2\u20139'] },
    { name: 'Sat', shifts: ['7\u20133', '3\u20139'] },
    { name: 'Sun', shifts: ['7\u20133'] },
  ],
}

export const FORM = {
  reminders: {
    label: 'Shift reminders',
    help: 'Sent by text message before each shift starts.',
  },
  lead: { label: 'Remind staff', value: '2 hours before' },
  email: {
    label: 'Reply-to email',
    value: 'rosters@thegrindcafe.com.au',
    help: 'Staff replies go here, not to Rostra.',
  },
  digest: 'Also email the weekly roster on Sunday at 6 pm',
}

export const ACTIONS = { cancel: 'Cancel', save: 'Save changes' }

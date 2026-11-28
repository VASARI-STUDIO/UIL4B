// Theme 36, Doorlist: the UI style guide's page list. The 13 ids and the Free 7 are shared by every theme's guide; the route skips an id with no function.
export const UI_PAGES = ['cover', 'contents', 'screen', 'dark', 'roles', 'tints', 'type', 'buttons', 'fields', 'feedback', 'overlays', 'space', 'handoff'];
// The Free skeleton: a fixed shorter list, chosen from the account's plan in the route (ctx.skeleton), never from a request.
export const UI_SKELETON = ['cover', 'screen', 'roles', 'type', 'buttons', 'fields', 'handoff'];
export const uiOrder = (ctx) => (ctx.skeleton ? UI_SKELETON : UI_PAGES);

export const NAMES = {
  cover: 'Cover', contents: 'Contents', screen: 'Screen', dark: 'Dark', roles: 'Colour roles', tints: 'Tints and pairs', type: 'Type', buttons: 'Buttons', fields: 'Fields',
  feedback: 'Feedback', overlays: 'Overlays', space: 'Space', handoff: 'Handoff',
};
// what each page shows, one line, for the list on the contents page
export const SHOWS = {
  cover: 'Name, version and the screen', contents: 'This list', screen: 'The Organisation profile, light', dark: 'The same screen, dark',
  roles: 'Every role, light and dark, with ratios', tints: 'Ramps, and text on each ground', type: 'The type scale at true size', buttons: 'Variants by state',
  fields: 'Fields and choices by state', feedback: 'Alerts, status, toast and empty', overlays: 'Dialog, scrim and table', space: 'Spacing, radius and icons', handoff: 'Tokens and files',
};
export const CREDIT = 'Made with UIL4B';

// Theme 36, Doorlist: the UI style guide pages (the `guide` row; A4 portrait), drawn in guide-a4.js (1 to 7) and guide-ui2.js (8 to 13) on the engine's real components.
import { pages as drawn } from './guide-a4.js';
import { pages2 } from './guide-ui2.js';

// Page ids, in reading order: cover, contents, screen, dark, roles, tints, type, buttons, fields, feedback, overlays, space, handoff.
// Old ids stay as aliases so a lookup by an id the guide used to have still draws a page: interface is the screen, colour and contrast are the colour roles.
const all = { ...drawn, ...pages2 };
export const guide = { ...all, interface: all.screen, colour: all.roles, contrast: all.roles };

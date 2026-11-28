// Theme 34, Set Square: the UI style guide pages (the `guide` row; A4 portrait), drawn in guide-a4.js on the engine's real components.
import { pages as drawn } from './guide-a4.js';
import { pages2 } from './guide-ui2.js';

// Page ids, in reading order: cover, contents, screen, dark, roles, tints, type, buttons, fields, feedback, overlays, space, handoff.
// Three old ids stay as aliases so a lookup by an id the guide used to have still draws a page: interface is the screen, colour and contrast are the colour roles.
export const guide = { ...drawn, ...pages2, interface: drawn.screen, colour: drawn.roles, contrast: drawn.roles };

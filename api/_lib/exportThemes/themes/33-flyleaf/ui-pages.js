// Theme 33, Flyleaf: the UI style guide pages (the `guide` row; A4 portrait). The 13 pages are drawn in guide-a4.js, on the engine's real components.
// The old unstyled pages (components, icons, and the first feedback and handoff) are gone: their ids have no function here, and the order (helpers.js UI_PAGES) never names them.
import { pages as drawn } from './guide-a4.js';

// Page ids, in reading order: cover, contents, screen, dark, roles, tints, type, buttons, fields, feedback, overlays, space, handoff.
// Three old ids stay as aliases so a lookup by an id the guide used to have still draws a page: interface is the screen, colour and contrast are the colour roles.
export const guide = { ...drawn, interface: drawn.screen, colour: drawn.roles, contrast: drawn.roles };

// Theme 36, Doorlist: the A4 portrait edition (794 x 1123), all 31 pages. pages-a4a.js draws pages 1 to 16 and the openers, pages-a4b.js pages 17 to 31. index.js wires each page here in
// front of its 16:9 twin: a portrait ctx (ctx.size taller than wide, set by the harness or the export route) gets this function, a 16:9 ctx keeps its own page.
import { a4a } from './pages-a4a.js';
import { a4b } from './pages-a4b.js';

export const a4 = { ...a4a, ...a4b };

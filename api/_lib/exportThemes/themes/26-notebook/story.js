// Theme 26, Notebook, the sample story: the slot edition's product screens carry generic filler ("Item 1", "Main action", "12 Example Street").
// The kit, the code package's example page and the guide's mock-ups all read one story instead: theme 21's orders (read only), so a list, a table,
// a card, an alert and a dialog tell the same thing, the example's total is the sum of its rows, and a status agrees wherever it is printed.
// Only the slot edition has filler; every other edition keeps the brand's own content exactly as it is.
import { realCopy, ORDER_STATUS, LINK_ICONS } from '../21-presentation/real-copy.js';
import { exampleDemo as demoOf } from '../21-presentation/once.js';

const GENERIC_STATUS = ['New', 'Active', 'Waiting', 'Closed'];
const PATH = 'ui.screen.content';

// a copy of the generic content with every string the story has words for replaced, and the rest (Back, Skip, Remove) left as the engine has it
function overlay(v, path) {
  if (typeof v === 'string') return realCopy(`${PATH}.${path}`, v) ?? v;
  if (Array.isArray(v)) return v.map((x, i) => overlay(x, `${path}.${i}`));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, overlay(x, path ? `${path}.${k}` : k)]));
  return v;
}

const made = new WeakMap();
// ui.screen.content for this context: the story in the slot edition, the brand's own in any other
export function screenContent(ctx) {
  const S = ctx.brand.ui.screen.content;
  if (ctx.edition !== 'slot') return S;
  relabel(ctx);
  if (!made.has(S)) {
    const story = overlay(S, '');
    story.deliveries.forEach((d, i) => { d.status = ORDER_STATUS[i] || d.status; });
    ((story.example || {}).links || []).forEach((l, k) => { l[1] = LINK_ICONS[k] || l[1]; });
    made.set(S, story);
  }
  return made.get(S);
}
export const storyOf = screenContent;

// the status labels the story's chips, tabs and alerts print (New order, Packing, Late, Closed), set in place on both lists: the engine's chips
// read ctx.status, and the placeholder swap that would sync it from the brand does not run for this theme
function relabel(ctx) {
  const lists = [ctx.status, ctx.brand.ui.status];
  lists.forEach((list) => (list || []).forEach((s, i) => { if (s && GENERIC_STATUS.includes(s.label)) s.label = realCopy(`ui.status.${i}.label`, s.label); }));
}

// the code package's example page: its total is the story's rows added up, drawn from the story and not from the generic rows
export function exampleDemo(ctx) {
  if (ctx.edition !== 'slot') return {};
  const S = screenContent(ctx), ui = { ...ctx.brand.ui, screen: { ...ctx.brand.ui.screen, content: S } };
  const proxy = Object.create(ctx);
  Object.defineProperty(proxy, 'brand', { value: { ...ctx.brand, ui }, enumerable: true });
  return demoOf(proxy);
}

// Theme 22, Ticket: stand-in photographs for a brand whose imagery shots are still briefs (Encore). The imagery pages (guidelines photo-direction, shot-list and
// imagery-rules, kit photography-1 and -2) used to print empty dark frames with crop marks. Each shot now shows a window of one of the night plates the
// theme already uses on its applications pages (the bar, the door, the queue, the tram stop): the engine's own scenes, with this brand's art on the surface
// where the window shows it. A brand with its own photographs, and the slot edition (which keeps the brief as a placeholder), never use a plate.
import { plateImg } from '../../engine/plate.js';
import { root, posterArt } from './art.js';
import { isStreet } from './street.js';
import { phoneStory } from './lane-g5.js';

// the window is the part of the scene shown: cx, cy its centre and ww its width, in scene px; its height follows the frame. top, where given, is the
// lowest the window's top edge may sit, so a wide frame still shows the poster's headline above the queue
const PLATES = {
  queue: { scene: 'late-door-poster', art: 'poster', cx: 512, cy: 680, top: 150, ww: 1024, alt: 'people queuing at a venue door at night' },
  door: { scene: 'late-door-scan', art: 'phone', cx: 512, cy: 720, ww: 1024, alt: 'a phone held up to a door scanner at night' },
  stage: { scene: 'late-bar-ticket', art: 'blank', cx: 920, cy: 200, ww: 700, alt: 'a band on a lit stage seen from the bar' },
  phone: { scene: 'late-door-scan', art: 'phone', cx: 700, cy: 450, ww: 700, alt: 'a phone held up at the door, the queue behind' },
  wristband: { scene: 'late-door-scan', art: 'phone', cx: 800, cy: 700, ww: 520, alt: 'a wristband on a wrist at the door' },
  after: { scene: 'late-tram-panel', art: 'blank', cx: 790, cy: 700, ww: 470, alt: 'the footpath outside at night, a tram passing' },
};

export const hasPlate = (ctx, shot) => !shot.photo && ctx.edition !== 'slot' && !isStreet(ctx) && !!PLATES[shot.id];

// the art on the plate's surface: the brand's own piece where the window shows it, a flat sheet where it does not
function artFor(ctx, R, p) {
  const q = ctx.sceneInfo(p.scene).quads[0];
  const doc = (a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h }), w: a.w, h: a.h });
  if (p.art === 'poster') return doc(posterArt(ctx, R));
  if (p.art === 'phone') return doc(phoneStory(ctx, R));
  const w = 1000, h = Math.round(w / q.aspect);
  return doc({ html: root(w, h, R.field, ''), w, h });
}

// an <img> that fills a w x h frame (which clips it): the plate's window, scaled so its width is the frame's width.
export function plateWindow(ctx, R, shot, w, h) {
  const p = PLATES[shot.id], si = ctx.sceneInfo(p.scene), src = ctx.mockup(p.scene, [artFor(ctx, R, p)]);
  const ww = Math.min(p.ww, si.w, si.h * w / h), wh = ww * h / w, k = w / ww;
  const wx = Math.max(0, Math.min(si.w - ww, p.cx - ww / 2)), wy = Math.max(0, Math.min(si.h - wh, p.cy - wh / 2, p.top ?? Infinity));
  const f = (n) => `${Math.round(n * 100) / 100}px`;
  return `${plateImg(`${src}`, ``, `position:absolute;left:${f(-wx * k)};top:${f(-wy * k)};width:${f(si.w * k)};height:${f(si.h * k)};max-width:none`)}`;
}
export const plateAlt = (shot) => `Stand-in photograph: ${PLATES[shot.id].alt}`;

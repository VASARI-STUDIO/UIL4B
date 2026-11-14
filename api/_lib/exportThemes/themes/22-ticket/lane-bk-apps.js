// Theme 22, Ticket: lane bk, the brand book's applications photographs. The book draws its own: it needs no guidelines build first.
// The prints are the theme's own (art.js for the night plates, street.js for the street), lit the way the signage page lights them (light.js), and placed
// on a scene by ctx.mockup, which on the server answers with a data URL. If a print can't be made or placed, the
// ticket gets a frame at the photograph's proportion with what belongs in it, the way the imagery section frames a shot that isn't taken yet.
import { posterArt, ticketArt } from './art.js';
import { isStreet, streetPosterArt, docketArt } from './street.js';
import { POSTER_SCENE, TICKET_SCENE, posterLit, ticketLit, litColour, curlTint, posterOver, ticketOver } from './light.js';

// ---- the scenes: the one place their ids live. A new scene library for applications is coming; change the ids here. ----
// set: night for a brand that plays after dark, street for one whose own photograph is the bus shelter (the signage page's rule, street.js isStreet).
// sign is the poster's scene and hand the ticket's (or the docket's). win is the part of the scene the book shows, in scene pixels (the print and a
// little of its ground); what says what the photograph is, for its alt text. A scene the theme has no measured light or cover for is still drawn,
// unlit and uncovered, with the whole scene shown.
export const APP_SCENES = {
  night: {
    sign: { id: 'late-door-poster', win: { x: 524, y: 40, w: 500, h: 750 }, what: () => 'street poster on a brick wall at night' },
    hand: { id: 'late-bar-ticket', win: { x: 380, y: 464, w: 800, h: 560 }, what: (noun) => `${noun} on a bar top at night` },
  },
  street: {
    sign: { id: 'photo-busstop', win: { x: 942, y: 240, w: 450, h: 675 }, what: () => 'poster in a bus shelter panel, in daylight' },
    hand: { id: 'docket-steel', win: { x: 153, y: 130, w: 1229, h: 860 }, what: () => 'docket on a steel counter, in daylight' },
  },
};
const setOf = (ctx) => (isStreet(ctx) ? 'street' : 'night');

// ---- each print for its scene: the art, and what is drawn over the photograph (only where the theme measured that scene) ----
function prints(ctx, R) {
  const S = APP_SCENES[setOf(ctx)], noun = /ticket/i.test(ctx.brand.description) ? 'ticket' : 'docket';
  const page = (a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h }), w: a.w, h: a.h });
  const out = [];
  if (setOf(ctx) === 'street') {
    out.push({ ...S.sign, make: () => ({ art: page(streetPosterArt(ctx, R)), over: null }) });
    out.push({ ...S.hand, make: () => ({ art: page(docketArt(ctx, R)), over: null }) });
  } else {
    out.push({ ...S.sign, make: () => {
      if (S.sign.id !== POSTER_SCENE) return { art: page(posterArt(ctx, R)), over: null };
      const pl = posterLit(ctx, 594, 841);
      return { art: page(posterArt(ctx, R, { bg: litColour(R.field, pl.shadeMid, pl.fMid, pl.mid), lit: pl })), over: (win) => posterOver(ctx, win, win.w, win.h) };
    } });
    out.push({ ...S.hand, make: () => {
      if (S.hand.id !== TICKET_SCENE) return { art: page(ticketArt(ctx, R)), over: null };
      const tl = ticketLit(ctx, 1040, 400), bg = litColour(R.field, tl.shadeMid, tl.fMid, tl.mid);
      return { art: page(ticketArt(ctx, R, { bg, lit: tl })), over: (win) => ticketOver(ctx, win, win.w, win.h, curlTint(bg, tl.endF)) };
    } });
  }
  return out.map((p) => ({ ...p, what: p.what(noun) }));
}

// The photographs for the applications ticket: [{ id, what, win, src (a data URL), over (markup over the photo) }], or frames to show in their place
// ([{ id, what, win, frame: true }]) when a print can't be made or drawn. The pictures go inside the file: the book has no photos folder of its own.
export function appPhotos(ctx, R) {
  const list = prints(ctx, R);
  for (const p of list) {
    try {
      const m = p.make();
      // the server's ctx.mockup answers with the finished picture as a data URL; a print it cannot place is framed instead
      const url = ctx.mockup(p.id, [m.art], { shade: 1 });
      if (url.startsWith('data:')) Object.assign(p, { src: url, over: m.over }); else p.frame = true;
    } catch (e) { p.frame = true; }
  }
  return list.map((p) => {
    const si = ctx.sceneInfo(p.id), win = p.win && p.win.x + p.win.w <= si.w && p.win.y + p.win.h <= si.h ? p.win : { x: 0, y: 0, w: si.w, h: si.h };
    if (!p.src) return { id: p.id, what: p.what, win, frame: true };
    return { id: p.id, what: p.what, win, si, src: p.src, over: p.over ? p.over(win) : '' };
  });
}

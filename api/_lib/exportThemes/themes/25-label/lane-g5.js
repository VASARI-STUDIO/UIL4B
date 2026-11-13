// Theme 25, Label, lane g5: the social page (011), the last of the Free twelve.
// The same wall as every page: one keyed group hung on the centre of the hang and the sightline, the wall title at x 712, y 96, and the label card fixed at x 712, y 416.
// The object is the brand's three posts, drawn flat at their real aspects and at one scale (each 1080 px wide, so the three stand at their true relative sizes):
// a square, a portrait and a story, hung side by side on the sightline as three prints of one series. Each carries one of the brand's own social lines and its logo,
// on one of its colours (action, ink, panel). Every post is flat for every brand, photographs or not: a Free theme ships no photographs.
// Free, so nothing is photographed: no ctx.photo, no ctx.mockup, no device, no shadow. The folio follows the Free twelve (helpers.folio, via helpers.page).
import { folio, roles, solid, key, hung, hungX, token, wrapLines, advance, tie, A, px, numberWord, page } from './helpers.js';

const even = (n) => Math.ceil(n / 2) * 2;                // hung() refuses odd sizes, which would sit half a pixel off the sightline
const POST_W = 184, GAP = 24, I = 16;                     // each post 184 wide (1080 px at 0.17), 24 apart; 16 in from the edge is 94 px of the real post
const FORMATS = [{ name: 'Square', h: 1080 }, { name: 'Portrait', h: 1350 }, { name: 'Story', h: 1920 }];
const STORY_SAFE = 250;                                   // a story keeps its type this many px (of 1920) clear of the top and bottom, where the app draws its own bars

// how many lines `text` sets in, or Infinity when a run is wider than the box
const count = (ctx, size, text, width) => { try { return wrapLines(ctx, 'display', ctx.weights.heading, size, text, width).length; } catch { return Infinity; } };
// How even the lines come out once the browser balances them (text-wrap: balance): the narrowest width that keeps the line count, then the shortest line over the longest.
// Bound runs (tie) can leave a balanced block ragged ("Pre-orders ship / the week / the book"); a size that does is passed over for the next one down.
function evenness(ctx, size, text, width, n) {
  let lo = 24, hi = width;
  while (hi - lo > 1) { const m = (lo + hi) / 2; if (count(ctx, size, text, m) <= n) hi = m; else lo = m; }
  const ws = wrapLines(ctx, 'display', ctx.weights.heading, size, text, hi).map((l) => advance(ctx, 'display', ctx.weights.heading, l, size));
  return n === 1 ? 1 : Math.min(...ws) / Math.max(...ws);
}
// the largest display size, from the title token down in steps of 2 px, at which `text` sets in `width` in at most `maxLines` lines and `room` px, with balanced lines that are
// no shorter than 60% of the longest; the line at the title token's ratio
function fit(ctx, text, width, room, maxLines = 4) {
  const t = token(ctx, 'title');
  for (let s = t.size; s >= 14; s -= 2) {
    const line = Math.round(s * t.line / t.size), n = count(ctx, s, text, width);
    if (n <= maxLines && n * line <= room && evenness(ctx, s, text, width, n) >= 0.6) return { size: s, line, n };
  }
  for (let s = t.size; s >= 14; s -= 2) {                 // no size sets evenly: the largest that fits
    const line = Math.round(s * t.line / t.size), n = count(ctx, s, text, width);
    if (n <= maxLines && n * line <= room) return { size: s, line, n };
  }
  throw new Error(`social: "${text}" does not fit its post (${width} x ${room} px) at 14 px`);
}
const txt = (x, y, w, style, text) => `<div class="disp g5-l" style="left:${px(x)};top:${px(y)};width:${px(w)};${style}">${A(text)}</div>`;

function social(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, g = ctx.logo.geos;
  const k = POST_W / 1080;
  const posts = FORMATS.map((f) => ({ ...f, w: POST_W, h: even(Math.round(f.h * k)) }));          // 184, 230, 328
  const gw = posts.length * POST_W + (posts.length - 1) * GAP, x0 = hungX(gw);
  const lineOf = (i) => B.applications.social?.[i] || [B.lines.primary, ...B.lines.others][i];
  const lines = posts.map((_, i) => tie(lineOf(i), { max: 16 }));
  // one lock-up on every post: the wordmark when it is wide (a horizontal lock-up beside a symbol would read as two), else the horizontal logo
  const wide = ctx.logo.geo.aspect > 4, lockup = wide ? 'colour' : 'horizontal', lw = wide ? 120 : 72;
  const lh = wide ? lw / ctx.logo.geo.aspect : lw / g.horizontal.w * g.horizontal.h;
  // the slot edition draws a labelled frame in place of the logo, in `color`: the text colour that reads on the post. A frame under 24 px tall (a wide wordmark) holds one word.
  const label = lh < 24 ? 'Logo' : undefined;
  const logo = (x, y, fill) => `<div style="left:${px(x)};top:${px(y)}">${ctx.logo.html(lockup, { width: lw, colourway: R.colourwayOn(fill), color: R.onColour(fill, 11), label })}</div>`;
  const tw = POST_W - 2 * I;
  const textOn = (fill, s) => R.onColour(fill, s.size, W.heading);

  let x = x0;
  const parts = posts.map((p, i) => {
    const y = hung(p.h), l = lines[i];
    let fill, inner;
    if (i === 0) {
      // 1 square, on the action colour: the line from the top, the logo at the foot
      fill = R.action;
      const s = fit(ctx, l, tw, p.h - 2 * I - lh - 16);
      inner = txt(I, I, tw, `font-size:${s.size}px;line-height:${s.line}px;color:${textOn(fill, s)}`, l) + logo(I, p.h - I - lh, fill);
    } else if (i === 1) {
      // 2 portrait, on the ink: the logo at the top and the line set on the foot
      fill = R.ink;
      const s = fit(ctx, l, tw, p.h - 2 * I - lh - 32);
      inner = logo(I, I, fill) + txt(I, p.h - I - s.n * s.line, tw, `font-size:${s.size}px;line-height:${s.line}px;color:${textOn(fill, s)}`, l);
    } else {
      // 3 story, on the panel colour: every line of type and the logo inside the safe area
      fill = R.panel;
      const safe = Math.ceil(STORY_SAFE * k), foot = p.h - safe - lh;
      const s = fit(ctx, l, tw, foot - safe - 24, 5);
      inner = txt(I, safe, tw, `font-size:${s.size}px;line-height:${s.line}px;color:${textOn(fill, s)}`, l) + logo(I, foot, fill);
    }
    const out = solid(R, x, y, p.w, p.h, fill, inner) + key(i + 1, x, y + p.h);
    x += p.w + GAP;
    return out;
  }).join('');

  const inkName = (B.colours.find((c) => c.role === 'text') || { name: 'ink' }).name;
  return page(ctx, 'social', {
    object: parts, wall: { title: 'Social posts' },
    label: {
      title: `${numberWord(posts.length)} posts at one scale`, detail: 'Each 1080 px wide: square, portrait and story.',
      keys: [
        { n: 1, text: `Square: the line on ${R.actionName}.` },
        { n: 2, text: `Portrait: the logo, then the line on ${inkName}.` },
        { n: 3, text: `Story: on ${R.panelName}, type kept ${STORY_SAFE} px clear of the top and foot.` },
      ], cols: 1,
      credit: `See also Hierarchy, page ${folio('hierarchy')}`,
    },
  });
}

export const guidelines = { social };

export function css() {
  return `.pg .g5-l{text-wrap:balance}
`;
}

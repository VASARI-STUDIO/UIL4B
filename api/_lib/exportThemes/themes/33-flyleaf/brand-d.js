// Theme 33, Flyleaf: the brand guidelines, pages 30 and 31 (7 Close: on one page, contact), at 16:9 and A4 portrait. The opener (7.0) is the shared opener in brand-a.js.
// Same contract as brand-a.js: absolute boxes on the grid in kit.js, a size is its own arrangement (K.portrait), every text colour from tones() of the ground it sits on,
// brand copy the user writes through ctx.esc(). The summary is only what the project has (the mark, the palette by share, the faces, the main line); the contact fields are
// the engine's placeholders drawn at the real size of the copy (what, length and example), and the version is the project's own.
import { shareByWeight } from '../../engine/styleguide.js';
import { tones, geo, own, at, hr, mono, page, textCol, field, groundsOf } from './kit.js';
import { colours, edged } from './brand-a.js';
import { fitIn, facesOf, weightsOf } from './brand-b.js';

// ---- 7.1 On one page: the main line, the mark, the faces and the palette, each in its own band under a hairline ----
function summary(ctx) {
  const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, E = ctx.esc, lg = ctx.logo, cs = colours(ctx), P = K.portrait;
  const hA = P ? 214 : 176, hC = P ? 190 : 152, hB = e.h - hA - hC;
  const yB = e.y + hA, yC = yB + hB;
  // the main line: the brand line at the size it will be set
  const written = !(ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === 'lines.primary'));
  const line = hr(e.x, e.y, e.w) + (written ? at(e.x, e.y + 12, 200, 14, mono('Main line')) : '')
    + at(e.x, e.y + (written ? 36 : 12), e.w, hA - 44, `<div class="d wc" style="font-size:${P ? 36 : 34}px;line-height:1.15;white-space:normal;letter-spacing:-0.01em">${E(B.lines.primary)}</div>`);
  // the mark on the primary, bottom left, and the two faces beside it
  const mw = P ? Math.round(e.w * 0.42) : Math.round(e.w * 0.36), fx = e.x + mw + K.gut + (P ? 0 : 12), fw = e.x + e.w - fx, tp = tones(ctx, G.primary);
  const lw = Math.round(mw * 0.4);
  const mark = hr(e.x, yB, e.w) + at(e.x, yB + 12, mw, 14, mono('Mark'))
    + field(ctx, e.x, yB + 36, mw, hB - 36 - 12, G.primary, `<div class="a lj" style="left:20px;bottom:20px;color:var(--ink)">${lg.html('symbol', { width: lw, color: tp.ink })}</div>`, edged(ctx, G.primary));
  const fh = (hB - 12) / 2;
  const faces = ['display', 'body'].map((role, i) => {
    const fam = B.fonts[role].family, stem = (facesOf(ctx, role)[0] || ctx.faces[0]).stem, w0 = weightsOf(ctx, role)[0] || 400;
    const size = Math.floor(fitIn(ctx, stem, fam, fw, (P ? 44 : 38), role === 'display' ? -0.02 : 0)), y = yB + 12 + i * fh;
    return at(fx, y, fw, 14, mono(role === 'display' ? 'Display' : 'Body'))
      + at(fx, y + 20, fw, Math.round(size * 1.12), E(fam), { style: `font-family:var(--${role});font-weight:${role === 'display' ? ctx.weights.heading : w0};font-size:${size}px;line-height:1.1;white-space:nowrap;letter-spacing:${role === 'display' && size > 40 ? '-0.02em' : '0'}` })
      + at(fx, y + 20 + Math.round(size * 1.12) + 6, fw, 24, `Aa Bb Cc 0123`, { style: `font-family:var(--${role});font-weight:${w0};font-size:${P ? 20 : 18}px;line-height:1.3;white-space:nowrap` });
  }).join('');
  // the palette as a strip, widths by share, hex and name under each field
  const sizes = shareByWeight(e.w, cs.map((c) => c.share), P ? 80 : 96, 0), sh = P ? 54 : 48;
  let p = 0;
  const strip = hr(e.x, yC, e.w) + at(e.x, yC + 12, 200, 14, mono('Palette')) + cs.map((c, i) => {
    const x = e.x + p, w = sizes[i]; p += w;
    return at(x, yC + 36, w, sh, '', { style: `background:${c.hex};${edged(ctx, c.hex)}` })
      + at(x, yC + 36 + sh + 8, w - 6, 40, `<div class="m i">${c.hex.toUpperCase()}</div><div class="m w">${own(ctx, c.name)}</div>`);
  }).join('');
  return page(ctx, 'summary', { body: textCol(ctx, 'summary', 'The main line, the mark, the two faces and the palette together on one page.') + line + mark + faces + strip });
}

// a contact field: the engine's placeholder at the real size of the copy (what to write, its length and an example), or the project's own words when it has written them
function slot(ctx, path, value, size) {
  const E = ctx.esc, en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  const css = `font-size:${size}px;line-height:1.2;white-space:normal;letter-spacing:-0.01em`;
  if (!en) return `<div class="d wc" style="${css}">${E(value)}</div>`;
  return `<div class="d wc" style="${css}"><span class="ph-b ph-b--real" data-ph="${path}"><span class="ph-l">${E(en.label)}</span><span class="ph-w">${E(en.what)}</span><span class="ph-m">${E(en.length)}.${en.first ? ` e.g. &quot;${E(en.example)}&quot;` : ''}</span></span></div>`;
}

// ---- 7.2 Contact: owner, email, version and how to ask for a change, on the dark ground ----
function contact(ctx) {
  const K = geo(ctx), G = groundsOf(ctx), e = K.ex, B = ctx.brand, E = ctx.esc, P = K.portrait;
  const parts = [['Owner', 0.27], ['Email', 0.27], ['Version', 0.2], ['To ask for a change', 0.26]];
  let y = e.y;
  const rows = parts.map(([label, share], i) => {
    const h = Math.round(e.h * share), top = y; y += h;
    const sz = P ? 28 : 26;
    const inner = i === 0 ? slot(ctx, 'contact.owner', B.contact.owner, sz)
      : i === 1 ? slot(ctx, 'contact.email', B.contact.email, sz)
        : i === 2 ? `<div class="d" style="font-size:${P ? 46 : 44}px;line-height:1.1;letter-spacing:-0.02em">${E(ctx.versionLine)}</div>`
          : `<div class="b" style="font-size:${P ? 20 : 19}px;line-height:1.45;max-width:30em">To ask for a change, write to the owner above. Name the page and say what should be different.</div>`;
    return hr(e.x, top, e.w) + at(e.x, top + 12, 240, 14, mono(label)) + at(e.x, top + 36, e.w, h - 44, inner);
  }).join('');
  return page(ctx, 'contact', { ground: G.ink, body: textCol(ctx, 'contact', 'Who looks after the brand, which version this is and how to ask for a change.') + rows });
}

export const guidelines = { summary, contact };

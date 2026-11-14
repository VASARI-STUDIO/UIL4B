// Swiss Field, lane g5: the two application pages of the Free twelve, business-card and social. Flat artwork only, as the Free tier has no photographed mockups.
// The old one-page applications draft (guidelines.js) put the card, the post and the story on one page; here it is split in two, each piece larger, and each piece
// still carries the strip at its foot (mini() in guidelines.js), so the device works on the artwork as it does on the page.
// Everything printed comes from ctx.brand (applications, lines, description, name); the sizes in the captions are the formats' own.
import { A, nb, M, PAGE_W, at, box, page, model, textWidth, pickSize, titleHtml, colourwayOn, fmtShare, MONO } from './swiss.js';
import { mini, bestCw } from './guidelines.js';

const r2 = (n) => Math.round(n * 100) / 100;
const hair = (x, y, w, color = 'var(--hair)') => box(`left:${r2(x)}px;top:${y}px;width:${r2(w)}px;height:1px;background:${color}`);
const note = (t, color = 'var(--quiet)') => `<div class="c-note" style="color:${color}">${nb(t)}</div>`;
const val = (t) => `<span class="c-value">${A(t)}</span>`;
const sentences = (s) => (String(s).match(/[^.!?]+[.!?]+/g) || [String(s)]).map((x) => x.trim());
const trim = box('left:0;top:0;width:100%;height:100%;border:1px solid var(--hair);pointer-events:none');
const piece = (x, y, w, h, bg, inner) => box(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg}`, inner);
const rise = (ctx, mp, id, ph) => box(`left:${r2(mp.get(id).x)}px;top:0;width:${r2(mp.get(id).w)}px;height:${ph}px;background:${ctx.byId[id].hex}`);
const cap = (x, y, t, v, tail = '') => at(x, y, `<div class="c-note" style="color:var(--quiet)">${A(t)} ${val(v)}${A(tail)}</div>`, { cls: 'nw' });
const T = 304; // the band's top, as on every application page

// ---------------------------------------------------------------- business-card
// Front and back side by side across the page, at 90 x 55 mm, each as wide as half the page less its gap. The front: the ground, the action field risen at its
// share, the logo, a rule and the brand's line. The back: the text colour, the name and role, the contact lines and the symbol.
function businessCard(ctx) {
  const m = model(ctx), B = ctx.brand, a = m.action, tx = m.text, AP = B.applications, lab = m.label[a.id], txLab = m.label[tx.id];
  const g = 16, cW = Math.floor((PAGE_W - 2 * M - g) / 2), cH = Math.round((cW * 55) / 90), pad = 48, xBack = M + cW + g;

  const f = mini(ctx, cW, cH, 'var(--hair)'), fa = f.pos.get(a.id), tagW = Math.floor(fa.x - pad - 40);
  const tagLines = sentences(B.lines.primary), tagSize = pickSize(ctx, tagLines, [44, 40, 36, 32], tagW, 3).size, tagLh = Math.round((tagSize * 7) / 6);
  const shareTxt = fmtShare(a.share ?? 0);
  const stripeShare = a.share != null && textWidth(MONO, shareTxt, 16) <= fa.w - 20 ? at(fa.x + 10, pad, `<span class="c-value">${shareTxt}</span>`, { style: `color:${lab}` }) : '';
  const front = piece(M, T, cW, cH, 'var(--ground)', rise(ctx, f.pos, a.id, cH) + stripeShare + f.html + at(pad, pad, ctx.logo.html('colour', { width: 360 }))
    + box(`left:${pad}px;bottom:${f.h + pad}px;width:${tagW}px;font-size:${tagSize}px;line-height:${tagLh}px;border-top:1px solid var(--ink);padding-top:16px`,
      tagLines.map((t, i) => `<div class="disp" style="color:${i ? 'var(--quiet)' : 'var(--ink)'}">${A(t)}</div>`).join('')) + trim);

  const bk = mini(ctx, cW, cH, txLab), cwBack = colourwayOn(ctx, tx.hex, ['reversed', 'mono-light']) || bestCw(ctx, tx.hex);
  const line = (t, y) => at(pad, y, `<div class="bf" style="font-size:30px;line-height:42px;color:${txLab}">${A(t)}</div>`);
  const y1 = cH - bk.h - pad - 84;
  const back = piece(xBack, T, cW, cH, tx.hex, bk.html
    + at(pad, pad, `<div class="disp nw" style="font-size:56px;line-height:60px;color:${txLab}">${A(AP.card.person)}</div>`)
    + at(pad, pad + 68, `<div class="c-body" style="color:${m.quietOn[tx.id]}">${nb(AP.card.role)}</div>`)
    + line(AP.card.contact, y1) + line(AP.site.url, y1 + 42)
    + at(cW - pad - 80, pad, ctx.logo.html('symbol', { width: 80, colourway: cwBack, color: txLab })));

  const title = titleHtml(ctx, 'Business card', ['Front and back, the strip at the foot of each.'], { w: 1160 });
  return page(ctx, 'business-card', { body: title + front + back + cap(M, T + cH + 16, 'Front,', '90 × 55 mm') + cap(xBack, T + cH + 16, 'Back,', '90 × 55 mm') });
}

// ---------------------------------------------------------------- social
// One band, 640 px tall: the square post, the story, and the profile. The post leads with the first line large; the story carries the third line; the profile's banner
// is the share strip itself across its whole width, with the logo on its ground, the symbol as the picture, and the brand's own description as the bio.
function social(ctx) {
  const m = model(ctx), B = ctx.brand, a = m.action, AP = B.applications, lab = m.label[a.id], S = AP.social;
  const H = 640, g = 48, pad = 28, sW = Math.round((H * 9) / 16), xStory = M + H + g, xProf = xStory + sW + g, pW = PAGE_W - M - xProf;

  // square post: the action ground, the logo that belongs on it, the first line large and the second a size smaller, one sentence to a line
  const pk = mini(ctx, H, H, lab, a.hex.toUpperCase() !== m.ground.hex.toUpperCase()), cwPost = bestCw(ctx, a.hex), tw = H - 96;
  const two = pickSize(ctx, [S[0]], [72, 68, 64, 62, 60, 58, 56], tw, 2);
  const s1 = two.lines <= 2 ? two.size : pickSize(ctx, [S[0]], [72, 64, 56, 48], tw, 3).size;
  const post = piece(M, T, H, H, a.hex, pk.html + at(48, 48, ctx.logo.html('horizontal', { width: 260, colourway: cwPost }))
    + box(`left:48px;bottom:${pk.h + 48}px;width:${tw}px`,
      `<div class="disp" style="font-size:${s1}px;line-height:${Math.round(s1 * 0.96)}px;color:${lab}">${A(S[0])}</div>`
      + sentences(S[1]).map((t, i) => `<div class="disp" style="margin-top:${i ? 4 : 24}px;font-size:32px;line-height:36px;color:${lab}">${A(t)}</div>`).join('')));

  // story: the action field risen at its share, the symbol, the third line, the address
  const st = mini(ctx, sW, H, 'var(--hair)'), sx = st.pos.get(a.id).x, stw = Math.floor(sx - pad - 20);
  const s3 = pickSize(ctx, [S[2]], [36, 32, 28], stw, 4).size;
  const story = piece(xStory, T, sW, H, 'var(--ground)', rise(ctx, st.pos, a.id, H) + st.html
    + at(pad, pad, ctx.logo.html('symbol', { width: 56, colourway: 'colour' }))
    + at(pad, 136, `<div class="disp" style="font-size:${s3}px;line-height:${Math.round(s3 * 1.05)}px;color:var(--ink)">${A(S[2])}</div>`, { w: stw })
    + at(pad, H - st.h - pad - 24, note(AP.site.url, 'var(--ink)'), { w: stw }) + trim);

  // profile: a 3 : 1 banner that is the whole strip (the ground first, then every field at its share), the symbol on the action colour as the round picture, the name, the address, the bio
  const bH = Math.round(pW / 3), k = pW / PAGE_W, av = 144, avY = bH - av / 2, p = 24;
  const banner = m.segs.map((s) => `<div class="a" style="left:${r2(s.x * k)}px;top:0;width:${r2(s.w * k + 0.5)}px;height:${bH}px;background:${s.c.hex}"></div>`).join('')
    + hair(0, bH - 1, pW, 'var(--hair)');
  const cwGround = colourwayOn(ctx, m.ground.hex, ['colour']) || bestCw(ctx, m.ground.hex);
  const avatar = box(`left:${p}px;top:${avY}px;width:${av}px;height:${av}px;border-radius:50%;background:${a.hex};border:6px solid var(--ground);box-sizing:border-box;display:flex;align-items:center;justify-content:center`,
    ctx.logo.html('symbol', { width: 64, colourway: bestCw(ctx, a.hex) }));
  const pf = mini(ctx, pW, H, 'var(--hair)');
  const textY = avY + av + 16;
  const profile = piece(xProf, T, pW, H, 'var(--ground)', banner + at(p, 24, ctx.logo.html('horizontal', { width: 200, colourway: cwGround }))
    + avatar
    + at(p, textY, `<div class="disp" style="font-size:36px;line-height:40px;color:var(--ink)">${A(B.name)}</div>${note(AP.site.url, 'var(--quiet)')}`, { w: pW - 2 * p })
    + at(p, textY + 40 + 24 + 16, `<div class="c-body" style="color:var(--ink)">${A(B.description)}</div>`, { w: pW - 2 * p })
    + pf.html + trim);

  const cy = T + H + 16;
  const title = titleHtml(ctx, 'Social', ['The post, the story and the profile, each with the strip.'], { w: 1160 });
  return page(ctx, 'social', { body: title + post + story + profile + cap(M, cy, 'Square post,', '1080 × 1080 px') + cap(xStory, cy, 'Story,', '1080 × 1920 px') + cap(xProf, cy, 'Profile,', '1500 × 500 px', ' banner')});
}

export const guidelines = { 'business-card': businessCard, social };

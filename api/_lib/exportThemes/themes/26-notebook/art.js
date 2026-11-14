// Theme 26, Notebook: the brand's own art, drawn at real size and photographed into the scene library's mockups.
// Every colour, face, size and word comes from the brand's data; the theme draws no art of its own.
import { A, brandRoles, readable, wrap, advance, tokens } from './helpers.js';

// Which brand line each print carries, so that no line is printed more than twice in a book. The hero (primary), the second line on the
// personality page (the first other line) and the sign (primary) are fixed; the clipboard sheet prefers the brand's own sample headline and the
// business card front takes whatever line is left, or none.
export function lineUse(ctx) {
  const B = ctx.brand, all = [B.lines.primary, ...(B.lines.others || [])], count = new Map();
  const use = (l) => { if (l) count.set(l, (count.get(l) || 0) + 1); return l; };
  use(B.lines.primary); use((B.lines.others || [])[0]); use(B.lines.primary);
  const pick = (pref) => use([pref, ...all].filter(Boolean).find((l) => (count.get(l) || 0) < 2));
  const clip = pick(B.type.sample.headline), card = pick();
  return { clip, card };
}

export function artKit(ctx) {
  const B = ctx.brand, L = ctx.roles.light, W = ctx.weights, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono;
  const R = brandRoles(ctx), ground = R.ground.hex, cw = B.logo.colourways;
  const T = tokens(ctx), dStem = T._displayStem;
  const bodyStem = (w) => ctx.faces.find((x) => x.role === 'body' && x.style !== 'italic' && x.weight === w).stem;
  const quiet = readable(ctx, ground, [L.quiet, L.text], 'art quiet text');
  const stretch = d.stretch ? `font-stretch:${d.stretch}%;` : '';
  const disp = (size, lh, color, extra = '') => `font-family:'${d.family}',sans-serif;font-weight:${W.heading};${stretch}font-size:${size}px;line-height:${lh}px;color:${color};${extra}`;
  const body = (size, lh, weight, color, extra = '') => `font-family:'${b.family}',sans-serif;font-weight:${weight};font-size:${size}px;line-height:${lh}px;color:${color};${extra}`;
  const mono = (size, lh, color, extra = '') => (m ? `font-family:'${m.family}',monospace;font-weight:${m.weights[0]};` : `font-family:'${b.family}',sans-serif;font-weight:${W.regular};`) + `font-size:${size}px;line-height:${lh}px;color:${color};${extra}`;
  const abs = (style, inner) => `<div style="position:absolute;${style}">${inner}</div>`;
  const lines = (arr) => arr.map((s) => `<span style="display:block;white-space:nowrap">${A(s)}</span>`).join('');
  const full = (bg, inner) => `<div style="position:absolute;left:0;top:0;right:0;bottom:0;background:${bg}">${inner}</div>`;
  const art = (inner, w, h, css = '') => ({ html: ctx.artPage(inner, { w, h, css }), w, h });
  const logoH = (id, width) => width * ctx.logo.geos[id].h / ctx.logo.geos[id].w;
  const rev = cw.reversed, revGround = rev.ground;
  const content = B.ui.screen.content, form = content.form, used = lineUse(ctx);

  // the label on the pine block: 2.09 : 1 (the quad's own shape), brand ground, the logo, the site address in the brand mono
  const label = (w, h) => art(full(ground,
    abs('left:32px;top:32px', ctx.logo.html('colour', { width: 216 }))
    + abs('left:32px;bottom:32px', `<span style="${mono(14, 20, L.text)}">${A(B.applications.site.url)}</span>`)), w, h);

  // the docket under the clip: A6 portrait, one job's slip
  const docket = (w, h) => {
    const pad = 28;
    const pickup = wrap(bodyStem(W.regular), 13, content.pickup, w - 2 * pad);
    const second = [[form.dropoff, form.dropoffValue], [form.pickup, form.pickupValue]].find(([, v]) => v && v !== content.deliverTo);
    const rowsDef = [[content.deliverToLabel, content.deliverTo], second].filter(Boolean);
    const rows = rowsDef.map(([k, v], i) => abs(`left:${pad}px;top:${150 + 56 * i}px;width:${w - 2 * pad}px`,
      `<div style="${body(12, 16, W.regular, quiet)}">${A(k)}</div><div style="${body(15, 22, W.medium, L.text, 'margin-top:4px')}">${A(v)}</div>`)).join('');
    const eta = ctx.ratio(L.action, ground) >= 4.5 ? L.action : L.text;
    return art(full(ground,
      abs(`left:${pad}px;top:${pad}px`, ctx.logo.html('horizontal', { width: 120 }))
      + abs(`left:${pad}px;top:92px;width:${w - 2 * pad}px;${body(13, 19, W.regular, L.text)}`, lines(pickup))
      + rows
      + abs(`left:${pad}px;top:262px;width:${w - 2 * pad}px;height:1px;background:${L.divider}`, '')
      + abs(`left:${pad}px;top:290px;${body(12, 16, W.medium, quiet)}`, A(content.paidLabel))
      + abs(`left:${pad}px;top:310px;${disp(44, 57, L.text, 'font-variant-numeric:tabular-nums;')}`, A(content.paid))
      + abs(`left:${pad}px;top:376px;${body(13, 19, W.medium, eta)}`, A(content.eta))
      + abs(`left:${pad}px;bottom:${pad}px;${body(11, 16, W.regular, quiet)}`, A(B.contact.email))), w, h);
  };

  // the business card, front and back (340 x 208, the surface is 1.64 : 1)
  // the card front carries the line lineUse leaves for it, or none
  const cardFront = (w, h) => {
    const p = used.card, ls = p ? wrap(bodyStem(W.medium), 10, p, w - 48) : [];
    return art(full(revGround,
      abs('left:24px;top:24px', ctx.logo.html('reversed', { width: 156 }))
      + (ls.length ? abs(`left:24px;bottom:24px;width:${w - 48}px;${body(10, 14, W.medium, rev.name)}`, lines(ls)) : '')), w, h);
  };
  const cardBack = (w, h) => {
    const c = B.applications.card, sh = 28, sw = sh * ctx.logo.geos.symbol.w / ctx.logo.geos.symbol.h;
    return art(full(ground,
      abs(`right:24px;top:24px`, ctx.logo.html('symbol', { width: sw }))
      + abs(`left:24px;bottom:24px;width:${w - 48}px`,
        `<div style="${body(13, 19, W.strong, L.text)}">${A(c.person)}</div><div style="${body(10, 14, W.regular, quiet)}">${A(c.role)}</div><div style="${body(10, 14, W.regular, L.text)}">${A(c.contact)}</div>`)), w, h);
  };

  // the phone: the quote (or booking) screen, amount first, then the due date and status in plain words, the client, one primary
  const phone = (w, h) => {
    const pad = 24, status = B.ui.status[0].label;
    const rowDefs = [[content.deliverToLabel, content.deliverTo], [form.dropoff, form.dropoffValue], [form.pickup, form.pickupValue]]
      .filter(([, v], i, a) => v && a.findIndex(([, x]) => x === v) === i).slice(0, 2);
    const rows = rowDefs.map(([k, v], i) => abs(`left:${pad}px;right:${pad}px;top:${300 + 72 * i}px;height:72px;border-top:1px solid ${L.divider}`,
      `<div style="${body(12, 16, W.regular, quiet, 'margin-top:14px')}">${A(k)}</div><div style="${body(16, 24, W.medium, L.text, 'margin-top:2px')}">${A(v)}</div>`)).join('');
    const radius = ctx.radius.button;
    return art(full(L.surface,
      abs(`left:${pad}px;top:20px;${body(14, 20, W.strong, L.text)}`, A(content.time))
      + abs(`left:${pad}px;top:76px;${disp(20, 26, L.text)}`, A(form.title))
      + abs(`left:${pad}px;top:132px;${body(13, 19, W.regular, quiet)}`, A(content.paidLabel))
      + abs(`left:${pad}px;top:154px;${disp(44, 52, L.text, 'font-variant-numeric:tabular-nums;')}`, A(content.paid))
      + abs(`left:${pad}px;top:222px;${body(15, 22, W.strong, L.text)}`, `${A(status)}<br><span style="font-weight:${W.regular}">${A(content.eta)}</span>`)
      + rows
      + abs(`left:${pad}px;right:${pad}px;bottom:96px;height:52px;border-radius:${radius}px;background:${L.action};${body(16, 52, W.strong, L.actionLabel, 'text-align:center')}`, A(form.book))), w, h);
  };

  // the A4 sheet on the clipboard (the surface is 0.753 : 1, a little shorter than A4)
  const clipboard = (w, h) => {
    const mg = 64, t = B.type.sample;
    const headLines = wrap(dStem, 44, used.clip || t.headline, 560, 0);
    const para = wrap(bodyStem(W.regular), 16, t.paragraph, 460);
    return art(full(ground,
      abs(`left:${mg}px;top:${mg}px`, ctx.logo.html('colour', { width: 160 }))
      + abs(`left:${mg}px;top:220px;${disp(44, 48, L.text)}`, lines(headLines))
      + abs(`left:${mg}px;top:${220 + 48 * headLines.length + 32}px;${body(16, 24, W.regular, L.text)}`, lines(para))
      + abs(`left:${mg}px;top:${h - 420}px;${body(13, 19, W.medium, quiet)}`, A(content.paidLabel))
      + abs(`left:${mg}px;top:${h - 396}px;${disp(44, 52, L.text, 'font-variant-numeric:tabular-nums;')}`, A(content.paid))
      + abs(`left:${mg}px;top:${h - 200}px;width:${w - 2 * mg}px;height:1px;background:${L.divider}`, '')
      + abs(`left:${mg}px;top:${h - 184}px;${body(12, 18, W.regular, quiet)}`, A(t.caption))
      + abs(`left:${mg}px;bottom:${mg}px;${body(12, 18, W.regular, quiet)}`, A(B.contact.email))), w, h);
  };

  // the sign: landscape (a ute door, a fascia) lays the line, the logo and the address out in a row; portrait (a poster) stacks them
  const sign = (w, h, lineText) => {
    const portrait = h > w, mg = portrait ? 40 : 64, lw = portrait ? 240 : 300, lh = logoH('horizontal', lw);
    const line = lineText || B.lines.primary, tw = portrait ? w - 2 * mg : 760;
    const top = portrait ? 56 : 72, maxSize = portrait ? 88 : 112;
    const room = h - mg - lh - 24 - top - (portrait ? 56 : 0);
    let size = maxSize, ls = wrap(dStem, size, line, tw, 0);
    for (; size > 40; size -= 4) {
      ls = wrap(dStem, size, line, tw, 0);
      if (ls.length <= (portrait ? 4 : 3) && ls.length * size <= room && ls.every((x) => advance(dStem, size, x, 0) <= tw + 0.5)) break;
    }
    const url = A(B.applications.site.url);
    const urlStyle = body(portrait ? 28 : 32, portrait ? 36 : 40, W.strong, rev.name);
    const inner = full(revGround,
      abs(`left:${mg}px;top:${top}px;${disp(size, size, rev.name)}`, lines(ls))
      + abs(`left:${mg}px;bottom:${mg}px`, ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', color: rev.name }))
      + (portrait ? abs(`left:${mg}px;bottom:${mg + lh + 24}px;${urlStyle}`, url) : abs(`right:${mg}px;bottom:${mg}px;${urlStyle}`, url)));
    return { ...art(inner, w, h), inner, ground: revGround };
  };

  return { label, docket, cardFront, cardBack, phone, clipboard, sign };
}

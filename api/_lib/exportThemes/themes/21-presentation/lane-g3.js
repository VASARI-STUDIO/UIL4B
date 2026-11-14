// Lane g3 for theme 21 (colour and type): proportion, contrast, colour-values, hierarchy, type-in-use, type-rules. Palette and typefaces are 21's own
// round 1 pages and are not rebuilt here. Every page is a slide of the courier's pitch deck: one idea, set on the brand's own colour fields, laid out in px
// on the 1280 x 720 page and its 12-column grid. Colours come by role, every number from ctx, and text is measured with the brand's own font files.
import { A, dispW, textW, lsb, capH, topForBaseline, fitOne, wrap, balance, lineHtml, L, byRole, inkOn, chromeOn, nameOfHex, px, box, colX, span, head, headRightW, page, sayOnce, sentences, pick, allowed, onceRe } from './lane-g3-kit.js';
import { nameOf } from './helpers.js';

const pc = (c) => Math.round(c.share * 100);
const disp = (ctx, size, lh, color, extra = '') => `color:${color};font-size:${size}px;line-height:${lh};letter-spacing:-0.01em;${extra}`;
const p15 = (t, cls = '', st = '') => `<p class="r-t15 ${cls}"${st ? ` style="${st}"` : ''}>${t}</p>`;
const p12 = (t, cls = '', st = '') => `<p class="r-t12 ${cls}"${st ? ` style="${st}"` : ''}>${t}</p>`;
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const fam = (ctx, t) => ctx.brand.fonts[t.face].family;

export const guidelines = {
  // Proportion: the page drawn to share. Each colour is a band across the full width, its height its share of the page, largest at the top.
  // The largest share is the page's one big number; every other band carries one line.
  proportion(ctx) {
    const W = ctx.size.w, H = ctx.size.h, dw = dispW(ctx), cs = [...ctx.colours].sort((a, b) => b.share - a.share), tot = cs.reduce((s, c) => s + c.share, 0);
    const [g, ...rest] = cs, gH = (H * g.share) / tot, gInk = inkOn(ctx, g.hex);
    // the bands' one line: name in the band's ink, then the first sentence of where it lands in the band's quiet tone
    const row = (c, y, size) => {
      const lands = sentences(c.lands)[0] || '', ink = inkOn(ctx, c.hex), lh = size === 15 ? 24 : 16;
      const t = `<span class="r-w600" style="color:${ink}">${A(c.name)}</span>&nbsp;&nbsp;${A(lands)}`;
      return box(648, y, 576, lh, `color:${chromeOn(ctx, c.hex)}`, `<p class="r-t${size} r-nw">${t}</p>`);
    };
    let y = 0, bands = '';
    // the big number: as large as the band allows (cap top at least 128, under the intro), baseline 40 above the band's foot
    const big = `${pc(g)}%`, base = Math.round(gH - 40);
    let size = fitOne(ctx, 'display', dw, [big], 200, 64, 560);
    while (size > 64 && base - capH(ctx, 'display', dw, size) < 128) size -= 4;
    bands += box(0, 0, W, gH, `background:${g.hex}`) +
      box(56 - lsb(ctx, 'display', dw, big, size), topForBaseline(ctx, 'display', dw, size, 1, base), 0, 0, disp(ctx, size, 1, gInk, 'letter-spacing:-0.02em'), `<p class="disp r-nw num">${A(big)}</p>`) +
      row(g, topForBaseline(ctx, 'body', 400, 15, 1.6, base), 15);
    y = gH;
    for (const c of rest) {
      const h = (H * c.share) / tot, size = h >= 28 ? 15 : 12, lh = size === 15 ? 24 : 16, ink = inkOn(ctx, c.hex), ty = y + (h - lh) / 2;
      bands += box(0, y, W, h, `background:${c.hex}`) + (h >= 16 ? box(56, ty, 82, lh, `color:${ink}`, `<p class="r-t${size} r-w600 num">${pc(c)}%</p>`) + row(c, ty, size) : '');
      y += h;
    }
    const same = rest.length > 1 && rest.every((c) => pc(c) === pc(rest[0]));
    const others = same ? `${rest.map((c) => c.name).join(rest.length === 2 ? ' and ' : ', ')} take ${pc(rest[0])} per cent each.` : rest.map((c) => `${c.name} ${pc(c)} per cent`).join(', ') + '.';
    const intro = `Each band is one colour's share of a page, drawn to scale. ${g.name} is ${g.share >= 0.5 ? 'most of every page' : 'the largest share'}. ${others}`;
    const lines = wrap(ctx, 'body', 400, intro, 15, 560);
    return page('proportion', '', bands + box(56, 72, 560, 0, `color:${chromeOn(ctx, g.hex) === L(ctx).quiet ? L(ctx).textSoft : gInk}`, p15(lineHtml(lines))) + head(ctx, 'proportion', { left: [g.hex] }), L(ctx).surface);
  },

  // Contrast: one field for each ground the brand sets text on. On it, every text colour that passes, its ratio at display size in that very colour;
  // at the foot of the field, the colours that never go on it, each beside a swatch. The rule sits on the White strip under the fields.
  contrast(ctx) {
    const W = ctx.size.w, FH = 576, dw = dispW(ctx), gr = L(ctx).surface;
    const grounds = [...new Set([...ctx.pairs, ...ctx.unusedPairs].map((p) => p.bgHex.toUpperCase()))], fw = W / grounds.length, tw = fw - 48;
    const num = (r) => String(r).replace(/\s*:\s*1$/, '');
    const rs = fitOne(ctx, 'display', dw, ctx.pairs.map((p) => `${num(p.ratioText)} : 1`), 40, 28, tw);
    const fields = grounds.map((bg, i) => {
      const x = i * fw, tx = i === 0 ? 56 : x + 24, w = i === 0 ? fw - 80 : tw, ink = inkOn(ctx, bg), ch = chromeOn(ctx, bg);
      const used = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === bg), unused = ctx.unusedPairs.filter((p) => p.bgHex.toUpperCase() === bg).sort((a, b) => b.ratio - a.ratio);
      const nuH = unused.length ? 16 + 8 + unused.length * 20 : 0, nuTop = 552 - nuH, step = Math.min(112, (nuTop - 24 - 144) / Math.max(1, used.length));
      const entries = used.sort((a, b) => b.ratio - a.ratio).map((p, k) => {
        const y = 144 + k * step, fg = p.fgHex, lab = p.large ? ink : fg;
        const note = p.large && !/\d+\s?px/.test(p.use) ? `${p.use}. ${p.minSize || 24} px and over only.` : p.use;
        return box(tx, topForBaseline(ctx, 'display', dw, rs, 1, y + capH(ctx, 'display', dw, rs)), w, 0, disp(ctx, rs, 1, fg), `<p class="disp r-nw num">${A(num(p.ratioText))}<span style="font-size:${Math.max(24, Math.round(rs * 0.6))}px"> : 1</span></p>`) +
          box(tx, y + rs + 12, w, 0, `color:${lab}`, p12(`<span class="r-w600">${A(nameOf(ctx, p.fg))}</span><br>${A(note)}`));
      }).join('');
      const nu = unused.length ? box(tx, nuTop, w, 0, `color:${ch}`, p12('Never for text', 'r-w600', `color:${ink}`) +
        unused.map((p) => `<p class="r-t12 r-nw num" style="margin-top:4px;display:flex;align-items:center;gap:8px"><i style="display:block;flex:none;width:12px;height:12px;background:${p.fgHex};box-shadow:inset 0 0 0 1px ${ch}"></i>${A(nameOf(ctx, p.fg))}, ${A(num(p.ratioText))} : 1</p>`).join('')) : '';
      return box(x, 0, fw, FH, `background:${bg}`) + box(tx, 104, w, 0, '', p12(`On ${A(nameOfHex(ctx, bg))}`, 'r-w600', `color:${ink}`)) + entries + nu;
    }).join('');
    const intro = `Every text pair ${ctx.brand.name} uses, set on its own ground. Each ratio is printed in the colour it measures.`;
    const rule = 'Text needs 4.5 : 1. Type 24 px and over needs 3 : 1. A pair under its mark is never used for text.';
    const rw = headRightW(ctx), lastX = (grounds.length - 1) * fw, right = 1224 - rw >= lastX ? [grounds[grounds.length - 1]] : grounds.slice(Math.floor((1224 - rw) / fw));
    return page('contrast', '', fields + box(56, 600, span(6), 0, `color:${L(ctx).textSoft}`, p15(lineHtml(wrap(ctx, 'body', 400, intro, 15, span(6))))) +
      box(colX(7), 600, span(5), 0, `color:${L(ctx).quiet}`, p15(lineHtml(wrap(ctx, 'body', 400, rule, 15, span(5))))) +
      head(ctx, 'contrast', { left: [grounds[0]], right }), gr);
  },

  // Colour values: the appendix slide. Each colour is a row: its name and values on the left, its ramp from 50 to 900 as a wall of steps that runs off
  // the right edge. The step that is the colour itself is ringed. Tones run along the foot.
  'colour-values'(ctx) {
    const dw = dispW(ctx), gr = L(ctx).surface, ink = L(ctx).text, quiet = L(ctx).quiet;
    const rows = ctx.colours.filter((c) => c.rampBase !== 50), flat = ctx.colours.filter((c) => c.rampBase === 50), steps = Object.keys(rows[0]?.ramp || ctx.colours[0].ramp);
    const rx = 560, sw = (ctx.size.w - rx) / steps.length, top = 160, rh = Math.min(144, 432 / Math.max(1, rows.length));
    const head0 = steps.map((k, i) => box(rx + i * sw, 136, sw, 16, `color:${quiet};text-align:center`, p12(k, 'num'))).join('');
    const val = (label, v) => `<p class="r-t12 r-nw num" style="display:flex"><span style="width:56px;color:${quiet}">${label}</span><span class="r-mono" style="color:${ink}">${A(v)}</span></p>`;
    const body = rows.map((c, r) => {
      const y = top + r * rh, rgb = c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, '$1 $2 $3'), ok = c.oklch.replace(/^oklch\(|\)$/g, '');
      const cmyk = c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '';
      const chips = steps.map((k, i) => { const hx = c.ramp[k], base = +k === c.rampBase; return box(rx + i * sw, y, sw, rh, `background:${hx};${base ? `box-shadow:inset 0 0 0 3px ${inkOn(ctx, hx)}` : ''}`); }).join('');
      return chips + box(56, y + 12, 180, 0, `color:${ink};font-size:26px;line-height:30px`, `<p class="disp r-nw">${A(c.name)}</p>`) +
        box(56, y + 46, 180, 0, `color:${quiet}`, p12(`${A(ctx.cap(c.role))}. Step ${c.rampBase}.`, 'num')) +
        box(colX(2), y + 16, 280, 0, '', val('HEX', c.hex) + val('RGB', rgb) + val('OKLCH', ok) + (cmyk ? val('CMYK', cmyk) : ''));
    }).join('');
    const tones = ctx.tones, tw = (1224 - colX(2)) / Math.max(4, Math.min(tones.length, 5)), ty = top + rows.length * rh + 32;
    const toneHtml = tones.length ? box(56, ty, 180, 0, `color:${ink}`, p12('Tones', 'r-w600')) + tones.map((t, i) => box(colX(2) + (i % 4) * tw, ty + Math.floor(i / 4) * 40, tw - 16, 0, 'display:flex;gap:12px',
      `<i style="display:block;flex:none;width:32px;height:32px;background:${t.hex};box-shadow:inset 0 0 0 1px ${L(ctx).divider}"></i><span>${p12(A(t.name), 'r-w600 r-nw', `color:${ink}`)}${p12(A(t.hex), 'r-mono', `color:${ink}`)}</span>`)).join('') : '';
    const intro = `Values for screens. Print can shift a colour, so ask your printer for a proof before a run.${flat.length ? ` ${flat.map((c) => c.name).join(' and ')} ${flat.length > 1 ? 'are grounds' : 'is the ground'} and ${flat.length > 1 ? 'have' : 'has'} no tints.` : ''}`;
    return page('colour-values', '', box(56, 72, 472, 0, `color:${L(ctx).textSoft}`, p15(lineHtml(wrap(ctx, 'body', 400, intro, 15, 472)))) +
      box(rx, 88, 664, 0, `color:${quiet}`, p12('The ramp, 50 to 900. The ringed step is the colour itself.')) + head0 + body + toneHtml + head(ctx, 'colour-values'), gr);
  },

  // Hierarchy: the scale drawn to scale. Each step is a band whose height is its size's share of the page, its sample set at its true size on the band's
  // foot, and its numbers in the columns at the right on the same baseline. Blur it and you see the steps.
  hierarchy(ctx) {
    const B = ctx.brand, S = B.type.scale, c = B.ui.screen.content, ink = L(ctx).text, quiet = L(ctx).quiet, hair = L(ctx).divider, maxW = 600;
    const wn = (t) => (t.face === 'display' ? dispW(ctx) : t.weight);
    const fits = (t, s) => s && textW(ctx, t.face, wn(t), s, t.size, t.face === 'display' ? -0.01 : 0) <= maxW;
    const time = ((c.eta || '').match(/\d{1,2}:\d{2}/) || [])[0];
    const pool = { display: [B.lines.others[1], B.lines.others[0], time, c.status], headline: [B.lines.others[1], B.lines.others[0], B.type.sample.headline, c.eta], title: [B.lines.primary, ...(onceRe(ctx) ? [] : sentences(B.lines.primary)), c.rider, c.eta],
      body: [...sentences(sayOnce(ctx, B.type.sample.paragraph))], label: [c.form?.book, c.call], caption: [B.type.sample.caption, c.riderNote] };
    const used = new Set();
    const sample = (t) => { const s = (pool[t.token] || [t.use]).find((x) => allowed(ctx, x) && !used.has(x) && fits(t, x)) || t.use; used.add(s); return s; };
    const top = 72, H = ctx.size.h - top, tot = S.reduce((a, t) => a + t.size, 0);
    const minH = (t) => Math.ceil(t.size * t.line) + 16, hs = S.map((t) => Math.max(minH(t), (H * t.size) / tot)), k = H / hs.reduce((a, b) => a + b, 0);
    const cols = [colX(7), colX(7) + 88, colX(7) + 144, colX(7) + 192], ux = colX(7) + 248;
    let y = top, out = '';
    S.forEach((t, i) => {
      const h = hs[i] * k, isD = t.face === 'display', w = wn(t), cap = capH(ctx, t.face, w, t.size), base = Math.round(y + h / 2 + cap / 2);
      const st = isD ? disp(ctx, t.size, t.line, ink) : `color:${ink};font:${t.weight} ${t.size}px/${t.line} var(--body)`;
      const cell = (x, wd, html, cl = quiet) => box(x, topForBaseline(ctx, 'body', 400, 12, 4 / 3, base), wd, 0, `color:${cl}`, p12(html, 'r-nw num'));
      out += (i ? box(0, y, ctx.size.w, 1, `background:${hair}`) : '') +
        box(56, topForBaseline(ctx, t.face, w, t.size, t.line, base), maxW, 0, st, `<p class="${isD ? 'disp ' : ''}r-nw">${A(sample(t))}</p>`) +
        cell(cols[0], 90, A(ctx.cap(t.token)), ink) + cell(cols[1], 70, `${t.size} px`) + cell(cols[2], 70, `${t.line}`) + cell(cols[3], 60, `${t.weight}`) + cell(ux, 1224 - ux, A(t.use));
      y += h;
    });
    const hdr = [['Step', cols[0]], ['Size', cols[1]], ['Line', cols[2]], ['Weight', cols[3]], ['Use', ux]].map(([l, x]) => box(x, 88, 80, 0, `color:${ink}`, p12(l, 'r-w600'))).join('');
    const body = tok(ctx, 'body'), capt = tok(ctx, 'caption');
    const intro = `${S.length} steps, each with one job. Reading text is ${body.size} px and captions ${capt.size} px.`;
    return page('hierarchy', '', box(56, 88, span(6), 0, `color:${L(ctx).textSoft}`, p15(lineHtml(wrap(ctx, 'body', 400, intro, 15, span(6))))) + hdr + out + head(ctx, 'hierarchy'), L(ctx).surface);
  },

  // Type in use: one slide of the brand's own deck, on the action colour, at true size. The headline top left, the paragraph and its caption on the right,
  // and the three settings as a key along the foot.
  'type-in-use'(ctx) {
    const B = ctx.brand, S = B.type, act = byRole(ctx, 'action').hex, ink = inkOn(ctx, act), ch = chromeOn(ctx, act), dw = dispW(ctx);
    const h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const hl = pick(ctx, [S.sample.headline, ...B.lines.others, B.lines.primary]);
    const hlLines = balance(ctx, 'display', dw, hl, h.size, span(7), -0.01);
    const para = sayOnce(ctx, S.sample.paragraph), pw = span(5), pLines = wrap(ctx, 'body', bd.weight, para, bd.size, pw);
    const plh = bd.size * bd.line, pTop = Math.round(560 - pLines.length * plh - 16 - cp.size * cp.line);
    const capLines = wrap(ctx, 'body', cp.weight, sayOnce(ctx, S.sample.caption), cp.size, pw);
    const key = [['Headline', h], ['Paragraph', bd], ['Caption', cp]].map(([n, t], i) => box(colX(i * 3), 632, span(3), 0, `color:${ch}`,
      p12(`<span class="r-w600" style="color:${ink}">${n}</span><br>${t.size} px, line ${t.line}, ${A(fam(ctx, t))} ${t.weight}`, 'num'))).join('');
    const inner = box(0, 0, ctx.size.w, ctx.size.h, `background:${act}`) +
      box(56, 120, span(7), 0, disp(ctx, h.size, h.line, ink), `<h2 class="disp">${lineHtml(hlLines)}</h2>`) +
      box(colX(7), pTop, pw, 0, `color:${ink};font:${bd.weight} ${bd.size}px/${bd.line} var(--body)`, `<p>${lineHtml(pLines)}</p>`) +
      box(colX(7), pTop + pLines.length * plh + 16, pw, 0, `color:${ink};font:${cp.weight} ${cp.size}px/${cp.line} var(--body)`, `<p>${lineHtml(capLines)}</p>`) +
      box(0, 608, ctx.size.w, 1, `background:${ink}`) + key + head(ctx, 'type-in-use', { left: [act] });
    return page('type-in-use', '', inner, act);
  },

  // Type rules: the split slide. Do on the page ground, don't on the text colour, one rule a row, each side showing the rule in action where it can be
  // shown honestly (a size under the floor or faded text is never drawn, only written).
  'type-rules'(ctx) {
    const B = ctx.brand, R = B.type.rules, c = B.ui.screen.content, gr = L(ctx).surface, dk = byRole(ctx, 'text').hex, W = ctx.size.w, half = W / 2, dw = dispW(ctx);
    const inkL = L(ctx).text, softL = L(ctx).textSoft, inkD = inkOn(ctx, dk), softD = chromeOn(ctx, dk) === L(ctx).quiet ? ctx.roles.dark.textSoft : ctx.roles.dark.textSoft;
    const hairL = L(ctx).divider, hairD = ctx.roles.dark.divider, it = (B.fonts.display.italics || []).length > 0;
    const line = pick(ctx, [B.lines.others[1], B.lines.others[0], B.type.sample.headline]), show = (c.deliveries || [])[0]?.to || line;
    const sent = pick(ctx, sentences(sayOnce(ctx, B.type.sample.paragraph)).filter((s) => s.length < 70));
    const D = (t, st = '') => `<p class="disp r-nw" style="font-size:32px;line-height:1;letter-spacing:-0.01em;${st}">${A(t)}</p>`;
    const Bt = (t, size, st = '') => `<p class="r-nw" style="font:400 ${size}px/1.4 var(--body);${st}">${A(t)}</p>`;
    // a demo pair [do, don't] for a rule, read from its words; null where the rule cannot be drawn without breaking it
    const demo = (r, inkD2) => {
      const both = `${r.do} ${r.dont}`;
      if (/capital/i.test(r.dont)) return [/italic/i.test(r.do) && it ? D(show, 'font-style:italic') : D(line), D(line, 'text-transform:uppercase')];
      if (/letter-space|tracking/i.test(both)) return [D(line), D(line, 'letter-spacing:0.14em')];
      if (/mono/i.test(both)) return [`<p class="r-mono r-t22 num">${A(L(ctx).action)}</p>`, `<p class="r-mono r-t22">${A(c.form?.book || line)}</p>`];
      if (/paragraph in/i.test(r.dont)) return [Bt(sent, 16), `<p class="disp r-nw" style="font-size:16px;line-height:1.4;font-weight:${dw}">${A(sent)}</p>`];
      if (/\d+\s?px/.test(r.do)) { const bd = tok(ctx, 'body'), cp = tok(ctx, 'caption'); return [`<p class="r-nw" style="font:400 ${bd.size}px/1.4 var(--body)">${A(sent)}</p><p class="r-nw" style="font:400 ${cp.size}px/1.4 var(--body);color:${L(ctx).quiet}">${A(B.type.sample.caption)}</p>`, null]; }
      if (/opacity/i.test(r.dont)) return [`<p class="r-nw" style="font:600 15px/1.4 var(--body)">${A(c.rider || line)}</p><p class="r-nw" style="font:400 15px/1.4 var(--body);color:${L(ctx).quiet}">${A(c.riderNote || '')}</p>`, null];
      return [null, null];
    };
    const top = 128, rh = (ctx.size.h - top) / R.length;
    const rows = R.map((r, i) => {
      const y = top + i * rh, [dDo, dNo] = demo(r), tw = half - 112;
      const side = (x, html, text, ink, soft, hair) => box(x, y, half, 1, `background:${hair}`) + (html ? box(x + 56, y + 20, tw, 44, `color:${ink};display:flex;flex-direction:column;justify-content:flex-start;overflow:visible`, html) : '') +
        box(x + 56, y + (html ? 64 : 20), tw, 0, `color:${soft}`, p15(lineHtml(wrap(ctx, 'body', 400, text, 15, tw))));
      return side(0, dDo, r.do, inkL, softL, hairL) + side(half, dNo, r.dont, inkD, softD, hairD);
    }).join('');
    const inner = box(half, 0, half, ctx.size.h, `background:${dk}`) + box(56, 80, 200, 0, `color:${inkL}`, p15('Do', 'r-w600')) + box(half + 56, 80, 200, 0, `color:${inkD}`, p15("Don't", 'r-w600')) +
      rows + head(ctx, 'type-rules', { left: [gr], right: [dk] });
    return page('type-rules', '', inner, gr);
  },
};

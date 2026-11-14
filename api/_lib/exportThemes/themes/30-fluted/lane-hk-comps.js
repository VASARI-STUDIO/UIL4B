// Theme 30, Fluted, kit site: the component pages (buttons, inputs, choices, cards, navigation, lists, status, feedback).
// The real components (ctx.ui) sit above the glass, every state forced by class; the glass holds that page's own values as windows.
// Colours come from the colour roles only; brand copy is printed whole through A(). Every class here starts hk-.
import { A, adv } from './helpers.js';
import { statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { tower, win, poly, box, columns, VH, FLAT, P } from './lane-hk-glass.js';
import { frame, grp, cols, rows, na, ui as region, v, sc, ratio, faint, sizeOf, shortest } from './lane-hk-parts.js';

const tok = (s) => `<span class="hk-v">${A(s)}</span>`;
const kn = (s) => `<span class="hk-kn">${A(s)}</span>`;

export const pages = {
  // ---- buttons: the four kinds, then the three sizes, each over a window: the size's height and corner, k times over ----
  buttons: (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, X = S.example || {}, u = ctx.ui, Rd = ctx.radius, bc = ctx.borders[1];
    const ctl = ctx.uiType.find((t) => t.token === 'control') || { size: 16 };
    const kinds = [
      ['Primary', u.btn(F.book), `${tok('--action')} fill, ${tok('--action-label')} words.`],
      ['Secondary', u.btn(X.secondary || 'Edit', { variant: 'secondary' }), `A ${bc.px} px edge in ${tok('--text')}.`],
      ['Quiet', u.btn(X.quiet || 'Skip', { variant: 'quiet' }), 'Underlined, with no fill.'],
      ['Danger', u.btn(X.danger || 'Remove', { variant: 'danger' }), `${tok('--danger')} fill, for what can't be undone.`],
    ];
    const chev = iconSet(ctx).includes('chevron-right') ? 'chevron-right' : null;
    const sizes = [['Small', 36, 'sm', 'Inside rows and cards'], ['Default', 44, null, ''], ['Large', 52, 'lg', 'One a screen at most']];
    const show = cols(4, kinds.map(([n, b, d]) => grp(n, region(`<div class="hk-stack">${b}<p class="hk-d">${d}</p></div>`))).join(''))
      + cols(3, sizes.map(([n, h, s, d]) => grp(n, region(`<div class="hk-stack">${u.btn(F.book, { size: s || undefined, iconRight: s === 'lg' ? chev : null })}<p class="hk-d">${tok(`${h} px high`)} ${A(d)}</p></div>`))).join(''));
    const k = Math.floor(VH / 52);
    return frame(ctx, K, {
      title: 'Buttons', lead: `Four kinds and three sizes, one shape: ${Rd.button} px corners and the label at ${ctl.size} px. One primary on a screen, and its label is a verb that says what happens.`, show,
      build: (M) => {
        const cl = columns(3, { gap: 24 });
        return {
          art: sizes.map(([, h], i) => tower(cl.x(i), cl.cw, VH - h * k, { r: Math.min(cl.cw / 2, Rd.button * k), fill: M.action })).join(''),
          items: sizes.map(([n, h], i) => ({ x: cl.x(i), w: cl.cw + 24, a: A(n), b: tok(`${h} px high`) })),
          note: `Each window is a size's height and its ${Rd.button} px corner, ${k} times over at the page's full width; the width is not to scale.`,
        };
      },
    });
  },

  // ---- inputs: the text field and the select in four states, the text area beside; each state's edge, as tall as its contrast ----
  inputs: (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, u = ctx.ui, bc = ctx.borders[1], bf = ctx.borders[2], sizes = F.sizes || [];
    const names = ['Rest', 'Focus', 'Error', 'Disabled'];
    const sel = (n, o = {}) => u.field({ id: `hk-in-s${n}`, label: F.size, kind: 'select', options: sizes, value: sizes[0], ...o });
    const fld = (n, o = {}) => u.field({ id: `hk-in-t${n}`, label: F.ready, value: F.readyValue, ...o });
    const mk = (t, cs) => rows(t, cs.map((c, i) => [names[i], c]), 4);
    const show = grp('Text area', region(u.field({ id: 'hk-in-a', label: F.notes, kind: 'textarea', help: F.notesHelp })), 'hk-narrow')
      + mk('Text field', [fld(1), fld(2, { state: 'focus' }), fld(3, { error: F.readyError }), fld(4, { disabled: true })])
      + mk('Select', [sel(1), sel(2, { state: 'focus' }), na('Same edge and message as the text field.'), sel(4, { disabled: true })]);
    const K6 = 6, st = [['edge', bc.px], ['focus', bf.px], ['danger', bc.px], ['disabled-bg', 0]];
    return frame(ctx, K, {
      title: 'Inputs', lead: `The label always sits above the field, and the line under it turns into the error when there is one. In the glass, each state's edge, as tall as its contrast on the surface; the line marks 3 : 1.`, show,
      build: (M) => {
        const rs = st.map(([t]) => ctx.ratio(M[t], M.surface)), un = VH / Math.max(...rs), cl = columns(4, { gap: 24 });
        return {
          art: st.map(([t, w], i) => (w ? tower(cl.x(i), cl.cw, VH - rs[i] * un, { r: ctx.radius.input * K6, stroke: M[t], sw: w * K6 })
            : win(cl.x(i), cl.cw, VH - rs[i] * un, { r: ctx.radius.input * K6, fill: M[t], ring: faint(ctx, M, M[t]) ? M.quiet : null }))).join(''),
          items: st.map(([t, w], i) => ({ x: cl.x(i), w: cl.cw + 24, a: `${ratio(ctx, M[t], M.surface)} : 1`, b: tok(`--${t}${w ? `, ${w} px` : ''}`) })),
          lines: [VH - 3 * un],
          note: `Edges and corners ${K6} times their size at the page's full width. Disabled drops the edge and takes the grey fill; it is the one state that need not reach 3 : 1.`,
        };
      },
    });
  },

  // ---- choices: checkbox, radio and switch in five states, the segmented control under them; each control switched on, eight times its size ----
  choices: (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, X = S.example || {}, u = ctx.ui, W = ctx.weights, bc = ctx.borders[1], fs = sizeOf(ctx, 'control');
    const cb = shortest(ctx, X.checks, fs, W.regular) || F.title, rd = shortest(ctx, X.radios, fs, W.regular) || F.title, sw = shortest(ctx, X.switches, fs, W.regular) || F.title;
    const names = ['Off', 'On', 'Focus', 'Disabled', 'Disabled, on'], st = [{}, { checked: true }, { checked: true, state: 'focus' }, { disabled: true }, { disabled: true, checked: true }];
    const seg = F.sizes || [];
    const show = rows('Checkbox', st.map((o, i) => [names[i], u.check(cb, o)])) + rows('Radio', st.map((o, i) => [names[i], u.check(rd, { ...o, type: 'radio', name: `hk-rd${i}` })])) + rows('Switch', st.map((o, i) => [names[i], u.switch(sw, o)]))
      + cols(2, grp('Segmented', region(u.segmented(seg, 1))) + grp('Segmented, disabled', region(u.segmented(seg, 1, { disabled: true }))));
    return frame(ctx, K, {
      title: 'Choices', lead: `Checkboxes for several, radios for one of a few, a switch for something that takes effect at once, and the segmented control to change a view. In the glass, each one switched on, 8 times its size.`, show,
      build: (M) => {
        const k = 8, cw = 22 * k, sww = 44 * k, gap = 48, x0 = Math.round((60 + (960 - (2 * cw + sww + 2 * gap)) / 2) / P) * P;
        const xc = x0, xr = xc + cw + gap, xsw = xr + cw + gap, top = 0, th = -Math.PI / 4, ccx = xc + cw / 2, ccy = top + cw / 2;
        const L = [[-5, -2.5], [-5, 2.5], [5, 2.5], [5, 0.5], [-3, 0.5], [-3, -2.5]].map(([a, b]) => [ccx + k * (a * Math.cos(th) - b * Math.sin(th)), ccy + k * (a * Math.sin(th) + b * Math.cos(th) - 1)]);
        const art = tower(xc, cw, top, { r: ctx.radius.input * k, fill: M.text }) + poly(L, M.surface)
          + tower(xr, cw, top, { r: cw / 2, stroke: M.text, sw: bc.px * k }) + box(xr + cw / 2 - 5 * k, top + cw / 2 - 5 * k, 10 * k, 10 * k, 5 * k, { fill: M.text })
          + win(xsw, sww, top, { r: 13 * k, fill: M.action, ring: M.text, sw: bc.px * k }) + box(xsw + 22 * k, top + 4 * k, 16 * k, 16 * k, 8 * k, { fill: M.text });
        return {
          art,
          items: [{ x: xc, w: cw + gap, a: 'Checkbox', b: tok(`22 px, ${ctx.radius.input} px corner`) }, { x: xr, w: cw + gap, a: 'Radio', b: tok('22 px, round') }, { x: xsw, w: sww, a: 'Switch', b: tok('44 by 26 px') }],
          note: `Each control switched on, ${k} times its size at the page's full width: its corner, its ${bc.px} px edge and its mark as built. The switch takes ${tok('--action')} when on.`,
        };
      },
    });
  },

  // ---- cards: four cards in columns; under each, its parts stacked in the colours they print in, one step a part ----
  cards: (ctx, K) => {
    const S = sc(ctx), X = S.example || {}, u = ctx.ui;
    const act = `<div class="hk-act">${u.btn(X.secondary || S.call || 'Edit', { variant: 'secondary', size: 'sm' })}</div>`;
    const cards = [
      ['Card', u.card({ meta: S.status, title: S.rider, text: S.riderNote }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft']]],
      ['With an action', u.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, action: act }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft'], ['Action', 'action']]],
      ['Raised', u.card({ meta: S.paidLabel, title: S.paid, text: S.pickup, raised: true }), [['Meta', 'quiet'], ['Title', 'text'], ['Text', 'text-soft']]],
      ['Stat', `${u.stat(S.paid, S.paidLabel)}${u.stat(S.deliverTo, S.deliverToLabel)}`, [['Value', 'text'], ['Label', 'quiet']]],
    ];
    const show = cols(4, cards.map(([n, c]) => grp(n, region(c))).join(''));
    return frame(ctx, K, {
      title: 'Cards', lead: `A card holds one thing. On the surface a hairline edge marks it; a raised card takes the raised ground and drops the edge. In the glass, each card's parts, top to bottom, in the colours they print in.`, show,
      build: (M) => {
        const cl = columns(4, { gap: 24 }), most = Math.max(...cards.map((c) => c[2].length)), step = Math.floor((VH + P) / most), art = [], items = [];
        cards.forEach(([, , parts], i) => {
          parts.forEach(([, t], j) => {
            const from = VH - (parts.length - j) * step, foot = from + step - (j === parts.length - 1 ? 0 : P), r = j === 0 ? ctx.radius.card * 4 : 0;
            art.push(tower(cl.x(i), cl.cw, from, { r, foot, fill: M[t] }));
            if (faint(ctx, M, M[t])) art.push(tower(cl.x(i), cl.cw, from, { r, foot, stroke: M.quiet, sw: 2 }));
          });
          items.push({ x: cl.x(i), w: cl.cw + 24, a: `${parts.length} parts`, b: A(parts.map((p) => p[0]).join(', ')) });
        });
        return { art: art.join(''), items, note: `Each step is one part, in the token it prints in. The top step carries the card's ${ctx.radius.card} px corner, 4 times over.` };
      },
    });
  },

  // ---- navigation: top bar, tabs, breadcrumbs, sidebar and the phone's tab bar; the top bar's links, each as wide as it is built ----
  navigation: (ctx, K) => {
    const S = sc(ctx), X = S.example || {}, u = ctx.ui, W = ctx.weights, icons = iconSet(ctx);
    const links = (X.links || []).filter((l) => !l[1] || icons.includes(l[1]));
    const acct = [X.account || 'Account', icons.includes('user') ? 'user' : null], all = [...links, acct];
    const name = `<span class="ui-display" style="font-size:var(--fs-title-s);line-height:var(--lh-title-s)">${A(ctx.brand.name)}</span>`;
    const top = `<nav class="ui-topbar" aria-label="Main">${name}<div class="ui-topbar__links">${u.links(links, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${u.links(all, 0)}</nav>`;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${all.slice(0, 4).map(([t, i], j) => `<a href="#"${j === 0 ? ' aria-current="page"' : ''}>${i ? u.icon(i, 20) : ''}${A(t)}</a>`).join('')}</nav>`;
    const show = grp('Top bar', region(top)) + cols(2, grp('Tabs', region(u.tabs(X.tabs || [], 0))) + grp('Breadcrumbs', region(u.crumbs(X.crumbs || []))))
      + cols(2, grp('Sidebar', region(side, 'hk-side')) + grp('Tab bar, on a phone', region(bar, 'hk-phone')));
    const fs = sizeOf(ctx, 'label'), lw = links.map(([t, i]) => 24 + (i ? 26 : 0) + adv(ctx, 'body', t, fs, 0, W.medium));
    const G = 24, k = Math.min(4, Math.floor((960 - G * (links.length - 1)) / lw.reduce((a, b) => a + b, 0) * 4) / 4);
    return frame(ctx, K, {
      title: 'Navigation', lead: `Where you are, said once: the current page carries a bar in the action colour, and every link is 44 px tall. In the glass, the top bar's links, each as wide as it is built.`, show,
      build: (M) => {
        let x = 60;
        const art = [], items = [];
        links.forEach(([t], i) => {
          const w = Math.round(lw[i] * k);
          art.push(i === 0 ? tower(x, w, 0, { r: ctx.radius.control * k, fill: M.action }) : tower(x, w, 96, { r: ctx.radius.control * k, stroke: M['text-soft'], sw: 2 }));
          items.push({ x, w: w + G, a: A(t), b: tok(`${Math.round(lw[i])} px`) });
          x += w + G;
        });
        return { art: art.join(''), items, note: `Each link ${k} times its width at the page's full width, its ${ctx.radius.control} px corner too. The current page stands taller, in ${tok('--action')}; the others are outlines in ${tok('--text-soft')}.` };
      },
    });
  },

  // ---- lists: the product's rows with lead, detail and status; the rows again as bars, each in its status colour ----
  lists: (ctx, K) => {
    const S = sc(ctx), u = ctx.ui, D = S.deliveries || [], d0 = D[0] || {}, d1 = D[1] || d0;
    const show = cols(2, grp('With a lead and a status', region(u.deliveryRows(D.length)))
      + `<div class="hk-stackg">${grp('Without a lead', region(`<ul class="ui-list">${[d0, d1].map((d) => u.row({ title: d.to, sub: d.when, end: d.price })).join('')}</ul>`))}`
      + `${grp('As a link, the whole row', region(`<ul class="ui-list">${u.row({ lead: u.icon(d0.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d0.to, sub: d0.when, href: '#' })}</ul>`))}</div>`);
    return frame(ctx, K, {
      title: 'Lists', lead: `One row is one item: the title says what, the line under it says when, and the status is the only colour. Figures are tabular, so a column lines up. In the glass, the rows as bars, in their status colours.`, show,
      build: (M, mode) => {
        const n = Math.min(D.length, 5), y0 = FLAT + Math.round((384 - n * 64 + P) / 2);
        return {
          art: D.slice(0, n).map((d, i) => { const s = ctx.status.find((x) => x.id === d.status); return box(60, y0 + i * 64, 576, 64 - P, 0, { fill: s ? statusText(ctx, mode, s).hex : M.text }); }).join(''),
          items: [{ x: 60, w: 576, a: `${n} rows`, b: '' }],
          note: `Each bar is a row, 64 px apart and as wide as the list, in the token its status prints in. The list's only colour is its status.`,
        };
      },
    });
  },

  // ---- status: the brand's states on the light and the dark surface, with their ratios; each state as wide as its words and as tall as their contrast ----
  status: (ctx, K) => {
    const u = ctx.ui, W = ctx.weights, St = ctx.status, n = St.length;
    const panel = (m) => `<div class="ui hk-m-${m} hk-panel"><h2 class="hk-gl">${m === 'light' ? 'On the light surface' : 'On the dark surface'}</h2><ul class="hk-stl">${St.map((s) => { const c = statusText(ctx, m, s); return `<li>${u.statusChip(s.id)}<span class="hk-v">${ratio(ctx, c.hex, ctx.roles[m].surface)} : 1</span></li>`; }).join('')}</ul></div>`;
    const show = cols(2, panel('light') + panel('dark'));
    const fs = sizeOf(ctx, 'label'), ws = St.map((s) => adv(ctx, 'body', s.label, fs, 0, W.medium)), G = 24, k = Math.min(4, Math.floor((960 - G * (n - 1)) / ws.reduce((a, b) => a + b, 0) * 4) / 4);
    return frame(ctx, K, {
      title: 'Status', lead: `Plain words in one colour, never a tinted pill: the label says what is happening, with a time or a count where it helps. In the glass, each state as wide as its words and as tall as their contrast on this page; the line marks 4.5 : 1.`, show,
      build: (M, mode) => {
        const cs = St.map((s) => statusText(ctx, mode, s)), rs = cs.map((c) => ctx.ratio(c.hex, M.surface)), un = VH / Math.max(...rs);
        let x = 60;
        const art = [], items = [];
        St.forEach((s, i) => { const w = Math.round(ws[i] * k); art.push(tower(x, w, VH - rs[i] * un, { fill: cs[i].hex })); items.push({ x, w: w + G, a: `${ctx.fmt(rs[i])} : 1`, b: tok(cs[i].token) }); x += w + G; });
        return { art: art.join(''), items, lines: [VH - 4.5 * un], note: `Each window is a state's words ${k} times as wide as they set, at the page's full width, in the token they print in on this page.` };
      },
    });
  },

  // ---- feedback: toast, inline message and loading; the four alerts in columns, each standing on its tone's window ----
  feedback: (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, u = ctx.ui;
    const tones = [['info', 'Information', S.pickup], ['success', 'Success', S.toast], ['warning', 'Warning', S.alert], ['danger', 'Danger', F.readyError]];
    const show = cols(3, grp('Toast', region(u.toast(S.toast))) + grp('Inline message', region(`<p class="ui-inline-msg">${u.icon('info', 16)}<span>${A(S.inline)}</span></p>`))
      + grp('Loading', region(`<div class="hk-load">${u.spinner()}<div class="hk-skel">${u.skeleton('100%')}${u.skeleton('64%')}${u.skeleton('80%')}</div></div>`)))
      + cols(4, tones.map(([t, n, s]) => grp(n, region(u.alert(t, s)))).join(''));
    return frame(ctx, K, {
      title: 'Feedback', lead: `Say what happened and what to do next, in a sentence or two. A banner stays until it is dealt with; a toast leaves by itself. In the glass, each tone as tall as its contrast on the surface; the line marks 3 : 1.`, show,
      build: (M) => {
        const rs = tones.map(([t]) => ctx.ratio(M[t], M.surface)), un = VH / Math.max(...rs), cl = columns(4, { gap: 24 });
        return {
          art: tones.map(([t], i) => tower(cl.x(i), cl.cw, VH - rs[i] * un, { fill: M[t] })).join(''),
          items: tones.map(([t], i) => ({ x: cl.x(i), w: cl.cw + 24, a: `${ratio(ctx, M[t], M.surface)} : 1`, b: tok(`--${t}`) })),
          lines: [VH - 3 * un],
          note: `The tone is the alert's edge and icon only; its words stay in ${tok('--text')}. A spinner is for a short wait; longer ones show the rows' shape.`,
        };
      },
    });
  },
};

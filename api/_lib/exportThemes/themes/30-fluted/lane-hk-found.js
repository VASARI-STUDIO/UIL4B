// Theme 30, Fluted, kit site: the cover, contents and the foundation pages (colour, type, spacing, radii, elevation, states).
// The real components (ctx.ui) are placed, never restyled; the glass figure under them holds that page's own values (a ratio, a size, a count) as windows.
// Colours come from the colour roles only. Brand copy is printed whole through A(). Every class here starts hk-.
import { A, adv, tokens, logoHtml } from './helpers.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { tower, box, win, columns, VH, FLAT, P } from './lane-hk-glass.js';
import { frame, grp, cols, rows, na, ui as region, v, sc, pad3, ratio, marksOf, faint, sizeOf, shortest } from './lane-hk-parts.js';

const snap = (x) => Math.round(x / P) * P;
const fit = (list, ok) => list.filter((s) => typeof s === 'string' && s.length).find(ok);
const kn = (s) => `<span class="hk-kn">${A(s)}</span>`;
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const pages = {
  // ---- cover: the product's own primary button, many times its size, standing into the glass ----
  cover: (ctx, K) => {
    const B = ctx.brand, S = sc(ctx), F = S.form || {}, X = S.example || {}, W = ctx.weights, label = F.book || 'Continue', T = tokens(ctx);
    const show = `<div class="hk-cv"><div class="hk-logo">${logoHtml(ctx, T, 'colour', { width: 240, color: 'var(--text-soft)' })}</div><p class="hk-lead">${A(B.product)}</p>`
      + region(`<div class="hk-btns">${ctx.ui.btn(label)}${ctx.ui.btn(X.secondary || 'Edit', { variant: 'secondary' })}</div>`) + '</div>';
    return frame(ctx, K, {
      title: 'UI kit', sub: `Version ${B.version.number}`, big: true, show,
      build: (M) => {
        const pad = parseFloat(tokenGroups(ctx).space['sp-5']) || 24, bw1 = adv(ctx, 'body', label, 16, 0, W.medium) + 2 * pad + 2 * B.ui.border;
        const k = Math.max(3, Math.min(8, Math.floor(952 / (bw1 * 1.03)))), BW = snap(bw1 * k), BH = 44 * k;
        return {
          art: box(60, FLAT - 24, BW, BH, ctx.radius.button * k, { fill: M.action }),
          items: [{ x: 60, w: 600, a: A(`The primary button, ${k} times its size`), b: v(`44 px high, radius ${ctx.radius.button} px`) },
            ...(B.version.date ? [{ x: 720, w: 300, a: A('Version date'), b: v(longDate(B.version.date)) }] : [])],
          note: 'Drawn at the page\'s full width, the width the kit is read at.',
        };
      },
    });
  },

  // ---- contents: the parts in columns, each page with its folio; one window for each part, as wide as its pages ----
  contents: (ctx, K) => {
    const S = K.sections, n = S.length, total = K.pages.length;
    const show = cols(n, S.map((s) => grp(s.title, `<ol class="hk-toc">${s.pages.map((p) => `<li><a href="${K.href(p.id)}">${A(p.title)}</a><span class="hk-v">${pad3(p.no)}</span></li>`).join('')}</ol>`)).join(''));
    return frame(ctx, K, {
      title: 'Contents', lead: `${total} pages: the cover, these contents and ${n} parts. In the glass, one window for each part, as wide as the pages it holds.`, show,
      build: (M) => {
        const cl = columns(n, { gap: 24 }), maxP = Math.max(...S.map((s) => s.pages.length)), unit = Math.max(6, Math.floor(cl.cw / maxP / 6) * 6), mk = marksOf(ctx, M);
        return {
          art: S.map((s, i) => tower(cl.x(i), s.pages.length * unit, 0, { fill: mk[i % mk.length] })).join(''),
          items: S.map((s, i) => ({ x: cl.x(i), w: cl.cw, a: `${s.pages.length} ${s.pages.length === 1 ? 'page' : 'pages'}`, b: '' })),
        };
      },
    });
  },

  'colour-light': (ctx, K) => colourPage(ctx, K, 'light'),
  'colour-dark': (ctx, K) => colourPage(ctx, K, 'dark'),

  // ---- type scale: each step set at its size in the product's own words, largest first; one window per step ----
  'type-scale': (ctx, K) => {
    const B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, E = S.empty || {}, stretch = B.fonts.display.stretch || 100;
    const cand = { headline: [S.eta, S.time, E.title], title: [S.rider, F.title, S.time], 'title-s': [D.title, E.title, F.title], control: [F.book, (S.example || {}).secondary],
      body: [S.pickup, S.riderNote, E.body], label: [F.pickup, F.dropoff], caption: [F.notesHelp, F.bookWhy] };
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size), n = steps.length;
    const fam = [B.fonts.display.family, B.fonts.body.family], one = fam[0] === fam[1];
    const list = steps.map((t) => {
      const text = fit([...(cand[t.token] || []), t.use], () => true) || t.use, face = t.face === 'display' ? `font-family:var(--ff-display);font-stretch:${stretch}%;letter-spacing:-0.02em` : 'font-family:var(--ff-body)';
      return `<li class="hk-ts"><span class="hk-tsx" style="${face};font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(text)}</span>${kn(t.token)}<span class="hk-v">${t.size} / ${t.line} / ${t.weight}</span></li>`;
    }).join('');
    const lead = `${n} sizes, each set here at the size it ships, in the product's own words. ${one ? `One face, ${A(fam[0])}: titles in ${ctx.weights.heading}, everything people read and press in ${ctx.weights.regular} and ${ctx.weights.medium}.` : `${A(fam[0])} for titles, ${A(fam[1])} for everything people read and press.`}`;
    return frame(ctx, K, {
      title: 'Type scale', lead, show: `<ul class="hk-tsl">${list}</ul>`,
      build: (M) => {
        const sum = steps.reduce((a, t) => a + t.size, 0), u = Math.min(6, Math.floor((960 - P * (n - 1)) / sum / 0.5) * 0.5);
        let x = 60;
        const art = [], items = [];
        steps.forEach((t) => {
          const w = Math.round(t.size * u);
          art.push(tower(x, w, 0, t.face === 'display' ? { fill: M.action } : { stroke: M.text }));
          items.push({ x, w: w + P, a: A(t.token), b: v(`${t.size} px`) });
          x += w + P;
        });
        return { art: art.join(''), items, note: `Each window is as wide as its step is tall. Solid: ${one ? 'the title steps' : A(fam[0])}. Outline: ${one ? 'the reading steps' : A(fam[1])}.` };
      },
    });
  },

  // ---- spacing: the steps as a list, a real form group measured in them; a row of windows whose gaps are the steps ----
  spacing: (ctx, K) => {
    const sp = ctx.space, n = sp.length, base = ctx.brand.ui.spacingBase, F = sc(ctx).form || {}, u = ctx.ui, names = Object.keys(tokenGroups(ctx).space);
    const list = sp.map((s, i) => `<li class="hk-spr"><span class="hk-v">${A('--' + (names[i] || s.token))}</span><i class="hk-spb" style="width:${s.px}px"></i><span class="hk-v">${s.px} px</span></li>`).join('');
    const pick = (px) => (sp.find((s) => s.px === px) || sp[Math.min(n - 1, 3)]).px, gIn = pick(16), gOut = pick(32);
    const gap = (px) => `<div class="hk-gap" style="height:${px}px"><i></i><span class="hk-v">${px}</span></div>`;
    const form = `<div class="hk-form">${u.field({ id: 'hk-sp1', label: F.pickup || 'Name', value: F.pickupValue || '' })}${gap(gIn)}${u.field({ id: 'hk-sp2', label: F.dropoff || 'Email', value: F.dropoffValue || '' })}${gap(gOut)}<div>${u.btn(F.book || 'Save')}</div></div>`;
    const show = cols(2, grp('The steps', `<ul class="hk-spl">${list}</ul>`) + grp('Inside a group, then between groups', region(form)));
    const WW = 36, sum = sp.reduce((a, s) => a + s.px, 0), k = Math.min(3, Math.floor((960 - (n + 1) * WW) / sum * 4) / 4);
    return frame(ctx, K, {
      title: 'Spacing', lead: `A ${base} px step. Every gap and padding in the kit is one of these ${n}. A gap inside a group is smaller than the gap between groups.`, show,
      build: (M) => {
        let x = 60;
        const art = [], items = [];
        for (let i = 0; i <= n; i++) {
          art.push(tower(x, WW, 0, { fill: M.action }));
          if (i < n) { const g = snap(sp[i].px * k) || P; items.push({ x: x + WW + g / 2 - 24, w: 48, a: '', b: `<span class="hk-v hk-c">${sp[i].px}</span>` }); x += WW + g; }
        }
        return { art: art.join(''), items, note: `Each gap is a step in px, ${k} times its size, at the page's full width: at ${base} px a step, ${base * k} px of glass is one step.` };
      },
    });
  },

  // ---- radii and borders: the real components at 1:1 with their corners and edges; each radius on a tower and each line width as an outline ----
  'radii-borders': (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, u = ctx.ui, Rd = ctx.radius, [bh, bc, bf] = ctx.borders;
    const cap = (t, val) => `<p class="hk-cap">${kn(t)}${v(val)}</p>`;
    const show = cols(4, grp('Button', region(`<div>${u.btn(F.book || 'Save')}</div>${cap('Corner', `${Rd.button} px`)}`))
      + grp('Input', region(`${u.field({ id: 'hk-rb', label: F.dropoff || 'Name', value: F.dropoffValue || '', state: 'focus' })}${cap('Focused', `${Rd.input} px, edge ${bc.px} px, ring ${bf.px} px`)}`))
      + grp('Card', region(`${u.card({ meta: S.status, title: S.rider, text: S.riderNote })}${cap('Corner', `${Rd.card} px, edge ${bh.px} px`)}`))
      + grp('Round', region(`<div class="hk-btns"><span class="ui-avatar">${A(S.initials || '')}</span>${u.switch((S.example || {}).switches ? S.example.switches[0] : 'On', { checked: true })}</div>${cap('Avatars and switches', 'Fully round')}`)));
    const items = [['Control', Rd.control, null], ['Card', Rd.card, null], ['Round', null, null], ['Divider', Rd.card, bh.px], ['Control edge', Rd.control, bc.px], ['Focus ring', Rd.control, bf.px]];
    const cl = columns(6), kk = Math.max(2, Math.min(8, Math.floor(cl.cw / 3 / Math.max(Rd.card, 1))));
    return frame(ctx, K, {
      title: 'Radii and borders', lead: `Corners belong to the product: controls take ${Rd.control} px and cards ${Rd.card} px, and only avatars and switches go round. The page around them is square.`, show,
      build: (M) => ({
        art: items.map(([, rad, line], i) => (line ? tower(cl.x(i), cl.cw, 0, { r: rad * kk, stroke: M.text, sw: line * kk }) : tower(cl.x(i), cl.cw, 0, { r: rad == null ? cl.cw / 2 : rad * kk, fill: M.action }))).join(''),
        items: items.map(([name, rad, line], i) => ({ x: cl.x(i), w: cl.cw + P, a: A(name), b: v(rad == null && !line ? 'Fully round' : line ? `${line} px` : `${rad} px`) })),
        note: `In the glass, every corner and line ${kk} times its size, at the page's full width: solid for the radii, an outline for the widths.`,
      }),
    });
  },

  // ---- elevation: the four levels as the real components; a stair of windows in the levels' own colours, each a step higher ----
  elevation: (ctx, K) => {
    const S = sc(ctx), u = ctx.ui, D = S.dialog || {}, B = ctx.brand;
    const show = cols(3, grp('Surface', region(u.card({ meta: S.status, title: S.rider, text: S.riderNote })))
      + grp('Raised', region(u.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true })))
      + grp('Sunken', region(`<div class="hk-well">${u.skeleton('72%')}${u.skeleton('48%')}${u.skeleton('60%')}</div>`)))
      + grp('Floating', region(`<div class="hk-dlg">${u.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || 'OK', keep: D.keep || 'Cancel' }).replace(/dlg-t/g, 'hk-dlg-t')}</div>`));
    const lv = [['Sunken', 'sunken'], ['Surface', 'surface'], ['Raised', 'raised'], ['Floating', 'surface']];
    return frame(ctx, K, {
      title: 'Elevation', lead: A(B.ui.elevationNote || ''), show,
      build: (M) => {
        const cl = columns(4, { gap: 24 }), step = VH / 4;
        return {
          art: lv.map(([, t], i) => win(cl.x(i), cl.cw, VH - step * (i + 1), { fill: M[t], ring: i === 3 ? M.text : faint(ctx, M, M[t]) ? M.quiet : null, sw: i === 3 ? Math.max(2, B.ui.border * 2) : 2 })).join(''),
          items: lv.map(([name, t], i) => ({ x: cl.x(i), w: cl.cw + 24, a: A(name), b: v(`--${t} ${M[t].toUpperCase()}`) })),
          note: `Each window stands a step higher than the one before. The floating one carries the dialog's edge; its shadow token is ${v(String(tokenGroups(ctx).shadow['shadow-float']))}.`,
        };
      },
    });
  },

  // ---- states: every control at rest and in each state, forced by class; the primary's fill in each state, as tall as its label's contrast on it ----
  states: (ctx, K) => {
    const S = sc(ctx), F = S.form || {}, X = S.example || {}, u = ctx.ui, W = ctx.weights;
    const names = ['Rest', 'Hover', 'Focus', 'Pressed', 'Disabled'], sec = X.secondary || 'Edit', chk = shortest(ctx, X.checks, sizeOf(ctx, 'control'), W.regular) || F.title;
    const same = na('Same as rest'), btn = (label, variant) => (state) => u.btn(label, { variant, state });
    const fld = (n, o = {}) => u.field({ id: `hk-st-${n}`, label: F.ready, value: F.readyValue, ...o });
    const mk = (title, cs) => rows(title, cs.map((c, i) => [names[i], c]));
    const show = mk('Primary', [undefined, 'hover', 'focus', 'pressed'].map(btn(F.book, 'primary')).concat(na('Never disabled: its label names the next step.')))
      + mk('Secondary', [undefined, 'hover', 'focus', 'pressed', 'disabled'].map(btn(sec, 'secondary')))
      + mk('Text field', [fld(1), same, fld(2, { state: 'focus' }), same, fld(3, { disabled: true })])
      + mk('Checkbox', [u.check(chk, { checked: true }), same, u.check(chk, { checked: true, state: 'focus' }), same, u.check(chk, { checked: true, disabled: true })]);
    const st = [['action', 'action-label'], ['action-hover', 'action-label'], ['action', 'action-label'], ['action-pressed', 'action-label'], ['disabled-bg', 'disabled-text']];
    return frame(ctx, K, {
      title: 'States', lead: `Every control at rest and in each state it can take, set here by class so they all show at once. In the glass, the primary button's fill in each state, as tall as its label's contrast on it; the line marks 4.5 : 1.`, show,
      build: (M) => {
        const rs = st.map(([f, l]) => ctx.ratio(M[l], M[f])), un = VH / Math.max(...rs), cl = columns(5);
        return {
          art: st.map(([f], i) => win(cl.x(i), cl.cw, VH - rs[i] * un, { fill: M[f], ring: i === 2 ? M.focus : faint(ctx, M, M[f]) ? M.quiet : null, sw: i === 2 ? ctx.borders[2].px * 3 : 2 })).join(''),
          items: st.map(([f, l], i) => ({ x: cl.x(i), w: cl.cw + P, a: `${ratio(ctx, M[l], M[f])} : 1`, b: v(`--${i === 2 ? 'focus' : f}`) })),
          lines: [VH - 4.5 * un],
          note: `Each window is the button's fill in that state; the focused one carries the ring. Under each, its label's contrast and the token that changes.`,
        };
      },
    });
  },
};

// ---------------------------------------------------------------- colour (light and dark share one composition, so the two pages compare)
function colourPage(ctx, K, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, X = S.example || {}, u = ctx.ui;
  const G1 = [['Surface', 'surface'], ['Raised', 'raised'], ['Sunken', 'sunken'], ['Scrim', 'scrim'], ['Control edge', 'edge'], ['Divider', 'divider'], ['Focus ring', 'focus']];
  const G2 = [['Action', 'action'], ['Action hover', 'action-hover'], ['Action pressed', 'action-pressed'], ['Action label', 'action-label'], ['Disabled', 'disabled-bg'], ['Disabled text', 'disabled-text']];
  const li = ([n, t]) => `<li class="hk-sw"><i style="background:${M[t]};border-color:${ctx.ratio(M[t], M.surface) < 1.5 ? M.quiet : M[t]}"></i><span class="hk-sn">${A(n)}</span><span class="hk-v">${A('--' + t)}</span><span class="hk-v hk-hex">${A(M[t].toUpperCase())}</span></li>`;
  const show = cols(2, grp('Grounds and lines', `<ul class="hk-swl">${G1.map(li).join('')}</ul>${region(`<div class="hk-btns hk-chips">${ctx.status.map((s) => u.statusChip(s.id)).join('')}</div>`)}`)
    + grp('Action and states', `<ul class="hk-swl">${G2.map(li).join('')}</ul>${region(`<div class="hk-btns">${u.btn(F.book || 'Save')}${u.btn(X.secondary || 'Edit', { variant: 'secondary' })}${u.btn(F.book || 'Save', { disabled: true })}</div>`)}`));
  const inks = [['Text', 'text'], ['Soft', 'text-soft'], ['Quiet', 'quiet'], ['Action', 'action-text'], ['Edge', 'edge'], ['Focus', 'focus'], ['Success', 'success'], ['Warning', 'warning'], ['Danger', 'danger'], ['Info', 'info']];
  const cs = [];
  for (const [nm, t] of inks) { if (!M[t]) continue; const same = cs.find((c) => M[c[1]].toLowerCase() === M[t].toLowerCase()); if (same) same[0] += `, ${nm.toLowerCase()}`; else cs.push([nm, t]); }
  return frame(ctx, K, {
    title: mode === 'light' ? 'Colour, light' : 'Colour, dark', mode, show,
    lead: `Every role the components read, printed on the ${mode} surface itself. In the glass, each colour that carries text or a control edge, as tall as its contrast on this surface; the lines across it mark 4.5 : 1 and 3 : 1.`,
    build: () => {
      const cl = columns(cs.length), rs = cs.map(([, t]) => ctx.ratio(M[t], M.surface)), un = VH / Math.max(...rs);
      return {
        art: cs.map(([, t], i) => tower(cl.x(i), cl.cw, VH - rs[i] * un, { fill: M[t] })).join(''),
        items: cs.map(([n, t], i) => ({ x: cl.x(i), w: cl.cw + P, a: A(n), b: v(`${ratio(ctx, M[t], M.surface)} : 1`) })),
        lines: [VH - 4.5 * un, VH - 3 * un],
      };
    },
  });
}

// Guidelines pages for theme 08, Riso: proportion, typefaces, hierarchy, type-in-use, type-rules. Styles are in css-p-type.js
// (classes start rt-). Every figure is a printed sheet of the paper with a registration cross at each corner; only the brand's
// real colours print. The type pages print in the Ink drum. The hierarchy page is the one with separations: a poster set in the
// scale at true size, then each drum's layer of it, small, side by side.
import { A } from './helpers.js';
import { page, corners, drums, drumNo, paper, byRole, pc, inkOn, readInk, Word, isSurface } from './guidelines-r.js';

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const fmt = (s) => `${s.size} / ${Math.round(s.size * s.line)} px`;
const faceOf = (ctx, s) => (s.face === 'display' ? ctx.brand.fonts.display : ctx.brand.fonts.body);
// a style is italic when its use says so (read through ctx.real, so the slot edition's placeholder is never parsed)
const isItalic = (ctx, s) => /italic/i.test(ctx.real(s.use));
const styleOf = (ctx, s) => `font-family:var(--${s.face});font-size:${s.size}px;line-height:${s.line};font-weight:${s.weight};${isItalic(ctx, s) ? 'font-style:italic;' : ''}`;
const WNAME = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
const top = (title, lead = '', wide = false) => `<div class="r-top"><h1 class="r-h1">${title}</h1>${lead ? `<p class="r-lead${wide ? ' rt-lead' : ''}">${lead}</p>` : ''}</div>`;
// a spec line's use in the slot edition: the brand's own words belong to its sample, so each role says what it is for in neutral words
const USE = { display: 'The largest title, one line', headline: 'A page\'s main line', title: 'Names and short titles', body: 'Reading text on screen', label: 'Buttons, dates and short labels', caption: 'Captions and folios' };
const useOf = (ctx, s) => (ctx.edition === 'slot' ? USE[s.token] || 'Text in this style' : A(s.use));

// the job line, copied from p-image.js as it stands (one form across the theme): each drum the sheet prints, in drum order, its name
// in its own ink where that reads, then what it carries; whatever is in the paper's colour is the paper showing through; a tone
// that is no drum is named as it is. It sits under its sheet, never inside it.
const hx = (h) => String(h).toLowerCase();
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const nameOfHex = (ctx, hex) => { const c = ctx.colours.find((x) => hx(x.hex) === hx(hex)) || ctx.tones.find((x) => hx(x.hex) === hx(hex)); return c ? c.name : ''; };
function job(ctx, uses, photo = false) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    const c = drumOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hx(hex) === hx(p.hex)) through.push(what); else other.push([nameOfHex(ctx, hex), what]);
  }
  const used = D.filter((c) => by.has(c));
  const parts = used.map((c) => `<span class="rt-jd"><i class="rt-sw" style="background:${c.hex}"></i><b style="color:${readInk(ctx, c.hex)}">Drum ${drumNo(ctx, c)} ${A(c.name)}</b>: ${by.get(c).join(', ')}.</span>`);
  const n = used.length, lead = `<span class="rt-jn">${Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span>`;
  const show = through.length ? ` <span>The paper shows through for ${through.join(', ')}.</span>` : '';
  const rest = other.map(([nm, what]) => ` <span>${A(nm)}: ${what}.</span>`).join('');
  const ph = photo ? ' <span class="rt-jn">The photograph keeps its own colour: no drum prints over it.</span>' : '';
  return `<p class="rt-job">${lead} ${parts.join(' ')}${show}${rest}${ph}</p>`;
}

// the hierarchy poster, authored at true size. One grid: the sheet in the first column (drawn behind its cells), each style's spec
// in the margin beside it, on its specimen's baseline; the logo signs the foot. The poster grows with its copy (the slot edition's placeholders run longer), and the separations are
// scaled with zoom so their height follows. A layer (1, 2, 3...) is the same grid with every other drum's work hidden, so it registers exactly.
const PO = { w: 380, h: 600, k: 0.26, lw: 150 };
function poster(ctx, layer = 0) {
  const B = ctx.brand, S = B.ui.screen.content, T = B.type.sample, L = ctx.roles.light, D = drums(ctx);
  const ink = byRole(ctx, 'text'), act = byRole(ctx, 'action');
  // the headline is the brand's primary line (the slot edition draws the headline sample at real size, too tall for the poster)
  // the slot edition's display line is the brand name: its placeholder is short enough to show the 64 px size in one or two lines.
  // Every cell takes the compact placeholder (ph-tight), set at its role's size, so the slot poster keeps the scale
  const sample = { display: ctx.edition === 'slot' ? B.name : S.deliveries[0].to, headline: B.lines.primary, title: S.rider, body: S.pickup, label: S.form.book, caption: T.caption };
  const rows = B.type.scale.map((s) => {
    const st = styleOf(ctx, s), txt = A(sample[s.token] || s.use);
    // the label is the button: the Vermilion drum prints its fill and the label is the paper left bare
    const cell = s.token === 'label'
      ? `<span class="rt-po__btn" data-dr="${drumNo(ctx, act)}" style="background:${L.action};color:${L.actionLabel};${st}">${txt}</span>`
      : `<p data-dr="${drumNo(ctx, ink)}" style="color:${ink.hex};${st}">${txt}</p>`;
    const note = `<div class="rt-po__n"><p class="r-mono">${A(s.token)}</p><p class="rt-po__sz">${fmt(s)}, ${A(faceOf(ctx, s).family)} <span class="num">${s.weight}</span>${isItalic(ctx, s) ? ' italic' : ''}.</p><p class="rt-q">${useOf(ctx, s)}</p></div>`;
    return `<div class="rt-po__c ph-tight">${cell}</div>${note}`;
  }).join('');
  // the logo signs the poster at its foot, plate and name each in its own drum. A separation keeps only its own drum's paths of it
  // (showcase); the slot frame prints with the type, in the Ink drum
  const cw = B.logo.colourways.colour, lg = ctx.logo.html('colour', { width: PO.lw, colourway: 'colour', color: cw.name, label: 'Your logo goes here' });
  const logo = `<div class="rt-po__c rt-po__ft"><div class="rt-po__lg"${ctx.edition === 'slot' ? ` data-dr="${drumNo(ctx, ink)}"` : ''}>${lg}</div></div><div></div>`;
  // a separation carries its crosses in its own ink; on the composite they print in register, so the Ink set shows
  const xc = layer ? D[layer - 1].hex : ink.hex;
  return `<div class="rt-po${layer ? ` rt-po--sep rt-po--l${layer}` : ''}" style="min-height:${PO.h}px;grid-template-columns:${PO.w}px minmax(0,1fr)">`
    + `<div class="rt-sheet rt-po__sh" style="width:${PO.w}px">${corners(xc)}</div>${rows}${logo}</div>`;
}

export const pType = {
  // the page drawn to scale as a printed sheet: the paper is everything the drums leave bare, and each drum's coverage is a solid
  // along the foot, its width by share, so every area is true to its percent. The paper's share is the one large number.
  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), total = cs.reduce((s, c) => s + c.share, 0);
    const [g, t, ...rest] = cs, P = paper(ctx), D = drums(ctx), ink = ctx.roles.light.text;
    // the sheet is A4 at 460 px; the band sits inside the 16 px edge a riso cannot print into
    const W = 460, H = Math.round((W * 1123) / 794), M = 16, dS = D.reduce((s, c) => s + c.share, 0);
    const bh = Math.round(((dS / total) * W * H) / (W - M * 2));
    const blk = (c) => `<div class="rt-cov__d" style="width:${((c.share / dS) * 100).toFixed(3)}%;background:${c.hex};color:${inkOn(ctx, c.hex)}"><span class="rt-cov__k">Drum ${drumNo(ctx, c)}</span><span class="rt-cov__n">${A(c.name)}</span><span class="rt-cov__p num">${pc(c)}%</span></div>`;
    const sheet = `<div class="rt-sheet rt-cov" style="width:${W}px;height:${H}px">${corners(ink)}<p class="rt-cov__pp"><span class="rt-cov__k">Paper</span><span class="rt-cov__n">${A(P.name)}</span></p>`
      + `<div class="rt-cov__b" style="left:${M}px;right:${M}px;bottom:${M}px;height:${bh}px">${D.map(blk).join('')}</div></div>`;
    const fig = `<figure class="rt-pf">${sheet}<figcaption class="rt-cap"><p>One page, drawn to scale. Each colour's area is its share.</p>${job(ctx, D.map((c) => [c.hex, `<span class="num">${pc(c)}%</span> of the page`]))}</figcaption></figure>`;
    const words = `<div class="rt-pw"><p class="rt-big num">${pc(P)}%</p><p class="rt-big__c">of every page is the paper, ${A(P.name)}. It takes no ink.</p>`
      + `<p class="rt-rule">Most of every page is ${A(g.name)}. ${A(t.name)} holds the text, and ${A(rest.map((c) => c.name).join(' and '))} stay small so they stay the loudest things on it.</p></div>`;
    return page(ctx, 'proportion', `${top('Proportion', 'How much of a page each colour covers.')}<div class="rt-body rt-body--pr">${fig}${words}</div>`);
  },

  // three specimen sheets printed in the Ink drum: the display face large across the measure, then the body face and the mono face
  // side by side; each sheet's face, weights and rule sit beneath it. The mono sheet prints its token in the drum it names.
  typefaces(ctx) {
    const f = ctx.brand.fonts, d = f.display, b = f.body, m = f.mono, R = ctx.brand.type.rules, L = ctx.roles.light;
    const ink = byRole(ctx, 'text'), act = byRole(ctx, 'action'), actInk = readInk(ctx, L.action);
    const monoDrum = actInk.toLowerCase() === act.hex.toLowerCase() ? act : ink;
    const note = (label, name, weights, rule) => `<div class="rt-fn"><p class="r-ps__d rt-q">${label}</p><h2 class="rt-fn__n">${name}</h2><p class="rt-fn__w">${weights}</p><p class="rt-fn__r">${rule}</p></div>`;
    const wl = (fam) => `${A(fam.family)} <span class="num">${fam.weights.join(', ')}</span>`;
    const dSheet = `<div class="rt-sheet rt-fs rt-fs--d">${corners(ink.hex)}<p class="rt-aa"><span class="disp">Aa</span><span class="disp rt-it">Aa</span></p>`
      + `<p class="disp rt-gl">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br><span class="num">0123456789</span> &amp; ? !</p></div>${job(ctx, [[ink.hex, 'the specimen']])}`;
    const weights = b.weights.map((w) => `<li style="font-weight:${w}">${WNAME[w] || w} <span class="num">${w}</span></li>`).join('');
    const bSheet = `<div class="rt-sheet rt-fs rt-fs--b">${corners(ink.hex)}<div class="rt-fs__row"><span class="rt-aa rt-aa--b">Aa</span><ul class="rt-wts">${weights}</ul></div></div>${job(ctx, [[ink.hex, 'the specimen']])}`;
    const mSheet = `<div class="rt-sheet rt-fs rt-fs--m">${corners(monoDrum.hex)}<p class="rt-ms" style="color:${actInk}">--action: ${A(L.action)};</p></div>${job(ctx, [[monoDrum.hex, 'the token']])}`;
    return page(ctx, 'typefaces', `${top('Typefaces')}<div class="rt-body rt-body--tf">`
      + `<figure class="rt-ff rt-ff--d">${dSheet}${note('Display', `${A(d.family)}, with its italic`, wl(d), A(R[0].do))}</figure>`
      + `<div class="rt-ffr"><figure class="rt-ff">${bSheet}${note('Body', A(b.family), wl(b), A(R[1].do))}</figure>`
      + `<figure class="rt-ff">${mSheet}${note('Mono', A(m.family), wl(m), A(R[4].do))}</figure></div>`
      + `<p class="rt-lic">All three are open fonts under the SIL Open Font Licence, free from Google Fonts.</p></div>`);
  },

  // the scale on a poster at true size, each style's spec in the margin beside it; under it, the poster's separations side by side
  hierarchy(ctx) {
    const B = ctx.brand, D = drums(ctx), ink = byRole(ctx, 'text'), act = byRole(ctx, 'action');
    // what each drum prints on the poster: the type, the button, and the logo's plate and name by their own colours (the slot
    // edition's logo frame prints with the type)
    const cw = B.logo.colourways.colour, is = (h, c) => ctx.edition !== 'slot' && hx(h) === hx(c.hex);
    const carries = (c) => {
      const t = [c === ink && (ctx.edition === 'slot' ? 'the type and the logo' : 'the type'), c === act && 'the button', is(cw.plate, c) && 'the logo\'s plate', is(cw.name, c) && 'the logo\'s name'].filter(Boolean);
      return t.length ? t.length === 1 ? t[0] : `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}` : 'nothing on this poster';
    };
    // a separation that prints nothing on this poster is left out (the slot edition's logo frame prints with the type, so a third drum is bare)
    const k = PO.k, seps = D.map((c, i) => (carries(c) === 'nothing on this poster' ? '' : `<figure class="rt-sep"><div class="rt-sep__sh" style="width:${PO.w * k}px" aria-hidden="true"><div class="rt-sep__in" style="zoom:${k}">${poster(ctx, i + 1)}</div></div>`
      + `<figcaption><span class="r-ps__d rt-q">Drum ${i + 1}</span><span class="rt-sep__n">${A(c.name)}</span><span class="rt-sep__c">Prints ${carries(c)}</span></figcaption></figure>`)).join('');
    const lead = `${Word(B.type.scale.length)} sizes, set at true size on a poster. Hierarchy comes from size and from ${A(ink.name)} against the quiet grey, never from fading. Sizes and line heights are in px.`;
    return page(ctx, 'hierarchy', `${top(A(ctx.pages.find((p) => p.id === 'hierarchy').title), lead, true)}<div class="rt-body rt-body--hi">${poster(ctx)}<div class="rt-seps">${seps}</div></div>`);
  },

  // a folded room sheet at true size, down to the foot margin: the work and its caption on the left panel, the headline and the
  // reading text on the right, the fold between. The headline's cap height sits on the photo's top edge and the paragraph's last line
  // on the caption's; each style's spec sits under the panel that carries it
  'type-in-use'(ctx) {
    const B = ctx.brand, T = B.type.sample, h = tok(ctx, 'headline'), p = tok(ctx, 'body'), c = tok(ctx, 'caption'), ink = byRole(ctx, 'text');
    const sheet = `<div class="rt-sheet rt-rs${ctx.edition === 'slot' ? ' rt-rs--slot' : ''}">${corners(ink.hex)}<div class="rt-rs__l"><div class="rt-rs__ph">${ctx.photo('work', { style: 'width:100%;height:100%' })}</div><p class="rt-rs__cap" style="${styleOf(ctx, c)}">${A(T.caption)}</p></div>`
      + `<i class="rt-rs__fold" aria-hidden="true"></i><div class="rt-rs__r"><h2 class="rt-rs__h" style="${styleOf(ctx, h)}">${A(T.headline)}</h2><p class="rt-rs__p" style="${styleOf(ctx, p)}">${A(T.paragraph)}</p></div></div>`;
    const sp = (label, txt) => `<div class="rt-rsn__i"><p class="r-ps__d">${label}</p><p class="rt-rsn__t">${txt}</p></div>`;
    const notes = `<div class="rt-rsn"><div>${sp('Caption', `${fmt(c)}, in the quiet grey, below the work`)}</div>`
      + `<div class="rt-rsn__r">${sp('Headline', `${fmt(h)}, ${A(B.fonts.display.family)} <span class="num">${h.weight}</span>`)}${sp('Paragraph', `${fmt(p)}, ${A(B.fonts.body.family)} <span class="num">${p.weight}</span>`)}</div></div>`;
    return page(ctx, 'type-in-use', `${top('Type in use', 'A sheet set in the brand\'s type, at true size.')}<div class="rt-body rt-body--tu">${sheet}${notes}</div>`);
  },

  // a two-drum sheet: each rule to keep printed in Ink, the one that never happens in Vermilion beneath it; the first rule leads
  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, n = R.length, ink = byRole(ctx, 'text'), act = byRole(ctx, 'action'), vInk = readInk(ctx, act.hex);    const rule = (r, i) => `<li class="rt-tr${i === 0 ? ' rt-tr--lead' : ''}"><span class="disp rt-tr__n num" style="color:${ink.hex}">${i + 1}</span><div class="rt-tr__b">`
      + `<p class="rt-tr__do" style="color:${ink.hex}"><b>Do.</b> ${A(r.do)}</p>`
      + `<p class="rt-tr__no" style="color:${vInk}"><b>Don't.</b> ${A(r.dont)}</p></div></li>`;
    // the sheet spans the measure and its height follows its rules: the first rule across the top, the other four two by two under it
    const sheet = `<div class="rt-sheet rt-trs">${corners(ink.hex)}<ol class="rt-trl">${R.map(rule).join('')}</ol></div>`;
    const jl = job(ctx, [[ink.hex, 'what to do'], [vInk, 'what never happens']]);
    return page(ctx, 'type-rules', `${top('Type rules', `${Word(n)} things to do, and the ${Word(n).toLowerCase()} that never happen.`)}<div class="rt-body rt-body--ru"><figure class="rt-pf">${sheet}${jl}</figure></div>`);
  },
};

// Lane ht: the notes under each slide of the guidelines site. A deck published to the web keeps its speaker notes: here they are
// the page's rules as readable text, so the guidelines work on a phone where the slide is only a picture. Each page gets one big
// line (the slide's one idea, in words) and its notes; brand copy is printed whole, every value is read from ctx.
import { A, L, lower, nameOfHex, fieldStyle, darkF, actF, panelF, fitSize, words } from './lane-ht-lib.js';
import { onceRe, sayOnce } from './lane-g3-kit.js';

// A brand that says one word once (Long Room: "Say free once") prints it on the slide and nowhere else: these notes leave it off, as the print pages do.
const ok = (ctx, t) => { const re = onceRe(ctx); return !!t && !(re && re.test(t)); };
const keep = (ctx, t) => (ok(ctx, t) ? t : '');
// the one line a page leads with: the primary line, or the brand's next line where the primary line carries the word
const lead = (ctx) => { const B = ctx.brand; return ok(ctx, B.lines.primary) ? B.lines.primary : (B.lines.others.find((t) => ok(ctx, t)) || B.name); };

const dl = (rows) => `<dl class="ht-dl">${rows.filter(([, v]) => v).map(([k, v]) => `<dt>${A(k)}</dt><dd>${v}</dd>`).join('')}</dl>`;
const pair = (rows, [h1, h2]) => `<ul class="ht-pair"><li><p class="ht-pair__h">${A(h1)}</p><p class="ht-pair__h">${A(h2)}</p></li>${rows.map(([a, b]) => `<li><p><span class="ht-pair__k">${A(h1)}</span>${a}</p><p><span class="ht-pair__k">${A(h2)}</span>${b}</p></li>`).join('')}</ul>`;
const list = (items) => `<ol class="ht-list">${items.map((x) => `<li><span>${x}</span></li>`).join('')}</ol>`;
const p = (t, cls = 'ht-p') => (t ? `<p class="${cls}">${t}</p>` : '');
const m = (t) => `<span class="ht-m">${A(t)}</span>`;
const pct = (n) => `${Math.round(n * 100)}%`;
// fields that meet at straight edges; a field on the page ground gets a hairline so it reads against the ground
const fields = (ctx, items, n = items.length) => `<div class="ht-fields" style="--n:${n}">${items.map((f) => `<div class="ht-field${lower(f.hex) === lower(L(ctx).surface) ? ' ht-field--hair' : ''}${lower(f.hex) === lower(darkF(ctx)) ? ' ht-field--dk' : ''}" style="${fieldStyle(ctx, f.hex, f.what || 'site notes field', f.size || 15)}${f.style || ''}">${f.html}</div>`).join('')}</div>`;
const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
const doDont = (rules) => pair(rules.map((r) => [A(r.do), A(r.dont)]), ['Do', 'Do not']);
const colourField = (ctx, c, big) => ({
  hex: c.hex, what: `site colour ${c.name}`, size: big ? 32 : 15,
  html: `<p class="ht-d ht-field__w" style="--ws:${big ? 'clamp(32px, 14cqw, 56px)' : 'clamp(24px, 12cqw, 32px)'}">${A(c.name)}</p><p class="ht-field__c">${A(c.lands || '')}<span class="ht-m">${A(c.hex)}</span></p>`,
});

export const NOTES = {
  intro: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: p(A(keep(ctx, B.description)), 'ht-lead') + dl([['What it does', A(keep(ctx, B.product))], ['Who it serves', A(B.audience)], ['Where', A(B.city)]]) }; },
  personality: (ctx) => {
    const P = ctx.brand.personality, g = [panelF(ctx), actF(ctx), darkF(ctx)];
    const ws = fitSize(ctx, P.map((x) => x.trait), 0.9, 48, 24);
    return { big: `${words(P.length)} traits`, html: fields(ctx, P.map((x, i) => ({ hex: g[i % 3], what: 'site trait field', html: `<p class="ht-field__c">${A(sayOnce(ctx, x.means))}</p><p class="ht-d ht-field__w" style="--ws:${ws}">${A(x.trait)}</p>` })), Math.min(P.length, 3)) };
  },
  voice: (ctx) => { const V = ctx.brand.voice, P = V.principles.filter((x) => ok(ctx, x.title) && ok(ctx, x.example)); return { big: P[0].example, html: list(P.map((x) => `<b>${A(x.title)}</b>${A(x.example)}`)) }; },
  'write-this': (ctx) => { const W = ctx.brand.voice.writeThis.filter((r) => ok(ctx, r.write) && ok(ctx, r.not) && ok(ctx, r.because)); return { big: W[0].write, html: pair(W.map((r) => [A(r.write), `${A(r.not)}<br><span class="ht-field__q">${A(r.because)}</span>`]), ['Write this', 'Not that, and why']) }; },
  messaging: (ctx) => { const B = ctx.brand, V = B.voice; return { big: lead(ctx), html: (B.lines.others.length ? list(B.lines.others.filter((t) => ok(ctx, t)).map(A)) : '') + dl([['In 25 words', A(sayOnce(ctx, V.boilerplate25))], ['In 50 words', A(sayOnce(ctx, V.boilerplate50))], ['Writing the name', A(V.nameRules)]]) }; },
  logo: (ctx) => ({ big: ctx.brand.logo.idea, html: dl([['Writing the name', A(ctx.brand.voice.nameRules)], ['Versions', A(ctx.logo.versions.map((v) => ctx.logo.labels[v]).join(', '))]]) }),
  'logo-versions': (ctx) => {
    const Lg = ctx.logo, cw = ctx.brand.logo.colourways;
    return { big: `${words(Lg.versions.length)} versions`, html: fields(ctx, Lg.versions.map((id) => { const w = cw[Lg.colourwayOf(id)]; return { hex: w.ground, what: `site logo ${id}`, html: `<div class="ht-field__logo">${Lg.html(id, { width: id === 'symbol' ? 72 : 200, label: Lg.labels[id] })}</div><p class="ht-field__c"><b>${A(Lg.labels[id])}</b><br>${A(ctx.brand.logo.when[id] || '')}</p>` }; }), 2) };
  },
  'clear-space': (ctx) => ({ big: `Keep ${ctx.logo.clearShare}% of the logo's height clear on every side.`, html: p('The clear space is measured from the logo itself, so it grows and shrinks with it. Nothing else sits inside it: no type, no edge, no other mark.', 'ht-lead') }),
  'min-size': (ctx) => { const ms = ctx.logo.minSize; return { big: `${ms.screenPx} px on screen. ${ms.printMm} mm in print.`, html: p('Below the smallest size the logo stops reading as one shape. Where a space is smaller, use the symbol.', 'ht-lead') + dl([['On screen', m(`${ms.screenPx} px`)], ['In print', m(`${ms.printMm} mm`)]]) }; },
  'logo-grounds': (ctx) => {
    const cw = ctx.brand.logo.colourways;
    return { big: 'Each ground has one version.', html: fields(ctx, Object.entries(cw).map(([k, v]) => ({ hex: v.ground, what: `site logo ground ${k}`, html: `<div class="ht-field__logo">${ctx.logo.html('colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0], { width: 180, colourway: k, color: v.name, label: 'Logo' })}</div><p class="ht-field__c"><b>${A(ctx.cap ? ctx.cap(k.replace(/-/g, ' ')) : k)}</b></p>` })), 3) };
  },
  'logo-misuse': () => ({ big: 'Use the logo as it is drawn.', html: list(misuse.map(A)) }),
  palette: (ctx) => {
    const cs = [...ctx.colours].sort((a, b) => (a.role === 'action' ? -1 : b.role === 'action' ? 1 : 0));
    return { big: `${words(cs.length)} colours`, html: fields(ctx, cs.map((c, i) => colourField(ctx, c, i === 0)), 2) };
  },
  proportion: (ctx) => {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share);
    return { big: `${pct(cs[0].share)} ${cs[0].name}`, html: `<div class="ht-stripe" role="img" aria-label="${A(cs.map((c) => `${c.name} ${pct(c.share)}`).join(', '))}">${cs.map((c) => `<div style="flex:${c.share};${fieldStyle(ctx, c.hex, `site proportion ${c.name}`)}${lower(c.hex) === lower(L(ctx).surface) ? ';box-shadow:inset 0 0 0 1px var(--h)' : ''}"><span class="num">${pct(c.share)}</span></div>`).join('')}</div>` + dl(cs.map((c) => [c.name, `<span class="num">${pct(c.share)}</span>. ${A(c.lands || '')}`])) };
  },
  contrast: (ctx) => ({
    big: `${words(ctx.pairs.length)} pairs that pass`,
    html: `<ol class="ht-scale">${ctx.pairs.map((q) => `<li><p class="ht-k">${A(q.ratioText)}<span>${q.large ? '24 px and over' : 'Any size'}</span></p><p class="ht-scale__s" style="background:${q.bgHex};color:${q.fgHex};padding:16px 20px;font-size:${q.large ? 24 : 17}px;line-height:1.35;${q.large ? 'font-weight:600;' : ''}${lower(q.bgHex) === lower(L(ctx).surface) ? 'box-shadow:inset 0 0 0 1px var(--h)' : ''}">${A(nameOfHex(ctx, q.fgHex))} on ${A(nameOfHex(ctx, q.bgHex))}. ${A(q.use || '')}</p></li>`).join('')}</ol>`,
  }),
  'colour-values': (ctx) => ({ big: 'Copy the values as written.', html: dl([...ctx.colours, ...ctx.tones].map((c) => [c.name, `${m(c.hex)} ${m(`rgb(${ctx.C.hexToRgb(c.hex).join(', ')})`)}${ctx.C.cmykOf(c) ? ` ${m(ctx.C.cmykOf(c))}` : ''}`])) }),
  typefaces: (ctx) => { const F = ctx.brand.fonts; return { big: F.display.family, html: dl([['Display', `${A(F.display.family)}, <span class="num">${F.display.weights.join(', ')}</span>`], ['Body', `${A(F.body.family)}, <span class="num">${F.body.weights.join(', ')}</span>`], ['Mono', `${A(F.mono.family)}, <span class="num">${F.mono.weights.join(', ')}</span>. Literal values only.`]]) }; },
  hierarchy: (ctx) => ({
    big: `${words(ctx.brand.type.scale.length)} steps`,
    html: `<ol class="ht-scale">${ctx.brand.type.scale.map((t) => { const role = t.face === 'display' ? 'ht-d' : ''; return `<li><p class="ht-k">${A(t.token)}<span class="num">${t.size} px, weight ${t.weight}</span></p><p class="ht-scale__s ${role}" style="font-size:min(${t.size}px, 12cqw);line-height:${t.line < 3 ? t.line : (t.line / t.size).toFixed(2)};font-weight:${t.weight};${t.face === 'mono' ? 'font-family:var(--mono)' : ''}">${A(t.use)}</p></li>`; }).join('')}</ol>`,
  }),
  'type-in-use': (ctx) => { const S = ctx.brand.type.sample; return { big: ok(ctx, S.headline) ? S.headline : lead(ctx), html: p(A(sayOnce(ctx, S.paragraph)), 'ht-lead') + p(A(sayOnce(ctx, S.caption))) }; },
  'type-rules': (ctx) => ({ big: ctx.brand.type.rules[0].do, html: doDont(ctx.brand.type.rules) }),
  'photo-direction': (ctx) => { const D = ctx.brand.imagery.direction; return { big: D.subject, html: dl(Object.entries(D).filter(([k]) => k !== 'subject').map(([k, v]) => [ctx.cap ? ctx.cap(k) : k, A(v)])) }; },
  'shot-list': (ctx) => { const S = ctx.brand.imagery.shots; return { big: `${words(S.length)} shots`, html: list(S.map((s) => `<b>${A(s.caption || s.alt)}</b>${A(s.alt)}${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}`)) }; },
  'imagery-rules': (ctx) => ({ big: ctx.brand.imagery.rules[0].do, html: doDont(ctx.brand.imagery.rules) }),
  grid: (ctx) => { const G = ctx.brand.layout; return { big: `${G.columns} columns`, html: dl([['Page', m(`${G.page.w} × ${G.page.h} px`)], ['Margin', m(`${G.margin} px`)], ['Columns', `<span class="num">${G.columns}</span>`], ['Gutter', m(`${G.gutter} px`)], ['Base unit', m(`${G.base} px`)]]) }; },
  layouts: (ctx) => ({ big: 'One idea a slide.', html: p(`Every slide carries one thing at display size, a line, a word or a photograph, set on a full field of ${A(ctx.brand.name)}'s colours. Everything else is small.`, 'ht-lead') }),
  'business-card': (ctx) => { const C = ctx.brand.applications.card; return { big: C.person, html: dl([['Role', A(C.role)], ['Email', m(C.contact)], ['Web', m(ctx.brand.applications.site.url)]]) }; },
  social: (ctx) => { const S = ctx.brand.applications.social.filter((t) => ok(ctx, t)); return { big: S[0], html: list(S.map(A)) }; },
  // the whole signage string, as the print page's sign carries it; brand copy is never cut at its colon
  signage: (ctx) => ({ big: ctx.brand.applications.signage, html: '' }),
  'email-signature': (ctx) => { const E = ctx.brand.applications.email; return { big: E.person, html: dl([['Role', A(E.role)], ['Web', m(ctx.brand.applications.site.url)]]) }; },
  digital: (ctx) => ({ big: ok(ctx, ctx.brand.product) ? ctx.brand.product : ctx.brand.applications.site.url, html: dl([['Web', m(ctx.brand.applications.site.url)]]) }),
  summary: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: fields(ctx, ctx.colours.map((c) => colourField(ctx, c, false)), 2) + dl([['Display', A(B.fonts.display.family)], ['Body', A(B.fonts.body.family)]]) }; },
  'contact-scope': (ctx) => { const B = ctx.brand; return { big: B.contact.email, html: dl([['Owner', A(B.contact.owner)], ['Email', m(B.contact.email)], ['Version', `<span class="num">${A(B.version.number)}</span>`], ['Issued', A(ctx.versionLine)]]) }; },
};

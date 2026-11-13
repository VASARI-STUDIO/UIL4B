// Theme 30, Fluted, lane hg: the art that goes into the photographed scenes (the scenes are the library map's row for 30): the product screen on a phone,
// the business card on the box-office counter and the poster in the tram stop panel. Copy comes from the brand, printed whole through esc().
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { A, cwOn } from './lane-hg-lib.js';

// the scenes are the library map's row for 30; the courier brand gets street scenes, the other keeps the room
export const SCENES = { card: 'late-box-office' };
const courier = (ctx) => /^kerbside/.test(ctx.brand.slug);
export const phoneScene = (ctx) => (courier(ctx) ? 'kerb-crossing-phone' : 'room-kitchen-phone');
// a bus shelter poster (portrait panel) or a street hoarding (the wide sign): by what the brand's signage line says
export const signScene = (ctx) => (/shelter/i.test(ctx.real(String(ctx.brand.applications.signage || ''))) ? { id: 'kerb-shelter-morning', surface: 'panel', alt: 'poster in a bus shelter' } : { id: 'kerb-hoarding-footpath', surface: 'hoarding', alt: 'poster on a street hoarding' });
// the line the sign spec names (the text after its colon), else the primary line
export const signLine = (ctx) => { if (ctx.placeholders) return ctx.ph('applications.signage.line'); const t = String(ctx.brand.applications.signage || '').split(': ').slice(1).join(': ').trim(); return t || ctx.brand.lines.primary; };

function kitCss(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, x]) => `--${k}:${x};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}\n.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}\n${componentsCss(ctx)}\n.ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}\n.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function phoneArt(ctx, dark) {
  const B = ctx.brand, S = B.ui.screen.content, q = ctx.sceneInfo(phoneScene(ctx)).quads[0], w = 540, h = Math.round(w / q.aspect), pg = Math.round(S.progress * 100);
  const inner = `<div class="ui" data-theme="${dark ? 'dark' : 'light'}" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body);padding:96px 40px 0;box-sizing:border-box">
<div style="font:500 26px/32px var(--ff-body);color:var(--quiet)">${A(B.ui.screen.title)}</div>
<div class="ui-display" style="margin-top:24px;font-size:88px;line-height:92px;letter-spacing:-0.02em">${A(S.time)}</div>
<div style="margin-top:16px;font:500 30px/38px var(--ff-body);color:var(--text-soft)">${A(S.eta)}</div>
<div style="position:relative;margin-top:48px;height:2px;background:var(--divider)"><i style="position:absolute;left:0;top:-2px;width:${pg}%;height:6px;background:var(--action)"></i></div>
<div style="display:flex;justify-content:space-between;margin-top:16px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<div style="margin-top:48px;zoom:1.25">${ctx.ui.deliveryRows(4)}</div></div>`;
  return { html: ctx.artPage(inner, { w, h, css: kitCss(ctx) }), w, h };
}

export function cardArt(ctx) {
  const B = ctx.brand, card = B.applications.card, q = ctx.sceneInfo(SCENES.card).quads[0], cw = 1050, ch = Math.round(cw / q.aspect);
  const D = ctx.roles.dark, L = ctx.roles.light, hz = ctx.logo.geos.horizontal, lw = 420;
  const logoH = ctx.edition === 'slot' ? `<div style="width:${lw}px;height:${Math.round(lw * hz.h / hz.w)}px;border:5px dashed ${D.quiet};color:${D.quiet};display:flex;align-items:center;justify-content:center;font:400 36px/1.2 var(--body)">Your logo here</div>` : ctx.logo.html('horizontal', { width: lw, colourway: cwOn(ctx, D.surface) });
  const front = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${D.surface}"><div style="position:absolute;left:72px;top:${Math.round(ch / 2 - lw * hz.h / hz.w / 2)}px">${logoH}</div></div>`;
  const back = `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden;background:${L.surface};color:${L.text}">`
    + `<div class="disp" style="position:absolute;left:72px;top:64px;font-size:64px;line-height:72px">${A(card.person)}</div>`
    + `<div style="position:absolute;left:72px;top:144px;font:400 44px/52px var(--body);color:${L.quiet}">${A(card.role)}</div>`
    + `<div style="position:absolute;left:72px;bottom:64px;font:400 44px/56px var(--body)">${A(card.contact)}<br>${A(B.applications.site.url)}</div></div>`;
  return [{ html: ctx.artPage(front, { w: cw, h: ch }), w: cw, h: ch }, { html: ctx.artPage(back, { w: cw, h: ch }), w: cw, h: ch }];
}

// the poster: the line, whole, on the strong colour in the display face (the line wraps; the size is set from the poster's height, not from the words)
export function panelArt(ctx) {
  const D = ctx.roles.dark, S = signScene(ctx), sc = ctx.sceneInfo(S.id), w = 1016, h = Math.round(w / sc.quads[0].aspect), bg = D.action, wide = w > h;
  const ink = ctx.ratio(D.text, bg) >= ctx.ratio(D.surface, bg) ? D.text : D.surface;
  ctx.pair(ink, bg, { size: 72, what: 'poster line' });
  const lw = wide ? 200 : 240, lgPos = wide ? 'right:48px;bottom:40px' : 'left:64px;bottom:64px';
  const lg = ctx.edition === 'slot' ? '' : `<div style="position:absolute;${lgPos};width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: cwOn(ctx, bg) })}</div>`;
  const tx = wide ? 'left:48px;right:300px;top:40px;font-size:72px;line-height:76px' : 'left:64px;right:64px;top:72px;font-size:96px;line-height:100px';
  const art = `<div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:${bg};color:${ink}"><p class="disp" style="position:absolute;${tx};margin:0">${A(signLine(ctx))}</p>${lg}</div>`;
  return { [S.surface]: { html: ctx.artPage(art, { w, h }), w, h } };
}

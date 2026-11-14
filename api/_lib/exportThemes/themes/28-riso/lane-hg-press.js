// Theme 28 (Riso), lane hg: the press for the guide site. Same device as the brand book (lane-bk), under its own hg- classes: a guidelines page is one
// sheet of the run, a plate across its head, a pass of the key drum screened down its right edge, and the hit, a numeral in the brand's display
// face (outlines, so the hole in the plate is the same shape) printed a few px out of register. The hit is a real count from ctx and the note
// beside it says what it counts. Nothing here names a colour or a brand.
import { numeral, tile } from './lane-bk-ink.js';
import { pressOf, faceFor, A } from './sheet.js';
import { misreg, fnv1a } from './press.js';

const r1 = (n) => Math.round(n * 10) / 10;
const b64 = (s) => Buffer.from(s).toString('base64');
const glyphSvg = (n, fill, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${n.w}" height="${n.h}" viewBox="${r1(n.x)} ${r1(n.y)} ${n.w} ${n.h}"${extra}><path fill="${fill}" d="${n.d}"/></svg>`;

// the hit for one sheet, wide and narrow: the ink (inline svg) and the hole (a mask for the plate, XOR'd with a full layer, so the plate is gone
// where the glyphs are but for 15%: the knock-out is not quite clean)
export function hit(ctx, key, text, { wide = 240, narrow = 112, maxW = 400, maxN = 200 } = {}) {
  const m = misreg('site:' + key), w = numeral(ctx, text, wide, maxW), n = numeral(ctx, text, narrow, maxN);
  const dx = Math.abs(m.hit.dx), dy = Math.abs(m.hit.dy);
  const hole = (g) => `url(data:image/svg+xml;base64,${b64(glyphSvg(g, '#000', ' fill-opacity="0.85"'))})`;
  const ink = (g, cls) => `<span class="hg-hit ${cls}" aria-hidden="true" style="width:${g.w}px;height:${g.h}px"><svg width="${g.w}" height="${g.h}" viewBox="${r1(g.x)} ${r1(g.y)} ${g.w} ${g.h}" focusable="false"><path d="${g.d}"/></svg></span>`;
  return {
    vars: `--hw:${w.w}px;--hh:${w.h}px;--hn-w:${n.w}px;--hn-h:${n.h}px;--hdx:${dx}px;--hdy:${dy}px;--holew:${hole(w)};--holen:${hole(n)}`,
    html: ink(w, 'hg-hit--w') + ink(n, 'hg-hit--n'),
  };
}

// the pass's skew: the band's left edge drifts a few px from head to foot, the way a sheet feeds a little crooked
export function passVars(key) {
  const h = fnv1a('28-riso:site:' + key), m = misreg('site:' + key), sgn = m.pass.rot < 0 ? -1 : 1;
  const a = 4 + m.pass.dx, b = a + sgn * 2, c = b + sgn * (3 + (h >>> 20) % 3);
  return `--pa:${a + 4}px;--pb:${b + 4}px;--pc:${c + 4}px;--fx:${h % 512}px;--fy:${(h >>> 9) % 512}px;--mx:${(h >>> 4) % 384}px;--my:${(h >>> 13) % 384}px`;
}

// the colour bar a sheet's foot carries: one square a drum, then the overprints (plate x pass, plate x hit)
export function colourBar(ctx) {
  const P = pressOf(ctx), seen = new Set();
  let out = P.drums.map((d) => `<i class="hg-sq" style="background:${d.hex}"></i>`).join('');
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) {
    if (seen.has(res)) continue; seen.add(res);
    out += `<span class="hg-sq hg-ov"><i style="background:${u}"></i><i class="${s ? 'hg-scr' : ''}" style="background:${o}"></i></span>`;
  }
  return `<span class="hg-bar" aria-hidden="true">${out}</span>`;
}

// one sheet: the head (plate, head pass, hit, title, and what the hit counts), then the body (body pass, content, foot)
export function sheet(ctx, id, { count, note, title, h1 = true, folio = '', foot = '', wide, narrow }, body) {
  const H = hit(ctx, id, String(count), { ...(wide ? { wide } : {}), ...(narrow ? { narrow } : {}) });
  const tag = h1 ? 'h1' : 'h2';
  return `<section class="hg-sh hg-sh--${id}" id="hg-${id}" aria-labelledby="hg-t-${id}" style="${passVars(id)};${H.vars}">
<div class="hg-hd"><div class="hg-plate" aria-hidden="true"><i></i></div><div class="hg-pass hg-pass--hd" aria-hidden="true"></div>${H.html}
<div class="hg-hd__t"><div class="hg-hd__tt">${typeof title === 'string' && !title.startsWith('<') ? `<${tag} class="hg-title" id="hg-t-${id}">${A(title)}</${tag}>` : title}</div><p class="hg-hd__c">${note}</p></div></div>
<div class="hg-bd"><div class="hg-pass hg-pass--bd" aria-hidden="true"></div><div class="hg-in">${body}</div>
<div class="hg-ft">${colourBar(ctx)}<span class="hg-ft__n">${A(foot)}</span><span class="hg-ft__f hg-v">${A(folio)}</span></div></div>
</section>`;
}

// the sheet's stylesheet. No hex is written here: every colour is the press's or the brand's roles.
export function pressCss(ctx) {
  const P = pressOf(ctx), L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, df = faceFor(ctx, 'display', ctx.weights.heading);
  const mk = (u, n) => `-webkit-mask-image:url(${u});mask-image:url(${u});-webkit-mask-size:${n}px ${n}px;mask-size:${n}px ${n}px`;
  const passMask = P.passScreen ? mk(tile('screen-24.png'), 384) : mk(tile('ink-mottle.png'), 512);
  const full = `url(data:image/svg+xml;base64,${b64('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')})`;
  const hole = (img, w, h) => `-webkit-mask-image:${img},${full};mask-image:${img},${full};-webkit-mask-position:left var(--x0) bottom var(--pad),0 0;mask-position:left var(--x0) bottom var(--pad),0 0;-webkit-mask-size:${w} ${h},100% 100%;mask-size:${w} ${h},100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-composite:xor;mask-composite:exclude`;
  return `[data-gs-root]{--g-bench:${L.sunken};--g-paper:${P.paper};--g-key:${P.key};--g-plate:${P.plate};--g-pass:${P.pass};--g-passp:${P.passPlate || P.pass};--g-hit:${P.hit};--g-ptxt:${P.textOnPlate};--g-focus:${L.focus};
--g-pblend:multiply;--g-bblend:multiply;--g-hblend:multiply;--g-fibre:url(${tile('paper-fibre.png')});
--g-display:'${d.family}',serif;--g-body:'${b.family}',sans-serif;--g-val:'Sono Mono','${b.family}',monospace;--g-dw:${df.weight};--g-ds:${df.stretch || 100}%;--x0:48px;--pad:40px;
background:var(--g-bench);color:var(--g-key);font:400 16px/1.55 var(--g-body);-webkit-font-smoothing:antialiased;min-height:100vh}
[data-theme="dark"] [data-gs-root]{--g-bench:${D.sunken};--g-paper:${D.surface};--g-key:${D.text};--g-pass:${D.text};--g-pblend:normal;--g-bblend:screen;--g-hblend:normal;--g-focus:${D.focus}}
[data-gs-root] *{box-sizing:border-box}
[data-gs-root] :where(b,strong){font-weight:600}
[data-gs-root] :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
[data-gs-root] :where(ul,ol){list-style:none}
.hg-v{font-family:var(--g-val);font-weight:400;font-size:.92em;font-variant-numeric:tabular-nums;letter-spacing:0}
[data-gs-root] :focus-visible{outline:2px solid var(--g-focus);outline-offset:2px}
.hg-for-dark{display:none}[data-theme="dark"] .hg-for-dark{display:inline-block}[data-theme="dark"] .hg-for-light{display:none}
.hg-sh{--pw:clamp(24px,12cqi - 20px,164px);container-type:inline-size;position:relative;isolation:isolate;overflow:hidden;max-width:1280px;margin:0 auto 32px;background:var(--g-paper);color:var(--g-key);scroll-margin-top:72px}
.hg-sh > *{--rp:calc(var(--pw) + var(--x0))}
.hg-sh::before{content:'';position:absolute;inset:0;z-index:0;background:var(--g-fibre) var(--fx) var(--fy)/512px 512px;mix-blend-mode:multiply;pointer-events:none}
[data-theme="dark"] .hg-sh::before{display:none}
.hg-hd{position:relative}
.hg-plate{position:absolute;inset:0;z-index:1;mix-blend-mode:var(--g-pblend);${mk(tile('ink-mottle.png'), 512)};-webkit-mask-position:var(--mx) var(--my);mask-position:var(--mx) var(--my)}
.hg-plate i{position:absolute;inset:0;background:var(--g-plate);${hole('var(--holew)', 'var(--hw)', 'var(--hh)')}}
.hg-hit{position:absolute;z-index:2;left:calc(var(--x0) + var(--hdx));bottom:calc(var(--pad) - var(--hdy));mix-blend-mode:var(--g-hblend);pointer-events:none;${mk(tile('ink-mottle.png'), 512)};-webkit-mask-position:var(--my) var(--mx);mask-position:var(--my) var(--mx)}
.hg-hit svg{display:block;overflow:visible}
.hg-hit path{fill:var(--g-hit)}
.hg-hit--n{display:none}
.hg-pass{position:absolute;top:0;bottom:0;right:-8px;width:calc(var(--pw) + 8px);z-index:2;pointer-events:none;${passMask};-webkit-mask-position:var(--mx) var(--my);mask-position:var(--mx) var(--my)}
.hg-pass--hd{background:var(--g-passp);mix-blend-mode:multiply;clip-path:polygon(var(--pa) 0,100% 0,100% 100%,var(--pb) 100%)}
.hg-pass--bd{background:var(--g-pass);mix-blend-mode:var(--g-bblend);clip-path:polygon(var(--pb) 0,100% 0,100% 100%,var(--pc) 100%)}
.hg-hd__t{position:relative;z-index:3;display:grid;grid-template-columns:var(--hw) minmax(0,1fr);grid-template-areas:"sp t" "sp c";column-gap:40px;row-gap:24px;padding:var(--pad) var(--rp) var(--pad) var(--x0);min-height:calc(var(--hh) + 2 * var(--pad));color:var(--g-ptxt)}
.hg-hd__tt{grid-area:t}
.hg-hd__c{grid-area:c;align-self:end;max-width:36ch;font:400 16px/1.45 var(--g-body)}
.hg-title{font:var(--g-dw) clamp(32px,4.4cqi,60px)/1.05 var(--g-display);font-stretch:var(--g-ds);letter-spacing:-.01em;color:var(--g-ptxt);max-width:16ch;text-wrap:balance}
.hg-bd{position:relative}
.hg-in{position:relative;z-index:3;display:flex;flex-direction:column;gap:24px;padding:48px var(--rp) 56px var(--x0)}
.hg-in > .hg-h3{margin-top:24px}
.hg-ft{position:relative;z-index:3;display:flex;align-items:center;gap:12px;padding:0 var(--rp) 24px var(--x0);font:400 14px/1.3 var(--g-body)}
.hg-ft__f{margin-left:auto}
.hg-bar{display:flex;gap:2px}
.hg-sq{position:relative;display:block;width:10px;height:10px}
.hg-ov{isolation:isolate}
.hg-ov i{position:absolute;inset:0}
.hg-ov i + i{mix-blend-mode:multiply}
.hg-scr{${mk(tile('screen-24.png'), 384)}}
@media (max-width:840px){
.hg-sh,.hg-sh > *{--x0:16px;--pad:24px}
.hg-sh{margin-bottom:12px}
.hg-plate i{${hole('var(--holen)', 'var(--hn-w)', 'var(--hn-h)')}}
.hg-hit--w{display:none}
.hg-hit--n{display:block}
.hg-hd__t{grid-template-columns:var(--hn-w) minmax(0,1fr);grid-template-areas:"t t" "sp c";grid-template-rows:auto minmax(var(--hn-h),auto);column-gap:16px;min-height:0}
.hg-hd__c{font-size:15px}
.hg-in{padding-top:32px;padding-bottom:40px;gap:20px}
}
`;
}

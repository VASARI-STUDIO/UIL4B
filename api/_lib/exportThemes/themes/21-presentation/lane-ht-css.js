// Lane ht CSS: the two web parts. The page ground follows the light and dark switch; the deck's colour fields (dark, action,
// panel) are fixed brand colours and carry their own ink, set inline and checked. Narrow rules sit in (max-width:840px), wide ones in
// (min-width:841px), as engine/guide-site.js asks. Radii 0, no shadows: fields meet at straight edges, as on the slides.
import { L, DK } from './lane-ht-lib.js';

export function htCss(ctx) {
  const B = ctx.brand, l = L(ctx), d = DK(ctx), f = B.fonts;
  const body = `'${f.body.family}',sans-serif`, disp = `'${f.display.family}',sans-serif`, mono = `'${f.mono.family}',monospace`;
  const dw = f.display.weights[f.display.weights.length - 1];
  // one type scale for both sites: a page's title is the display step, a line under it the headline step (the kit reads the same scale)
  const sd = (B.type.scale.find((x) => x.token === 'display') || {}).size || 48;
  return `.ht{--g:${l.surface};--g2:${l.sunken};--t:${l.text};--s:${l.textSoft};--q:${l.quiet};--h:${l.divider};--fo:${l.focus || l.text};
  --body:${body};--disp:${disp};--mono:${mono};
  display:block;min-height:100vh;background:var(--g);color:var(--t);font:400 16px/1.6 var(--body);-webkit-font-smoothing:antialiased;isolation:isolate}
[data-theme="dark"] .ht{--g:${d.surface};--g2:${d.sunken};--t:${d.text};--s:${d.textSoft};--q:${d.quiet};--h:${d.divider};--fo:${d.focus || d.text}}
.ht :where(h1,h2,h3,p,ol,ul,figure,dl,dd){margin:0;padding:0}
.ht :where(ol,ul){list-style:none}
.ht a{color:inherit}
.ht .num{font-variant-numeric:tabular-nums}
.ht-d{font-family:var(--disp);font-weight:${dw};font-stretch:${f.display.stretch || 100}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance}
.ht-m{font-family:var(--mono);font-size:14px;font-weight:400;letter-spacing:0}
.ht-k{font-size:14px;line-height:1.4;font-weight:600}
.ht :focus-visible{outline:2px solid currentColor;outline-offset:3px}
/* the live components keep one ring, not two: the page ink at 2px, offset by a 2px gap, in place of their own 4px ring in the focus token's colour (about 1.6:1 on a light ground) */
.ht .ui :focus-visible,.ht .ui .is-focus{outline:2px solid var(--t);outline-offset:2px;box-shadow:none}
.ht-skip{position:absolute;left:16px;top:-80px;z-index:4;padding:12px 16px;background:var(--g);color:var(--t);border:1px solid var(--t);font:500 14px/1.2 var(--body);text-decoration:none}
.ht-skip:focus,.ht-skip:focus-visible{top:8px;outline:2px solid var(--t);outline-offset:3px}

/* the bar: the deck's running head, one line, the same on every page */
.ht-bar{position:relative;z-index:3;display:flex;align-items:center;gap:24px;height:56px;padding:0 56px;background:var(--g);color:var(--q);font-size:14px;line-height:1.3;border-bottom:1px solid var(--h)}
.ht-home{font-weight:600;color:var(--t);text-decoration:none}
.ht-run{flex:1;min-width:0;color:var(--t)}
.ht-run b{font-weight:400;color:var(--q);margin-right:12px}
.ht-doc{display:flex;align-items:center}
.ht-doc b{font-weight:400;color:var(--t);margin-left:16px;padding-left:16px;border-left:1px solid var(--h)}
.ht-mode{display:flex}
.ht-btn,.ht-mode button{font:500 14px/1 var(--body);color:var(--t);background:transparent;border:1px solid var(--h);border-radius:0;height:36px;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background-color 150ms ease,color 150ms ease}
.ht-mode button+button{border-left:0}
.ht-mode button[aria-pressed="true"]{background:var(--t);color:var(--g);border-color:var(--t)}
.ht-btn[aria-expanded="true"]{background:var(--t);color:var(--g);border-color:var(--t)}
.ht-btn svg{flex:none}
@media (hover:hover){.ht-mode button:hover,.ht-btn:hover{background:var(--g2)}.ht-mode button[aria-pressed="true"]:hover,.ht-btn[aria-expanded="true"]:hover{background:var(--t)}}

/* contents: every section a stripe of the deck's fields */
.ht-toc{display:none;position:fixed;top:56px;left:0;right:0;bottom:0;z-index:2;overflow:auto;overscroll-behavior:contain;background:var(--g)}
.ht-toc[data-open="true"],.ht-toc.is-open{display:block}
.ht-toc__f{display:block;padding:20px 56px;font-weight:600;text-decoration:none;border-bottom:1px solid var(--h)}
.ht-toc__s{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px;padding:28px 56px}
.ht-toc__n{font-family:var(--disp);font-weight:${dw};font-stretch:${f.display.stretch || 100}%;font-size:32px;line-height:1.05;letter-spacing:-0.01em}
.ht-toc__n b{font-weight:inherit;margin-right:16px}
.ht-toc__s ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 32px;align-content:start;padding-top:6px}
.ht-toc__s a{display:block;text-decoration:none;font-size:15px;line-height:1.5;padding:2px 0}
.ht-toc__s a .num{color:var(--q);margin-right:8px}
.ht-toc__s a[aria-current="page"]{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px}
@media (hover:hover){.ht-toc__s a:hover{text-decoration:underline;text-underline-offset:4px}}

/* the stage: the slide at its own size on the dark field, zoomed to the column when the column is narrower */
.ht-stage{padding:48px 56px 40px}
.ht-fit{container-type:inline-size;width:100%;max-width:1280px;margin:0 auto}
.ht-slides{width:1280px;display:flex;flex-direction:column;gap:24px}
/* the signage art sets its poster lines at 0.96: on screen the display face's lines touch, so they open to 1 */
.ht-slides .g5 [style*="zoom"] p.disp{line-height:1!important}
.ht-slides>.pg{flex:none;box-shadow:none;position:relative;box-sizing:border-box;width:1280px;height:720px;overflow:hidden}
.ht-cap{max-width:1280px;margin:16px auto 0;display:flex;justify-content:space-between;gap:16px;font-size:14px;line-height:1.4;color:var(--q)}

/* the notes: one big line, the readable text beside it */
.ht-notes{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;padding:96px 56px 112px;max-width:1440px;margin:0 auto;container-type:inline-size}
.ht-notes--spread{grid-template-columns:minmax(0,1fr);gap:56px;padding:80px 56px 112px}
.ht-notes--spread .ht-nb{max-width:none;gap:56px}
.ht-notes--spread :is(.ht-lead,.ht-p){max-width:68ch}
.ht-notes--spread :is(.ht-dl,.ht-scale){max-width:960px}
.ht-bigc{container-type:inline-size;min-width:0}
.ht-big{font-size:var(--bs,56px);color:var(--t);overflow-wrap:anywhere}
.ht-notes b{font-weight:600}
.ht-nb{display:flex;flex-direction:column;gap:40px;max-width:68ch}
.ht-p{font-size:17px;line-height:1.65;color:var(--s)}
.ht-lead{font-size:22px;line-height:1.45;font-weight:500;color:var(--t)}
.ht-dl{display:grid;grid-template-columns:minmax(120px,1fr) minmax(0,3fr);border-top:1px solid var(--h)}
.ht-dl>dt,.ht-dl>dd{padding:14px 0;border-bottom:1px solid var(--h);font-size:16px;line-height:1.55}
.ht-dl>dt{font-weight:600;color:var(--t);padding-right:24px}
.ht-dl>dd{color:var(--s)}
.ht-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-top:1px solid var(--h)}
.ht-pair>li{display:contents}
.ht-pair p{padding:16px 24px 16px 0;border-bottom:1px solid var(--h);font-size:16px;line-height:1.55;color:var(--s)}
.ht-pair p:first-child{color:var(--t);font-weight:500}
.ht-pair .ht-pair__h{font-weight:600;color:var(--t);font-size:14px;padding-top:0}
.ht-pair__k{display:none}
.ht-list{counter-reset:n;border-top:1px solid var(--h)}
.ht-list>li{display:grid;grid-template-columns:48px minmax(0,1fr);padding:16px 0;border-bottom:1px solid var(--h);font-size:16px;line-height:1.55;color:var(--s)}
.ht-list>li::before{counter-increment:n;content:counter(n);color:var(--q);font-variant-numeric:tabular-nums}
.ht-list b{display:block;color:var(--t);font-weight:600}

/* fields inside the notes: colours, logo versions, traits. They meet at straight edges, as on the slides */
.ht-fields{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}
.ht-field--last{grid-column:span var(--ls,1)}
.ht-field__r{display:block;margin-top:12px}
.ht-field{display:flex;flex-direction:column;justify-content:space-between;gap:32px;min-height:240px;padding:24px;container-type:inline-size}
.ht-field__w{font-size:var(--ws,40px)}
.ht-field__c{font-size:14px;line-height:1.5}
.ht-field__c .ht-m{display:block;margin-top:4px}
.ht-field__q{color:var(--q)}
.ht-field--hair{box-shadow:inset 0 0 0 1px var(--h)}
[data-theme="dark"] .ht-field--dk{box-shadow:inset 0 0 0 1px var(--h)}
.ht-field__logo{display:flex;align-items:center;justify-content:center;flex:1;padding:16px 0}
.ht-field__logo>*{max-width:100%}
.ht-stripe{display:flex;height:160px}
.ht-stripe>div{display:flex;align-items:flex-end;padding:16px;font-size:14px;line-height:1.3;min-width:0}
.ht-tiles{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px}
.ht-tile{display:flex;flex-direction:column;gap:6px;min-width:0}
.ht-tile__a{position:relative;isolation:isolate;overflow:hidden;aspect-ratio:4/3;display:flex;align-items:center;justify-content:center}
.ht-tile__p{position:absolute;inset:-30%;z-index:0;transform:rotate(18deg)}
.ht-tile__b{position:absolute;top:0;bottom:0}
.ht-tile__m{position:relative;z-index:1;display:block;max-width:60%}
.ht-tile__m svg,.ht-tile__m img{display:block;max-width:100%;height:auto}
.ht-tile__no{position:absolute;top:10px;right:10px;z-index:2;line-height:0}
.ht-tile__t{font-size:14px;line-height:1.4;font-weight:600;color:var(--t);margin-top:6px}
.ht-tile__n{font-size:14px;line-height:1.5;color:var(--s)}
.ht-scale>li{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:24px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--h)}
.ht-scale>li:first-child{border-top:1px solid var(--h)}
.ht-scale .ht-k{color:var(--t)}
.ht-scale .ht-k span{display:block;font-weight:400;color:var(--q)}
.ht-scale__s{color:var(--t);overflow-wrap:anywhere}
.ht-scale__s .ph-c{font-size:1em}
.ht-scale__s .ph-n{white-space:normal!important}

/* the next slide as a field */
.ht-next{display:flex;flex-direction:column;gap:40px;padding:72px 56px 56px;container-type:inline-size}
.ht-next__a{display:flex;flex-direction:column;gap:16px;text-decoration:none}
.ht-next__a .ht-k b{font-weight:400;margin-left:8px}
.ht-next__t{display:block;max-width:14ch}
.ht-prev{font-size:14px;line-height:1.4;text-decoration:none}
.ht-prev .ht-k{margin-right:12px}
.ht-prev b{font-weight:400;margin-right:6px}
@media (hover:hover){.ht-next__a:hover .ht-next__t,.ht-prev:hover{text-decoration:underline;text-decoration-thickness:4px;text-underline-offset:8px}.ht-prev:hover{text-decoration-thickness:1px;text-underline-offset:4px}}
.ht-foot{display:flex;justify-content:space-between;gap:24px;padding:20px 56px;font-size:14px;line-height:1.4;color:var(--q)}

/* the front: the cover slide, then the contents as the deck's stripes */
.ht-cv{padding:72px 56px 56px;container-type:inline-size}
.ht-cv__t{font-size:var(--bs,96px)}
.ht-cv__l{margin-top:24px;font-size:22px;line-height:1.45;font-weight:500;max-width:36ch;color:var(--q)}
.ht-cx{padding:48px 56px 96px;max-width:1440px;margin:0 auto}
.ht-cx>ol{border-top:2px solid var(--t)}
.ht-cx__r{display:grid;grid-template-columns:72px minmax(0,4fr) minmax(0,8fr);gap:0 32px;padding:32px 0 36px;border-bottom:1px solid var(--h)}
.ht-cx__n{font-family:var(--disp);font-weight:${dw};font-stretch:${f.display.stretch || 100}%;font-size:32px;line-height:1.05;color:var(--q)}
.ht-cx__h{container-type:inline-size;min-width:0}
.ht-cx__t{font-size:min(var(--bs,44px),44px)}
.ht-cx__c{margin-top:12px;font-size:14px;line-height:1.4;color:var(--q)}
.ht-cx__p{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;align-content:start}
.ht-cx__p a{display:grid;grid-template-columns:48px minmax(0,1fr);align-items:baseline;min-height:44px;padding:10px 0;border-bottom:1px solid var(--h);text-decoration:none;font-size:16px;line-height:1.4}
.ht-cx__p a .num{color:var(--q)}
@media (hover:hover){.ht-cx__p a:hover span:last-child{text-decoration:underline;text-underline-offset:4px}}
.ht-cx--brief .ht-cx__r{grid-template-columns:72px minmax(0,1fr);padding:24px 0 28px}
.ht-cx--brief .ht-cx__t a{color:inherit;text-decoration:none}
.ht-cx--brief .ht-cx__t a:hover{text-decoration:underline;text-underline-offset:6px}
.ht-cx--brief .ht-cx__t a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
@media (min-width:841px){.ht-slides{zoom:0.56}}
@media (min-width:1000px){.ht-slides{zoom:0.68}}
@media (min-width:1200px){.ht-slides{zoom:0.84}}
@media (min-width:1392px){.ht-slides{zoom:1}}
.ht-ps{container-type:inline-size;padding:0}
.ht-ps__hd{position:absolute;top:36px;left:56px;right:56px;display:flex;justify-content:space-between;gap:24px;font-size:14px;line-height:1.3}
.ht-ps__hd b{font-weight:400;margin-right:12px}
.ht-ps__t{position:absolute;left:56px;right:56px;bottom:72px;line-height:0.94}
.ht-ps__fo{position:absolute;right:56px;bottom:36px;font-size:14px;line-height:1.3}
@media (max-width:1023px){.ht-ps__hd,.ht-ps__fo{display:none}.ht-stage{padding-left:20px;padding-right:20px}.ht-fit{max-width:none}}
@media (min-width:841px){
.ht-stage--tight{padding-top:40px}
}
/* the page's title: a display h1 over the slide on wide screens (the bar already carries the running head); on a phone it also leads the page, under the running head */
.ht-ml{display:block;padding:72px 56px 8px;container-type:inline-size}
.ht-ml--spread{padding-bottom:56px}
.ht-ml__t{font-size:min(var(--bs,${sd}px),${sd}px);line-height:1}
.ht-ml__t b{display:block;font-family:var(--body);font-weight:400;font-size:15px;letter-spacing:0;line-height:1.4;margin-bottom:12px;font-stretch:100%;color:var(--q)}
@media (max-width:840px){
.ht-ml{display:flex;flex-direction:column;justify-content:flex-end;gap:16px;min-height:0;padding:28px 20px 24px}
.ht-ml__t{font-size:min(var(--bs,40px),${sd}px)}
.ht-bar{gap:12px;padding:0 20px}
.ht-home,.ht-doc{display:none}
.ht-bar{height:auto;min-height:56px;padding-top:10px;padding-bottom:10px}
.ht-btn,.ht-mode button{height:44px;padding:0 14px}
.ht-btn{margin-right:auto}
.ht-toc__f{padding:16px 20px}
.ht-toc__s{grid-template-columns:minmax(0,1fr);gap:12px;padding:24px 20px}
.ht-toc__n{font-size:26px}
.ht-toc__s ol{grid-template-columns:minmax(0,1fr)}
.ht-stage{padding:20px 20px 24px}
.ht-cap{flex-direction:column;gap:2px}
.ht-notes{grid-template-columns:minmax(0,1fr);gap:40px;padding:56px 20px 64px}
.ht-nb{gap:32px}
.ht-big{font-size:min(var(--bs,56px),var(--bn,72px))}
.ht-p{font-size:16px}
.ht-lead{font-size:19px}
.ht-dl{grid-template-columns:minmax(0,1fr)}
.ht-dl>dt{padding-bottom:0;border-bottom:0}
.ht-dl>dd{padding-top:2px}
.ht-pair{grid-template-columns:minmax(0,1fr)}
.ht-pair p{padding-right:0}
.ht-pair p:first-child{border-bottom:0;padding-bottom:0}
.ht-pair .ht-pair__h{display:none}
.ht-pair__k{display:block;font-size:14px;line-height:1.4;font-weight:600;color:var(--t);margin-bottom:4px}
.ht-fields{grid-template-columns:repeat(2,minmax(0,1fr))}
.ht-field--last{grid-column:auto}
.ht-field--odd{grid-column:1/-1}
.ht-field{min-height:160px;padding:20px}
.ht-tiles{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px}
.ht-notes--spread{padding:48px 20px 64px;gap:40px}
.ht-notes--spread .ht-nb{gap:40px}
.ht-stripe{height:auto;flex-direction:column}
.ht-stripe>div{flex:none!important;min-height:56px}
.ht-scale>li{grid-template-columns:minmax(0,1fr);gap:8px}
.ht-next{padding:48px 20px 40px;gap:32px}
.ht-foot{flex-direction:column;gap:4px;padding:16px 20px}
.ht-cv{padding:48px 20px 40px}
.ht-cv__l{font-size:19px}
.ht-cx{padding:32px 20px 64px}
.ht-cx__r{grid-template-columns:minmax(0,1fr);gap:12px;padding:28px 0 32px}
.ht-cx__p{grid-template-columns:minmax(0,1fr)}
}
@media (max-width:1100px){.ht-cx__r{grid-template-columns:72px minmax(0,1fr)}.ht-cx__p{grid-column:2}}
@media (max-width:840px){.ht-cx__r{grid-template-columns:minmax(0,1fr)}.ht-cx__p{grid-column:auto}}
@media (max-width:520px){
.ht-run{display:none}
.ht-fields{grid-template-columns:minmax(0,1fr)}
.ht-field--odd{grid-column:auto}
.ht-field--last{grid-column:auto}
}
/* a name set where a logo would go (lane-ht-clean.js): the display face, one line, never clipped */
.ht-wm{display:inline-flex;align-items:center;justify-content:center;max-width:100%;white-space:nowrap;line-height:1.1;font-weight:${dw};letter-spacing:-0.01em;overflow:visible}
.ht-wm--sym{letter-spacing:0}
.ht-wm--h{gap:.45em}
.ht-wm--h .ht-wm__s{font-size:1em;padding-right:.45em;border-right:.08em solid currentColor;line-height:1.1}
.ht-wm--st{flex-direction:column;gap:.15em}
.ht-wm--st .ht-wm__s{font-size:1.9em;line-height:1}
.ht-wm--st span{font-size:.55em;letter-spacing:.04em;text-transform:uppercase}
.ht-mk .ht-wm{justify-content:flex-start}
.ht-wm__s{font-weight:inherit}
.ht-wm__a{font-style:normal}
.ht-notes--bare{grid-template-columns:minmax(0,1fr)}
.ht-notes--narrow{display:none}
.ht-tile__a{container-type:inline-size}
.ht-field{position:relative;isolation:isolate}
.ht-field__img{position:relative;flex:1;min-height:140px;overflow:hidden;margin:-24px -24px 0;aspect-ratio:4/3}
.ht-scene{display:block;width:100%;height:100%}
.ht-field__img .ht-scene{position:absolute;inset:0}
.ht-field__imglogo{position:absolute;left:16px;top:16px}
.ht-field--pic{min-height:0}
.ht-field--pic .ht-field__img{flex:1 1 auto;margin:0;aspect-ratio:auto;min-height:170px}
.ht-field--pic .ht-field__c{padding:16px 24px 20px}
/* the faces as specimens */
.ht-specs{display:flex;flex-direction:column;gap:0;border-top:1px solid var(--h)}
.ht-spec{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:32px;padding:32px 0;border-bottom:1px solid var(--h)}
.ht-spec__n{margin-top:8px;font-size:17px;line-height:1.4;color:var(--t)}
.ht-spec__h .ht-m{display:block;margin-top:8px;color:var(--s)}
.ht-spec__s{container-type:inline-size;min-width:0}
.ht-spec__aa{font-size:120px;line-height:1;margin:0 0 16px;overflow-wrap:anywhere}
.ht-spec__g{font-size:clamp(16px,3.2cqw,26px);line-height:1.4;overflow-wrap:anywhere}
.ht-spec__w{margin-top:20px;display:grid;gap:8px}
.ht-spec__w li{display:flex;align-items:baseline;justify-content:space-between;gap:16px;font-size:22px;line-height:1.3;border-top:1px solid var(--h);padding-top:8px}
.ht-spec__w .ht-m{color:var(--s)}
/* the applications as mock-ups, drawn from the palette */
.ht-mks{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:40px 32px;align-items:start}
.ht-mk{display:flex;flex-direction:column;gap:12px;min-width:0}
.ht-mk figcaption{font-size:14px;line-height:1.5;color:var(--s)}
.ht-mk figcaption b{display:block;color:var(--t);font-weight:600}
.ht-mk__card,.ht-mk__sign{container-type:inline-size;position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:8%;width:100%;max-width:420px;box-sizing:border-box}
.ht-mk__card{aspect-ratio:90/55}
.ht-mk__sign{aspect-ratio:3/2;max-width:480px;padding:8% 8% 14%}
.ht-mk__logo{display:flex}
.ht-mk__rule{display:block;width:16%;height:3px;margin-top:auto}
.ht-mk__p{font-size:14px;line-height:1.5;margin:12px 0 0}
.ht-mk__line{font-size:clamp(24px,7cqw,40px);margin-top:16px}
.ht-mk__bar{position:absolute;left:0;right:0;bottom:0;height:12px}
.ht-mk__phone{width:100%;max-width:390px;border:10px solid var(--t);border-radius:28px;overflow:hidden;background:var(--g);box-sizing:border-box}
.ht-mk__top{display:flex;align-items:center;padding:20px 20px 16px}
.ht-mk__scr{display:flex;flex-direction:column;gap:20px;padding:24px 20px 28px}
.ht-mk__h{font-size:32px;color:var(--t)}
.ht-mk__panel{display:flex;flex-direction:column;gap:4px;padding:20px}
.ht-mk__v{font-size:44px}
.ht-mk__pr{font-size:20px;font-weight:600}
.ht-mk__btn{display:flex;align-items:center;justify-content:center;min-height:48px;font-weight:600;font-size:16px}
/* a photograph direction: a scene drawn from the palette */
.ht-pf{display:flex;flex-direction:column;gap:12px;max-width:640px}
.ht-pf .ht-scene{aspect-ratio:4/3;height:auto}
.ht-pf figcaption,.ht-gp figcaption{font-size:14px;line-height:1.5;color:var(--s)}
/* the brand's device: its colours as flat blocks, a bar under a section's title and stepped on the cover */
.ht-dev{display:flex;align-items:flex-end;height:16px;margin:0 56px}
.ht-dev>span{display:block;height:100%;min-width:0}
.ht-dev--cv{height:112px;margin:0}
/* a value table: tabular figures in the body face; the mono face is for hex and code */
.ht-vals{display:flex;flex-wrap:wrap;gap:4px 24px;align-items:baseline}
.ht-dl .num{white-space:nowrap}
.ht-field__c .num{display:block;margin-top:4px}
.ht-scale .ht-k{display:block}
.ht-scale .ht-k span{display:block;margin-top:4px}
@media (max-width:1023px){.ht-scale .ht-k{display:flex;flex-wrap:wrap;gap:2px 12px;align-items:baseline}.ht-scale .ht-k span{display:inline;margin:0;white-space:nowrap}}
/* the grid as an A4 portrait page */
.ht-gp{display:flex;flex-direction:column;gap:12px;max-width:360px}
.ht-gp__pg{background:var(--g2);box-shadow:inset 0 0 0 1px var(--h);box-sizing:border-box;width:100%}
.ht-gp__in{display:grid;height:100%}
.ht-gp__in>span{display:block;background:color-mix(in srgb,var(--t) 14%,transparent)}
/* the applications spread: a card, a sign and a phone on one sheet */
.ht-mks--sp{grid-template-columns:minmax(0,5fr) minmax(0,4fr);gap:32px;align-items:start}
.ht-mks--sp .ht-mk--card{grid-column:1}
.ht-mks--sp .ht-mk--sign{grid-column:1}
.ht-mks--sp .ht-mk--phone{grid-column:2;grid-row:1/3}
.ht-mks--sp :is(.ht-mk__card,.ht-mk__sign){max-width:none}
.ht-mks--sp .ht-mk--phone{grid-row:1}
.ht-mks--sp .ht-mk__sign{aspect-ratio:2/1}
.ht-mk--sum{grid-column:2;grid-row:2;display:flex;flex-direction:column;gap:12px;min-width:0}
.ht-sum__pal{display:grid;gap:8px}
.ht-sum__pal li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;font-size:14px;line-height:1.3;color:var(--t)}
.ht-sum__sw{width:28px;height:28px;border:1px solid var(--h);box-sizing:border-box}
.ht-sum__v{font-size:17px;line-height:1.45;color:var(--t);margin:0}
.ht-sum__ty{font-size:14px;line-height:1.5;color:var(--s);margin:0}
/* the website drawn on a laptop and a phone */
.ht-mks--dg{grid-template-columns:minmax(0,720px) minmax(0,300px);justify-content:start;gap:40px 64px;align-items:start}
.ht-lt{container-type:inline-size;width:100%;max-width:720px}
.ht-lt__s{border:8px solid var(--t);border-bottom-width:10px;border-radius:12px 12px 0 0;overflow:hidden;background:var(--g);box-sizing:border-box}
.ht-lt__base{height:12px;background:var(--t);border-radius:0 0 12px 12px;margin:0 -3%}
.ht-dg__nav{display:flex;align-items:center;gap:4cqw;padding:2.4cqw 3cqw}
.ht-dg__nav .ht-wm{margin-right:auto}
.ht-dg__lk{font-size:max(11px,1.8cqw);font-weight:600}
.ht-dg__hero{display:flex;flex-direction:column;align-items:flex-start;gap:1.6cqw;padding:5cqw 3cqw}
.ht-dg__h{font-size:max(18px,5cqw)}
.ht-dg__t{font-size:max(11px,1.9cqw);line-height:1.4}
.ht-dg__b{display:inline-flex;align-items:center;min-height:max(24px,4.6cqw);padding:0 2.4cqw;font-size:max(11px,1.9cqw);font-weight:600}
.ht-dg__row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2cqw;padding:3cqw}
.ht-dg__st{padding:2cqw}
.ht-dg__n{font-size:max(18px,3.6cqw)}
.ht-mk__phone .ht-dg__hero--m{padding:28px 20px 32px;gap:12px}
.ht-mk__phone .ht-dg__hero--m .ht-dg__h{font-size:30px}
.ht-mk__phone .ht-dg__hero--m .ht-dg__t,.ht-mk__phone .ht-dg__hero--m .ht-dg__b{font-size:15px}
.ht-mk__phone .ht-dg__hero--m .ht-dg__b{min-height:44px;padding:0 20px}
/* the website on a phone is portrait: the lead, then the three counts as a column */
.ht-dg__ph{display:flex;flex-direction:column;max-width:300px;aspect-ratio:9/15}
.ht-dg__ph .ht-dg__hero--m{padding:24px 20px 28px}
.ht-dg__col{flex:1;display:grid;align-content:start;gap:8px;padding:16px 20px 20px}
.ht-dg__ph .ht-dg__st{display:flex;align-items:baseline;gap:12px;padding:12px 14px}
.ht-dg__ph .ht-dg__n{font-size:24px}
.ht-dg__ph .ht-dg__t{font-size:14px}
@media (max-width:840px){
/* a slide is a picture of a PDF page: below 841 it is the same figure scaled to the column (the engine sets --fit), above the notes */
.ht-fit{overflow:hidden}
.ht-notes--narrow{display:grid}
.ht-dev{margin:0 20px}
.ht-dev--cv{margin:0;height:72px}
.ht-mks--sp,.ht-mks--dg{grid-template-columns:minmax(0,1fr)}
.ht-mks--sp .ht-mk--phone,.ht-mk--sum{grid-column:1;grid-row:auto}
.ht-mks--dg .ht-lt{max-width:none}
.ht-spec{grid-template-columns:minmax(0,1fr);gap:16px}
.ht-spec__aa{font-size:96px}
.ht-mks{gap:32px}
}
/* the slide's own running head repeats the bar and the page title above it: not drawn on the site */
.ht-slides .r-hd{display:none}
/* the clear space and the smallest size: below 1024 the slide gives way to a figure at the column's size (type 14 px and up) */
.ht-notes--fig{display:none}
@media (max-width:1023px){.ht-stage--fig{display:none}.ht-notes--fig{display:grid}}
.ht-css{display:flex;flex-direction:column;gap:24px}
.ht-cs__h{margin:0;font-size:14px;line-height:1.5;color:var(--s)}
.ht-csr{display:flex;flex-wrap:wrap;gap:24px 20px;align-items:flex-end}
.ht-cs{margin:0;display:flex;flex-direction:column;gap:12px;min-width:0}
.ht-cs__z{position:relative;width:100%;max-width:480px;container-type:inline-size;box-shadow:inset 0 0 0 1px var(--h)}
.ht-cs__z>i{position:absolute;display:block}
.ht-cs__l{position:absolute;display:block}
.ht-cs__l svg{display:block;width:100%;height:100%}
.ht-cs figcaption,.ht-slf figcaption{font-size:14px;line-height:1.5;color:var(--s)}
.ht-slf figcaption b{color:var(--t);font-weight:600}
.ht-cs__sw{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px}
.ht-mss{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.ht-ms{box-shadow:inset 0 0 0 1px var(--h);container-type:inline-size;padding:24px;display:flex;flex-direction:column;gap:16px;min-width:0}
.ht-ms__t{font-size:14px;line-height:1.5;margin:0}
.ht-ms__w{display:flex;flex-direction:column;gap:8px}
.ht-ms__w svg{display:block;max-width:none}
.ht-ms__r{display:block;height:8px;border:1px solid currentColor;border-top:0;opacity:.7}
.ht-sls{display:grid;grid-template-columns:minmax(0,1fr);gap:32px 24px}
.ht-slf{margin:0;display:flex;flex-direction:column;gap:12px;min-width:0}
.ht-sl{container-type:inline-size;position:relative;aspect-ratio:16/9;overflow:hidden}
.ht-sl__in{position:absolute;inset:0;padding:7cqi;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;gap:3cqi}
.ht-sl__lg{width:100%}
.ht-sl .ht-wm{justify-content:flex-start}
.ht-sl__d{font-size:max(26px,11cqi);line-height:.98;margin:0}
.ht-sl__n{font-size:max(40px,24cqi);line-height:.9;margin:0}
.ht-sl__k{font-size:max(13px,3.4cqi);line-height:1.3;margin:0}
.ht-sl__d+.ht-sl__k,.ht-sl__n+.ht-sl__k{margin-top:2cqi}
@media (min-width:600px){.ht-mss{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (min-width:1024px){.ht-sls{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (prefers-reduced-motion:reduce){.ht *{transition:none!important}}`;
}

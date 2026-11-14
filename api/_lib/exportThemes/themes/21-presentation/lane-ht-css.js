// Lane ht CSS: the two web parts. The page ground follows the light and dark switch; the deck's colour fields (dark, action,
// panel) are fixed brand colours and carry their own ink, set inline and checked. Narrow rules sit in (max-width:840px), wide ones in
// (min-width:841px), as engine/guide-site.js asks. Radii 0, no shadows: fields meet at straight edges, as on the slides.
import { L, DK } from './lane-ht-lib.js';

export function htCss(ctx) {
  const B = ctx.brand, l = L(ctx), d = DK(ctx), f = B.fonts;
  const body = `'${f.body.family}',sans-serif`, disp = `'${f.display.family}',sans-serif`, mono = `'${f.mono.family}',monospace`;
  const dw = f.display.weights[f.display.weights.length - 1];
  return `.ht{--g:${l.surface};--g2:${l.sunken};--t:${l.text};--s:${l.textSoft};--q:${l.quiet};--h:${l.divider};--fo:${l.focus || l.text};
  --body:${body};--disp:${disp};--mono:${mono};
  display:block;min-height:100vh;background:var(--g);color:var(--t);font:400 16px/1.6 var(--body);-webkit-font-smoothing:antialiased;isolation:isolate}
[data-theme="dark"] .ht{--g:${d.surface};--g2:${d.sunken};--t:${d.text};--s:${d.textSoft};--q:${d.quiet};--h:${d.divider};--fo:${d.focus || d.text}}
.ht :where(h1,h2,h3,p,ol,ul,figure,dl,dd){margin:0;padding:0}
.ht :where(ol,ul){list-style:none}
.ht a{color:inherit}
.ht .num{font-variant-numeric:tabular-nums}
.ht-d{font-family:var(--disp);font-weight:${dw};font-stretch:${f.display.stretch || 100}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance}
.ht-m{font-family:var(--mono);font-size:13px;font-weight:400;letter-spacing:0}
.ht-k{font-size:13px;line-height:1.4;font-weight:600}
.ht :focus-visible{outline:2px solid currentColor;outline-offset:3px}
.ht-skip{position:absolute;left:16px;top:-80px;z-index:4;padding:8px 12px;background:var(--g);color:var(--t)}
.ht-skip:focus{top:8px}

/* the bar: the deck's running head, one line, the same on every page */
.ht-bar{position:relative;z-index:3;display:flex;align-items:center;gap:24px;height:56px;padding:0 56px;background:var(--g);color:var(--q);font-size:13px;line-height:1.3;border-bottom:1px solid var(--h)}
.ht-home{font-weight:600;color:var(--t);text-decoration:none}
.ht-run{flex:1;min-width:0;color:var(--t)}
.ht-run b{font-weight:400;color:var(--q);margin-right:12px}
.ht-doc b{font-weight:400;color:var(--t);margin-left:12px}
.ht-mode{display:flex}
.ht-btn,.ht-mode button{font:500 13px/1 var(--body);color:var(--t);background:transparent;border:1px solid var(--h);border-radius:0;height:36px;padding:0 14px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background-color 150ms ease,color 150ms ease}
.ht-mode button+button{border-left:0}
.ht-mode button[aria-pressed="true"]{background:var(--t);color:var(--g);border-color:var(--t)}
.ht-btn[aria-expanded="true"]{background:var(--t);color:var(--g);border-color:var(--t)}
.ht-btn svg{flex:none}
@media (hover:hover){.ht-mode button:hover,.ht-btn:hover{background:var(--g2)}.ht-mode button[aria-pressed="true"]:hover,.ht-btn[aria-expanded="true"]:hover{background:var(--t)}}

/* contents: every section a stripe of the deck's fields */
.ht-toc{display:none;position:fixed;top:56px;left:0;right:0;bottom:0;z-index:2;overflow:auto;overscroll-behavior:contain;background:var(--g)}
.ht-toc[data-open="true"],.ht-toc.is-open{display:block}
.ht-toc .ht-mode{display:none}
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
.ht-cap{max-width:1280px;margin:16px auto 0;display:flex;justify-content:space-between;gap:16px;font-size:13px;line-height:1.4;color:var(--q)}

/* the notes: one big line, the readable text beside it */
.ht-notes{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:64px;padding:96px 56px 112px;max-width:1440px;margin:0 auto;container-type:inline-size}
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
.ht-pair .ht-pair__h{font-weight:600;color:var(--t);font-size:13px;padding-top:0}
.ht-pair__k{display:none}
.ht-list{counter-reset:n;border-top:1px solid var(--h)}
.ht-list>li{display:grid;grid-template-columns:48px minmax(0,1fr);padding:16px 0;border-bottom:1px solid var(--h);font-size:16px;line-height:1.55;color:var(--s)}
.ht-list>li::before{counter-increment:n;content:counter(n);color:var(--q);font-variant-numeric:tabular-nums}
.ht-list b{display:block;color:var(--t);font-weight:600}

/* fields inside the notes: colours, logo versions, traits. They meet at straight edges, as on the slides */
.ht-fields{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}
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
.ht-scale>li{display:grid;grid-template-columns:120px minmax(0,1fr);gap:24px;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--h)}
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
.ht-foot{display:flex;justify-content:space-between;gap:24px;padding:20px 56px;font-size:13px;line-height:1.4;color:var(--q)}

/* the front: the cover slide, then the contents as the deck's stripes */
.ht-cv{padding:72px 56px 56px;container-type:inline-size}
.ht-cv__t{font-size:var(--bs,96px)}
.ht-cv__l{margin-top:24px;font-size:22px;line-height:1.45;font-weight:500;max-width:36ch;color:var(--q)}
.ht-ix>li{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px;padding:40px 56px 48px;container-type:inline-size}
.ht-ix__h{font-size:var(--bs,64px)}
.ht-ix__h b{display:block;font-family:var(--body);font-weight:400;font-size:15px;letter-spacing:0;line-height:1.4;margin-bottom:12px;font-stretch:100%}
.ht-ix ol{display:flex;flex-direction:column;align-self:end}
.ht-ix ol a{display:grid;grid-template-columns:56px minmax(0,1fr);padding:10px 0;border-top:1px solid currentColor;text-decoration:none;font-size:17px;line-height:1.4}
.ht-ix ol a .num{color:var(--q)}
@media (hover:hover){.ht-ix ol a:hover span:last-child{text-decoration:underline;text-underline-offset:4px}}

@media (min-width:841px){.ht-slides{zoom:0.56}}
@media (min-width:1000px){.ht-slides{zoom:0.68}}
@media (min-width:1200px){.ht-slides{zoom:0.84}}
@media (min-width:1392px){.ht-slides{zoom:1}}
.ht-ps{container-type:inline-size;padding:0}
.ht-ps__hd{position:absolute;top:36px;left:56px;right:56px;display:flex;justify-content:space-between;gap:24px;font-size:13px;line-height:1.3}
.ht-ps__hd b{font-weight:400;margin-right:12px}
.ht-ps__t{position:absolute;left:56px;right:56px;bottom:72px;line-height:0.94}
.ht-ps__fo{position:absolute;right:56px;bottom:36px;font-size:13px;line-height:1.3}
@media (min-width:841px){
.ht-stage--tight{padding-top:40px}
}
.ht-ml{display:none}
@media (max-width:840px){
.ht-ml{display:flex;flex-direction:column;justify-content:space-between;gap:48px;min-height:224px;padding:20px 20px 28px;container-type:inline-size}
.ht-ml__hd{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:1.3;color:var(--q)}
.ht-ml__hd b{font-weight:400}
.ht-ml__t{font-size:var(--bs,40px);line-height:0.98}
.ht-stage:not(#cover){display:none}
.ht-bar{gap:12px;padding:0 20px}
.ht-home,.ht-doc{display:none}
.ht-bar{height:auto;min-height:56px;padding-top:10px;padding-bottom:10px}
.ht-bar>.ht-mode{display:none}
.ht-toc .ht-mode{display:flex;padding:16px 20px;border-bottom:1px solid var(--h)}
.ht-btn{padding:0 12px}
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
.ht-pair__k{display:block;font-size:13px;line-height:1.4;font-weight:600;color:var(--t);margin-bottom:4px}
.ht-fields{grid-template-columns:minmax(0,1fr)}
.ht-field{min-height:160px;padding:20px}
.ht-stripe{height:auto;flex-direction:column}
.ht-stripe>div{flex:none!important;min-height:56px}
.ht-scale>li{grid-template-columns:minmax(0,1fr);gap:8px}
.ht-next{padding:48px 20px 40px;gap:32px}
.ht-foot{flex-direction:column;gap:4px;padding:16px 20px}
.ht-cv{padding:48px 20px 40px}
.ht-cv__l{font-size:19px}
.ht-ix>li{grid-template-columns:minmax(0,1fr);gap:20px;padding:32px 20px 36px}
}
@media (prefers-reduced-motion:reduce){.ht *{transition:none!important}}`;
}

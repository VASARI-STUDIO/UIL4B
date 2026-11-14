// Theme 29 (Blueprint), lane hg: the guide site's chrome (the bar, the contents panel, the foot) and the rules for the pages that the book does not have.
export function chromeCss() {
  return `body{background:var(--film);color:var(--ink)}
.hg-root{background:var(--film);color:var(--ink);font:400 15px/1.6 var(--chrome);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;min-height:100vh}
.hg-root :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.hg-root :where(ul,ol){list-style:none}
.hg-root :where(a){color:inherit}
.hg-root :focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.hg-for-dark{display:none}[data-theme="dark"] .hg-for-dark{display:inline}[data-theme="dark"] .hg-for-light{display:none}
.hg-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:10px 32px;background:var(--film);border-bottom:1.5px solid var(--ink)}
.hg-brand{display:block;flex:none;width:132px;text-decoration:none}.hg-brand svg{display:block;width:132px;height:auto}
.hg-links{display:flex;gap:20px;flex:1;min-width:0}
.hg-links a{padding:10px 0;font:500 13px/1.2 var(--chrome);color:var(--ink);text-decoration:none;border-bottom:1.5px solid transparent;transition:border-color 120ms ease-out}
.hg-links a[aria-current]{border-bottom-color:var(--red)}
@media (hover:hover){.hg-links a:hover{border-bottom-color:var(--hair)}}
.hg-btn{appearance:none;display:inline-flex;align-items:center;height:36px;padding:0 14px;border:1px solid var(--ink);background:var(--film);color:var(--ink);font:500 13px/1 var(--chrome);cursor:pointer;text-decoration:none;transition:background-color 120ms ease-out,color 120ms ease-out}
.hg-btn[aria-expanded="true"]{background:var(--ink);color:var(--film)}
@media (hover:hover){.hg-btn:hover{background:var(--film2)}.hg-btn[aria-expanded="true"]:hover{background:var(--ink)}}
.hg-mode{display:inline-flex;flex:none;border:1px solid var(--ink)}
.hg-mode button{appearance:none;border:0;background:transparent;color:var(--ink);font:500 13px/1 var(--chrome);height:34px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hg-mode button[aria-pressed="true"]{background:var(--ink);color:var(--film)}
.hg-mode button:focus-visible{outline-offset:-4px}
.hg-panel{display:none;position:fixed;left:0;right:0;top:57px;bottom:0;z-index:19;overflow:auto;overscroll-behavior:contain;background:var(--film);border-bottom:1.5px solid var(--ink);padding:32px;max-height:calc(100vh - 57px)}
.hg-panel[data-open="true"]{display:block}
.hg-panel__g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 48px;max-width:1400px;margin:0 auto}
.hg-reg h2{font:400 12px/16px var(--chrome);color:var(--quiet);padding-bottom:8px;border-bottom:1.5px solid var(--ink);margin-bottom:4px}
.hg-reg ol{display:flex;flex-direction:column}
.hg-reg a{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--hair);text-decoration:none;font:400 15px/1.4 var(--chrome)}
.hg-reg a[aria-current]{box-shadow:inset 3px 0 0 var(--red);padding-left:10px}
.hg-reg .hg-m{font-size:12px;color:var(--quiet)}
@media (hover:hover){.hg-reg a:hover span:nth-child(2){text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}}
.hg-root main{display:block;padding:40px 24px 0;overflow-x:clip}
.hg-root main:focus{outline:none}
.hg-pn{display:grid;grid-template-columns:1fr 1fr;gap:0;max-width:1400px;margin:0 auto 32px;border-top:1.5px solid var(--ink);border-bottom:1px solid var(--hair)}
.hg-pn a{display:flex;flex-direction:column;gap:4px;padding:20px 24px;text-decoration:none}
.hg-pn a + a,.hg-pn span + a{border-left:1px solid var(--hair);text-align:right;align-items:flex-end}
.hg-pn__k{font:400 12px/16px var(--chrome);color:var(--quiet)}.hg-pn__t{font:500 22px/1.2 var(--chrome)}
@media (hover:hover){.hg-pn a:hover .hg-pn__t{text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:1px}}
.hg-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;max-width:1400px;margin:0 auto;padding:16px 0 48px;font:400 13px/1.4 var(--chrome);color:var(--quiet)}
@media (max-width:1199px){.hg-top{padding:10px 16px;gap:12px}.hg-panel__g{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:840px){
.hg-top{flex-wrap:wrap;gap:8px 12px}.hg-brand{width:112px}.hg-brand svg{width:112px}
.hg-links{order:3;flex-basis:100%;gap:20px}.hg-btn{height:44px;margin-left:auto}.hg-mode button{height:42px}
.hg-panel{top:105px;max-height:calc(100vh - 105px);padding:16px}.hg-panel__g{grid-template-columns:minmax(0,1fr);gap:24px}
.hg-root main{padding:24px 8px 0}
.hg-pn{grid-template-columns:minmax(0,1fr)}.hg-pn a + a,.hg-pn span + a{border-left:0;border-top:1px solid var(--hair)}.hg-pn__t{font-size:19px}
}`;
}

export function pagesCss(ctx) {
  const W = ctx.weights;
  return `
/* ---- pieces the book does not have ---- */
.hg-gd{padding-top:140px}
.hg-sw{display:block;width:24px;height:24px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-small{font-size:13px;line-height:1.5}
.hg-h3{font:500 17px/1.3 var(--chrome);margin-bottom:16px}
.hg-ov{display:flex;flex-direction:column}
.hg-ph--w .hg-photo{aspect-ratio:21/9}
.hg-lines--l li{font-size:44px;line-height:1.1}.hg-lines--m li{font-size:22px}
.hg-take .hg-measure{margin-top:28px}
.hg-sym{display:block;width:120px;margin:16px 0}
.hg-ramp li{height:24px}.hg-ramp li.is-base{box-shadow:inset 0 0 0 2px var(--ink)}
.hg-fin__v{font-size:13px;line-height:24px;text-align:right}
.hg-fin__vs{display:flex;flex-direction:column;gap:8px}.hg-fin__vs div{display:grid;grid-template-columns:56px 1fr}.hg-fin__vs dt{font:400 12px/1.6 var(--chrome);color:var(--quiet)}.hg-fin__vs dd{font-size:13px}
.hg-fins--s .hg-fin{padding:14px 0}.hg-fins--s .hg-fin{grid-template-columns:40px 24px minmax(0,1fr) 80px}
.hg-roles .hg-sw{width:20px;height:20px}.hg-roles .hg-m{font-size:13px}
.hg-key{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:16px;font:400 13px/1.4 var(--chrome)}.hg-key li{display:flex;gap:8px;align-items:center}.hg-key .hg-sw{width:14px;height:14px}.hg-key .hg-m{color:var(--quiet);font-size:12px}
.hg-pr__a{font:600 24px/1 var(--body)}
.hg-sig__n{font:600 17px/1.4 var(--body)}
.hg-meas--2{grid-template-columns:repeat(2,minmax(0,1fr));max-width:420px;margin-top:20px}
/* versions and grounds: a schedule, each ground in its own colour */
.hg-ver{grid-template-columns:40px 240px minmax(0,1fr)}
.hg-ver__f{overflow:hidden}
.hg-grs{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-gr{display:grid;grid-template-columns:40px 320px minmax(0,1fr);gap:24px;align-items:center;padding:16px 0;border-bottom:1px solid var(--hair)}
.hg-gr__n{font-size:13px}
.hg-gr__f{display:flex;align-items:center;justify-content:center;height:120px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-gr__t{display:flex;flex-direction:column;gap:4px}.hg-gr__h{font-size:13px;color:var(--quiet)}
.hg-gph__l--s .hg-logo{color:var(--ink)!important}
.hg-gph__p{position:relative}.hg-gph__l{position:absolute;top:24px;left:24px}
/* a courier's street photograph: the logo stands on the quiet dark asphalt at the foot, not the pale sky above */
.hg-gph__l--b{top:auto;bottom:24px}
/* a shot with no photograph: its brief on the brand's reversed ground */
.hg-brief{display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:24px;box-sizing:border-box;aspect-ratio:21/9}
.hg-brief b{font-size:12px;line-height:16px;letter-spacing:.04em;text-transform:uppercase}
.hg-brief span{font:400 20px/28px var(--body);max-width:56ch}
/* a card drawn flat with no photograph beside it: front and back in a row */
.hg-app--flat{grid-template-columns:minmax(0,1fr)}.hg-app--flat .hg-cards{flex-direction:row;flex-wrap:wrap;gap:48px}
/* misuse: each drawn as it must not be, struck through in the redline */
.hg-mis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 48px}
.hg-mis li{position:relative;display:flex;flex-direction:column;gap:12px}
.hg-mis__f{position:relative;display:flex;align-items:center;justify-content:center;height:200px;overflow:hidden;background:var(--film2);box-shadow:inset 0 0 0 1px var(--hair)}
.hg-mis__f--p{background:none}.hg-mis__f--p .hg-photo{position:absolute;inset:0;width:100%;height:100%;aspect-ratio:auto}.hg-mis__p{z-index:1;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.hg-mis__lg{display:block;width:160px}.hg-mis__lg .hg-logo{width:160px}
.hg-mis__lg--w{filter:hue-rotate(150deg) saturate(1.6)}
.hg-mis__x{display:block}
.hg-mis__fx .hg-mis__lg{filter:drop-shadow(0 6px 6px rgba(0,0,0,.45))}
.hg-mis__box{border:2px solid var(--ink);padding:14px;background:var(--film)}
.hg-mis__c{position:absolute;right:12px;top:12px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:var(--film);color:var(--red);box-shadow:0 0 0 1px var(--red)}
.hg-mis__c path{stroke:currentColor;stroke-width:1.5;fill:none}
.hg-mis__t{display:flex;gap:12px;align-items:flex-start}
/* proportion: a page, divided by share */
.hg-takeoff{display:grid;grid-template-columns:minmax(0,320px) minmax(0,1fr);gap:48px;align-items:start}
.hg-tko{position:relative;display:flex;gap:12px;width:100%;max-width:320px}
.hg-tko__p{display:flex;flex-direction:column;flex:1;aspect-ratio:var(--ar);box-shadow:0 0 0 1.5px var(--ink)}
.hg-tko__b{display:block;min-height:3px;box-shadow:inset 0 0 0 1px var(--hair)}
.hg-tko__d{display:flex;flex-direction:column;width:40px;font-size:12px}.hg-tko__d li{display:flex;align-items:center;min-height:0;overflow:visible}
.hg-tko__d li:before{content:"";flex:none;width:6px;height:1px;background:var(--ink);margin-right:4px}
/* type in use */
.hg-spec{display:flex;flex-direction:column;gap:24px;padding:32px 0;border-top:1.5px solid var(--ink);border-bottom:1px solid var(--hair)}
.hg-spec__h{line-height:1.05;max-width:16ch;text-wrap:balance}
.hg-measure--b{margin-top:28px}
.hg-spec__c{font:400 13px/1.5 var(--body);max-width:40em}
/* the product screen, built from the kit's own components */
.hg-scr{border:1.5px solid var(--ink);background:var(--raised,var(--film));color:var(--text,var(--ink))}
.hg-scr__bar{display:flex;align-items:center;padding:14px 24px;background:var(--surface,var(--film));border-bottom:1px solid var(--divider,var(--hair))}.hg-scr__bar .hg-logo{width:140px}
.hg-scr__b{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:24px;padding:24px;align-items:start}
.hg-scr__c{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:24px;background:var(--surface,var(--film));border:1px solid var(--divider,var(--hair));border-radius:var(--r-card,0)}
.hg-scr__c .ui-progress{align-self:stretch}
.hg-scr__k{font:500 13px/1.4 var(--body);color:var(--text-soft,var(--quiet))}
.hg-scr__eta{font-size:clamp(28px,4cqw,44px);line-height:1.1;color:var(--text,var(--ink))}
.hg-scr__ft{display:flex;justify-content:space-between;align-self:stretch;font:400 12px/1.4 var(--body);color:var(--text-soft,var(--quiet))}
.hg-scr__p{font:400 15px/1.5 var(--body);color:var(--text,var(--ink))}
.hg-scr__r{background:var(--surface,var(--film));border:1px solid var(--divider,var(--hair));border-radius:var(--r-card,0);overflow:hidden}
/* close */
.hg-sumlg{display:block;width:320px;margin-bottom:24px}
.hg-fields--s{padding-bottom:0}.hg-field--s{width:var(--w)}.hg-field__f--s{height:96px;padding:0}
.hg-who{display:flex;flex-direction:column;gap:16px}
.hg-who__n{font-size:clamp(40px,7cqw,88px);line-height:1}
.hg-who__e{font-size:22px;line-height:1.3;overflow-wrap:anywhere}
.hg-set{display:flex;flex-direction:column;border-top:1.5px solid var(--ink)}
.hg-set li{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--hair)}.hg-set__n{font-size:12px;color:var(--quiet)}
.hg-rec{display:grid;grid-template-columns:64px 160px minmax(0,1fr) minmax(0,1fr);gap:16px;padding:12px 0;border-top:1.5px solid var(--ink);border-bottom:1px solid var(--hair)}
.hg-card .a{position:absolute}.hg-card .nw{white-space:nowrap}.hg-card .bn{font-family:var(--body)}.hg-card .bd{font-family:var(--display);font-weight:${W.heading}}
.hg-card svg{display:block;width:100%;height:auto}
.hg-shot--p{max-width:520px}
@media (max-width:1199px){
.hg-takeoff{grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:32px}
.hg-gr{grid-template-columns:40px 240px minmax(0,1fr)}
}
@media (max-width:840px){
.hg-ver{grid-template-columns:32px minmax(0,1fr)}
.hg-gr{grid-template-columns:32px minmax(0,1fr);gap:12px}.hg-gr__f,.hg-gr__t{grid-column:2}
.hg-mis{grid-template-columns:minmax(0,1fr);gap:32px}
.hg-takeoff{grid-template-columns:minmax(0,1fr);gap:32px}
.hg-fins--s .hg-fin{grid-template-columns:32px 24px minmax(0,1fr) 56px}
.hg-fin__v{grid-column:auto;text-align:left}
.hg-fin__vs{grid-column:3}
.hg-lines--l li{font-size:30px}
.hg-scr__b{grid-template-columns:minmax(0,1fr);padding:12px}.hg-scr__c{padding:16px}
.hg-who__e{font-size:17px}
.hg-rec{grid-template-columns:56px minmax(0,1fr);gap:4px 12px}.hg-rec > :nth-child(n+3){grid-column:2}
.hg-set li{grid-template-columns:32px minmax(0,1fr)}.hg-set li > :nth-child(3){grid-column:2}
.hg-meas--2{grid-template-columns:repeat(2,minmax(0,1fr))}
.hg-gph__l{top:12px;left:12px}.hg-gph__l--b{top:auto;bottom:12px}
.hg-brief{padding:16px;aspect-ratio:auto;min-height:280px}.hg-brief span{font-size:16px;line-height:24px}
}`;
}

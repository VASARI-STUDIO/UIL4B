// Theme 32, Dieline, lane hg: the CSS for the guidelines site's pages (the compositions on the panels). The net, the bar, the nav and the
// pager are styled by netCss in lane-ht-net.js; everything here is prefixed hg-. Printed panels set --f, --fi, --fq and --fl inline, and
// the board takes the --hs-* roles of the mode, so every rule below reads the panel's own colours.
export function pageCss(ctx) {
  const W = ctx.weights, B = ctx.brand, rc = B.ui.radius.control;
  return `
.hs .m.hg-lit{font:inherit;font-size:inherit;letter-spacing:inherit}
.hg .hs-net{margin-bottom:8px}
/* the fold over each panel's top edge shares its class with the bar (.hs-top); keep it a 2 px line */
.hg .hs-pn>.hs-ln.hs-top{position:absolute;top:0;display:block;min-height:0;padding:0;background:none;border:0;gap:0}
@media (min-width:841px){.hg .hs-nav{position:static;max-height:none;overflow:visible}}
.hg .hs-h2.disp{font-family:var(--hs-display);font-weight:${W.heading}}
.hg-link{font:500 15px/1.4 var(--hs-chrome);color:var(--fi);text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:4px}
@media (hover:hover){.hg-link:hover{text-decoration-thickness:3px}}
.hg-tfold{color:var(--fl)}

/* the face of the pack: the cover and the intro */
.hg-cover{display:flex;flex-direction:column;gap:32px;min-height:420px}
.hg-cover--front{min-height:520px}
.hg-place{font:500 15px/1.3 var(--hs-chrome);color:var(--fq)}
.hg-cover__lg{width:min(360px,72%)}
.hg-cover--front .hg-cover__lg{width:min(400px,72%)}
.hg-hero{margin-top:auto;color:var(--fi);line-height:0.95;letter-spacing:-0.01em}
.hg-cover__v{display:flex;flex-wrap:wrap;gap:8px 24px;font:500 13px/1.3 var(--hs-chrome);color:var(--fi)}

/* lists of display lines, joined by folds */
.hg-traits,.hg-say,.hg-wtn,.hg-sum{display:flex;flex-direction:column}
.hg-traits>li,.hg-say>li,.hg-wtn>li,.hg-sum>li{position:relative;padding:24px 0}
.hg-traits>li:first-child,.hg-say>li:first-child,.hg-wtn>li:first-child,.hg-sum>li:first-child{padding-top:0}
.hg-traits>li:last-child,.hg-say>li:last-child,.hg-wtn>li:last-child,.hg-sum>li:last-child{padding-bottom:0}
.hg-traits>li{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:32px;align-items:baseline}
.hg-trait{color:var(--fi);line-height:1}
.hg-say>li{display:flex;flex-direction:column;gap:12px}
.hg-say__k{font:500 13px/1.3 var(--hs-chrome);color:var(--fq)}
.hg-say__x{color:var(--fi);line-height:1.05}
.hg-wtn>li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 32px}
.hg-wtn__w{grid-column:1/-1;color:var(--fi);line-height:1.15}
.hg-wtn__n{font:400 15px/1.5 var(--hs-body);color:var(--fi)}
.hg-wtn__n s{text-decoration-thickness:1.5px}
.hg-wtn__b{color:var(--fq)}
.hg-lines{display:flex;flex-direction:column;gap:20px}
.hg-lines li{color:var(--fi);line-height:1.1}
.hg-lines li.is-first{line-height:1;padding-bottom:12px}
.hg-take{display:flex;flex-direction:column;gap:12px}
.hg-take .hs-h2{margin-top:0}
.hg-take__t{font:400 17px/1.55 var(--hs-body);color:var(--fi);max-width:34em}
.hg-sum>li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px}
.hg-sum>li>div{display:flex;flex-direction:column;gap:8px}
.hg-sum__n{font:500 15px/1.6 var(--hs-chrome);font-variant-numeric:tabular-nums;color:var(--fq)}
.hg-sum__t{color:var(--fi);line-height:1.1}

/* logo */
.hg-logohero{width:min(560px,100%);padding:48px 0 24px}
.hg-logopack{width:min(320px,80%);padding:24px 0}
.hg-vstrip,.hg-gstrip{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.hg-mstrip{grid-template-columns:repeat(2,minmax(0,1fr))}
.hg-vcell,.hg-gcell,.hg-mis{min-height:220px;justify-content:flex-end}
.hg-vcell__lg,.hg-gcell__lg,.hg-mis__lg{flex:1;display:flex;align-items:center;justify-content:flex-start;min-height:96px;padding-bottom:16px}
.hg-gcell__lg{width:min(200px,100%)}
.hg-vcell__k{font:500 13px/1.3 var(--hs-chrome);color:var(--fi)}
.hg-clear{display:flex;justify-content:flex-start;padding:16px 0;container-type:inline-size}
.hg-clear__b{position:relative;box-sizing:border-box;--lwc:min(var(--lw),calc(100cqw / (1 + 2 * var(--pp))));padding:calc(var(--lwc) * var(--pp));width:calc(var(--lwc) * (1 + 2 * var(--pp)))}
.hg-clear__b .hs-logo{width:var(--lwc)}

.hg-box{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;color:var(--fl)}
.hg-box rect{width:calc(100% - 1.5px);height:calc(100% - 1.5px);fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:8 6}
.hg-min{padding:16px 0}
.hg-mins{display:flex;flex-wrap:wrap;align-items:flex-end;gap:32px 48px;padding:16px 0 8px}
.hg-mins li{display:flex;flex-direction:column;gap:12px}
.hg-mis__x{position:absolute;top:16px;right:16px;color:var(--fi)}
.hg-mis__x path{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.hg-mis__lg{position:relative}
.hg-mis--stretch .hg-mis__lg .hs-logo{transform:scale(1.35,0.7);transform-origin:left center}
.hg-mis--rotate .hg-mis__lg .hs-logo{transform:rotate(-14deg)}
.hg-mis--box .hg-mis__lg .hs-logo{outline:2px solid var(--fi);outline-offset:12px}
.hg-never{display:flex;flex-direction:column;gap:8px}
.hg-never li{position:relative;padding-left:20px;font:400 15px/1.55 var(--hs-body);color:var(--fi);max-width:40em}
.hg-never li::before{content:"";position:absolute;left:0;top:0.72em;width:10px;border-top:1.5px dashed var(--fl)}

/* colour: the net by share (columns wide, rows on a phone), the swatch list, the pairs, the values */
.hg-pn--net{padding-left:0!important;padding-right:0!important}
.hg-pn--net>.hs-in{gap:0}
.hg-cnet{display:flex;min-height:360px;margin:-56px 0 -64px}
.hs-net.is-bag .hg-pn--net .hg-cnet{margin-top:-112px;padding-top:0}
.hg-cp{position:relative;isolation:isolate;flex:0 0 var(--w);min-width:0;display:flex;flex-direction:column;gap:6px;padding:24px 16px;background:var(--f);color:var(--fi)}
.hg-cp .hg-cpv{left:0;color:var(--fl)}.hg-cp .hg-cph{display:none;color:var(--fl)}
.hg-cp__n{font:500 13px/1.3 var(--hs-chrome)}
.hg-cp__h{color:var(--fi)}
.hg-cp__s{margin-top:auto;font-size:40px;line-height:1}
.hg-clist{display:flex;flex-direction:column}
.hg-clist>li{display:grid;grid-template-columns:72px minmax(0,1fr);gap:24px;padding:16px 0;border-top:1px solid var(--fl)}
.hg-sw{display:block;width:72px;height:72px;box-shadow:inset 0 0 0 1px var(--hs-die)}
.hg-sw--s{width:48px;height:48px}.hg-sw--xs{width:20px;height:20px}
.hg-cn{margin:0 0 6px;font-size:21px}
.hg-prop{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;min-height:var(--ph)}
.hg-prop>div{display:flex;flex-direction:column;gap:4px;max-width:30em;text-align:right}
.hg-prop__s{font-size:56px;line-height:0.9;color:var(--fi)}
.hg-prop__n{font:500 15px/1.3 var(--hs-chrome);color:var(--fi)}
.hg-pn--prop{padding-top:24px!important;padding-bottom:24px!important}
.hs-net.is-bag .hg-pn--prop.is-first{padding-top:104px!important}
.hs-net.is-bag .hg-pn--prop.is-last,.hs-net.is-satchel .hg-pn--prop.is-last{padding-bottom:72px!important}
.hg-pstrip{grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.hg-pcell{min-height:168px;justify-content:space-between}
.hg-pcell__r{font-size:40px;line-height:1;color:var(--fi)}
.hg-pcell__c{font-size:24px}
.hg-pcell__u{font:400 13px/1.45 var(--hs-body);color:var(--fq)}
.hg-vals{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:32px 40px}
.hg-vals>li{display:flex;flex-direction:column;gap:10px;min-width:0}
.hg-vals .hs-h2{margin:0}
.hg-vals dl{display:flex;flex-direction:column}
.hg-vals dl>div{display:grid;grid-template-columns:56px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid var(--fl)}
.hg-vals dt{font:500 13px/1.5 var(--hs-chrome);color:var(--fq)}
.hg-vals dd{overflow-wrap:anywhere;line-height:1.5}
.hg-roles{display:flex;flex-direction:column}
.hg-roles li{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--fl);font:400 14px/1.4 var(--hs-body)}

/* type */
.hg-faces{display:flex;flex-direction:column}
.hg-face{position:relative;display:flex;flex-direction:column;gap:12px;padding:32px 0}
.hg-face:first-child{padding-top:0}.hg-face:last-child{padding-bottom:0}
.hg-face__big{color:var(--fi);line-height:0.95}
.hg-face__mid{font-family:var(--hs-body);line-height:1.1;color:var(--fi)}
.hg-face__mono{font-family:var(--hs-mono);font-size:28px;line-height:1.2;color:var(--fi);overflow-wrap:anywhere}
.hg-chars{font-size:clamp(22px,4.2cqw,34px);line-height:1.25;color:var(--fi);overflow-wrap:anywhere}
.hg-scale{display:flex;flex-direction:column}
.hg-scale>li{position:relative;display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;padding:24px 0}
.hg-scale>li:first-child{padding-top:0}
.hg-scale__k{display:flex;flex-direction:column;gap:6px}
.hg-scale__t{font:500 15px/1.3 var(--hs-chrome);color:var(--fi)}
.hg-scale__s{font-family:var(--hs-body);color:var(--fi);overflow-wrap:break-word;max-width:40em}
.hg-scale__s.disp{font-family:var(--hs-display)}
.hg-inuse{display:flex;flex-direction:column;gap:24px;min-height:360px}
.hg-inuse__h{color:var(--fi);line-height:1}
.hg-inuse__p{font:400 17px/1.55 var(--hs-body);color:var(--fi);max-width:34em}

/* imagery */
.hg-pn--photo{padding:0!important}
.hg-pn--photo>.hs-in{gap:0}
.hs-net.is-bag .hg-pn--photo.is-first{padding-top:88px!important}
.hg-window,.hg-shotp{margin:0}
.hg-window img,.hg-window .photo-slot{display:block;width:100%;aspect-ratio:16/10;object-fit:cover}
.hg-window .photo-slot{aspect-ratio:16/10}
.hg-sstrip{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.hg-brief{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:4/3;padding:20px;background:var(--hs-sheet);color:var(--hs-ink);outline:1.5px dashed var(--hs-die);outline-offset:-10px}
.hg-brief__k{font:500 12px/1.3 var(--hs-chrome);letter-spacing:.04em;text-transform:uppercase;color:var(--hs-soft)}
.hg-brief__t{font-size:26px;line-height:1.05;margin-top:4px}
.hg-brief__p{font:400 15px/1.5 var(--hs-body);max-width:34em}
.hg-brief--lead{aspect-ratio:16/10;padding:48px 56px;justify-content:flex-end;gap:12px}
.hg-brief--lead .hg-brief__t{font-size:44px}
.hg-brief--lead .hg-brief__p{font-size:18px;max-width:22em}
.hg-brief__g{position:absolute;top:10px;right:10px;bottom:10px;width:31%;display:flex;align-items:flex-end;padding:14px;box-sizing:border-box;border-left:1.5px dashed var(--hs-die);font:400 13px/1.4 var(--hs-chrome);color:var(--hs-soft)}
.hg-sstrip:has(.hg-brief){grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
.hg-shot figure{display:flex;flex-direction:column;gap:12px}
.hg-shot img,.hg-shot .photo-slot{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
.hg-shotp__w{position:relative;overflow:hidden;aspect-ratio:var(--ar,832/520);max-width:var(--mw,none)}
.hg-shotp+.hg-shotp{border-top:1px dashed var(--hs-die)}
.hg-shotp__w img{position:absolute;left:var(--cl);top:var(--ct);width:var(--cw);max-width:none;height:auto}
.hg-shotp figcaption{padding:16px var(--hs-padx) 24px}

/* layout */
.hg-grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:40px;align-items:end}
.hg-grid__page{position:relative;background:var(--hs-sheet)}
.hg-grid__cols{display:grid;height:100%}
.hg-grid__cols i{display:block;background:color-mix(in srgb,var(--hs-action) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--hs-action) 40%,transparent)}
.hg-grid__n{display:flex;flex-direction:column;gap:8px}
.hg-grid__big{font-size:120px;line-height:0.85;color:var(--fi)}
.hg-meas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1.5px solid var(--fl);border-bottom:1.5px solid var(--fl)}
.hg-meas>div{position:relative;padding:16px 20px}
.hg-meas .hg-mv{color:var(--fl)}
.hg-meas dt{font:500 13px/1.3 var(--hs-chrome);color:var(--fq)}
.hg-meas dd{font-size:32px;line-height:1.2;color:var(--fi)}
.hg-space{display:flex;flex-wrap:wrap;align-items:flex-end;gap:16px 20px;padding-top:8px}
.hg-space li{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.hg-space i{display:block;background:var(--hs-ink);max-width:96px;max-height:96px}
.hg-radii{display:flex;flex-direction:column;gap:12px;padding-top:8px}
.hg-radii li{display:flex;align-items:center;gap:16px}
.hg-radii i{flex:none;width:48px;height:48px;border:1.5px solid var(--hs-ink)}
.hg-flats{display:flex;flex-direction:column;gap:40px}
.hg-flat{display:flex;flex-direction:column;gap:6px}
.hg-flat__fig{position:relative;width:var(--nw);container-type:inline-size;margin-bottom:8px}
.hg-flat svg{display:block;width:100%;height:auto;overflow:visible}
.hg-fa{position:absolute;margin:0;white-space:nowrap}
.hg-fa.disp{font-family:var(--hs-display)}
.hg-fa__lg svg,.hg-fa__lg .logo-slot{display:block;width:100%;height:auto;aspect-ratio:var(--ar)}
.hg-fa__lg .logo-slot{font-size:min(6px,2cqw)}
.hg-flat rect.is-board{fill:var(--hs-board)}
.hg-flat .hg-cut{fill:none;stroke:var(--hs-die);stroke-width:1.5;vector-effect:non-scaling-stroke}
.hg-flat .hg-fold{stroke:var(--hs-die);stroke-width:1.5;stroke-dasharray:8 6;vector-effect:non-scaling-stroke}
.hg-flat .hg-seal{stroke:var(--hs-die);stroke-width:1.5;stroke-dasharray:1.5 5;stroke-linecap:round;vector-effect:non-scaling-stroke}
.hg-flat__n{font:500 15px/1.3 var(--hs-chrome);color:var(--fi)}

/* applications */
.hg-cards{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;padding:16px 0}
.hg-card{aspect-ratio:90/55;display:flex;flex-direction:column;justify-content:space-between;gap:8px;padding:7%;box-shadow:0 1px 2px rgb(0 0 0 / 0.12),0 6px 16px rgb(0 0 0 / 0.10);container-type:inline-size}
.hg-card__lg{width:min(180px,55%)}
.hg-card__l{font:${W.medium || 500} clamp(11px,4.6cqw,15px)/1.3 var(--hs-body)}
.hg-card--back{justify-content:flex-end;font:400 clamp(11px,4.2cqw,14px)/1.45 var(--hs-body)}
.hg-card__nm{font-weight:${W.semibold || W.medium || 600};font-size:clamp(12px,5cqw,16px)}
.hg-card__ct{margin-top:8px}
.hg-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.hg-post{aspect-ratio:1;display:flex;flex-direction:column;justify-content:space-between;padding:24px;container-type:inline-size}
.hg-post .disp{line-height:1.05}
.hg-post__lg{width:min(96px,45%)}
.hg-email{display:flex;flex-direction:column;gap:4px;padding:24px 0 8px;font:400 15px/1.5 var(--hs-body);color:var(--fi);max-width:32em}
.hg-email__n{font-weight:${W.semibold || W.medium || 600}}
.hg-email__l{width:168px;margin-top:16px;padding-top:16px;border-top:1px solid var(--fl)}
.hg-device{width:min(360px,100%);margin:0 auto;padding:12px;border-radius:${Math.max(28, rc + 20)}px;background:var(--fi)}
.hg-screen{display:flex;flex-direction:column;gap:12px;padding:20px 16px;border-radius:${Math.max(16, rc + 8)}px;overflow:hidden}
.hg-scr__top,.hg-scr__ft{display:flex;justify-content:space-between;align-items:center;gap:12px}
.hg-scr__eta{margin:4px 0 0}
.hg-scr__note{margin:0}
.hg-pn--screen{padding-top:48px;padding-bottom:48px}

/* close */
.hg-ask{display:flex;flex-direction:column;gap:16px}
.hg-ask__k{font:500 15px/1.3 var(--hs-chrome);color:var(--fi)}
.hg-ask__o{color:var(--fi);line-height:0.95}
.hg-ask__e a{font-weight:${W.medium || 500};text-underline-offset:4px}
.hg-not{display:flex;flex-direction:column;gap:16px}
.hg-not li{display:flex;flex-direction:column;gap:2px}

/* the front's running order: one section a row, joined by folds */
.hg-toc{display:flex;flex-direction:column;margin-top:16px}
.hg-toc__s{position:relative;display:grid;grid-template-columns:72px minmax(0,4fr) minmax(0,7fr);gap:8px 24px;padding:20px 0;align-items:baseline}
.hg-toc__n{display:flex;align-items:center;gap:10px;font:500 13px/1.3 var(--hs-chrome);font-variant-numeric:tabular-nums;color:var(--fq)}
.hg-toc__sw{display:block;width:12px;height:12px;box-shadow:inset 0 0 0 1px var(--hs-die)}
.hg-toc__t{font-size:28px;line-height:1.1;color:var(--fi);margin:0}
.hg-toc__p{display:flex;flex-wrap:wrap;gap:4px 20px}
.hg-toc__p a{display:inline-flex;gap:8px;padding:4px 0;font:400 15px/1.4 var(--hs-chrome);color:var(--fi);text-decoration:none;border-radius:${rc}px}
.hg-toc__r{font-variant-numeric:tabular-nums;color:var(--fq)}
@media (hover:hover){.hg-toc__p a:hover span:last-child{text-decoration:underline;text-underline-offset:3px}}
@media (max-width:600px){.hg-flat__fig{width:100%}}
${ctx.placeholders ? `.hg-screen .ui-chip{white-space:normal}.hg-screen .ui-row__end{flex-shrink:1;min-width:0;max-width:45%;text-align:right}` : ''}

@media (max-width:840px){
.hg-cover{min-height:340px;gap:24px}
.hg-cover--front{min-height:400px}
.hg-traits>li,.hg-wtn>li,.hg-scale>li,.hg-grid,.hg-cards{grid-template-columns:minmax(0,1fr);gap:12px}
.hg-cnet{flex-direction:column;margin:-40px 0 -48px;min-height:0}
.hs-net.is-bag .hg-pn--net .hg-cnet{margin-top:-104px}
.hg-cp{flex:none;min-height:var(--nh);padding:16px 20px}
.hg-cp .hg-cpv{display:none}.hg-cp .hg-cph{display:block;top:0}
.hg-cp__s{font-size:32px}
.hg-clist>li{grid-template-columns:48px minmax(0,1fr);gap:16px}
.hg-clist .hg-sw{width:48px;height:48px}
.hg-prop__s{font-size:40px}
.hg-pn--prop{padding-top:20px!important;padding-bottom:20px!important}
.hg-vals{grid-template-columns:minmax(0,1fr)}
.hg-meas{grid-template-columns:repeat(2,minmax(0,1fr))}
.hg-meas>div:nth-child(3) .hg-mv{display:none}
.hg-grid__big{font-size:80px}
.hg-posts{grid-template-columns:minmax(0,1fr);max-width:320px}
.hg-toc__s{grid-template-columns:minmax(0,1fr);gap:8px}
.hg-toc__t{font-size:24px}
.hg-toc__p{flex-direction:column;gap:0}
.hg-toc__p a{min-height:40px;align-items:center}
.hg-mins{gap:24px 32px}
.hg-shotp__w{aspect-ratio:var(--arn,4/5);max-width:none}
.hg-brief--lead{aspect-ratio:auto;padding:28px 20px;min-height:360px}
.hg-brief--lead .hg-brief__t{font-size:32px}
.hg-brief__g{position:static;width:auto;padding:12px 0 0;border-left:0;border-top:1.5px dashed var(--hs-die);margin-top:8px}
.hg-shotp__w img{left:var(--cnl);top:var(--cnt);width:var(--cnw)}
.hg-pn--screen{padding-top:32px;padding-bottom:32px}
.hg-vcell,.hg-gcell,.hg-mis{min-height:180px}
.hg-mstrip{grid-template-columns:minmax(0,1fr)}
}`;
}

// Lane bk: the brand book stylesheet for theme 21. The engine's shell (top bar, nav, switch, live region) is styled as the deck's
// running head; every band below it is a slide set full width. Narrow rules sit in (max-width:840px), wide in (min-width:841px),
// because the canvas boards keep one of the two. Colours come from the token variables or from ctx; nothing names a brand here.
export function bookCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, Lt = ctx.roles.light, chrome = (ctx.theme && ctx.theme.chrome && ctx.theme.chrome.family) || 'Instrument Sans';
  const dw = d.weights[d.weights.length - 1];
  return `
.bk{--chrome:'${chrome}',system-ui,sans-serif;--m:56px;--q:var(--quiet);--soft:var(--text-soft);--ink:var(--text);--bg:var(--surface);background:var(--surface);color:var(--text);font-family:var(--chrome);font-size:12px;line-height:16px;-webkit-font-smoothing:antialiased;font-synthesis:none}
.bk :where(h1,h2,h3,p,ul,ol,dl,dd,dt,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(b,strong){font-weight:inherit}
.bk :where(button,input,output,label){font:inherit;color:inherit}
.bk :where(a,button,input):focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.bk .num{font-variant-numeric:tabular-nums}
.bk-skip{position:absolute;left:var(--m);top:8px;z-index:30;transform:translateY(-300%);background:var(--text);color:var(--surface);padding:8px 12px;font-weight:600}
.bk-skip:focus{transform:none}
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:32px;height:56px;padding:0 var(--m);background:var(--surface);border-bottom:1px solid var(--divider)}
.bk-brand{display:flex;align-items:center;flex:none;color:var(--text);text-decoration:none}
.bk-brand svg{display:block;width:auto;height:auto;max-width:120px;max-height:32px}
.bk-name{font-weight:600;font-size:13px}
.bk-for-dark{display:none}
[data-theme="dark"] .bk-for-light{display:none}
[data-theme="dark"] .bk-for-dark{display:block}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;gap:20px}
.bk-nav a{display:flex;gap:6px;align-items:baseline;padding:18px 0 18px;border-top:2px solid transparent;color:var(--quiet);text-decoration:none;white-space:nowrap;transition:color 150ms ease,border-color 150ms ease}
.bk-nav a[aria-current="true"]{color:var(--text);border-top-color:var(--action)}
.bk-n{font-variant-numeric:tabular-nums}
.bk-menu{display:none;margin-left:auto;height:36px;padding:0 14px;border:1px solid var(--edge);border-radius:var(--r-button);background:transparent;color:var(--text);font-weight:600;cursor:pointer}
.bk-mode{display:flex;flex:none;border:1px solid var(--edge);border-radius:var(--r-button);overflow:hidden}
.bk-mode button{height:32px;padding:0 12px;border:0;background:transparent;color:var(--text);cursor:pointer;transition:background-color 150ms ease,color 150ms ease}
.bk-mode button[aria-pressed="true"]{background:var(--text);color:var(--surface)}
.bk-live{position:fixed;left:50%;bottom:24px;z-index:40;transform:translateX(-50%);visibility:hidden;padding:10px 16px;background:var(--text);color:var(--surface);border-radius:var(--r-control);font-weight:600}
.bk-live.is-on{visibility:visible}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:28px var(--m) 40px;color:var(--quiet)}
@media (hover:hover){.bk-nav a:hover,.bk-mode button[aria-pressed="false"]:hover{color:var(--text)}.bk-menu:hover{background:var(--sunken)}}

/* type */
.pz-d{font-family:var(--ff-display);font-weight:${dw};font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;line-height:1.02;text-wrap:balance}
.pz-t{font-family:var(--ff-body);font-size:16px;line-height:26px;color:var(--soft);max-width:62ch}
.pz-lead{font-family:var(--ff-body);font-weight:500;font-size:22px;line-height:30px;max-width:40ch}
.pz-c{font:400 12px/16px var(--chrome);color:var(--q)}
.pz-l{font:600 12px/16px var(--chrome);color:var(--ink)}
.pz-v{font-family:var(--ff-mono);font-size:12px;line-height:16px}
.pz-cap{margin-top:24px}

/* the band and the split: slides at full width; the running head on every one */
.pz-band{position:relative;padding:28px var(--m) 96px;container-type:inline-size}
.pz-g{background:var(--surface);color:var(--text);--q:var(--quiet);--soft:var(--text-soft);--ink:var(--text);--bg:var(--surface)}
.pz-hd{display:flex;justify-content:space-between;gap:16px;min-height:16px;margin-bottom:72px;font:400 12px/16px var(--chrome);color:var(--q)}
.pz-hl,.pz-hr{font:inherit;color:inherit}
.pz-hl b{display:inline-block;min-width:28px}
.pz-hr{margin-left:auto;text-align:right}
.pz-hr b{margin-left:16px}
.pz-band--tall{display:flex;flex-direction:column;min-height:min(92vh,800px)}
.pz-band--flush{padding-left:0;padding-right:0}
.pz-band--flush>.pz-hd,.pz-band--flush>p{margin-left:var(--m);margin-right:var(--m)}
.pz-split{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}
.pz-cell{position:relative;display:flex;flex-direction:column;padding:28px var(--m) 64px;container-type:inline-size;min-width:0}
.is-hair{box-shadow:inset 0 0 0 1px ${Lt.divider}}
.pz-img{width:100%;height:100%}
.bk .photo-slot{display:flex;align-items:flex-end;padding:16px;background:${Lt.sunken};color:${Lt.quietOnSunken};font:400 12px/16px var(--chrome)}
[style*="--ar"]>svg{display:block;width:100%;height:auto}
[style*="--ar"]>.logo-slot{width:100%!important;height:auto!important;aspect-ratio:var(--ar)}

/* controls */
.pz-btn{display:inline-flex;align-self:flex-start;margin-top:24px;padding:10px 16px;border:1px solid currentColor;border-radius:var(--r-button);background:transparent;font:600 12px/16px var(--chrome);cursor:pointer;transition:background-color 150ms ease,color 150ms ease,transform 120ms ease-out}
.pz-val{display:inline-flex;gap:8px;align-items:baseline;padding:6px 10px;border:1px solid currentColor;border-radius:var(--r-control);background:transparent;font:400 12px/16px var(--ff-mono);cursor:pointer;transition:background-color 150ms ease,color 150ms ease,transform 120ms ease-out}
.pz-val__k{font:600 12px/16px var(--chrome)}
.pz-hexb{padding:4px 6px;border:1px solid transparent;border-radius:var(--r-control);background:transparent;font:400 12px/16px var(--ff-mono);cursor:pointer}
.pz-btn.is-copied,.pz-val.is-copied{background:var(--ink);color:var(--bg)}
.pz-btn:active,.pz-val:active,.pz-cta:active{transform:scale(.97)}
.pz-dl{color:inherit;font:600 12px/16px var(--chrome);text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px}
.pz-dls{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline}
@media (hover:hover){.pz-btn:hover,.pz-val:hover{background:var(--ink);color:var(--bg)}.pz-hexb:hover{border-color:currentColor}.pz-dl:hover{text-decoration-thickness:2px}}

/* 1 overview */
.pz-cover__ph{width:100%;aspect-ratio:var(--ar);max-height:72vh;overflow:hidden}
.pz-cover__field{height:min(62vh,560px)}
.pz-cover__tt{padding:56px var(--m) 48px}
.pz-cover__tth{margin-bottom:16px}
.pz-cover__ttl li{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,3fr) minmax(0,6fr);gap:16px;align-items:baseline;padding:10px 0 12px;border-top:1px solid currentColor;font:400 15px/24px var(--ff-body)}
.pz-cover__ttl li:last-child{border-bottom:1px solid currentColor}
.pz-cover__ttt{font-size:28px;line-height:1;white-space:nowrap}
.pz-cover__band{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:32px;align-items:end;padding:48px var(--m)}
.pz-cover__logo{width:min(640px,100%)}
.pz-cover__logo svg{display:block;width:100%;height:auto}
.pz-cover__h{font:600 15px/24px var(--ff-body)}
.pz-cover__line{margin-top:24px;font:500 15px/24px var(--ff-body)}
.pz-cover__cap{padding:12px var(--m)}
.pz-say{min-height:460px}
.pz-say__side{justify-content:flex-end;gap:32px}
.pz-pair .pz-l{display:block;margin-bottom:8px}
.pz-trait{min-height:640px}
.pz-trait__m{max-width:30ch}
.pz-trait__w{margin-top:auto;padding-top:64px;line-height:1}
.pz-breath{padding:56px var(--m) 72px}
.pz-breath__i{max-width:34ch}

/* 2 voice */
.pz-open{margin-top:auto;display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:16px;align-items:end}
.pz-open__h{line-height:.95}
.pz-open__n .pz-l{display:block;margin-bottom:12px}
.pz-rules li{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:16px;padding:24px 0 40px;border-top:1px solid var(--divider)}
.pz-rules__e{font-size:44px}
.pz-wt{min-height:640px}
.pz-wt__h{font-size:40px;margin-bottom:48px}
.pz-wt__l{display:flex;flex-direction:column;gap:24px}
.pz-wt__l .pz-c{margin-top:4px}
.pz-bp{min-height:520px}
.pz-bp .pz-l{margin-bottom:16px}
.pz-bp__t{font:500 26px/36px var(--ff-body);max-width:28ch}
.pz-bp__nh{margin-top:48px}
.pz-state__h{line-height:.95;max-width:12em}
.pz-state__o{display:flex;flex-wrap:wrap;gap:16px 64px;margin-top:64px}
.pz-state__o li{font-size:40px;color:var(--soft)}

/* 3 logo */
.pz-lgo{margin-top:auto;display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:48px 16px;align-items:end}
.pz-lgo__m{max-width:860px}
.pz-split--ver{grid-auto-flow:row;grid-template-columns:repeat(4,minmax(0,1fr))}
.pz-ver{min-height:340px}
.pz-ver--lead{grid-column:span 2}
.pz-ver .pz-hd{margin-bottom:0}
.pz-ver__a{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 0}
.pz-ver__m{max-width:100%}
.pz-ver__c{display:flex;justify-content:space-between;gap:16px;align-items:flex-end}
.pz-ver__c .pz-c{max-width:34ch}
.pz-clear{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px 16px;align-items:start}
.pz-cs{max-width:640px}
.pz-cs__in{aspect-ratio:var(--ar);outline:1px dashed ${Lt.quiet}}
.pz-cs__in svg{display:block;width:100%;height:auto}
.pz-clear__n{display:flex;flex-direction:column;gap:16px}
.pz-min{margin-top:32px;padding-top:24px;border-top:1px solid var(--divider);display:flex;flex-direction:column;gap:16px}
.pz-min__l svg{display:block;width:100%;height:auto}
.pz-never li{font-size:32px;padding:20px 0 24px;border-top:1px solid var(--ink)}

/* 4 colour */
.pz-prop__i{margin-bottom:48px}
.pz-prop__s{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr) auto;gap:16px;align-items:center;min-height:var(--h);padding:12px var(--m)}
.pz-prop__n{line-height:.9}
.pz-prop__t{display:flex;flex-direction:column;gap:4px}
.pz-clead{margin-top:auto;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:32px 16px;align-items:end}
.pz-clead__n{line-height:.9}
.pz-clead__s{display:flex;flex-direction:column;gap:24px}
.pz-vals{display:flex;flex-wrap:wrap;gap:8px}
.pz-ramp{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));margin-top:48px}
.pz-ramp li{display:flex;flex-direction:column;gap:8px}
.pz-ramp i{display:block;height:64px}
.pz-ramp li.is-base i{box-shadow:inset 0 0 0 2px var(--ink)}
.pz-ramp__k{font:400 12px/16px var(--chrome);color:var(--q)}
.pz-col{min-height:560px}
.pz-col__l{margin:16px 0 32px;max-width:36ch}
.pz-col .pz-vals{margin-top:auto}
.pz-col .pz-ramp{margin-top:24px}
.pz-col .pz-ramp i{height:48px}
.pz-tones__i{margin-bottom:32px}
.pz-tones li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:16px;align-items:center;padding:12px 0;border-top:1px solid var(--divider)}
.pz-tones__sw{width:48px;height:48px;box-shadow:inset 0 0 0 1px var(--divider)}
.pz-tones__n{display:flex;flex-direction:column;gap:2px}
.pz-pairs__i{margin-bottom:48px}
.pz-pairs li{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:16px;align-items:center;padding:24px var(--m)}
.pz-pairs__r{font-size:64px;line-height:1}
.pz-pairs__r i{font-style:normal;font-size:24px}
.pz-pairs__u{display:flex;flex-direction:column;gap:4px;font:400 15px/24px var(--ff-body)}
.pz-pairs__w{font-weight:600}
.pz-roles .pz-l{margin-bottom:16px}
.pz-roles li{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--div)}
.pz-roles__sw{width:24px;height:24px}
.pz-roles__n{font:400 13px/20px var(--ff-body)}

/* 5 typography */
.pz-face__n{line-height:.92}
.pz-face__set{margin-top:40px;font-size:26px;line-height:30px;overflow-wrap:anywhere}
.pz-face__n2{margin-top:48px;max-width:44ch}
.pz-face__n2 .pz-l{display:block;margin-bottom:4px}
.pz-body{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px 16px}
.pz-body__h,.pz-lic{grid-column:1/-1}
.pz-body__n{font-family:var(--ff-body);font-weight:500;line-height:1.05;margin-bottom:8px}
.pz-weights{display:contents}
.pz-weights li{display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--divider)}
.pz-weights__s{font:22px/28px var(--ff-body)}
.pz-mono{grid-column:1/-1;display:flex;gap:24px;align-items:baseline;flex-wrap:wrap;padding-top:16px;border-top:1px solid var(--divider)}
.pz-mono__s{font:400 22px/28px var(--ff-mono)}
.pz-scale li{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:16px;align-items:baseline;padding:24px 0 32px;border-top:1px solid var(--divider)}
.pz-scale__s{overflow-wrap:break-word;min-width:0}
.pz-scale__m{display:flex;flex-direction:column;gap:4px}
.pz-tester__c{display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:16px;align-items:end}
.pz-field{display:flex;flex-direction:column;gap:8px}
.pz-field label{font:600 12px/16px var(--chrome);display:flex;justify-content:space-between}
.pz-field output{font-weight:400;color:var(--quiet)}
.pz-field input[type=text]{height:48px;padding:0 14px;border:1px solid var(--edge);border-radius:var(--r-input);background:var(--surface);color:var(--text);font:400 16px/24px var(--ff-body)}
.pz-field input[type=range]{width:100%;height:48px;accent-color:var(--action);background:transparent}
.pz-tester__d{margin-top:64px;font-size:var(--tester-size,64px);overflow-wrap:anywhere}
.pz-tester__b{margin-top:24px;font:400 max(15px,calc(var(--tester-size,64px) * .375))/1.4 var(--ff-body);color:var(--text-soft);overflow-wrap:anywhere}
.pz-use{margin-top:auto;display:grid;grid-template-columns:minmax(0,8fr) minmax(0,4fr);gap:32px 16px;align-items:end}
.pz-use__p{display:flex;flex-direction:column;gap:16px}
.pz-do{min-height:520px}
.pz-do__h{font-size:40px;margin-bottom:40px}
.pz-do li{padding:16px 0 20px;border-top:1px solid var(--q)}

/* 6 imagery */
.pz-band--open{padding-bottom:48px}
.pz-img__h{max-width:18em}
.pz-bleed{width:100%;aspect-ratio:var(--ar);max-height:82vh;overflow:hidden;position:relative}
.pz-bleed+*{margin-top:0}
.pz-bleed__c{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;gap:16px;padding:12px var(--m);background:var(--surface);color:var(--text)}
.pz-dir div{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:16px;padding:24px 0 32px;border-top:1px solid var(--divider)}
.pz-shots{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:48px 16px}
.pz-shot{grid-column:span 4;display:flex;flex-direction:column;gap:12px}
.pz-shot--0,.pz-shot--3{grid-column:span 8}
.pz-shot .pz-img{height:clamp(260px,34vw,520px)}
.pz-shot figcaption{display:flex;justify-content:space-between;gap:16px}
.pz-take__i{margin:64px 0 24px}
.pz-shots+.pz-take__i{margin-top:96px}
.pz-take li{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,9fr);gap:16px;align-items:start;padding:16px 0 24px;border-top:1px solid var(--divider)}
.pz-take__f .pz-img{aspect-ratio:4/3;height:auto}
.pz-take__t{display:flex;flex-direction:column;gap:8px}
.pz-irules li{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,6fr);gap:16px;padding:24px 0 32px;border-top:1px solid var(--ink)}
.pz-irules .pz-l{display:block;margin-bottom:8px}

/* 7 layout */
.pz-grid{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px 16px;align-items:start}
.pz-grid__f{display:flex;justify-content:center;padding:48px}
.pz-page{width:100%;box-shadow:inset 0 0 0 1px ${Lt.divider}}
.pz-page.is-portrait{width:min(100%,360px)}
.pz-page__g{display:grid;height:100%}
.pz-page__g i{display:block;height:100%}
.pz-grid__n{display:flex;flex-direction:column;gap:48px}
.pz-meas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 16px}
.pz-meas div{padding-top:12px;border-top:1px solid var(--divider)}
.pz-meas dd{font-size:56px;line-height:1;margin-top:8px}
.pz-meas dd i{font-style:normal;font-size:20px}
.pz-space__i{margin-bottom:32px}
.pz-space li{display:grid;grid-template-columns:120px minmax(0,1fr) 64px;gap:16px;align-items:center;padding:8px 0;border-top:1px solid var(--divider)}
.pz-space i{display:block;height:16px;max-width:100%;background:var(--text)}
.pz-space .pz-v{text-align:right}
.pz-shape{display:flex;flex-wrap:wrap;gap:48px}
.pz-shape li{display:flex;flex-direction:column;gap:16px;max-width:220px}
.pz-shape i{display:block;width:120px;height:120px;background:var(--sunken);border:${B.ui.border}px solid var(--text)}
.pz-shape i.is-round{border-radius:9999px}
.pz-shape__n{margin-top:48px}

/* 8 applications */
.pz-mock{aspect-ratio:var(--ar);overflow:hidden}
.pz-mock .pz-img{display:block;object-fit:cover}
.pz-band--card{padding-bottom:56px}
.pz-posts{display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap}
.pz-post{position:relative;height:480px;container-type:inline-size;padding:32px}
.pz-post--sq{aspect-ratio:1}
.pz-post--pt{aspect-ratio:4/5}
.pz-post--st{aspect-ratio:9/16}
.pz-post__lg{position:absolute;left:32px;bottom:32px;width:44cqw}
.pz-split--sign{grid-template-columns:minmax(0,7fr) minmax(0,5fr);grid-auto-flow:row}
.pz-sign{align-items:center;justify-content:center}
.pz-poster{position:relative;flex:none;max-width:100%;overflow:hidden;--body:var(--ff-body);--display:var(--ff-display)}
.pz-sign .pz-cap{align-self:stretch;text-align:center}
.pz-mail{max-width:560px;padding:32px;font-family:var(--ff-body)}
.pz-mail__n{font-size:16px;font-weight:600;line-height:24px}
.pz-mail__r{font-size:14px;line-height:22px}
.pz-mail__c{margin-top:16px;font-size:14px;line-height:22px}
.pz-mail__l{width:168px;margin-top:24px}
.pz-split--prod{grid-template-columns:minmax(0,7fr) minmax(0,5fr);grid-auto-flow:row}
.pz-prod__n{gap:24px}
.pz-prod__h{margin-bottom:8px}
.pz-prod{align-items:center}
.pz-phone{width:330px;max-width:100%;padding:10px;border-radius:44px;background:${Lt.text}}
.pz-scr{min-height:600px;padding:22px 16px;border-radius:34px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body);display:flex;flex-direction:column;gap:14px}
.pz-scr__who .ui-row{flex-wrap:wrap}
.pz-scr__who .ui-row__main{flex:1 1 0}
.pz-scr__who .ui-row__end{flex:1 0 100%;align-items:stretch}
.pz-scr__who .ui-row__end .ui-btn{width:100%;justify-content:center}
.pz-scr__top{display:flex;justify-content:space-between;align-items:center;font-size:13px}
.pz-scr__eta{font-size:28px;line-height:1.1}
.pz-scr__note{font-size:13px;line-height:19px;color:var(--text-soft)}
.pz-scr__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--quiet)}

/* 9 downloads */
.pz-split--dl{grid-template-columns:minmax(0,5fr) minmax(0,7fr);grid-auto-flow:row}
.pz-kit__in{position:sticky;top:96px;display:flex;flex-direction:column;gap:24px}
.pz-kit__h{line-height:.95}
.pz-kit__z{color:var(--soft)}
.pz-cta{display:inline-flex;align-self:flex-start;gap:12px;align-items:baseline;padding:14px 20px;border-radius:var(--r-button);background:${Lt.action};color:${Lt.actionLabel};font:600 13px/20px var(--chrome);text-decoration:none;transition:background-color 150ms ease,transform 120ms ease-out}
.pz-cta:focus-visible{outline-color:currentColor;outline-offset:3px}
.pz-fold>li{padding:24px 0 40px;border-top:1px solid var(--divider)}
.pz-fold__h{display:flex;gap:16px;align-items:baseline;margin-bottom:8px}
.pz-fold__h h3{font-size:32px}
.pz-files{margin-top:16px}
.pz-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:baseline;padding:10px 0;border-top:1px solid var(--divider)}
.pz-file__n{font:500 15px/22px var(--ff-body);overflow-wrap:anywhere;min-width:0}
.pz-file--logo{grid-template-columns:minmax(0,1fr) auto}
.pz-pngs{display:inline-flex;gap:10px;align-items:baseline}
.pz-icons{display:flex;flex-wrap:wrap;gap:4px;margin-top:16px}
.pz-icon{display:flex;flex-direction:column;align-items:center;gap:8px;width:88px;padding:12px 4px;color:var(--text);text-decoration:none;text-align:center;overflow-wrap:anywhere;border-radius:var(--r-control);transition:background-color 150ms ease}
@media (hover:hover){.pz-cta:hover{background:${Lt.actionHover}}.pz-icon:hover{background:var(--sunken)}}

@media (min-width:841px){
  .pz-cover__band{min-height:184px}
}
@media (max-width:840px){
  .bk{--m:20px}
  .bk-top{gap:12px}
  .bk-brand svg{max-width:96px;max-height:28px}
  .bk-menu{display:inline-flex;align-items:center}
  .bk-nav{display:none;position:absolute;top:56px;left:0;right:0;padding:4px var(--m) 16px;background:var(--surface);border-bottom:1px solid var(--divider)}
  .bk-top[data-open="true"] .bk-nav{display:block}
  .bk-nav ol{flex-direction:column;gap:0}
  .bk-nav a{padding:12px 0;border-top:0;border-bottom:1px solid var(--divider);font-size:15px;line-height:20px}
  .bk-nav a[aria-current="true"]{font-weight:600}
  .bk-mode button{padding:0 8px}
  .pz-band{padding:24px var(--m) 64px}
  .pz-cell{padding:24px var(--m) 48px}
  .pz-hd{margin-bottom:40px}
  .pz-hr span{display:none}
  .pz-split{display:block}
  .pz-split>.pz-cell:not(:first-child)>.pz-hd{display:none}
  .pz-split>.pz-cell:not(:first-child){padding-top:40px}
  .pz-lead{font-size:19px;line-height:26px}
  .pz-band--tall{min-height:0}
  .pz-cover__ph{aspect-ratio:4/3}
  .pz-cover__field{height:300px}
  .pz-cover__tt{padding:40px var(--m) 32px}
  .pz-cover__ttl li{grid-template-columns:minmax(0,1fr) auto;gap:2px 16px}
  .pz-cover__ttd{grid-column:1/-1}
  .pz-cover__ttt{font-size:24px}
  .pz-cover__ttw{text-align:right}
  .pz-cover__band{grid-template-columns:minmax(0,1fr);gap:32px;padding:32px var(--m)}
  .pz-say,.pz-trait,.pz-wt,.pz-bp,.pz-col,.pz-do{min-height:0}
  .pz-trait{min-height:360px}
  .pz-breath{padding:40px var(--m) 48px}
  .pz-say__h{font-size:28px!important}
  .pz-open,.pz-lgo,.pz-clead,.pz-use,.pz-clear,.pz-grid,.pz-tester__c{grid-template-columns:minmax(0,1fr);gap:32px}
  .pz-open,.pz-lgo,.pz-clead,.pz-use{margin-top:48px}
  .pz-rules li,.pz-dir div,.pz-irules li,.pz-scale li,.pz-pairs li{grid-template-columns:minmax(0,1fr);gap:12px}
  .pz-rules__e{font-size:30px}
  .pz-state__o li{font-size:26px}
  .pz-never li{font-size:22px}
  .pz-ver{min-height:220px}
  .pz-prop__s{grid-template-columns:minmax(0,1fr) auto}
  .pz-prop__t{grid-column:1/-1;grid-row:2}
  .pz-ramp i{height:40px}
  .pz-ramp__k{font-size:12px;letter-spacing:-0.02em}
  .pz-pairs__r{font-size:44px}
  .pz-face__set{font-size:18px;line-height:24px}
  .pz-body{grid-template-columns:minmax(0,1fr);gap:24px}
  .pz-shots{display:flex;flex-direction:column;gap:32px}
  .pz-shot .pz-img{height:260px}
  .pz-shot figcaption,.pz-bleed__c{flex-direction:column;gap:4px}
  .pz-bleed{aspect-ratio:auto;max-height:none;overflow:visible}
  .pz-bleed .pz-img{aspect-ratio:4/3;height:auto}
  .pz-bleed__c{position:static}
  .pz-grid__f{padding:24px}
  .pz-meas dd{font-size:40px}
  .pz-space li{grid-template-columns:72px minmax(0,1fr) 48px}
  .pz-mock--card{aspect-ratio:4/3}
  .pz-take li{grid-template-columns:minmax(0,1fr)}
  .pz-take__f{width:160px}
  .pz-post{height:300px;padding:20px}
  .pz-post__lg{left:20px;bottom:20px}
  .pz-sign__ph{padding-bottom:24px}
  .pz-mail{padding:20px}
  .pz-kit__in{position:static}
  .pz-fold__h h3{font-size:26px}
  .pz-file{grid-template-columns:minmax(0,1fr) auto}
  .pz-file .pz-c{grid-column:1/-1;grid-row:2}
  .pz-file--logo .pz-dls{grid-column:1/-1}
}
@media print{.bk-top,.bk-live{display:none}}
`;
}

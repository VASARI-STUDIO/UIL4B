// Theme 22, Ticket: lane bk, the brand book's stylesheet. After dark the page is the bar top (the theme's table colour) with paper type;
// in daylight it is the brand's light surface with its text colour. The tickets keep the field colour in both, and the holes and notches
// take the page ground, because they are cut through to it. Radii 0, no shadows: elevation is the value step from the ground to the ticket.
import { roles, textWidth } from './helpers.js';

export function bookCss(ctx) {
  const R = roles(ctx), Lr = ctx.roles.light, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights;
  // the light ground's edge for a ticket that nearly matches it
  const edgeL = ctx.ratio(R.field, Lr.surface) < 1.6 ? Lr.border : 'transparent', edgeD = R.nearTable(R.field) ? R.edge : 'transparent';
  // the perforation: 4 px holes at a 10 px pitch, as a mask so the hole colour can follow the mode
  // how wide 'Aa' runs in the display face, per px of size, as the book sets it (-0.015em), with 4% to spare: an expanded face runs far wider
  const aaK = (textWidth(ctx, 'display', 'Aa', 100, -0.015) / 100 * 1.04).toFixed(3);
  const hole = (v) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${v ? 4 : 10}' height='${v ? 10 : 4}'%3E%3Ccircle cx='2' cy='2' r='2'/%3E%3C/svg%3E")`;
  return `:root,.bk--board{--g:${Lr.surface};--t:${Lr.text};--q:${Lr.quiet};--hair:${Lr.divider};--inv:${R.table};--inv-ink:${R.paper};--tk-edge:${edgeL};--focus:${Lr.text};
--f:${R.field};--fi:${R.fieldInk};--chrome:'${b.family}',sans-serif;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m.family}',monospace}
[data-theme="dark"]{--g:${R.table};--t:${R.paper};--q:${R.quiet};--hair:${R.quiet};--inv:${R.paper};--inv-ink:${R.table};--tk-edge:${edgeD};--focus:${R.paper}}
body{background:var(--g);color:var(--t)}
.bk{font-family:var(--body);font-size:15px;line-height:22px;color:var(--t);background:var(--g);-webkit-font-smoothing:antialiased;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk :where(b,strong){font-weight:600}
.bk .disp{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${W.heading};letter-spacing:-0.015em;font-variant-numeric:tabular-nums}
.bk .m{font-family:var(--mono);font-weight:${m.weights[0]};font-size:12px;font-variant-numeric:tabular-nums}
.bk :focus-visible{outline:2px solid currentColor;outline-offset:2px}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--t);color:var(--g);padding:12px 16px;font-weight:600;text-decoration:none}
.bk-skip:focus{top:16px}
.tb-for-light{display:contents}.tb-for-dark{display:none}
[data-theme="dark"] .tb-for-light{display:none}[data-theme="dark"] .tb-for-dark{display:contents}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
ul.tb-for-light{display:grid}[data-theme="dark"] ul.tb-for-dark{display:grid}

/* the header: a slim strip on the ground, the sections as a row of names, the current one underlined */
.bk-top{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:24px;padding:0 32px;height:64px;background:var(--g);border-bottom:1px solid var(--hair)}
.bk-brand{flex:none;display:block;width:120px;text-decoration:none}
.bk-brand svg{display:block;width:100%;height:auto}
.bk-name{font-weight:600;font-size:20px}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;gap:4px}
.bk-nav a{display:flex;gap:6px;align-items:baseline;padding:8px;font-size:13px;line-height:18px;font-weight:500;text-decoration:none;color:var(--t);border-bottom:2px solid transparent}
.bk-nav .bk-n{font-size:12px;color:var(--q);font-variant-numeric:tabular-nums}
.bk-nav a[aria-current]{font-weight:600;border-bottom-color:var(--t)}
@media (hover:hover){.bk-nav a:hover{border-bottom-color:var(--q)}}
.bk-menu{display:none;appearance:none;border:1px solid var(--t);background:transparent;color:var(--t);font:600 13px/1 var(--body);height:36px;padding:0 12px;cursor:pointer}
.bk-mode{display:inline-flex;flex:none;border:1px solid var(--t)}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--t);font:500 13px/1 var(--body);height:34px;padding:0 12px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--t);color:var(--g)}
.bk-mode button:focus-visible{outline-offset:-4px}

/* main: the roll */
.bk main{max-width:1280px;margin:0 auto;padding:32px 32px 0}
.bk main:focus{outline:none}
.tb-sec{scroll-margin-top:72px;padding-bottom:128px}
.bk-foot{display:flex;justify-content:space-between;gap:16px;padding:24px 0 40px;border-top:1px solid var(--hair);font-size:12px;line-height:16px;color:var(--q)}

/* the ticket */
.tb-tk{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr) 272px;background:var(--tk,var(--f));color:var(--tk-ink,var(--fi));box-shadow:inset 0 0 0 1px var(--tk-edge);overflow:hidden}
.tb-tk--open{min-height:468px}
.tb-tk__body{position:relative;min-width:0;padding:40px;container-type:inline-size;display:flex;flex-direction:column;gap:24px}
.tb-tk__stub{position:relative;padding:40px 32px 32px 40px;display:flex;flex-direction:column;gap:8px}
.tb-tk__stub::before{content:'';position:absolute;left:-2px;top:28px;bottom:28px;width:4px;background:var(--g);-webkit-mask:${hole(true)} repeat-y 0 0/4px 10px;mask:${hole(true)} repeat-y 0 0/4px 10px}
.tb-notch{position:absolute;left:-16px;width:32px;height:32px;border-radius:50%;background:var(--g);box-shadow:inset 0 0 0 1px var(--tk-edge)}
.tb-notch--a{top:-16px}.tb-notch--b{bottom:-16px}
.tb-tk--inv{--tk:var(--inv);--tk-ink:var(--inv-ink);box-shadow:none}
.tb-b{font-size:13px;line-height:18px;font-weight:600}
.tb-s{font-size:12px;line-height:16px}
.tb-stub__sec{margin-top:88px}
.tb-stub__h{font:600 24px/32px var(--body);letter-spacing:-0.005em}
.tb-stub__no{margin-top:auto;padding-top:32px}
.tb-serial{font-size:56px;line-height:56px}
.tb-stub__bc{margin-top:16px}
.tb-bc{display:block;fill:currentColor}
.tb-code{font:${m.weights[0]} 12px/16px var(--mono);margin-top:4px}
.tb-stub__act{margin:auto 0;display:flex;flex-direction:column;gap:8px}
.tb-ln{display:block;white-space:nowrap}
.tb-fit{display:block;line-height:0.92}
.tb-fit--n{display:none}
.tb-big{margin-top:auto}
.tb-body-foot,.tb-cover__foot{font-size:15px;line-height:22px;font-weight:600;max-width:52ch}
.tb-cover__logo{flex:1}
.tb-logo{display:block;width:min(100%,var(--lw));max-width:100%}
.tb-logo>*{width:100%!important;height:auto!important;display:block}
.tb-logo .logo-slot{aspect-ratio:inherit}

/* the signature moment: on first load the hero's perforation is punched hole by hole, top to bottom, like a perforating wheel */
@media (prefers-reduced-motion:no-preference){.tb-tk--hero .tb-tk__stub::before{animation:tb-punch 640ms steps(42,end) 200ms backwards}}
@keyframes tb-punch{from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0)}}

/* the zone: the bar top under each ticket, on the ticket's own columns (body, then the stub column for side notes) */
.tb-zone{display:grid;grid-template-columns:minmax(0,1fr) 272px;column-gap:0;row-gap:56px;padding-top:40px}
.tb-main{grid-column:1;padding-right:80px;max-width:944px}
.tb-side{grid-column:2;padding-left:40px}
.tb-full{grid-column:1/-1}
.tb-h3{font:600 20px/28px var(--body);margin-bottom:16px}
.tb-h4{font:600 15px/22px var(--body)}
.tb-p{max-width:65ch;font-size:15px;line-height:22px}
.tb-lead{font:500 24px/32px var(--body);letter-spacing:-0.005em;max-width:36ch}
.tb-note{font-size:13px;line-height:18px;color:var(--q)}
.tb-pair{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.tb-rows div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;padding:12px 0;border-top:1px solid var(--hair)}
.tb-rows dt{font-size:13px;font-weight:600}
.tb-rows dd{font-size:15px;line-height:22px}
.tb-side .tb-rows div{grid-template-columns:72px 1fr}
.tb-order li,.tb-wtn li,.tb-rules li,.tb-scale li{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:24px;padding:24px 0;border-top:1px solid var(--hair)}
.tb-order__k{font-size:40px;line-height:44px}
.tb-wtn li{grid-template-columns:minmax(0,6fr) minmax(0,6fr)}
.tb-wtn__w{font:600 20px/28px var(--body);grid-row:span 2}
.tb-wtn__n,.tb-wtn__b{font-size:13px;line-height:18px;color:var(--q)}
.tb-wtn__n b{color:var(--t)}
.tb-rules li{grid-template-columns:1fr 1fr}
.tb-rules b{display:block;font-size:13px;line-height:18px}
.tb-rules__dont{color:var(--q)}.tb-rules__dont b{color:var(--t)}
.tb-lines li{font-size:40px;line-height:44px;padding:16px 0;border-top:1px solid var(--hair)}
.tb-never li{font:500 20px/28px var(--body);padding:12px 0;border-top:1px solid var(--hair)}

/* voice: the set list on the ticket */
.tb-set{display:flex;flex-direction:column;gap:16px;margin:auto 0}
.tb-set li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;align-items:baseline;padding-top:12px;border-top:1px solid currentColor}
.tb-set__k{font-size:13px;line-height:18px;font-weight:600}
.tb-set__v{container-type:inline-size}
.tb-take{display:grid;grid-template-columns:5fr 7fr;gap:24px}
.tb-tk--s{grid-template-columns:minmax(0,1fr) 176px}
.tb-tk--s .tb-tk__stub{padding:24px}
.tb-tk--s .tb-tk__stub::before{top:20px;bottom:20px}
.tb-say{font-size:17px;line-height:26px;max-width:60ch}

/* buttons: square, ruled in the text colour; the pressed state fills */
.tb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border:1px solid currentColor;background:transparent;color:inherit;font:600 13px/1 var(--body);text-decoration:none;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out,transform 120ms ease-out}
.tb-tk .tb-btn{color:var(--tk-ink,var(--fi))}
.tb-btn.is-copied,.tb-btn--prime,.tb-tk .tb-btn.is-copied,.tb-tk .tb-btn--prime{background:var(--tk-ink,var(--fi));color:var(--tk,var(--f))}
.tb-btn:active{transform:scale(.97)}
@media (hover:hover){.tb-btn:hover{background:var(--tk-ink,var(--fi));color:var(--tk,var(--f))}.tb-tk .tb-btn--prime:hover{background:transparent;color:var(--tk-ink,var(--fi))}}
.tb-val{appearance:none;border:0;border-bottom:1px solid var(--hair);background:transparent;color:inherit;padding:2px 0;font:${m.weights[0]} 12px/16px var(--mono);cursor:pointer}
@media (hover:hover){.tb-val:hover{border-bottom-color:currentColor}}
.tb-dl{font-size:13px;font-weight:600;text-underline-offset:3px}
.tb-dls{display:flex;flex-wrap:wrap;gap:4px 12px}
.bk-live{position:fixed;left:32px;bottom:32px;z-index:20;padding:12px 16px;background:var(--f);color:var(--fi);font:600 13px/18px var(--body);visibility:hidden}
.bk-live.is-on{visibility:visible}

/* sheets: tickets printed as one sheet and torn along perforations; no gaps, the holes between the cells */
.tb-sheet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.tb-cell{position:relative;display:flex;flex-direction:column;gap:12px;padding:24px;min-height:220px}
.tb-cell::before{content:'';position:absolute;left:-2px;top:12px;bottom:12px;width:4px;background:var(--g);-webkit-mask:${hole(true)} repeat-y 0 0/4px 10px;mask:${hole(true)} repeat-y 0 0/4px 10px}
.tb-cell::after{content:'';position:absolute;left:12px;right:12px;top:-2px;height:4px;background:var(--g);-webkit-mask:${hole(false)} repeat-x 0 0/10px 4px;mask:${hole(false)} repeat-x 0 0/10px 4px}
.tb-cell--w{grid-column:span 2}
.is-near-l{box-shadow:inset 0 0 0 1px ${Lr.border}}
[data-theme="dark"] .is-near-l{box-shadow:none}
[data-theme="dark"] .is-near-d{box-shadow:inset 0 0 0 1px ${R.edge}}
.tb-cell__lg{flex:1;display:flex;align-items:center;justify-content:center}
.tb-cell__cap{display:flex;flex-direction:column;gap:4px;font-size:12px;line-height:16px}
.tb-cell__cap b{font-size:13px}
.tb-sheet--pairs{grid-template-columns:repeat(4,minmax(0,1fr))}
.tb-cell--pair{min-height:160px;justify-content:space-between;container-type:inline-size}
.tb-pair__r{font-size:min(40px,17cqw);line-height:44px;white-space:nowrap}
.tb-pair__u{font-size:13px;line-height:18px}
/* a pair cleared for large type only is labelled in the type it is for */
.bk .tb-pair__u--lg{font-size:24px;line-height:28px}

/* logo */
.tb-logo-hero{flex:1;display:flex;align-items:center}
.tb-clear__box{display:inline-block;border:1px dashed var(--q)}
.tb-clear figcaption{margin-top:16px}
.tb-min{display:flex;flex-direction:column;gap:16px}

/* colour */
.tb-tk--strip .tb-tk__body{padding:0}
.tb-strip{display:flex;flex:1}
.tb-seg{position:relative;flex:var(--share) 1 0;min-width:0}
.tb-seg+.tb-seg::before{content:'';position:absolute;left:-2px;top:12px;bottom:12px;width:4px;background:var(--g);-webkit-mask:${hole(true)} repeat-y 0 0/4px 10px;mask:${hole(true)} repeat-y 0 0/4px 10px;z-index:1}
.tb-seg.is-near{box-shadow:inset 0 1px 0 ${R.edge},inset 0 -1px 0 ${R.edge}}
/* a colour that nearly matches the daylight ground keeps the ticket's edge (top and foot; the first segment is the ticket's left edge too) */
.tb-seg.is-near-l{box-shadow:inset 0 1px 0 ${Lr.border},inset 0 -1px 0 ${Lr.border}}
.tb-seg.is-near-l:first-child{box-shadow:inset 0 0 0 1px ${Lr.border}}
[data-theme="dark"] .tb-seg.is-near-l{box-shadow:none}
.tb-seg__b{appearance:none;border:0;background:transparent;color:inherit;width:100%;height:100%;padding:40px 16px 32px 24px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:4px;cursor:pointer;font:600 13px/18px var(--body)}
.tb-seg__b:focus-visible{outline-offset:-6px}
/* the share, sized by the markup to its own segment's width (--pfs), so a narrow segment's figure never runs into the next */
.tb-seg__n{overflow-wrap:anywhere}
.tb-seg__p{margin-top:auto;font-size:var(--pfs,56px);line-height:1}
.tb-cols{display:flex;flex-direction:column}
.tb-col{display:grid;grid-template-columns:96px minmax(0,1fr);gap:24px;padding:24px 0;border-top:1px solid var(--hair)}
.tb-col__chip{width:96px;height:96px}
.tb-col__t{display:flex;flex-direction:column;gap:8px}
.tb-col__n{font-size:40px;line-height:44px}
.tb-vals{display:flex;flex-wrap:wrap;gap:8px 24px}
.tb-vals div{display:flex;gap:8px;align-items:baseline}
.tb-vals dt{font-size:12px;font-weight:600}
.tb-ramp{display:flex;margin-top:8px}
.tb-ramp li{flex:1}
.tb-ramp button{appearance:none;border:0;display:block;width:100%;height:24px;cursor:pointer;padding:0}
.tb-ramp .is-base button{height:32px;margin-top:-4px}
.tb-roles{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 24px;margin-top:16px}
.tb-roles li{display:grid;grid-template-columns:24px minmax(0,1fr);column-gap:12px;align-items:center}
.tb-roles__sw{width:24px;height:24px;grid-row:span 2;box-shadow:inset 0 0 0 1px var(--hair)}
.tb-roles__n{font-size:13px;line-height:18px;font-weight:600}
.tb-roles .tb-val{justify-self:start}

/* typography */
.tb-type{flex:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:end}
/* Aa as large as its column allows: the column is half the body less half the gap */
.tb-aa{font-size:min(300px,calc((50cqw - 12px) / ${aaK}));line-height:.8}
.tb-faces{display:flex;flex-direction:column;gap:20px}
.tb-face__n{font-size:32px;line-height:36px}
.tb-face__d{font-size:13px;line-height:18px}
.tb-chars{font-size:40px;line-height:48px;letter-spacing:0.02em;overflow-wrap:anywhere}
.tb-tk--tester .tb-tk__body{min-height:360px}
.tb-tester__out{font-size:min(var(--tester-size,72px),14cqw);line-height:.95;overflow-wrap:anywhere;margin-top:auto}
.tb-tk--tester .tb-tk__stub{gap:24px;justify-content:center}
.tb-field{display:flex;flex-direction:column;gap:8px}
.tb-field label{font-size:13px;line-height:18px;font-weight:600;display:flex;justify-content:space-between}
.tb-field input[type=text]{height:40px;padding:0 12px;border:1px solid currentColor;background:transparent;color:inherit;font:400 15px/1 var(--body);border-radius:0;width:100%}
.tb-field input[type=range]{width:100%;accent-color:${R.fieldInk}}
.tb-scale li{grid-template-columns:200px minmax(0,1fr);align-items:baseline}
.tb-scale__k{display:flex;flex-direction:column;gap:4px}
.tb-scale__s{container-type:inline-size;font-size:min(calc(var(--size)*1px),calc(var(--size)*0.16cqw))}
.tb-inuse{display:flex;flex-direction:column;gap:16px;max-width:65ch}
.tb-inuse__h{font-size:56px;line-height:56px}
.tb-inuse__p{font-size:17px;line-height:26px}

/* imagery */
.tb-tk--photo .tb-tk__body{padding:0}
.tb-ph-hero{flex:1;display:flex}
.tb-ph{display:block;width:100%;height:100%;object-fit:cover}
.ht-plate{position:relative;overflow:hidden;container-type:size;background:var(--table)}
.tb-ph-hero .ht-plate{aspect-ratio:16/9;height:auto}
.tb-shots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 24px}
.tb-shot--lead{grid-column:1/-1}
.tb-shot figure{display:flex;flex-direction:column;gap:12px}
.tb-shot .tb-ph{aspect-ratio:3/2;height:auto}
.tb-shot--lead .tb-ph{aspect-ratio:21/9}
.tb-shot figcaption{max-width:65ch;color:var(--q)}
.tb-shot figcaption .tb-dl{color:var(--t)}
.bk .photo-slot{display:block;border:1px dashed var(--q);background:transparent}

/* layout */
.tb-grid{flex:1;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,3fr);gap:40px;align-items:end}
.tb-grid__page{border:1px solid currentColor}
.tb-grid__cols{display:grid;height:100%}
.tb-grid__cols i{border-left:1px solid currentColor;border-right:1px solid currentColor}
.tb-grid__big{font-size:min(112px,12cqw);line-height:.85}
.tb-grid__w{font-size:15px;line-height:22px;font-weight:600}
.tb-meas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--hair)}
.tb-meas div{padding:16px 24px 0 0}
.tb-meas dt{font-size:13px;font-weight:600}
.tb-meas dd{font-size:56px;line-height:56px}
.tb-meas dd span{font:500 15px/22px var(--body)}
.tb-space{display:flex;align-items:flex-end;gap:16px;margin-top:24px;flex-wrap:wrap}
.tb-space li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.tb-space i{display:block;background:var(--t)}
.tb-radii{display:flex;gap:24px;margin-top:24px}
.tb-radii li{display:flex;flex-direction:column;gap:8px}
.tb-radii i{display:block;width:64px;height:64px;border:1px solid var(--t)}

/* applications */
/* each photograph fills its cell: the cell is a size container and its window of the scene covers it, centred, at the window's proportion (--r) */
.tb-apps{position:absolute;inset:0;display:grid;grid-template-columns:var(--apps-cols);gap:4px}
.tb-app{position:relative;min-width:0;overflow:hidden;container-type:size}
.tb-app__win{position:absolute;left:50%;top:50%;width:max(100cqw,calc(100cqh * var(--r)));height:max(100cqh,calc(100cqw / var(--r)));transform:translate(-50%,-50%)}
.tb-app__win img,.tb-app__win svg.pl{position:absolute;display:block;max-width:none}
.tb-app__win svg{position:absolute;left:0;top:0;width:100%;height:100%}
.tb-app--frame{display:flex;flex-direction:column;justify-content:flex-end;gap:4px;padding:24px;border:1px dashed currentColor}
.tb-pieces{display:flex;flex-direction:column}
.tb-piece{display:grid;grid-template-columns:272px minmax(0,1fr);gap:40px;padding:40px 0;border-top:1px solid var(--hair)}
.tb-piece__k .tb-s{color:var(--q)}
.tb-cards{display:flex;gap:24px;flex-wrap:wrap}
.tb-card{width:360px;aspect-ratio:90/55;padding:24px;display:flex;flex-direction:column;justify-content:space-between;font-size:13px;line-height:18px}
.tb-card--back{box-shadow:inset 0 0 0 1px var(--hair)}
.tb-card__lg{width:180px}
.tb-card__l,.tb-card__nm{font-weight:600}
.tb-posts{display:flex;gap:24px;flex-wrap:wrap}
.tb-post{width:240px;aspect-ratio:1;padding:20px;display:flex;flex-direction:column;justify-content:space-between}
.tb-post.is-night{box-shadow:inset 0 0 0 1px var(--hair)}
.tb-post p{font-size:32px;line-height:32px}
.tb-post__lg{width:96px}
.tb-email{display:flex;flex-direction:column;gap:4px;font-size:13px;line-height:18px;max-width:420px;padding-left:16px;border-left:2px solid var(--t)}
.tb-email__n{font-weight:600;font-size:15px}
.tb-email__l{margin-top:12px;width:168px}
.tb-device{max-width:400px}
.tb-screen{padding:24px;display:flex;flex-direction:column;gap:12px;background:var(--surface);color:var(--text)}
.tb-scr__top,.tb-scr__ft{display:flex;justify-content:space-between;align-items:center;font-size:13px}
.tb-scr__eta{font-size:40px;line-height:1}
.tb-scr__note{font-size:13px;line-height:18px}

/* downloads */
.tb-zip__n{font-size:56px;line-height:56px}
.tb-zip__d{font-size:15px;line-height:22px;margin-top:auto}
.tb-tk--zip .tb-tk__body{min-height:200px}
.tb-tk--zip{grid-template-columns:minmax(0,1fr) 272px}
.tb-tk--zip .tb-tk__stub{padding:32px 40px}
.tb-groups{display:flex;flex-direction:column}
.tb-group{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px;padding:32px 0;border-top:1px solid var(--hair)}
.tb-group__n{font-size:40px;line-height:44px;margin-bottom:8px}
.tb-group__k .tb-s{color:var(--q);max-width:40ch}
.tb-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:baseline;padding:8px 0;border-top:1px solid var(--hair)}
.tb-file:first-child{border-top:0}
.tb-file__n{font-size:13px;font-weight:600;overflow-wrap:anywhere}
.tb-file .tb-s{color:var(--q)}
.tb-icons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
.tb-icon{display:flex;gap:8px;align-items:center;font-size:12px;text-decoration:none;padding:8px 0}
@media (hover:hover){.tb-icon:hover span{text-decoration:underline}}

@media (max-width:840px){
.bk-top{height:56px;padding:0 16px;gap:8px;flex-wrap:wrap}
.bk-brand{width:96px;margin-right:auto}
.bk-menu{display:inline-flex;align-items:center}
.bk-mode button{padding:0 10px}
.bk-nav{display:none;order:9;flex-basis:100%;background:var(--g);border-top:1px solid var(--hair);margin:0 -16px;padding:8px 16px 16px}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}
.bk-nav a{padding:12px 0;font-size:15px}
.bk main{padding:24px 16px 0}
.tb-sec{padding-bottom:80px;scroll-margin-top:64px}
.tb-tk,.tb-tk--s,.tb-tk--zip{grid-template-columns:minmax(0,1fr)}
.tb-tk--open{min-height:0}
.tb-tk__body{padding:24px;min-height:300px}
.tb-tk--s .tb-tk__body,.tb-tk--zip .tb-tk__body{min-height:0}
.tb-tk__stub,.tb-tk--s .tb-tk__stub,.tb-tk--zip .tb-tk__stub{padding:32px 24px 24px;display:grid;grid-template-columns:1fr auto;gap:8px 16px}
.tb-serial{font-size:32px;line-height:32px}
.tb-bc{max-width:100%;height:auto}
.tb-tk__stub::before,.tb-tk--s .tb-tk__stub::before{left:28px;right:28px;top:-2px;bottom:auto;width:auto;height:4px;-webkit-mask:${hole(false)} repeat-x 0 0/10px 4px;mask:${hole(false)} repeat-x 0 0/10px 4px}
.tb-notch--a{left:-16px;top:-16px}.tb-notch--b{left:auto;right:-16px;top:-16px;bottom:auto}
.tb-stub__sec{margin:0;grid-column:1}
.tb-stub__top{grid-column:1/-1}
.tb-stub__no{grid-column:2;grid-row:2/4;padding:0;margin:0;text-align:right}
.tb-stub__bc{grid-column:1}
.tb-stub__act{grid-column:1/-1;margin:0}
.tb-fit--w{display:none}.tb-fit--n{display:block}
.tb-zone{grid-template-columns:minmax(0,1fr);row-gap:40px;padding-top:32px}
.tb-main,.tb-side,.tb-full{grid-column:1;padding:0}
.tb-pair,.tb-take{grid-template-columns:1fr;gap:32px}
.tb-lead{font-size:20px;line-height:28px}
.tb-order li,.tb-wtn li,.tb-rules li,.tb-scale li,.tb-group,.tb-piece{grid-template-columns:minmax(0,1fr);gap:8px}
.tb-order__k,.tb-lines li,.tb-col__n,.tb-group__n{font-size:32px;line-height:36px}
.tb-pair__r{font-size:min(32px,17cqw);line-height:36px}
.tb-set li{grid-template-columns:1fr;gap:4px}
.tb-strip{flex-direction:column;min-height:420px}
.tb-seg+.tb-seg::before{left:12px;right:12px;top:-2px;bottom:auto;width:auto;height:4px;-webkit-mask:${hole(false)} repeat-x 0 0/10px 4px;mask:${hole(false)} repeat-x 0 0/10px 4px}
.tb-seg__b{padding:16px 24px;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
.tb-seg__p{margin:0 0 0 auto;font-size:32px}
.tb-sheet,.tb-sheet--pairs{grid-template-columns:repeat(2,minmax(0,1fr))}
.tb-sheet--logo{grid-template-columns:1fr}
.tb-cell--w{grid-column:auto}
.tb-col{grid-template-columns:48px minmax(0,1fr);gap:16px}
.tb-col__chip{width:48px;height:48px}
.tb-roles{grid-template-columns:1fr 1fr}
.tb-type{grid-template-columns:1fr}
.tb-aa{font-size:min(120px,calc(100cqw / ${aaK}))}
.tb-chars{font-size:24px;line-height:32px}
.tb-scale__s{font-size:min(calc(var(--size)*1px),16vw);overflow-wrap:anywhere}
.tb-inuse__h{font-size:40px;line-height:40px}
.tb-shots{grid-template-columns:1fr}
.tb-shot--lead .tb-ph{aspect-ratio:3/2}
.tb-grid{grid-template-columns:1fr;gap:24px}
.tb-grid__big{font-size:56px}
.tb-meas{grid-template-columns:1fr 1fr;row-gap:16px}
.tb-meas dd{font-size:40px;line-height:44px}
.tb-tk--apps .tb-tk__body{min-height:0}
.tb-apps{position:static;grid-template-columns:minmax(0,1fr)}
.tb-app{aspect-ratio:var(--r)}
.tb-card{width:100%;max-width:360px}
.tb-post{width:calc(50% - 12px);padding:12px}
.tb-post p{font-size:20px;line-height:22px}
.tb-icons{grid-template-columns:1fr 1fr}
.tb-file{grid-template-columns:minmax(0,1fr) auto}
.tb-file .tb-s{grid-column:1}
.tb-zip__n{font-size:40px;line-height:44px}
.bk-live{left:16px;right:16px;bottom:16px}
}
@media (min-width:841px){.tb-tk--photo .tb-tk__body{min-height:468px}}
`;
}

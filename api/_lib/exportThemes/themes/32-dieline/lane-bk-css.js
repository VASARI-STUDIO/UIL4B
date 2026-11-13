// Theme 32, Dieline: the brand book stylesheet (lane bk). The sheet is the cutting mat (the UI's sunken tone), the net's unprinted board is
// the surface, and printed panels set their own fill and text pair inline (--f, --fi, --fq, --fl). Cut lines are CSS borders; folds and
// seals are inline SVG so their dash pattern is the theme's own (8/6, and 1.5/5 round). No hex is written here.
import { BOOK_SECTIONS } from '../../engine/book.js';
import { measure } from './geom.js';

const vars = (r) => `--sheet:${r.sunken};--board:${r.surface};--ink:${r.text};--soft:${r.textSoft};--quiet:${r.quiet};--quiet-sheet:${r.quietOnSunken};--hair:${r.divider};--edge:${r.border};--action:${r.action};--action-hover:${r.actionHover};--action-ink:${r.actionLabel};--focus:${r.focus};`;

export function bookCss(ctx) {
  const L = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, d = B.fonts.display, b = B.fonts.body, m = B.fonts.mono, W = ctx.weights;
  const rc = B.ui.radius.control;
  const lum = (h) => ctx.C.luminance(h);
  // the tuck flap is as wide as the longest section name needs at 15 px, so no name breaks inside a word (120 px at the least)
  const fwg = Math.max(120, Math.ceil(Math.max(...BOOK_SECTIONS.map((s) => measure(ctx, 'chrome', 500, s.title, 15))) * 1.04) + 40);
  // die lines on the light board: quiet, or the mid ink on a pure white board where a 1 px quiet dash vanishes
  const dieL = lum(L.surface) > 0.97 ? L.textSoft : L.quiet;
  return `:root,.bk--board{${vars(L)}--die:${dieL};--chrome:'Funnel Sans',sans-serif;--val:'Spline Sans Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;--mono:'${m ? m.family : 'Spline Sans Mono'}',monospace;--nw:min(960px,calc(100% - 288px));--fw-g:${fwg}px}
[data-theme="dark"]{${vars(D)}--die:${D.quiet}}
body{background:var(--sheet);color:var(--ink)}
.bk{background:var(--sheet);color:var(--ink);font:400 15px/1.55 var(--body);-webkit-font-smoothing:antialiased;min-height:100vh}
.bk :where(h1,h2,h3,h4,p,ul,ol,dl,dd,figure){margin:0;padding:0}
.bk :where(ul,ol){list-style:none}
.bk :where(a){color:inherit}
.bk .disp{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;letter-spacing:0}
.bk .m{font-family:var(--val);font-weight:400;font-size:12px}
.bk :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.bk .dl-pn--print :focus-visible,.bk .dl-cp :focus-visible,.bk .dl-cell :focus-visible{outline-color:var(--fi)}
.dl-for-dark{display:none}[data-theme="dark"] .dl-for-dark{display:inline}[data-theme="dark"] .dl-for-light{display:none}
.bk-skip{position:absolute;left:16px;top:-80px;z-index:30;background:var(--ink);color:var(--board);padding:12px 16px;border-radius:${rc}px;font:500 13px/1 var(--chrome);text-decoration:none}
.bk-skip:focus{top:16px}
/* the slug line: brand, sections and the preview switch, on the sheet */
.bk-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:24px;padding:12px 32px;background:var(--sheet);border-bottom:1px solid var(--hair)}
.bk-brand{display:block;flex:none;text-decoration:none;width:132px}
.bk-brand svg{display:block;width:132px;height:auto}
.bk-name{font:600 18px/1.2 var(--body)}
.bk-for-dark{display:none}[data-theme="dark"] .bk-for-dark{display:block}[data-theme="dark"] .bk-for-light{display:none}
.bk-menu{display:none}
.bk-nav{flex:1;min-width:0}
.bk-nav ol{display:flex;flex-wrap:wrap;gap:4px 16px;list-style:none;margin:0;padding:0}
.bk-nav a{display:flex;gap:6px;align-items:baseline;padding:8px 0;font:500 13px/1.2 var(--chrome);color:var(--ink);text-decoration:none;border-bottom:1.5px solid transparent;transition:border-color 120ms ease-out}
.bk-nav .bk-n{font-variant-numeric:tabular-nums;color:var(--quiet-sheet)}
.bk-nav a[aria-current]{border-bottom-color:var(--ink)}
@media (hover:hover){.bk-nav a:hover{border-bottom-color:var(--edge)}}
.bk-mode{display:inline-flex;flex:none;border:1.5px solid var(--ink);border-radius:${rc}px;overflow:hidden}
.bk-mode button{appearance:none;border:0;background:transparent;color:var(--ink);font:500 13px/1 var(--chrome);height:36px;padding:0 14px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.bk-mode button[aria-pressed="true"]{background:var(--ink);color:var(--sheet)}
.bk-mode button:focus-visible{outline-offset:-4px}
.bk main{display:block;padding:64px 0 0;overflow-x:clip}
.bk main:focus{outline:none}
.bk-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px 16px;width:var(--nw);margin:48px 0 0 calc((100% - var(--nw) - var(--fw-g)) / 2);padding:0 0 48px;font:400 13px/1.4 var(--chrome);color:var(--quiet-sheet)}
.bk-live{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:40;padding:12px 20px;border-radius:${rc}px;background:var(--ink);color:var(--board);font:500 13px/1.3 var(--chrome);opacity:0;pointer-events:none;transition:opacity 150ms ease-out;max-width:calc(100vw - 32px)}
.bk-live.is-on{opacity:1}.bk-live:empty{display:none}

/* ---- the net ---- */
.dl-sec{position:relative;width:calc(var(--nw) + var(--fw-g));padding-right:var(--fw-g);margin-left:calc((100% - var(--nw) - var(--fw-g)) / 2);scroll-margin-top:72px}
.dl-pn{--f:var(--board);--fi:var(--ink);--fq:var(--quiet);--fl:var(--die);position:relative;isolation:isolate;background:var(--f);color:var(--fi);border-left:1.5px solid var(--fl);border-right:1.5px solid var(--fl);padding:64px 64px 72px}
.dl-in{position:relative;z-index:1;container-type:inline-size;display:flex;flex-direction:column;gap:24px}
.dl-ln{position:absolute;overflow:visible;pointer-events:none;z-index:0;color:var(--fl)}
.dl-ln line,.dl-crimp line{stroke:currentColor;stroke-width:1.5;fill:none}
.dl-fold line,.dl-box.dl-fold rect{stroke-dasharray:8 6}
.dl-seal line{stroke-dasharray:1.5 5;stroke-linecap:round}
.dl-ln--h{left:0;top:0;width:100%;height:2px}
.dl-ln--v{left:0;top:0;width:2px;height:100%}
.dl-pn > .dl-top{top:0}
.dl-crimp{position:absolute;left:0;top:44px;width:100%;height:16px;color:var(--fl);pointer-events:none}
.dl-crimp line{stroke-width:1}
.dl-sealt{top:44px}
.dl-valve{position:absolute;right:48px;top:96px;color:var(--fl)}
.dl-valve circle{fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:1.5 5;stroke-linecap:round}
.dl-notch{position:absolute;top:56px;z-index:2}.dl-notch--l{left:-1.5px}.dl-notch--r{right:-1.5px}
.dl-notch__f{fill:var(--sheet)}.dl-notch__l{fill:none;stroke:var(--fl);stroke-width:1.5}
.dl-pn--front.is-bag{border-top:1.5px solid var(--fl)}
.dl-pn--front.is-bag > .dl-top{display:none}
/* the colour bar at the head of the sheet, and the top closures */
.dl-bar{display:flex;align-items:center;gap:12px;margin:0 0 40px;color:var(--die)}
.dl-bar__s{display:flex;flex:1;height:12px}.dl-bar__s i{display:block;height:100%}.dl-bar__s i.is-ground{box-shadow:inset 0 0 0 1px var(--die)}
.dl-reg{flex:none}.dl-reg circle,.dl-reg line{fill:none;stroke:currentColor;stroke-width:1}
.dl-tuck{position:relative;height:88px;margin:0 12px;background:var(--board);border:1.5px solid var(--die)}
.dl-tuck--top{border-bottom:0;border-radius:32px 32px 0 0}
.dl-tuck--bot{border-top:0;border-radius:0 0 32px 32px;--fl:var(--die)}
.dl-sflap{position:relative;height:104px;background:var(--f);border:1.5px solid var(--fl);border-bottom:0;border-radius:48px 48px 0 0}
.dl-peel{position:absolute;left:32px;right:32px;top:24px;height:24px;color:var(--fl)}
.dl-peel svg{display:block;width:100%;height:100%;overflow:visible}.dl-peel rect{width:calc(100% - 1.5px);height:calc(100% - 1.5px);fill:none;stroke:currentColor;stroke-width:1.5;stroke-dasharray:1.5 5;stroke-linecap:round}
.dl-pn--last{border-bottom:1.5px solid var(--fl)}
.dl-pn--last.is-box{border-bottom:0}
.dl-gusset{top:auto;bottom:40px}
.dl-weld{top:auto;bottom:16px}.dl-weldc .dl-crimp{top:auto;bottom:0}
/* flaps: the tuck flap on the right with the section's number and name; dust and glue flaps on the left */
.dl-flap{position:absolute;z-index:2;left:100%;margin-left:-1.5px;top:48px;width:var(--fw-g);min-height:200px;padding:20px 16px 24px 20px;background:var(--board);color:var(--ink);border:1.5px solid var(--die);border-left:0;border-radius:0 32px 32px 0;display:flex;flex-direction:column;gap:8px}
.dl-hinge{position:absolute;left:0;top:-1.5px;bottom:-1.5px;width:1.5px;background:var(--f);color:var(--fl)}
.dl-hinge .dl-ln{color:var(--fl)}
.dl-flap__n{font:500 13px/1 var(--chrome);font-variant-numeric:tabular-nums;color:var(--quiet)}
.dl-flap__t{font:500 15px/1.25 var(--chrome);color:var(--ink);overflow-wrap:anywhere}
.dl-dust{position:absolute;right:100%;margin-right:-1.5px;top:96px;width:56px;height:168px;z-index:2}
.dl-glue{position:absolute;right:100%;margin-right:-1.5px;top:0;width:32px;height:360px;z-index:2}
.dl-dust svg,.dl-glue svg{display:block}
.dl-dust__f{fill:var(--board)}.dl-cutp{fill:none;stroke:var(--die);stroke-width:1.5}
.dl-hinge--l{left:auto;right:0;top:0;bottom:0}

/* ---- type ---- */
.dl-fit{font-size:var(--fw);line-height:0.95;text-wrap:balance}
@container (max-width:520px){.dl-fit{font-size:var(--fn)}}
.dl-lead{font:400 22px/1.4 var(--body);max-width:34em;text-wrap:pretty}
.dl-p{font:400 15px/1.55 var(--body);color:var(--fi);max-width:40em;text-wrap:pretty}
.dl-q{font:400 13px/1.5 var(--body);color:var(--fq)}
.dl-h3{font:500 15px/1.3 var(--chrome);color:var(--fi);margin-top:24px}
.dl-do{font-family:var(--chrome);font-weight:500}
.dl-narrow{display:flex;flex-direction:column;gap:12px;max-width:40em}
.dl-two{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:24px}
.dl-two > div{display:flex;flex-direction:column;gap:12px;min-width:0}
.dl-two .dl-h3{margin-top:0}

/* overview */
.dl-pn--front{padding-top:160px;min-height:780px}
.dl-pn--front .dl-in{min-height:560px}
.dl-cover{display:flex;flex-direction:column;gap:24px;flex:1}
.dl-place{font:400 14px/20px var(--body);color:var(--fq)}
.dl-cover__lg{margin-bottom:auto}
.dl-logo{display:block;width:min(var(--lw),100%)}
.dl-logo > svg{display:block;width:100%;height:auto}
.dl-logo > .logo-slot{width:100%!important;height:auto!important;aspect-ratio:var(--ar)}
.dl-hero{color:var(--fi);max-width:15ch;margin-top:96px}
.dl-cover__v{display:flex;gap:24px;flex-wrap:wrap;font:400 15px/1.5 var(--body);color:var(--fq)}
.dl-cover__v span:first-child{color:var(--fi)}
.dl-pair{display:grid;grid-template-columns:1fr 1fr;gap:48px}
.dl-pair dt{margin:0 0 8px}
.dl-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
.dl-cols li{position:relative;padding:8px 24px 0;display:flex;flex-direction:column;gap:8px}
.dl-cols li:first-child{padding-left:0}.dl-cols li:first-child .dl-colfold{display:none}
.dl-trait{font-size:${wc(ctx)}px;line-height:1}
/* voice */
.dl-pn--back{padding-top:96px;padding-bottom:96px}
.dl-say{display:flex;flex-direction:column;gap:40px}
.dl-say__x{color:var(--fi);max-width:18ch}
.dl-say__k{margin-top:8px;font:500 14px/1.4 var(--chrome);color:var(--fq)}
.dl-wtn li{display:grid;grid-template-columns:1.2fr 1fr 1.2fr;gap:24px;padding:16px 0;border-top:1px solid var(--hair)}
.dl-wtn li:last-child{border-bottom:1px solid var(--hair)}
.dl-wtn__w{font:500 17px/1.4 var(--body)}
.dl-wtn__n{font:400 15px/1.5 var(--body);color:var(--quiet)}.dl-wtn__n s{text-decoration-thickness:1px}
.dl-wtn__b{font:400 15px/1.5 var(--body);color:var(--quiet)}
.dl-takes{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:64px;margin-top:24px}
.dl-takefold{left:50%}
.dl-take{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.dl-take .dl-h3{margin:0}
.dl-take__t{font:400 17px/1.5 var(--body)}
.dl-lines{display:flex;flex-direction:column;gap:8px}.dl-lines li{font-size:28px;line-height:1.05}
/* buttons and links */
.bk .dl-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 16px;border:1.5px solid currentColor;border-radius:${rc}px;background:transparent;color:var(--fi);font:500 13px/1 var(--chrome);white-space:nowrap;text-decoration:none;cursor:pointer;transition:background-color 150ms ease-out,color 150ms ease-out}
.bk .dl-btn.is-copied{background:var(--fi);color:var(--f)}
.bk .dl-btn--prime{height:48px;padding:0 24px;border-color:var(--action);background:var(--action);color:var(--action-ink);font-size:15px}
@media (hover:hover){.bk .dl-btn:hover{text-decoration:underline;text-underline-offset:3px}.bk .dl-btn--prime:hover{background:var(--action-hover);border-color:var(--action-hover)}}
.bk .dl-btn:active{transform:scale(0.97)}
.bk .dl-val{appearance:none;border:0;background:transparent;padding:2px 0;color:inherit;font:400 12px/1.4 var(--val);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;cursor:pointer;text-align:left;overflow-wrap:anywhere}
.bk .dl-val.is-copied{text-decoration-style:double}
.dl-dl{font:500 13px/1.4 var(--chrome);text-decoration:underline;text-underline-offset:3px;color:var(--fi)}
.dl-dls{display:flex;flex-wrap:wrap;gap:4px 12px}
/* logo */
.dl-pn--logo{padding:120px 64px 120px}
.dl-logohero{padding:32px 0 48px}
.dl-strip{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));border:1.5px solid var(--die);overflow:hidden}
.dl-cell,.dl-pc,.dl-shot{position:relative;display:flex;flex-direction:column;gap:8px;padding:24px 20px;background:var(--f);color:var(--fi);min-width:0}
.dl-cell{--fl:var(--die);min-height:220px}
.dl-cellv{left:-1.5px}.dl-cellh{top:-1.5px}
.dl-cell__lg{flex:1;display:flex;align-items:center;min-height:96px}
.dl-cell__k{font:500 14px/1.3 var(--chrome)}
.dl-cell__w{font:400 13px/1.5 var(--body);color:var(--fq)}
.dl-clear__b{position:relative;display:inline-block;max-width:100%}
.dl-box{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;color:var(--die)}
.dl-box rect{width:calc(100% - 1.5px);height:calc(100% - 1.5px);fill:none;stroke:currentColor;stroke-width:1.5}
.dl-min{padding:16px 0}
.dl-never{display:grid;grid-template-columns:1fr 1fr;gap:8px 48px}.dl-never li{font:400 15px/1.5 var(--body)}
/* colour */
.dl-pn--net{padding:0}
.dl-pn--net .dl-in{gap:0}
.dl-net{display:flex;min-height:560px}
.dl-cp{position:relative;flex:0 0 var(--w);min-width:0;background:var(--f);color:var(--fi);padding:96px 14px 24px;display:flex;flex-direction:column;gap:4px}
.dl-cp .dl-crimp,.dl-cp .dl-sealt{color:var(--fl)}
.dl-cp .dl-valve{right:16px;top:auto;bottom:120px}
.dl-cp:first-child{padding-left:20px}
.dl-cpv{left:0}.dl-cph{display:none}
.dl-cp__n{font:500 14px/1.3 var(--body)}
.dl-cp__s{margin-top:auto;font-size:44px;line-height:1}
.dl-cols-list{display:flex;flex-direction:column}
.dl-col{display:grid;grid-template-columns:120px minmax(0,1fr);gap:32px;padding:24px 0;border-top:1px solid var(--hair)}
.dl-col__sw{width:120px;height:120px;box-shadow:inset 0 0 0 1px var(--hair)}
.dl-cols-list--tones .dl-col{grid-template-columns:64px minmax(0,1fr)}.dl-cols-list--tones .dl-col__sw{width:64px;height:64px}
.dl-col__t{display:flex;flex-direction:column;gap:8px}
.dl-col__n{font-size:28px;line-height:1.05}
.dl-vals{display:flex;flex-wrap:wrap;gap:4px 24px}.dl-vals div{display:flex;gap:8px;align-items:baseline}.dl-vals dt{font:500 12px/1.4 var(--chrome);color:var(--quiet)}
.dl-ramp{display:flex;margin-top:4px}.dl-ramp li{flex:1;max-width:40px}
.dl-ramp__b{display:block;width:100%;height:24px;border:0;padding:0;cursor:pointer}
.dl-ramp li.is-base .dl-ramp__b{box-shadow:inset 0 0 0 2px var(--ink)}
.dl-strip--pairs{grid-template-columns:repeat(auto-fill,minmax(176px,1fr))}
.dl-pc{padding:0;gap:0}
.dl-pc__s{display:flex;align-items:flex-end;min-height:104px;padding:16px}
.dl-pc__r{font-size:32px;line-height:1}
.dl-pc__u{padding:12px 16px 16px;font:400 13px/1.45 var(--body);color:var(--quiet)}
.dl-roles{display:flex;flex-direction:column;gap:6px}
.dl-roles li{display:grid;grid-template-columns:16px 1fr auto;gap:12px;align-items:center}
.dl-roles__sw{width:16px;height:16px;box-shadow:inset 0 0 0 1px var(--edge)}
.dl-roles__n{font:400 14px/1.4 var(--body)}
/* typography */
.dl-pn--side{padding-top:96px;padding-bottom:96px}
.dl-faces{display:flex;flex-direction:column;gap:40px}
.dl-face{position:relative;display:flex;flex-direction:column;gap:12px}
.dl-facefold{top:-20px;color:var(--fl)}
.dl-face__big{color:var(--fi)}
.dl-face__mid{font-family:var(--body);line-height:1.1}
.dl-face__mono{font-family:var(--mono);font-size:22px;line-height:1.2}
.dl-face__d{font:400 14px/1.5 var(--body);color:var(--fq);max-width:40em}.dl-face__k{color:var(--fi);font-weight:${W.medium || 500}}
.dl-chars{font-size:${Math.min(40, wc(ctx) + 8)}px;line-height:1.15;overflow-wrap:anywhere}
.dl-tester{position:relative;display:flex;flex-direction:column;gap:24px;padding:32px 0 0;--tester-size:56px}
.dl-testseal{color:var(--die)}
.dl-tester__out{font-size:var(--tester-size);line-height:1;overflow-wrap:anywhere;min-height:1em}
.dl-tester__c{display:grid;grid-template-columns:2fr 1fr;gap:24px}
.dl-field{display:flex;flex-direction:column;gap:6px}
.dl-field label{display:flex;justify-content:space-between;font:500 13px/1.3 var(--chrome)}
.dl-field input[type=text]{height:44px;padding:0 12px;border:1.5px solid var(--edge);border-radius:${rc}px;background:var(--board);color:var(--ink);font:400 15px/1 var(--body)}
.dl-field input[type=range]{height:44px;accent-color:var(--ink)}
.dl-scale li{display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;padding:20px 0;border-top:1px solid var(--hair)}
.dl-scale__t{font:500 14px/1.3 var(--chrome)}
.dl-scale__s{font-family:var(--body);max-width:30em;overflow-wrap:anywhere}
.dl-rules{display:grid;grid-template-columns:1fr 1fr;gap:16px 48px}.dl-rules li{display:flex;flex-direction:column;gap:4px;font:400 15px/1.5 var(--body)}.dl-rules .dl-q{font-size:15px;color:var(--quiet)}
/* imagery */
.dl-pn--photo{padding:0}
.dl-pn--photo .dl-in{display:block}
.dl-window{display:block;aspect-ratio:16/10}
.bk .dl-window .dl-photo{display:block;width:100%;height:100%;object-fit:cover}
.bk .photo-slot{display:flex;align-items:flex-end;box-sizing:border-box;width:100%;height:100%;padding:24px;background:var(--sheet);color:var(--quiet-sheet);font:400 14px/1.5 var(--body)}
.bk .dl-window .photo-slot{display:flex;padding:48px 64px;font:400 22px/1.4 var(--body)}
.dl-window:has(.photo-slot){aspect-ratio:2/1}
.dl-window .photo-slot span{max-width:36em}
.dl-rows div{display:grid;grid-template-columns:120px 1fr;gap:24px;padding:12px 0;border-top:1px solid var(--hair)}
.dl-rows dt{font:500 14px/1.5 var(--chrome)}.dl-rows dd{font:400 15px/1.55 var(--body)}
.dl-strip--shots{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.dl-shot{padding:16px}
.dl-shot figure{display:flex;flex-direction:column;gap:12px}
.dl-shot .dl-photo,.dl-shot .photo-slot{aspect-ratio:4/3;width:100%;height:auto;object-fit:cover}
.dl-shot .photo-slot{background:var(--sheet)}
.dl-window--brief{aspect-ratio:auto}
.dl-brief{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;aspect-ratio:4/3;padding:20px;background:var(--sheet);color:var(--ink);outline:1.5px dashed var(--die);outline-offset:-10px}
.dl-brief__k{font:500 12px/1.3 var(--chrome);letter-spacing:.04em;text-transform:uppercase;color:var(--soft)}
.dl-brief__t{font-size:26px;line-height:1.05;margin-top:4px}
.dl-brief__p{font:400 15px/1.5 var(--body);max-width:34em}
.dl-brief--lead{aspect-ratio:16/10;padding:48px 56px;justify-content:flex-end;gap:12px}
.dl-brief--lead .dl-brief__t{font-size:44px}
.dl-brief--lead .dl-brief__p{font-size:18px;max-width:22em}
.dl-brief__g{position:absolute;top:10px;right:10px;bottom:10px;width:31%;display:flex;align-items:flex-end;padding:14px;box-sizing:border-box;border-left:1.5px dashed var(--die);font:400 13px/1.4 var(--chrome);color:var(--soft)}
.dl-strip--shots:has(.dl-brief){grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
/* layout */
.dl-pn--layout{padding-top:96px}
.dl-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:48px;align-items:end}
.dl-grid__page{position:relative;background:var(--board);--fl:var(--die)}
.dl-grid__cols{display:grid;height:100%}.dl-grid__cols i{display:block;background:var(--sheet)}
.dl-grid__big{font-size:160px;line-height:0.85}
.dl-meas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1.5px solid var(--die);border-bottom:1.5px solid var(--die);margin-top:24px}
.dl-meas div{position:relative;padding:16px 20px}.dl-meas div:first-child .dl-cellv{display:none}
.dl-meas dt{font:500 13px/1.3 var(--chrome);color:var(--quiet)}.dl-meas dd .disp{font-size:40px;line-height:1.1}
.dl-space{display:flex;align-items:flex-end;flex-wrap:wrap;gap:16px}.dl-space li{display:flex;flex-direction:column;align-items:center;gap:6px}.dl-space i{display:block;background:var(--ink)}
.dl-radii{display:flex;flex-direction:column;gap:12px}.dl-radii li{display:flex;align-items:center;gap:16px}.dl-radii i{flex:none;width:48px;height:48px;border:1.5px solid var(--ink);border-right:0;border-bottom:0}
/* applications */
.dl-pn--apps{padding-top:96px;padding-bottom:96px}
.dl-apps{display:flex;flex-direction:column;gap:48px}
.dl-app{display:flex;flex-direction:column;gap:12px}.dl-app .dl-h3{margin:0}
.dl-shotp{display:flex;flex-direction:column;gap:12px}
.dl-shotp__w{position:relative;isolation:isolate;aspect-ratio:var(--ar);max-width:var(--mw);overflow:hidden;background:var(--sheet)}
.dl-shotp__w::after{content:'';position:absolute;inset:0;z-index:1;box-shadow:inset 0 0 0 1px oklch(0 0 0 / .1);pointer-events:none}
.dl-shotp__w img{position:absolute;display:block;max-width:none;width:var(--cw);height:auto;left:var(--cl);top:var(--ct)}
.dl-shotp figcaption{font:400 14px/1.5 var(--body);color:var(--fi);max-width:40em}
.dl-cards{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:12px;max-width:720px}
.dl-card{aspect-ratio:90/55;padding:20px;display:flex;flex-direction:column;justify-content:space-between;outline:1.5px solid var(--fl);font:400 13px/1.45 var(--body);min-width:0}
.dl-card__l{font:500 14px/1.3 var(--body)}
.dl-card__nm{font:500 15px/1.3 var(--body)}
.dl-card--back{justify-content:flex-start;gap:4px}.dl-card__ct{margin-top:auto}
.dl-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:12px}
.dl-post{aspect-ratio:1;padding:20px;display:flex;flex-direction:column;justify-content:space-between;outline:1.5px solid var(--fl);min-width:0;container-type:inline-size}
.dl-post p{line-height:1.02}
.dl-email{display:flex;flex-direction:column;gap:4px;padding:24px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);font:400 14px/1.5 var(--body)}
.dl-email__n{font-weight:${W.medium || 500}}.dl-email__l{margin-top:12px}
.dl-device{max-width:360px;border:1.5px solid var(--edge);border-radius:20px;padding:12px;background:var(--board)}
.dl-screen{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:12px}
.dl-scr__top,.dl-scr__ft{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px}
.dl-scr__eta{font-size:28px;line-height:1.05}.dl-scr__note{font-size:13px;line-height:1.45}
/* downloads */
.dl-pn--last{padding-bottom:96px}
.dl-zip{display:flex;flex-direction:column;gap:16px;padding-bottom:24px}
.dl-zip__n{color:var(--fi)}
.dl-zip__a{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.dl-groups{display:flex;flex-direction:column}
.dl-group{position:relative;display:grid;grid-template-columns:240px minmax(0,1fr);gap:32px;padding:24px 0}
.dl-groupfold{color:var(--die)}
.dl-group__k{display:flex;flex-direction:column;gap:6px}.dl-group__n{font-size:28px;line-height:1.05}
.dl-files{display:flex;flex-direction:column}
.dl-file{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:16px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--hair);font:400 14px/1.4 var(--body)}
.dl-file__n{overflow-wrap:anywhere}
.dl-icons{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px 16px;margin-bottom:8px}
.dl-icon{display:flex;align-items:center;gap:8px;padding:6px 0;text-decoration:none;font:400 13px/1.3 var(--body)}
@media (hover:hover){.dl-icon:hover span,.dl-dl:hover{text-decoration-thickness:2px}}

@media (max-width:1279px){
.bk-top{flex-wrap:wrap;padding:10px 16px;gap:12px}
.bk-menu{display:inline-flex;margin-left:auto;appearance:none;align-items:center;height:44px;padding:0 14px;border:1.5px solid var(--ink);border-radius:${rc}px;background:transparent;color:var(--ink);font:500 13px/1 var(--chrome);cursor:pointer}
.bk-menu[aria-expanded="true"]{background:var(--ink);color:var(--sheet)}
.bk-nav{display:none;order:3;flex-basis:100%}
.bk-top[data-open="true"] .bk-nav{display:block}
.bk-nav ol{flex-direction:column;gap:0}
.bk-nav a{padding:12px 0;font-size:15px}
.bk-mode button{height:44px}
}
@media (max-width:840px){
:root,.bk--board{--nw:calc(100% - 80px);--fw-g:56px}
.bk-brand,.bk-brand svg{width:104px}
.bk main{padding-top:32px}
.dl-sec{margin-left:16px}
.bk-foot{margin-left:16px}
.dl-pn{padding:40px 20px 48px}
.dl-flap{width:56px;min-height:220px;padding:16px 8px 16px 12px;border-radius:0 20px 20px 0;top:32px}
.dl-flap__t{writing-mode:vertical-rl;font-size:14px}
.dl-dust,.dl-glue{display:none}
.dl-bar{margin-bottom:24px;gap:8px}
.dl-tuck{height:56px}.dl-tuck--top{border-radius:20px 20px 0 0}.dl-tuck--bot{border-radius:0 0 20px 20px}
.dl-sflap{height:80px;border-radius:32px 32px 0 0}.dl-peel{left:20px;right:20px;top:20px;height:20px}
.dl-pn--front{padding-top:136px;min-height:620px}
.dl-pn--front .dl-in{min-height:440px}
.dl-valve{right:16px}
.dl-hero{margin-top:48px}
.dl-lead{font-size:18px}
.dl-pair,.dl-two,.dl-takes,.dl-never,.dl-rules,.dl-grid,.dl-tester__c{grid-template-columns:1fr;gap:24px}
.dl-takefold{display:none}
.dl-cols{grid-template-columns:1fr;gap:24px}.dl-cols li{padding:0}.dl-cols .dl-colfold{display:none}
.dl-wtn li{grid-template-columns:1fr;gap:4px}
.dl-pn--logo{padding:64px 20px}
.dl-strip,.dl-strip--pairs,.dl-strip--shots{grid-template-columns:1fr}
.dl-net{flex-direction:column;min-height:0}
.dl-cp{flex:none;min-height:var(--nh);padding:20px 16px 16px;flex-direction:row;flex-wrap:wrap;align-items:flex-start;gap:4px 12px}
.dl-cp:first-child{padding-left:16px}
.dl-cp__n{flex-basis:100%}
.dl-cp__s{margin:0 0 0 auto;font-size:32px}
.dl-cpv{display:none}.dl-cph{display:block}
.dl-cp .dl-crimp,.dl-cp .dl-sealt{display:none}
.dl-cp .dl-valve{display:none}
.dl-col{grid-template-columns:56px minmax(0,1fr);gap:16px}.dl-col__sw{width:56px;height:56px}
.dl-scale li{grid-template-columns:1fr;gap:8px}
.dl-window{aspect-ratio:4/5}
.bk .dl-window .photo-slot{padding:24px 20px;font-size:17px}
.dl-window:has(.photo-slot){aspect-ratio:4/3}
.dl-shotp__w{aspect-ratio:4/5;max-width:none}.dl-shotp__w img{width:var(--cnw);left:var(--cnl);top:var(--cnt)}
.dl-brief--lead{aspect-ratio:auto;padding:28px 20px;min-height:360px}
.dl-brief--lead .dl-brief__t{font-size:32px}
.dl-brief__g{position:static;width:auto;padding:12px 0 0;border-left:0;border-top:1.5px dashed var(--die);margin-top:8px}
.dl-grid__big{font-size:96px}
.dl-meas{grid-template-columns:1fr 1fr}.dl-meas div:nth-child(3) .dl-cellv{display:none}
.dl-cards{grid-template-columns:1fr}
/* the device frame is narrower than a phone here: drop the bezel so the rows' titles keep room beside the status chips */
.dl-device{padding:0;border:0;background:none}.dl-screen{padding:12px;border:1.5px solid var(--edge);border-radius:16px}
.dl-posts{grid-template-columns:1fr}.dl-post{aspect-ratio:auto;min-height:200px}
.dl-group{grid-template-columns:1fr;gap:12px}
.dl-file{grid-template-columns:minmax(0,1fr) auto}.dl-file .m{grid-column:1}.dl-file:has(.dl-dls){grid-template-columns:1fr;gap:6px}
}
${ctx.placeholders ? `.dl-screen .ui-chip{white-space:normal}.dl-screen .ui-row__end{flex-shrink:1;min-width:0;max-width:45%;text-align:right}` : ''}
@media (prefers-reduced-motion:reduce){.bk *{transition:none!important}.bk .dl-btn:active{transform:none}}`;
}
// the trait and character-set size: one step under the display line, scaled down for a wide display face
function wc(ctx) { return ctx.brand.fonts.display.family && (ctx.brand.fonts.display.stretch || 100) > 100 ? 28 : 32; }

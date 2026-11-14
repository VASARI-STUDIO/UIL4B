// Theme 22, Ticket: lane ht, the stylesheet both web sites share. The book's ticket (lane-bk-css.js, imported read-only) is the device; this file
// adds the box office bar, the running order, the stub's way on and each page's body. Radii 0, no shadows; elevation is the value step to the ticket.
import { bookCss } from './lane-bk-css.js';

export function htCss(ctx) {
  const W = ctx.weights;
  return `${bookCss(ctx)}
.ht{min-height:100vh}
.sx-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ht-bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:24px;height:64px;padding:0 32px;background:var(--g);border-bottom:1px solid var(--hair)}
.ht-brand{display:block;width:132px;margin-right:auto}
.ht-brand svg{display:block;width:100%;height:auto}
.ht-parts{display:flex;gap:4px}
.ht-parts a{padding:8px;font-size:13px;line-height:18px;font-weight:500;text-decoration:none;border-bottom:2px solid transparent}
.ht-parts a[aria-current]{font-weight:600;border-bottom-color:var(--t)}
.ht-mode{display:inline-flex;border:1px solid var(--t)}
.ht-mode button{appearance:none;border:0;background:transparent;color:var(--t);font:500 13px/1 var(--body);height:34px;padding:0 12px;cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.ht-mode button[aria-pressed="true"]{background:var(--t);color:var(--g)}
.ht :focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.ht-body{display:grid;grid-template-columns:256px minmax(0,1fr)}
.ht-rail{align-self:stretch;padding:32px 24px 48px 32px;border-right:1px solid var(--hair)}
.ht-disc{display:none}
.ht-first{display:flex;flex-direction:column;margin-bottom:24px}
.ht-set{margin-bottom:24px}
.ht-set__h{display:flex;gap:8px;font:600 13px/18px var(--body);padding-bottom:8px;border-bottom:1px solid var(--hair);margin-bottom:4px}
.ht-order a{display:grid;grid-template-columns:32px minmax(0,1fr);gap:4px;padding:6px 8px;margin:0 -8px;font-size:13px;line-height:18px;text-decoration:none}
.ht-order a[aria-current]{background:var(--f);color:var(--fi);font-weight:600}
@media (hover:hover){.ht-order a:not([aria-current]):hover{text-decoration:underline;text-underline-offset:3px}.ht-parts a:hover{border-bottom-color:var(--q)}}
.num{font-variant-numeric:tabular-nums}
.bk.ht .ht-main{max-width:1184px;margin:0;padding:32px 32px 0;min-width:0}
.ht-main:focus{outline:none}
/* a short page keeps its pager and footer at the foot of the screen, not under a hole */
@media (min-width:841px){.bk.ht .ht-main{display:flex;flex-direction:column;min-height:calc(100vh - 56px)}.ht-main>.ht-pager{margin-top:auto}.ht-main>:has(+ .ht-pager){margin-bottom:96px}}
/* the stub's small print, one step up */
.ht .tb-tk__stub .tb-s,.ht .tb-tk__stub .tb-code{font-size:13px;line-height:18px}
.ht-h2{font:600 20px/28px var(--body);margin-bottom:16px}
.ht-k{font-size:15px;line-height:22px;font-weight:600}
.ht-gap{margin-top:16px}
.ht-sec{margin-bottom:4px}
.ht-next{display:flex;flex-direction:column;gap:2px;margin-top:16px;padding-top:12px;border-top:1px solid currentColor;text-decoration:none}
.ht-next__t{font-size:15px;line-height:22px;font-weight:600}
@media (hover:hover){.ht-next:hover .ht-next__t{text-decoration:underline;text-underline-offset:3px}}
.ht-pager{display:flex;justify-content:space-between;gap:24px;margin-top:96px;padding:24px 0;border-top:1px solid var(--hair)}
.ht-pager a{display:flex;flex-direction:column;gap:4px;text-decoration:none;max-width:45%}
.ht-pager a[rel="next"]{text-align:right;margin-left:auto}
.ht-pager b{font-size:17px;line-height:24px;font-weight:600}
/* lists on the bar top */
.ht-cols-l li{display:grid;grid-template-columns:72px minmax(0,1fr) 160px;gap:24px;padding:20px 0;border-top:1px solid var(--hair);align-items:start}
.ht-cols-l--4 li{grid-template-columns:minmax(0,3fr) minmax(0,5fr) minmax(0,3fr) minmax(0,2fr)}
.ht-v{display:flex;flex-direction:column;gap:4px}
.ht-chip{display:block;width:72px;height:48px;box-shadow:inset 0 0 0 1px var(--hair)}
.ht-runs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px 32px}
.ht-run__h{display:flex;align-items:baseline;gap:12px;font:600 17px/24px var(--body);padding-bottom:8px;border-bottom:1px solid var(--t)}
.ht-run__h .num{font-size:40px;line-height:40px}
.ht-run a{display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;padding:8px 0;border-bottom:1px solid var(--hair);font-size:15px;line-height:22px;text-decoration:none}
@media (hover:hover){.ht-run a:hover span+span{text-decoration:underline;text-underline-offset:3px}}
.ht-scope li{display:grid;grid-template-columns:40px 1fr;padding:8px 0;border-top:1px solid var(--hair)}
/* page bodies */
.ht-traits{display:flex;flex-direction:column;gap:8px;margin:auto 0}
.ht-traits li{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:baseline;border-top:1px solid currentColor;padding-top:8px}
.ht-traits .disp{container-type:inline-size}
.ht-not{font-size:15px;line-height:22px;max-width:52ch}
.ht-center{flex:1;display:flex;align-items:center;justify-content:center}
.ht-clear{border-color:currentColor}
.ht-ladder{display:flex;align-items:flex-end;gap:48px;margin:auto 0;flex-wrap:wrap}
.ht-ladder li{display:flex;flex-direction:column;gap:12px;width:var(--w);max-width:100%}
.ht-grounds{display:flex;flex:1}
.ht-gr{flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:16px;padding:40px 24px 32px}
.ht-gr__lg{flex:1;display:flex;align-items:center}
.ht-onph{position:relative;margin:0;aspect-ratio:3/2;max-height:560px;overflow:hidden}
.ht-onph__img,.ht-ph__img,.ht-contact__img{display:block;width:100%;height:100%;object-fit:cover}
.ht-onph__lg{position:absolute;left:40px;bottom:40px;width:312px;padding:16px;background:var(--onph)}
.ht-miss{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 40px;margin:auto 0}
.ht-mis{display:flex;flex-direction:column;gap:16px}
.ht-mis__lg{display:flex;align-items:center;justify-content:center;height:120px;transform-origin:center}
.ht-mis__lg svg{width:200px;height:auto}
.ht-strip{min-height:468px}
.ht-seg{display:flex;flex-direction:column;gap:4px;height:100%;padding:40px 16px 32px 24px}
.ht-seg .tb-seg__p{margin-top:auto}
.ht-tk--flush .tb-tk__body{padding:0}
.ht-prop{display:flex;flex-direction:column;flex:1}
.ht-prop li{flex:var(--share) 1 0;display:flex;align-items:center;gap:24px;padding:8px 40px;min-height:56px}
.ht-prop li.is-near{box-shadow:inset 0 0 0 1px var(--hair)}
.ht-prop .disp{font-size:40px;line-height:40px;min-width:120px}
.ht-ratio{font-size:min(200px,24cqw);line-height:1;margin:auto 0}
.ht-pair{flex:none;display:flex;align-items:center;justify-content:center;width:72px;height:56px;font-size:32px;line-height:1}
.ht-pair.is-near{box-shadow:inset 0 0 0 1px var(--hair)}
.ht-hex{font-size:min(120px,14cqw);line-height:1;margin:auto 0}
.ht-valist{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px 24px}
.ht-valist .ht-chip{width:100%;height:96px;margin-bottom:12px}
.ht-vals div{display:grid;grid-template-columns:56px 1fr;padding:6px 0;border-top:1px solid var(--hair);font-size:13px;line-height:18px}
.ht-faces li{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:24px;padding:24px 0;border-top:1px solid var(--hair);align-items:baseline}
.ht-face{font-size:48px;line-height:52px;overflow-wrap:anywhere}
.ht-scale{display:flex;flex-direction:column;gap:12px;margin:auto 0}
.ht-scale li{display:grid;grid-template-columns:40px minmax(0,1fr);align-items:baseline;gap:16px}
.ht-scale__t{font-size:var(--fs);line-height:1.1;white-space:nowrap}
.ht-use{display:flex;flex-direction:column;gap:16px;margin:auto 0;max-width:640px}
.ht-use__p{font-size:17px;line-height:26px;max-width:60ch}
.ht-ph{position:absolute;inset:0}
.ht-contact{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:12px 16px 4px 12px;box-sizing:border-box}
.ht-contact li{display:flex;flex-direction:column;min-height:0;overflow:hidden}
.ht-contact .ht-contact__img{flex:1 1 0;min-height:0;height:auto}
.ht-contact .num{flex:none;padding:6px 0 0;font-size:13px;line-height:18px;font-weight:600}
.ht-contact .photo-slot{border-color:var(--ink)}
.ht-ratio__1{font-size:.4em;margin-left:.08em}
.ht-shots li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:16px;padding:16px 0;border-top:1px solid var(--hair)}
.ht-shots li{align-items:baseline}
.ht-shots .disp{font-size:32px;line-height:40px}
.ht-grid{position:relative;width:100%;margin:auto 0;box-shadow:inset 0 0 0 1px currentColor}
.ht-grid i{position:absolute;top:var(--mv);bottom:var(--mv);background:currentColor;opacity:1;mix-blend-mode:normal;outline:1px solid currentColor;background:transparent;box-shadow:inset 0 0 0 1px currentColor}
.ht-lays{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin:auto 0}
.ht-lays li{display:flex;flex-direction:column;gap:8px}
.ht-lay{position:relative;box-shadow:inset 0 0 0 1px currentColor;container-type:inline-size;margin-bottom:8px}
.ht-lay__l{font-size:9cqw;line-height:0.95;max-width:70%}
.ht-lay__l--s{font-size:6cqw;max-width:none}
.ht-lay__two{display:grid;grid-template-columns:1fr 1fr;gap:4cqw;height:100%}
.ht-lay__ph{display:block;box-shadow:inset 0 0 0 1px currentColor;min-height:30cqw}
.ht-lay__tk{display:grid;grid-template-columns:3fr 1fr;height:100%;min-height:40cqw;gap:2cqw}
.ht-lay__tk span{box-shadow:inset 0 0 0 1px currentColor}
.ht-cards{display:flex;flex-wrap:wrap;gap:24px;margin:auto 0}
.ht-posts{margin:auto 0}
.ht-mail{display:flex;flex-direction:column;gap:12px;max-width:560px;margin:auto 0}
.ht-mail__s{font:600 20px/28px var(--body)}
.ht-mail__b{display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:22px;padding-bottom:16px}
.ht-dig{display:grid;grid-template-columns:minmax(0,400px) minmax(0,1fr);gap:40px;align-items:end;flex:1}
.ht-dig__l{container-type:inline-size;min-width:0}
.ht-mini .ht-strip{min-height:160px}
/* the UI kit: the body is the product's raised surface, the stub stays in the ticket colour */
.hk-tk .tb-tk__body{padding:0}
.hk-live{flex:1;display:flex;flex-direction:column;justify-content:center;padding:40px;background:var(--raised);color:var(--text);box-shadow:inset 0 0 0 1px var(--divider)}
.hk-tk--scrim .hk-live{background:var(--scrim)}
.hk-scrim{display:flex;justify-content:center}
.hk-stack{display:flex;flex-direction:column;gap:16px;max-width:560px}
.hk-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.hk-p{font-size:15px;line-height:24px;max-width:56ch}
.hk-eta{margin:0;font-size:var(--fs-title);line-height:var(--lh-title)}
.hk-cover{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:center}
.hk-cover__l{display:flex;flex-direction:column;gap:16px}
.hk-title{margin-bottom:8px}
.hk-title:has(.ph-c),.hk-title:has(.ph-c) *{white-space:normal!important}
.hk-sws{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}
.hk-sw{display:block;height:64px;margin-bottom:8px;box-shadow:inset 0 0 0 1px var(--hair)}
.hk-type li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:16px;align-items:baseline;padding:8px 0}
.hk-space li{display:grid;grid-template-columns:48px minmax(0,1fr);gap:16px;align-items:center;padding:8px 0}
.hk-space .tb-s{font-size:15px;line-height:20px;color:var(--text)}
.hk-space i{display:block;height:24px;background:var(--action)}
.hk-radii{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 24px}
.hk-radii li{display:flex;flex-direction:column;gap:12px}
.hk-radii .tb-s{font-size:15px;line-height:20px;color:var(--text)}
.hk-rbox{display:block;width:100%;aspect-ratio:3/2;box-sizing:border-box;border:solid var(--edge);background:var(--surface)}
.hk-elev{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(160px,1fr);gap:24px}
.hk-elev>*{margin:0;min-height:0}
.hk-elev__s{padding:20px;box-shadow:inset 0 0 0 1px var(--divider)}
.hk-elev__s .tb-s{font-size:15px;line-height:20px;color:var(--text)}
.hk-states{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}
.hk-states li{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.hk-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.hk-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.hk-fs{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.hk-fs legend{margin-bottom:8px}
.hk-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start}
.hk-links{display:flex;flex-wrap:wrap;gap:8px}
.hk-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px}
.hk-status li{padding:20px 0;border-top:1px solid var(--divider)}
.hk-status .ui-chip{font-size:36px;line-height:44px;font-weight:600}
.hk-tw{overflow:visible}
.hk-tw .ui-table{width:100%}
.hk-scr{display:flex;flex-direction:column;gap:12px;max-width:420px}
.hk-scr__top,.hk-scr__ft{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:18px}
.hk-desk{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:40px}
.hk-desk__r{display:flex;flex-direction:column;gap:12px}
.hk-phone{width:360px;max-width:100%;margin:0 auto;padding:16px;box-shadow:inset 0 0 0 1px var(--edge)}
.hk-swrow{display:flex;height:96px;margin-bottom:16px}
.hk-swrow li{flex:1;box-shadow:inset 0 0 0 1px var(--divider)}
.hk-tl li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;padding:8px 0;border-top:1px solid var(--hair);align-items:center}
.hk-tl--3 li{grid-template-columns:minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)}
.hk-tv{display:flex;gap:8px;align-items:center}
.hk-dot{display:block;flex:none;width:16px;height:16px;box-shadow:inset 0 0 0 1px var(--hair)}
.hk-grps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px;margin-top:40px}
.hk-codes{display:grid;gap:24px}
.hk-code{border-top:1px solid var(--t)}
.hk-code__h{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 0}
.hk-code pre{margin:0;padding:16px;background:var(--inv);color:var(--inv-ink);font:${ctx.brand.fonts.mono.weights[0]} 12px/18px var(--mono);white-space:pre-wrap;overflow-wrap:anywhere}
.hk-code pre code{font:inherit}
.hk-copy.is-done{background:var(--t);color:var(--g)}
/* the bench: a variant and a state strip, the live figure, the values each state reads (the current row lit in the ticket colour) */
.hk-bench{display:grid;gap:16px}
.hk-bench [hidden]{display:none}
.hk-bench__ctl{display:flex;flex-wrap:wrap;gap:16px 40px;align-items:center}
.hk-seg{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.hk-seg .tb-s{margin-right:8px}
.hk-seg button{appearance:none;height:36px;padding:0 12px;border:1px solid var(--t);background:transparent;color:var(--t);font:500 13px/1 var(--body);cursor:pointer;transition:background-color 120ms ease-out,color 120ms ease-out}
.hk-seg button[aria-pressed="true"]{background:var(--t);color:var(--g)}
@media (hover:hover){.hk-seg button[aria-pressed="false"]:hover{text-decoration:underline;text-underline-offset:3px}}
.hk-bench__now{margin-top:8px}
.hk-bench__fig{min-height:176px;align-items:flex-start}
.hk-bench__v{display:flex;width:100%;max-width:400px}
.hk-bench__v>*{flex:1 1 auto}
.hk-bench__v>.ui-btn,.hk-bench__v>.ui-choice{flex:none}
.hk-mx li{display:grid;grid-template-columns:minmax(0,3fr) repeat(5,minmax(0,2fr));gap:16px;padding:12px;border-top:1px solid var(--hair);align-items:start}
.hk-mx li:last-child{border-bottom:1px solid var(--hair)}
.hk-mx p{display:flex;flex-direction:column;gap:2px;min-width:0;overflow-wrap:anywhere}
${['rest', 'hover', 'focus', 'pressed', 'disabled', 'error', 'checked'].map((s) => `.hk-bench[data-state="${s}"] .hk-mx [data-st="${s}"]`).join(',')}{background:var(--f);color:var(--fi)}
@media (max-width:840px){
.ht-bar{height:56px;padding:0 16px;gap:8px}
.ht-brand{width:96px}
.ht-parts a{padding:8px 4px}
.ht-mode button{padding:0 8px}
.ht-body{grid-template-columns:minmax(0,1fr)}
.ht-rail{position:static;max-height:none;overflow:visible;padding:0;border:0;border-bottom:1px solid var(--hair)}
.ht-disc{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;appearance:none;border:0;background:transparent;color:var(--t);font:600 15px/22px var(--body);text-align:left;padding:12px 16px;cursor:pointer}
.ht-order{display:none;padding:8px 16px 24px}
.ht-order[data-open="true"],.ht-order.is-open{display:block}
.bk.ht .ht-main{padding:24px 16px 0}
.ht-cols-l li{grid-template-columns:56px minmax(0,1fr);gap:16px}
.ht-cols-l li>.ht-v{grid-column:2}
.ht-cols-l--4 li{grid-template-columns:1fr;gap:4px}
.ht-chip{width:56px}
.ht-runs,.ht-valist,.ht-lays,.ht-miss,.hk-sws,.hk-states,.hk-form,.hk-choices,.hk-cards,.hk-grps,.hk-cover,.hk-desk,.ht-dig,.hk-elev{grid-template-columns:minmax(0,1fr)}
.ht-valist{grid-template-columns:repeat(2,minmax(0,1fr))}
.hk-sws{grid-template-columns:repeat(2,minmax(0,1fr))}
.ht-faces li{grid-template-columns:1fr;gap:8px}
.ht-face{font-size:32px;line-height:36px}
.ht-grounds{flex-direction:column}
.ht-gr{padding:24px}
.ht-strip{min-height:420px}
.ht-ph,.ht-contact{position:static;aspect-ratio:3/2}
.ht-contact{grid-template-columns:repeat(2,minmax(0,1fr));aspect-ratio:auto}
.ht-contact{padding:12px 12px 16px}
.ht-contact .ht-contact__img{flex:1 0 auto;height:auto;min-height:168px}
.ht-contact img.ht-contact__img{height:168px}
.ht-cols-l .ht-pair{width:56px;height:48px;font-size:28px}
.ht-onph__lg{left:16px;bottom:16px;width:160px}
.ht-prop .disp{font-size:28px;line-height:28px;min-width:80px}
.ht-prop li{padding:8px 24px}
.ht-scale__t{font-size:min(var(--fs),40px)}
.hk-live{padding:24px}
.hk-status{grid-template-columns:minmax(0,1fr)}
.hk-status .ui-chip{font-size:28px;line-height:36px}
.hk-radii{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px}
.hk-elev{grid-auto-rows:minmax(120px,auto)}
.hk-tl--3 li{grid-template-columns:1fr 1fr}
.hk-tl--3 li>p:first-child{grid-column:1/-1}
.hk-tw{overflow-x:auto}
.hk-tw .hk-wide{display:none}
.hk-tw .ph-c.ph-n{white-space:normal!important}
.bk.ht .tb-stub__no{grid-row:2}
.bk.ht .tb-stub__bc{grid-column:1/-1}
.bk.ht .tb-stub__h .ph-c{white-space:normal!important;overflow-wrap:anywhere}
.bk.ht .tb-serial{font-size:44px;line-height:48px}
.hk-mx li{grid-template-columns:repeat(2,minmax(0,1fr))}
.hk-mx li>.ht-k{grid-column:1/-1}
.hk-bench__ctl{gap:12px}
.ht-pager a{max-width:48%}
}`;
}

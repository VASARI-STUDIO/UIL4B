// Lane ht, UI kit site CSS: the split title slide, the live area on the page ground (token colours, so it follows light and dark),
// the markup list. The components keep the code package's own CSS.
export function kitCss(ctx) {
  const sc = (t, d) => ((ctx.brand.type.scale.find((x) => x.token === t) || {}).size || d), bd = sc("body", 16), cp = sc("caption", 14), tt = sc("title", 25), hd = sc("headline", 36);
  return `body{margin:0}
.ht--kit,.ht--kit *,.ht--kit *::before,.ht--kit *::after{box-sizing:border-box}
.ht--kit{--g:var(--surface);--t:var(--text);--s:var(--text-soft);--q:var(--quiet);--h:var(--divider)}
/* a page is a band: the title field on top (the title left, its line right), a flat accent rule, then the live area sized to what is in it.
   Only the cover keeps the split, and it is sized by its content too (no min-height, so no empty half-panel) */
.hk-top{display:grid;grid-template-columns:minmax(0,1fr)}
.hk-top--cover{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}
.hk-top--cover .hk-title{grid-column:1;grid-row:1}
.hk-top--cover .hk-live{grid-column:2;grid-row:1}
.hk-rule{height:6px;grid-column:1/-1;grid-row:2}
@media (min-width:1100px){.hk-live .hk-row,.hk-live .hk-col>.hk-i,.hk-live .hk-row--2{zoom:1.25}}
.hk-title{display:flex;flex-direction:column;justify-content:flex-end;gap:20px;padding:56px;container-type:inline-size}
.hk-top--cover .hk-title{gap:32px}
.hk-title__h{font-size:var(--bs,64px)}
.hk-title__l{font-size:${bd}px;line-height:1.5;font-weight:500;max-width:36ch;text-wrap:pretty}
.hk-title__v,.hk-title .ht-k{color:var(--q)}
.hk-title .ht-k b{font-weight:400;margin-left:8px}
.hk-logo{margin-bottom:auto}
.hk-logo .ht-wm{text-align:left;justify-content:flex-start}
.hk-live{display:flex;flex-direction:column;justify-content:center;gap:40px;padding:56px;min-width:0;background:var(--surface);color:var(--text)}
.hk-row{display:flex;flex-wrap:wrap;gap:32px 40px;align-items:flex-end}
.hk-row--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.hk-col{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:40px 48px;align-items:start}
.hk-col>.hk-i--w{grid-column:1/-1;max-width:960px}
.hk-i--stack .hk-i__c{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.hk-i{display:flex;flex-direction:column;gap:12px;margin:0}
.hk-i--w .hk-i__c{width:100%;max-width:960px}
.hk-col>.hk-i--full,.hk-i--full .hk-i__c{max-width:none}
.hk-i figcaption{font-size:${cp}px;line-height:1.4;color:var(--quiet)}
.hk-frame{border:1px solid var(--divider)}
.hk-sg+.hk-sg{margin-top:8px}
.hk-sg__t{margin:0 0 16px;display:flex;align-items:center;gap:12px;font-size:14px;line-height:1.3;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-soft)}
.hk-sg__t::before{content:'';flex:none;width:16px;height:6px;background:var(--palette-support,var(--action))}
.hk-sw{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:24px 16px;background:var(--surface);color:var(--text)}
.hk-sw li{display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.4}
.hk-sw__c{display:block;height:72px;box-shadow:inset 0 0 0 1px var(--divider);margin-bottom:8px}
.hk-ts>li,.hk-sp>li{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--divider)}
.hk-ts .ht-k span{display:block;font-weight:400;color:var(--quiet)}
.hk-sp>li{grid-template-columns:120px auto minmax(0,1fr);align-items:center}
.hk-sp__b{display:block;height:16px;background:var(--action);max-width:100%}
.hk-rd{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 16px}
.hk-rd li{display:flex;flex-direction:column;gap:6px;font-size:14px}
.hk-rd__b{display:block;height:72px;border:var(--w-control) solid var(--edge);background:var(--raised)}
.hk-scr{background:var(--surface);color:var(--text);border:1px solid var(--divider)}
.hk-scr__body{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:24px 48px;align-items:start;padding:32px}
.hk-scr__t{grid-column:1/-1}
.hk-scr__a{display:flex;flex-direction:column;gap:20px}
.hk-scr__x{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.hk-scr .ui-card__title,.hk-scr .ui-card__meta{white-space:nowrap}
.hk-scr .ui-card__text{text-wrap:pretty}
@media (max-width:700px){.hk-scr__body{grid-template-columns:minmax(0,1fr);padding:20px 16px}}
.hk-scr__t{margin:0;font-size:20px;font-weight:600}
.hk-phone{position:relative;box-sizing:border-box;width:min(100%,390px);border:10px solid var(--text);border-radius:44px;overflow:hidden;background:var(--surface);margin:0 auto}
.hk-phone::before{content:"";display:block;width:96px;height:6px;margin:8px auto 0;border-radius:3px;background:var(--divider)}
.hk-phone .hk-scr{border:0;max-width:none}
.hk-phone .ui-topbar{height:auto;flex-wrap:wrap;padding:8px 16px}
.hk-phone .ui-topbar__links{flex-wrap:wrap}
.hk-phone .hk-scr__body{grid-template-columns:minmax(0,1fr);padding:16px}
.hk-tok{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin:0}
.hk-title__in{display:flex;flex-direction:column;gap:20px}
.hk-top:not(.hk-top--cover) .hk-title__in{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:16px 56px;align-items:end}
.hk-top:not(.hk-top--cover) .hk-title__in>.ht-k{grid-column:1/-1}
.hk-top:not(.hk-top--cover) .hk-title__h{grid-column:1}
.hk-top:not(.hk-top--cover) .hk-title__l{grid-column:2}
.hk-tg+.hk-tg{margin-top:56px}
.hk-tg__h{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:12px}
.hk-tg__t{margin:0;font-size:${tt}px;line-height:1.1;font-weight:600}
.hk-tok dt{display:flex;align-items:center;gap:10px;min-width:0}
.hk-tok__c{flex:none;width:16px;height:16px;box-shadow:inset 0 0 0 1px var(--divider)}
.ui [data-slot]{outline:0}
.hk-tok>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider)}
.hk-tok dd{margin:0;display:flex;gap:12px;align-items:center}
.hk-code{padding:40px 56px 96px;max-width:1440px;margin:0 auto}
.hk-code__h{font-size:${hd}px;margin-bottom:40px}
.hk-code ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 32px}
.hk-code ol:has(>li:only-child){grid-template-columns:minmax(0,1fr)}
.hk-code li{display:flex;flex-direction:column;gap:12px;align-items:flex-start;min-width:0}
.hk-code pre,.hk-tree{margin:0;width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;scrollbar-color:var(--quiet) var(--sunken);padding:16px;background:var(--sunken);color:var(--text);font:400 ${cp}px/1.6 var(--mono);white-space:pre;overflow-wrap:normal;scrollbar-width:thin}
/* a block fades at its right edge only while it has more to the right (its scroll timeline is live only when it overflows, and the fade ends at the last column); with no support, or no overflow, there is no fade */
@supports (animation-timeline:scroll(self inline)){@keyframes hk-more{0%,99%{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 28px),transparent)}100%{-webkit-mask-image:none;mask-image:none}}.hk-code pre{animation:hk-more linear both;animation-timeline:scroll(self inline)}.hk-code pre:focus-visible{animation:none;-webkit-mask-image:none;mask-image:none}}
.hk-tree{width:auto;font-variant-numeric:tabular-nums}
.hk-steps{list-style:none;margin:0;padding:0;counter-reset:s;display:grid;gap:12px}
.hk-steps li{display:grid;grid-template-columns:28px minmax(0,1fr);gap:12px;align-items:baseline;counter-increment:s}
.hk-steps li::before{content:counter(s);font-weight:600;font-variant-numeric:tabular-nums;color:var(--quiet)}
.hk-code pre:focus-visible,.hk-tree:focus-visible{outline:2px solid var(--t);outline-offset:2px}
.hk-code code{font:inherit}
.hk-sw b{font-weight:600}
.hk-copy.is-done{background:var(--t);color:var(--g)}
@media (max-width:840px){
.hk-top,.hk-top--cover{grid-template-columns:minmax(0,1fr)}
.hk-top--cover .hk-title,.hk-top--cover .hk-live{grid-column:1;grid-row:auto}
.hk-top--cover .hk-rule{grid-row:auto}
.hk-top:not(.hk-top--cover) .hk-title__in{grid-template-columns:minmax(0,1fr)}
.hk-top:not(.hk-top--cover) .hk-title__l{grid-column:1}
.hk-title,.hk-live{padding:40px 20px}
.hk-row--2,.hk-rd,.hk-tok,.hk-code ol{grid-template-columns:minmax(0,1fr)}
.hk-sw{grid-template-columns:repeat(var(--n,3),minmax(0,1fr))}
.hk-sw[style*="--n:4"],.hk-sw[style*="--n:5"]{grid-template-columns:repeat(2,minmax(0,1fr))}
.hk-ts>li,.hk-sp>li{grid-template-columns:minmax(0,1fr);gap:6px}
.hk-code{padding:24px 20px 56px}
.hk-code__h{font-size:${tt}px}
}
@media (max-width:520px){
.hk-sw,.hk-sw[style*="--n:4"],.hk-sw[style*="--n:5"]{grid-template-columns:minmax(0,1fr);gap:12px}
.hk-sw li{display:grid;grid-template-columns:56px minmax(0,1fr);column-gap:16px;align-items:center}
.hk-sw li>.hk-sw__c{grid-row:1/4;height:56px;margin:0}
}`;
}

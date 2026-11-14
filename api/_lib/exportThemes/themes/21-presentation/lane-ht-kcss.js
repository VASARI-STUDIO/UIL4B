// Lane ht, UI kit site CSS: the split title slide, the live area on the page ground (token colours, so it follows light and dark),
// the markup list. The components keep the code package's own CSS.
export function kitCss() {
  return `body{margin:0}
.ht--kit{--g:var(--surface);--t:var(--text);--s:var(--text-soft);--q:var(--quiet);--h:var(--divider)}
.hk-top{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);min-height:min(calc(100vh - 56px),520px)}
@media (min-width:1100px){.hk-live .hk-row,.hk-live .hk-col>.hk-i,.hk-live .hk-row--2{zoom:1.25}}
.hk-title{display:flex;flex-direction:column;justify-content:flex-end;gap:20px;padding:56px;container-type:inline-size}
.hk-title__h{font-size:var(--bs,64px)}
.hk-title__l{font-size:19px;line-height:1.5;font-weight:500;max-width:36ch}
.hk-title__v,.hk-title .ht-k{color:var(--q)}
.hk-title .ht-k b{font-weight:400;margin-left:8px}
.hk-logo{margin-bottom:auto}
.hk-live{display:flex;flex-direction:column;justify-content:center;gap:40px;padding:56px;background:var(--surface);color:var(--text)}
.hk-row{display:flex;flex-wrap:wrap;gap:32px 40px;align-items:flex-end}
.hk-row--2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.hk-col{display:flex;flex-direction:column;gap:40px}
.hk-stack{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.hk-i{display:flex;flex-direction:column;gap:12px;margin:0}
.hk-i--w .hk-i__c{width:100%;max-width:560px}
.hk-i figcaption{font-size:13px;line-height:1.4;color:var(--quiet)}
.hk-links{display:flex;gap:24px;flex-wrap:wrap}
.hk-sw{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px;background:var(--surface);color:var(--text)}
.hk-sw li{display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.4}
.hk-sw__c{display:block;height:72px;box-shadow:inset 0 0 0 1px var(--divider);margin-bottom:8px}
.hk-ts>li,.hk-sp>li{display:grid;grid-template-columns:160px minmax(0,1fr);gap:24px;align-items:baseline;padding:14px 0;border-bottom:1px solid var(--divider)}
.hk-ts .ht-k span{display:block;font-weight:400;color:var(--quiet)}
.hk-sp>li{grid-template-columns:120px auto minmax(0,1fr);align-items:center}
.hk-sp__b{display:block;height:16px;background:var(--action);max-width:100%}
.hk-rd{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 16px}
.hk-rd li{display:flex;flex-direction:column;gap:6px;font-size:14px}
.hk-rd__b{display:block;height:72px;border:var(--w-control) solid var(--edge);background:var(--raised)}
.hk-tbl{width:100%;border-collapse:collapse;font-size:15px;line-height:1.4}
.hk-tbl th{text-align:left;font-weight:600;font-size:13px;color:var(--quiet);padding:8px 12px 8px 0;border-bottom:1px solid var(--divider)}
.hk-tbl td{padding:12px 12px 12px 0;border-bottom:1px solid var(--divider);vertical-align:top}
.hk-tbl td span{display:block;color:var(--quiet);font-size:13px}
.hk-tbl .is-num{text-align:right;font-variant-numeric:tabular-nums}
.hk-empty{display:flex;flex-direction:column;gap:12px;align-items:flex-start;padding:40px;border:1px dashed var(--edge)}
.hk-empty h3{font-size:20px;line-height:1.3;margin:0;font-weight:600}
.hk-empty p{margin:0;color:var(--text-soft)}
.hk-scr{display:flex;flex-direction:column;gap:20px;padding:24px;background:var(--surface);color:var(--text);box-shadow:inset 0 0 0 1px var(--divider);max-width:640px}
.hk-scr--m{max-width:390px}
.hk-scr__h{display:flex;justify-content:space-between;align-items:center;gap:12px}
.hk-scr__t{margin:0;font-size:20px;font-weight:600}
.hk-tok{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px;margin:0}
.hk-tok>div{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider)}
.hk-tok dd{margin:0;display:flex;gap:12px;align-items:center}
.hk-code{padding:96px 56px;max-width:1440px;margin:0 auto}
.hk-code__h{font-size:48px;margin-bottom:40px}
.hk-code ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:40px 32px}
.hk-code ol:has(>li:only-child){grid-template-columns:minmax(0,1fr);max-width:720px}
.hk-code li{display:flex;flex-direction:column;gap:12px;align-items:flex-start;min-width:0}
.hk-code pre{margin:0;width:100%;overflow:auto;padding:16px;background:var(--sunken);color:var(--text);font:400 13px/1.6 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere}
.hk-code code{font:inherit}
.hk-sw b{font-weight:600}
.hk-copy.is-done{background:var(--t);color:var(--g)}
@media (max-width:840px){
.hk-top{grid-template-columns:minmax(0,1fr);min-height:0}
.hk-title,.hk-live{padding:40px 20px}
.hk-row--2,.hk-sw,.hk-rd,.hk-tok,.hk-code ol{grid-template-columns:minmax(0,1fr)}
.hk-ts>li,.hk-sp>li{grid-template-columns:minmax(0,1fr);gap:6px}
.hk-code{padding:56px 20px}
.hk-code__h{font-size:32px}
.hk-empty{padding:24px}
}`;
}

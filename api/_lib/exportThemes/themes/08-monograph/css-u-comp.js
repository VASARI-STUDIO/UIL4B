// Styles for u-comp.js (classes start ru2-): buttons, inputs, choices, cards, navigation, lists.
// Page 794 x 1123, margin 72, spacing on a 4 px base. A proof is the paper with four registration crosses at the corners of its
// figure (or of its Ink panel); the components hold their own edges, so there is no sheet outline here and nothing restyles a gate
// class. Inside a proof the colours are the ui roles (--text, --quiet, --divider), so the same words read on a light proof and on a
// dark one. Familjen Grotesk is the chrome; mono only on literal values. Nothing is under 12 px.
export const cssUComp = (ctx) => `
.ru2-b{position:absolute;left:72px;right:72px;top:176px}
.r-top:has(.r-lead)~.ru2-b{top:208px}
.ru2-sn{display:block;font-family:var(--chrome);font-weight:600;font-size:12px;line-height:1.3;color:var(--quiet)}

/* the proof: the crosses at the corners of the figure; a dark proof is the Ink panel, the crosses at its own corners */
.ru2-op{position:relative;padding:14px;--xi:0px;isolation:isolate}
.ru2-op__pr{padding:16px}
.ru2-op--dk .ru2-op__pr{padding:20px}
.ru2-op--flush .ru2-op__pr{padding:0}

/* the job line (copied from p-image.js, renamed): one line under the figure, drums in order, the paper last */
.ru2-job{margin-top:8px;max-width:72ch;font-family:var(--body);font-size:12px;line-height:1.5;color:var(--quiet);text-wrap:pretty}
.ru2-jd,.ru2-jn{white-space:normal}
.ru2-sw{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0;outline:1px solid var(--hair);outline-offset:-1px}

/* the page's one plain paragraph: sentences, no run-in labels, no grid */
.ru2-np{margin:24px 0 0;max-width:62ch;font-family:var(--body);font-size:14px;line-height:1.55;color:var(--ink);text-wrap:pretty}

/* buttons: one sheet; the four variants across it, the sizes beside the states of quiet and danger */
.ru2-vr{display:grid;grid-template-columns:repeat(4,minmax(112px,auto));justify-content:space-between;gap:16px}
.ru2-vr__i{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.ru2-vr__u{font-size:13px;line-height:1.4;color:var(--quiet)}
.ru2-vr .ru2-vr__u{contain:inline-size;align-self:stretch}
.ru2-vr__u b{font-weight:600;color:var(--text)}
.ru2-bt__lo{display:grid;grid-template-columns:168px minmax(0,1fr);gap:24px;margin-top:20px;padding-top:20px;border-top:1px solid var(--divider)}
.ru2-sz{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.ru2-run{margin:0;padding:0;list-style:none}
.ru2-run li{display:grid;grid-template-columns:64px 88px auto;gap:16px;align-items:center;justify-content:start}
.ru2-run li+li{margin-top:8px}
.ru2-run__h{margin-bottom:4px}
.ru2-bt__cap{margin-top:16px;max-width:46ch;font-size:12px;line-height:1.5;color:var(--quiet)}
.ru2-bt1+.ru2-np{margin-top:28px}

/* inputs: notes and the select at the left, the text field's states down a proof at the right (340 px fields), the textarea on Ink */
.ru2-in1{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:28px;align-items:start}
.ru2-in1__l{display:flex;flex-direction:column;gap:20px}
.ru2-in1__l .ru2-np{margin-top:0}
.ru2-in1__s{margin-top:4px}
.ru2-fs{position:relative;min-width:0}
.ru2-fs .ru2-sn{position:absolute;right:0;top:2px}
.ru2-fs+.ru2-fs{margin-top:16px}
.ru2-fs .ui-field,.ru2-fs .ui-input,.ru2-fs .ui-select,.ru2-fs .ui-textarea{width:100%;min-width:0}
.ru2-pg .ui-input[aria-invalid="true"]{border-color:var(--danger);box-shadow:inset 0 0 0 1px var(--danger)}
.ru2-in2{margin-top:24px}
.ru2-ta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.ru2-ta .ru2-fs+.ru2-fs{margin-top:0}

/* choices: the segmented control large on Ink, across the page; then one short form of three groups, a state named at each row's end */
.ru2-sg{display:flex;flex-direction:column;gap:16px}
.ru2-sg .ru2-sn{margin-bottom:8px}
.ru2-sg .ui-segmented{display:flex;width:100%}
.ru2-sg .ui-segmented button{flex:1;height:44px}
.ru2-cc2{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:40px;align-items:start;margin-top:24px}
.ru2-cc2 .ru2-np{margin-top:14px}
.ru2-fm{display:flex;flex-direction:column;gap:20px;margin:0}
.ru2-fc{margin:0;padding:0;border:0;min-width:0}
.ru2-ch__n{float:left;width:100%;padding:0;margin-bottom:4px;font-family:var(--chrome);font-weight:700;font-size:20px;line-height:1.2;letter-spacing:-0.01em;color:var(--text)}
.ru2-ch__n+*{clear:both}
.ru2-fr{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:52px;padding:4px 0;border-top:1px solid var(--divider)}
.ru2-fr__c{min-width:0}

/* cards: the cards are the edges, the crosses at their corners; the stats are one card on Ink, three figures between rules */
.ru2-pg .ui-card__title{text-wrap:balance}
.ru2-pg .ui-card__text{text-wrap:pretty}
.ru2-cd1{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;align-items:start}
.ru2-op--st .ru2-op__pr{padding:24px}
.ru2-st{display:flex;flex-direction:column}
.ru2-st .ui-stat{padding:16px 0;border:0;border-radius:0;background:none}
.ru2-st .ui-stat:first-child{padding-top:0}
.ru2-st .ui-stat:last-child{padding-bottom:0}
.ru2-st .ui-stat+.ui-stat{border-top:1px solid var(--divider)}
.ru2-cd2{margin-top:20px}
.ru2-cd2__r{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;align-items:start}
.ru2-act{margin-top:16px}
.ru2-cd2+.ru2-np{margin-top:28px}

/* navigation: the top bar full width; the breadcrumbs and tabs beside their rules; the sidebar to the right; the tab bar on Ink */
.ru2-lg{display:block;line-height:0}
.ru2-nv2{display:grid;grid-template-columns:minmax(0,1fr) 248px;gap:40px;margin-top:24px;align-items:start}
.ru2-gap{height:20px}
.ru2-nv3{display:block}
.ru2-nv4{display:grid;grid-template-columns:430px minmax(0,1fr);gap:32px;margin-top:24px;align-items:start}
.ru2-nv4 .ru2-np{margin-top:14px}
.ru2-w390{display:flex;flex-direction:column;width:390px}
.ru2-w390 .ui-list{margin:0;padding:0 16px;list-style:none}
.ru2-w390 .ui-row:last-child{border-bottom:0}
/* lists: the anatomy row with its brackets, the list large, the notes at the foot; the trailing column is a fixed 96 px */
.ru2-pg .ui-row__main{min-width:0}
.ru2-pg .ui-row__end{width:96px}
.ru2-ls1{display:grid;grid-template-columns:420px minmax(0,1fr);gap:32px;align-items:start}
.ru2-an{position:relative;height:28px;margin-top:8px}
.ru2-an__b{position:absolute;top:0;height:7px;border:1px solid var(--text);border-top:0}
.ru2-an__b i{position:absolute;top:12px;left:0;font-style:normal;font-family:var(--chrome);font-size:12px;line-height:1.2;color:var(--quiet);white-space:nowrap}
.ru2-an__b--l{left:0;width:40px}
.ru2-an__b--t{left:52px;right:108px}
.ru2-an__b--e{right:0;width:96px}
.ru2-an__b--e i{left:auto;right:0}
.ru2-ls2{margin-top:28px}
.ru2-ls1 .ru2-np{margin-top:4px}
`;

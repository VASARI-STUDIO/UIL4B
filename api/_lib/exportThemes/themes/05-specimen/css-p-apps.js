// Styles for p-apps.js (classes start ka-): the applications and close pages of the card catalogue. Page 794 x 1123, margin 56.
// The gate's elevation language: 1 px and 1.5 px Rod lines, no shadows. Goudy Bookletter 1911 at 24 px and over only.
// The card's first and second indention, from the page margin (96 and 136 px from the page edge). The gate does not export them yet.
const KI1 = 40, KI2 = 80;
// every page keeps 48 px clear above the rod hole (16 px, 22 px off the foot): the last block ends 88 px above the page edge
const FOOT = 88;
export const cssPApps = (ctx) => `
.ka-sc{position:relative;flex:none;overflow:hidden}
.ka-sc__in{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}
.ka-ab{position:absolute}
.ka-th{display:block;margin:0;text-wrap:balance}
.ka-see{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink);margin-top:auto;padding-bottom:${FOOT}px;flex:none}
.ka-see b{font-weight:600;margin-right:4px}
.ka-foot{margin-top:auto;padding:14px 0 ${FOOT}px;border-top:1.5px solid var(--rod);flex:none}
.ka-trace{font-size:14px;line-height:21px;color:var(--ink);max-width:640px}
.ka-cap{font-family:var(--body);font-size:12px;line-height:17px;font-weight:400;color:var(--rod)}

/* guide tabs as dividers: the guide card's top edge, its tab cut first, second or third across the width (typefaces is the model) */
.ka-gc{position:relative;flex:none;border-top:1.5px solid var(--rod);padding-top:16px;margin-top:64px}
.ka-gc__t{position:absolute;bottom:100%;height:32px;display:flex;align-items:center;margin-bottom:-1.5px;padding:0 14px;background:var(--face);border:1.5px solid var(--rod);border-bottom:0;border-radius:8px 8px 0 0;font-family:var(--body);font-weight:500;font-size:16px;line-height:1;color:var(--ink);white-space:nowrap}
.ka-gc--1 .ka-gc__t{left:0}
.ka-gc--2 .ka-gc__t{left:50%;transform:translateX(-50%)}
.ka-gc--3 .ka-gc__t{right:0}
.ka-gc--lg .ka-gc__t{height:40px;font-family:var(--display);font-weight:400;font-size:28px;padding-bottom:3px}
.ka-gc--lg{margin-top:72px}

/* the two indentions drawn as Rod hairlines, behind the text, ruled just before the indention as on a printed card so a hung
   line starts clear of its rule */
.ka-ind{position:absolute;top:0;bottom:0;width:1px;background:var(--rod);z-index:0}
.ka-ind--1{left:${KI1 - 10}px}
.ka-ind--2{left:${KI2 - 10}px}

/* business card: front and back at 6 px to the mm, staggered down the page, each captioned under the card */
.ka-pg-bc .k-lead{margin-bottom:32px}
.ka-bcs{display:flex;flex-direction:column;gap:32px;flex:none}
.ka-bcf{display:flex;flex-direction:column;gap:10px;width:540px;margin:0}
.ka-bcf--back{margin-left:142px}
.ka-bc{position:relative;width:540px;height:330px;overflow:hidden}
.ka-bc--front{background:var(--dark);color:var(--dark-ink)}
.ka-bc--back{background:var(--face);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rod)}
.ka-bc__logo{position:absolute;left:44px;right:44px;top:24px;height:174px;display:flex;align-items:center}
.ka-bc__line{position:absolute;left:44px;right:44px;top:222px;font-family:var(--body);font-size:15px;line-height:20px}
.ka-bc__mark{position:absolute;right:40px;top:36px}
.ka-bc__who{position:absolute;left:44px;bottom:40px;font-family:var(--body)}
.ka-bc__nm{font-size:28px;line-height:1.1;padding-bottom:.12em;margin-bottom:-.12em}
.ka-bc__rl{font-size:15px;line-height:20px;color:var(--rod);margin-top:4px}
.ka-bc__ct{font-size:15px;line-height:22px;margin-top:20px}

/* social: two posts stacked on the left, the story tall on the right, each over its plain caption. Posts are drawn at page size */
.ka-shelf{display:flex;justify-content:space-between;align-items:flex-start;flex:none}
.ka-shelf__l{display:flex;flex-direction:column;gap:28px}
.ka-sf{display:flex;flex-direction:column;gap:10px;margin:0}
.ka-sf figcaption{display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.ka-sf__c{font-family:var(--body);font-size:14px;line-height:20px;color:var(--ink);max-width:260px}
.ka-post{position:relative;flex:none;overflow:hidden;isolation:isolate;box-shadow:0 0 0 1px var(--rod)}
.ka-post__logo{flex:none}

/* signage: the lead, the sign large, its caption full width under it */
.ka-sg{display:flex;flex-direction:column;gap:12px;flex:none;margin:0 0 16px}
.ka-sign{background:var(--dark)}
.ka-sg__spec{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);max-width:640px}

/* email signature: the mail client at the full measure, plain numerals in the right margin, the notes on the first indention */
.ka-mail{position:relative;width:100%;background:var(--face);box-shadow:0 0 0 1px var(--rod);font-family:var(--body);color:var(--ink);flex:none}
.ka-mail__h{position:relative;padding:18px 24px 14px;border-bottom:1px solid var(--rod);font-family:var(--chrome);font-size:13px;line-height:1.4;display:flex;flex-direction:column;gap:4px}
.ka-mail__h p{display:flex;align-items:baseline;padding-right:64px}
.ka-mail__k{flex:none;width:64px;font-style:normal;color:var(--rod)}
.ka-mail__v{flex:1;min-width:0}
.ka-mail__h b{font-weight:600}
.ka-mail__h .ka-mail__t{position:absolute;right:24px;top:18px;color:var(--rod)}
.ka-mail__b{padding:24px;font-size:17px;line-height:1.6}
.ka-mail__b>p+p{margin-top:12px}
.ka-sig{margin-top:28px;padding-top:22px;border-top:1px solid var(--hair)}
.ka-sig>*{position:relative}
.ka-sig__logo{margin-bottom:14px}
.ka-sig__n{font-weight:500;line-height:1.3}
.ka-sig__r{line-height:1.4;color:var(--rod)}
.ka-sig__c{line-height:1.5;margin-top:8px}
.ka-sig__l{line-height:1.4;color:var(--rod);margin-top:8px}
.ka-mk{flex:none;font-family:var(--body);font-size:12px;line-height:16px;font-weight:500;color:var(--ink)}
.ka-sig .ka-mk{position:absolute;left:calc(100% + 40px);top:2px}
.ka-sig__logo .ka-mk{top:50%;transform:translateY(-50%)}
.ka-notes{display:flex;flex-direction:column;gap:16px;margin:32px 0 0 ${KI1}px;max-width:600px;flex:none}
.ka-notes li{display:grid;grid-template-columns:${KI2 - KI1}px minmax(0,1fr);margin-left:-${KI2 - KI1}px;align-items:baseline}
.ka-notes li .ka-mk{text-align:left}
.ka-notes p{font-family:var(--body);font-size:17px;line-height:26px;color:var(--ink)}
.ka-pg-em .ka-see{margin-top:auto}
.ka-notes b{font-weight:600}

/* digital: the browser full width, drawn at a desktop width of 852 px and shown at 0.8 */
.ka-win{display:flex;flex-direction:column;width:852px;zoom:.8;box-shadow:0 0 0 1px var(--rod);overflow:hidden;flex:none}
.ka-win__url{height:32px;flex:none;display:flex;align-items:center;padding:0 12px;background:var(--panel);border-bottom:1px solid var(--rod);font-size:12px;color:var(--ink)}
.ka-win__url span{background:var(--face);padding:3px 14px;font-size:12px}
.ka-win__body{display:flex;flex-direction:column;gap:28px;padding:24px 28px 28px;font-family:var(--body)}
.ka-win .ui-topbar__links,.ka-win .ui-topbar__links a{white-space:nowrap}
.ka-bk{display:flex;flex-direction:column;gap:12px;min-width:0}
.ka-bk__top{display:flex;gap:12px;align-items:center}
.ka-bk__eta{font-size:14px;color:var(--rod)}
.ka-bk__h{margin:0;font-size:44px;line-height:1.1}
.ka-bk__by{margin:0;font-size:16px}
.ka-bk__ft{display:flex;justify-content:space-between;font-size:12px;color:var(--rod)}
.ka-bk__p{margin:0;font-size:14px;color:var(--ink)}
.ka-bk__au{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.ka-bk__au .ui-btn{margin-left:auto}
.ka-bk__an,.ka-bk__fv{margin:0;font-size:16px;font-weight:500;line-height:1.3}
.ka-bk__as,.ka-bk__fl{margin:0;font-size:13px;color:var(--rod)}
.ka-bk__facts{display:flex;align-items:center;gap:32px}
.ka-bk__facts .ui-btn:nth-of-type(1){margin-left:auto}
.ka-dl{display:flex;flex-direction:column;gap:8px;min-width:0}
.ka-dl__h{font-family:var(--chrome);font-size:12px;font-weight:600}
/* a row's lead as a book cover, 2 : 3 on the sunken ground, as the UI kit's lists draw it: a spine line and a title bar */
.ka-win .ui-row__lead:has(.ka-cvr){width:32px;height:48px;border-radius:0;background:none}
.ka-cvr{position:relative;display:block;box-sizing:border-box;width:32px;height:48px;border-radius:2px;background:var(--sunken);box-shadow:inset 0 0 0 1px var(--divider)}
.ka-cvr::before{content:'';position:absolute;top:0;bottom:0;left:5px;width:1px;background:var(--divider)}
.ka-cvr::after{content:'';position:absolute;left:11px;right:6px;top:10px;height:2px;background:var(--quiet)}
.ka-pg-dig .ka-foot{padding-top:12px}

/* summary: the main entry hung on the two indentions, guide tabs for the colours and the rules, the faces as the tracings */
.ka-sum{display:flex;flex-direction:column;flex:1;min-height:0}
.ka-sum__b{position:relative;isolation:isolate;flex:1;display:flex;flex-direction:column;padding:4px 0 20px}
.ka-sum__b>:not(.ka-ind){position:relative;z-index:1}
/* the second indention starts under the entry's line (as the intro's does), so its hairline never crosses the line or a slot chip */
.ka-sum__r{flex:1;display:flex;flex-direction:column;isolation:isolate}
.ka-sum__r>:not(.ka-ind){position:relative;z-index:1}
.ka-entry__logo{margin-bottom:16px}
.ka-pg-sum .ka-gc{margin-top:52px}
.ka-entry__p{font-size:40px;line-height:1.1;margin-left:${KI1}px;padding-bottom:.12em;margin-bottom:-.12em;text-wrap:balance}
.ka-entry__o{margin:10px 0 0 ${KI2}px;font-family:var(--body);font-size:17px;line-height:26px;color:var(--ink)}
.ka-stabs{display:flex;gap:2px;height:36px;margin-left:${KI2}px}
.ka-st{display:flex;align-items:center;padding:0 8px;border-radius:7px 7px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);font-size:12px;line-height:16px;min-width:0;overflow:hidden}
.ka-key{display:flex;flex-wrap:wrap;gap:6px 20px;margin-left:${KI2}px;padding-top:10px;border-top:1.5px solid var(--rod);font-family:var(--body);font-size:14px;line-height:20px;color:var(--ink)}
.ka-key li{white-space:nowrap}
.ka-key b{font-weight:600}
.ka-key .k-mono{font-size:13px}
.ka-rules{display:flex;flex-direction:column;gap:10px}
.ka-rules li{display:grid;grid-template-columns:${KI2 - KI1}px minmax(0,1fr);margin-left:${KI1}px;align-items:baseline}
.ka-rn{font-size:12px;line-height:16px;font-weight:600;color:var(--plum);padding-left:6px}
.ka-rh{font-family:var(--body);font-size:17px;line-height:23px;font-weight:600;margin:0 0 2px}
.ka-rp{font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink);max-width:560px}
.ka-foot--sum{padding-top:12px}
.ka-foot--sum .ka-trace{max-width:none}

/* contact and scope: four guide cards, cuts stepped left, centre, right, left; the sections as tracings on the first indention */
.ka-cs{display:flex;flex-direction:column;flex:none}
.ka-ask__p{font-family:var(--body);font-size:19px;line-height:29px;max-width:580px}
.ka-ask__p .k-mono,.ka-ask__p .k-mono *{white-space:nowrap}
.ka-cs .ka-gc{margin-top:76px}
.ka-cs .ka-gc--lg{margin-top:72px}
.ka-ask__p .k-mono{font-size:15px}
.ka-in1{margin-left:${KI1}px;font-size:15px;line-height:24px;max-width:600px}
.ka-notl{display:flex;flex-direction:column;gap:8px;font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink)}
.ka-notl b{font-weight:600}
.ka-coll{font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink)}
`;

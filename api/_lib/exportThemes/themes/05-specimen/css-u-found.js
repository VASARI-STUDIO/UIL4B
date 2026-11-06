// Styles for u-found.js (classes start ku1-). Page 794 x 1123, margin 56, on the gate's open sheet (.k-sheet, css-k.js).
// Same elevation language as the gate: 1 px and 1.5 px Rod lines for drawers, card edges and tabs; no shadows, no fills that only decorate.
// Components sit in .ui regions (the kit tokens, css-kit.js); the dark colour page is the drawer interior in the dark roles.
// Goudy Bookletter 1911 (.k-disp) at 24 px and over only.
export const cssUFound = (ctx) => `
.ku1-pg{--edge-l:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.ku1-m{display:inline;font-family:var(--kmono);font-weight:400;letter-spacing:0;font-size:12px;line-height:16px}
.ku1-lead{font-family:var(--body);font-size:15px;line-height:23px;max-width:600px;margin-bottom:18px;flex:none}
.ku1-small{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);flex:none}
.ku1-trace{font-family:var(--body);font-size:13px;line-height:19px;color:var(--ink)}
.ku1-trace--foot{flex:none;max-width:660px;margin:18px 0 72px}
.ku1-see{font-family:var(--body);font-size:13px;line-height:19px;color:var(--ink);margin-top:2px}
.ku1-see b{font-weight:600;margin-right:4px}
.ku1-colh{font-size:26px;line-height:1.1;padding-bottom:.12em;margin-bottom:10px}
/* a row's lead as a book cover, 2 : 3 on the sunken ground: a spine line and a title bar drawn in the ground's own divider and text colours
   (shared by the elevation, lists and screen pages; one stylesheet carries the whole kit) */
.ui .ui-row__lead:has(.ku-cvr){width:32px;height:48px;border-radius:0;background:none}
.ku-cvr{position:relative;display:block;box-sizing:border-box;width:32px;height:48px;border-radius:2px;background:var(--sunken);box-shadow:inset 0 0 0 1px var(--divider)}
.ku-cvr::before{content:'';position:absolute;top:0;bottom:0;left:5px;width:1px;background:var(--divider)}
.ku-cvr::after{content:'';position:absolute;left:11px;right:6px;top:10px;height:2px;background:var(--quiet)}

/* cover: one drawer pulled out, front elevation, one card lifted out of it. The lifted card stands behind the guide tabs with its
   rod hole clear of them; the front card of the stock and the drawer front close the drawer */
.ku1-cover{background:var(--ground)}
.ku1-chd{position:absolute;left:var(--m);right:var(--m);top:40px;display:flex;justify-content:space-between}
.ku1-crh{font-size:12px;line-height:18px;color:var(--rod);margin:0}
.ku1-crh b{font-weight:600;color:var(--ink)}
.ku1-pulled{position:absolute;left:var(--m);right:var(--m);top:84px;bottom:var(--m);isolation:isolate}
.ku1-lift{position:absolute;left:32px;right:32px;top:0;height:660px;z-index:1;display:flex;flex-direction:column;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod);padding:34px 32px 108px}
.ku1-callno{position:absolute;left:32px;top:38px;display:flex;flex-direction:column;font-size:14px;line-height:20px;color:var(--ink)}
.ku1-entry{margin-left:128px}
.ku1-cp--main .logo-slot{border-color:var(--rod)}
.ku1-titlep{display:flex;flex-wrap:wrap;align-items:center;gap:8px 28px;margin-top:22px}
.ku1-titlep h1{white-space:nowrap}
.ku1-kt{font-size:112px;line-height:1;padding-bottom:.12em;margin-bottom:-.12em}
.ku1-btn{display:block;background:none}
.ku1-coll{margin-top:14px;font-family:var(--body);font-size:15px;line-height:22px;color:var(--rod)}
.ku1-trace--card{margin-top:auto;padding-top:16px;font-size:14px;line-height:21px}
.ku1-lhole{position:absolute;left:50%;bottom:72px;transform:translateX(-50%)}
.ku1-tabs{position:absolute;left:0;right:0;top:620px;height:66px;z-index:2}
.ku1-tab{position:absolute;bottom:0;padding:0 4px}
.ku1-tabin{display:grid;grid-template-columns:auto minmax(0,1fr);align-content:start;column-gap:8px;height:66px;padding:8px 14px 0;background:var(--face);border-radius:10px 10px 0 0;box-shadow:var(--edge-l)}
.ku1-tabin b{font-size:24px;line-height:1.1}
.ku1-tabt{font-size:24px;line-height:1.1;white-space:nowrap;padding-bottom:.12em;margin-bottom:-.12em}
.ku1-tabr{grid-column:1/-1;font-size:12px;line-height:16px;color:var(--rod);margin-top:4px}
.ku1-stock{position:absolute;left:0;right:0;top:686px;bottom:0;z-index:2;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod)}
.ku1-front{position:absolute;left:-10px;right:-10px;bottom:0;height:200px;z-index:3;background:var(--ground);border:1.5px solid var(--rod);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.ku1-rod{display:block}

/* contents: guide-card edges stepping down the open page, third cut, the pages filed behind each guide */
.ku1-gds{flex:1;display:flex;flex-direction:column;margin-top:44px;min-height:0}
.ku1-gd{position:relative;flex:1 1 auto;min-height:0;margin-top:62px;padding:18px 0 0;border-top:1.5px solid var(--rod)}
.ku1-gd:first-child{margin-top:20px}
.ku1-gtab{position:absolute;bottom:100%;width:33.333%;height:62px;margin-bottom:-1.5px;display:flex;align-items:baseline;gap:14px;padding:6px 18px 0;background:var(--ground);border:1.5px solid var(--rod);border-bottom:0;border-radius:10px 10px 0 0}
.ku1-gd--l .ku1-gtab{left:0}
.ku1-gd--c .ku1-gtab{left:33.333%}
.ku1-gd--r .ku1-gtab{left:66.667%}
.ku1-gn{font-size:48px;line-height:1}
.ku1-gt{font-size:26px;line-height:1.1;white-space:nowrap;padding-bottom:.12em;margin-bottom:-.12em}
.ku1-gps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 24px}
.ku1-gps li{display:flex;align-items:baseline;gap:12px}
.ku1-gpn{flex:none;width:22px;text-align:right;font-size:13px;line-height:20px;color:var(--rod)}
.ku1-gpt{font-family:var(--body);font-size:17px;line-height:24px}
.ku1-prod{flex:none;font-family:var(--body);font-size:17px;line-height:26px;max-width:600px;margin:20px 0 72px}

/* colour: role cards edge on in a drawer. Light: one long drawer. Dark: the drawer interior, two drawers side by side */
.ku1-day,.ku1-night{flex:1;min-height:0;display:flex}
.ku1-night{gap:18px;margin:0 calc(-1 * var(--m));padding:22px var(--m) 0;background:var(--surface);--rod:var(--quiet);--face:var(--raised)}
.ku1-drw{position:relative;isolation:isolate;flex:1;min-width:0;display:flex;flex-direction:column;padding:0 12px 26px;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod);overflow:hidden}
.ku1-rcs{flex:1;display:flex;flex-direction:column}
/* each card edge is the swatch: name and note, token and value, the Aa run and the ratio printed on it in the pair itself */
.ku1-rc{position:relative;flex:1 1 0;min-height:0;display:flex;flex-direction:column}
.ku1-rb{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 168px 92px 62px;align-items:center;gap:0 12px;padding:0 14px;box-shadow:var(--edge-l)}
.ku1-rl{display:flex;flex-direction:column;font-size:12px;line-height:15px;min-width:0}
.ku1-rl b{font-size:15px;line-height:19px;font-weight:600}
.ku1-rt{display:flex;flex-direction:column}
.ku1-rt .ku1-m{line-height:15px}
.ku1-rg{display:flex;align-items:baseline;justify-content:center;gap:10px;padding:4px 6px;white-space:nowrap}
.ku1-rg i{font-style:normal;line-height:1}
.ku1-g18{font:400 18px/1 var(--ff-display)}
.ku1-g14{font:400 14px/1 var(--ff-body)}
.ku1-g12{font:400 12px/1 var(--ff-body)}
.ku1-rr{font-size:14px;font-weight:600;text-align:right;white-space:nowrap}
/* the light drawer's lean edge: name and note, one Aa for the edge roles, the ratio; its name stands at its group's cut */
.ku1-rb--lean{display:flex;gap:12px;padding:0 14px}
.ku1-rb--lean .ku1-rl{flex-direction:row;align-items:baseline;gap:10px;margin-left:calc(var(--cut) * 26%);white-space:nowrap}
.ku1-rb--lean .ku1-rr{margin-left:auto}
.ku1-tks{flex:none;max-width:682px;margin-top:14px;display:flex;flex-direction:column;gap:3px}
.ku1-tk{font-family:var(--body);font-size:13px;line-height:18px;color:var(--ink)}
.ku1-tk b{font-weight:600;margin-right:6px}
/* the action card, lifted 14 px out of the stock with its tab: its four roles printed one under the other on its face */
.ku1-rc--use{flex-grow:4.6;margin:14px -6px 0;z-index:30;padding:3px 0 0;background:var(--action);box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod)}
.ku1-rc:has(+ .ku1-rc--use){flex-grow:1.4}
.ku1-rc:has(+ .ku1-rc--use) .ku1-rb{align-items:start;padding-top:6px}
.ku1-utab{position:absolute;left:24px;bottom:100%;height:24px;display:flex;align-items:center;padding:0 14px;border-radius:6px 6px 0 0;background:var(--action);color:var(--action-label);font-size:13px;line-height:16px;font-weight:600}
.ku1-ug{flex:1;display:flex;flex-direction:column}
.ku1-ug>.ku1-rb{box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod)}
.ku1-ug>.ku1-rb+.ku1-rb{box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--action-label)}
.ku1-lip{position:absolute;left:0;right:0;bottom:0;height:20px;z-index:40;background:var(--surface);border-top:1.5px solid var(--rod)}
.ku1-day .ku1-lip{background:var(--ground)}
.ku1-drw--half{padding:12px 10px 24px}
.ku1-drw--half .ku1-rb{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-content:center;gap:4px 10px;padding:6px 12px}
.ku1-drw--half .ku1-rl{flex-direction:row;flex-wrap:wrap;gap:0 8px;align-items:baseline;font-size:13px}
.ku1-drw--half .ku1-rl b{font-size:14px}
.ku1-drw--half .ku1-rt{flex-direction:row;gap:12px;grid-column:1;grid-row:2}
.ku1-drw--half .ku1-rg{grid-column:2;grid-row:2;padding:2px 6px}
.ku1-drw--half .ku1-rr{grid-column:2;grid-row:1}
.ku1-drw--half .ku1-rc--use{flex-grow:4.2}
.ku1-pg-col--dark .ku1-trace--foot{margin-top:18px}

/* type scale: the two faces as main entries, then the scale down the card's first and second indention lines */
.ku1-faces{flex:none;display:flex;flex-direction:column;gap:20px}
.ku1-face2{display:grid;grid-template-columns:200px minmax(0,1fr);gap:0 16px;align-items:start}
.ku1-aa{display:block;line-height:.8;white-space:nowrap;padding-bottom:.1em}
.ku1-face2--d .ku1-aa{font-size:164px}
.ku1-face2--b .ku1-aa{font-size:84px;padding-top:6px}
.ku1-ff{font-size:28px;line-height:1.1;padding-bottom:.12em;margin-bottom:-.12em}
.ku1-fs{font-size:12px;line-height:16px;color:var(--rod);margin:2px 0 8px}
.ku1-cs{display:grid;grid-template-columns:repeat(26,17px);font-size:14px;line-height:20px}
.ku1-cs i{font-style:normal;text-align:center}
.ku1-wts{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:8px}
.ku1-wts li{display:flex;align-items:baseline;gap:8px;font-size:16px;line-height:22px}
.ku1-tss{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;margin-top:22px;padding:12px 0 6px;color:var(--text);border-top:1.5px solid var(--rod)}
.ku1-tss::before,.ku1-tss::after{content:'';position:absolute;top:0;bottom:0;border-left:1px solid var(--rod)}
.ku1-tss::before{left:40px}
.ku1-tss::after{left:80px}
.ku1-ts{padding-left:96px}
.ku1-tsx{display:block;max-width:586px}
.ku1-tsn{font-family:var(--chrome);font-size:12px;line-height:16px;margin-top:2px;color:var(--text)}
.ku1-tsn b{font-weight:600;margin-right:4px}
.ku1-pg-ty .ku1-trace--foot{margin-top:16px}

/* spacing: the base step at page size, then each step as an indention on a card at true size */
.ku1-sbig{flex:none;display:flex;align-items:flex-end;gap:32px;margin-top:26px}
.ku1-sn{display:block;font-size:460px;line-height:.74;padding-bottom:.06em}
.ku1-sside{padding-bottom:14px}
.ku1-su{font-size:44px;line-height:1.05;margin-bottom:14px;padding-bottom:.12em}
.ku1-lead--sp{max-width:380px;margin-bottom:0}
.ku1-pg-sp .ku1-small{margin:60px 0 12px}
/* the card at true size: a ruled margin 40 px in from its edge, each line indented its step from the rule, the measure above it */
.ku1-ins{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-around;padding:10px 24px 10px 40px;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod)}
.ku1-ins::before{content:'';position:absolute;left:40px;top:0;bottom:0;border-left:1px solid var(--rod)}
.ku1-in{display:flex;flex-direction:column;gap:5px}
.ku1-ing{display:block;width:var(--w);height:8px;border-left:1px solid var(--ink);border-right:1px solid var(--ink);box-shadow:inset 0 -1.5px 0 var(--ink)}
.ku1-in--use .ku1-ing{border-color:var(--plum);box-shadow:inset 0 -1.5px 0 var(--plum)}
.ku1-inx{display:flex;align-items:baseline;gap:12px;padding-left:var(--w);font-size:14px;line-height:20px;white-space:nowrap}
.ku1-inx .ku1-m{font-size:13px}
.ku1-inx b{font-weight:600;font-size:15px}
.ku1-inu{font-family:var(--body);color:var(--ink)}
.ku1-ctl{flex:none;font-family:var(--body);font-size:15px;line-height:23px;margin:20px 0 72px;max-width:560px}

/* radii and borders: the card corner at sixteen times, then each value on the open page with its component and a See also */
.ku1-rbig{flex:none;display:flex;align-items:flex-end;gap:32px;margin:14px 0 0}
.ku1-corner{display:block;flex:none}
.ku1-rnum{display:flex;flex-direction:column}
.ku1-ru{font-size:44px;line-height:1.05;padding-bottom:.12em;margin-bottom:-.12em}
.ku1-rcap{font-family:var(--body);font-size:15px;line-height:23px;max-width:300px;margin-top:14px}
.ku1-rsub{font-family:var(--body);font-size:15px;line-height:23px;margin-top:4px}
.ku1-specs{flex:none;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 40px;margin-top:24px;margin-bottom:32px}
.ku1-col ol{display:flex;flex-direction:column;gap:26px}
.ku1-demo{display:flex;flex-wrap:wrap;align-items:center;gap:12px;color:var(--text);background:none}
.ku1-tss{background:none}
.ku1-demo>.ui-card,.ku1-demo>.ui-list,.ku1-demo>.ui-field{flex:1 1 100%}
.ku1-specn{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin-top:10px;font-size:13px;line-height:18px}
.ku1-specn b{font-weight:600}
.ku1-specu{font-family:var(--body);font-size:13px;line-height:19px;color:var(--ink)}
.ku1-pg-rb .ku1-trace--foot{margin-top:0}

/* elevation: the grounds in section, the hairline card, and a toast floating over the list it answers */
.ku1-elv{flex:none;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:0 36px;margin-top:8px}
.ku1-sts{display:flex;flex-direction:column;color:var(--text)}
.ku1-st{display:flex;flex-direction:column;gap:2px;padding:12px 14px;margin-left:calc(var(--k) * 30px);box-shadow:inset 0 0 0 1px var(--rod);font-size:12px;line-height:16px}
.ku1-st+.ku1-st{margin-top:-1px}
.ku1-st b{font-size:14px;font-weight:600}
.ku1-elh .ku1-specu{margin-top:10px}
.ku1-elf{flex:1;min-height:0;display:flex;flex-direction:column;margin-top:30px}
.ku1-elf .ku1-specu{margin-bottom:12px}
.ku1-elf .ku1-see{margin:-6px 0 14px}
.ku1-float{position:relative;isolation:isolate;flex:1;min-height:0;display:flex;flex-direction:column;padding:4px 20px 40px;color:var(--text);background:var(--surface);box-shadow:inset 0 0 0 1px var(--rod)}
.ku1-float .ui-list{zoom:1.1}
.ku1-toastw{position:absolute;left:0;right:0;bottom:44px;z-index:1;display:flex;justify-content:center}
.ku1-toastw .ui-toast{zoom:1.2;box-shadow:var(--shadow-float)}
.ku1-elv .ku1-demo{background:none}
.ku1-sts{background:none}
.ku1-pg-el .ku1-trace--foot{margin-top:16px}

/* states: a drawer to each control, its states filed behind it, edges and tabs showing, one state lifted */
.ku1-lead--st{max-width:none}
.ku1-sds{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.12fr);gap:0 18px;margin-bottom:72px}
.ku1-scol{display:flex;flex-direction:column;gap:8px;min-width:0}
.ku1-sd{--tabw:74px;position:relative;isolation:isolate;display:flex;flex-direction:column;padding:8px 8px 0;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod)}
.ku1-scol--f .ku1-sd{flex:1}
.ku1-scs{display:flex;flex-direction:column}
.ku1-scol--f .ku1-sfront{margin-top:auto}
/* a card: its tab on its own top edge, then its face. The tab is part of the card, so it never covers the card in front */
.ku1-sc{position:relative;display:flex;flex-direction:column;padding-top:20px}
.ku1-stab{position:absolute;top:0;width:var(--tabw);height:22px;z-index:1;display:flex;align-items:center;justify-content:center;background:var(--face);border-radius:6px 6px 0 0;box-shadow:var(--edge-l);font-size:12px;line-height:16px;font-weight:600;color:var(--ink);white-space:nowrap}
.ku1-sface{flex:1;padding:4px 10px 5px;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod)}
/* the lifted card stands 14 px proud: it rises into the empty foot of the card behind it, its tab and top edge in the action colour */
.ku1-sc--pre .ku1-sface{padding-bottom:17px}
.ku1-sc--lift{margin:-14px -5px 0}
.ku1-sc--lift .ku1-sface{padding:6px 15px 8px;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 -1px 0 var(--rod),inset 0 3px 0 var(--plum)}
.ku1-sc--lift .ku1-stab{background:var(--plum);color:var(--plum-ink);box-shadow:none}
.ku1-scui{display:flex;align-items:center;min-height:36px;color:var(--text);background:none}
.ku1-scui>.ui-field{flex:none;width:150px}
.ku1-pg-st--slot .ku1-sds{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1.75fr)}
.ku1-pg-st--slot .ku1-scui>.ui-field{width:100%}
.ku1-scr{font-family:var(--body);font-size:13px;line-height:18px;margin-top:5px;color:var(--ink)}
.ku1-sfront{position:relative;z-index:30;margin:0 -8px;padding:5px 6px 5px;border-top:1.5px solid var(--rod);border-bottom:1.5px solid var(--rod);background:var(--ground);display:flex;flex-direction:column;align-items:center;gap:6px}
.ku1-shold .k-label{font-size:14px}
.ku1-snote{font-size:12px;line-height:16px;color:var(--rod);text-align:center}
`;

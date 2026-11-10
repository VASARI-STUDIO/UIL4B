// Styles for p-logo.js (theme 02, Ticket: the logo pages). Classes start tl-. The pages stand on Stock and print in Night (css-gate.js sets
// the ground, ink and faces on .pg.tk); colour comes from the brand roles, and no hex is written here.
export const cssPLogo = (ctx) => {
  const L = ctx.roles.light, D = ctx.roles.dark, action = (ctx.colours.find((c) => c.role === 'action') || ctx.colours[0]).hex;
  return `
/* the page foot: the last line sits 56 px above the page's bottom edge, so it clears the trim (foot check 54 px) */
/* shared: the tear (a horizontal perforation, drawn by perf() along the top of its holder), the stub label, the fact text sizes */
.tl-tear{position:relative;flex:none;height:0}
.tl-tear--bleed{margin:0 calc(-1 * var(--m))}
.pg.tk .tl-sl{font-size:24px;line-height:26px;letter-spacing:0.03em}
.pg.tk .tl-sl--big{font-size:56px;line-height:56px}
/* the page lead under the title, as the gate's palette page sets it: 15 px muted, 46ch */
.pg.tk .tl-lead{font-size:15px;line-height:1.5;color:var(--soft);max-width:46ch;flex:none}
.tl-ff--rule{flex-direction:column}
.tl-ff--rule dd{font-weight:500;line-height:1.4;max-width:30ch}

/* logo: the logo as large as the page allows, the strip under the tear */
.tl-lg{flex:1;min-height:0;display:flex;align-items:center}
.tl-lg__mark{display:flex;margin-left:-4px}
.tl-lgft{display:grid;grid-template-columns:136px minmax(0,1fr) 300px;gap:0 32px;align-items:start;padding-top:4px}
.tl-lgft__sn{padding-top:2px}
.tl-ff--idea dd{font-size:26px;line-height:1.35;font-weight:500;max-width:36ch;text-wrap:pretty}
.tl-ff--idea dt,.tl-ff--col dt{margin-bottom:4px}
.tl-lgft__stub{position:relative;align-self:stretch;padding-left:32px;margin-bottom:-40px;padding-bottom:40px}
.tl-ff--col{flex-direction:column;gap:16px}

/* logo versions: the open body on Stock, then two open grounds off the right edge for the light versions (no perforated edge: they are grounds, not tickets) */
.pg.tl--versions{padding-bottom:0}
.tl-vs{flex:1;min-height:0;display:flex;margin-right:calc(-1 * var(--m))}
.tl-vs__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:20px;padding:4px 32px 56px 0}
.tl-vs__top{flex:1;min-height:0;display:flex}
.tl-vs__run{display:flex;flex:none;gap:16px}
.tl-vs__cell{position:relative;flex:1 1 0;min-width:0}
.tl-vs__cell:nth-child(2){flex-grow:1.25}
.tl-vs__stub{position:relative;flex:0 0 212px;display:flex;padding:24px 24px 56px}
.tl-v{display:flex;flex-direction:column;gap:12px;min-width:0;height:100%}
.tl-v__lg{flex:1;min-height:0;display:flex;align-items:center}
.tl-v figcaption{display:flex;flex-direction:column;gap:4px}
.tl-v__w{font-size:14px;line-height:1.4}
/* the lead logo and its label read as one group: 16 px apart, the pair centred in the row under its serial */
/* the run under the tear: a logo well of one height (the stacked logo's, 64 px), logos centred in it, the names on one line below */
.tl-vs__cell .tl-v__lg{flex:none;height:64px}
.tl-v--lead{gap:16px}
.tl-v--lead .tl-v__lg{flex:none;margin-top:auto}
.tl-v--lead figcaption{margin-bottom:auto}
.tl-v--lead .tl-sl{font-size:34px;line-height:36px}
.tl-v--lead .tl-v__w{font-size:16px;max-width:36ch}

/* clear space: the zone (a 1 px muted hairline) in the middle, the two rules in opposite corners outside it */
.tl-cs{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
.tl-cs__a{position:absolute;left:0;top:4px}
.tl-cs__b{position:absolute;right:0;bottom:0}
.tl-cs .tl-ff--rule dd{font-size:20px;line-height:1.4}
.tl-zone{position:relative;flex:none;isolation:isolate}
.tl-zp{position:absolute;inset:0;box-shadow:inset 0 0 0 1px var(--soft)}
.tl-zin{position:absolute;box-shadow:inset 0 0 0 1px ${L.border}}
.tl-zlogo{position:absolute;display:flex}
.tl-dim{position:absolute;display:flex;align-items:center;font-style:normal;color:var(--ink)}
.tl-dim--v{border-left:2px solid ${action};transform:translateX(-1px)}
.tl-dim--h{border-top:2px solid ${action};justify-content:center;transform:translateY(-1px)}
.tl-dim b{font-size:30px;line-height:1;font-weight:400}
.tl-dim--v b{margin-left:10px}
.tl-dim--h b{position:absolute;bottom:8px}

/* min size: two rows, the screen minimum the big one, torn from the print minimum */
.tl-mss{flex:1;min-height:0;display:flex;flex-direction:column}
.tl-ms{display:grid;grid-template-columns:600px 200px minmax(0,1fr);gap:0 40px;align-items:center}
.tl-ms--screen{flex:1.45 1 0;min-height:0}
.tl-ms--print{flex:1 1 0;min-height:0}
.tl-ms__n{line-height:0.86;white-space:nowrap;margin-left:-6px}
.tl-ms--screen .tl-ms__n{font-size:208px}
.tl-ms--print .tl-ms__n{font-size:148px}
.tl-ms__n small{font-size:0.34em;margin-left:14px}
.tl-ms__fig{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.tl-ms__lg{display:flex}
.pg.tk .tl-ms__lg .logo-slot{font-size:11px!important;letter-spacing:0}
.tl-ruler{display:block;height:8px;border:2px solid ${action};border-top:0;box-sizing:border-box}
.tl-ms__txt{display:flex;flex-direction:column;gap:12px}
.tl-ff--ms{gap:0 32px}
.tl-ms__note{font-size:15px;line-height:1.5;max-width:36ch}

/* logo grounds: the photo off the left edge, the grounds as bands, the coloured ones off the right edge */
.tl-gr{flex:1;min-height:0;display:grid;grid-template-columns:500px minmax(0,1fr);gap:0 40px;margin-left:calc(-1 * var(--m))}
.tl-gp{display:flex;flex-direction:column;gap:12px;min-height:0;margin:0}
.tl-gp__img{position:relative;flex:1;min-height:0;overflow:hidden}
.tl-gp__img .tl-gp__fill{position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box}
.pg.tk .tl-gp__img .photo-slot{background:${L.text};color:${L.surface};padding:16px 20px 16px var(--m);font-size:13px}
.tl-gp__lg{position:absolute;left:var(--m);top:28px;display:flex}
.tl-gp__c{display:flex;flex-direction:column;gap:2px;padding-left:var(--m);font-size:14px;line-height:1.4}
.tl-gr__side{position:relative;display:flex;flex-direction:column;gap:14px;min-width:0;padding-left:32px;margin-right:calc(-1 * var(--m))}
.tl-gbs{flex:1;min-height:0;display:flex;flex-direction:column}
.tl-gb{position:relative;flex:1 1 0;min-height:0;display:flex;align-items:center;gap:40px;padding:0 var(--m) 0 0}
.tl-gb--ink{padding-left:24px;margin-left:-24px}
.tl-gb__lg{flex:0 0 220px;display:flex}
.tl-gb__c{display:flex;flex-direction:column;gap:2px;font-size:15px;line-height:1.4}

/* logo misuse: one fault drawn large, then a run of five under the one tear, split by the 16 px gutter */
.tl-mu{flex:1;min-height:0;display:flex;flex-direction:column;gap:20px}
.tl-mu__top{flex:1;min-height:0;display:grid;grid-template-columns:760px minmax(0,1fr);gap:0 40px;align-items:center}
.tl-mu__big{margin:0;display:flex;align-items:center;justify-content:center;height:100%}
.tl-mu__art{display:flex}
.tl-mu__say{display:flex;flex-direction:column;gap:10px}
.tl-mu__why{font-size:20px;line-height:1.4;font-weight:500;max-width:28ch;margin-bottom:10px}
.tl-mu__run{display:flex;flex:none;height:236px;gap:16px}
.tl-mi{position:relative;flex:1 1 0;min-width:0;margin:0;display:flex;flex-direction:column;gap:10px}
.tl-mi--bu{flex-grow:1.3}
.tl-mi__art{position:relative;height:104px;display:flex;align-items:center;justify-content:center;overflow:hidden;isolation:isolate}
.tl-mi--bu .tl-mi__art{justify-content:center}
.tl-mi figcaption{display:flex;flex-direction:column;gap:4px;font-size:14px;line-height:1.4}
.pg.tk .tl-mu .logo-slot{font-size:12px!important;letter-spacing:0}
/* slot edition: the recoloured frame keeps its wrong-colour edge, but its label prints in Night so it reads */
.pg.tk .tl-mi--re .logo-slot{color:var(--ink)!important}
.tl-busy{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.tl-onbusy{position:relative;z-index:1;display:flex}
.tl-boxed{border:2px solid var(--ink);padding:14px 16px;display:flex}
`;
};

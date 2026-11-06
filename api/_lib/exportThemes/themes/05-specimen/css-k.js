// Styles for guidelines-k.js (classes start k-): the card catalogue. Page 794 x 1123, margin 56.
// One elevation language: 1 px and 1.5 px Rod lines for drawers, card edges and the rod hole; no shadows, no fills that only decorate.
// Cards are White stock or printed in a brand colour, always at 5 : 3 when shown whole. Goudy Bookletter 1911 at 24 px and over only.
export function cssK(ctx) {
  const L = ctx.roles.light, mono = ctx.brand.fonts.mono;
  return `
.pg{--rod:${L.quiet};--face:${L.raised};--plum:${L.action};--plum-ink:${L.actionLabel};--kmono:'${mono.family}',monospace}
.k-mono{font-family:var(--kmono);font-weight:400;letter-spacing:0}
.k-disp{font-family:var(--display);font-weight:400;letter-spacing:0}
.k-hole{display:block;flex:none}

/* the open sheet: call number and title, the run head, the rod hole at the foot */
.k-sheet{display:flex;flex-direction:column;padding:40px var(--m) 0}
.k-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex:none}
.k-call{display:block;font-size:13px;line-height:18px;color:var(--rod)}
.k-ttl{font-family:var(--display);font-weight:400;font-size:44px;line-height:1.05;margin-top:2px;padding-bottom:.12em;margin-bottom:-.12em}
.k-rh{font-size:12px;line-height:18px;color:var(--rod);margin:0}
.k-ft{position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:center}
.k-fo{position:absolute;right:var(--m);top:0;font-size:12px;line-height:16px;color:var(--ink)}
.k-lead{font-family:var(--body);font-size:17px;line-height:26px;max-width:590px;margin-bottom:28px;flex:none}
.k-lead--s{font-size:15px;line-height:23px;max-width:620px;margin-bottom:40px}
.k-small{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);max-width:620px;margin-top:20px;flex:none}
.k-trace{font-family:var(--body);font-size:12px;line-height:15px}

/* cover: the guide card standing in the top drawer, the cabinet front below it */
.k-cover{background:var(--ground)}
.k-guide{position:absolute;left:97px;top:112px;width:600px;height:360px;z-index:1}
.k-tab{position:absolute;bottom:100%;left:344px;width:216px;height:64px;margin-bottom:-1px;display:flex;align-items:center;justify-content:center;background:var(--plum);color:var(--plum-ink);border-radius:10px 10px 0 0;font-family:var(--display);font-size:42px;line-height:1;padding:0 12px 4px}
.k-tabname{white-space:nowrap}
.k-face{position:absolute;inset:0;background:var(--face);box-shadow:inset 0 0 0 1px var(--rod);padding:26px 30px}
.k-face .k-callno{position:absolute;left:30px;top:28px;display:flex;flex-direction:column;font-size:14px;line-height:20px;color:var(--ink)}
.k-entry{margin-left:150px;padding-top:2px}
.k-head{display:block;margin-bottom:10px}
.k-head .logo-slot{border-color:var(--rod)}
.k-title{display:flex;flex-direction:column;margin-left:28px}
.k-gt{font-family:var(--display);font-size:34px;line-height:1.08;padding-bottom:.12em;margin-bottom:-.12em}
.k-gl{font-family:var(--body);font-size:17px;line-height:26px;margin-top:4px}
.k-coll{font-family:var(--body);font-size:14px;line-height:21px;color:var(--rod);margin:6px 0 0 28px}
.k-face .k-trace{position:absolute;left:30px;right:30px;bottom:54px;font-size:13px;line-height:18px;color:var(--rod)}
.k-hole--card{position:absolute;left:50%;bottom:22px;transform:translateX(-50%)}
.k-cab{position:absolute;left:var(--m);right:var(--m);top:460px;bottom:var(--m);z-index:2;background:var(--ground);border:1.5px solid var(--rod);padding:8px 8px 0;display:flex;flex-direction:column}
.k-drawers{flex:1;display:flex;flex-direction:column;gap:6px}
.k-dr{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1.5px solid var(--rod)}
.k-holder{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border:1.5px solid var(--rod);background:var(--ground)}
.k-screw{display:block;width:5px;height:5px;border-radius:50%;border:1.5px solid var(--rod);flex:none}
.k-label{display:flex;align-items:baseline;gap:8px;height:22px;padding:0 10px;background:var(--face);font-family:var(--body);font-size:15px;line-height:22px;color:var(--ink);white-space:nowrap}
.k-label b{font-weight:600}
.k-range{font-size:12px;color:var(--rod)}
.k-pull{display:block}
.k-plinth{display:block;height:14px;margin:8px -8px 0;border-top:1.5px solid var(--rod)}

/* palette: a drawer seen from above, guide cards back to front, largest share at the back */
.k-drawer{position:relative;isolation:isolate}
.k-drawer--pal{flex:1;margin:0 0 60px;padding:34px 13px 0;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod);overflow:hidden}
.k-gcs{display:flex;flex-direction:column;height:100%}
.k-gc{position:relative;flex:none;height:116px;background:var(--c);color:var(--i);box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.k-gc--tall{height:300px}
.k-gc:last-child{flex:1 1 auto;height:auto}
.k-gtab{position:absolute;bottom:100%;height:28px;display:flex;align-items:center;padding:0 8px;background:var(--c);border-radius:7px 7px 0 0;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod);font-size:12px;line-height:16px;overflow:hidden}
.k-gface{padding:16px 22px 0}
.k-gname{display:flex;align-items:baseline;gap:14px}
.k-gname b{font-size:34px;line-height:1.1}
.k-gc--tall .k-gname b{font-size:104px;line-height:1}
.k-gc--tall .k-gface{padding-top:30px}
.k-ghex{font-size:13px;line-height:18px}
.k-glands{font-family:var(--body);font-size:15px;line-height:22px;max-width:470px;margin-top:4px}
.k-gc--tall .k-glands{font-size:17px;line-height:26px;margin-top:14px}
.k-lip{position:absolute;left:0;right:0;bottom:0;height:22px;z-index:40;background:var(--ground);border-top:1.5px solid var(--rod)}

/* colour values: per colour, the card lifted out beside its drawer of ten edges */
.k-rows{display:flex;flex-direction:column;gap:10px;flex:none}
.k-pg-val .k-lead{margin-bottom:14px}
.k-pg-val .k-small{margin-top:12px}
.k-pg-val .k-hd{margin-bottom:14px}
.k-row{display:flex;gap:22px;align-items:stretch}
.k-card{position:relative;flex:none;width:300px;height:180px;padding:11px 13px;box-shadow:inset 0 0 0 1px var(--rod);display:grid;grid-template-columns:160px minmax(0,1fr);grid-template-rows:auto auto 1fr;column-gap:10px;align-content:start}
.k-card .k-callno{display:flex;flex-direction:column;font-size:11px;line-height:14px}
.k-chead{min-width:0}
.k-cname{font-size:26px;line-height:1;margin-top:-1px;padding-bottom:.12em;margin-bottom:-.12em}
.k-subj{font-family:var(--body);font-size:12px;line-height:15px;margin-top:4px}
.k-note{grid-column:1/-1;font-family:var(--body);font-size:12px;line-height:15px;margin-top:6px}
.k-card .k-trace{grid-column:1/-1;margin-top:5px}
.k-card .k-hole--card{bottom:6px}
.k-drawer--ramp{flex:1;padding:4px 10px 7px;border:1.5px solid var(--rod);border-top:0}
.k-edges{display:flex;flex-direction:column;gap:1px}
.k-edge{height:14px;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 6px;font-size:11px;line-height:12px;box-shadow:inset 0 1px 0 var(--rod)}
.k-sn{display:block;min-width:28px;padding:0 4px;background:var(--face);color:var(--ink);box-shadow:inset 0 0 0 1px var(--rod)}
.k-edge--base{height:24px;margin-left:-33px;padding-left:39px;font-weight:600;box-shadow:inset 0 0 0 1px var(--rod)}
.k-lift{font-weight:400}

/* contrast: one card per used pair, edge on in a drawer, the front card holds the unused pairs */
.k-drawer--pairs{flex:1;margin:0 0 60px;padding:0 12px;border-left:1.5px solid var(--rod);border-right:1.5px solid var(--rod);overflow:hidden}
.k-pcs{display:flex;flex-direction:column;height:100%}
.k-pc{position:relative;flex:none;height:74px;display:flex;align-items:center;gap:20px;padding:0 18px;box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.k-pl{flex:none;width:178px;display:flex;flex-direction:column}
.k-ratio{font-size:28px;line-height:1.05;white-space:nowrap}
.k-pn,.k-pu{font-family:var(--body);font-size:12px;line-height:15px}
.k-pn{font-weight:600;margin-top:3px}
.k-run{display:flex;align-items:baseline;gap:18px;min-width:0}
.k-ws{display:flex;flex-direction:column;align-items:flex-start;flex:none}
.k-w{display:block;font-family:var(--body);font-weight:500;line-height:1;white-space:nowrap}
.k-w.k-disp{font-family:var(--display);font-weight:400}
.k-run .ph-c{font-size:11px}
.k-run:has(.ph-c){gap:8px}
.k-ws i{font-style:normal;font-size:11px;line-height:14px;margin-top:4px}
.k-ws--min i{font-weight:600;box-shadow:inset 0 -1.5px 0 currentColor;padding-bottom:2px}
.k-pc--front{flex:1 1 auto;height:auto;display:block;padding:18px 18px 0;background:var(--face);color:var(--ink)}
.k-nuh{font-size:26px;line-height:1.1}
.k-trace--nu{font-size:13px;line-height:19px;margin-top:8px;max-width:600px}
`;
}

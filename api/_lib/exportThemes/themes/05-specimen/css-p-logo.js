// Styles for p-logo.js (classes start kl-): the logo pages as open catalogue sheets. Page 794 x 1123, margin 56.
// Same elevation language as the gate (css-k.js): 1 px Rod for the card's ruling, 1.5 px Rod for drawers and holders, no shadows that lift.
// The first indention is 96 px from the page edge (margin + 40), the second 136 px (margin + 80); type at an indention starts 8 px past its line.
// Goudy Bookletter 1911 at 24 px and over only.
export function cssPLogo(ctx) {
  return `
.kl-pg .kl-cap{font-family:var(--chrome);font-size:12px;line-height:16px;color:var(--rod);margin-top:8px}
.kl-pg i:where(:not([class])){font-style:italic}
.kl-hr{position:absolute;left:var(--m);right:var(--m);height:1px;background:var(--rod)}
.kl-ind{position:absolute;bottom:56px;width:1px;background:var(--rod)}
.kl-tr{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink)}
.kl-see{font-family:var(--body);font-size:14px;line-height:21px;color:var(--ink);margin-top:8px}
.kl-pg .k-lead{text-wrap:pretty}

/* logo: the main entry at the first indention; the body (idea, size run, tracings, See also) hangs from the second, its left edge the line */
.kl-main{margin:40px 0 0 48px;flex:none}
.kl-main>svg,.kl-main>.logo-slot{display:block}
.kl-body{flex:1;display:flex;flex-direction:column;margin:32px 0 56px 79px;padding:4px 0 0 8px;border-left:1px solid var(--rod)}
.kl-idea{max-width:520px;font-family:var(--body);font-size:17px;line-height:26px;flex:none}
.kl-run{margin-top:40px;display:flex;align-items:flex-end;gap:16px;flex:none}
.kl-step{flex:none;display:flex;flex-direction:column}
.kl-step .kl-cap{width:0;min-width:100%;white-space:nowrap}
.kl-runcap{margin-top:12px;flex:none}
.kl-step>svg,.kl-step>.logo-slot{display:block}
.kl-foot{margin:auto 0 16px;max-width:540px;padding-top:32px;flex:none}

/* versions: guide cards in the version's ground. c. 1 is the main entry across the top; below, two drawers side by side,
   the one-colour and reversed copies of the same artwork (tabs in three cuts), and the other shapes (tabs in two cuts) */
.kl-pg .kl-vlead{margin-bottom:0;max-width:none}
.kl-gds{display:flex;flex-direction:column;gap:16px;flex:none;min-width:0}
.kl-drw{display:grid;grid-template-columns:400px minmax(0,1fr);gap:24px;align-items:start;margin-top:16px;flex:none}
.kl-gd{position:relative;margin-top:22px;background:var(--g);color:var(--n)}
.kl-gd--pale{box-shadow:inset 0 0 0 1px var(--rod)}
.kl-gtab{position:absolute;bottom:100%;width:33.3%;height:23px;margin-bottom:-1px;display:flex;align-items:center;gap:6px;padding:0 10px;background:var(--g);color:var(--n);border-radius:7px 7px 0 0;font-family:var(--chrome);font-size:12px;line-height:16px;white-space:nowrap}
.kl-gd--main .kl-gtab{width:25%}
.kl-gds--shape .kl-gtab{width:50%}
.kl-gd--pale .kl-gtab{box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.kl-gtab b{font-weight:600}
.kl-gbody{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:10px 14px 8px}
.kl-vrun{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 16px}
.kl-vs{display:flex;flex-direction:column;align-items:flex-start;gap:4px;flex:none}
.kl-vs>svg,.kl-vs>.logo-slot{display:block}
.kl-vs i{font-style:normal;font-family:var(--chrome);font-size:11px;line-height:14px}
.kl-vs i.kl-vmin{font-weight:600}
.kl-when{font-family:var(--body);font-size:13px;line-height:18px;max-width:380px}
.kl-gd--main .kl-gbody{gap:10px;padding:16px 20px 12px}
${ctx.edition === 'slot' ? `.kl-pg-ver .kl-gbody{padding:8px 14px 6px}
.kl-pg-ver .kl-gd--main .kl-gbody{padding:12px 20px 8px}` : ''}
.kl-gd--main .kl-vrun{gap:24px}
.kl-gds--shape .kl-vrun{gap:10px 12px}
.kl-gd--main .kl-when{max-width:520px;font-size:15px;line-height:22px}


/* clear space: the full-size zone hangs between the two indention lines, the smaller two follow on the first */
.kl-pg .kl-clead{margin-bottom:56px}
.kl-cz{position:relative;margin:0 0 0 40px;flex:none}
.kl-cz figcaption{margin-top:12px}
.kl-cz--big figcaption{margin-top:40px}
.kl-ind--z{top:-32px;bottom:24px;font-style:normal}
.kl-ind--z b{position:absolute;bottom:100%;left:0;margin-bottom:4px;transform:translateX(-50%);font-family:var(--chrome);font-size:12px;line-height:16px;font-weight:600;color:var(--ink)}
.kl-field{position:absolute;top:-32px;left:0;right:0;height:1px;background:var(--rod)}
.kl-zone{position:relative;box-shadow:inset 0 0 0 1px var(--rod)}
.kl-zin{position:absolute}
.kl-zin>svg,.kl-zin>.logo-slot{display:block}
.kl-dim{position:absolute;display:block;background:var(--plum)}
.kl-dim--v{width:1.5px;transform:translateX(-50%)}
.kl-dim--h{height:1.5px;transform:translateY(-50%)}
.kl-dim b{position:absolute;font-family:var(--chrome);font-size:13px;line-height:16px;font-weight:600;font-style:italic;color:var(--ink)}
.kl-dim--v b{left:6px;top:50%;transform:translateY(-50%)}
.kl-dim--h b{bottom:5px;left:50%;transform:translateX(-50%)}
.kl-dim.kl-dim--out{transform:none}
.kl-czs{display:flex;align-items:flex-end;gap:56px;margin:48px 0 0;flex:none}
.kl-czs .kl-cz{margin-left:40px}
.kl-czs .kl-cz+.kl-cz{margin-left:0}
.kl-tr--cs{margin:auto 0 72px 48px;padding-top:32px;max-width:560px;flex:none}

/* minimum size: the headline large, then a two-drawer cabinet front, each label holder carrying the logo at actual size */
.kl-never{font-size:64px;line-height:1.06;max-width:640px;text-wrap:balance;margin-top:32px;padding-bottom:.12em;margin-bottom:-.12em;flex:none}
.kl-pg .kl-mlead{margin-top:28px}
.kl-cab{margin:auto 0 72px;border:1.5px solid var(--rod);padding:8px 8px 0;flex:none}
.kl-drs{display:flex;flex-direction:column;gap:6px}
.kl-dr{display:grid;grid-template-columns:minmax(0,1fr) 260px;align-items:center;border:1.5px solid var(--rod);min-height:220px}
.kl-front{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 0 24px}
.kl-holder{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1.5px solid var(--rod)}
.kl-screw{display:block;width:5px;height:5px;border-radius:50%;border:1.5px solid var(--rod);flex:none}
.kl-label{display:block;box-sizing:content-box;padding:10px 14px;background:var(--face)}
.kl-label>svg,.kl-label>.logo-slot{display:block}
.kl-ruler{display:block;box-sizing:border-box;height:7px;border:1px solid var(--ink);border-top:0}
.kl-pull{display:block;margin-top:14px}
.kl-drtext{padding:24px 28px 24px 0}
.kl-drh{font-size:28px;line-height:1.1;padding-bottom:.12em;margin-bottom:-.12em}
.kl-drn{font-family:var(--body);font-size:15px;line-height:22px;margin-top:6px}
.kl-dims{font-family:var(--chrome);font-size:13px;line-height:18px;font-weight:600;margin-top:10px}
.kl-plinth{display:block;height:14px;margin:8px -8px 0;border-top:1.5px solid var(--rod)}

/* grounds: the photograph large on the left, the colour grounds down the right, each with its See reference */
.kl-pg .kl-glead{margin-bottom:24px}
.kl-gr{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 248px;gap:32px;margin-bottom:72px}
.kl-ph{display:flex;flex-direction:column;min-height:0}
.kl-phf{position:relative;flex:1;min-height:0;isolation:isolate}
.kl-phf>.kl-fill{position:absolute;inset:0;width:100%;height:100%}
.kl-phf>.kl-fill.photo-slot{background:var(--ink);color:var(--ground)}
.kl-onphoto{position:absolute;left:28px;top:28px;z-index:1}
.kl-onphoto>*{display:block}
.kl-ph figcaption{flex:none;max-width:400px}
.kl-ges{display:flex;flex-direction:column;justify-content:space-between}
.kl-gp{height:100px;display:flex;align-items:center;justify-content:center;background:var(--g)}
.kl-getab{width:60%;height:23px;margin-bottom:-1px;display:flex;align-items:center;padding:0 10px;background:var(--g);color:var(--n);border-radius:7px 7px 0 0;font-family:var(--chrome);font-size:12px;line-height:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kl-getab--r{margin-left:40%}
.kl-ge--pale .kl-getab{box-shadow:inset 1px 0 0 var(--rod),inset -1px 0 0 var(--rod),inset 0 1px 0 var(--rod)}
.kl-ge--pale .kl-gp{box-shadow:inset 0 0 0 1px var(--rod)}
.kl-gp>*{display:block}
.kl-geh{font-size:24px;line-height:1.15;margin-top:12px;padding-bottom:.12em;margin-bottom:-.12em}
.kl-ged{font-family:var(--body);font-size:14px;line-height:20px;margin-top:8px}
.kl-ph .kl-ged{margin-top:4px}

/* misuse: the busy ground large, then the five others, each drawing on the open page with the fault and the reason beside it */
.kl-pg .kl-mslead{margin-bottom:20px}
.kl-mis{display:flex;flex-direction:column;gap:10px;flex:none}
.kl-mi--big{margin-bottom:14px}
.kl-md.kl-md--busy{position:relative;height:160px;display:flex;align-items:center;justify-content:center;overflow:hidden;isolation:isolate}
.kl-shelf{position:absolute;inset:0;display:flex;gap:2px;align-items:stretch}
.kl-shelf i{display:block;flex:none}
.kl-onbusy{position:relative;z-index:1;display:block}
.kl-onbusy>*{display:block}
.kl-onbusy .logo-slot{background:var(--ground)}
.kl-mi--big .kl-mh{font-size:28px;margin-top:12px}
.kl-mi:not(.kl-mi--big){display:grid;grid-template-columns:220px minmax(0,1fr);gap:32px;align-items:center}
.kl-md{height:84px;display:flex;align-items:center;justify-content:flex-start}
.kl-md>div,.kl-md>svg,.kl-md>.logo-slot{flex:none}
.kl-md svg{display:block}
.kl-boxed{border:2px solid var(--ink);padding:12px 18px;display:block}
.kl-mh{font-size:24px;line-height:1.1;padding-bottom:.12em;margin-bottom:-.12em}
.kl-mr{font-family:var(--body);font-size:14px;line-height:20px;margin-top:4px;max-width:440px}
`;
}

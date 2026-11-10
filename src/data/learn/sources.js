// The Learn articles' source lists, keyed by slug — plain JavaScript, no JSX.
//
// ── Why the lists are not on the article records ───────────────────────────
//
// src/data/learnIndex.js is imported by routeMetaMap.js, toolTree.js and
// menuModel.js, so it ships in the entry chunk that every visitor downloads
// on every route. The source lists are the bulk of an article record (the
// longest has dozens of entries) and are read in exactly one place, the lazy
// Learn article page. Keeping them here puts them in that page's chunk and
// leaves the entry chunk with only what the menu and the route metadata need.
//
// Import this module from the article page and from tests or Node scripts, and
// from nothing the entry chunk reaches: tests/unit/learn-articles.test.js pins the
// article page as the only importer.
//
// Each list is every specification and document the prose cites, in the order
// it cites them. They live here rather than beside the prose so the article
// files export nothing but a component (an array export beside a component
// trips react-refresh).

export const LEARN_SOURCES = Object.freeze({
  'colour-contrast': [
    { label: 'WCAG 2.2 — SC 1.4.3 Contrast (Minimum)', href: 'https://www.w3.org/TR/WCAG22/#contrast-minimum' },
    { label: 'WCAG 2.2 — SC 1.4.6 Contrast (Enhanced)', href: 'https://www.w3.org/TR/WCAG22/#contrast-enhanced' },
    { label: 'WCAG 2.2 — SC 1.4.11 Non-text Contrast', href: 'https://www.w3.org/TR/WCAG22/#non-text-contrast' },
    { label: 'WCAG 2.2 — SC 1.4.1 Use of Color', href: 'https://www.w3.org/TR/WCAG22/#use-of-color' },
    { label: 'WCAG 2.2 — definitions: relative luminance, contrast ratio, large scale text', href: 'https://www.w3.org/TR/WCAG22/#dfn-relative-luminance' },
    { label: 'Understanding SC 1.4.3 — the rationale for 4.5:1 and the pt/px conversion', href: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html' },
    { label: 'w3c/wcag#308 — the 0.03928 to 0.04045 correction', href: 'https://github.com/w3c/wcag/issues/308' },
  ],
  'type-scales': [
    { label: 'WCAG 2.2 — SC 1.4.4 Resize Text', href: 'https://www.w3.org/TR/WCAG22/#resize-text' },
    { label: 'WCAG 2.2 — SC 1.4.12 Text Spacing', href: 'https://www.w3.org/TR/WCAG22/#text-spacing' },
    { label: 'Bringhurst, The Elements of Typographic Style — 2.1.2, Choose a comfortable measure', href: 'http://webtypography.net/2.1.2' },
    { label: 'MDN — CSS length units, including the ch definition and its 0.5em fallback', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/length' },
    { label: 'MDN — clamp()', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/clamp' },
  ],
  'typeface-metrics': [
    { label: 'CSS Fonts Module Level 4 — the font-size-adjust property and the aspect value', href: 'https://www.w3.org/TR/css-fonts-4/#font-size-adjust-prop' },
    { label: 'CSS Fonts Module Level 4 — the font-weight property', href: 'https://www.w3.org/TR/css-fonts-4/#font-weight-prop' },
    { label: 'CSS Fonts Module Level 4 — the font-synthesis-weight property', href: 'https://www.w3.org/TR/css-fonts-4/#font-synthesis-weight' },
    { label: 'CSS Fonts Module Level 5 — font-size-adjust and the named font metrics', href: 'https://www.w3.org/TR/css-fonts-5/#font-size-adjust-prop' },
    { label: 'WCAG 2.2 — SC 1.4.4 Resize Text', href: 'https://www.w3.org/TR/WCAG22/#resize-text' },
    { label: 'WCAG 2.2 — SC 1.4.12 Text Spacing', href: 'https://www.w3.org/TR/WCAG22/#text-spacing' },
    { label: 'HTML Living Standard — TextMetrics, the canvas ink extents this page measures with', href: 'https://html.spec.whatwg.org/multipage/canvas.html#textmetrics' },
  ],
  'font-loading': [
    { label: 'CSS Fonts Module Level 4 — the font display timeline', href: 'https://www.w3.org/TR/css-fonts-4/#font-display-timeline' },
    { label: 'CSS Fonts Module Level 4 — the font-display descriptor', href: 'https://www.w3.org/TR/css-fonts-4/#font-display-desc' },
    { label: 'CSS Fonts Module Level 4 — the unicode-range descriptor', href: 'https://www.w3.org/TR/css-fonts-4/#unicode-range-desc' },
    { label: 'CSS Fonts Module Level 5 — the size-adjust descriptor', href: 'https://www.w3.org/TR/css-fonts-5/#size-adjust-desc' },
    { label: 'CSS Fonts Module Level 5 — ascent-override, descent-override and line-gap-override', href: 'https://www.w3.org/TR/css-fonts-5/#font-metrics-override-desc' },
    { label: 'CSS Font Loading Module Level 3 — FontFaceSet, which the status column reads', href: 'https://www.w3.org/TR/css-font-loading-3/#FontFaceSet-interface' },
  ],
  'colour-spaces': [
    { label: 'CSS Color Module Level 4 — oklab() and oklch()', href: 'https://www.w3.org/TR/css-color-4/#ok-lab' },
    { label: 'CSS Color Module Level 5 — color-mix()', href: 'https://www.w3.org/TR/css-color-5/#color-mix' },
    { label: 'Björn Ottosson — A perceptual color space for image processing (Oklab, 2020)', href: 'https://bottosson.github.io/posts/oklab/' },
    { label: 'MDN — the oklch() colour function', href: 'https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch' },
    { label: 'WCAG 2.2 — relative luminance, for the contrast figures used here', href: 'https://www.w3.org/TR/WCAG22/#dfn-relative-luminance' },
  ],
  'theme-systems': [
    { label: 'Media Queries Level 5 — prefers-color-scheme', href: 'https://www.w3.org/TR/mediaqueries-5/#prefers-color-scheme' },
    { label: 'Media Queries Level 5 — prefers-contrast', href: 'https://www.w3.org/TR/mediaqueries-5/#prefers-contrast' },
    { label: 'Media Queries Level 5 — forced-colors', href: 'https://www.w3.org/TR/mediaqueries-5/#forced-colors' },
    { label: 'CSS Color Adjustment Level 1 — the color-scheme property', href: 'https://www.w3.org/TR/css-color-adjust-1/#color-scheme-prop' },
    { label: 'WCAG 2.2 — SC 1.4.1 Use of Color', href: 'https://www.w3.org/TR/WCAG22/#use-of-color' },
    { label: 'WCAG 2.2 — SC 1.4.11 Non-text Contrast', href: 'https://www.w3.org/TR/WCAG22/#non-text-contrast' },
    { label: 'WCAG 2.2 — definition: relative luminance, for the linearisation step', href: 'https://www.w3.org/TR/WCAG22/#dfn-relative-luminance' },
  ],
  'brand-colour': [
    { label: 'WCAG 2.2 — SC 1.4.3 Contrast (Minimum)', href: 'https://www.w3.org/TR/WCAG22/#contrast-minimum' },
    { label: 'WCAG 2.2 — SC 1.4.11 Non-text Contrast', href: 'https://www.w3.org/TR/WCAG22/#non-text-contrast' },
    { label: 'WCAG 2.2 — SC 1.4.1 Use of Color', href: 'https://www.w3.org/TR/WCAG22/#use-of-color' },
    { label: 'WCAG 2.2 — definitions: relative luminance and contrast ratio', href: 'https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio' },
    { label: 'CSS Color Module Level 4 — the HSL notation', href: 'https://www.w3.org/TR/css-color-4/#the-hsl-notation' },
  ],
  'improving-value-proposition': [
    { label: 'Norton, Mochon and Ariely (2012) — The IKEA effect: when labor leads to love', href: 'https://dash.harvard.edu/handle/1/12136084' },
    { label: 'Marsh, Kanngiesser and Hood (2018) — Ontogeny and mechanisms of the IKEA effect', href: 'https://eprints.nottingham.ac.uk/47966/' },
    { label: 'Northcraft and Neale (1987) — Experts, amateurs and real estate', href: 'https://ideas.repec.org/a/eee/jobhdp/v39y1987i1p84-97.html' },
    { label: 'Schley and Weingarten — Fifty years of anchoring effects: a meta-analysis', href: 'https://pubsonline.informs.org/doi/fpi/10.1287/mnsc.2023.03238' },
    { label: 'Klein and others (2014) — Many Labs 1: investigating variation in replicability', href: 'https://research.tilburguniversity.edu/en/publications/investigating-variation-in-replicability-a-many-labs-replication-/' },
    { label: 'Ariely, Loewenstein and Prelec (2003) — Coherent arbitrariness', href: 'https://scholars.duke.edu/publication/859259' },
    { label: 'Fudenberg, Levine and Maniadis (2012) — anchoring and willingness to pay, American Economic Journal: Microeconomics', href: 'https://www.aeaweb.org/articles/pdf/doi/10.1257/mic.4.2.131' },
    { label: 'JCK (2013) — J.C. Penney lost nearly US$1 billion in 2012', href: 'https://www.jckonline.com/editorial-article/jc-penney-lost-nearly-1-billion-in-2012/' },
    { label: 'Huber, Payne and Puto (1982) — Asymmetrically dominated alternatives', href: 'https://scholars.duke.edu/publication/904415' },
    { label: 'Yang and Lynn (2014) — 91 attempts to find the attraction effect, Journal of Marketing Research', href: 'https://ecommons.cornell.edu/entities/publication/0c5b506a-f8d3-4a4c-8825-b2c715e9f956' },
    { label: 'Frederick, Lee and Baskin (2014) — The limits of attraction', href: 'https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/The-Limits-of-Attraction.pdf' },
    { label: 'Trendl, Stewart and Mullett (2021) — A zero attraction effect in naturalistic choice', href: 'https://wrap.warwick.ac.uk/id/eprint/143538' },
    { label: 'Cai, Chen and Fang (2009) — Observational learning, a randomised restaurant field experiment, American Economic Review', href: 'https://www.nber.org/papers/w13516' },
    { label: 'Tversky and Kahneman (1981) — The framing of decisions, Science', href: 'https://casact.org/abstract/framing-decisions-and-psychology-choice' },
    { label: 'Kühberger (1998) — Framing meta-analysis of 136 studies, Organizational Behavior and Human Decision Processes', href: 'https://ideas.repec.org/a/eee/jobhdp/v75y1998i1p23-55.html' },
    { label: 'O’Keefe and Jensen — The relative effectiveness of gain-framed and loss-framed messages', href: 'https://scholars.cityu.edu.hk/en/publications/the-relative-effectiveness-of-gain-framed-and-loss-framed-message/' },
    { label: 'Brown and others (2024) — Meta-analysis of loss aversion, Journal of Economic Literature', href: 'https://www.aeaweb.org/doi/10.1257/jel.20221698' },
    { label: 'Gal and Rucker (2018) — The loss of loss aversion', href: 'https://papers.ssrn.com/abstract=3049660' },
    { label: 'Mrkva and others (2020) — Moderating loss aversion', href: 'https://researchportal.bath.ac.uk/en/publications/moderating-loss-aversion-loss-aversion-has-moderators-but-reports/' },
    { label: 'Duolingo (2022) — How Duolingo’s streak builds habit', href: 'https://blog.duolingo.com/how-duolingo-streak-builds-habit' },
    { label: 'Worchel, Lee and Adewole (1975) — Supply and demand and object value, Journal of Personality and Social Psychology', href: 'https://stafforini.com/works/worchel-1975-effects-supply-demand/' },
    { label: 'Barton, Zlatevska and Oppewal (2022) — Scarcity tactics in marketing: a meta-analysis', href: 'https://research.monash.edu/en/publications/scarcity-tactics-in-marketing-a-meta-analysis-of-product-scarcity/' },
    { label: 'Luguri and Strahilevitz (2021) — Shining a light on dark patterns', href: 'https://academic.oup.com/jla/article/13/1/43/6180579' },
    { label: 'Mathur and others (2019) — Dark patterns at scale', href: 'https://arxiv.org/abs/1907.07032' },
    { label: 'Kahneman, Knetsch and Thaler (1990) — Experimental tests of the endowment effect', href: 'https://ideas.repec.org/a/ucp/jpolec/v98y1990i6p1325-48.html' },
    { label: 'Yechiam, Ashby and Pachur (2017) — Who’s biased? A meta-analysis of buyer-seller differences', href: 'https://cris.iucc.ac.il/en/publications/whos-biased-a-meta-analysis-of-buyer-seller-differences-in-the-pr/' },
    { label: 'Sahni, Miller and Strulov-Shlain — Auto-renew newspaper field experiment (Stanford GSB summary)', href: 'https://www.gsb.stanford.edu/index%2Ephp/insights/auto-renew-snags-new-subscribers-its-not-good-way-keep-them' },
    { label: 'Zhang and Duan (2025) — Trial length field experiment, Frontiers in Psychology', href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12217587/' },
    { label: 'Anderson and Magruder (2012) — Yelp regression discontinuity study, Economic Journal', href: 'https://doi.org/10.1111/j.1468-0297.2012.02512.x' },
    { label: 'Babić Rosario and others (2016) — Electronic word-of-mouth meta-analysis, Journal of Marketing Research', href: 'https://digitalcommons.du.edu/marketing_fac/2' },
    { label: 'Muchnik, Aral and Taylor (2013) — Social influence bias (MIT News summary)', href: 'https://news.mit.edu/2013/how-online-ratings-affect-your-judgment-0808' },
    { label: 'Goldstein, Cialdini and Griskevicius (2008) — A room with a viewpoint', href: 'https://ideas.repec.org/a/oup/jconrs/v35y2008i3p472-482.html' },
    { label: 'Carlsson and others (2016) — Bayesian meta-analysis: the wrong way and the right way (blog post announcing the towel-reuse re-analysis)', href: 'https://replicationindex.com/2016/11/28/bayesian-meta-analysis-the-wrong-way-and-the-right-way/' },
    { label: 'Schultz and others (2007) — The constructive, destructive and reconstructive power of social norms', href: 'https://cbsm.com/articles/32578-the-constructive-destructive-and-reconstructive-power-of-social-norms' },
    { label: 'Spiegel Research Center (2021) — Star ratings and review content', href: 'https://spiegel.medill.northwestern.edu/star-ratings-and-review-content/' },
    { label: 'Nisbett and Wilson (1977) — The halo effect', href: 'https://deepblue.lib.umich.edu/items/da93fb79-74ef-4ff0-a1fe-da088de2dc42' },
    { label: 'Moran (2024) — The aesthetic-usability effect, Nielsen Norman Group (reporting Kurosu and Kashimura 1995)', href: 'https://www.nngroup.com/articles/aesthetic-usability-effect/' },
    { label: 'Tractinsky, Katz and Ikar (2000) — What is beautiful is usable', href: 'https://academic.oup.com/iwc/article/13/2/127/898608' },
    { label: 'Tuch and others (2012) — Is beautiful really usable?', href: 'https://doi.org/10.1016/j.chb.2012.03.024' },
    { label: 'Samuelson and Zeckhauser (1988) — Status quo bias, Journal of Risk and Uncertainty', href: 'https://ideas.repec.org/a/kap/jrisku/v1y1988i1p7-59.html' },
    { label: 'Jachimowicz and others (2019) — Defaults meta-analysis of 58 studies, Behavioural Public Policy', href: 'https://ideas.repec.org/a/cup/bpubpo/v3y2019i02p159-186_00.html' },
    { label: 'Madrian and Shea (2001) — The power of suggestion', href: 'https://www.nber.org/papers/w7682' },
    { label: 'DellaVigna and Linos (2022) — RCTs to scale, 126 nudge trials, Econometrica', href: 'https://www.nber.org/papers/w27594' },
    { label: 'Proctor and Schneider (2018) — Hick’s law for choice reaction time: a review', href: 'https://api.openalex.org/works/doi:10.1080/17470218.2017.1322622' },
    { label: 'Liu and others (2020) — How relevant is Hick’s law for HCI?', href: 'https://researchportal.ip-paris.fr/en/publications/how-relevant-is-hicks-law-for-hci/' },
    { label: 'Iyengar and Lepper (2000) — When choice is demotivating', href: 'https://acawiki.org/When_Choice_is_Demotivating:_Can_One_Desire_Too_Much_of_a_Good_Thing%3F' },
    { label: 'Scheibehenne, Greifeneder and Todd (2010) — Choice overload meta-analysis of 50 experiments, Journal of Consumer Research', href: 'https://ideas.repec.org/a/oup/jconrs/v37y2010i3p409-425.html' },
    { label: 'Chernev, Böckenholt and Goodman (2015) — Choice overload, 99 observations, Journal of Consumer Psychology', href: 'https://www.kellogg.northwestern.edu/faculty/research/detail/2015/when-product-assortment-leads-to-choice-overload-a-conceptual' },
    { label: 'Fitts (1954) — Journal of Experimental Psychology 47 (record)', href: 'https://pubmed.ncbi.nlm.nih.gov/13174710' },
    { label: 'Bi, Li and Zhai (2013) — FFitts law: modeling finger touch with Fitts’ law', href: 'https://research.google/pubs/ffitts-law-modeling-finger-touch-with-fitts-law/' },
    { label: 'WCAG 2.2 — SC 2.5.8 Target Size (Minimum)', href: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html' },
    { label: 'WCAG 2.2 — SC 2.5.5 Target Size (Enhanced)', href: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html' },
    { label: 'Apple — UI design dos and don’ts (44 by 44 points)', href: 'https://developer.apple.com/design/tips/' },
    { label: 'Google Accessibility Help — touch target size (48 by 48 dp)', href: 'https://support.google.com/accessibility/android/answer/7101858' },
    { label: 'Hunt (1995) — What von Restorff really did', href: 'https://www.utsa.edu/mind/rrhunt.htm' },
    { label: 'Treisman and Gelade (1980) and Theeuwes (1992), as reviewed in a 2004 paper on attentional capture', href: 'https://research.vu.nl/ws/files/1975176/Theeuwes%20Psychonomic%20Bulletin%20and%20Review%2011(1)%202004b%20u.pdf' },
    { label: 'Porter (2011) red-versus-green button test, as retold by Poper (original post not found)', href: 'https://www.poper.ai/blog/cta-button-color-conversion/' },
    { label: 'Pernice (2018) — Banner blindness: old and new findings, Nielsen Norman Group', href: 'https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/' },
    { label: 'Pagendarm and Schaumburg (2001) — Why are users banner-blind?', href: 'https://jodi-ojs-tdl.tdl.org/jodi/article/view/jodi-37/38' },
    { label: 'ACCC — Australian Consumer Law general protections (ss 18 and 29), online reviews guidance', href: 'https://www.accc.gov.au/business/advertising-and-promotions/online-reviews-for-product-and-services' },
    { label: 'ACCC — Emma Sleep to pay A$15m in penalties over sale prices', href: 'https://www.accc.gov.au/media-release/bedding-supplier-emma-sleep-to-pay-a-total-of-15m-in-penalties-for-misleading-statements-about-sale-prices' },
    { label: 'ACCC — James Lane and Vuly pay penalties over Black Friday sales', href: 'https://www.accc.gov.au/media-release/james-lane-and-vuly-pay-penalties-for-allegedly-making-misleading-representations-during-last-year%E2%80%99s-black-friday-sales' },
    { label: 'ACCC — Court finds eHarmony engaged in misleading conduct on renewal and pricing', href: 'https://www.accc.gov.au/media-release/court-finds-eharmony-engaged-in-misleading-conduct-in-relation-to-automatic-renewal-and-pricing-of-its-subscriptions' },
    { label: 'Service Seeking fined A$600,000 for fake reviews (ACS Information Age)', href: 'https://ia.acs.org.au/article/2020/service-seeking-fined--600-000-for-fake-reviews.html' },
    { label: 'ACCC v HealthEngine [2021] FCA 1203', href: 'https://www.level27chambers.com.au/cases/australian-competition-and-consumer-commission-v-healthengine-pty-ltd-2021-fca-1203/' },
    { label: 'Treasury Laws Amendment (Doubling Penalties for ACCC Enforcement) Act 2026', href: 'https://www.legislation.gov.au/C2026A00019/asmade/text' },
    { label: 'Australian Treasury — Banning unfair trading tricks and traps', href: 'https://ministers.treasury.gov.au/ministers/andrew-leigh-2025/media-releases/banning-unfair-trading-tricks-and-traps' },
    { label: 'FTC — Final rule banning fake reviews and testimonials', href: 'https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials' },
    { label: 'FTC — Bringing dark patterns to light (staff report, 2022)', href: 'https://www.ftc.gov/reports/bringing-dark-patterns-light' },
    { label: 'FTC — Guides Against Deceptive Pricing, 16 CFR Part 233', href: 'https://www.law.cornell.edu/cfr/text/16/233.1' },
    { label: 'FTC — Historic US$2.5 billion settlement against Amazon', href: 'https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-secures-historic-25-billion-settlement-against-amazon' },
    { label: 'Eighth Circuit vacates the FTC click-to-cancel rule (law-firm summary)', href: 'https://www.lw.com/en/insights/eighth-circuit-vacates-ftc-click-to-cancel-rule' },
    { label: 'EU — Directive (EU) 2019/2161 amending the Unfair Commercial Practices Directive', href: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L2161' },
    { label: 'EU — Digital Services Act, Article 25', href: 'https://www.eu-digital-services-act.com/Digital_Services_Act_Article_25.html' },
    { label: 'Court of Justice of the EU — Planet49 (C-673/17), pre-ticked boxes', href: 'https://curia.europa.eu/jcms/upload/docs/application/pdf/2019-10/cp190125en.pdf' },
    { label: 'CMA207 — Unfair commercial practices guidance (UK)', href: 'https://www.gov.uk/government/publications/unfair-commercial-practices-cma207/unfair-commercial-practices' },
    { label: 'CMS — The DMCC Act bans fake reviews (UK)', href: 'https://cms.law/en/gbr/legal-updates/no-more-faux-five-stars-the-dmcc-act-bans-fake-reviews' },
    { label: 'UK government — Court endorses CMA action as Emma Sleep agrees to change sales practices', href: 'https://www.gov.uk/government/news/court-endorses-cma-action-as-emma-sleep-agrees-to-change-sales-practices' },
    { label: 'Stephenson Harwood — UK subscription reforms brought forward to January 2027', href: 'https://www.stephensonharwood.com/insights/subscription-reforms-brought-forward-to-january-2027-is-your-business-ready/' },
  ],
})

/** The sources an article cites, in citing order, or an empty list for an unknown slug. */
export function getArticleSources(slug) {
  return LEARN_SOURCES[slug] ?? []
}

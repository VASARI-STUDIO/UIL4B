// Community prompts shown on /discover/prompts.
//
// `free` is the FREE TIER, and it is an IDENTITY rather than a position.
//
// It used to be a position: PromptLibrary rendered the filtered list and locked
// everything at index >= FREE_PROMPT_LIMIT. So "free" meant the first twelve of
// whatever you were currently looking at, and both the search box and the sort
// control changed what that was — search a term only a locked prompt contains
// and it arrives at index 0, unlocked. All twenty were reachable that way.
//
// The twelve flagged here are exactly the twelve a signed-out visitor saw for
// free in the DEFAULT view (sort 'popular' = saves descending) before the fix,
// so freezing them changes nothing about WHICH prompts are free. It only makes
// the answer stop depending on the query. Pricing was not touched; a gate that
// counted positions was replaced by one that counts identities.
//
// A new prompt added without `free: true` is LOCKED. That is deliberate and
// fail-closed: forgetting the flag costs a sale, forgetting its opposite gives
// the product away.
//
// `saves` is display data and no longer decides entitlement. Editing a saves
// count re-orders the gallery; it can no longer move a prompt across the gate.
export const COMMUNITY_PROMPTS = [
  {
    id: 'c-1',
    free: true,
    title: 'Plumbing business website',
    text: `Design a one-page site for FlowFix Plumbing & Gas, licensed plumbers and gasfitters in Newcastle and Lake Macquarie, NSW (licence 312487C, since 2009). Invent the specifics and commit to them: a depot address, a (02) 5550 number, real starting prices, opening hours, a named team. The idea: the price comes before the spanner, so the hero lets people point at their problem and see what it costs.

Palette and type
- Warm paper #F4F1EA, navy ink #14233A with #4A576A secondary, hairlines at 14% navy. Pipes are colour-coded like a plumbing drawing: cold #3A78AD, hot copper #B8622F, gas #C99414 dashed, waste grey. The call button is dark copper #9E4D1C with white text; the secondary action is a navy pill.
- Archivo 800 with tight tracking (-0.045em) for headings, Archivo for body, Azeret Mono for labels.

Sections
1. A navy strip: "Burst pipe or no hot water? We answer the phone 24/7" and the number. Nav: a pipe-elbow mark, Prices, About, Service area, Contact, "Book online" and a copper call pill.
2. Hero: area and licence line, "Plumbing, priced before we pick up a spanner.", a lede with one operational fact (average arrival 47 minutes last month), "Call" and "See every price", and three ticks (no call-out fee weekdays, fixed price before we start, 12-month guarantee).
   Beside it, a card holding an SVG section through a two-storey house: rooms labelled in mono, bath, toilet, basin, kitchen bench, gas cooktop, a 250 L hot water system, water and gas meters, and the pipework drawn in its code colours with a legend. A leak drips inside the wall void. Six numbered hotspots (burst pipe, blocked drain, hot water, gas cooktop, hidden leak, bathroom renovation) are buttons with aria-pressed and arrow-key support. Choosing one updates the panel beside it (aria-live): category, name, "from" price, what we actually do, usual duration, the after-hours surcharge and "Book this job".
3. Facts band: since 2009, jobs completed, licence number, public liability cover. Facts the business can state about itself, never a rating or a review count.
4. Prices: a typographic rate card, not cards: number, service, one line of what happens, usual time, "from" price. Build it from the same data as the hotspots so the two can never disagree. A note on GST, after-hours and parts.
5. About: the founder's story with dates, the team of six with roles, and a drawn service-area map (coastline, Lake Macquarie, suburbs, the depot, a dashed 40-minute ring) plus the suburbs as text.
6. Contact: the number set large, hours as a list, and a form with visible labels (name, phone, email, suburb, what's happening), inline validation, and an inline confirmation saying it is a demonstration and nothing was sent.
7. Footer: company name, address, ABN, licence.

Motion: on load the pipes draw in by stroke-dashoffset (waste, then cold, hot and gas) and the hotspots pop in; the drip falls continuously; the panel content lifts in when it changes. Everything is authored in its finished state and the animations only run inside prefers-reduced-motion: no-preference, so reduced motion shows the drawn house with one drop mid-fall. No photographs, testimonials, stock icons or external images.`,
    tags: 'business, local, plumbing, one-page',
    img: '',
    author: 'UIL4B Team',
    saves: 203,
  },
  {
    id: 'c-2',
    free: true,
    title: 'Restaurant website with menu',
    text: `Build a one-page, scroll-driven site for Osteria Luna, a forty-seat Italian restaurant at 114 Gertrude Street, Fitzroy, Melbourne. Invent the rest and commit to it: a chef with a dated history, a co-owner who runs the floor, opening hours with Monday closed, and a spring menu of four dishes per course with prices in AUD. The idea: the site is one night at the restaurant, and the moon keeps time.

Palette and type
- Olive-black night #11140F (raised surfaces #161A13 and #1D2219), moonlight bone #E3E6DA for text (#B8BDAD secondary), and one accent, tomato #EE5033, for the button, the rail underline and focus rings. Hairlines are bone at 13% alpha.
- Cormorant Garamond (light and italic) for display, Hanken Grotesk for body and UI. Set the name huge: "Osteria" at about 8vw and "Luna" in italic at about 19vw, line-height 0.8.

Sections
1. Hero: a tall arched window on the right with a dark sky, a few twinkling stars and the moon, and a line drawing of the table on the sill (a carafe, two glasses, a candle with a flickering flame). Bottom left: the name, one line ("Supper by moonlight on Gertrude Street."), a short paragraph, "Book a table", a link to the menu, and tonight's hours worked out from the visitor's weekday.
2. Kitchen: the chef's name, role and a three-row timeline beside a long quote from her. Pin it (position: sticky inside a 250vh parent) and scrub the quote in word by word with scroll.
3. Menu: Antipasti, Primi, Secondi, Dolci and Drinks set as a typographic list, never cards: dish name in the serif, one line of what is in it, the price in tabular figures, a drawn leaf for vegetarian dishes, and the surcharge policy. On desktop pin the section and move the courses sideways as the reader scrolls down, with a course rail whose tomato underline tracks progress and whose buttons jump to a course. On phones it is a vertical list with sticky course headings.
4. Book: a request form with visible labels (chips for the next seven nights with Monday disabled, sitting times, a guest stepper to six, name, mobile, notes), inline validation, and an inline confirmation that says it is a demonstration and nothing was sent. State the held-table and large-group policies.
5. Find us: a drawn street map (blocks, tram line, car park, walking route, north arrow, scale bar) whose block outlines draw in on scroll, plus address, transport notes and the weekly hours with today marked.
6. Footer: a huge italic "Buona notte." over the contact, licence and company details.

Motion
- As the hero scrolls away the moon leaves the window and docks as the logo mark in the fixed nav, and its phase waxes towards full as the page progresses.
- Entrance: the two lines of the name rise out of masks (1.15s, cubic-bezier(0.16,1,0.3,1)), the arch wipes up, then the copy fades up. Ambient: stars twinkle, the candle flickers, the halo breathes.
- Drive every scroll effect with CSS scroll-driven animations (animation-timeline: scroll() and view() on registered @property numbers) and a small requestAnimationFrame fallback that writes the same custom properties. Native scrolling only: no wheel hijacking, keyboard and trackpad work, and the page lets go of the scroll at the end.

Under prefers-reduced-motion nothing pins or travels sideways, the moon stays in the window, the quote is fully shown, and every section is an ordinary finished document. No photographs, external images or fonts, third-party embeds, or invented reviews.`,
    tags: 'restaurant, menu, booking, elegant',
    img: '',
    author: 'UIL4B Team',
    saves: 178,
  },
  {
    id: 'c-3',
    free: true,
    title: 'Dark mode analytics dashboard',
    text: `Design a dark analytics dashboard for Keel, an analytics product, measuring one named business: Fernway Supply Co., an outdoor-gear Shopify store selling in Australia and New Zealand. Every label follows from that.

Layout: a slim sidebar with drawn icons and real section names; a header with the store, the date range (18 Aug to 14 Sep 2026 against the previous 28 days) and a live marker; four KPI tabs (net revenue, orders, sessions, conversion rate) that switch the main chart; a live activity feed; a revenue-by-channel table; a checkout funnel.

The data is the design:
- Every KPI shows the previous period and a delta, and conversion moves the wrong way, in coral, with its cause annotated on the chart.
- The chart has a y-axis with units, dated ticks, shaded weekends, a dashed previous-period line, a note visible at rest, a crosshair tooltip on hover and arrow keys, and a table view of the same data.
- The channel table uses right-aligned tabular figures and a share bar, and its total equals the revenue KPI. Compute every derived figure in code so they agree.
- The feed lists order IDs, amounts, towns and relative times.

Palette: graphite #0F1012, panels #15171A, hairlines #24282D, text #ECEEF0, teal #28A894 for good movement, coral #E0695A for regressions only. Type: Geist for UI, Geist Mono for every figure.

Motion, eased with cubic-bezier(0.16,1,0.3,1): the chart line draws in when a KPI is chosen; a live sessions strip slides left every two seconds; new feed items push the list down with a FLIP transition; changed numbers tick up. A Pause button stops the live data, and everything pauses when the tab is hidden.

Under prefers-reduced-motion nothing moves: the chart is drawn, the feed is full and Pause is hidden. Label the data as sample data for a fictional store. At 390px the sidebar collapses and the table drops secondary columns.`,
    tags: 'dashboard, dark, analytics, ui',
    img: '',
    author: 'UIL4B Team',
    saves: 215,
  },
  {
    id: 'c-4',
    free: false,
    title: 'Freelancer portfolio',
    text: `Build a scroll-driven portfolio for Ruth Amankwah, an independent brand and type designer with a studio in Príncipe Real, Lisbon. She has been independent since 2018 and takes about six projects a year. The work is the page: eight projects for named clients, each drawn as the actual artefact in CSS and inline SVG, never a photograph or a grey placeholder.

Palette and type
- Paper #F3F2EE, ink #111110 with #55544F secondary, hairlines at 14% ink, and one accent: acid lime #D4F23A, used only as a highlighter behind ink type, the progress bar, selected chips and the enquiry button. Never lime text on paper.
- Familjen Grotesk (600, tracking about -0.058em at display sizes) for everything, JetBrains Mono for labels. Each artefact uses its own face, which is the point of a type designer's portfolio: Gloock, Bodoni Moda, Unbounded, Young Serif, Big Shoulders Display, Anton.

Sections
1. Hero: an availability pill ("Booking from November. Two identity slots left this year."), then the statement "I design brands / that people / remember." at about 10vw on three lines, the second indented, with a lime marker behind "remember.". As the hero scrolls away the three lines drift apart sideways at different rates. A hairline, a one-line description of who she works for, and "41 projects since 2014 / scroll for eight of them" in mono.
2. Selected work, a horizontal chapter on a black ground: pin it (position: sticky inside a section whose height equals the track's overflow width plus one viewport) and translate the track as the reader scrolls down. A counter ("03 / 08") and a lime progress bar track it; inside each frame the artwork drifts slightly against its card. The eight: Lume Oat Co. oat-drink carton (2026), Teatro da Encosta season poster (2026), Kiosk Quarterly magazine cover (2025), Norte Cycling Club logotype with a north arrow in the o (2025), Salt & Iron shortbread tin from above (2024), a Lisbon metro exit sign (2024), a Casa da Ribeira live fado LP sleeve with the record sliding out (2023), and a Casa Azulejo tile system (2022). Each caption: number, client, discipline and year.
3. About: pinned beside an identity card (studio, independent since, before, languages, tools, projects a year). The bio is split into words that light from 16% to full opacity as the reader scrolls.
4. Index: all eight as rows (number, client, what they do, discipline, year). A lime fill rises behind the row on hover or focus, and a small copy of the artefact follows the pointer.
5. Contact on black: "Got a brand that needs remembering?" with the marker again, the next start date, typical length and studio hours, and a form with visible labels (name, email, budget chips, what the company does), inline validation, and an inline confirmation that says it is a demonstration and nothing was sent. Her name set edge to edge as the sign-off, then the company line and three social links.

Motion and behaviour
- One passive scroll listener batched through requestAnimationFrame writes custom properties; native scrolling only, with no wheel hijacking. The fixed nav inverts while a dark section sits under it.
- Keyboard: tabbing to a card that sits off-screen sideways scrolls the page to where that card is in view. A skip link goes straight to the work.
- Below 900px nothing pins: the work is a two-column grid (one column on phones) and the bio lights as it crosses the screen.
- Under prefers-reduced-motion nothing pins or travels, the work is a plain grid, every word of the bio is lit, the marker is already drawn, and there is no pointer preview.

No testimonials, client logos, awards or invented quotes. The copy says what she does and how she works, and nothing it could not prove.`,
    tags: 'portfolio, freelancer, minimal, creative',
    img: '',
    author: 'UIL4B Team',
    saves: 156,
  },
  {
    id: 'c-5',
    free: false,
    title: 'Fitness trainer landing page',
    text: `Design a landing page for Dev Aranda, a one-to-one strength coach in Brunswick East, Melbourne, who takes fourteen clients at a time. Goal: book a free 45-minute consult. The page should sound like one person, and its big idea is honesty about the plan: the hero shows the twelve weeks on a barbell.

Palette and type
- Charcoal #121212 with chalk #EFEDE8 type and #A6A39C secondary. Every colour on the page comes from competition plates: red #D7263D (25 kg, and the booking button with white text), blue #2463C4 (20), yellow #F2C230 (15), green #2E9D5B (10), white (5). The phase markers and programme tags reuse them.
- Anton in caps for headings and the big numbers, Outfit for body, DM Mono for labels.

Sections
1. Nav: a small barbell mark, "Dev Aranda / Strength · Brunswick East", The 12 weeks, Programmes, The coach, FAQ, and a red "Book a free consult" pill.
2. Hero: "Stronger in twelve weeks. Here's the plan." with the second sentence in the dim chalk; a lede that says exactly what the consult involves (movement screen, a conversation, a first go on the bar, no sales pitch); two buttons; and a true capacity fact drawn as fourteen small bars, two of them empty: "12 of 14 client places taken".
   Beside it, the plan on a bar: an SVG barbell (shaft, sleeves, collars) whose plates are loaded per side from the standard set for the planned working weight, a huge number ("100 kg squat"), the week and phase, and a range slider for weeks 1 to 12 with aria-valuetext, a filled track and phase ticks underneath (Foundation, Build, Peak, Test). The example lifter tests at 70 kg; weeks 4 and 8 are deliberately lighter. A note says it is the plan for an example lifter, not a promise.
3. What the twelve weeks look like: four phases with week ranges and what changes in each, then "What we measure" as a table (top sets, bar speed, sleep and soreness, optional bodyweight, optional waist) with how often and why.
4. Programmes: three columns separated by hairlines, not cards: strength for fat loss ($95 a week), the full block ($135, "where I suggest most people start"), and sport ($165). Sessions per week, what is included, and a note that there is no joining fee or lock-in after the first block.
5. The coach: a short manifesto line, years coaching, certifications by name with years, specialities, and a line in a red-ruled box about who he is not the right coach for.
6. FAQ with native details and summary: all-in cost, coming back after years off, missed sessions, what is and is not guaranteed.
7. Book: the true capacity fact and the next opening date, and a form with visible labels (name, mobile, email, preferred time as chips), inline validation, and an inline confirmation that says it is a demonstration and nothing was sent.

Motion: on load the plan plays once, week 1 to 12 at about three weeks a second, plates sliding on and off the sleeves, and then the slider is the reader's; touching it stops the playback. Under prefers-reduced-motion it starts at week 12 with no sliding. No photographs, testimonials, before-and-after pictures, star ratings, countdown timers or invented client counts.`,
    tags: 'fitness, landing, trainer, conversion',
    img: '',
    author: 'UIL4B Team',
    saves: 134,
  },
  {
    id: 'c-6',
    free: false,
    title: 'SaaS pricing page',
    text: `Build the pricing page for Cronwright, which pages you when a scheduled job runs late, exits non-zero or stops checking in. The unit of pricing is the monitored job, never alerts or runs, and the page is built around it: the reader says how many jobs they run and the page shows what each plan would cost them.

Palette and type
- Warm off-white #F6F6F2, cards #FDFDFB, ink #111214 with #4D5058 secondary, hairlines at 12% ink. One signal green #12804A for "fits your jobs", the trial button and ticks, and an amber #C98A06 note for going over. No gradients.
- Bricolage Grotesque 700 with tight tracking for headings and big numbers, Instrument Sans for the interface, JetBrains Mono for axis labels and small print.

Page
1. Nav with the product links (Pricing marked aria-current), Sign in, and "Start free".
2. Heading "Pay for the jobs you watch. Nothing else." with the second sentence in grey, and one paragraph that names the unit.
3. The calculator, one bordered panel in two halves. Left: "How many jobs do you run?", a huge live number, a logarithmic range slider from 1 to 5,000 (aria-valuetext), a 1 / 10 / 100 / 1,000 / 5,000 scale, three example chips (a side project 4, a product team 120, a data platform 3,500) that ease the slider there, and a live verdict ("Pro, $45 a month. 50 jobs included, then 70 more at $0.30 each."). Right: an SVG chart of monthly cost against jobs on a log axis: Free as a short green segment to five jobs, Pro as a solid line, Enterprise dashed, a dotted cursor and a dot on the cheapest plan, and a price tag beside it.
4. Plans with a monthly/yearly toggle (a sliding pill; yearly is "2 months free"). Free $0 for 5 jobs and 1 seat; Pro $24 a month ($20 billed yearly) with 50 jobs, then $0.30 per job, 10 seats; Enterprise from $900 a month with 2,500 jobs, then $0.18, unlimited seats, SSO and an uptime credit. Each lists five or six features, led by "Everything in <previous>, plus", with ticks and crosses that screen readers hear as included or not. Instead of a fixed "Most popular" badge, a "Fits your jobs" badge and a green wash move to whichever plan is cheapest for the number in the calculator. Toggling the period rolls the prices and rewrites each "billed as" line.
5. An amber note: going over never stops monitoring; extra jobs are billed per day; emails at 80% and 100%; on Free a sixth job is created paused.
6. "Compare every limit": a table with row headers for included jobs, the extra-job price, seats, shortest check interval, history, alert channels, SSO and audit log, and support. It scrolls sideways inside its own region on small screens.
7. "Billing, answered": what counts as a job, going over, seats joining or leaving mid-month, switching periods, payment methods and refunds, each a specific commitment.
8. A closing line ("Five jobs free, for as long as you like.") with the button, and a footer with the company details. Every price says AUD and excludes GST.

Motion: on load the slider travels once from one job to 120; prices roll over 500 ms when the period changes; the badge fades between plans. Under prefers-reduced-motion all of it jumps straight to the right values.`,
    tags: 'pricing, saas, component, cards',
    img: '',
    author: 'UIL4B Team',
    saves: 119,
  },
  {
    id: 'c-7',
    free: false,
    title: 'Real estate property listing',
    text: `Design the listing page for 14 Rosella Street, Coburg (Melbourne), sold by Northline Property: a 1926 Californian bungalow on 562 m² with a 2019 rear extension, price guide $1,380,000 to $1,480,000, auction Saturday 4 October at 11 am. The idea: instead of photographs, the listing is an architect's drawing set, and the drawings are good enough to make a decision from.

Palette and type
- Drafting paper #F5F2EA with #FBFAF6 sheets, drawing ink #1D2327 with #4F575C secondary, hairlines at 14% ink, and one brick red #A4452C for dimensions, the auction badge and focus rings.
- Newsreader for the address, price and section headings (the suburb in italic), Instrument Sans for the interface, IBM Plex Mono for drawing lettering, labels and title blocks.

The drawing set (inline SVG line drawings in one consistent drafting style)
- A-01 Street elevation, 1:100: gabled terracotta roof in hatching, chimney, weatherboards, a verandah on brick piers with tapered columns, the front door and sidelight, a leadlight bay window, a picket fence drawn in front, a tree, a ridge-height dimension and a frontage dimension.
- A-02 Section, street to garden: original stumps and suspended floor, ceiling batts, 3.3 m ceilings in the 1926 rooms, the 2019 slab with a raked ceiling from 2.7 to 4.2 m, a skylight, solar panels, and cut walls in solid ink.
- A-03 Floor plan, street on the left: generate it from a room table so every size is exact. Named rooms with width × depth in metres, outer walls heavier than inner, windows as double lines, openings as gaps, the front door swing, sliding doors to the deck, kitchen bench and island, overall dimensions (16.8 × 11.2 m), a north arrow pointing to the rear garden, and a scale bar.
- A-04 Site plan, 1:250: the 15.24 × 36.9 m lot, the house footprint with its 6 m setback, the solar array, a 5,000 L tank, trees, the drainage easement, a garage off the rear lane, the lot and plan number, and north.
- The viewer is one bordered panel: the current sheet with a title block under it (drawing number, title, scale, survey date) and a button that opens it full size in a dialog, scrollable sideways on a phone. Beside it, the sheet index is a vertical tablist (arrow keys, Home and End) with drawing numbers, names and a line each, plus previous and next. On load it pages through the four sheets once and rests on the elevation; touching or focusing it stops that.

The rest of the page
- Title row: breadcrumb, the address, the price guide and a brick auction badge. Nav with Save (aria-pressed) and Enquire.
- A seven-cell facts bar: guide, bedrooms, bathrooms, parking, land, floor area, type and year.
- "The house": three paragraphs written like a surveyor (what it is, what was done and when, what the street is like), then six highlights that are all facts (aspect and depth of the garden, rear-lane garage, restumping, rewiring, heritage overlay, zoning).
- "Services and fabric": a definition grid with specifics (hydronic heating with boiler size, split system, 6.6 kW solar, tank, heat-pump hot water, glazing, insulation R-values, NBN type, energy rating not assessed).
- A drawn locality map (streets, the Upfield line and Coburg station, Sydney Road trams, the school, the park, the shops, 5 and 10 minute walking rings) beside a list of walking times.
- A sticky agent card: name, role, phone, an example email, "Enquire now" that reveals a short labelled form (name, email, and checkboxes for the contract and Section 32, a private inspection or a call about the price) with validation and a demonstration confirmation, inspection times and council and water rates.
- Three similar listings, each with a small line elevation, price guide, bedrooms, bathrooms and style. A footer that says the Section 32 is the document to rely on.

No photographs, stock illustrations, invented reviews or "just listed" urgency. Under prefers-reduced-motion the sheets do not page through on their own and switch without the fade.`,
    tags: 'real-estate, listing, property, business',
    img: '',
    author: 'UIL4B Team',
    saves: 98,
  },
  {
    id: 'c-8',
    free: false,
    title: 'Coffee shop brand identity',
    text: `Design a one-page brand manual sheet for Grounded, a neighbourhood roastery at 148 Rose Street, Fitzroy. It reads like edition 2 of a real brand manual, not a website.

Palette, with roles: Roast Blue #2238A6 (the brand colour), Milk #F3F4EF (every light surface), Foam #F6C7A8 (the one warm tone, never for text), Night #111633 (body copy and lids). Skip the brown-and-cream coffee cliche. Type: Young Serif for the wordmark and headings, Figtree for body, Caveat only for handwritten margin notes.

Sections:
1. Cover: the wordmark set large, a roundel mark with a slowly turning text ring, one sentence on what the shop is, and the edition and date.
2. The mark: inline SVG with a slightly uneven hand-drawn line; horizontal, stacked and reversed lockups; the clear-space rule, minimum sizes in px and mm, and three things nobody does to it, each drawn.
3. Colour: a swatch per colour with its name, a hex button that copies (selecting the text if the clipboard is refused), RGB, its role, and at least one measured contrast ratio.
4. Type: a specimen, a character set and a scale ladder with real sizes and leading, each rung set in real copy from the shop.
5. In use: a takeaway cup with steam, a retail bag, a business card and a loyalty card, drawn in CSS and SVG and labelled with real dimensions.
6. Voice: a "We write" column beside a "We do not write" column.

Motion, eased with cubic-bezier(0.16,1,0.3,1): the mark draws on with stroke-dashoffset, the cover rises in, steam rises off the cup on a 3.4s loop, the roundel ring turns once every 36s, sections settle in as they enter the viewport, and stamps land on the loyalty card one by one before a fresh card starts.

Under prefers-reduced-motion everything is drawn and in place: no draw-on, no loops, six stamps on the card. Write real content throughout: address, hours, the owner's name and a contact on a reserved example domain. No external images or fonts.`,
    tags: 'branding, coffee, identity, warm',
    img: '',
    author: 'UIL4B Team',
    saves: 87,
  },
  {
    id: 'c-9',
    free: true,
    title: 'E-commerce product page',
    text: `Design a product page for the Filey Gansey from Cammish & Daughter, a small knitwear maker in Filey, North Yorkshire. The gansey is a fisherman's jumper hand-knitted to order in 5-ply worsted: £285, plus £20 to have your initials knitted into the hem, which is the signature feature of the page.

Palette and type
- Oatmeal #EFE9DE page, a slightly deeper stage #E4DDCF behind the product, gansey navy #1E2A3D for ink and the primary button, and tarred-rope brown #8A5A2B for the maker line and signature. No shadows on cards, hairlines at 14% navy.
- Literata (with its italic for the colour name and the knitter's name) for the wordmark and headings, Red Hat Display for the interface, Red Hat Mono for small labels.

The product, drawn (inline SVG, no photographs)
- One garment defined once in <defs> and reused: body, sleeves and gussets in a single clip path; stockinette as a tiny V-stitch pattern; a yoke of rope cables, marriage-line diamonds and a ladder panel, mirrored, between two garter ridges; ribbing at hem, cuffs and neck. The wool colour is a CSS custom property, so swapping the colour recolours the drawing, the thumbnails and the add-ons at once.
- Four views (Front, Back, Yoke, Hem) are the same drawing reframed by tweening the viewBox; the back view swaps the neckline and hides the initials. A thumbnail rail (role tablist, arrow keys) and a row of pill buttons both drive it. Hovering the stage zooms 2.1 times anchored to the pointer, on hover-capable devices only.
- Initials: a 5 x 7 bitmap font turns up to three letters into purl-stitch dots above the hem ribbing. Typing updates the drawing live, stitch by stitch, and adds £20 to the price shown and on the button.

Buying column (sticky on desktop)
- Maker line, "The Filey Gansey, navy" with the colour in italic, price with "Knitted to order · 6 weeks", and a short paragraph of what it is and why.
- Colour as a radio group of named swatches (Navy, Oatmeal, Seaweed, Coble red); chest sizes 36 to 46 as a radio group where 46 is shown struck through and explains the wool is back in March; a size-guide link that opens the Size & fit tab; an honest stock line ("3 ready-knitted in 40 ship in 1–2 days"); the initials field; "Add to bag · £305" and a save toggle with aria-pressed; a live status line that says the shop is a demonstration.
- Three made-by facts: wool, about 110,000 stitches, 60 hours by hand.

Below
- The knitter: "Knitted by Margaret Cammish, and four others in Filey", what the patterns mean, and her signature line.
- Real tabs (arrow keys, Home and End, aria-selected, one panel at a time): Details; Size & fit with a measurement table per size and a fit note; Delivery & returns (made-to-order with initials is not returnable, but will be re-knitted once free); Care & repair (free darning for five years).
- "Worn with it": a watch cap, sea-boot socks and a canvas smock, drawn, with colourway and price.
- "Recently viewed": a scroll-snap rail of pattern swatches for other ganseys.

No reviews, ratings, sale prices or urgency. Every control has a visible label, a hover state and a focus ring, and under prefers-reduced-motion the views switch instantly and the initials appear without knitting in.`,
    tags: 'ecommerce, product, fashion, premium',
    img: '',
    author: 'UIL4B Team',
    saves: 176,
  },
  {
    id: 'c-10',
    free: false,
    title: 'Mobile app onboarding flow',
    text: `Design the four-screen first run of Swell, a surf forecast app for the east coast of Australia (buoy, wind and tide for 340 breaks between Noosa and Bermagui, read as one line), and present it as a case study: a clickable prototype first, then the whole flow, then the notes.

Palette and type
- Case-study canvas in sand #F3EDE2 with ink #0E2A30, #4B6166 secondary and 14% hairlines; a coral #E85D3F marker for the current step.
- The app: deep sea #0E3A44 for the welcome screen and primary buttons, foam #E1F0EC for soft fills, off-white #FBF8F2 screens, coral for the "Worth it" tag. Sora throughout (700 with tight tracking for headlines), Geist Mono for labels.

The prototype (first screen of the page)
- One large phone drawn in CSS: rounded body, dynamic island, status bar with time, signal and battery in SVG, home indicator. Every size inside is in em, so the same screen markup renders the big live phone and the small overview frames just by changing font-size.
- The four screens sit in a track; moving forward pushes left and back pulls right in 280 ms, cubic-bezier(0.2, 0.8, 0.2, 1). Screens that are off to the side are made inert so focus never lands on them. Every button in the phone works: primary actions go forward, Skip and Not now move on, back chevrons go back, "I already have an account" jumps to the account screen.
- Beside it: an eyebrow, "Swell, first run. From install to a saved break in under a minute." (the second sentence in grey), one paragraph, three facts (4 screens, all skippable, 280 ms push), and a step navigator. Each step is a button with aria-current="step" that jumps the phone there; the current one shows a coral bar and expands its one-sentence rationale. Arrow buttons and "2 of 4" sit under the phone, and the left and right arrow keys work inside it.
- On load the flow plays through once (screens 2, 3, 4, then back to 1) and stops as soon as someone touches or focuses the phone.

The four screens (write every line as shipped copy; no screen says "welcome", "get started" or "you're all set")
1. Welcome on deep sea with drawn swell lines: the mark, SWELL, "Know before you paddle out.", a line with the real number and places, "Find my break", and "I already have an account".
2. Highlights, 2 of 3: the real forecast card from the home screen (Bronte, 6:20 am, a "Worth it" tag, a swell chart with a tide line, "Swell 1.4 m at 11 s · Wind 6 kt offshore · Tide filling until 8:05"), "One line, not a wall of numbers.", progress dots, Next, Skip.
3. Permissions: notifications and location together, each with an icon, a concrete benefit and a stated limit, a reassurance line on where to change them, "Turn both on" and a full-contrast "Not now".
4. Account: what the account is for, Continue with Apple and Google, a divider, labelled email and password with the rule shown before it can be broken, Create account, and "Skip for now" with its cost ("Skipping keeps everything on this phone only").

Below: "The whole flow", four smaller phones in a row (two columns on phones) with the step name above and one sentence on the decision below; then Notes in three columns: motion (and what replaces the push under Reduce Motion), exit routes on every screen, and the copy rules. A footer says the app is fictional.

Under prefers-reduced-motion there is no autoplay, and the push becomes a 200 ms cross-fade. Draw everything in CSS and SVG: no photographs, mockup images or icon fonts.`,
    tags: 'mobile, onboarding, app, ux',
    img: '',
    author: 'UIL4B Team',
    saves: 92,
  },
  {
    id: 'c-11',
    free: false,
    title: 'Construction company website',
    text: `Design a scroll-driven website for Apex Build Co., a Victorian commercial builder since 2001. Invent the company and keep every detail consistent: ABN, builder registration, head office, site hours, final contract sums. Industrial and exact, like a site sign.

Palette: off-black #0F0F0E with #1B1B19 panels, concrete #8D8B85, stone #AEABA3, bone text #ECEAE4, and one hi-vis yellow #FFC20E for the button, the crane beacons, the key programme bar and focus rings. Type: Big Shoulders Display (900, uppercase) for headlines, Martian Mono for every figure and reference code, Hanken Grotesk for body.

Sections
1. Hero: a full-bleed inline-SVG site at night: a lattice tower crane, a building mid-frame behind a company hoarding, a low skyline. The crane slews slowly, its trolley travels, the precast panel on the hook swings like a pendulum and the jib beacons blink. The headline "Built on the date we signed." rises out of masks in three lines, then a subline, "Request a tender" and "See the work".
2. The tower: pin a stage (position: sticky in a tall parent) and scrub one project's 86-week build with scroll. The core climbs with its yellow jumpform, twelve slabs appear floor by floor, glazed facade panels trail three floors behind, the crane climbs and is taken down, and "topped out" is marked. Beside it a readout (week, slabs poured, facade panels, concrete placed in m3, people on site, current phase) updates live, and a Gantt chart's playhead follows the scroll.
3. The work: six projects, each an SVG elevation at a common scale with reference, suburb, final contract sum, year, sector and size. On desktop the chapter pins and moves sideways as you scroll down, with a "01 / 06" counter; on phones it is a native swipe row with scroll-snap.
4. The record: four facts the company can state about itself, including the share of its last 50 projects handed over on or before the contract date, with digits that roll like an odometer. Never a satisfaction score or a review count.
5. Process: Consult, Design, Build, Deliver, each with a duration and what the client receives.
6. Credentials: ISO certificates, builder registration, safety accreditation and insurance as typographic badges with numbers and expiry dates. No third-party logos or invented awards.
7. Enquire: a form with visible labels, inline validation, and an inline confirmation with a reference number that says nothing was sent.

Technique: CSS scroll-driven animations (animation-timeline: view() and named view timelines driving registered @property numbers) with a requestAnimationFrame fallback that writes the same properties. The crane runs on requestAnimationFrame from elapsed time and pauses off-screen and in hidden tabs. Headings reveal with a clip-path shutter. Native scrolling only: keyboard and trackpad work and the page lets go of the scroll at the end.

Under prefers-reduced-motion the crane is still, nothing pins, the tower shows its finished state with the final readout, the projects are an ordinary list, and every number is final in the markup.`,
    tags: 'construction, business, corporate, professional',
    img: '',
    author: 'UIL4B Team',
    saves: 67,
  },
  {
    id: 'c-12',
    free: false,
    title: 'Blog article layout',
    text: `Design and write a long-form article for Ligature, a quarterly on typography: "The measure is the decision you make first" by Nadia Ferris, type director, about 1,100 words in six sections (what the measure is, where 45 to 75 comes from, setting it in CSS, leading moves with it, what breaks on a phone, a checklist). Real prose, real sources, no lorem. The page should practise what the article argues, and let the reader test the argument.

Palette and type
- Warm paper #F7F4EE with #EFEAE1 for quiet surfaces, ink #1A1A1E with #56534E secondary, 13% hairlines, and one oxblood #8C2F26 for the drop cap, the italic key word in the title, footnote markers, the active contents item, the pull-quote rule and the reading-progress line.
- Newsreader throughout the text (light 300 for the display title, italic for the dek and pull quote) at 19px with 1.7 leading, Hanken Grotesk for labels and interface, JetBrains Mono for code and the lab readout.

Layout
- A 2px reading-progress line fixed at the top and a sticky masthead with the italic wordmark, section links (the current one underlined in oxblood) and a Subscribe pill.
- Hero on the paper, not a dark band: kicker, a huge light title with "first" in italic oxblood, an italic dek, a ruler drawn at exactly the article's own measure with ticks every five characters and the note "66 characters: the line you are about to read", then the byline (monogram avatar, name, role, date, reading time).
- A three-part grid on desktop: a sticky contents list in the left margin whose active item follows the reader, the article column at 66ch, and a right margin where sidenotes hang beside the paragraphs that cite them (Bringhurst, Tinker and Paterson). Below 1180px the sidenotes sit inline with a left rule; below 860px the contents list wraps above the article.
- In the article: a drop cap, headings with their own shorter measure, a drawn figure of the return sweep at 38, 66 and 104 characters with a caption that explains it, inline code, a syntax-highlighted code block that scrolls inside the column, a pull quote with a left rule and a short measure, a ruled note, and a closing end mark.
- The measure lab, inside section 4: a slider from 28 to 110 characters over a band that shades 45 to 75, a checkbox "Move the leading with the measure", a sample paragraph whose max-width and line-height follow the slider (1.5 at 45, 1.7 at 66, 1.8 at 75), a live readout, and one sentence that says where the reader has landed.
- "Related reading": three pieces with a large glyph tile each, a kicker with section and reading time, a title and a standfirst.

Under prefers-reduced-motion the lab changes without transitions. Nothing on the page competes with the text: no photographs, no share bars, no pop-ups.`,
    tags: 'blog, editorial, typography, content',
    img: '',
    author: 'UIL4B Team',
    saves: 109,
  },
  {
    id: 'c-13',
    free: true,
    title: '3D hero — floating product reveal',
    text: `Build a scroll-driven 3D product hero for the Stilte TT-2, a belt-drive turntable made in Eindhoven and sold for €1,190. The product is a real three.js model, not a picture, and scrolling plays one small story: the camera orbits a quarter turn while the tonearm lifts, swings across and lowers onto the record.

Copy (write it, commit to it)
- Nav: a wordmark "stilte" with a record-from-above mark, Turntables, Listening room, Service, and a pill "Reserve | €1,190".
- Eyebrow "Stilte TT-2 · built in Eindhoven", headline "Put a record on. Then leave it alone." with the second sentence in a lighter ink, a lede naming the 4.2 kg platter, the carbon arm, the ash plinth and the 0.03% speed stability, and two pill buttons: "Reserve yours" and "Read the bench test".
- A four-row spec list on the right: platter, wow and flutter, tonearm, speeds.
- A live mono readout bottom right: arm angle in degrees, stylus state (PARKED, CUEING, DOWN), 33⅓ RPM, and a three-segment rail for lift, swing and lower.
- Below the stage, a "Measured on the bench, not in the brochure." section: a two-column table of seven measured specs with a one-line note under each, then a footer with the company address.

Palette and type
- Warm paper #ECE6DB, ink #1B1916 with #5E574D secondary, hairlines at 14% ink, and one signal orange #C7401A used only for the record label, the cartridge, the eyebrow dot and focus rings. Buttons are ink pills.
- Schibsted Grotesk 600 with tight tracking (-0.045em) for the headline, Red Hat Mono for eyebrow, readout and table labels.

The model (three.js, no loaded files)
- Plinth: RoundedBoxGeometry with an ash-grain CanvasTexture drawn at runtime; rubber feet; a motor pod and a speed knob with an orange index.
- Platter: brushed aluminium (metalness 1, roughness 0.3) on a dark sub-platter. The record's top face is a CanvasTexture of fine grooves with five darker track gaps, plus a roughness map, and an orange label printed in the page's own fonts (wait for document.fonts before drawing). It spins at a true 33⅓ rpm.
- Tonearm: pivot base, pillar, cue post, carbon tube, counterweight, offset headshell and an orange cartridge; an arm rest where it parks. Solve the play angle numerically so the stylus lands on the outer groove.
- Light it with a PMREM RoomEnvironment plus a warm key and a cool rim light, ACES filmic tone mapping, sRGB output. A soft radial contact shadow sits under the floating deck.

Motion
- Pin the hero (position: sticky inside a 250vh section). One scroll progress value drives everything, eased toward the target each frame so it feels damped, never on a timer: the camera orbits 90 degrees, drops from 32 to 20 degrees of elevation and pulls in; the arm lifts (0-15%), swings (15-75%) and lowers (75-100%). The hero copy fades out part-way and a caption, "Needle down.", arrives when the stylus touches.
- At rest the deck floats: a slow sway and a small bob, with the shadow breathing against it; both fade out as soon as the reader scrolls. Entrance: the deck rises with a soft overshoot, then the copy.
- Native scrolling only. Keyboard and trackpad work and the page lets go at the end.

Performance and fallbacks: an inline SVG drawing of the deck holds the composition before three.js loads (after first paint) or if WebGL fails. Cap device pixel ratio at 1.75 (1.5 on phones), pause on visibilitychange and when the stage leaves the viewport, and dispose geometry, materials, textures and the renderer, then force context loss, on pagehide. Frame the camera from the aspect ratio so the whole deck fits: portrait frames put the deck above the copy, short frames step back.

Under prefers-reduced-motion the section is not pinned, the deck is still in a three-quarter view with the needle already down, the readout says DOWN, and all copy shows at once. No photographs, external images or fonts, or invented reviews.`,
    tags: '3d, hero, animation, threejs, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 245,
  },
  {
    id: 'c-14',
    free: true,
    title: '3D hero — morphing blob background',
    text: `Build a hero for No. 7 Fig Smoke, an eau de parfum by Hollis & Vane, a small perfumer in Frome, Somerset. The centrepiece is a large morphing form rendered in WebGL, and it is not decoration: it is the fragrance. Its colour, surface and pace change as the scent moves from top notes to heart to base.

Copy (write it, commit to it)
- Nav: the wordmark "Hollis & Vane" in the display serif with an italic ampersand, Fragrances, Samples, The workshop, and a pill "Bag 0".
- Eyebrow in mono caps "No. 7 · Fig Smoke · eau de parfum"; headline "Fig leaf," with "then smoke." on a second line in italic, indented half an em and in a lighter ink; a lede on how it develops over about six hours on skin; two pill buttons, "Order a 2 ml sample £6" (filled) and "50 ml bottle · £118" (outline).
- A three-column notes row: Top (0–20 min) Bergamot, fig leaf; Heart (20 min–2 h) Fig milk, orris; Base (2–6 h) Vetiver, birch tar. Each column is a button with aria-pressed; the selected one gets a 2px rule along its top. Under it, one mono line: batch 14, bottled 3 September 2026, blended and filled in Frome.
- No reviews, press logos or ratings.

Palette and type
- Ground #0E110D with a faint SVG feTurbulence grain at 9% in overlay; cream #EDE6D6 type with #B3AD9D secondary and 14% cream hairlines. The only colour on the page comes from the form.
- Bodoni Moda (regular and italic) for the wordmark, headline and note names, set at about 8vw with tight tracking; Instrument Sans for UI; DM Mono for labels.

The form (three.js ShaderMaterial on an indexed SphereGeometry, about 190 x 145 segments, fewer on phones)
- The vertex shader displaces each vertex along its normal with two octaves of 3D simplex noise drifting on different axes, so there is no loop point, and rebuilds the normal from two neighbouring samples.
- The fragment shader colours by facing: one note colour on the upper surface, a deeper one below, a third swept across one side, darker in the hollows. Add a tight specular highlight, a thin reflection band, and a fresnel rim that blends toward a thin-film iridescence.
- Each note is a set of targets: top is acid green #DFE879 over leaf #5D8A3A, livelier noise; heart is cream #EFE2CC over orris grey-violet #8F7F9C, slow and rounded; base is dark resin #6A4526 over #140F0B with an amber rim, heavy and slow. Ease every uniform toward the chosen note, and advance the noise by a phase that accumulates speed, so a change of pace never jumps the surface.
- After load, run the dry-down once: top, heart, base at 3.2 seconds each, then hold. Clicking a note takes over. The form breathes ±2% over four seconds and turns slowly.
- Frame it off-centre: on desktop it fills the right half and bleeds off the edge, clear of the nav; in portrait frames it sits above the copy with a scrim fading into the ground behind the text.

Performance: load three.js after first paint behind a CSS still of the same drop, cap device pixel ratio at 1.75 (1.5 on phones), pause on visibilitychange and when the hero leaves the viewport, and dispose the geometry, material and renderer and force context loss on pagehide.

Under prefers-reduced-motion render one composed frame of the heart note, keep the note buttons working (each click redraws one still frame), and show all copy at once. No photographs, external images or fonts.`,
    tags: '3d, blob, shader, glsl, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 198,
  },
  {
    id: 'c-15',
    free: true,
    title: '3D hero — scroll-driven text extrusion',
    text: `Build a scroll-driven 3D wordmark for Halliday Wood Type, a small foundry that digitised a 19th-century wood-type gothic (Halliday Gothic No. 3, cut by Halliday & Sons of Ipswich in 1874, rebuilt from 212 surviving sorts). The word HALLIDAY extrudes into physical letterpress sorts: inked black faces on maple blocks. Scrolling lifts the type, tips the camera over the press bed, then scatters the sorts as if they were being distributed back into the case, and the page lands on the type specimen.

Palette and type
- Newsprint paper #EFE7D6 with a slightly darker bed #E6DCC7, ink #171311 with #51483F secondary, maple from #C49660 at the face to #7A522C at the back, and one vermilion #C63C26 for "No. 3", the selected licence and focus rings.
- Anton as the wood-type gothic (caps), Literata for reading text, DM Mono for labels.

The extrusion (CSS 3D, no WebGL)
- Each letter is a stack of 14 copies behind an inked face, translated back in Z by a depth that grows with scroll, each coloured a step darker along the maple ramp. Keep every element in the chain free of filters and of opacity below 1 (both flatten a preserve-3d stack): fade the layers themselves, not the letter.
- One progress value p from 0 to 1, written by a requestAnimationFrame-batched scroll listener as a custom property, drives it all with calc(): at 0 the word is already a shallow, finished block with a slight tilt; up to about 0.45 the camera tips 40 degrees over the top and the depth deepens; a bed of faint grain lines rises into view; from 0.56 each sort flies off on its own vector (x, y, z and two rotations set per letter) and fades. Pin the hero with position: sticky inside a 260vh section, and use overflow-x: clip, never hidden, on the page wrapper so the sticky works.
- A caption fades in at the tip ("Cut in end-grain maple", the sort depth and the kept wear) and a mono readout counts the sort depth up to 23 mm.

The specimen below
- "Halliday Gothic No. 3" huge, with a paragraph on where the sorts came from; a pangram set across the page; a type tester (a textarea in the face with a size slider and three ink swatches with aria-pressed); a character grid that inverts on hover; four facts (one style, 312 glyphs, 96 languages, OTF and WOFF2 with a wear axis).
- "Licence No. 3" on ink: desktop £60, web £90, both £120 as a radio list with plain-English limits, an add-to-basket button that shows the total and a demonstration message, and prices that say they exclude VAT. Footer with the company details.

Under prefers-reduced-motion nothing pins or scatters: freeze at p = 0.42, the deepest and most tipped frame, with the caption shown. Phones get the same sequence in a 220vh section with a smaller wordmark. No photographs or external fonts.`,
    tags: '3d, text, scroll, animation, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 167,
  },
  {
    id: 'c-16',
    free: true,
    title: '3D hero — interactive particle wave',
    text: `Create a hero for Tidewatch, a data service that publishes forty-three years of sea surface temperature (September 1982 to now) as NetCDF, Zarr or JSON. The hero is a real-time WebGL field of points that reads as a sea surface, with the copy set on it.

Copy: a nav (a logo drawn as three wave lines, Data, API, Methods, Status, Request access), the headline "Forty-three years of sea temperature, in one request." with its second half in a lighter weight, a lede with one specific figure (1.4 billion gridded readings), "Browse the grid" and "Read the API spec", a sample request line in mono, and a four-cell spec row: 0.25 degree resolution, 6-hourly cadence, coverage 1982 to now, stated error of plus or minus 0.11 C. No invented customers or testimonials.

Palette: ink teal-black #041110, warm white #F1EADB for type and crests, deep sea #1F4A44 for troughs, and one phosphor green #6CF5B8 for pointer ripples, focus rings and the method in the request line. Type: Epilogue (700, tight tracking) for the headline, Azeret Mono for the request line and specs.

The field, in three.js (THREE.Points with a ShaderMaterial):
- A lattice whose rows widen with distance and space out with depth, so points stay evenly spaced on screen and none are spent off-screen. A coarser lattice on phones.
- The vertex shader sums three sine layers on different headings (speeds 0.5, 0.8 and 1.2) so the surface never visibly repeats. Brightness and point size follow crest height, and points fade with distance.
- Entrance: the field reveals from the horizon towards the viewer over 1.9s while the amplitude grows.
- Pointer: raycast to the water plane. Moving lifts a soft swell under the cursor and drops expanding rings every few units of travel; a click drops a bigger one. When nobody steers, a buoy pings a ring every 3.6s. Up to four rings live at once, as shader uniforms.
- Scrims keep the type legible. Before WebGL starts, and if it fails, a CSS dot-grid plane in perspective holds the composition.

Performance: load three.js after first paint, cap device pixel ratio at 1.75 (1.5 on phones), drive motion from elapsed time, pause on visibilitychange and when the hero leaves the viewport, and dispose the renderer and force context loss on pagehide.

Under prefers-reduced-motion render exactly one composed frame with a ring mid-flight beside the headline, attach no pointer handlers, and show all copy at once. On phones the field sits above the headline and the specs become two columns; in a short 640 x 400 frame drop the lede and show two specs.`,
    tags: '3d, particles, interactive, wave, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 312,
  },
  {
    id: 'c-17',
    free: true,
    title: '3D hero — glass card carousel',
    text: `Design the hero for "Light Before Film", an exhibition of 212 hand-painted magic lantern slides (1850 to 1920) at a museum of optics in Bath. The centrepiece is a 3D carousel of six glass slides on a slowly turning ring, and the glass is literal: painted scenes behind glass in card mounts, lit as if by a projector.

Copy
- Nav: the museum's lens mark and name, Exhibitions, Collection, Visit, and a "Free tickets" pill.
- An eyebrow (gallery and closing date), "Before cinema, there was glass." with the last word in lamp amber, one lede with the real count and dates, "Plan your visit" and "Browse all 212 slides".
- A base row: entry, opening hours and the daily lantern show, beside a live caption for the front slide (number, title, maker and year, and two sentences on how that slide was made).

The six slides (draw each one in SVG in the flat, glazed colours of painted lantern slides)
1. The Moon, after Lord Rosse (Newton & Co., 1864), in a round mask. 2. Donati's Comet (1858), the tail scratched through varnish. 3. A chromatrope (c. 1870) whose petals turn slowly, since that is what the real rack-work slide did. 4. Fingal's Cave, Staffa (Walter Tyler, 1885). 5. The Eddystone Light (York & Son, 1882) with its beam. 6. Diatoms, arranged (J. D. Möller, 1890). Each mount carries a small typed label with the slide number and maker.

Palette and type
- Warm theatre black #100E0C, cream #EFE6D4 text with #B5AB99 secondary, and lamp amber #F0B458 for the one highlight word, the primary button, the active dot and focus rings. One soft pool of warm light sits behind the ring; nothing else glows.
- Gloock for the headline and slide titles, Schibsted Grotesk for text, Martian Mono for labels.

The ring
- Six slides 60 degrees apart on a ring tilted 8 degrees, each rotateY'd into place and pushed out with translateZ, with backface-visibility hidden so the far slides never show mirrored.
- Every frame, work out how far round each slide is from the viewer: the front one is largest, the others scale down and fall into shadow through an overlay's opacity (not a filter, which is expensive to repaint on six elements).
- It turns at 4.5 degrees per second, driven by the frame delta so a 120 Hz screen turns at the same speed. It pauses on hover, while dragging and for five seconds after a button press; it stops when the tab is hidden or the hero leaves the viewport.
- Dragging spins it (0.26 degrees per pixel) and release snaps to the nearest slide by the shortest way round. Previous and next buttons with labels, six dots, and left and right arrow keys on the focused carousel. All six slides stay in the accessibility tree as labelled groups, and the caption is aria-live.

Under prefers-reduced-motion there is no auto-turn, no easing and no chromatrope spin: the ring rests with the Moon square-on, and the buttons jump straight to each slide. Phones stack the copy above a smaller ring. No photographs, stock images or glassmorphism panels.`,
    tags: '3d, carousel, glass, interactive, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 189,
  },
  {
    id: 'c-18',
    free: true,
    title: 'Lottie animation — loading states',
    text: `Design a set of five looping micro-animations for loading states, and present them as the "Loading states" page of a design system's motion docs: a specimen sheet a developer could build from, with a transport bar that lets you stop time and scrub through every loader frame by frame.

Invent the system and commit to it: Ferrite UI, a design system for operations software, version 2.4.0, MIT licensed. Warm paper ground #F3F2EE, near-black ink #16171A, one oxide accent #B8430F used only for the scrubber, the playheads and focus rings. Geist for text, Geist Mono for names, timings and sizes. Hairline dividers, no cards floating on shadows.

Build them in CSS and inline SVG. Do not reach for an animation runtime. Every one of these is ten to fifteen lines of CSS, and shipping a player plus a JSON payload to draw three pulsing dots costs more than the wait it is covering. (If the project already loads a vector-animation runtime for illustration work, fine — but these five do not justify one on their own.)

The five:
1. pulse-dots — three dots scaling in sequence, like a typing indicator.
2. orbit-spinner — an indeterminate ring: a comet head with a trail fading out behind it, over a faint full-circle track.
3. skeleton-shimmer — a light band sweeping diagonally across a placeholder block.
4. progress-ring — a determinate ring that fills clockwise to a known percentage, with a rounded cap and a numeric label. Determinate and indeterminate are different components: if you cannot name the fraction honestly, use the spinner instead. Do not specify one and build the other.
5. content-loader — three bars of decreasing width fading in sequence, standing in for text.

Present them as a sheet: five columns joined by hairlines, each specimen centred in its own square well with its size in the corner, then its name in monospace, its timing, and one bold line on when to reach for it. Put one specimen on a dark ground to prove that they inherit \`currentColor\`. Under each, draw a keyframe strip: one thin lane per animated part showing where in the cycle it is active, the cycle length at the end, and an oxide playhead.

The transport (sticky under the header): Play/Pause, a Frame slider from 0 to 1800 ms with the current time in tabular mono, speed 0.5× / 1× / 2×, and a Light / Dark ground switch that flips the page and proves the loaders follow it. One clock drives all five: once the script runs, pause every specimen animation and set \`animation-delay: calc(var(--stag) - var(--clock) * 1s)\`, then update \`--clock\` from a single requestAnimationFrame loop. Dragging the slider pauses and seeks. Stop the loop when the tab is hidden. Watch the cascade: a specimen's \`animation\` shorthand resets play-state and delay, so the clock rule needs the higher specificity. The toolbar never wraps: under 900px, speed and ground move into a More popover (Escape and an outside click close it), and on phones Play shrinks to its icon.

Then show three of them in context, because a loader is only correct in the layout it is covering: a Runs panel that keeps the one row it already knows and shimmers the three it does not, a "Saving changes" button that keeps its width while it waits, and an upload row with the ring and "41.6 of 65 MB · about 12 s left". Make the ring's label count up with its arc (a registered \`@property\` integer feeding a CSS counter), with the static "64%" as the fallback. Close with three rules in a row: under a second show nothing (wait 400 ms, then keep it up for 600); a known shape gets a skeleton; a known fraction gets the ring.

\`\`\`json
{
  "animations": [
    { "name": "pulse-dots", "duration": 1200, "size": [48, 16], "dots": 3, "dotRadius": 4, "gap": 12, "scaleRange": [0.6, 1.0], "stagger": 150, "easing": "ease-in-out", "color": "currentColor" },
    { "name": "orbit-spinner", "duration": 1000, "size": [32, 32], "strokeWidth": 3, "trailLength": 0.8, "trailOpacity": [1.0, 0.0], "color": "currentColor" },
    { "name": "skeleton-shimmer", "duration": 1500, "bandWidth": "40%", "angle": -20, "easing": "linear", "note": "keep the band over the block for most of the cycle" },
    { "name": "progress-ring", "duration": 900, "cycle": 1800, "value": 64, "size": [40, 40], "strokeWidth": 3, "lineCap": "round", "determinate": true, "label": "counts with the arc" },
    { "name": "content-loader", "duration": 800, "bars": [ { "width": "100%" }, { "width": "80%" }, { "width": "60%" } ], "barHeight": 12, "radius": 6, "stagger": 100, "fadeRange": [0.3, 1.0] }
  ],
  "color": "currentColor",
  "frameRate": 60
}
\`\`\`

The rule that decides whether this set is any good: author every specimen at its rest frame — the staggered dots at their three scales, the spinner as a three-quarter arc, the shimmer band parked over the block, the ring at its filled value, the bars at their three opacities — and add the motion inside \`@media (prefers-reduced-motion: no-preference)\`. Then switching motion off leaves five still, deliberate loaders rather than five empty boxes. A loading state that disappears for anyone with motion reduced is worse than no loading state at all.`,
    tags: 'animation, lottie, loading, micro, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 256,
  },
  {
    id: 'c-19',
    free: true,
    title: 'Scroll-triggered section transitions',
    text: `Build a scroll-driven long read, "How a frame gets made", for Aldermoor Cycles, a one-person steel frame builder on Kelham Island, Sheffield. The page is scrollytelling: a drawing of the bike sticks beside the text and builds itself chapter by chapter as the reader scrolls, and each chapter's text arrives with a different transition, labelled with its name in a small mono chip so the page doubles as documentation for the set.

Copy (write it, with real figures)
- Masthead: a small bike mark and "ALDERMOOR", links Frames, Fitting, Build list.
- Hero: kicker "The build, in five parts"; the headline in huge condensed caps; a serif standfirst ("Nine tubes, one drawing, nine joints and eleven days…"); a byline with the builder's name, how many frames he has built, the town and "8 minute read"; and the finished bike drawn on the right with a caption naming the model, size and colour.
- Five chapters, each with a number and day range, a condensed caps heading, a paragraph or two in the serif, and where it helps a row of three facts: 01 the tubing (Columbus Spirit, butted 0.7/0.4/0.7 mm, checked on a granite plate); 02 the full-size drawing (72.5° head angle, 73.5° seat angle, 70 mm bottom bracket drop, signed and then fixed); 03 fillet brazing at about 870 °C and why that number matters; 04 paint (shot-blast, phosphate, two coats of Moor Green, hand lettering, three days to cure); 05 build, alignment check and a 50 km test ride, eleven days in all.
- Close: "Built once, by someone whose name is on it.", the starting price (£2,450) and the current wait (fourteen weeks), "Join the build list" and "Book a fitting in Sheffield". Footer with company details. No reviews or press quotes.

Palette and type
- Blued-steel ground #15171A, warm white #E7E2D6 text with #AEABA1 secondary, 13% hairlines, brass #D2A857 for chips, dimensions and the primary button, steel grey #8B9298 for bare tubes, Moor Green #2F7256 for paint and cream lettering.
- IBM Plex Sans Condensed 700 in caps for headings, Newsreader for the reading text at 19px, IBM Plex Mono for chips, facts and the meter.

The drawing (inline SVG, one viewBox, every stroke with pathLength="1")
- A tube rack (nine bars with their diameters), the six frame tubes, five joints, a dimension layer (angle arcs, the drop, top-tube length) in brass, the down-tube lettering, and the finishing parts: fork, seatpost and saddle, stem and drop bars, chainring and crank, two wheels with tyres, rims and 32 spokes.
- One progress value P from 0 to 5 (the sum of each chapter's progress across the middle of the screen) drives it: the rack fades as the tubes draw in by dash offset (1); the dimensions appear (2); each joint in turn heats through dull red, cherry, orange and straw and cools again, with a live "Joint heat" readout in °C (3); the tubes change from steel to green and the lettering appears (4); the parts and wheels draw in and the spokes fade up (5). A meter under the drawing names the stage and lights five ticks.
- Author the SVG in its finished state; the hero shows a copy of it.

Transitions (one per chapter, and the close)
- curtain-reveal (clip-path from a centre band), parallax-stagger (children rise 60px, 0.1s apart), scale-fade (0.85 to 1 from the bottom), horizontal-slide (alternate paragraphs from left and right), text-split-reveal (characters rise and tip in, 20ms apart, with words kept whole so lines break cleanly).
- Hidden start states exist only behind a .js class the script adds before observing, so if the script fails the page is complete. An IntersectionObserver reveals each once, and anything already on screen at load is revealed at once.
- One passive scroll listener batched through requestAnimationFrame; native scrolling only.

Phones: the drawing sticks to the top of the screen above the chapters, which scroll beneath it. Under prefers-reduced-motion nothing is hidden or sticky, the drawing stays finished with its dimensions shown, and a one-line note says the motion is reduced.`,
    tags: 'scroll, animation, gsap, transitions, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 174,
  },
  {
    id: 'c-20',
    free: true,
    title: 'CSS-only image hover gallery',
    text: `Build the work index for Offcut Press, a two-drum risograph studio in Footscray: "Selected prints, 2024–26", six prints in an asymmetric 12-column gallery, where each print answers the pointer and the Tab key with a different hover effect. No JavaScript at all, and no image files: every print is inline SVG in flat riso inks.

Copy (write it, with real details)
- Masthead: the wordmark printed twice, Fluoro Pink with a Teal copy offset 2px, both on mix-blend-mode: multiply so it looks misregistered; links Prints, Inks and "Open Sat 10–2" with a small green dot.
- Intro: a mono kicker ("Risograph studio · Footscray"), a huge tight headline with the year range in Federal Blue, a two-sentence lede, and a how-to line: "Point at a print, or press Tab to step through all six", with Tab drawn as a key. On touch screens (hover: none) it says "Tap a print" instead.
- An "On the drums" strip: eight ink swatches with their riso names (Fluoro Pink, Teal, Blue, Yellow, Green, Orange, Federal Blue, Metallic Gold).
- Six prints, each with a label row (number, effect name, and the CSS property it uses in mono, right-aligned), the print, then name, year, client line and a spec line (size, inks, run). 01 The River, Walked: a walking map with contour lines, the river, a dotted pink route and the studio pin. 02 Low Tide Choir: a gig poster with two overprinted suns. 03 Barkly Street Roasters: a round coffee label with text on a circular path and halftone hills. 04 Night Shift: a zine cover in gold on black. 05 Seed Calendar 2027: a twelve-month sowing wheel. 06 Afternoon, Yarraville: weatherboard houses under an orange sun.
- A colophon beside the last print explaining how the tiles work, a pill "Book the press" button with the hourly rate, and a three-column footer with the address and opening hours.

Palette and type
- Warm paper #E9E4D8, sheet #F6F2E9, ink #1E1C19 with #57534B and #6E6A61 secondaries, hairlines at 16% ink. The inks are the real riso drum colours: Fluoro Pink #FF48B0, Teal #00838A, Blue #0078BF, Yellow #FFE800, Green #00A95C, Orange #FF6C2F, Federal Blue #3D5588, Metallic Gold #AC936E.
- Bricolage Grotesque 700–800 for the headline, names and the lettering inside the prints; DM Mono for labels, specs and map text.
- Overprint every ink layer with mix-blend-mode: multiply so crossings darken the way riso does. Two shapes in the same ink go in one blended group so they never darken each other. A light SVG noise layer over each print gives it paper grain. Map labels sit on sheet-coloured knockouts, and nothing starts or ends inside a knockout.

The six effects (every one wired to :hover and :focus-within, and every tile is a real link)
1. Ken Burns: the map zooms toward the studio pin (transform-origin on the pin, scale(1.14) translateX(-2%)), eight seconds in, about one second back.
2. Colour reveal: the poster starts as a greyscale proof (filter: grayscale(1)) and prints in colour. It must still read as a composed piece in grey.
3. Split reveal: the art lifts 12% and a black caption wipes up from the bottom with clip-path: inset(100% 0 0 0) to inset(0). The name stays visible below the tile.
4. Tilt shine: perspective tilt (rotateY(-8deg) rotateX(4deg)) with a soft elevation shadow, and a warm light sweep across the gold from a pseudo-layer on screen blend.
5. Blur focus: while this tile is hovered or focused, every other tile blurs 5px and dims, through .gallery:has(.fx-blur:hover) and the matching :focus-within rule.
6. Border frame: a mount closes in from the edges with inset box-shadows, finished with a hairline bevel.

Rules
- Underline the print name on hover and focus, and give the focused print a 2px ink outline offset 5px. Each tile links to its own id with scroll-margin-top, so a click never scrolls the art away.
- Resting states are finished states. Only the transitions sit inside @media (prefers-reduced-motion: no-preference). Under reduce, every state still changes at once, and the two effects that travel swap for still highlights: the pin gets a halo instead of the zoom, and the zine gets a gold ring and a fixed shine instead of the tilt.
- Tablet: 6 columns, the map and the houses full width. Phones: one column, the smaller prints at 72–88% width, alternating left and right so the rhythm survives.

\`\`\`css
.fx-ken .art { transform-origin: 47.5% 66%; }
.fx-ken:hover .art, .fx-ken:focus-within .art { transform: scale(1.14) translateX(-2%); }

.fx-split .reveal { clip-path: inset(100% 0 0 0); }
.fx-split:hover .reveal, .fx-split:focus-within .reveal { clip-path: inset(0); }

.gallery:has(.fx-blur:hover) .tile:not(.fx-blur),
.gallery:has(.fx-blur:focus-within) .tile:not(.fx-blur) { filter: blur(5px) saturate(.6); opacity: .45; }

.fx-frame:hover .mount, .fx-frame:focus-within .mount {
  box-shadow: inset 0 0 0 clamp(16px, 2.4vw, 30px) var(--sheet),
              inset 0 0 0 calc(clamp(16px, 2.4vw, 30px) + 1px) rgba(30, 28, 25, .35);
}

@media (prefers-reduced-motion: no-preference) {
  .fx-ken .art { transition: transform 1.1s cubic-bezier(.4, 0, .2, 1); }
  .fx-ken:hover .art, .fx-ken:focus-within .art { transition: transform 8s cubic-bezier(.2, .6, .35, 1); }
  .fx-split .reveal { transition: clip-path .5s cubic-bezier(.16, 1, .3, 1); }
}
\`\`\``,
    tags: 'css, gallery, hover, animation, no-js',
    img: '',
    author: 'UIL4B Team',
    saves: 287,
  },
]

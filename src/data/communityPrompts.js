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
    text: `Design a professional one-page website for a local plumbing business called "FlowFix Plumbing". Include these sections:

1. Hero: Bold headline "Your Local Plumbing Experts", a subline about 24/7 emergency service, and a prominent "Call Now" button with phone number.
2. Services grid: 6 service cards with icons — Emergency Repairs, Blocked Drains, Hot Water Systems, Gas Fitting, Bathroom Renovations, Leak Detection.
3. Trust signals: Years in business, jobs completed, Google rating, fully licensed & insured badges.
4. About: Photo of the team, brief story, service area map.
5. Testimonials: 3 customer reviews with star ratings.
6. Contact: Simple form (name, phone, email, message) plus business hours and service area.
7. Footer: Logo, phone, email, ABN, licence number.

Colour scheme: navy blue (#1B3A5C) and orange (#F47B20) on white. Clean, trustworthy, mobile-first.`,
    tags: 'business, local, plumbing, one-page',
    img: '',
    author: 'UIL4B Team',
    saves: 203,
  },
  {
    id: 'c-2',
    free: true,
    title: 'Restaurant website with menu',
    text: `Design a website for a modern Italian restaurant called "Osteria Luna". Sections:

1. Hero: Full-screen background image of the restaurant interior, logo overlay, tagline "Authentic Italian, Modern Soul", and a "Reserve a Table" CTA.
2. About: Side-by-side image and text telling the chef's story.
3. Menu: Tabbed layout (Antipasti, Primi, Secondi, Dolci, Drinks) with dish name, short description, and price. Use elegant serif typography.
4. Gallery: Grid of food and atmosphere photos with lightbox.
5. Reservations: Embedded booking widget or a form with date, time, party size, name, phone.
6. Location & Hours: Google Maps embed, address, parking info, weekly hours.
7. Footer: Social links (Instagram, Facebook), phone, email.

Style: warm and intimate — dark backgrounds (#1A1A1A), cream text (#F5F0E8), gold accents (#C9A96E). Serif headings, clean sans-serif body.`,
    tags: 'restaurant, menu, booking, elegant',
    img: '',
    author: 'UIL4B Team',
    saves: 178,
  },
  {
    id: 'c-3',
    free: true,
    title: 'Dark mode analytics dashboard',
    text: `Design a data dashboard interface with a dark theme. Use a sidebar navigation with icons, a top stats bar with 4 KPI cards (revenue, users, conversion rate, active sessions), a main chart area with a line graph, and a recent activity feed below. Colour palette: charcoal backgrounds (#1a1a2e, #16213e), electric blue accents (#0f3460, #53a8b6), and clean white text. Ensure strong visual hierarchy and clear data presentation.`,
    tags: 'dashboard, dark, analytics, ui',
    img: '',
    author: 'UIL4B Team',
    saves: 215,
  },
  {
    id: 'c-4',
    free: false,
    title: 'Freelancer portfolio',
    text: `Design a personal portfolio website for a freelance graphic designer. Keep it minimal and let the work speak.

1. Header: Name/logo, nav (Work, About, Contact), with a "Let's Talk" button.
2. Hero: Large statement — "I design brands that people remember." with a subtle animated background.
3. Selected Work: Grid of 6-8 project thumbnails. On hover: project name and category appear over a dark overlay. Click opens a case study page.
4. About: Photo, short bio, list of skills, tools used (Figma, Illustrator, etc.).
5. Testimonials: Carousel with client quotes.
6. Contact: Clean form + social links + email.

Style: black and white with one accent colour. Lots of whitespace. Modern sans-serif typography. The portfolio should feel curated, not cluttered.`,
    tags: 'portfolio, freelancer, minimal, creative',
    img: '',
    author: 'UIL4B Team',
    saves: 156,
  },
  {
    id: 'c-5',
    free: false,
    title: 'Fitness trainer landing page',
    text: `Design a landing page for a personal fitness trainer. Goal: get visitors to book a free consultation.

1. Hero: High-energy photo background, headline "Transform Your Body in 12 Weeks", sub-headline about the program, CTA "Book Free Consultation".
2. Problem/Solution: Before/after transformation photos with stats.
3. Programs: 3 program cards — Fat Loss, Muscle Building, Sports Performance. Each with duration, sessions per week, and price.
4. Social proof: Client transformations slider, Instagram feed embed, and 5-star review count.
5. About the trainer: Photo, certifications, years of experience, specialities.
6. FAQ: Expandable accordion with common questions.
7. Final CTA: Repeated booking CTA with urgency ("Limited spots available").

Colours: energetic — black (#111), lime green (#CDDC39), white. Bold, motivating typography.`,
    tags: 'fitness, landing, trainer, conversion',
    img: '',
    author: 'UIL4B Team',
    saves: 134,
  },
  {
    id: 'c-6',
    free: false,
    title: 'SaaS pricing page',
    text: `Create a pricing comparison section with three tiers: Free, Pro, and Enterprise. Include a monthly/yearly toggle that animates the prices. The middle (Pro) plan should be visually elevated with a "Most popular" badge, a coloured border, and a slightly larger scale. Each plan card lists 5-6 features with check/cross icons. Use a clean layout with clear visual hierarchy. Add a subtle gradient background behind the section. Include a FAQ section below addressing common billing questions.`,
    tags: 'pricing, saas, component, cards',
    img: '',
    author: 'UIL4B Team',
    saves: 119,
  },
  {
    id: 'c-7',
    free: false,
    title: 'Real estate property listing',
    text: `Design a property listing page for a real estate agency.

1. Property gallery: Full-width image carousel with thumbnails below, floor plan button.
2. Key details bar: Price, bedrooms, bathrooms, parking, land size, property type.
3. Description: Well-formatted property description with highlights list.
4. Features: Grid of feature badges (air conditioning, pool, solar, etc.).
5. Floor plan: Expandable floor plan viewer.
6. Map: Location map with nearby amenities (schools, shops, transport).
7. Agent card: Photo, name, phone, email, agency logo, "Enquire Now" button.
8. Similar listings: 3 related property cards at the bottom.

Style: clean and professional. White background, dark text, blue accent (#2563EB). Photos are the hero — make them large and prominent.`,
    tags: 'real-estate, listing, property, business',
    img: '',
    author: 'UIL4B Team',
    saves: 98,
  },
  {
    id: 'c-8',
    free: false,
    title: 'Coffee shop brand identity',
    text: `Design a brand identity and website for an artisan coffee shop called "Grounded". The brand should feel warm, crafted, and community-focused.

1. Logo concept: Simple mark using a coffee bean or cup silhouette with hand-drawn quality.
2. Colour palette: Warm espresso brown (#3E2723), cream (#FFF8E1), terracotta (#D4896A), sage green (#8FBC8F).
3. Typography: Serif for headings (warm, slightly vintage feel), clean sans-serif for body.
4. Website: Hero with store photo, menu section with coffee/food items, "Our Story" section, location and hours, Instagram gallery.
5. Print materials: Business card, takeaway cup design, loyalty card.

The overall feel should be artisanal without being pretentious — friendly, local, quality-focused.`,
    tags: 'branding, coffee, identity, warm',
    img: '',
    author: 'UIL4B Team',
    saves: 87,
  },
  {
    id: 'c-9',
    free: true,
    title: 'E-commerce product page',
    text: `Design a product detail page for a high-end fashion e-commerce store. Include:

1. Product images: Large main image with zoom-on-hover, thumbnail gallery, 360-degree view option.
2. Product info: Name in refined serif, price with sale variant, colour swatches, size selector with size guide link, quantity picker, "Add to Bag" and "Save" buttons.
3. Description tabs: Details, Size & Fit, Shipping & Returns, Reviews.
4. Reviews section: Star rating summary, individual review cards with verified badge.
5. "Complete the Look" section: 3-4 complementary product suggestions.
6. Recently viewed: Horizontal scroll of previously viewed items.

Style: warm neutrals (cream, taupe) with gold accent (#B8860B). Generous spacing. Photography-focused layout.`,
    tags: 'ecommerce, product, fashion, premium',
    img: '',
    author: 'UIL4B Team',
    saves: 176,
  },
  {
    id: 'c-10',
    free: false,
    title: 'Mobile app onboarding flow',
    text: `Design a mobile app onboarding flow with 4 screens:

1. Welcome: App logo animation, "Welcome to [App]" headline, brief value proposition, "Get Started" button.
2. Feature highlights: 3 swipeable cards each showing an illustration, feature title, and one-line description. Progress dots at the bottom.
3. Permissions: Friendly request for notifications and location with clear explanations of why each is needed. "Allow" and "Maybe Later" options.
4. Account creation: Sign up with Google/Apple, or email. Simple form with name, email, password. Or "Skip for now" link.

Style: Light and friendly. Soft gradients, rounded illustrations, generous padding. Use a consistent illustration style across all screens. Transitions between screens should be smooth horizontal swipes.`,
    tags: 'mobile, onboarding, app, ux',
    img: '',
    author: 'UIL4B Team',
    saves: 92,
  },
  {
    id: 'c-11',
    free: false,
    title: 'Construction company website',
    text: `Design a website for a commercial construction company called "Apex Build Co."

1. Hero: Dramatic construction site photo or drone shot, headline "Building Tomorrow's Landmarks", subline about 25+ years of experience, CTA "Get a Quote".
2. Services: Horizontal scrolling cards — Commercial Buildings, Infrastructure, Fit-Outs, Project Management, Design & Build.
3. Project showcase: Filterable grid (by category) of completed projects with large images, project name, location, and value.
4. Stats bar: Projects completed, years in business, team members, client satisfaction rate — with count-up animation.
5. Process: 4-step visual timeline — Consult, Design, Build, Deliver.
6. Certifications: Safety certifications, industry awards, insurance logos.
7. Contact: Enquiry form + head office address + phone.

Style: Strong and professional. Dark navy (#0D1B2A), steel grey (#415A77), gold accent (#DAA520). Bold sans-serif headings.`,
    tags: 'construction, business, corporate, professional',
    img: '',
    author: 'UIL4B Team',
    saves: 67,
  },
  {
    id: 'c-12',
    free: false,
    title: 'Blog article layout',
    text: `Design a long-form blog article layout optimised for reading. Include: a full-width hero image with overlay title, reading time and author byline below, a sticky table of contents in the left margin on desktop, body text set at 18px with a max-width of 680px for optimal line length, pull quotes styled with a left accent border, inline code blocks, and a "Related articles" grid at the bottom. Typography-focused, minimal distractions. The reading experience should hold up at a 65-75 character measure, the way a printed magazine column does.`,
    tags: 'blog, editorial, typography, content',
    img: '',
    author: 'UIL4B Team',
    saves: 109,
  },
  {
    id: 'c-13',
    free: true,
    title: '3D hero — floating product reveal',
    text: `Design a hero section with a 3D product reveal for a tech product landing page. Invent the product and write its real copy — a named model, a real-sounding price, and four specifications a buyer would actually compare. Do not ship placeholder text.

Layout: headline and sub-headline on the left, the product centred, a specification list on the right. On narrow screens the product moves above the headline.

The product — a smart speaker or a pair of headphones — floats in the centre of the viewport and rotates slowly on the Y axis. As the user scrolls, the camera pulls in and orbits a quarter turn.

Animation sequence:
- On load: the product settles up from below with a soft overshoot; the copy rises after it.
- At rest: continuous slow Y-axis rotation, one turn every 25-30 seconds.
- On scroll: the camera moves in (scale up about 20%) and orbits 90 degrees, bound to scroll position rather than to a timer.
- Background: soft radial gradient from #0a0a1a to #1a1a3e with a drifting particle field.
- Lighting: one warm key light (#fff5e6) from the top-right, one blue rim light (#4466ff) from the back-left, low ambient.

Implementation: Three.js / React Three Fiber if a 3D library is available. If it is not — a single self-contained file, an email, a sandboxed embed — build it with CSS 3D transforms instead: a cylinder body assembled from rotated slats inside \`transform-style: preserve-3d\`, an elliptical top cap, and a fixed lighting overlay painted over the silhouette. A rotating cylinder has a constant silhouette, so this reads as genuinely three-dimensional. Say which route you took.

Two requirements that override the animation spec:
1. The hero must be a finished, photographable composition at scroll 0 and at frame 0. Nothing important may be invisible or mid-transform while it waits to animate.
2. Under \`prefers-reduced-motion: reduce\`, the product holds a good three-quarter pose, the copy is fully visible, and every animation is off. It must look deliberately still, never broken.

JSON config for scene setup:
\`\`\`json
{
  "camera": { "fov": 45, "position": [0, 0, 5], "near": 0.1, "far": 100 },
  "lights": [
    { "type": "directional", "color": "#fff5e6", "intensity": 1.5, "position": [3, 4, 2] },
    { "type": "point", "color": "#4466ff", "intensity": 0.8, "position": [-3, 1, -2] },
    { "type": "ambient", "color": "#ffffff", "intensity": 0.3 }
  ],
  "animation": {
    "autoRotate": { "axis": "y", "secondsPerTurn": 28 },
    "entrance": { "from": { "y": -2, "opacity": 0 }, "to": { "y": 0, "opacity": 1 }, "duration": 1.2, "easing": "easeOutBack" },
    "scrollBound": { "cameraZ": [5, 2.5], "rotationY": [0, 1.57], "range": "0 to 70vh" }
  },
  "particles": { "count": 200, "size": 0.02, "drift": 0.001, "color": "#ffffff", "opacity": 0.4 }
}
\`\`\``,
    tags: '3d, hero, animation, threejs, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 245,
  },
  {
    id: 'c-14',
    free: true,
    title: '3D hero — morphing blob background',
    text: `Create a hero section built around a large morphing organic shape — a blob that deforms continuously, so it reads as something alive rather than a static gradient.

Write the hero itself, not just the background: an eyebrow, a headline of no more than nine words, one sub-line, two buttons, and one concrete detail that proves the product is real (a code snippet, a supported-regions line, a version note). Invent the company and give it a name and a specific job. No invented testimonials, logos or review counts.

The shape:
- A rounded organic form, off-centre, bleeding toward one edge rather than sitting dead centre behind the text.
- It deforms slowly and continuously, with no loop point you can spot.
- Colour shifts across the form as it turns, with a bright rim where the light catches the edge and a soft bloom behind it.
- It breathes: a scale oscillation of a couple of percent over about four seconds.

Palette: choose one that suits the company you invented, and commit to it. Avoid the indigo to violet to pink three-stop gradient (#667eea / #764ba2 / #f093fb and its neighbours) unless the brand genuinely is that — it is the most over-used gradient on the web and it makes any output look generated. A dark ground with one luminous object reads as more expensive than a full-bleed colour wash either way.

Implementation: a GLSL vertex shader displacing an icosahedron with 3D simplex noise if you have WebGL. Without it, get the same result with CSS and SVG: an element whose \`border-radius\` morphs through four keyframe states, filled with a layered gradient, carrying an inset \`box-shadow\` for the fresnel rim, run through an SVG \`feTurbulence\` + \`feDisplacementMap\` filter for an organic edge, with a blurred copy behind it for bloom. Say which route you took.

\`\`\`json
{
  "geometry": { "type": "icosahedron", "radius": 2.5, "detail": 64 },
  "noise": { "frequency": 0.8, "amplitude": 0.6, "speed": 0.15, "octaves": 3 },
  "material": {
    "colorBlend": "normal-based",
    "fresnel": { "power": 2.5, "color": "#ffffff", "opacity": 0.3 },
    "roughness": 0.2, "metalness": 0.1
  },
  "animation": {
    "rotation": { "y": 0.001, "x": 0.0005 },
    "breathe": { "scale": [0.98, 1.02], "duration": 4, "easing": "sine" }
  },
  "postProcessing": { "bloom": { "threshold": 0.6, "strength": 0.4, "radius": 0.8 } }
}
\`\`\`

Under \`prefers-reduced-motion: reduce\` the shape holds one good asymmetric state and every animation stops. The page must look composed, not paused. The hero copy is fully visible at first paint whether or not any animation has run.`,
    tags: '3d, blob, shader, glsl, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 198,
  },
  {
    id: 'c-15',
    free: true,
    title: '3D hero — scroll-driven text extrusion',
    text: `Design a scroll-driven 3D text hero where a company name extrudes from near-flat to full depth as the user scrolls, then breaks apart into its letters.

Use a real name. Invent a studio or a company, give it a name of six to ten letters, and write one line of positioning copy and a short list of real-sounding work below the hero. "YOUR BRAND" in the output is a failure.

The sequence, driven by scroll position:
- 0%: the wordmark is already dimensional — a shallow chiselled extrusion, slight tilt, crisp. This is the state a screenshot will catch, so it has to be finished on its own.
- 25-50%: the camera tips over the top of the letters, the extrusion deepens dramatically, and the surface they stand on comes into view.
- 60-100%: the letters separate, rotate and drift apart, fading as the next section arrives.

Pin the hero (\`position: sticky\`) for the length of the sequence so it plays in place. An unpinned hero scrolls out of frame before the animation has finished. Note that \`overflow-x: hidden\` on \`html\` or \`body\` silently breaks \`position: sticky\` — use \`overflow-x: clip\`.

\`\`\`json
{
  "text": { "font": "geometric sans, 700-800 weight", "extrudeDepth": { "start": 0.2, "end": 1.0 }, "bevel": true },
  "camera": { "rotateX": [6, 46], "rotateY": [-9, -19], "scale": [1, 1.05] },
  "scatter": { "startAt": 0.58, "endAt": 1.0, "force": 3, "rotationRandom": 2 },
  "material": { "color": "#ffffff", "roughness": 0.15, "metalness": 0.9 },
  "environment": { "background": "#0a0a0a", "floorGrid": "fades in with scroll", "fog": true }
}
\`\`\`

Implementation: Three.js \`TextGeometry\` if a 3D library is available. Without one, stack 14-18 absolutely positioned copies of each letter at increasing negative \`translateZ\` inside \`transform-style: preserve-3d\`, darkening with depth, with a gradient-filled front face. Drive the whole sequence from one scroll progress value: prefer a CSS scroll-driven animation (\`animation-timeline: scroll()\` on a registered \`@property\`), and fall back to a \`scroll\` listener that sets the same custom property. Do not put a \`filter\` on any element inside the 3D chain — it flattens the extrusion.

Under \`prefers-reduced-motion: reduce\`, freeze the sequence at roughly 40% — full extrusion, camera tipped, nothing scattered and nothing faded — and remove the extra scroll length. That is the strongest single frame in the sequence and it must be what a reduced-motion visitor gets, not the flat start and not an empty screen.`,
    tags: '3d, text, scroll, animation, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 167,
  },
  {
    id: 'c-16',
    free: true,
    title: '3D hero — interactive particle wave',
    text: `Create an interactive particle wave field for a website hero. A dense grid of points forms a wave surface in perspective, animating continuously and reacting to the pointer.

Write the hero over it: an eyebrow, a headline, one sub-line and two buttons for a company you invent, plus a short row of real specifications. A field of particles with no copy on it is a screensaver, not a hero. Add a soft scrim behind the text so it stays legible over the brightest part of the field.

The wave:
- Sum three sine/cosine layers of different frequency, amplitude and speed, so the surface never visibly repeats.
- Perspective camera above and in front, looking down at the plane; points shrink and dim with distance.
- Brightness tracks crest height, so the wave reads as a surface and not as a starfield.
- On pointer move, points within a radius of the cursor lift in a ring and glow. The strength decays when the pointer leaves.

\`\`\`json
{
  "grid": { "target": "4000-10000 points", "note": "reduce until it holds 60fps on a mid-range laptop" },
  "wave": { "layers": [ { "freq": 0.3, "amp": 0.8, "speed": 0.5 }, { "freq": 0.7, "amp": 0.3, "speed": 0.8 }, { "freq": 1.2, "amp": 0.1, "speed": 1.2 } ] },
  "mouse": { "radius": 3, "strength": 1.5, "decay": 0.94, "rippleSpeed": 2 },
  "particle": { "color": "#8B9CFF", "glowColor": "#ffffff", "sizeAttenuation": true, "opacity": 0.7 },
  "camera": { "position": [0, 6.5, 12], "lookAt": [0, 0, 0], "fov": 52 },
  "background": "deep navy, painted explicitly — a hero cannot have a transparent background"
}
\`\`\`

Implementation: \`THREE.BufferGeometry\` with a point cloud if WebGL is available. Without it, Canvas2D does this well — project each grid point by hand and draw it with \`fillRect\`, iterating rows from far to near so nearer points overdraw, and quantise the colour into a small palette so you are not building a fill string per point per frame. A 128 x 128 grid is a WebGL figure; in Canvas2D start lower and raise it only while the frame budget holds.

Three requirements:
1. Seed the animation clock at a non-zero time and draw one frame synchronously before the first \`requestAnimationFrame\`, so the first paint is a formed wave and not an empty box.
2. Drive motion from elapsed time, not from a per-frame increment, or the wave runs at a different speed on a 144 Hz display.
3. Under \`prefers-reduced-motion: reduce\`, draw exactly one frame and stop. Attach no pointer handlers. The still frame must be a composed image in its own right.`,
    tags: '3d, particles, interactive, wave, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 312,
  },
  {
    id: 'c-17',
    free: true,
    title: '3D hero — glass card carousel',
    text: `Design a hero section with a 3D carousel of glass cards orbiting a central point. Six cards, each carrying one feature, auto-rotating slowly, with drag to spin and snap-to-card on release.

Content: write six specific claims for a product you invent, each with a number in it. "Fast Setup — get started in under 5 minutes", "Secure — enterprise-grade security built in" and "Real-time — live updates across all devices" are the generic feature cards every generated page ships; replace them with claims a real engineer would write, one per card, each with a supporting figure underneath (a latency, a licence, a region count).

Geometry and material:
- Six cards on a ring, 60 degrees apart, each facing outward, the ring tilted a few degrees.
- Glass: translucent, a light border, a bright refraction edge down the leading side, an inner top highlight and a broad drop shadow.
- The front card is largest and fully opaque; cards further round the ring scale down, fade, and darken.
- \`backface-visibility: hidden\` on every card — without it the far cards paint their own mirrored text through the ring.
- Use a perspective value high enough that the front card does not magnify past its container. The height you must actually fit is cardHeight x perspective / (perspective - radius).

Controls: drag is not enough on its own. Ship previous/next buttons with visible focus rings and accessible labels, a position indicator, and keep every card in the DOM so a screen reader can read all six. Auto-rotation pauses on hover, on drag and after a button press.

\`\`\`json
{
  "carousel": { "radius": 340, "cardCount": 6, "autoRotate": "4-5 degrees per second", "snapOnRelease": true, "dragSensitivity": 0.26 },
  "card": { "width": 240, "height": 250, "cornerRadius": 20, "focusScale": 1.06, "fadeRange": [0.26, 1.0] },
  "environment": { "background": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", "lamps": "two or three soft radial lights for the glass to catch" }
}
\`\`\`

Express rotation speed in degrees per second and drive it from a frame delta. A per-frame increment runs at double speed on a 120 Hz display.

Under \`prefers-reduced-motion: reduce\`: no auto-rotation, no easing. The ring sits at its rest angle with the front card square-on and readable, the neighbours legible at their angle, and the buttons still work — they jump straight to the next card. Six cards, still, is the finished composition.`,
    tags: '3d, carousel, glass, interactive, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 189,
  },
  {
    id: 'c-18',
    free: true,
    title: 'Lottie animation — loading states',
    text: `Design a set of five looping micro-animations for loading states, and present them as a specimen sheet a developer could build from.

Build them in CSS and inline SVG. Do not reach for an animation runtime. Every one of these is ten to fifteen lines of CSS, and shipping a player plus a JSON payload to draw three pulsing dots costs more than the wait it is covering. (If the project already loads a vector-animation runtime for illustration work, fine — but these five do not justify one on their own.)

The five:
1. pulse-dots — three dots scaling in sequence, like a typing indicator.
2. orbit-spinner — an indeterminate ring: a comet head with a trail fading out behind it, over a faint full-circle track.
3. skeleton-shimmer — a light band sweeping diagonally across a placeholder block.
4. progress-ring — a determinate ring that fills clockwise to a known percentage, with a rounded cap and a numeric label. Determinate and indeterminate are different components: if you cannot name the fraction honestly, use the spinner instead. Do not specify one and build the other.
5. content-loader — three bars of decreasing width fading in sequence, standing in for text.

Present them as a sheet: each specimen centred in its own well, with its name in monospace, its duration and size, and one line on when to reach for it. Put one specimen on a dark ground to prove that they inherit \`currentColor\`. Then show two of them in context — inside a real product panel and inside a pending button — because a loader is only correct in the layout it is covering.

\`\`\`json
{
  "animations": [
    { "name": "pulse-dots", "duration": 1200, "size": [48, 16], "dots": 3, "dotRadius": 4, "gap": 12, "scaleRange": [0.6, 1.0], "stagger": 150, "easing": "ease-in-out", "color": "currentColor" },
    { "name": "orbit-spinner", "duration": 1000, "size": [32, 32], "strokeWidth": 3, "trailLength": 0.8, "trailOpacity": [1.0, 0.0], "color": "currentColor" },
    { "name": "skeleton-shimmer", "duration": 1500, "bandWidth": "40%", "angle": -20, "easing": "linear", "note": "keep the band over the block for most of the cycle" },
    { "name": "progress-ring", "duration": 900, "size": [40, 40], "strokeWidth": 3, "lineCap": "round", "determinate": true, "label": true },
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
    text: `Design a scroll-triggered storytelling page: five sections, each revealing with a different transition as it enters the viewport.

Write the story. Invent a business, pick something it actually makes, and write the piece — a headline, a standfirst, a byline, numbered sections, real figures, real materials. Five animated empty boxes demonstrate nothing. Label each section with its transition name in a small monospace chip, so the page doubles as the documentation for the set.

The five transitions:
\`\`\`json
{
  "transitions": [
    { "name": "curtain-reveal", "trigger": "top 80%", "animation": { "clipPath": ["inset(0 50% 0 50%)", "inset(0 0% 0 0%)"], "duration": 1.2, "easing": "power3.out" } },
    { "name": "parallax-stagger", "trigger": "top 70%", "children": { "y": [60, 0], "opacity": [0, 1], "stagger": 0.1, "duration": 0.8 } },
    { "name": "scale-fade", "trigger": "top 75%", "animation": { "scale": [0.85, 1], "opacity": [0, 1], "duration": 1.0, "transformOrigin": "center bottom" } },
    { "name": "horizontal-slide", "trigger": "top 80%", "animation": { "x": [-84, 0], "opacity": [0, 1], "duration": 0.9 }, "alternateDirection": true },
    { "name": "text-split-reveal", "trigger": "top 70%", "splitBy": "chars", "animation": { "y": [40, 0], "opacity": [0, 1], "rotateX": [-40, 0], "stagger": 0.02, "duration": 0.6 } }
  ],
  "global": { "once": true, "scrub": false }
}
\`\`\`

Implementation: prefer CSS scroll-driven animations — \`animation-timeline: view()\` with an \`animation-range\`, which needs no JavaScript at all where it is supported — and fall back to an IntersectionObserver that adds a class. GSAP ScrollTrigger and Framer Motion both do this well if the project already carries them; neither is required for this.

Three rules, and the first one is not optional:

1. Author every element in its finished state. The hidden start state may only exist somewhere it is guaranteed to be undone: inside \`@supports (animation-timeline: view())\`, or behind a class that the IntersectionObserver script itself adds to \`<html>\` before it starts observing. If the script fails, the timeline is unsupported, or motion is reduced, the page renders complete. Writing \`opacity: 0\` into the base stylesheet and hoping an observer fires is how a page ships blank.

2. Nothing above the fold animates in — or if something does, every frame of it is a finished composition (a curtain that opens from a wide centre band, never from nothing). The first screen is what a screenshot catches and what a visitor judges.

3. Under \`prefers-reduced-motion: reduce\`, every section is shown complete, with no reveal and no scroll dependency. Say so on the page if it helps — a one-line note is honest and costs nothing.

Elements already in view when the page loads are revealed immediately, not on the next scroll event. Give any horizontally sliding section \`overflow: hidden\` so the slide-in never creates a horizontal scrollbar.`,
    tags: 'scroll, animation, gsap, transitions, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 174,
  },
  {
    id: 'c-20',
    free: true,
    title: 'CSS-only image hover gallery',
    text: `Create a responsive image gallery where each image has a unique hover animation — no JavaScript required. Perfect for portfolio or agency sites.

6 hover effects using only CSS:
1. Ken Burns: Slow zoom + pan on hover (transform: scale(1.1) translateX(-2%))
2. Colour reveal: Image starts desaturated, gains full colour on hover (filter transition)
3. Split reveal: Caption slides up from bottom behind a clip-path wipe
4. Tilt shine: Perspective tilt with a diagonal light sweep (pseudo-element gradient)
5. Blur focus: All images blur except the hovered one (use :has() or sibling selectors)
6. Border frame: An inner border animates inward from the edges on hover

\`\`\`css
/* Ken Burns */
.gallery-item:hover img { transform: scale(1.1) translateX(-2%); transition: transform 8s ease; }

/* Colour reveal */
.gallery-item img { filter: grayscale(1); transition: filter 0.6s; }
.gallery-item:hover img { filter: grayscale(0); }

/* Split reveal */
.gallery-item .caption { clip-path: inset(100% 0 0 0); transition: clip-path 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.gallery-item:hover .caption { clip-path: inset(0 0 0 0); }

/* Tilt shine */
.gallery-item:hover { transform: perspective(800px) rotateY(4deg); }
.gallery-item::after { background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, transparent 50%); transform: translateX(-100%); }
.gallery-item:hover::after { transform: translateX(100%); transition: transform 0.6s; }
\`\`\``,
    tags: 'css, gallery, hover, animation, no-js',
    img: '',
    author: 'UIL4B Team',
    saves: 287,
  },
]

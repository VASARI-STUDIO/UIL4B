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

Style: warm neutrals (cream, taupe) with gold accent (#B8860B) for premium feel. Generous spacing. Photography-focused layout.`,
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
    text: `Design a long-form blog article layout optimised for reading. Include: a full-width hero image with overlay title, reading time and author byline below, a sticky table of contents in the left margin on desktop, body text set at 18px with a max-width of 680px for optimal line length, pull quotes styled with a left accent border, inline code blocks, and a "Related articles" grid at the bottom. Typography-focused, minimal distractions. The reading experience should feel like a premium publication.`,
    tags: 'blog, editorial, typography, content',
    img: '',
    author: 'UIL4B Team',
    saves: 109,
  },
  {
    id: 'c-13',
    free: true,
    title: '3D hero — floating product reveal',
    text: `Design a hero section with a 3D product reveal animation for a tech product landing page. The product (a smart speaker or headphones) floats in the centre of the viewport, slowly rotating on the Y-axis. As the user scrolls, the product scales up and the camera orbits around it, revealing different angles.

Animation sequence (use with Three.js / React Three Fiber):
- Frame 0-30: Product fades in from below with a soft bounce easing
- Frame 30-120: Continuous slow Y-axis rotation (0.003 rad/frame)
- On scroll: Camera Z position interpolates from 5 to 2.5, product rotates to face the user
- Background: Soft radial gradient from #0a0a1a to #1a1a3e with floating particle field (200 particles, drift speed 0.001)
- Lighting: One key light (warm white, intensity 1.5) at top-right, one rim light (blue #4466ff, intensity 0.8) at back-left, ambient at 0.3

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
    "autoRotate": { "axis": "y", "speed": 0.003 },
    "entrance": { "from": { "y": -2, "opacity": 0 }, "to": { "y": 0, "opacity": 1 }, "duration": 1.2, "easing": "easeOutBack" },
    "scrollBound": { "cameraZ": [5, 2.5], "rotationY": [0, 1.57] }
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
    text: `Create an animated hero background with a large morphing 3D blob shape, inspired by stripe.com and linear.app hero sections. The blob should smoothly deform using simplex noise, creating an organic, living feel.

Technical approach (Three.js / GLSL):
- Start with an IcosahedronGeometry (detail: 64) for smooth surface
- In the vertex shader, displace vertices using 3D simplex noise: position += normal * noise(position * frequency + time * speed) * amplitude
- Use a gradient material that shifts between 2-3 colours based on the vertex normal direction
- Add a subtle Fresnel rim glow effect on the edges

JSON config:
\`\`\`json
{
  "geometry": { "type": "icosahedron", "radius": 2.5, "detail": 64 },
  "noise": {
    "frequency": 0.8,
    "amplitude": 0.6,
    "speed": 0.15,
    "octaves": 3
  },
  "material": {
    "type": "custom-shader",
    "colors": ["#667eea", "#764ba2", "#f093fb"],
    "colorBlend": "normal-based",
    "fresnel": { "power": 2.5, "color": "#ffffff", "opacity": 0.3 },
    "roughness": 0.2,
    "metalness": 0.1
  },
  "animation": {
    "rotation": { "y": 0.001, "x": 0.0005 },
    "breathe": { "scale": [0.98, 1.02], "duration": 4, "easing": "sine" }
  },
  "postProcessing": {
    "bloom": { "threshold": 0.6, "strength": 0.4, "radius": 0.8 }
  }
}
\`\`\`

The overall effect should feel premium and mesmerising — a living, breathing shape that draws the eye without overwhelming the page content layered on top.`,
    tags: '3d, blob, shader, glsl, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 198,
  },
  {
    id: 'c-15',
    free: true,
    title: '3D hero — scroll-driven text extrusion',
    text: `Design a scroll-driven 3D text animation where the company name extrudes from flat 2D to full 3D as the user scrolls down the hero section. Inspired by award-winning motion sites.

Animation breakdown:
- At scroll 0%: Text is flat, sitting on a surface, viewed from straight above (orthographic feel)
- At scroll 25%: Camera begins tilting to a 30° angle, text starts extruding
- At scroll 50%: Full 3D extrusion visible, camera at 45° angle, dramatic perspective
- At scroll 75%: Text begins to break apart into individual letter blocks that float away
- At scroll 100%: Letters have scattered into a particle cloud, transitioning to the next section

JSON config:
\`\`\`json
{
  "text": {
    "content": "YOUR BRAND",
    "font": "Inter Bold",
    "size": 1.5,
    "extrudeDepth": { "start": 0.01, "end": 0.8 },
    "bevelEnabled": true,
    "bevelSize": 0.02
  },
  "camera": {
    "scrollKeyframes": [
      { "at": 0, "position": [0, 8, 0.1], "rotation": [-1.5, 0, 0] },
      { "at": 0.25, "position": [0, 5, 3], "rotation": [-0.8, 0, 0] },
      { "at": 0.5, "position": [0, 3, 5], "rotation": [-0.5, 0, 0] },
      { "at": 0.75, "position": [0, 2, 6], "rotation": [-0.3, 0.1, 0] }
    ]
  },
  "scatter": {
    "startAt": 0.6,
    "endAt": 1.0,
    "force": 3,
    "rotationRandom": 2,
    "gravity": -0.5
  },
  "material": {
    "color": "#ffffff",
    "roughness": 0.15,
    "metalness": 0.9,
    "envMapIntensity": 1.5
  },
  "environment": {
    "background": "#0a0a0a",
    "hdri": "studio-small",
    "fog": { "color": "#0a0a0a", "near": 10, "far": 25 }
  }
}
\`\`\``,
    tags: '3d, text, scroll, animation, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 167,
  },
  {
    id: 'c-16',
    free: true,
    title: '3D hero — interactive particle wave',
    text: `Create an interactive particle wave field for a website hero section. A grid of thousands of particles forms a wave surface that reacts to mouse movement and animates continuously.

Technical setup:
- Create a PlaneGeometry grid (128x128 points = 16,384 particles)
- Use BufferGeometry with custom position attribute
- Animate Y position using: sin(x * freq + time) * cos(z * freq + time) * amplitude
- On mouse move: create a displacement ripple radiating from the cursor position
- Particles closer to the cursor glow brighter

JSON config:
\`\`\`json
{
  "grid": { "width": 128, "height": 128, "spacing": 0.12 },
  "wave": {
    "frequency": 0.3,
    "amplitude": 0.8,
    "speed": 0.5,
    "layers": [
      { "freq": 0.3, "amp": 0.8, "speed": 0.5 },
      { "freq": 0.7, "amp": 0.3, "speed": 0.8 },
      { "freq": 1.2, "amp": 0.1, "speed": 1.2 }
    ]
  },
  "mouse": {
    "radius": 3,
    "strength": 1.5,
    "decay": 0.95,
    "rippleSpeed": 2
  },
  "particle": {
    "size": 2,
    "color": "#8B9CFF",
    "glowColor": "#ffffff",
    "sizeAttenuation": true,
    "opacity": 0.7
  },
  "camera": { "position": [0, 6, 10], "lookAt": [0, 0, 0], "fov": 55 },
  "background": "transparent"
}
\`\`\`

The effect should feel like a digital ocean — calming but dynamic, reactive but not chaotic.`,
    tags: '3d, particles, interactive, wave, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 312,
  },
  {
    id: 'c-17',
    free: true,
    title: '3D hero — glass card carousel',
    text: `Design a hero section featuring a 3D carousel of glassmorphic cards that orbit around a central point. Each card showcases a feature or product, and the user can click/drag to rotate the carousel.

Setup:
- 6 cards arranged in a circle (radius 4), each angled to face outward
- Cards use a glass material: transparent with blur backdrop, subtle border, and refraction
- The front-most card is larger and fully opaque; cards further away fade and scale down
- Auto-rotates slowly; user drag overrides and snaps to nearest card on release
- Each card contains: icon, title, short description, and a subtle inner glow

JSON config:
\`\`\`json
{
  "carousel": {
    "radius": 4,
    "cardCount": 6,
    "autoRotateSpeed": 0.005,
    "snapOnRelease": true,
    "dragSensitivity": 0.003
  },
  "card": {
    "width": 2.4,
    "height": 3.2,
    "cornerRadius": 0.2,
    "glass": {
      "opacity": 0.15,
      "blur": 12,
      "borderOpacity": 0.2,
      "borderColor": "#ffffff",
      "refraction": 0.02
    },
    "focusScale": 1.2,
    "fadeRange": [0.4, 1.0]
  },
  "environment": {
    "background": "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    "ambientLight": 0.4,
    "spotLight": { "position": [0, 5, 5], "intensity": 1.2, "color": "#e0e0ff" }
  },
  "content": [
    { "icon": "rocket", "title": "Fast Setup", "desc": "Get started in under 5 minutes" },
    { "icon": "shield", "title": "Secure", "desc": "Enterprise-grade security built in" },
    { "icon": "zap", "title": "Real-time", "desc": "Live updates across all devices" },
    { "icon": "globe", "title": "Global CDN", "desc": "Content delivered from 200+ edges" },
    { "icon": "code", "title": "API First", "desc": "Full REST and GraphQL support" },
    { "icon": "heart", "title": "Open Source", "desc": "Community-driven development" }
  ]
}
\`\`\``,
    tags: '3d, carousel, glass, interactive, motion, hero',
    img: '',
    author: 'UIL4B Team',
    saves: 189,
  },
  {
    id: 'c-18',
    free: true,
    title: 'Lottie animation — loading states',
    text: `Design a set of 5 micro-animation loading states for a web application. Each should be a short looping animation suitable for Lottie/After Effects export.

1. Pulse dots: Three dots that scale up/down in sequence (like a typing indicator)
2. Orbit spinner: A small circle orbiting a larger circle with a motion trail
3. Skeleton shimmer: A gradient sweep animation across a placeholder rectangle
4. Progress ring: A circular progress indicator that fills clockwise with a rounded cap
5. Content loader: Three horizontal bars that fade in sequentially, simulating text loading

Design specs for each:
\`\`\`json
{
  "animations": [
    {
      "name": "pulse-dots",
      "duration": 1200,
      "size": [48, 16],
      "dots": 3,
      "dotRadius": 4,
      "gap": 12,
      "scaleRange": [0.6, 1.0],
      "stagger": 150,
      "easing": "ease-in-out",
      "color": "currentColor"
    },
    {
      "name": "orbit-spinner",
      "duration": 1000,
      "size": [32, 32],
      "orbitRadius": 10,
      "dotRadius": 3,
      "trailLength": 0.6,
      "trailOpacity": [1.0, 0.1],
      "color": "currentColor"
    },
    {
      "name": "skeleton-shimmer",
      "duration": 1500,
      "gradientWidth": "40%",
      "angle": -20,
      "colors": ["transparent", "rgba(255,255,255,0.08)", "transparent"],
      "easing": "linear"
    },
    {
      "name": "progress-ring",
      "duration": 2000,
      "size": [40, 40],
      "strokeWidth": 3,
      "lineCap": "round",
      "dashArray": [0.75, 0.25],
      "rotation": 360,
      "color": "currentColor"
    },
    {
      "name": "content-loader",
      "duration": 800,
      "bars": [
        { "width": "100%", "height": 12, "radius": 6 },
        { "width": "80%", "height": 12, "radius": 6 },
        { "width": "60%", "height": 12, "radius": 6 }
      ],
      "stagger": 100,
      "fadeRange": [0.3, 1.0]
    }
  ],
  "exportFormat": "lottie-json",
  "frameRate": 60
}
\`\`\``,
    tags: 'animation, lottie, loading, micro, motion',
    img: '',
    author: 'UIL4B Team',
    saves: 256,
  },
  {
    id: 'c-19',
    free: true,
    title: 'Scroll-triggered section transitions',
    text: `Design a series of scroll-triggered section transitions for a storytelling website. Each section uses a different reveal animation as it enters the viewport.

Section transition configs (use with GSAP ScrollTrigger or Framer Motion):
\`\`\`json
{
  "transitions": [
    {
      "name": "curtain-reveal",
      "trigger": "top 80%",
      "animation": {
        "clipPath": ["inset(0 50% 0 50%)", "inset(0 0% 0 0%)"],
        "duration": 1.2,
        "easing": "power3.out"
      }
    },
    {
      "name": "parallax-stagger",
      "trigger": "top 70%",
      "children": {
        "y": [60, 0],
        "opacity": [0, 1],
        "stagger": 0.1,
        "duration": 0.8,
        "easing": "power2.out"
      }
    },
    {
      "name": "scale-fade",
      "trigger": "top 75%",
      "animation": {
        "scale": [0.85, 1],
        "opacity": [0, 1],
        "duration": 1.0,
        "easing": "power2.out",
        "transformOrigin": "center bottom"
      }
    },
    {
      "name": "horizontal-slide",
      "trigger": "top 80%",
      "animation": {
        "x": [-100, 0],
        "opacity": [0, 1],
        "duration": 0.9,
        "easing": "power3.out"
      },
      "alternateDirection": true
    },
    {
      "name": "text-split-reveal",
      "trigger": "top 70%",
      "splitBy": "chars",
      "animation": {
        "y": [40, 0],
        "opacity": [0, 1],
        "rotateX": [-40, 0],
        "stagger": 0.02,
        "duration": 0.6,
        "easing": "power2.out"
      }
    }
  ],
  "global": {
    "once": true,
    "markers": false,
    "scrub": false
  }
}
\`\`\`

These can be mixed and matched. Use curtain-reveal for hero images, parallax-stagger for feature grids, and text-split-reveal for headlines.`,
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

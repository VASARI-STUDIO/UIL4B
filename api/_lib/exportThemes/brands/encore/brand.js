// Sample brand data for the export themes.
export default {
 "name": "Encore",
 "slug": "encore",
 "theme": "02-poster",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Encore is a gig ticketing app in Melbourne. You get tickets to a show, keep them on your phone, and walk in at the door.",
 "product": "Get tickets, show them at the door, and see the night's set times.",
 "audience": "Melbourne gig-goers, and the pubs, halls and club rooms that sell their shows through the app.",
 "city": "Melbourne",
 "lines": {
  "primary": "Doors at 8. You're on the list.",
  "others": [
   "Every gig, one queue.",
   "2 tickets sent to your phone."
  ]
 },
 "personality": [
  {
   "trait": "Exact",
   "means": "We print the time, not 'tonight'. Doors 8:00, Lowtide 8:45, Ruby Fields 9:15."
  },
  {
   "trait": "Level",
   "means": "No hype and no exclamation marks. A show is described by who, where and when, and the act does the selling."
  },
  {
   "trait": "Door-minded",
   "means": "We write for the person in the queue with a phone in one hand: short lines, big times, nothing to hunt for."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Lead with the time",
    "example": "Doors at 8."
   },
   {
    "title": "Name the act and the room",
    "example": "Ruby Fields, The Corner Hotel."
   },
   {
    "title": "Keep the hype out",
    "example": "Ruby Fields go on at 9:15."
   },
   {
    "title": "Say what happens at the door",
    "example": "Show this at the door, brightness up."
   }
  ],
  "writeThis": [
   {
    "write": "Doors at 8. You're on the list.",
    "not": "Get ready for an unforgettable night!",
    "because": "A time and a promise beat hype."
   },
   {
    "write": "Ruby Fields go on at 9:15.",
    "not": "Don't miss the amazing Ruby Fields live!",
    "because": "Say who and when. The act does the selling."
   },
   {
    "write": "Get tickets",
    "not": "Submit",
    "because": "A button names what happens next."
   },
   {
    "write": "That code ended on 1 December.",
    "not": "Invalid promo code.",
    "because": "Say what happened and when, not just that it failed."
   },
   {
    "write": "2 tickets sent to your phone.",
    "not": "Your order has been successfully processed.",
    "because": "Say what the person now has."
   }
  ],
  "boilerplate25": "Encore is a gig ticketing app in Melbourne. Get your tickets, keep them on your phone and walk in at the door. Doors at 8.",
  "boilerplate50": "Encore is a gig ticketing app in Melbourne. You get tickets to a show, keep them on your phone, and walk in at the door. We print the times that matter: doors, support, main set and curfew. No hunting for the ticket. Doors at 8, you are on the list.",
  "nameRules": "Write Encore with a capital E and no article. It is Encore, never The Encore, Encore Tickets or ENC. In the logo the name is set in Anybody, expanded and heavy; in running text it is plain."
 },
 "colours": [
  {
   "id": "door-red",
   "name": "Door red",
   "hex": "#E14C2F",
   "role": "action",
   "lands": "One action per screen, the cover of a printed piece, and the single phrase a poster lights.",
   "share": 0.1
  },
  {
   "id": "night",
   "name": "Night",
   "hex": "#111214",
   "role": "ink",
   "lands": "The ink on Stock and Door red, and the ground for every screen after dark.",
   "share": 0.35
  },
  {
   "id": "stage",
   "name": "Stage",
   "hex": "#1E1F24",
   "role": "panel",
   "lands": "Tickets and sheets that sit on Night.",
   "share": 0.15
  },
  {
   "id": "stock",
   "name": "Stock",
   "hex": "#ECEAE3",
   "role": "ground",
   "lands": "Ticket paper: the ground for printed pieces and daylight screens, and the type on Night and Stage.",
   "share": 0.4
  }
 ],
 "tones": [
  {
   "id": "quiet",
   "name": "Muted",
   "hex": "#A3A29C",
   "role": "quiet text",
   "lands": "Venues, times and captions on Night and Stage."
  },
  {
   "id": "quiet-stock",
   "name": "Muted on Stock",
   "hex": "#5F5E59",
   "role": "quiet text",
   "lands": "Captions on Stock and on printed pages."
  },
  {
   "id": "hover",
   "name": "Door red hover",
   "hex": "#EA5F42",
   "role": "hover",
   "lands": "A Door red control under the pointer."
  }
 ],
 "pairs": [
  {
   "fg": "night",
   "bg": "stock",
   "use": "Body text, headlines"
  },
  {
   "fg": "quiet-stock",
   "bg": "stock",
   "use": "Captions on printed pages"
  },
  {
   "fg": "stock",
   "bg": "night",
   "use": "Type on screens after dark"
  },
  {
   "fg": "quiet",
   "bg": "night",
   "use": "Venues, times, captions"
  },
  {
   "fg": "stock",
   "bg": "stage",
   "use": "Text on tickets and sheets"
  },
  {
   "fg": "quiet",
   "bg": "stage",
   "use": "Captions on sheets"
  },
  {
   "fg": "night",
   "bg": "door-red",
   "use": "Button labels, the cover roll"
  },
  {
   "fg": "night",
   "bg": "hover",
   "use": "Button label on hover"
  },
  {
   "fg": "door-red",
   "bg": "night",
   "use": "The lit phrase on Night"
  },
  {
   "fg": "door-red",
   "bg": "stage",
   "use": "The lit phrase on Stage, 24 px and over",
   "minSize": 24
  }
 ],
 "fonts": {
  "display": {
   "family": "Anybody",
   "weights": [
    800
   ],
   "axes": "wdth 150",
   "file": "Anybody-150-800",
   "css": "Anybody:wdth,wght@150,800",
   "stretch": 150
  },
  "body": {
   "family": "Work Sans",
   "weights": [
    400,
    500,
    600
   ],
   "file": "WorkSans",
   "css": "Work+Sans:wght@400;500;600"
  },
  "mono": {
   "family": "Geist Mono",
   "weights": [
    400
   ],
   "file": "GeistMono",
   "css": "Geist+Mono:wght@400"
  }
 },
 "type": {
  "scale": [
   {
    "token": "display",
    "size": 144,
    "line": 0.92,
    "weight": 800,
    "face": "display",
    "use": "Covers and posters, one line"
   },
   {
    "token": "headline",
    "size": 72,
    "line": 0.95,
    "weight": 800,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 34,
    "line": 1.1,
    "weight": 800,
    "face": "display",
    "use": "Titles inside a piece"
   },
   {
    "token": "body",
    "size": 17,
    "line": 1.55,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "label",
    "size": 13,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Buttons, row titles, short labels"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.4,
    "weight": 400,
    "face": "body",
    "use": "Captions and folios"
   }
  ],
  "sample": {
   "headline": "Doors at 8. You're on the list.",
   "paragraph": "Ruby Fields play The Corner Hotel on Saturday 14 December. Doors open at 8:00, Lowtide go on at 8:45 and Ruby Fields at 9:15. Your two tickets are on your phone. Show them at the door, brightness up.",
   "caption": "Ruby Fields, The Corner Hotel. Doors 8:00."
  },
  "rules": [
   {
    "do": "Set the display face expanded and heavy, large and on one or two lines. Its condensed width is for serials and stub text.",
    "dont": "Set body copy or buttons in the display face."
   },
   {
    "do": "Keep display tracking at minus 0.015 em.",
    "dont": "Letter-space the display face."
   },
   {
    "do": "Use 17 px for reading text, 12 px for captions. Nothing smaller.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and the muted colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a ticket code or a hex only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name ends on a repeat mark: the bar and two dots a musician reads as play it again. It always follows the name, and is never drawn without it.",
  "showcase": {
   "wordmark": "Encore",
   "symbolNote": "The symbol is the expanded E and the repeat mark on a Door red tile.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#111214",
    "sign": "#E14C2F",
    "tile": "#E14C2F",
    "tileInk": "#111214",
    "ground": "#ECEAE3"
   },
   "mono-dark": {
    "name": "#111214",
    "sign": "#111214",
    "tile": "#111214",
    "tileInk": "#ECEAE3",
    "ground": "#ECEAE3"
   },
   "mono-light": {
    "name": "#ECEAE3",
    "sign": "#ECEAE3",
    "tile": "#ECEAE3",
    "tileInk": "#111214",
    "ground": "#111214"
   },
   "reversed": {
    "name": "#111214",
    "sign": "#111214",
    "tile": "#111214",
    "tileInk": "#E14C2F",
    "ground": "#E14C2F"
   },
   "on-stage": {
    "name": "#ECEAE3",
    "sign": "#E14C2F",
    "tile": "#E14C2F",
    "tileInk": "#111214",
    "ground": "#1E1F24"
   }
  },
  "when": {
   "colour": "The default. On Stock, with the repeat mark printed in Door red.",
   "mono-dark": "Print for daylight and one colour work. On Stock and other light grounds.",
   "mono-light": "On photos and dark grounds that cannot carry Door red.",
   "reversed": "On Door red. Night name, Night repeat mark.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: tickets, wristbands and sign posts.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "The night from where the audience stands: the queue outside, the lit stage, a phone held up at the door. The crowd and the act, not the venue's furniture.",
   "light": "Whatever the room gives: stage wash, a neon sign, the door light at dusk. No flash, no retouched glow.",
   "crop": "Wide enough to read the room, with a dark area left for one line of type.",
   "colour": "Natural venue colour, graded toward Night. Door red appears only when a sign or a wristband is that colour.",
   "people": "Real crowds and real acts, shot in the moment. Faces from behind or in profile unless the act has agreed otherwise."
  },
  "shots": [
   {
    "id": "queue",
    "slot": "The queue: people lined up outside a pub door at dusk, shot from across the street. Wide crop, door light spilling onto the footpath."
   },
   {
    "id": "door",
    "slot": "The door: a staff member's hand scanning a phone, shot side-on at chest height. Tight crop to the hand and the screen. Warm door light, dark behind."
   },
   {
    "id": "stage",
    "slot": "The stage: a band mid-song from the back of the room, heads in silhouette in the foreground. Wide crop, stage wash from the left."
   },
   {
    "id": "phone",
    "slot": "The ticket: a phone held up at the door showing the ticket, brightness up. Close crop, shallow focus on the screen, the queue soft behind."
   },
   {
    "id": "wristband",
    "slot": "The wristband: a Door red wristband on a wrist holding a drink. Tight crop, neon sign light from the right."
   },
   {
    "id": "after",
    "slot": "After the set: the footpath outside at eleven, small groups talking. Wide crop, street light, low and level."
   }
  ],
  "rules": [
   {
    "do": "Show the room as the audience sees it, with the act lit and the crowd dark.",
    "dont": "Shoot the act from the stage as if the crowd were absent."
   },
   {
    "do": "Let Door red come from a sign or a wristband.",
    "dont": "Tint the photo red or add a colour wash."
   },
   {
    "do": "Crop wide and leave a dark area for one line of type.",
    "dont": "Crop to a face with a headline across it."
   },
   {
    "do": "Use a photo or a flat Night behind the logo.",
    "dont": "Set the logo on a bright part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 1280,
   "h": 720
  },
  "margin": 56,
  "columns": 12,
  "gutter": 16,
  "base": 4
 },
 "ui": {
  "radius": {
   "control": 2,
   "card": 4
  },
  "border": 1.5,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "ticket",
   "map-pin",
   "clock",
   "calendar",
   "music",
   "user",
   "search",
   "check",
   "x",
   "plus",
   "menu",
   "chevron-right",
   "arrow-right",
   "triangle-alert",
   "info",
   "phone"
  ],
  "type": [
   {
    "token": "caption",
    "size": 12,
    "line": 16,
    "weight": 400,
    "face": "body",
    "use": "Captions, help text, folios"
   },
   {
    "token": "label",
    "size": 13,
    "line": 18,
    "weight": 500,
    "face": "body",
    "use": "Field labels, status words, table headers"
   },
   {
    "token": "body",
    "size": 15,
    "line": 24,
    "weight": 400,
    "face": "body",
    "use": "Reading text and row detail"
   },
   {
    "token": "control",
    "size": 16,
    "line": 24,
    "weight": 600,
    "face": "body",
    "use": "Button labels and input text"
   },
   {
    "token": "title-s",
    "size": 26,
    "line": 30,
    "weight": 800,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 38,
    "line": 40,
    "weight": 800,
    "face": "display",
    "use": "Screen titles, the show name"
   },
   {
    "token": "headline",
    "size": 56,
    "line": 56,
    "weight": 800,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "light": {
   "surface": "#ECEAE3",
   "raised": "#F6F5F0",
   "sunken": "#DFDDD5",
   "text": "#111214",
   "textSoft": "#2E2F34",
   "quiet": "#5F5E59",
   "quietOnSunken": "#55544F",
   "border": "#6E6F76",
   "divider": "#CECBC2",
   "action": "#E14C2F",
   "actionHover": "#EA5F42",
   "actionPressed": "#E4553A",
   "actionLabel": "#111214",
   "focus": "#111214",
   "disabledBg": "#D4D2CA",
   "disabledText": "#55544F",
   "scrim": "#111214",
   "success": {
    "fg": "#1E6B45",
    "bg": "#DCEBE1"
   },
   "warning": {
    "fg": "#7A5200",
    "bg": "#F5E4BF"
   },
   "danger": {
    "fg": "#B42318",
    "bg": "#F6D9D5"
   },
   "info": {
    "fg": "#4A4B52",
    "bg": "#D8D6CF"
   }
  },
  "dark": {
   "surface": "#111214",
   "raised": "#1E1F24",
   "sunken": "#0B0C0E",
   "text": "#ECEAE3",
   "textSoft": "#D2D0CA",
   "quiet": "#A3A29C",
   "quietOnSunken": "#A3A29C",
   "border": "#6E6F76",
   "divider": "#34353B",
   "action": "#E14C2F",
   "actionHover": "#EA5F42",
   "actionPressed": "#E4553A",
   "actionLabel": "#111214",
   "focus": "#ECEAE3",
   "disabledBg": "#2A2B30",
   "disabledText": "#A3A29C",
   "scrim": "#08090A",
   "success": {
    "fg": "#5FD394",
    "bg": "#12301F"
   },
   "warning": {
    "fg": "#F5C451",
    "bg": "#3A2E10"
   },
   "danger": {
    "fg": "#FF8A80",
    "bg": "#3A1517"
   },
   "info": {
    "fg": "#A3A29C",
    "bg": "#2A2B30"
   }
  },
  "status": [
   {
    "id": "on-sale",
    "label": "On sale",
    "tone": "action"
   },
   {
    "id": "few-left",
    "label": "Few left",
    "tone": "warning"
   },
   {
    "id": "doors-open",
    "label": "Doors open",
    "tone": "success"
   },
   {
    "id": "sold-out",
    "label": "Sold out",
    "tone": "info"
   },
   {
    "id": "cancelled",
    "label": "Cancelled",
    "tone": "danger"
   }
  ],
  "elevationNote": "Encore draws edges and steps, not shadows. Grounds step from Night to Stage, and anything that floats gets a 1.5 px Stock edge.",
  "screen": {
   "title": "Your tickets",
   "content": {
    "time": "8:13",
    "status": "Doors open",
    "eta": "Doors at 8:00",
    "pickup": "2 tickets, general admission. Show this at the door, brightness up.",
    "from": "Doors 8:00",
    "to": "Ruby Fields 9:15",
    "progress": 0.17,
    "rider": "Ruby Fields",
    "initials": "RF",
    "riderNote": "On stage at 9:15",
    "call": "Set times",
    "deliverToLabel": "Venue",
    "deliverTo": "The Corner Hotel, Richmond",
    "paidLabel": "Paid",
    "paid": "$78.00",
    "share": "Transfer a ticket",
    "deliveries": [
     {
      "to": "Ruby Fields",
      "when": "Corner Hotel, Sat 14 Dec",
      "price": "$39.00",
      "status": "doors-open"
     },
     {
      "to": "Lowtide",
      "when": "Northcote Social, Fri 20 Dec",
      "price": "$32.00",
      "status": "on-sale"
     },
     {
      "to": "The Wren Sisters",
      "when": "Memo Music Hall, Sat 21 Dec",
      "price": "$45.00",
      "status": "few-left"
     },
     {
      "to": "Salt Lane",
      "when": "The Tote, Thu 12 Dec",
      "price": "$28.00",
      "status": "sold-out"
     },
     {
      "to": "Harbour Static",
      "when": "The Forum, Sun 15 Dec",
      "price": "$52.00",
      "status": "cancelled"
     }
    ],
    "form": {
     "title": "Get tickets",
     "pickup": "Show",
     "pickupValue": "Ruby Fields, The Corner Hotel",
     "dropoff": "Name on tickets",
     "dropoffValue": "Sam Rivera",
     "ready": "Promo code",
     "readyValue": "EARLY10",
     "readyError": "That code ended on 1 December.",
     "size": "Tickets",
     "sizes": [
      "1 ticket",
      "2 tickets",
      "4 tickets"
     ],
     "notes": "Note for the venue",
     "notesHelp": "Access needs, or who is collecting.",
     "book": "Get tickets",
     "bookWhy": "Choose a show to get tickets."
    },
    "empty": {
     "title": "No tickets yet",
     "body": "Doors at 8. Find a gig and your tickets will wait here.",
     "cta": "Find a gig"
    },
    "dialog": {
     "title": "Transfer 2 tickets?",
     "body": "The tickets leave your phone when your friend accepts. Until then they are still yours.",
     "confirm": "Transfer tickets",
     "keep": "Keep tickets"
    },
    "toast": "2 tickets sent to your phone.",
    "alert": "Doors are running 15 minutes late. Ruby Fields still go on at 9:15.",
    "inline": "Add a name so the door can find your tickets.",
    "example": {
     "secondary": "See set times",
     "quiet": "Skip",
     "danger": "Cancel tickets",
     "small": "Share",
     "account": "Account",
     "checks": [
      "Text me when doors open",
      "Email me the set times",
      "Early entry (sold out)"
     ],
     "switches": [
      "Text me at doors",
      "Email receipts"
     ],
     "radios": [
      "General admission",
      "Seated"
     ],
     "statLabel": "Paid",
     "crumbs": [
      "Gigs",
      "This week"
     ],
     "tabs": [
      "Tonight",
      "On sale",
      "Past"
     ],
     "links": [
      [
       "Tickets",
       "ticket"
      ],
      [
       "Gigs",
       "calendar"
      ],
      [
       "Set times",
       "clock"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Nina Castellano",
   "role": "Box office lead",
   "contact": "nina@encore.example"
  },
  "social": [
   "Doors at 8. You're on the list.",
   "Every gig, one queue.",
   "2 tickets sent to your phone."
  ],
  "signage": "Street poster, A1 (594 x 841 mm): Doors at 8. You're on the list.",
  "email": {
   "person": "Nina Castellano",
   "role": "Box office lead"
  },
  "site": {
   "url": "encore.example"
  }
 },
 "guideB": {
  "studioSlot": "An act posed against a plain studio wall under flat light. No room, no crowd, faces to camera.",
  "rules": [
   {
    "title": "Print the time",
    "text": "Every line says when, in clock times. Doors at 8."
   },
   {
    "title": "Light one thing",
    "text": "Most of a page is Stock or Night. Door red lights one action or one phrase."
   },
   {
    "title": "Show the night as the audience sees it",
    "text": "Wide and real, with the act lit and the crowd dark."
   }
  ],
  "email": {
   "to": "Sam Rivera",
   "subject": "2 tickets for Ruby Fields, Saturday 14 December",
   "time": "4:12",
   "body": [
    "Hi Sam,",
    "Your two tickets for Ruby Fields at The Corner Hotel are on your phone. Doors are at 8:00. Show them at the door, brightness up."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@encore.example"
 }
};

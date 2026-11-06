// Sample brand data for the export themes.
export default {
 "name": "Plumbline",
 "slug": "plumbline",
 "theme": "09-blueprint",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Plumbline is a renovation builder in Ballarat. We measure the room, give one fixed price in writing, and build to a schedule with the dates on it.",
 "product": "Book a measure-up, read the quote, and follow the build schedule.",
 "audience": "Ballarat households renovating a kitchen, bathroom or laundry who want a price and a date before any work starts.",
 "city": "Ballarat",
 "lines": {
  "primary": "Measured twice. Quoted once.",
  "others": [
   "Your kitchen, on the date we said."
  ]
 },
 "personality": [
  {
   "trait": "Exact",
   "means": "We measure twice and write the number down. Every quote names a date, a price and a material."
  },
  {
   "trait": "Plain",
   "means": "No jargon. We say 20 mm engineered stone, not a premium surface, and nine days of labour, not a tailored timeline."
  },
  {
   "trait": "Square",
   "means": "A fixed price stays fixed. A date that has to move gets a phone call first, with the new date in it."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Put a date on it",
    "example": "Measure-up: Tuesday 10 November, 8 am."
   },
   {
    "title": "Say the price once",
    "example": "Fixed price: $38,460, held until 1 December."
   },
   {
    "title": "Name the material",
    "example": "Benchtop: 20 mm engineered stone, honed."
   },
   {
    "title": "Ask for what we need",
    "example": "We'll measure the kitchen on Tuesday at 8 am. Allow an hour, and clear the benchtops if you can."
   }
  ],
  "writeThis": [
   {
    "write": "Measure-up: Tuesday 10 November, 8 am.",
    "not": "We'll be in touch to arrange a time that suits.",
    "because": "A date is a promise. A time to be arranged is not."
   },
   {
    "write": "Fixed price: $38,460, held until 1 December.",
    "not": "Competitive pricing, tailored to you.",
    "because": "Give the number, then say how long it holds."
   },
   {
    "write": "Benchtop: 20 mm engineered stone, honed.",
    "not": "A premium stone surface.",
    "because": "Name the material and its thickness."
   },
   {
    "write": "Book a measure-up",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "The tiler is a day late. Splashback now goes in Friday 20 November.",
    "not": "Unforeseen delays may affect your timeline.",
    "because": "Say what moved, and to when."
   }
  ],
  "boilerplate25": "Plumbline is a renovation builder in Ballarat. We measure your room, give you one fixed price and build to the date we said. Quoted once.",
  "boilerplate50": "Plumbline is a renovation builder in Ballarat, working on kitchens, bathrooms and laundries. We measure the room twice, give you one fixed price in writing, and set a build schedule with a start date and a finish date. If a date has to move, we call you before it does.",
  "nameRules": "Write Plumbline as one word with a capital P in running text. Set the wordmark only as the logo, never as a typed word. Never Plumb Line, Plumbline Builders or PL."
 },
 "colours": [
  {
   "id": "plaster",
   "name": "Plaster",
   "hex": "#EDE9E2",
   "role": "ground",
   "lands": "The ground under everything: every page, every screen behind the cards.",
   "share": 0.5
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "panel",
   "lands": "The quote, every card and every field.",
   "share": 0.2
  },
  {
   "id": "bluestone",
   "name": "Bluestone",
   "hex": "#2A2D2E",
   "role": "text",
   "lands": "All text, headings and prices. The focus ring, the hover on a button and the On site status.",
   "share": 0.2
  },
  {
   "id": "brick",
   "name": "Brick",
   "hex": "#A4432C",
   "role": "action",
   "lands": "The one action on a screen, every redline, and the Needs your OK status.",
   "share": 0.07
  },
  {
   "id": "timber",
   "name": "Timber",
   "hex": "#C9A27E",
   "role": "accent fill",
   "lands": "The Booked fill and the plumb bob on a dark ground. Fill only, never text.",
   "share": 0.03
  }
 ],
 "tones": [
  {
   "id": "quiet",
   "name": "Quiet",
   "hex": "#5A5853",
   "role": "quiet text",
   "lands": "Second lines, captions and folios on Plaster and White."
  },
  {
   "id": "hairline",
   "name": "Hairline",
   "hex": "#D0CCC5",
   "role": "divider",
   "lands": "Rules between rows and the edge of a card. Never text."
  }
 ],
 "pairs": [
  {
   "fg": "bluestone",
   "bg": "plaster",
   "use": "Body text, headlines"
  },
  {
   "fg": "bluestone",
   "bg": "white",
   "use": "Prices and text on the quote"
  },
  {
   "fg": "quiet",
   "bg": "plaster",
   "use": "Captions, folios, second lines"
  },
  {
   "fg": "quiet",
   "bg": "white",
   "use": "Second lines on a card"
  },
  {
   "fg": "white",
   "bg": "brick",
   "use": "Button labels, Needs your OK"
  },
  {
   "fg": "brick",
   "bg": "plaster",
   "use": "Redlines and links on Plaster"
  },
  {
   "fg": "brick",
   "bg": "white",
   "use": "Error text on a card"
  },
  {
   "fg": "bluestone",
   "bg": "timber",
   "use": "Words on a Timber highlight"
  },
  {
   "fg": "white",
   "bg": "bluestone",
   "use": "Reversed text, button hover"
  },
  {
   "fg": "plaster",
   "bg": "bluestone",
   "use": "Reversed text, quieter"
  },
  {
   "fg": "timber",
   "bg": "bluestone",
   "use": "Plumb bob on Bluestone"
  }
 ],
 "fonts": {
  "display": {
   "family": "Commissioner",
   "weights": [
    800
   ],
   "file": "Commissioner",
   "css": "Commissioner:wght@800"
  },
  "body": {
   "family": "Commissioner",
   "weights": [
    400,
    500,
    600
   ],
   "file": "Commissioner",
   "css": "Commissioner:wght@400;500;600"
  },
  "mono": {
   "family": "IBM Plex Mono",
   "weights": [
    400
   ],
   "file": "IBMPlexMono",
   "css": "IBM+Plex+Mono:wght@400"
  }
 },
 "type": {
  "scale": [
   {
    "token": "display",
    "size": 100,
    "line": 1,
    "weight": 800,
    "face": "display",
    "use": "The cover wordmark, one line"
   },
   {
    "token": "headline",
    "size": 56,
    "line": 1,
    "weight": 800,
    "face": "display",
    "use": "A page's one big line, set on the baseline grid"
   },
   {
    "token": "title",
    "size": 32,
    "line": 1,
    "weight": 800,
    "face": "display",
    "use": "Headlines, prices and the wordmark"
   },
   {
    "token": "lead",
    "size": 24,
    "line": 1.33,
    "weight": 500,
    "face": "body",
    "use": "Lead lines under a headline"
   },
   {
    "token": "label",
    "size": 20,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Labels, buttons and lead lines on a card"
   },
   {
    "token": "body",
    "size": 16,
    "line": 1.5,
    "weight": 400,
    "face": "body",
    "use": "Everything you read"
   },
   {
    "token": "caption",
    "size": 13,
    "line": 1.4,
    "weight": 400,
    "face": "body",
    "use": "Captions and second lines"
   }
  ],
  "sample": {
   "headline": "Your kitchen, on the date we said.",
   "paragraph": "We'll measure the kitchen on Tuesday at 8 am. Allow an hour, and clear the benchtops if you can. The fixed price is $38,460, held until 1 December.",
   "caption": "Cabinets, 3.2 m run. Benchtop, 20 mm engineered stone."
  },
  "rules": [
   {
    "do": "Set headlines in sentence case, tracking minus 0.01 em, one or two lines.",
    "dont": "Set headlines in capitals or letter-space them."
   },
   {
    "do": "Use Commissioner 400 at 16 px for reading text. Nothing under 13 px.",
    "dont": "Set body copy under 13 px."
   },
   {
    "do": "Use weight and the Quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Set prices and dates with tabular numbers so columns line up.",
    "dont": "Mix proportional and tabular figures in one column."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The wordmark hangs a plumb line from its first l: a fine line drops below the baseline and ends in a plumb bob, so the name is always standing true. The line is never drawn without the name, and it is never tilted.",
  "showcase": {
   "wordmark": "Plumbline",
   "symbolNote": "The symbol is the plumb line on its own: a short tick at the top, the line, and the bob at the bottom, the way a redline is drawn.",
   "minScreenPx": 120,
   "minPrintMm": 30
  },
  "colourways": {
   "colour": {
    "name": "#2A2D2E",
    "plumb": "#A4432C",
    "ground": "#EDE9E2"
   },
   "mono-dark": {
    "name": "#2A2D2E",
    "plumb": "#2A2D2E",
    "ground": "#EDE9E2"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "plumb": "#FFFFFF",
    "ground": "#2A2D2E"
   },
   "reversed": {
    "name": "#EDE9E2",
    "plumb": "#C9A27E",
    "ground": "#2A2D2E"
   },
   "on-brick": {
    "name": "#FFFFFF",
    "plumb": "#FFFFFF",
    "ground": "#A4432C"
   },
   "on-timber": {
    "name": "#2A2D2E",
    "plumb": "#2A2D2E",
    "ground": "#C9A27E"
   }
  },
  "when": {
   "colour": "The default. On Plaster and White, and on light photos.",
   "mono-dark": "One colour printing and stamps. On light grounds that cannot carry Brick.",
   "mono-light": "On photos and dark grounds that cannot carry Timber.",
   "reversed": "On Bluestone. Plaster name, Timber plumb line.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, site signs, vehicle doors.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp, the end of a drawing."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Rooms being measured, built and finished: a tape held to a wall, a benchtop with a pencil mark on it, a crew lifting a cabinet. The work is the subject, not the people posing beside it.",
   "light": "Daylight from a window. No flash, no work lights switched on, no studio.",
   "crop": "Square to the room, with the camera held level so the walls stand true. Leave space on one side for a line of type.",
   "colour": "Natural colour. Timber and Brick appear because the room has them, never added in editing.",
   "people": "Our crew and our customers, shot as they work or look at the room. No stock smiles, no handshakes at the front door."
  },
  "shots": [
   {
    "id": "measure-up",
    "slot": "The measure-up: a tape measure held against a kitchen wall, shot side-on at waist height. Crop tight to the tape and the hand. Daylight from the window on the left."
   },
   {
    "id": "benchtop",
    "slot": "The benchtop: 20 mm engineered stone, honed, with a pencil mark and a steel square on it. Close crop, flat overcast daylight, the room soft behind."
   },
   {
    "id": "site",
    "slot": "The site: a kitchen with the cabinets in and the benchtop not yet down, seen from the doorway. Wide crop, camera level, daylight only."
   },
   {
    "id": "crew",
    "slot": "The crew: two carpenters lifting a cabinet into place, shot from behind at eye level. Wide crop with the room around them. Morning light."
   },
   {
    "id": "finished",
    "slot": "The finished room: the same kitchen from the same doorway as the site shot, cleared and lit. Same framing. Late afternoon light."
   },
   {
    "id": "tools",
    "slot": "The tools: a spirit level and a plumb bob on a bare bench. Tight crop, flat overcast light, nothing else on the bench."
   }
  ],
  "rules": [
   {
    "do": "Hold the camera level so the walls and the benchtop stand true.",
    "dont": "Tilt the camera for effect."
   },
   {
    "do": "Let Timber and Brick come from the room itself.",
    "dont": "Tint the photo or add a colour wash."
   },
   {
    "do": "Crop wide enough to show the room, and leave space for one line of type.",
    "dont": "Crop to a detail with a headline across it."
   },
   {
    "do": "Use a photo or a flat colour behind the logo.",
    "dont": "Set the logo on a busy part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 794,
   "h": 1123
  },
  "margin": 56,
  "columns": 12,
  "gutter": 16,
  "base": 4
 },
 "ui": {
  "radius": {
   "control": 4,
   "card": 8
  },
  "border": 1,
  "spacingBase": 4,
  "spacing": [
   4,
   8,
   12,
   16,
   24,
   32,
   48,
   64,
   96
  ],
  "shadows": "none",
  "icons": [
   "ruler",
   "hammer",
   "house",
   "calendar",
   "file-text",
   "receipt",
   "map-pin",
   "clock",
   "phone",
   "user",
   "search",
   "check",
   "x",
   "plus",
   "menu",
   "chevron-right",
   "arrow-right",
   "triangle-alert",
   "info"
  ],
  "rowIcon": "ruler",
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
    "size": 16,
    "line": 24,
    "weight": 400,
    "face": "body",
    "use": "Reading text and row detail"
   },
   {
    "token": "control",
    "size": 16,
    "line": 24,
    "weight": 500,
    "face": "body",
    "use": "Button labels and input text"
   },
   {
    "token": "title-s",
    "size": 20,
    "line": 26,
    "weight": 800,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 30,
    "line": 30,
    "weight": 800,
    "face": "display",
    "use": "Card titles and the quote total"
   },
   {
    "token": "headline",
    "size": 40,
    "line": 44,
    "weight": 800,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "light": {
   "surface": "#FFFFFF",
   "raised": "#EDE9E2",
   "sunken": "#E2DDD3",
   "text": "#2A2D2E",
   "textSoft": "#5A5853",
   "quiet": "#5A5853",
   "quietOnSunken": "#5A5853",
   "border": "#5A5853",
   "divider": "#D0CCC5",
   "action": "#A4432C",
   "actionHover": "#2A2D2E",
   "actionPressed": "#8E3A26",
   "actionLabel": "#FFFFFF",
   "focus": "#2A2D2E",
   "disabledBg": "#E2DDD3",
   "disabledText": "#5A5853",
   "scrim": "#2A2D2E",
   "success": {
    "fg": "#1E6B45",
    "bg": "#E7F2EC"
   },
   "warning": {
    "fg": "#6B4423",
    "bg": "#F4EADD"
   },
   "danger": {
    "fg": "#A4432C",
    "bg": "#F5E3DD"
   },
   "info": {
    "fg": "#2A2D2E",
    "bg": "#C9A27E"
   },
   "neutral": {
    "fg": "#2A2D2E",
    "bg": "#E2DDD3"
   }
  },
  "dark": {
   "surface": "#242728",
   "raised": "#1A1C1D",
   "sunken": "#121414",
   "text": "#EDE9E2",
   "textSoft": "#C9C4BA",
   "quiet": "#ABA69D",
   "quietOnSunken": "#ABA69D",
   "border": "#8A867E",
   "divider": "#3A3E3F",
   "action": "#E07A5E",
   "actionHover": "#E5876C",
   "actionPressed": "#D96F52",
   "actionLabel": "#1A1C1D",
   "focus": "#EDE9E2",
   "disabledBg": "#2E3233",
   "disabledText": "#ABA69D",
   "scrim": "#0B0C0C",
   "success": {
    "fg": "#7FD1A5",
    "bg": "#12301F"
   },
   "warning": {
    "fg": "#E8B65A",
    "bg": "#33260A"
   },
   "danger": {
    "fg": "#F0917D",
    "bg": "#3A1E18"
   },
   "info": {
    "fg": "#C9A27E",
    "bg": "#2E2822"
   },
   "neutral": {
    "fg": "#EDE9E2",
    "bg": "#2E3233"
   }
  },
  "status": [
   {
    "id": "booked",
    "label": "Booked",
    "tone": "info",
    "fg": "#2A2D2E",
    "bg": "#C9A27E",
    "dark": {
     "fg": "#1A1C1D",
     "bg": "#C9A27E"
    }
   },
   {
    "id": "quote-sent",
    "label": "Quote sent",
    "tone": "neutral",
    "fg": "#2A2D2E",
    "bg": "#FFFFFF",
    "edge": "#2A2D2E",
    "dark": {
     "fg": "#1A1C1D",
     "bg": "#EDE9E2",
     "edge": "#EDE9E2"
    }
   },
   {
    "id": "on-site",
    "label": "On site",
    "tone": "success",
    "fg": "#FFFFFF",
    "bg": "#2A2D2E",
    "dark": {
     "fg": "#EDE9E2",
     "bg": "#121414",
     "edge": "#8A867E"
    }
   },
   {
    "id": "needs-ok",
    "label": "Needs your OK",
    "tone": "action",
    "fg": "#FFFFFF",
    "bg": "#A4432C",
    "dark": {
     "fg": "#1A1C1D",
     "bg": "#E07A5E"
    }
   },
   {
    "id": "finished",
    "label": "Finished",
    "tone": "neutral",
    "fg": "#5A5853",
    "bg": "transparent",
    "edge": "#D0CCC5",
    "dark": {
     "fg": "#ABA69D",
     "bg": "transparent",
     "edge": "#3A3E3F"
    }
   }
  ],
  "elevationNote": "Plumbline draws edges, not shadows. Cards sit on Plaster with a 1 px hairline, and anything that floats gets a 1 px Bluestone edge.",
  "screen": {
   "title": "Your build",
   "content": {
    "time": "8:06",
    "status": "Booked",
    "eta": "Start Monday 16 November",
    "pickup": "Measured Tuesday 10 November at 14 Doveton Street North.",
    "from": "Measure-up",
    "to": "Handover",
    "progress": 0.6,
    "rider": "Sam Dunne, site lead",
    "initials": "SD",
    "riderNote": "On site from 7 am",
    "call": "Call",
    "deliverToLabel": "Site",
    "deliverTo": "14 Doveton Street North",
    "paidLabel": "Fixed price",
    "paid": "$38,460",
    "share": "Share the schedule",
    "deliveries": [
     {
      "to": "14 Doveton Street North",
      "when": "Kitchen, start Mon 16 Nov",
      "price": "$38,460",
      "status": "booked"
     },
     {
      "to": "22 Peel Street South",
      "when": "Bathroom, quote sent Mon 2 Nov",
      "price": "$21,800",
      "status": "quote-sent"
     },
     {
      "to": "9 Sebastopol Street",
      "when": "Laundry, on site since Mon 26 Oct",
      "price": "$12,350",
      "status": "on-site"
     },
     {
      "to": "11 Lydiard Street",
      "when": "Kitchen, decide by Fri 6 Nov",
      "price": "$41,200",
      "status": "needs-ok"
     },
     {
      "to": "5 Armstrong Street",
      "when": "Bathroom, finished Fri 23 Oct",
      "price": "$18,900",
      "status": "finished"
     }
    ],
    "form": {
     "title": "Book a measure-up",
     "pickup": "Address",
     "pickupValue": "14 Doveton Street North",
     "dropoff": "Suburb",
     "dropoffValue": "Alfredton",
     "ready": "Postcode",
     "readyValue": "3350",
     "readyError": "Enter all four digits, like 3350.",
     "size": "Room",
     "sizes": [
      "Kitchen",
      "Bathroom",
      "Laundry"
     ],
     "notes": "Notes for the builder",
     "notesHelp": "Access, pets, parking, who to ask for.",
     "book": "Book a measure-up",
     "bookWhy": "Add a day to book."
    },
    "empty": {
     "title": "No measure-ups booked",
     "body": "Book a measure-up and we'll send the quote within the week.",
     "cta": "Book a measure-up"
    },
    "dialog": {
     "title": "Cancel this measure-up?",
     "body": "Sam has not been out yet. Cancelling is free until Tuesday 10 November, 8 am.",
     "confirm": "Cancel measure-up",
     "keep": "Keep measure-up"
    },
    "toast": "Measure-up booked for Tuesday 10 November, 8 am.",
    "alert": "The tiler is a day late. Splashback now goes in Friday 20 November.",
    "inline": "Add a gate code if the site has one.",
    "example": {
     "secondary": "View the quote",
     "quiet": "Skip",
     "danger": "Cancel measure-up",
     "small": "Book",
     "account": "Account",
     "checks": [
      "Clear the benches by 7 am",
      "Text me the day before",
      "Pets on site"
     ],
     "switches": [
      "Text me before the crew arrives",
      "Email the schedule"
     ],
     "radios": [
      "Morning",
      "Afternoon"
     ],
     "statLabel": "Fixed price",
     "crumbs": [
      "Quotes",
      "Doveton Street"
     ],
     "tabs": [
      "Booked",
      "On site",
      "Finished"
     ],
     "links": [
      [
       "Measure-up",
       "ruler"
      ],
      [
       "Quote",
       "receipt"
      ],
      [
       "Schedule",
       "calendar"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Jo Kearney",
   "role": "Estimator",
   "contact": "jo@plumbline.example"
  },
  "social": [
   "Measured twice. Quoted once.",
   "Your kitchen, on the date we said.",
   "Fixed price: $38,460, held until 1 December."
  ],
  "signage": "Site hoarding, 2400 x 1200 mm: Your kitchen, on the date we said.",
  "email": {
   "person": "Jo Kearney",
   "role": "Estimator"
  },
  "site": {
   "url": "plumbline.example"
  }
 },
 "guideB": {
  "studioSlot": "A crew member posed in front of a plain studio wall. Flat light, no room.",
  "rules": [
   {
    "title": "Put a date on it",
    "text": "Every message names a day, a price or a material. Measure-up: Tuesday 10 November, 8 am."
   },
   {
    "title": "Keep Brick for the one action",
    "text": "Most of every page is Plaster. Brick is the action, the redline and the Needs your OK status."
   },
   {
    "title": "Hold the camera level",
    "text": "Walls stand true and the benchtop sits flat. Timber and Brick come from the room, never from editing."
   }
  ],
  "email": {
   "to": "Tom Reilly",
   "subject": "Measure-up booked for Tuesday 10 November",
   "time": "8:06",
   "body": [
    "Hi Tom,",
    "Your measure-up is booked for Tuesday 10 November at 8 am. Allow an hour, and clear the benchtops if you can."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@plumbline.example"
 }
};

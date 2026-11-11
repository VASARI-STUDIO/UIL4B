// Sample brand data for the export themes.
export default {
 "name": "Two Shores",
 "slug": "two-shores",
 "theme": "04-standards",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Two Shores is a river ferry in Newcastle. It joins Queens Wharf and Stockton, with a ferry every 20 minutes, both ways, and a crossing of six.",
 "product": "See the next departures, buy a fare, and know when it is boarding.",
 "audience": "People crossing the river between Queens Wharf and Stockton: commuters, students, shoppers and visitors.",
 "city": "Newcastle",
 "lines": {
  "primary": "Every 20 minutes, both ways.",
  "others": [
   "Across in six.",
   "Next ferry in 4 minutes."
  ]
 },
 "personality": [
  {
   "trait": "Exact",
   "means": "Times come first, to the minute. A ferry that is five minutes late says 5 min late, and says when it now leaves."
  },
  {
   "trait": "Plain",
   "means": "Short sentences in the order a passenger needs them: time, wharf, status. No hype and no exclamation marks."
  },
  {
   "trait": "Steady",
   "means": "Level when it goes wrong. A cancelled sailing says so and names the next one."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Put the time first",
    "example": "07:20 Stockton. Boarding."
   },
   {
    "title": "Name the wharf",
    "example": "Leaving from Queens Wharf."
   },
   {
    "title": "Keep sentences short",
    "example": "Next ferry in 4 minutes. Across in six."
   },
   {
    "title": "Stay level when it goes wrong",
    "example": "08:20 cancelled. Next ferry 08:40."
   }
  ],
  "writeThis": [
   {
    "write": "Next ferry in 4 minutes.",
    "not": "Your ferry will be departing shortly.",
    "because": "Minutes are a promise. Shortly is not."
   },
   {
    "write": "5 min late.",
    "not": "We apologise for any inconvenience caused by a delay.",
    "because": "Give the number, then say when it now leaves."
   },
   {
    "write": "Buy a fare",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "08:20 cancelled. Next ferry 08:40.",
    "not": "This service has been cancelled.",
    "because": "Say what happened and what to do next."
   },
   {
    "write": "Every 20 minutes, both ways.",
    "not": "A frequent, reliable cross-river service.",
    "because": "Say it the way the timetable says it."
   }
  ],
  "boilerplate25": "Two Shores is a river ferry in Newcastle. A ferry leaves Queens Wharf for Stockton every 20 minutes, and one comes back. Across in six.",
  "boilerplate50": "Two Shores is a river ferry in Newcastle, joining Queens Wharf and Stockton. A ferry leaves every 20 minutes, both ways, and the crossing takes six. You see the next departures, buy a fare and board. Times come first. We say a time, and we keep to it, every crossing.",
  "nameRules": "Write Two Shores as two words, each with a capital, in running text. Set TWO SHORES in capitals only as the wordmark, never as a typed word. Never TwoShores, Two-Shores, Two Shores Ferries or TS."
 },
 "colours": [
  {
   "id": "deck",
   "name": "Deck",
   "hex": "#F4F4F1",
   "role": "ground",
   "lands": "The ground: every screen, timetable and the back of every sign.",
   "share": 0.58
  },
  {
   "id": "hull",
   "name": "Hull",
   "hex": "#0F1A1C",
   "role": "text",
   "lands": "All text, the wharf sign panels, the focus ring and the hull itself.",
   "share": 0.3
  },
  {
   "id": "rope",
   "name": "Rope",
   "hex": "#9C4A1F",
   "role": "action",
   "lands": "The one action on a screen, links, and the wake on Deck. Never a status.",
   "share": 0.04
  },
  {
   "id": "buoy",
   "name": "Buoy",
   "hex": "#FFC72C",
   "role": "highlight",
   "lands": "Fill only: the boarding row, the wake on Hull, a cover.",
   "share": 0.06
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "label",
   "lands": "Only the label on a Rope button, and a raised surface.",
   "share": 0.02
  }
 ],
 "tones": [
  {
   "id": "quiet",
   "name": "Quiet",
   "hex": "#55605F",
   "role": "quiet text",
   "lands": "Captions, folios and help text on Deck and White."
  },
  {
   "id": "hairline",
   "name": "Hairline",
   "hex": "#C6C9C6",
   "role": "rule",
   "lands": "The 1 px rule between rows and around an empty box. Never text."
  }
 ],
 "pairs": [
  {
   "fg": "hull",
   "bg": "deck",
   "use": "Body text, headlines"
  },
  {
   "fg": "quiet",
   "bg": "deck",
   "use": "Captions, folios"
  },
  {
   "fg": "hull",
   "bg": "white",
   "use": "Text on a raised surface"
  },
  {
   "fg": "quiet",
   "bg": "white",
   "use": "Help text on a raised surface"
  },
  {
   "fg": "rope",
   "bg": "deck",
   "use": "Links, the action"
  },
  {
   "fg": "rope",
   "bg": "white",
   "use": "Links on a raised surface"
  },
  {
   "fg": "white",
   "bg": "rope",
   "use": "Button labels"
  },
  {
   "fg": "hull",
   "bg": "buoy",
   "use": "Boarding row, covers"
  },
  {
   "fg": "deck",
   "bg": "hull",
   "use": "Reversed text, hover label"
  }
 ],
 "fonts": {
  "display": {
   "family": "Barlow Condensed",
   "weights": [
    600,
    700
   ],
   "file": "BarlowCondensed",
   "css": "Barlow+Condensed:wght@600;700"
  },
  "body": {
   "family": "Barlow",
   "weights": [
    400,
    500,
    600
   ],
   "file": "Barlow",
   "css": "Barlow:wght@400;500;600"
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
    "size": 96,
    "line": 1,
    "weight": 700,
    "face": "display",
    "use": "A cover or a wharf sign: the wordmark, or one line"
   },
   {
    "token": "headline",
    "size": 50,
    "line": 0.9,
    "weight": 700,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "time",
    "size": 44,
    "line": 1,
    "weight": 700,
    "face": "display",
    "use": "A time and a destination on a screen"
   },
   {
    "token": "title",
    "size": 22,
    "line": 1.25,
    "weight": 600,
    "face": "body",
    "use": "Titles inside a piece"
   },
   {
    "token": "body",
    "size": 17,
    "line": 1.4,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "label",
    "size": 14,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Field labels, row detail"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.5,
    "weight": 400,
    "face": "body",
    "use": "Captions and folios"
   }
  ],
  "sample": {
   "headline": "Every 20 minutes, both ways.",
   "paragraph": "The next ferry to Stockton leaves Queens Wharf at 07:20 and is across in six minutes. Another follows every 20 minutes, both ways.",
   "caption": "Queens Wharf to Stockton. Boarding 07:20."
  },
  "rules": [
   {
    "do": "Set times and headlines in Barlow Condensed 700. Everything read or tapped is Barlow.",
    "dont": "Set a paragraph in Condensed, or a time in Barlow."
   },
   {
    "do": "Set capitals only for the wordmark. Everything else is sentence case.",
    "dont": "Set headlines in capitals."
   },
   {
    "do": "Use 17 px for reading text and 12 px for captions. Nothing smaller.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and the quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use tabular figures for every time and fare, so columns stay in line.",
    "dont": "Set times in proportional figures."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name leaves a wake: one line the full width of the wordmark, drawn in x, its own stroke. It sits 2x below the baseline, swings x and repeats every 6x, and it is cut square at both ends. The wake is never drawn without the name.",
  "showcase": {
   "wordmark": "TWO SHORES",
   "symbolNote": "The symbol is the T and the S standing on a length of the same wake.",
   "minScreenPx": 96,
   "minPrintMm": 30
  },
  "colourways": {
   "colour": {
    "name": "#0F1A1C",
    "wake": "#9C4A1F",
    "ground": "#F4F4F1"
   },
   "mono-dark": {
    "name": "#0F1A1C",
    "wake": "#0F1A1C",
    "ground": "#F4F4F1"
   },
   "mono-light": {
    "name": "#F4F4F1",
    "wake": "#F4F4F1",
    "ground": "#0F1A1C"
   },
   "reversed": {
    "name": "#F4F4F1",
    "wake": "#FFC72C",
    "ground": "#0F1A1C"
   },
   "on-buoy": {
    "name": "#0F1A1C",
    "wake": "#0F1A1C",
    "ground": "#FFC72C"
   }
  },
  "when": {
   "colour": "The default. On Deck and on light photos.",
   "mono-dark": "One colour printing and stamps. On light grounds that cannot carry Rope.",
   "mono-light": "On photos and dark grounds that cannot carry Buoy.",
   "reversed": "On Hull. Deck name, Buoy wake.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: wharf sign posts, profile images, ticket stock.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "The crossing as it happens: the ferry on the river, the wharf, people stepping aboard. The river and the ferry are the subject; the passenger is a shoulder, a hand, a back.",
   "light": "Real daylight. Low morning light or flat overcast. No flash, no studio.",
   "crop": "Wide and level, with the horizon straight. Leave a clear band of water or sky for one line of type.",
   "colour": "Natural colour. Buoy appears because the lifebuoy or the signage is that colour, never added in editing.",
   "people": "Passengers as they are, mid-journey, mostly from behind or at a distance. No posed smiles, no faces to camera."
  },
  "shots": [
   {
    "id": "crossing",
    "slot": "The crossing: the ferry mid-river, side-on, with the far shore behind it. Wide crop, water filling the lower third. Low morning light."
   },
   {
    "id": "wharf",
    "slot": "The wharf: the departures sign at Queens Wharf with one passenger reading it, shot from behind. Crop to the sign and the shoulder. Flat overcast light."
   },
   {
    "id": "boarding",
    "slot": "The boarding: passengers stepping over the gangway, shot at knee height, side-on. Tight crop to the feet and the gap. Late afternoon light."
   },
   {
    "id": "deck",
    "slot": "The deck: a hand on the rail with the river moving past, out of focus. Close crop. Midday light, a hard shadow."
   },
   {
    "id": "wake",
    "slot": "The wake: the white line behind the ferry, shot from the stern and straight down the middle. Wide, symmetrical crop. Early light."
   },
   {
    "id": "stockton",
    "slot": "The far shore: Stockton wharf seen from the water, the bow in one corner. Wide crop. Warm evening light."
   }
  ],
  "rules": [
   {
    "do": "Show the river and the ferry at work, with the horizon level.",
    "dont": "Tilt the horizon, or crop in so tight the river is lost."
   },
   {
    "do": "Let Buoy come from the lifebuoy or the signage.",
    "dont": "Tint the photo yellow or add a colour wash."
   },
   {
    "do": "Shoot passengers from behind or at a distance.",
    "dont": "Pose people against the rail looking at the camera."
   },
   {
    "do": "Use a photo or a flat colour behind the logo.",
    "dont": "Set the logo on a busy part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 1123,
   "h": 794
  },
  "margin": 56,
  "columns": 12,
  "gutter": 16,
  "base": 4
 },
 "ui": {
  "rowIcon": "ship",
  "radius": {
   "control": 2,
   "card": 2
  },
  "border": 1,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "ship",
   "map-pin",
   "clock",
   "ticket",
   "phone",
   "user",
   "calendar",
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
    "size": 14,
    "line": 20,
    "weight": 500,
    "face": "body",
    "use": "Field labels, row detail, status words"
   },
   {
    "token": "body",
    "size": 16,
    "line": 24,
    "weight": 400,
    "face": "body",
    "use": "Reading text and row titles"
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
    "token": "time",
    "size": 28,
    "line": 28,
    "weight": 600,
    "face": "display",
    "use": "A departure time in a row"
   },
   {
    "token": "title-s",
    "size": 22,
    "line": 24,
    "weight": 700,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 32,
    "line": 32,
    "weight": 700,
    "face": "display",
    "use": "Screen titles, the live status"
   },
   {
    "token": "headline",
    "size": 44,
    "line": 44,
    "weight": 700,
    "face": "display",
    "use": "Empty states and the next ferry"
   }
  ],
  "light": {
   "surface": "#F4F4F1",
   "raised": "#FFFFFF",
   "sunken": "#E6E8E4",
   "text": "#0F1A1C",
   "textSoft": "#2B3739",
   "quiet": "#55605F",
   "quietOnSunken": "#4F5A59",
   "border": "#55605F",
   "divider": "#C6C9C6",
   "action": "#9C4A1F",
   "actionHover": "#0F1A1C",
   "actionPressed": "#7A3A18",
   "actionLabel": "#FFFFFF",
   "focus": "#0F1A1C",
   "disabledBg": "#E6E8E4",
   "disabledText": "#4F5A59",
   "scrim": "#0F1A1C",
   "success": {
    "fg": "#1C6B3A",
    "bg": "#DCEEDF"
   },
   "warning": {
    "fg": "#6E5200",
    "bg": "#FCEFC2"
   },
   "danger": {
    "fg": "#B3202A",
    "bg": "#F8DEDC"
   },
   "info": {
    "fg": "#24474E",
    "bg": "#DFE7E8"
   }
  },
  "dark": {
   "surface": "#0F1A1C",
   "raised": "#172629",
   "sunken": "#0A1214",
   "text": "#F4F4F1",
   "textSoft": "#D2D8D6",
   "quiet": "#A3B0AE",
   "quietOnSunken": "#A3B0AE",
   "border": "#7E8D8B",
   "divider": "#2B3C3F",
   "action": "#FFC72C",
   "actionHover": "#FFD968",
   "actionPressed": "#E5AE10",
   "actionLabel": "#0F1A1C",
   "focus": "#F4F4F1",
   "disabledBg": "#1D2D30",
   "disabledText": "#A3B0AE",
   "scrim": "#000000",
   "success": {
    "fg": "#6FD39A",
    "bg": "#0E3A22"
   },
   "warning": {
    "fg": "#E8D196",
    "bg": "#33290C"
   },
   "danger": {
    "fg": "#FF8F87",
    "bg": "#4A1518"
   },
   "info": {
    "fg": "#9CC3CA",
    "bg": "#1F3236"
   }
  },
  "status": [
   {
    "id": "boarding",
    "label": "Boarding",
    "tone": "success"
   },
   {
    "id": "on-time",
    "label": "On time",
    "tone": "info"
   },
   {
    "id": "late",
    "label": "5 min late",
    "tone": "warning"
   },
   {
    "id": "cancelled",
    "label": "Cancelled",
    "tone": "danger"
   },
   {
    "id": "fare-bought",
    "label": "Fare bought",
    "tone": "info"
   }
  ],
  "elevationNote": "Two Shores draws hairlines, not shadows. Grounds step from Deck to White, and anything that floats gets a 1 px Hull edge.",
  "screen": {
   "title": "Next departures",
   "content": {
    "time": "07:16",
    "status": "Boarding",
    "eta": "Leaves 07:20",
    "pickup": "Boarding at Queens Wharf. Across in six.",
    "from": "Queens Wharf",
    "to": "Stockton",
    "progress": 0.6,
    "rider": "The 07:20 to Stockton",
    "initials": "TS",
    "riderNote": "Boarding closes at 07:19",
    "call": "Call wharf",
    "deliverToLabel": "Going to",
    "deliverTo": "Stockton",
    "paidLabel": "Fare",
    "paid": "$4.80",
    "share": "Share this sailing",
    "deliveries": [
     {
      "to": "Stockton",
      "when": "07:20, in 4 min",
      "price": "$4.80",
      "status": "boarding"
     },
     {
      "to": "Queens Wharf",
      "when": "07:30, in 14 min",
      "price": "$4.80",
      "status": "on-time"
     },
     {
      "to": "Stockton",
      "when": "08:00, now 08:05",
      "price": "$4.80",
      "status": "late"
     },
     {
      "to": "Queens Wharf",
      "when": "08:10, next 08:30",
      "price": "$4.80",
      "status": "cancelled"
     },
     {
      "to": "Stockton",
      "when": "Your fare, 07:40",
      "price": "$4.80",
      "status": "fare-bought"
     }
    ],
    "form": {
     "title": "Buy a fare",
     "pickup": "Leaving from",
     "pickupValue": "Queens Wharf",
     "dropoff": "Going to",
     "dropoffValue": "Stockton",
     "ready": "Card number",
     "readyValue": "4802 11",
     "readyError": "Enter all 16 digits.",
     "size": "Fare type",
     "sizes": [
      "Adult",
      "Concession",
      "Child"
     ],
     "notes": "Notes for the crew",
     "notesHelp": "A bike, a pram or a wheelchair on board.",
     "book": "Buy a fare",
     "bookWhy": "Enter the card number to buy."
    },
    "empty": {
     "title": "No fares bought",
     "body": "Buy a fare and it is here, ready for boarding.",
     "cta": "Buy a fare"
    },
    "dialog": {
     "title": "Cancel this fare?",
     "body": "The 07:20 to Stockton has not started boarding. You can cancel until it does.",
     "confirm": "Cancel fare",
     "keep": "Keep fare"
    },
    "toast": "Fare bought for the 07:20.",
    "alert": "5 min late. The 08:00 to Stockton now leaves at 08:05.",
    "inline": "Add a note if you are bringing a bike or pram.",
    "example": {
     "secondary": "Timetable",
     "quiet": "Skip",
     "danger": "Cancel fare",
     "small": "Buy",
     "account": "Account",
     "checks": [
      "Bike on board",
      "Text me if late",
      "Fare receipt"
     ],
     "switches": [
      "Text me when boarding opens",
      "Email receipts"
     ],
     "radios": [
      "Queens Wharf",
      "Stockton"
     ],
     "statLabel": "Fare",
     "crumbs": [
      "Timetable",
      "Today"
     ],
     "tabs": [
      "Next",
      "Later",
      "Past"
     ],
     "links": [
      [
       "Timetable",
       "clock"
      ],
      [
       "Fares",
       "ticket"
      ],
      [
       "Wharves",
       "map-pin"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Callum Reid",
   "role": "Wharf operations",
   "contact": "callum@twoshores.example"
  },
  "social": [
   "Every 20 minutes, both ways.",
   "Across in six.",
   "Next ferry in 4 minutes."
  ],
  "signage": "Wharf departure sign, 1200 x 800 mm: Every 20 minutes, both ways.",
  "email": {
   "person": "Callum Reid",
   "role": "Wharf operations"
  },
  "site": {
   "url": "twoshores.example"
  }
 },
 "guideB": {
  "rules": [
   {
    "title": "Put the time first",
    "text": "Every message opens with a clock time, to the minute. 07:20 Stockton. Boarding."
   },
   {
    "title": "Keep Rope for the action",
    "text": "Most of every page is Deck. Rope is the one action, and the wake on Deck. Buoy is a fill, never text."
   },
   {
    "title": "Show the crossing as it is",
    "text": "Wide and level, in real daylight, with the river doing the work. Buoy comes from the lifebuoy, never from editing."
   }
  ],
  "examples": [
   {
    "do": "The ferry mid-river, side-on, the horizon level.",
    "dont": "The same shot tilted, cropped so tight the river is lost."
   },
   {
    "do": "A lifebuoy on the rail. Its Buoy yellow is the only yellow.",
    "dont": "The whole photo tinted yellow in editing."
   },
   {
    "do": "A passenger reading the departures sign, shot from behind.",
    "dont": "Passengers posed at the rail, looking at the camera."
   },
   {
    "do": "The logo on a flat Hull ground.",
    "dont": "The logo over the busiest part of the photo."
   }
  ],
  "email": {
   "to": "Priya Nair",
   "subject": "Your fare for the 07:20",
   "time": "06:58",
   "body": [
    "Hi Priya,",
    "Your fare for the 07:20 to Stockton is bought. Boarding closes at 07:19 at Queens Wharf, and the crossing takes six minutes."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@twoshores.example"
 }
};

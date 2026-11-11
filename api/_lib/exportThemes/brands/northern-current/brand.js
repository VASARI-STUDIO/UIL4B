// Sample brand data for the export themes.
export default {
 "name": "Northern Current",
 "slug": "northern-current",
 "theme": "07-spec",
 "version": {
  "number": "1.0.0",
  "date": "2026-11-01"
 },
 "description": "Northern Current installs rooftop solar on homes in Darwin. You get a quote, choose an install day, and see what the system makes once it is on.",
 "product": "Get a quote, book an install day, and see the system output.",
 "audience": "Darwin households with a roof and a power bill they want to bring down.",
 "city": "Darwin",
 "lines": {
  "primary": "Your roof, working by Thursday.",
  "others": [
   "Sun in, bills down."
  ]
 },
 "personality": [
  {
   "trait": "Exact",
   "means": "We give the size in kilowatts and the day we will be there. A quote says how the bill estimate was worked out."
  },
  {
   "trait": "Straight",
   "means": "We say what the panels do for this house. No green-washing, no saving we have not worked out for this roof."
  },
  {
   "trait": "Local",
   "means": "We name the street and the suburb, and the crew by first name. 14 Bagot Road, Ludmilla. Dan and Priya."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Size in kilowatts",
    "example": "6.6 kW, 15 panels."
   },
   {
    "title": "A date, not a speed",
    "example": "Working by Thursday 13 November."
   },
   {
    "title": "Show the working",
    "example": "Your quote shows the bill estimate and how we worked it out."
   },
   {
    "title": "Say what it does for this house",
    "example": "Panels on the roof, power at the meter box."
   }
  ],
  "writeThis": [
   {
    "write": "6.6 kW, 15 panels",
    "not": "A powerful system",
    "because": "Size in kilowatts, with the unit, every time."
   },
   {
    "write": "Working by Thursday 13 November",
    "not": "Up and running in no time",
    "because": "A date we can keep, never a speed."
   },
   {
    "write": "Your quote shows the bill estimate and how we worked it out",
    "not": "Save thousands",
    "because": "No saving we have not worked out for this roof."
   },
   {
    "write": "Panels on the roof, power at the meter box",
    "not": "Clean, green energy for a better planet",
    "because": "No green-washing. Say what it does for this house."
   },
   {
    "write": "Get my quote",
    "not": "Submit",
    "because": "A button names the next step."
   }
  ],
  "boilerplate25": "Northern Current installs solar on Darwin roofs. Get a quote, pick an install day, and see what your system makes. Your roof, working by Thursday.",
  "boilerplate50": "Northern Current installs solar on Darwin roofs. You get a quote that shows the bill estimate and how we worked it out, pick an install day, and see what the system makes once it is on. We always give the size in kilowatts and the day we will be there.",
  "nameRules": "Write Northern Current in full, both words capitalised. Set it as the wordmark in Red Hat Display 900, never as a typed substitute. Never NC, Northern Current Solar or Northern-Current."
 },
 "colours": [
  {
   "id": "sunbelt",
   "name": "Sunbelt",
   "hex": "#F2A900",
   "role": "action",
   "lands": "Buttons and the install-day date. A fill only, never text.",
   "share": 0.12
  },
  {
   "id": "night",
   "name": "Night",
   "hex": "#12161F",
   "role": "text",
   "lands": "Text, focus rings and the wordmark.",
   "share": 0.14
  },
  {
   "id": "spinifex",
   "name": "Spinifex",
   "hex": "#B4561F",
   "role": "link",
   "lands": "Links, errors, and a roof that needs a photo.",
   "share": 0.04
  },
  {
   "id": "slate",
   "name": "Quiet",
   "hex": "#545B66",
   "role": "quiet text",
   "lands": "Captions, dates, help text, control edges.",
   "share": 0.08
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "ground",
   "lands": "Every page and screen ground.",
   "share": 0.62
  }
 ],
 "tones": [
  {
   "id": "hover",
   "name": "Sunbelt hover",
   "hex": "#FFBE26",
   "role": "hover",
   "lands": "A Sunbelt button under the pointer. Night label, 10.9 : 1."
  }
 ],
 "pairs": [
  {
   "fg": "night",
   "bg": "white",
   "use": "Body text, headlines"
  },
  {
   "fg": "slate",
   "bg": "white",
   "use": "Captions, dates, help text"
  },
  {
   "fg": "night",
   "bg": "sunbelt",
   "use": "Button labels, the install-day date"
  },
  {
   "fg": "night",
   "bg": "hover",
   "use": "Button label on hover"
  },
  {
   "fg": "spinifex",
   "bg": "white",
   "use": "Links and error text"
  },
  {
   "fg": "white",
   "bg": "spinifex",
   "use": "Words on a Spinifex highlight"
  },
  {
   "fg": "white",
   "bg": "night",
   "use": "Reversed text"
  }
 ],
 "fonts": {
  "display": {
   "family": "Red Hat Display",
   "weights": [
    900,
    700
   ],
   "file": "RedHatDisplay",
   "css": "Red+Hat+Display:wght@700;900"
  },
  "body": {
   "family": "Red Hat Text",
   "weights": [
    400,
    500
   ],
   "file": "RedHatText",
   "css": "Red+Hat+Text:wght@400;500"
  },
  "mono": {
   "family": "Martian Mono",
   "weights": [
    400
   ],
   "file": "MartianMono",
   "css": "Martian+Mono:wght@400"
  }
 },
 "type": {
  "scale": [
   {
    "token": "display",
    "size": 96,
    "line": 0.92,
    "weight": 900,
    "face": "display",
    "use": "The wordmark and a cover, two lines"
   },
   {
    "token": "headline",
    "size": 72,
    "line": 1,
    "weight": 700,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 28,
    "line": 1.2,
    "weight": 700,
    "face": "display",
    "use": "Titles inside a piece, 24 px and up"
   },
   {
    "token": "body",
    "size": 16,
    "line": 1.5,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "label",
    "size": 16,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Buttons and short labels"
   },
   {
    "token": "caption",
    "size": 14,
    "line": 1.45,
    "weight": 400,
    "face": "body",
    "use": "Captions, dates and help text"
   }
  ],
  "sample": {
   "headline": "Your roof, working by Thursday.",
   "paragraph": "Dan and Priya arrive at 7:30 am on Thursday 13 November. Your system is working by 3 pm, and the app shows what it makes from then.",
   "caption": "6.6 kW, 15 panels. 14 Bagot Road, Ludmilla."
  },
  "rules": [
   {
    "do": "Set 900 for the wordmark only. Headlines are 700, 24 px and up.",
    "dont": "Set the wordmark in 700 or a headline in 900."
   },
   {
    "do": "Write units with a space: 6.6 kW, 3 pm.",
    "dont": "Write 6.6kW or 3PM."
   },
   {
    "do": "Use 16 px for reading text and 14 px for captions. Nothing smaller.",
    "dont": "Set body copy under 14 px."
   },
   {
    "do": "Use weight and the quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Set a hex, a token or a code string in mono.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name sits over a horizon line, and the sun comes up at its end. The line is always as wide as the name, and the sun always rises from it, never floats above it.",
  "showcase": {
   "wordmark": "Northern Current",
   "symbolNote": "The symbol is the N on its own length of horizon, with the sun rising at its end.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#12161F",
    "sun": "#F2A900",
    "ground": "#FFFFFF"
   },
   "mono-dark": {
    "name": "#12161F",
    "sun": "#12161F",
    "ground": "#FFFFFF"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "sun": "#FFFFFF",
    "ground": "#12161F"
   },
   "reversed": {
    "name": "#FFFFFF",
    "sun": "#F2A900",
    "ground": "#12161F"
   },
   "on-sunbelt": {
    "name": "#12161F",
    "sun": "#12161F",
    "ground": "#F2A900"
   }
  },
  "when": {
   "colour": "The default. On White and on light photos.",
   "mono-dark": "One colour printing, stamps, and light grounds that cannot carry Sunbelt.",
   "mono-light": "On photos and dark grounds that cannot carry Sunbelt.",
   "reversed": "On Night. White name, Sunbelt sun.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, ute doors, site boards.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Roofs at work in Darwin: panels going up, the meter box, the crew on the ridge. The roof is the subject, not the sky.",
   "light": "Hard Top End light, early morning or late afternoon. No flash, no studio.",
   "crop": "Wide and honest, with the whole roof and the street around it. Leave a clear patch of sky or tin for one line of type.",
   "colour": "Natural colour. Sunbelt appears because it is the light, never added in editing.",
   "people": "Our installers, by name, shot as they work. No stock couples pointing at a roof."
  },
  "shots": [
   {
    "id": "ridge",
    "slot": "The ridge: Dan and Priya fixing the last panel on a tin roof, seen from the next roof along. Wide crop, the street below. Early morning light from the east."
   },
   {
    "id": "array",
    "slot": "The array: fifteen panels on a Darwin tin roof, shot from the ridge at a low angle. Crop level with the panel edge, the sky a clear band above. Late afternoon light."
   },
   {
    "id": "meter",
    "slot": "The meter box: an open switchboard with the new isolator labelled, shot straight on at chest height. Tight crop. Flat shade light, no flash."
   },
   {
    "id": "street",
    "slot": "The street: a finished house on a quiet Ludmilla street, roof in frame, ute at the kerb. Wide crop with room on the left for a line of type. Late afternoon light."
   },
   {
    "id": "kitchen",
    "slot": "The output: a phone on a kitchen bench showing the day's output, a power bill beside it. Close crop from above. Window light from the left."
   },
   {
    "id": "handover",
    "slot": "The handover: Priya showing the owner the meter box at the back door, side-on at waist height. Crop to the two of them and the box. Open shade, mid-morning."
   }
  ],
  "rules": [
   {
    "do": "Show the roof working, with the street around it.",
    "dont": "Pose people against a blue sky and a clean new roof."
   },
   {
    "do": "Let Sunbelt come from the light.",
    "dont": "Tint the photo gold or add a colour wash."
   },
   {
    "do": "Crop wide and leave room for one line of type.",
    "dont": "Crop to a face with a headline across it."
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
  "columns": 6,
  "gutter": 14,
  "base": 4
 },
 "ui": {
  "rowIcon": "solar-panel",
  "radius": {
   "control": 6,
   "card": 10
  },
  "border": 1.5,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "sun",
   "zap",
   "house",
   "map-pin",
   "clock",
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
   "info",
   "file-text",
   "gauge",
   "camera"
  ],
  "type": [
   {
    "token": "caption",
    "size": 14,
    "line": 20,
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
    "weight": 700,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 28,
    "line": 32,
    "weight": 700,
    "face": "display",
    "use": "Screen titles"
   },
   {
    "token": "headline",
    "size": 36,
    "line": 40,
    "weight": 700,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "light": {
   "surface": "#FFFFFF",
   "raised": "#F6F7F9",
   "sunken": "#ECEEF1",
   "text": "#12161F",
   "textSoft": "#545B66",
   "quiet": "#545B66",
   "quietOnSunken": "#545B66",
   "border": "#545B66",
   "divider": "#E4E6E9",
   "action": "#F2A900",
   "actionExempt": true,
   "actionHover": "#FFBE26",
   "actionPressed": "#D99700",
   "actionLabel": "#12161F",
   "focus": "#12161F",
   "disabledBg": "#ECEEF1",
   "disabledText": "#545B66",
   "scrim": "#12161F",
   "success": {
    "fg": "#1D6A4B",
    "bg": "#E6F2EC"
   },
   "warning": {
    "fg": "#6B4A00",
    "bg": "#FDF1D2"
   },
   "danger": {
    "fg": "#B4561F",
    "bg": "#FFF6F0"
   },
   "info": {
    "fg": "#545B66",
    "bg": "#EEF0F3"
   }
  },
  "dark": {
   "surface": "#12161F",
   "raised": "#1B212D",
   "sunken": "#0C0F16",
   "text": "#F3F4F6",
   "textSoft": "#C9CED6",
   "quiet": "#A4ACB8",
   "quietOnSunken": "#A4ACB8",
   "border": "#7C8594",
   "divider": "#2A3140",
   "action": "#F2A900",
   "actionHover": "#FFBE26",
   "actionPressed": "#D99700",
   "actionLabel": "#12161F",
   "focus": "#F3F4F6",
   "disabledBg": "#262D3A",
   "disabledText": "#A4ACB8",
   "scrim": "#05070B",
   "success": {
    "fg": "#7FD1A5",
    "bg": "#12301F"
   },
   "warning": {
    "fg": "#F2C45A",
    "bg": "#33260A"
   },
   "danger": {
    "fg": "#F0A074",
    "bg": "#3A1F12"
   },
   "info": {
    "fg": "#B9C0CB",
    "bg": "#222937"
   }
  },
  "status": [
   {
    "id": "quote-sent",
    "label": "Quote sent",
    "tone": "info"
   },
   {
    "id": "photo",
    "label": "Roof photo needed",
    "tone": "warning"
   },
   {
    "id": "booked",
    "label": "Install booked",
    "tone": "action"
   },
   {
    "id": "producing",
    "label": "Producing",
    "tone": "success"
   },
   {
    "id": "offline",
    "label": "Inverter offline",
    "tone": "danger"
   }
  ],
  "elevationNote": "Northern Current draws rules, not shadows. Grounds stay White, and anything that floats gets a 1.5 px Night edge.",
  "screen": {
   "title": "Install day",
   "content": {
    "time": "10:44",
    "status": "Producing",
    "eta": "Working by 3 pm",
    "pickup": "Dan and Priya arrived at 7:30 am at 14 Bagot Road, Ludmilla.",
    "from": "Roof",
    "to": "Meter box",
    "progress": 0.6,
    "rider": "Dan and Priya, install crew",
    "initials": "DP",
    "riderNote": "9 of 15 panels on",
    "call": "Call",
    "deliverToLabel": "Install at",
    "deliverTo": "14 Bagot Road, Ludmilla",
    "paidLabel": "System",
    "paid": "6.6 kW",
    "share": "Share system link",
    "deliveries": [
     {
      "to": "14 Bagot Road, Ludmilla",
      "when": "Install day Thu 13 Nov",
      "price": "6.6 kW",
      "status": "booked"
     },
     {
      "to": "27 Trower Road, Millner",
      "when": "Quote sent Mon 10 Nov",
      "price": "8.0 kW",
      "status": "quote-sent"
     },
     {
      "to": "6 Aralia Street, Nightcliff",
      "when": "Needed by Wed 12 Nov",
      "price": "5.0 kW",
      "status": "photo"
     },
     {
      "to": "22 Vanderlin Drive, Wanguri",
      "when": "Yesterday 31.2 kWh",
      "price": "6.6 kW",
      "status": "producing"
     },
     {
      "to": "74 Lee Point Road, Wanguri",
      "when": "Offline since 9:12 am",
      "price": "6.6 kW",
      "status": "offline"
     }
    ],
    "form": {
     "title": "Get a quote",
     "pickup": "Address",
     "pickupValue": "14 Bagot Road, Ludmilla",
     "dropoff": "Install day",
     "dropoffValue": "Thursday 13 November",
     "ready": "Last quarter’s power bill",
     "readyValue": "four hundred",
     "readyError": "Enter the amount in dollars, such as 410.",
     "size": "Roof",
     "sizes": [
      "Tin",
      "Tile",
      "Flat"
     ],
     "notes": "Anything we should know",
     "notesHelp": "Gate code, dogs, where the meter box is.",
     "book": "Get my quote",
     "bookWhy": "Add your address to get a quote."
    },
    "empty": {
     "title": "No quotes yet",
     "body": "Get a quote for your roof. It shows the bill estimate and how we worked it out.",
     "cta": "Get my quote"
    },
    "dialog": {
     "title": "Move your install day?",
     "body": "Dan and Priya are booked for Thursday 13 November. Moving it is free until Tuesday 11 November.",
     "confirm": "Move install day",
     "keep": "Keep Thursday"
    },
    "toast": "Install booked for Thursday 13 November.",
    "alert": "Working by 3 pm. Dan and Priya are on the roof.",
    "inline": "Add a gate code if the house has one.",
    "example": {
     "secondary": "Back",
     "quiet": "Skip",
     "danger": "Cancel quote",
     "small": "Add",
     "account": "Account",
     "checks": [
      "Gate left unlocked",
      "Dog on site",
      "Meter box in garage"
     ],
     "switches": [
      "Text me when the crew is close",
      "Email my quote"
     ],
     "radios": [
      "Tin roof",
      "Tile roof"
     ],
     "statLabel": "Made today",
     "crumbs": [
      "Systems",
      "Ludmilla"
     ],
     "tabs": [
      "Quotes",
      "Installs",
      "Systems"
     ],
     "links": [
      [
       "Quote",
       "file-text"
      ],
      [
       "Install",
       "calendar"
      ],
      [
       "Output",
       "gauge"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Priya Raman",
   "role": "Install lead",
   "contact": "priya@northerncurrent.example"
  },
  "social": [
   "Your roof, working by Thursday.",
   "Sun in, bills down.",
   "Panels on the roof, power at the meter box."
  ],
  "signage": "Site board on the front fence, 600 x 900 mm: Working by Thursday 13 November.",
  "email": {
   "person": "Priya Raman",
   "role": "Install lead"
  },
  "site": {
   "url": "northerncurrent.example"
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@northerncurrent.example"
 },
 "guideB": {
  "rules": [
   "Give the size in kilowatts and the day we will be there: 6.6 kW, Thursday 13 November.",
   "Sunbelt is a fill, never text. Night sets the type.",
   "The sun rises from the line, and the line is as wide as the name."
  ],
  "email": {
   "to": "Sam Fenwick",
   "subject": "Your install day: Thursday 13 November",
   "time": "Mon 10 Nov, 4:12 pm",
   "greeting": "Hi Sam,",
   "body": "Dan and Priya arrive at 7:30 am on Thursday 13 November. Your system is working by 3 pm, and the app shows what it makes from then."
  }
 }
};

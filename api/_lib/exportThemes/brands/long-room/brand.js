// Sample brand data for the export themes.
export default {
 "name": "Long Room",
 "slug": "long-room",
 "theme": "08-monograph",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Long Room is a contemporary art space in Canberra: one long hall of changing exhibitions, free to enter, and open late on Thursdays.",
 "product": "See what's on, book a free timed entry, and plan your visit.",
 "audience": "Canberra locals, students and visitors who want to look at contemporary art slowly, with no ticket price in the way.",
 "city": "Canberra",
 "lines": {
  "primary": "Free entry. Long looks welcome.",
  "others": [
   "Open late Thursdays."
  ]
 },
 "personality": [
  {
   "trait": "Exact",
   "means": "We give the name, the title, the material and the date, in that order. Open late Thursdays, until 9 pm, never 'late nights'."
  },
  {
   "trait": "Quiet",
   "means": "The work does the talking. Labels are short, with no superlatives and no exclamation marks. Free entry is said once, plainly, beside the button."
  },
  {
   "trait": "Patient",
   "means": "Nothing rushes the visitor. Timed entry leaves room in it, a booking can be changed, and the page says so without fuss."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Write like a label",
    "example": "Ruth Calder, Low Light. Ink and gum on linen, 2026."
   },
   {
    "title": "Name the day and the hour",
    "example": "Open late Thursdays, until 9 pm."
   },
   {
    "title": "Say free once",
    "example": "Free entry. Long looks welcome."
   },
   {
    "title": "Stay level when it is full",
    "example": "Full at 6:30 pm. Places left at 7:30 pm."
   }
  ],
  "writeThis": [
   {
    "write": "Ruth Calder, Low Light. Ink and gum on linen, 2026.",
    "not": "A breathtaking journey into shadow.",
    "because": "A label names the work. It does not review it."
   },
   {
    "write": "Open late Thursdays, until 9 pm.",
    "not": "Don't miss our unforgettable late nights!",
    "because": "Say the day and the hour. Leave the excitement to the visitor."
   },
   {
    "write": "Book entry",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "Finish the email so we can send your time.",
    "not": "Invalid input.",
    "because": "Say what to do next."
   },
   {
    "write": "Free entry. Long looks welcome.",
    "not": "Entry is complimentary for all guests.",
    "because": "Say it once, plainly, beside the button."
   }
  ],
  "boilerplate25": "Long Room is a contemporary art space in Canberra. Entry is free and timed. Come for one exhibition, and stay as long as you like.",
  "boilerplate50": "Long Room is a contemporary art space in Canberra, one long hall of changing exhibitions. Entry is always free, for everyone. You book a timed entry online, arrive at your time, and stay as long as you like. We are open late on Thursdays, until 9 pm. Long looks welcome.",
  "nameRules": "Write Long Room as two words, with a capital L and a capital R. Set it in Bodoni Moda only as the wordmark. Never The Long Room, LongRoom, LONG ROOM or LR."
 },
 "colours": [
  {
   "id": "wall",
   "name": "Wall",
   "hex": "#FFFFFF",
   "role": "ground",
   "lands": "Every wall, page and screen. Most of everything.",
   "share": 0.82
  },
  {
   "id": "ink",
   "name": "Ink",
   "hex": "#141414",
   "role": "text",
   "lands": "Text, the wordmark, rules, and the Book entry button on hover.",
   "share": 0.1
  },
  {
   "id": "vermilion",
   "name": "Vermilion",
   "hex": "#C2361E",
   "role": "action",
   "lands": "Book entry, Change time and errors. Spent once a screen.",
   "share": 0.04
  },
  {
   "id": "blush",
   "name": "Blush",
   "hex": "#F2B8C6",
   "role": "accent",
   "lands": "Thursday lates and the cover plate. A fill only, never type.",
   "share": 0.04
  }
 ],
 "tones": [
  {
   "id": "quiet",
   "name": "Quiet on Wall",
   "hex": "#5C5C5C",
   "role": "quiet text",
   "lands": "Captions, folios, dates and help text on Wall."
  },
  {
   "id": "panel",
   "name": "Plate grey",
   "hex": "#EDEDED",
   "role": "panel",
   "lands": "Photo slots, plates waiting for a work, and disabled fills."
  }
 ],
 "pairs": [
  {
   "fg": "ink",
   "bg": "wall",
   "use": "Text, titles, the wordmark"
  },
  {
   "fg": "quiet",
   "bg": "wall",
   "use": "Captions, folios, dates"
  },
  {
   "fg": "wall",
   "bg": "vermilion",
   "use": "Book entry label"
  },
  {
   "fg": "vermilion",
   "bg": "wall",
   "use": "Change time, errors"
  },
  {
   "fg": "ink",
   "bg": "blush",
   "use": "Thursday lates"
  },
  {
   "fg": "wall",
   "bg": "ink",
   "use": "Reversed text, Book entry on hover"
  },
  {
   "fg": "ink",
   "bg": "panel",
   "use": "Text on a plate"
  },
  {
   "fg": "quiet",
   "bg": "panel",
   "use": "Captions on a plate"
  },
  {
   "fg": "vermilion",
   "bg": "panel",
   "use": "Errors on a plate"
  }
 ],
 "fonts": {
  "display": {
   "family": "Bodoni Moda",
   "weights": [
    500
   ],
   "italics": [
    500
   ],
   "file": "BodoniModa",
   "css": "Bodoni+Moda:wght@500"
  },
  "body": {
   "family": "Libre Franklin",
   "weights": [
    400,
    500,
    600
   ],
   "file": "LibreFranklin",
   "css": "Libre+Franklin:wght@400;500;600"
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
    "size": 64,
    "line": 1,
    "weight": 500,
    "face": "display",
    "use": "A show title on a cover, one line"
   },
   {
    "token": "headline",
    "size": 44,
    "line": 1.12,
    "weight": 500,
    "face": "display",
    "use": "A page's one line"
   },
   {
    "token": "title",
    "size": 22,
    "line": 1.3,
    "weight": 500,
    "face": "display",
    "use": "Artist names and plate titles, in italic"
   },
   {
    "token": "body",
    "size": 16,
    "line": 1.6,
    "weight": 400,
    "face": "body",
    "use": "Reading text on screen"
   },
   {
    "token": "label",
    "size": 14,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Buttons, dates and short labels"
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
   "headline": "Free entry. Long looks welcome.",
   "paragraph": "Low Light is a show of ink and gum on linen by Ruth Calder, hung low along the long room and lit by daylight. Entry is free. Book a time, or come on a Thursday and stay until 9 pm.",
   "caption": "Ruth Calder, Low Light (detail). Ink and gum on linen, 2026."
  },
  "rules": [
   {
    "do": "Set titles in Bodoni Moda 500, and the names of shows and artists in its italic.",
    "dont": "Set Bodoni in bold, or in capitals."
   },
   {
    "do": "Use Libre Franklin for everything a visitor reads or presses: labels, dates, buttons.",
    "dont": "Set a paragraph in Bodoni."
   },
   {
    "do": "Use 16 px for reading on screen, 14 px for labels, 12 px for captions. Nothing smaller.",
    "dont": "Set text under 12 px."
   },
   {
    "do": "Use Ink and the quiet grey for hierarchy.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "A plate hangs above the name, the way a work hangs above its label. The name is set in Bodoni Moda, the plate is a square of Blush, and the plate always sits flush with the left edge of the L.",
  "showcase": {
   "wordmark": "Long Room",
   "symbolNote": "The symbol is the plate with the L beneath it: a work and the first letter of its label.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#141414",
    "plate": "#F2B8C6",
    "ground": "#FFFFFF"
   },
   "mono-dark": {
    "name": "#141414",
    "plate": "#141414",
    "ground": "#FFFFFF"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "plate": "#FFFFFF",
    "ground": "#141414"
   },
   "reversed": {
    "name": "#FFFFFF",
    "plate": "#F2B8C6",
    "ground": "#141414"
   },
   "on-blush": {
    "name": "#141414",
    "plate": "#141414",
    "ground": "#F2B8C6"
   },
   "on-vermilion": {
    "name": "#FFFFFF",
    "plate": "#FFFFFF",
    "ground": "#C2361E"
   }
  },
  "when": {
   "colour": "The default. On Wall and on light photos.",
   "mono-dark": "One colour printing, stamps and wall vinyl. On light grounds that cannot carry Blush.",
   "mono-light": "On photos and dark grounds that cannot carry Blush.",
   "reversed": "On Ink. White name, Blush plate.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Narrow spaces: a door vinyl, a profile image, a banner.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "The room and the work in it: the long hall empty before opening, a work on the wall, a visitor looking. The work and the room are the subject, never the building's exterior.",
   "light": "Daylight from the high windows, or the warm light of a Thursday late. No flash, no spotlight glare on a work.",
   "crop": "Wide down the length of the room, or close on a work with generous wall around it. Leave a margin for a caption.",
   "colour": "Natural colour, true to the work. Blush appears on the cover and in lates, never as a wash over a photograph.",
   "people": "Visitors looking, shot from behind or from the side, as they are. No posed groups, no pointing at the work."
  },
  "shots": [
   {
    "id": "room",
    "slot": "The long room empty before opening. Shot from the doorway down the length of the floor, centred and wide. Morning light from the high windows across the boards."
   },
   {
    "id": "work",
    "slot": "Ruth Calder, Low Light, ink and gum on linen, hung straight on with a wide margin of wall around it. Flat daylight, no spotlight glare on the cloth."
   },
   {
    "id": "looking",
    "slot": "A visitor standing close to a work, seen from behind at shoulder height. Crop to the shoulders and the wall. Soft overcast daylight."
   },
   {
    "id": "late",
    "slot": "A Thursday late: the hall at dusk with a few people in it, warm interior light against a blue window. Wide and slightly low."
   },
   {
    "id": "label",
    "slot": "The wall label: name, title, material, date. A close crop of the label beside the corner of a frame. Raking side light."
   },
   {
    "id": "door",
    "slot": "The door: a hand holding a phone with an entry time showing, the foyer soft behind. Late afternoon light."
   }
  ],
  "rules": [
   {
    "do": "Show the room and the work, with generous wall around it.",
    "dont": "Crop to a detail so tight the work is lost."
   },
   {
    "do": "Light the work with daylight, true to its colour.",
    "dont": "Add a spotlight glare or a colour wash."
   },
   {
    "do": "Show visitors looking, from behind or the side.",
    "dont": "Stage a group smiling at the camera."
   },
   {
    "do": "Use a photo or a flat Wall behind the logo.",
    "dont": "Set the logo across a busy part of the image."
   }
  ]
 },
 "layout": {
  "page": {
   "w": 794,
   "h": 1123
  },
  "margin": 72,
  "columns": 12,
  "gutter": 10,
  "base": 4
 },
 "ui": {
  "radius": {
   "control": 0,
   "card": 0
  },
  "border": 1,
  "spacingBase": 4,
  "shadows": "none",
  "icons": [
   "map-pin",
   "clock",
   "package",
   "calendar",
   "ticket",
   "image",
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
  "rowIcon": "image",
  "light": {
   "surface": "#FFFFFF",
   "raised": "#F7F7F7",
   "sunken": "#EDEDED",
   "text": "#141414",
   "textSoft": "#141414",
   "quiet": "#5C5C5C",
   "quietOnSunken": "#5C5C5C",
   "border": "#141414",
   "divider": "#E2E2E2",
   "action": "#C2361E",
   "actionHover": "#141414",
   "actionPressed": "#262626",
   "actionLabel": "#FFFFFF",
   "focus": "#141414",
   "disabledBg": "#EDEDED",
   "disabledText": "#5C5C5C",
   "scrim": "#141414",
   "success": {
    "fg": "#141414",
    "bg": "#EDEDED"
   },
   "warning": {
    "fg": "#141414",
    "bg": "#FEE0D9"
   },
   "danger": {
    "fg": "#9E2A16",
    "bg": "#FBEBE7"
   },
   "info": {
    "fg": "#141414",
    "bg": "#F2B8C6"
   }
  },
  "dark": {
   "surface": "#141414",
   "raised": "#1F1F1F",
   "sunken": "#0E0E0E",
   "text": "#F5F5F5",
   "textSoft": "#D6D6D6",
   "quiet": "#A8A8A8",
   "quietOnSunken": "#A8A8A8",
   "border": "#8C8C8C",
   "divider": "#333333",
   "action": "#C2361E",
   "actionHover": "#CC3A22",
   "actionPressed": "#A82E19",
   "actionLabel": "#FFFFFF",
   "focus": "#FFFFFF",
   "disabledBg": "#2A2A2A",
   "disabledText": "#A8A8A8",
   "scrim": "#000000",
   "success": {
    "fg": "#F5F5F5",
    "bg": "#2A2A2A"
   },
   "warning": {
    "fg": "#FF9C86",
    "bg": "#3A1A14"
   },
   "danger": {
    "fg": "#FFC9B8",
    "bg": "#4A1C12"
   },
   "info": {
    "fg": "#F2B8C6",
    "bg": "#3A1F27"
   }
  },
  "type": [
   {
    "token": "caption",
    "size": 12,
    "line": 18,
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
    "size": 22,
    "line": 28,
    "weight": 500,
    "face": "display",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 30,
    "line": 36,
    "weight": 500,
    "face": "display",
    "use": "Screen titles, the exhibition name"
   },
   {
    "token": "headline",
    "size": 44,
    "line": 50,
    "weight": 500,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "status": [
   {
    "id": "booked",
    "label": "Booked",
    "tone": "success"
   },
   {
    "id": "open-late",
    "label": "Open late",
    "tone": "info"
   },
   {
    "id": "few-places",
    "label": "Few places",
    "tone": "warning"
   },
   {
    "id": "cancelled",
    "label": "Session cancelled",
    "tone": "danger"
   }
  ],
  "elevationNote": "Long Room draws edges, not shadows. Grounds step from Wall to a quiet grey, and anything that floats gets a 1 px Ink edge on a wall of White.",
  "screen": {
   "title": "Your visit",
   "content": {
    "time": "5:48",
    "status": "Booked",
    "eta": "Thursday, 6:30 pm",
    "pickup": "Low Light, Gallery 2. Entry is free.",
    "from": "Opens 10 am",
    "to": "Late until 9 pm",
    "progress": 0.77,
    "rider": "Ruth Calder, Low Light",
    "initials": "RC",
    "riderNote": "Ink and gum on linen, 2026",
    "call": "About the work",
    "deliverToLabel": "Gallery",
    "deliverTo": "Gallery 2",
    "paidLabel": "Entry",
    "paid": "Free",
    "share": "Share this exhibition",
    "deliveries": [
     {
      "to": "Low Light",
      "when": "Thu 12 Nov, 6:30 pm",
      "price": "Free",
      "status": "booked"
     },
     {
      "to": "Low Light",
      "when": "Sat 14 Nov, 11:00 am",
      "price": "Free",
      "status": "booked"
     },
     {
      "to": "Thursday late",
      "when": "Thu 19 Nov, 7:30 pm",
      "price": "Free",
      "status": "open-late"
     },
     {
      "to": "Low Light",
      "when": "Fri 20 Nov, 2:00 pm",
      "price": "Free",
      "status": "few-places"
     },
     {
      "to": "Low Light",
      "when": "Sat 7 Nov, 10:30 am",
      "price": "Free",
      "status": "cancelled"
     }
    ],
    "form": {
     "title": "Book entry",
     "pickup": "Name on the booking",
     "pickupValue": "Jo Tran",
     "dropoff": "Email for your entry time",
     "dropoffValue": "jo.tran@example.com",
     "ready": "Entry time",
     "readyValue": "9:30 pm",
     "readyError": "Last entry is 8:30 pm. Choose an earlier time.",
     "size": "Visitors",
     "sizes": [
      "1 visitor",
      "2 visitors",
      "3 visitors"
     ],
     "notes": "Access needs",
     "notesHelp": "Seating, step-free entry, an assistance dog.",
     "book": "Book entry",
     "bookWhy": "Choose a time to book."
    },
    "empty": {
     "title": "No visits booked",
     "body": "Entry is free. Book a time and your visit appears here.",
     "cta": "Book entry"
    },
    "dialog": {
     "title": "Cancel this booking?",
     "body": "Your free entry for Thursday 12 November, 6:30 pm, will be released for someone else.",
     "confirm": "Cancel booking",
     "keep": "Keep booking"
    },
    "toast": "Entry booked for 6:30 pm.",
    "alert": "Few places left at 6:30 pm on Thursday.",
    "inline": "Add an access need if you have one.",
    "example": {
     "secondary": "What's on",
     "quiet": "Skip",
     "danger": "Cancel booking",
     "small": "Book",
     "account": "Your visit",
     "checks": [
      "Seating please",
      "Step-free entry",
      "Audio guide"
     ],
     "switches": [
      "Email me my entry time",
      "Tell me about Thursday lates"
     ],
     "radios": [
      "Thursday late",
      "Daytime"
     ],
     "statLabel": "Entry",
     "crumbs": [
      "What's on",
      "Low Light"
     ],
     "tabs": [
      "What's on",
      "Visit",
      "Thursday lates"
     ],
     "links": [
      [
       "What's on",
       "calendar"
      ],
      [
       "Book entry",
       "ticket"
      ],
      [
       "Your visit",
       "clock"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Eleni Marsh",
   "role": "Visitor services",
   "contact": "visit@longroom.example"
  },
  "social": [
   "Free entry. Long looks welcome.",
   "Open late Thursdays.",
   "Ruth Calder, Low Light. Ink and gum on linen, 2026."
  ],
  "signage": "Entrance wall text, vinyl, 1200 x 1800 mm: Free entry. Long looks welcome.",
  "email": {
   "person": "Eleni Marsh",
   "role": "Visitor services"
  },
  "site": {
   "url": "longroom.example"
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@longroom.example"
 },
 "guideB": {
  "rules": [
   {
    "title": "Say free once",
    "body": "Free entry. Long looks welcome. Plainly, beside the button, one time."
   },
   {
    "title": "Spend Vermilion once a screen",
    "body": "Book entry, Change time and errors. Blush is a fill only, never type."
   },
   {
    "title": "Name the work like a label",
    "body": "Name, title, material, date. Bodoni Moda for names, Libre Franklin for what a visitor reads or presses."
   }
  ],
  "email": {
   "to": "Jo Tran",
   "subject": "Your entry time for Low Light",
   "time": "Thu 5 Nov, 9:12 am",
   "body": [
    "Your free entry for Low Light is booked for Thursday 12 November, 6:30 pm.",
    "Gallery 2. Long looks welcome."
   ]
  },
  "notIn": [
   "Colour for print. Ask your printer for a proof before a run.",
   "Photographs. The shots are written as briefs, to be made.",
   "Interface components. They are in the UI kit."
  ]
 }
};

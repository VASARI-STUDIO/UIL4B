// Sample brand data for the export themes.
export default {
 "name": "Margin",
 "slug": "margin",
 "theme": "05-specimen",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Margin is an independent publisher in Perth. It publishes novels and essays, printed in Perth on uncoated paper, and sells them from its own site.",
 "product": "Browse the list, read a book's page, and pre-order a copy that ships the week the book is printed.",
 "audience": "Readers who buy a book to keep and take their time with it.",
 "city": "Perth",
 "lines": {
  "primary": "Books with room to think.",
  "others": [
   "Read slowly. We print slowly.",
   "Pre-orders ship the week the book is printed."
  ]
 },
 "personality": [
  {
   "trait": "Quiet",
   "means": "We say what the book is and stop. No superlatives, no exclamation marks, no must-reads."
  },
  {
   "trait": "Exact",
   "means": "We give the page count, the paper and the date. A pre-order ships the week the book is printed, and the page says so."
  },
  {
   "trait": "Unhurried",
   "means": "We print slowly, so we write slowly. Short paragraphs, one idea at a time, and room around the words."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Describe the book, not the praise",
    "example": "A summer at Lake Clifton, told by the woman who keeps the caravan park's books."
   },
   {
    "title": "Give the exact detail",
    "example": "Anna Brereton. A novel, 248 pages. Ships 14 November."
   },
   {
    "title": "Leave room",
    "example": "Books with room to think."
   },
   {
    "title": "Stay level when it goes wrong",
    "example": "The printer needs another week. Your copy now ships 21 November, and we have emailed you."
   }
  ],
  "writeThis": [
   {
    "write": "A novel, 248 pages. Ships 14 November.",
    "not": "An unmissable new novel, out soon!",
    "because": "A page count and a date tell a reader more than a promise does."
   },
   {
    "write": "Pre-order",
    "not": "Buy now",
    "because": "The button names what happens: you order now and pay when your copy ships."
   },
   {
    "write": "Read slowly. We print slowly.",
    "not": "Lightning-fast turnaround on every title.",
    "because": "We print slowly, and we say so."
   },
   {
    "write": "Use four digits, such as 6000.",
    "not": "Invalid postcode.",
    "because": "Say what a good answer looks like."
   },
   {
    "write": "Prices include GST. Orders ship from Fremantle.",
    "not": "Prices may vary. Shipping costs apply to all orders.",
    "because": "State the fact, plainly."
   }
  ],
  "boilerplate25": "Margin is an independent publisher in Perth. We print slowly, on uncoated paper, and publish novels and essays that need room to be read slowly.",
  "boilerplate50": "Margin is an independent publisher in Perth. We publish novels and essays, print them slowly in Perth on uncoated paper, and ship from Fremantle. Browse the list, read a book's page and pre-order. Your copy ships the week the book is printed. Prices include GST. Books with room to think.",
  "nameRules": "Write Margin with a capital M in running text. Use the wordmark only from the supplied files, never retyped in Goudy Bookletter 1911. Never Margin Books, Margin Press or MB."
 },
 "colours": [
  {
   "id": "plum",
   "name": "Plum",
   "hex": "#6A2C5A",
   "role": "action",
   "lands": "The Pre-order button, links, guide-card tabs and the rule on a cover.",
   "share": 0.08
  },
  {
   "id": "type",
   "name": "Type",
   "hex": "#1C1A17",
   "role": "text",
   "lands": "Text, rules and the wordmark, on Card or White. Never a fill under text.",
   "share": 0.1
  },
  {
   "id": "rod",
   "name": "Rod",
   "hex": "#686C70",
   "role": "quiet text",
   "lands": "Drawer edges, the punched hole, and captions, folios and help text on Card or White.",
   "share": 0.06
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "panel",
   "lands": "A card face lifted off Card: the order summary and a book's details. The label on a Plum button, and the name in the reversed logo.",
   "share": 0.16
  },
  {
   "id": "card",
   "name": "Card",
   "hex": "#F1F1EC",
   "role": "ground",
   "lands": "Every page and every screen.",
   "share": 0.6
  }
 ],
 "tones": [],
 "pairs": [
  {
   "fg": "type",
   "bg": "card",
   "use": "Body text, headlines"
  },
  {
   "fg": "rod",
   "bg": "card",
   "use": "Captions, folios"
  },
  {
   "fg": "plum",
   "bg": "card",
   "use": "Links, the line on a cover"
  },
  {
   "fg": "white",
   "bg": "plum",
   "use": "Pre-order button label"
  },
  {
   "fg": "card",
   "bg": "plum",
   "use": "Reversed text on Plum"
  },
  {
   "fg": "type",
   "bg": "white",
   "use": "Text on panels"
  },
  {
   "fg": "rod",
   "bg": "white",
   "use": "Captions on panels"
  },
  {
   "fg": "plum",
   "bg": "white",
   "use": "Links on panels"
  },
  {
   "fg": "card",
   "bg": "type",
   "use": "Reversed text on Type"
  }
 ],
 "fonts": {
  "display": {
   "family": "Goudy Bookletter 1911",
   "weights": [
    400
   ],
   "file": "GoudyBookletter1911",
   "css": "Goudy+Bookletter+1911"
  },
  "body": {
   "family": "Newsreader",
   "weights": [
    400,
    500,
    600
   ],
   "file": "Newsreader",
   "css": "Newsreader:wght@400;500;600"
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
    "token": "wordmark",
    "size": 88,
    "line": 1,
    "weight": 400,
    "face": "display",
    "use": "The wordmark and covers, one line"
   },
   {
    "token": "headline",
    "size": 44,
    "line": 1.1,
    "weight": 400,
    "face": "display",
    "use": "A page's one big line"
   },
   {
    "token": "title",
    "size": 24,
    "line": 1.2,
    "weight": 400,
    "face": "display",
    "use": "Book and list titles"
   },
   {
    "token": "lead",
    "size": 22,
    "line": 1.36,
    "weight": 500,
    "face": "body",
    "use": "The first sentence of a piece"
   },
   {
    "token": "body",
    "size": 17,
    "line": 1.53,
    "weight": 400,
    "face": "body",
    "use": "Reading text"
   },
   {
    "token": "small",
    "size": 14,
    "line": 1.43,
    "weight": 400,
    "face": "body",
    "use": "Details and notes"
   },
   {
    "token": "caption",
    "size": 12,
    "line": 1.33,
    "weight": 400,
    "face": "body",
    "use": "Notes under a price, and folios"
   }
  ],
  "sample": {
   "headline": "Read slowly. We print slowly.",
   "paragraph": "Salt Lake Summer is printed in Perth on uncoated paper, sewn rather than glued. Pre-order now and pay when your copy ships.",
   "caption": "Prices include GST. Orders ship from Fremantle."
  },
  "rules": [
   {
    "do": "Set Goudy Bookletter 1911 at 24 px and above, in its one weight. Under 24 px, set the same words in Newsreader 500.",
    "dont": "Set Goudy Bookletter 1911 small, or fake a bold."
   },
   {
    "do": "Set headlines in sentence case with no added tracking.",
    "dont": "Set headlines in capitals or letter-space the display face."
   },
   {
    "do": "Use 17 px for reading text on screen and 10 pt in print. Nothing under 12 px.",
    "dont": "Set body copy under 12 px."
   },
   {
    "do": "Use weight and the quiet colour for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or headings in mono."
   }
  ]
 },
 "logo": {
  "idea": "The name sits beside a Plum margin rule, as a margin is ruled on a proof. The rule is a hairline that runs well past the name, above the M and below the g, and stands clear of it, the way a margin line runs the depth of a ruled page.",
  "showcase": {
   "wordmark": "Margin",
   "symbolNote": "The symbol is the M with its margin rule.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#1C1A17",
    "rule": "#6A2C5A",
    "ground": "#F1F1EC"
   },
   "mono-dark": {
    "name": "#1C1A17",
    "rule": "#1C1A17",
    "ground": "#F1F1EC"
   },
   "mono-light": {
    "name": "#F1F1EC",
    "rule": "#F1F1EC",
    "ground": "#1C1A17"
   },
   "reversed": {
    "name": "#FFFFFF",
    "rule": "#F1F1EC",
    "ground": "#6A2C5A"
   },
   "on-white": {
    "name": "#1C1A17",
    "rule": "#6A2C5A",
    "ground": "#FFFFFF"
   }
  },
  "when": {
   "colour": "The default. On Card and White, and on light photos.",
   "mono-dark": "One-colour printing, stamps and blind embossing. On light grounds that cannot carry Plum.",
   "mono-light": "On photos and dark grounds that cannot carry Plum.",
   "reversed": "On Plum. White name, Card rule.",
   "horizontal": "Headers, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, spines and bag tags.",
   "symbol": "Where the name is already nearby: favicon, stamp, social avatar."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Books as objects and reading as an act: a cover held in two hands, a stack on a desk, sheets at the press. Hands and rooms, not faces.",
   "light": "Daylight from a window, soft and from one side. No flash, no ring light.",
   "crop": "Close and still, with an empty margin on one side for a line of type.",
   "colour": "Natural colour. Paper stays cream and ink stays dark. Plum appears only where it is printed, never added in editing.",
   "people": "Our authors and readers as they are while reading or working. Hands and shoulders; no posed author portraits."
  },
  "shots": [
   {
    "id": "cover",
    "slot": "The cover: a hardback lying closed on a bare oak table, shot from above and a little left. Crop tight to the book, with a margin of table on the right. Soft window light from the left."
   },
   {
    "id": "press",
    "slot": "The press: sheets coming off the folding machine, close on the paper edge. Flat daylight, no flash."
   },
   {
    "id": "spread",
    "slot": "The spread: an open book with a hand holding the gutter. Close crop, shallow focus on the text. Morning light from a window."
   },
   {
    "id": "desk",
    "slot": "The desk: a manuscript with pencil marks beside a mug. Wide crop with the desk edge filling the lower third. Overcast light."
   },
   {
    "id": "parcel",
    "slot": "The parcel: a pre-order copy wrapped in brown paper on a doorstep. Side-on at knee height, wide enough to show the step. Late afternoon light."
   },
   {
    "id": "shelf",
    "slot": "The shelf: a run of spines on a wooden shelf, shot straight on. Even light, cropped to three or four spines."
   }
  ],
  "rules": [
   {
    "do": "Show the book being held, read or made.",
    "dont": "Pose a stack of books against a plain studio wall."
   },
   {
    "do": "Let Plum come from the printed cover.",
    "dont": "Tint the photo purple or add a colour wash."
   },
   {
    "do": "Crop close and leave a margin for one line of type.",
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
  "gutter": 16,
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
   "book-open",
   "bookmark",
   "calendar",
   "shopping-bag",
   "package",
   "mail",
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
    "weight": 500,
    "face": "body",
    "use": "Card and dialog titles"
   },
   {
    "token": "title",
    "size": 26,
    "line": 30,
    "weight": 400,
    "face": "display",
    "use": "Screen titles and book titles"
   },
   {
    "token": "headline",
    "size": 36,
    "line": 40,
    "weight": 400,
    "face": "display",
    "use": "Empty states and first-run"
   }
  ],
  "light": {
   "surface": "#F1F1EC",
   "raised": "#FFFFFF",
   "sunken": "#E6E7E2",
   "text": "#1C1A17",
   "textSoft": "#1C1A17",
   "quiet": "#686C70",
   "quietOnSunken": "#5E6266",
   "border": "#1C1A17",
   "divider": "#D9DAD5",
   "action": "#6A2C5A",
   "actionHover": "#6A2C5A",
   "actionPressed": "#55234A",
   "actionLabel": "#FFFFFF",
   "focus": "#1C1A17",
   "disabledBg": "#E6E7E2",
   "disabledText": "#5E6266",
   "scrim": "#1C1A17",
   "success": {
    "fg": "#2D5A3B",
    "bg": "#E1EBD9"
   },
   "warning": {
    "fg": "#7A4B00",
    "bg": "#F5E6C4"
   },
   "danger": {
    "fg": "#8F2A1E",
    "bg": "#F4DDD4"
   },
   "info": {
    "fg": "#2E4F73",
    "bg": "#E0E8F0"
   },
   "neutral": {
    "fg": "#1C1A17",
    "bg": "#E6E7E2"
   }
  },
  "dark": {
   "surface": "#1C1A17",
   "raised": "#282622",
   "sunken": "#141311",
   "text": "#F1F1EC",
   "textSoft": "#D6D7D2",
   "quiet": "#A4A8AC",
   "quietOnSunken": "#A4A8AC",
   "border": "#8E9296",
   "divider": "#3A3936",
   "action": "#D6A3C8",
   "actionHover": "#E0B4D3",
   "actionPressed": "#C48FB5",
   "actionLabel": "#1C1A17",
   "focus": "#F1F1EC",
   "disabledBg": "#2A2825",
   "disabledText": "#A4A8AC",
   "scrim": "#141311",
   "success": {
    "fg": "#9CCB9F",
    "bg": "#1F2D21"
   },
   "warning": {
    "fg": "#E3B45E",
    "bg": "#33260E"
   },
   "danger": {
    "fg": "#F0A090",
    "bg": "#3A1A15"
   },
   "info": {
    "fg": "#9FBFE3",
    "bg": "#1A2838"
   },
   "neutral": {
    "fg": "#F1F1EC",
    "bg": "#282622"
   }
  },
  "status": [
   {
    "id": "pre-order",
    "label": "Pre-order",
    "tone": "action"
   },
   {
    "id": "in-print",
    "label": "In print",
    "tone": "neutral"
   },
   {
    "id": "reprinting",
    "label": "Reprinting",
    "tone": "info"
   },
   {
    "id": "out-of-print",
    "label": "Out of print",
    "tone": "warning"
   }
  ],
  "elevationNote": "Margin draws rules, not shadows. A card face steps from Card to White, and anything that floats gets a 1 px Type edge.",
  "screen": {
   "title": "A book page",
   "content": {
    "time": "10:44",
    "status": "Pre-order",
    "eta": "Ships 14 November",
    "pickup": "Printed in Perth on uncoated paper, sewn rather than glued.",
    "from": "Printing",
    "to": "Ships 14 Nov",
    "progress": 0.6,
    "rider": "Anna Brereton",
    "initials": "AB",
    "riderNote": "A novel, 248 pages",
    "call": "Read chapter one",
    "deliverToLabel": "Format",
    "deliverTo": "Paperback",
    "paidLabel": "Price",
    "paid": "$32.95",
    "share": "Share this book",
    "deliveries": [
     {
      "to": "Salt Lake Summer",
      "when": "Anna Brereton. A novel, ships 14 November",
      "price": "$32.95",
      "status": "pre-order"
     },
     {
      "to": "A Fremantle Year",
      "when": "Joel Hardy. Essays, 192 pages",
      "price": "$29.95",
      "status": "in-print"
     },
     {
      "to": "The Quiet Hours",
      "when": "Ines Calderwood. Back in print in January",
      "price": "$34.95",
      "status": "reprinting"
     },
     {
      "to": "Wheatbelt Letters",
      "when": "Ruth Sampson. Letters, 176 pages",
      "price": "$27.95",
      "status": "out-of-print"
     }
    ],
    "form": {
     "title": "Pre-order",
     "pickup": "Name on the order",
     "pickupValue": "Tom Reilly",
     "dropoff": "Deliver to",
     "dropoffValue": "14 Hampden Road, Nedlands",
     "ready": "Postcode",
     "readyValue": "61",
     "readyError": "Use four digits, such as 6000.",
     "size": "Format",
     "sizes": [
      "Paperback",
      "Hardback"
     ],
     "notes": "Gift note",
     "notesHelp": "Optional. We print it on a card.",
     "book": "Pre-order",
     "bookWhy": "Add a postcode to pre-order."
    },
    "empty": {
     "title": "Nothing on your order",
     "body": "Browse the list and pre-order a book. It ships the week it is printed.",
     "cta": "Browse the list"
    },
    "dialog": {
     "title": "Cancel this pre-order?",
     "body": "You have not been charged. You pay when your copy ships, so you can cancel until then.",
     "confirm": "Cancel pre-order",
     "keep": "Keep pre-order"
    },
    "toast": "Pre-order placed for Salt Lake Summer.",
    "alert": "The printer needs another week. Salt Lake Summer now ships 21 November.",
    "inline": "Add a second book and both ship together, on the later of the two dates.",
    "example": {
     "secondary": "Read chapter one",
     "quiet": "Skip",
     "danger": "Cancel pre-order",
     "small": "Add",
     "account": "Account",
     "checks": [
      "Include a gift note",
      "Ship with my other order",
      "Email me the week before"
     ],
     "switches": [
      "Email me when it ships",
      "Email receipts"
     ],
     "radios": [
      "Paperback",
      "Hardback"
     ],
     "statLabel": "Price",
     "crumbs": [
      "The list",
      "Novels"
     ],
     "tabs": [
      "The list",
      "Forthcoming",
      "Your order"
     ],
     "links": [
      [
       "The list",
       "book-open"
      ],
      [
       "Forthcoming",
       "calendar"
      ],
      [
       "Your order",
       "shopping-bag"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Hannah Doyle",
   "role": "Managing editor",
   "contact": "hannah@margin.example"
  },
  "social": [
   "Books with room to think.",
   "Read slowly. We print slowly.",
   "Pre-orders ship the week the book is printed."
  ],
  "signage": "Shop window sign, 594 x 841 mm: Read slowly. We print slowly.",
  "email": {
   "person": "Hannah Doyle",
   "role": "Managing editor"
  },
  "site": {
   "url": "margin.example"
  }
 },
 "guideB": {
  "studioSlot": "A stack of books against a plain studio wall. Flat light, no desk, no hands.",
  "rules": [
   {
    "title": "Give the exact detail",
    "text": "Every book page says its page count, its paper and its date. A pre-order ships the week the book is printed, and the page says so."
   },
   {
    "title": "Keep Plum for what is printed",
    "text": "Most of every page is Card. Plum is the Pre-order button, links, and the rule on a cover."
   },
   {
    "title": "Leave room",
    "text": "Crop close and keep a margin for one line of type. Short paragraphs, one idea at a time."
   }
  ],
  "email": {
   "to": "Tom Reilly",
   "subject": "Your pre-order for Salt Lake Summer",
   "time": "10:44",
   "body": [
    "Hi Tom,",
    "Thanks for pre-ordering Salt Lake Summer. It is printed in Perth on uncoated paper, and your copy ships 14 November. You pay when it ships."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@margin.example"
 }
};

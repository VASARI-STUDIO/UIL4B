// Sample brand data for the export themes.
export default {
 "name": "Offcut",
 "slug": "offcut",
 "theme": "06-studio",
 "version": {
  "number": "1.0",
  "date": "2026-11-01"
 },
 "description": "Offcut is invoicing for tradies in Geelong. You write the quote on site, send it from the ute, and turn it into an invoice with one tap.",
 "product": "Write a quote on site, turn it into an invoice with one tap, and see who has paid.",
 "audience": "Tradies in and around Geelong: plumbers, sparkies, chippies and painters who quote from the ute and would rather not do paperwork at night.",
 "city": "Geelong",
 "lines": {
  "primary": "Quote on site. Paid by Friday.",
  "others": [
   "One tap, one invoice."
  ]
 },
 "personality": [
  {
   "trait": "Plain",
   "means": "We write the way a tradie talks on site. Short words, no jargon, nothing you would have to read twice."
  },
  {
   "trait": "Exact",
   "means": "Every message has the dollars and the days in it. $286.00, 6 days late, never 'overdue' on its own."
  },
  {
   "trait": "Quick",
   "means": "One tap does the next thing. Buttons name that thing: Send quote, Send invoice, Mark paid."
  }
 ],
 "voice": {
  "principles": [
   {
    "title": "Dollars first, then who",
    "example": "Paid. $1,452.00 from Dan Pearce."
   },
   {
    "title": "Count the days",
    "example": "$286.00, 6 days late"
   },
   {
    "title": "Say what happened, and give a way back",
    "example": "Quote sent to Dan. Undo"
   },
   {
    "title": "Say it the way you would on site",
    "example": "Quote on site. Paid by Friday."
   }
  ],
  "writeThis": [
   {
    "write": "Paid. $1,452.00 from Dan Pearce.",
    "not": "Payment received successfully.",
    "because": "Dollars first, then who."
   },
   {
    "write": "$286.00, 6 days late",
    "not": "Your invoice is overdue.",
    "because": "A number gets action. Overdue on its own does not."
   },
   {
    "write": "Send quote",
    "not": "Submit",
    "because": "A button names what happens when you press it."
   },
   {
    "write": "Add Dan's email or mobile so the quote can go today.",
    "not": "Invalid input.",
    "because": "Say what to do next."
   },
   {
    "write": "One tap, one invoice.",
    "not": "A seamless end-to-end invoicing solution.",
    "because": "Say it the way you would on site."
   }
  ],
  "boilerplate25": "Offcut is invoicing for tradies in Geelong. Quote on site, turn it into an invoice with one tap, and see who has paid and when.",
  "boilerplate50": "Offcut is invoicing for tradies in Geelong. You write the quote on site, send it to the client from your phone, and turn it into an invoice with one tap. Then you see who has paid and who is late, in dollars and days. Quote on site. Paid by Friday.",
  "nameRules": "Write Offcut with a capital O and lower case after it. The wordmark is drawn, never typed. Never OFFCUT, OffCut, Offcut App or Offcut Invoicing."
 },
 "colours": [
  {
   "id": "toolbox",
   "name": "Toolbox",
   "hex": "#D7263D",
   "role": "action",
   "lands": "One button a screen, like New invoice, and the wedge in the logo. As text, on White only.",
   "share": 0.1
  },
  {
   "id": "ink",
   "name": "Ink",
   "hex": "#16181D",
   "role": "text",
   "lands": "All text. Focus rings. The hover on Send.",
   "share": 0.15
  },
  {
   "id": "steel",
   "name": "Steel",
   "hex": "#E7E9EC",
   "role": "panel",
   "lands": "The app ground behind every card. Disabled buttons.",
   "share": 0.2
  },
  {
   "id": "white",
   "name": "White",
   "hex": "#FFFFFF",
   "role": "ground",
   "lands": "Cards, inputs, and the quote and invoice your client opens.",
   "share": 0.55
  }
 ],
 "tones": [
  {
   "id": "soft",
   "name": "Soft Ink",
   "hex": "#3A3F48",
   "role": "reading text",
   "lands": "Paragraphs on White and Steel."
  },
  {
   "id": "quiet",
   "name": "Quiet Ink",
   "hex": "#555A63",
   "role": "quiet text",
   "lands": "Captions, folios and help text on White and Steel."
  }
 ],
 "pairs": [
  {
   "fg": "ink",
   "bg": "white",
   "use": "Body text, headlines"
  },
  {
   "fg": "soft",
   "bg": "white",
   "use": "Paragraphs"
  },
  {
   "fg": "quiet",
   "bg": "white",
   "use": "Captions, folios"
  },
  {
   "fg": "ink",
   "bg": "steel",
   "use": "Text on the app ground"
  },
  {
   "fg": "soft",
   "bg": "steel",
   "use": "Paragraphs on Steel"
  },
  {
   "fg": "quiet",
   "bg": "steel",
   "use": "Captions on Steel"
  },
  {
   "fg": "white",
   "bg": "toolbox",
   "use": "Button labels"
  },
  {
   "fg": "toolbox",
   "bg": "white",
   "use": "Links and errors on White"
  },
  {
   "fg": "white",
   "bg": "ink",
   "use": "Reversed text, toasts"
  },
  {
   "fg": "toolbox",
   "bg": "ink",
   "use": "Wedge on Ink, large type only",
   "minSize": 24
  }
 ],
 "fonts": {
  "display": {
   "family": "Unbounded",
   "weights": [
    600,
    700
   ],
   "file": "Unbounded",
   "css": "Unbounded:wght@600;700"
  },
  "body": {
   "family": "Onest",
   "weights": [
    400,
    500,
    600
   ],
   "file": "Onest",
   "css": "Onest:wght@400;500;600"
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
    "size": 58,
    "line": 1.08,
    "weight": 700,
    "face": "display",
    "use": "The brand line, two lines"
   },
   {
    "token": "headline",
    "size": 44,
    "line": 1,
    "weight": 700,
    "face": "display",
    "use": "Totals and a page's one big number"
   },
   {
    "token": "title",
    "size": 26,
    "line": 1.15,
    "weight": 700,
    "face": "display",
    "use": "Screen and card titles"
   },
   {
    "token": "subtitle",
    "size": 18,
    "line": 1.2,
    "weight": 700,
    "face": "display",
    "use": "Smallest display size"
   },
   {
    "token": "body",
    "size": 16,
    "line": 1.5,
    "weight": 400,
    "face": "body",
    "use": "Everything you read and tap"
   },
   {
    "token": "label",
    "size": 14,
    "line": 1.4,
    "weight": 500,
    "face": "body",
    "use": "Field labels, status words, row detail"
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
   "headline": "Quote on site. Paid by Friday.",
   "paragraph": "Write the quote on site, send it from the ute, and turn it into an invoice with one tap. Dan Pearce sees $1,452.00 and a due date of Friday 6 November. You see the same, and the days if it runs late.",
   "caption": "Hot water unit for Dan Pearce. Due Fri 6 Nov."
  },
  "rules": [
   {
    "do": "Use Unbounded for headlines, totals and the wordmark, at 18 px or larger.",
    "dont": "Set Unbounded small, or for body text."
   },
   {
    "do": "Set amounts with tabular figures so columns line up.",
    "dont": "Let digits jump as amounts change."
   },
   {
    "do": "Use sentence case everywhere except the drawn wordmark.",
    "dont": "Set headlines or buttons in capitals."
   },
   {
    "do": "Use weight and the quiet Ink for secondary text.",
    "dont": "Fade text with opacity."
   },
   {
    "do": "Use the mono face for a hex, a token or a code string only.",
    "dont": "Set labels or amounts in mono."
   }
  ]
 },
 "logo": {
  "idea": "The mark is an offcut: a length of board with its end sawn off at 45 degrees. The board is as tall as the name's own x and sits on its baseline, and the sawn-off wedge is the only Toolbox in the logo.",
  "showcase": {
   "wordmark": "Offcut",
   "symbolNote": "The symbol is the board on its own, with its Toolbox wedge.",
   "minScreenPx": 96,
   "minPrintMm": 24
  },
  "colourways": {
   "colour": {
    "name": "#16181D",
    "cut": "#D7263D",
    "ground": "#FFFFFF"
   },
   "mono-dark": {
    "name": "#16181D",
    "cut": "#16181D",
    "ground": "#FFFFFF"
   },
   "mono-light": {
    "name": "#FFFFFF",
    "cut": "#FFFFFF",
    "ground": "#16181D"
   },
   "reversed": {
    "name": "#FFFFFF",
    "cut": "#D7263D",
    "ground": "#16181D"
   },
   "on-toolbox": {
    "name": "#FFFFFF",
    "cut": "#FFFFFF",
    "ground": "#D7263D"
   },
   "on-steel": {
    "name": "#16181D",
    "cut": "#D7263D",
    "ground": "#E7E9EC"
   }
  },
  "when": {
   "colour": "The default. On White and on light photos.",
   "mono-dark": "One colour printing, stamps and invoices printed in black. On light grounds that cannot carry Toolbox.",
   "mono-light": "On photos and dark grounds that cannot carry the wedge.",
   "reversed": "On Ink. White name, Toolbox wedge.",
   "horizontal": "App bars, email signatures and wide, short spaces.",
   "stacked": "Squarer spaces: profile images, ute doors, sign posts.",
   "symbol": "Where the name is already nearby: app icon, favicon, stamp."
  }
 },
 "imagery": {
  "direction": {
   "subject": "Tradies at work on site: a plumber under a sink, a sparkie at a switchboard, a painter on a ladder. The job is the subject, and the phone is in a hand, not the hero.",
   "light": "Daylight on site, or the ute cab at the end of a job. No studio, no flash.",
   "crop": "Wide enough to see the job, close on hands and tools when the detail matters. Leave room on one side for a line of type.",
   "colour": "Natural colour. Toolbox appears because it is on a tool, the ute or a sign, never added in editing.",
   "people": "Local tradies in work gear, doing the job. No stock smiles, no clean-shirt handshakes."
  },
  "shots": [
   {
    "id": "undersink",
    "slot": "The job: a plumber under a kitchen sink, shot from the cupboard door. Crop to the hands and the wrench. Daylight from the window behind."
   },
   {
    "id": "switchboard",
    "slot": "The check: a sparkie at an open switchboard, shot side-on. Close crop on the hand and the tester. Flat overcast light from the doorway."
   },
   {
    "id": "ladder",
    "slot": "The height: a painter on a ladder against a weatherboard wall, seen from the ground. Wide crop with the sky in the top third. Morning light."
   },
   {
    "id": "ute",
    "slot": "The ute: the cab door open on a driveway, a phone on the dash showing a quote. Crop to the door and the dash. Late afternoon light."
   },
   {
    "id": "handover",
    "slot": "The handover: a tradie and a homeowner at the front door looking at a phone together. Crop at waist height, hands and phone. Overcast daylight."
   },
   {
    "id": "tools",
    "slot": "The kit: a tool bag open on a tray in the back of a ute. Close crop, flat light, the street soft behind."
   }
  ],
  "rules": [
   {
    "do": "Show the work being done, with the site around it.",
    "dont": "Pose people in clean shirts against a plain wall."
   },
   {
    "do": "Let Toolbox come from a tool, the ute or a sign.",
    "dont": "Tint the photo red or add a colour wash."
   },
   {
    "do": "Crop wide enough to see the job and leave room for one line.",
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
  "columns": 12,
  "gutter": 14,
  "base": 4
 },
 "ui": {
  "rowIcon": "wrench",
  "radius": {
   "control": 8,
   "card": 14
  },
  "border": 1.5,
  "spacingBase": 4,
  "shadows": "none",
  "houseRoles": [
   "warning"
  ],
  "icons": [
   "file-text",
   "send",
   "dollar-sign",
   "clock",
   "calendar",
   "user",
   "hammer",
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
  "light": {
   "surface": "#FFFFFF",
   "raised": "#F4F5F7",
   "sunken": "#E7E9EC",
   "text": "#16181D",
   "textSoft": "#3A3F48",
   "quiet": "#555A63",
   "quietOnSunken": "#555A63",
   "border": "#555A63",
   "divider": "#E1E4E8",
   "action": "#D7263D",
   "actionHover": "#16181D",
   "actionPressed": "#0B0C0F",
   "actionLabel": "#FFFFFF",
   "focus": "#16181D",
   "disabledBg": "#E7E9EC",
   "disabledText": "#555A63",
   "scrim": "#16181D",
   "success": {
    "fg": "#1E6B45",
    "bg": "#E7F2EC"
   },
   "warning": {
    "fg": "#7A5200",
    "bg": "#FBF0D9"
   },
   "danger": {
    "fg": "#B42318",
    "bg": "#FCEBEA"
   },
   "info": {
    "fg": "#2B5A8A",
    "bg": "#E9F0F8"
   },
   "neutral": {
    "fg": "#16181D",
    "bg": "#E7E9EC"
   }
  },
  "dark": {
   "surface": "#16181D",
   "raised": "#1F2229",
   "sunken": "#0F1115",
   "text": "#F4F5F7",
   "textSoft": "#D3D7DD",
   "quiet": "#A5ABB5",
   "quietOnSunken": "#A5ABB5",
   "border": "#8A909B",
   "divider": "#2D313A",
   "action": "#D7263D",
   "actionHover": "#3A3F4A",
   "actionPressed": "#4A505C",
   "actionLabel": "#FFFFFF",
   "focus": "#FFFFFF",
   "disabledBg": "#2A2D34",
   "disabledText": "#A5ABB5",
   "scrim": "#0A0B0E",
   "success": {
    "fg": "#7FD1A5",
    "bg": "#12301F"
   },
   "warning": {
    "fg": "#E8B65A",
    "bg": "#33260A"
   },
   "danger": {
    "fg": "#FF8A80",
    "bg": "#3A1517"
   },
   "info": {
    "fg": "#8DB7E8",
    "bg": "#13263B"
   },
   "neutral": {
    "fg": "#F4F5F7",
    "bg": "#2A2D34"
   }
  },
  "status": [
   {
    "id": "draft",
    "label": "Draft",
    "tone": "neutral"
   },
   {
    "id": "sent",
    "label": "Sent",
    "tone": "info"
   },
   {
    "id": "overdue",
    "label": "Overdue 6 days",
    "tone": "danger"
   },
   {
    "id": "paid",
    "label": "Paid Fri 30 Oct",
    "tone": "success"
   }
  ],
  "elevationNote": "Offcut draws edges, not shadows. Grounds step from White to Steel, and anything that floats gets a 1.5 px Ink edge.",
  "screen": {
   "title": "New quote",
   "content": {
    "time": "10:44",
    "status": "Sent",
    "eta": "Due Fri 6 Nov",
    "pickup": "Quote Q-0412 sent to Dan Pearce at 10:44.",
    "from": "Quote",
    "to": "Paid",
    "progress": 0.6,
    "rider": "Dan Pearce, hot water unit",
    "initials": "DP",
    "riderNote": "$1,452.00, due Fri 6 Nov",
    "call": "Call",
    "deliverToLabel": "Client",
    "deliverTo": "Dan Pearce",
    "paidLabel": "Total",
    "paid": "$1,452.00",
    "share": "Share the quote link",
    "deliveries": [
     {
      "to": "Mel Oakley",
      "when": "Downpipes, not sent yet",
      "price": "$620.00",
      "status": "draft"
     },
     {
      "to": "Dan Pearce",
      "when": "Hot water unit, due Fri 6 Nov",
      "price": "$1,452.00",
      "status": "sent"
     },
     {
      "to": "Kerry Lam",
      "when": "Bathroom tap, due Mon 26 Oct",
      "price": "$286.00",
      "status": "overdue"
     },
     {
      "to": "Sam Whitty",
      "when": "Switchboard check",
      "price": "$410.00",
      "status": "paid"
     },
     {
      "to": "Ben Tran",
      "when": "Fence panels, due Wed 11 Nov",
      "price": "$780.00",
      "status": "sent"
     }
    ],
    "form": {
     "title": "New quote",
     "pickup": "Client",
     "pickupValue": "Dan Pearce",
     "dropoff": "Job",
     "dropoffValue": "Replace hot water unit",
     "ready": "Client email",
     "readyValue": "",
     "readyError": "Add Dan's email or mobile so the quote can go today.",
     "size": "Send as",
     "sizes": [
      "Quote",
      "Invoice",
      "Deposit"
     ],
     "notes": "Note for the client",
     "notesHelp": "Site address, access, or when you can start.",
     "book": "Send quote",
     "bookWhy": "Add a client email or mobile to send."
    },
    "empty": {
     "title": "No invoices yet",
     "body": "Quote on site and turn it into an invoice with one tap.",
     "cta": "New quote"
    },
    "dialog": {
     "title": "Delete this draft?",
     "body": "Mel Oakley's draft for $620.00 has not been sent. Deleting it cannot be undone.",
     "confirm": "Delete draft",
     "keep": "Keep draft"
    },
    "toast": "Quote sent to Dan.",
    "alert": "Kerry Lam's invoice is 6 days late. Send a reminder.",
    "inline": "Add the job address if Dan has more than one site.",
    "example": {
     "secondary": "Preview",
     "quiet": "Skip",
     "danger": "Delete draft",
     "small": "Add",
     "account": "Business",
     "checks": [
      "Include GST",
      "Send me a copy",
      "Add a deposit"
     ],
     "switches": [
      "Remind Dan when it is late",
      "Email receipts"
     ],
     "radios": [
      "Quote",
      "Invoice"
     ],
     "statLabel": "Total",
     "crumbs": [
      "Invoices",
      "Open"
     ],
     "tabs": [
      "All",
      "Sent",
      "Overdue"
     ],
     "links": [
      [
       "Quotes",
       "file-text"
      ],
      [
       "Invoices",
       "dollar-sign"
      ],
      [
       "Clients",
       "user"
      ]
     ]
    }
   }
  }
 },
 "applications": {
  "card": {
   "person": "Jess Hartley",
   "role": "Customer support",
   "contact": "jess@offcut.example"
  },
  "social": [
   "Quote on site. Paid by Friday.",
   "One tap, one invoice.",
   "Paid. $1,452.00 from Dan Pearce."
  ],
  "signage": "Ute door sign, 1200 x 500 mm: Quote on site. Paid by Friday.",
  "email": {
   "person": "Jess Hartley",
   "role": "Customer support"
  },
  "site": {
   "url": "offcut.example"
  }
 },
 "guideB": {
  "studioSlot": "A tradie posed in a clean shirt against a plain wall. Flat light, no site.",
  "rules": [
   {
    "title": "Dollars and days",
    "text": "Every message has the amount and the day in it. $286.00, 6 days late."
   },
   {
    "title": "One Toolbox a screen",
    "text": "Most of every screen is White and Steel. Toolbox is the one button, and the wedge in the logo."
   },
   {
    "title": "Show the work",
    "text": "Wide enough to see the job, with the site around it. Toolbox comes from the tool or the ute."
   }
  ],
  "email": {
   "to": "Dan Pearce",
   "subject": "Quote Q-0412 for $1,452.00",
   "time": "10:44",
   "body": [
    "Hi Dan,",
    "Your quote for the hot water unit is attached. It comes to $1,452.00 including GST, and it is open until Friday 6 November."
   ]
  }
 },
 "contact": {
  "owner": "Brand team",
  "email": "brand@offcut.example"
 }
};

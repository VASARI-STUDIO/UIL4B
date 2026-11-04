// Tidewell: the copy of the Landing view. Bookkeeping for Australian sole
// traders, a hero with a price card and a receipt it has matched. Plain data, no
// React, so a test can read the words without a DOM.
//
// Every string is printed in the pair's two colours at a fixed size: 48px hero
// heading, 40px price, 20px bold wordmark, 18px sub, 15px nav and feature text,
// 14px buttons, 12px helper and receipt text. Nothing here claims a figure about
// a market: the one number that is the product's own sample data is the receipt.

export const BRAND = 'Tidewell'

export const NAV = { links: ['Pricing', 'How it works', 'Sign in'], start: 'Start free' }

export const HERO = {
  heading: 'Your BAS, done before Friday.',
  sub: 'Tidewell sorts your bank feed into GST categories as it lands, so the quarter is ready when you are.',
  cta: 'Start free trial',
  link: 'See how it works',
  help: '30 days free. No card needed.',
}

export const PLAN = {
  name: 'Sole trader',
  price: '$19',
  per: '/month, GST included',
  features: ['Live feeds from your bank accounts', 'BAS worksheet, ready to lodge', 'Receipts matched by photo'],
  choose: 'Choose Sole trader',
  fine: 'Prices in AUD.',
}

// One receipt Tidewell has matched to a bank line. 86.40 is 7.85 of GST (a
// eleventh) and 78.55 before it.
export const RECEIPT = {
  store: 'Officeworks',
  date: 'Tue 14 Oct',
  lines: [['A4 paper', '$38.50'], ['Toner', '$47.90']],
  total: ['Total', '$86.40'],
  gst: 'GST $7.85',
  badge: 'Matched to bank',
}

import { refundCancellationPolicy } from './policies'

// Content for the footer's info pages, rendered by pages/InfoPage.tsx at
// /info/:slug. Each section is a heading plus paragraphs, an optional bullet
// list, and an optional table (used by the size guide).
export interface InfoSection {
  heading?: string
  body?: string[]
  bullets?: string[]
  table?: { columns: string[]; rows: string[][] }
}

export interface InfoLink {
  label: string
  to: string
}

export interface InfoPageContent {
  eyebrow: string
  title: string
  subtitle: string
  sections: InfoSection[]
  links?: InfoLink[]
}

export const SUPPORT_EMAIL = 'support@rhayzkicks.ph'
export const SUPPORT_PHONE = '+63 2 8888 0000'

export const infoPages: Record<string, InfoPageContent> = {
  'size-guide': {
    eyebrow: 'Resources',
    title: 'Shoe Size Guide',
    subtitle: 'Find your fit before you order.',
    sections: [
      {
        heading: 'How to measure',
        bullets: [
          'Stand on a sheet of paper with your heel against a wall.',
          'Mark the tip of your longest toe, then measure from the wall to the mark in centimetres.',
          'Measure both feet and use the longer one. Measure in the evening, when feet are at their largest.',
          'Between two sizes? Go half a size up.',
        ],
      },
      {
        heading: "Men's / unisex",
        table: {
          columns: ['US', 'UK', 'EU', 'Foot length (cm)'],
          rows: [
            ['6', '5.5', '38.5', '24'],
            ['7', '6', '40', '25'],
            ['8', '7', '41', '26'],
            ['9', '8', '42.5', '27'],
            ['10', '9', '44', '28'],
            ['11', '10', '45', '29'],
            ['12', '11', '46', '30'],
          ],
        },
      },
      {
        heading: "Women's",
        table: {
          columns: ['US', 'UK', 'EU', 'Foot length (cm)'],
          rows: [
            ['5', '2.5', '35.5', '22'],
            ['6', '3.5', '36.5', '23'],
            ['7', '4.5', '38', '24'],
            ['8', '5.5', '39', '25'],
            ['9', '6.5', '40.5', '26'],
            ['10', '7.5', '42', '27'],
          ],
        },
      },
      {
        body: ['Fit can vary slightly between brands and models. Still unsure? Visit the store to try a pair on, or contact us and we’ll help.'],
      },
    ],
    links: [{ label: 'Contact Us', to: '/help#contact' }],
  },

  'student-discounts': {
    eyebrow: 'Resources',
    title: 'Student Discounts',
    subtitle: 'Perks for students shopping with Rhayz Kicks.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Visit the Rhayz Kicks store and bring a valid school ID.',
          'Ask our staff about current student offers before you pay.',
          'Student offers are applied at the counter and can’t be combined with other promos unless stated.',
        ],
      },
      {
        heading: 'Earn while you shop',
        body: ['Sign up for a free Rhayz Kicks account to earn loyalty points on every purchase and redeem them for vouchers.'],
      },
    ],
    links: [{ label: 'Become a Member', to: '/join' }],
  },

  feedback: {
    eyebrow: 'Resources',
    title: 'Site Feedback',
    subtitle: 'Tell us what’s working and what isn’t.',
    sections: [
      {
        body: [
          'Found a bug, a broken link, or something confusing? Have an idea that would make shopping easier? We read every message.',
          `Email us at ${SUPPORT_EMAIL} with the page you were on and what happened. Screenshots help a lot.`,
        ],
      },
    ],
    links: [{ label: 'Email Feedback', to: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Site feedback')}` }],
  },

  delivery: {
    eyebrow: 'Help',
    title: 'Delivery Info',
    subtitle: 'How and when your order gets to you.',
    sections: [
      {
        heading: 'Delivery times',
        bullets: [
          'Metro Manila: 3–5 business days.',
          'Provincial addresses: 5–7 business days.',
          'Free standard delivery on all orders, no minimum spend.',
        ],
      },
      {
        heading: 'Tracking your order',
        body: ['Every online order shows its progress — confirmed, packed, picked up by the courier, and received — under My Account → My Orders.'],
      },
      {
        heading: 'Changing your address',
        body: ['Contact us as soon as possible after ordering. We can update the address only before your order has been packed.'],
      },
    ],
    links: [
      { label: 'Track My Orders', to: '/account?tab=orders' },
      { label: 'Contact Us', to: '/help#contact' },
    ],
  },

  returns: {
    eyebrow: 'Help',
    title: 'Returns & Exchanges',
    subtitle: refundCancellationPolicy.summary,
    sections: [
      ...refundCancellationPolicy.sections.map((s) => ({ heading: s.heading, body: s.body })),
      {
        heading: 'Wrong size or a problem with your item?',
        body: ['Contact us before your order is packed and we’ll do our best to sort it out. Have your order number ready.'],
      },
    ],
    links: [
      { label: 'My Orders', to: '/account?tab=orders' },
      { label: 'Contact Us', to: '/help#contact' },
    ],
  },

  about: {
    eyebrow: 'Company',
    title: 'About Rhayz Kicks',
    subtitle: 'Footwear & apparel — Philippines.',
    sections: [
      {
        body: [
          'Rhayz Kicks is a Philippine sneaker and apparel store for people who live in their shoes — on the court, on the road, and on the street.',
          'We stock authentic pairs across running, basketball, lifestyle, and training, and we drop limited releases every week for our members.',
        ],
      },
      {
        heading: 'What we stand for',
        bullets: [
          '100% authentic products, every time.',
          'Real people helping you find the right fit, in store and online.',
          'Rewarding the community that keeps coming back, through our loyalty program.',
        ],
      },
    ],
    links: [
      { label: 'Shop New Releases', to: '/' },
      { label: 'Become a Member', to: '/join' },
    ],
  },

  news: {
    eyebrow: 'Company',
    title: 'News & Press',
    subtitle: 'Drops, announcements, and press enquiries.',
    sections: [
      {
        heading: 'Latest drops',
        body: ['New releases and limited drops are announced on the homepage first. Members get early access.'],
      },
      {
        heading: 'Press enquiries',
        body: [`For interviews, features, or media assets, email ${SUPPORT_EMAIL} with “Press” in the subject line.`],
      },
    ],
    links: [
      { label: 'See New Releases', to: '/' },
      { label: 'Email Press Team', to: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Press enquiry')}` },
    ],
  },

  careers: {
    eyebrow: 'Company',
    title: 'Careers',
    subtitle: 'Love sneakers? Work with us.',
    sections: [
      {
        body: [
          'We’re always glad to hear from people who know the culture and love helping customers find the right pair — on the sales floor, in the stockroom, or behind the scenes.',
          `Send your CV and a short note about yourself to ${SUPPORT_EMAIL} with “Careers” in the subject line. We’ll reach out when a role that fits opens up.`,
        ],
      },
    ],
    links: [{ label: 'Send Your CV', to: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Careers')}` }],
  },

  investors: {
    eyebrow: 'Company',
    title: 'Investors',
    subtitle: 'Business and partnership enquiries.',
    sections: [
      {
        body: [`For investment, wholesale, or partnership enquiries, email ${SUPPORT_EMAIL} with “Investors” in the subject line and our team will get back to you.`],
      },
    ],
    links: [{ label: 'Contact Our Team', to: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Investor enquiry')}` }],
  },

  sustainability: {
    eyebrow: 'Company',
    title: 'Sustainability',
    subtitle: 'Making every pair go further.',
    sections: [
      {
        heading: 'What we’re doing',
        bullets: [
          'Helping you get the right size the first time, so fewer pairs travel back and forth.',
          'Reducing packaging where we can and reusing shipping materials in store.',
          'Encouraging care and repair — clean, rotate, and resole to keep your pairs going longer.',
        ],
      },
      {
        body: ['Have an idea for how we can do better? We’d love to hear it.'],
      },
    ],
    links: [{ label: 'Share an Idea', to: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Sustainability idea')}` }],
  },

  'terms-of-sale': {
    eyebrow: 'Legal',
    title: 'Terms of Sale',
    subtitle: 'The rules that apply when you buy from Rhayz Kicks.',
    sections: [
      {
        heading: 'Prices & payment',
        body: [
          'All prices are in Philippine pesos (₱). The price you pay is the price shown at checkout, confirmed by our system at the time of ordering.',
          'Online payments are processed securely by PayMongo (GCash, GrabPay, or card). Your order is confirmed once payment succeeds.',
        ],
      },
      {
        heading: 'Vouchers & loyalty points',
        body: [
          'Vouchers can be used once, at online checkout or in store, and have no cash value. Loyalty points are earned on eligible purchases and can be changed or paused by Rhayz Kicks.',
        ],
      },
      ...refundCancellationPolicy.sections.map((s) => ({ heading: s.heading, body: s.body })),
    ],
  },

  'terms-of-use': {
    eyebrow: 'Legal',
    title: 'Terms of Use',
    subtitle: 'Using the Rhayz Kicks website and app.',
    sections: [
      {
        body: [
          'By using this site you agree to use it lawfully and not to interfere with how it works for other people.',
          'You’re responsible for keeping your account login private. Let us know right away if you think someone else has accessed your account.',
          'Product photos, logos, and content on this site belong to Rhayz Kicks or the respective brands and may not be reused without permission.',
        ],
      },
    ],
  },

  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    subtitle: 'What we collect and how we use it.',
    sections: [
      {
        heading: 'What we collect',
        bullets: [
          'Account details you give us: name, email, phone number, and delivery address.',
          'Order history, bag, favorites, loyalty points, and vouchers.',
          'Payment is handled by PayMongo — we never see or store your full card details.',
        ],
      },
      {
        heading: 'How we use it',
        bullets: [
          'To process and deliver your orders and keep you updated on them.',
          'To run your member account, loyalty points, and vouchers.',
          'We don’t sell your personal information.',
        ],
      },
      {
        heading: 'Your choices',
        body: [`You can update your details anytime in My Account. To request a copy or deletion of your data, email ${SUPPORT_EMAIL}.`],
      },
    ],
  },

  cookies: {
    eyebrow: 'Legal',
    title: 'Cookie Settings',
    subtitle: 'How this site uses browser storage.',
    sections: [
      {
        body: [
          'Rhayz Kicks only uses essential browser storage: to keep you signed in, remember your theme (light or dark), and remember small preferences like a dismissed popup.',
          'We don’t use advertising or tracking cookies, so there’s nothing to opt out of. You can clear this storage anytime in your browser settings; you’ll just be signed out.',
        ],
      },
    ],
  },
}

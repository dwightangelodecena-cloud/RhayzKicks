export interface FaqTab {
  label: string
  items: { question: string; answer: string }[]
}

export const faqTabs: FaqTab[] = [
  {
    label: 'Orders & Shipping',
    items: [
      { question: 'How long does standard delivery take?', answer: 'Standard delivery takes 3–5 business days within Metro Manila and 5–7 business days for provincial addresses.' },
      { question: 'Can I track my order?', answer: 'Yes — once your order ships, you’ll receive a tracking link by email and in your Order History.' },
      { question: 'Do you offer free shipping?', answer: 'Free standard delivery applies to all orders, with no minimum spend.' },
      { question: 'Can I change my delivery address after ordering?', answer: 'Contact our support team within 1 hour of placing your order and we’ll do our best to update it before it ships.' },
    ],
  },
  {
    label: 'Returns & Exchanges',
    items: [
      { question: 'What is your return policy?', answer: 'We offer 30-day free returns on unworn items in original packaging.' },
      { question: 'How do I start a return?', answer: 'Go to Order History, select the order, and choose "Start a Return" to generate a prepaid shipping label.' },
      { question: 'Can I exchange for a different size?', answer: 'Yes — select "Exchange" instead of "Return" during the return flow to swap for another size, subject to availability.' },
      { question: 'How long do refunds take?', answer: 'Refunds are processed within 5–7 business days after we receive your return.' },
    ],
  },
  {
    label: 'Membership & Account',
    items: [
      { question: 'How do I join Rhayz Kicks Members?', answer: 'Tap "Join Us" and create a free account to start earning points and early access.' },
      { question: 'How do loyalty points work?', answer: 'You earn points automatically on every purchase, which can be redeemed for exclusive vouchers once you hit 100 points.' },
      { question: 'How do I reset my password?', answer: 'Use the "Forgot your password?" link on the Sign In page to receive a reset email.' },
      { question: 'Can I have more than one account?', answer: 'We ask that each member keep a single account tied to one email address.' },
    ],
  },
  {
    label: 'Products & Sizing',
    items: [
      { question: 'How do I find my size?', answer: 'Check the Shoe Size Guide linked in the footer for a full conversion chart.' },
      { question: 'Are your products authentic?', answer: 'Yes — Rhayz Kicks is an authorized retailer and every item is 100% authentic.' },
      { question: 'What if an item is out of stock?', answer: 'Use "Notify Me" on the product page and we’ll email you the moment it’s back.' },
      { question: 'Do you restock limited releases?', answer: 'Limited releases are produced in small batches and typically do not restock once sold out.' },
    ],
  },
]

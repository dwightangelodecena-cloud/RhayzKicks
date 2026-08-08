// FAQ content for the Help Center screen — mirrors web/src/data/helpFaq.ts.

class FaqItem {
  final String question;
  final String answer;

  const FaqItem(this.question, this.answer);
}

class FaqTab {
  final String label;
  final List<FaqItem> items;

  const FaqTab(this.label, this.items);
}

const List<FaqTab> faqTabs = [
  FaqTab('Orders & Shipping', [
    FaqItem(
      'How long does standard delivery take?',
      'Standard delivery takes 3–5 business days within Metro Manila and 5–7 business days for provincial addresses.',
    ),
    FaqItem(
      'Can I track my order?',
      'Yes — once your order ships, you\'ll receive a tracking link by email and in your Order History.',
    ),
    FaqItem(
      'Do you offer free shipping?',
      'Free standard delivery applies to all orders, with no minimum spend.',
    ),
    FaqItem(
      'Can I change my delivery address after ordering?',
      'Contact our support team within 1 hour of placing your order and we\'ll do our best to update it before it ships.',
    ),
  ]),
  FaqTab('Returns & Exchanges', [
    FaqItem(
      'What is your return policy?',
      'We offer 30-day free returns on unworn items in original packaging.',
    ),
    FaqItem(
      'How do I start a return?',
      'Go to Order History, select the order, and choose "Start a Return" to generate a prepaid shipping label.',
    ),
    FaqItem(
      'Can I exchange for a different size?',
      'Yes — select "Exchange" instead of "Return" during the return flow to swap for another size, subject to availability.',
    ),
    FaqItem(
      'How long do refunds take?',
      'Refunds are processed within 5–7 business days after we receive your return.',
    ),
  ]),
  FaqTab('Membership & Account', [
    FaqItem(
      'How do I join Rhayz Kicks Members?',
      'Tap "Join Us" and create a free account to start earning points and early access.',
    ),
    FaqItem(
      'How do loyalty points work?',
      'You earn points automatically on every purchase, which can be redeemed for exclusive vouchers once you hit 100 points.',
    ),
    FaqItem(
      'How do I reset my password?',
      'Use the "Forgot your password?" link on the Sign In page to receive a reset email.',
    ),
    FaqItem(
      'Can I have more than one account?',
      'We ask that each member keep a single account tied to one email address.',
    ),
  ]),
  FaqTab('Products & Sizing', [
    FaqItem(
      'How do I find my size?',
      'Check the Shoe Size Guide linked in the footer for a full conversion chart.',
    ),
    FaqItem(
      'Are your products authentic?',
      'Yes — Rhayz Kicks is an authorized retailer and every item is 100% authentic.',
    ),
    FaqItem(
      'What if an item is out of stock?',
      'Use "Notify Me" on the product page and we\'ll email you the moment it\'s back.',
    ),
    FaqItem(
      'Do you restock limited releases?',
      'Limited releases are produced in small batches and typically do not restock once sold out.',
    ),
  ]),
];

// Policy copy for the storefront's legal pages.
//
// These are drafts prepared from the business details already in the site (company name,
// address, contact, Sarawak-only delivery). Values marked CONFIRM below are sensible
// defaults, not decisions the business has made — check them before relying on this text.
//
// Kept out of i18n/translations.ts deliberately: long-form prose would bloat that file and
// these documents change on a different cadence to UI strings.

export type LegalSlug = "privacy" | "terms" | "returns" | "delivery" | "contact";

export type LegalSection = {
  heading: string;
  body: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

const COMPANY = "Ekoway Hardware Sdn Bhd";
const ADDRESS = "Lorong Salim 17, near Farley, Sibu, Sarawak, Malaysia";
const PHONE = "084-253883";
const WHATSAPP = "017-405 6993";
const UPDATED = "10 August 2026";

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  privacy: {
    title: "Privacy Notice",
    updated: UPDATED,
    intro: `${COMPANY} ("we", "us") respects your privacy. This notice explains what personal data we collect when you use this website, why we collect it, and the choices you have. It is issued under the Personal Data Protection Act 2010 (PDPA).`,
    sections: [
      {
        heading: "Who we are",
        body: [
          `${COMPANY}, ${ADDRESS}. You can reach us on ${PHONE} or WhatsApp ${WHATSAPP}.`
        ]
      },
      {
        heading: "What we collect",
        body: [
          "When you place an order we collect your name, email address, phone number, and — for deliveries — your delivery address and recipient details.",
          "We also keep a record of what you ordered, when, and how it was paid for and fulfilled.",
          "If you create an account we store your login credentials in a secured, hashed form. We never store your card or online banking details; those are handled entirely by our payment provider."
        ]
      },
      {
        heading: "Why we collect it",
        body: [
          "To take, process and fulfil your order, including arranging pickup or delivery.",
          "To contact you about your order — for example to tell you it is ready for collection, or to resolve a problem with an item.",
          "To keep the accounting and tax records Malaysian law requires us to keep.",
          "Providing this data is necessary to complete a purchase. If you choose not to provide it, we will not be able to process your order."
        ]
      },
      {
        heading: "Who we share it with",
        body: [
          "Delivery partners and couriers, so they can deliver your order.",
          "Our payment provider, so your payment can be processed.",
          "Our accounting system and professional advisers, for bookkeeping and statutory reporting.",
          "Government authorities where we are required by law to disclose.",
          "We do not sell your personal data, and we do not share it for third-party marketing."
        ]
      },
      {
        heading: "How we protect it",
        body: [
          "The website is served over HTTPS and access to order data is restricted to authorised staff accounts.",
          "We keep your data only as long as we need it for the purposes above, or as long as the law requires us to retain records."
        ]
      },
      {
        heading: "Your rights",
        body: [
          "You may request access to the personal data we hold about you, ask us to correct it if it is inaccurate, or limit how we process it.",
          "You may withdraw consent to our processing, though this may mean we cannot complete an order in progress.",
          `To make any of these requests, contact us on ${PHONE}, WhatsApp ${WHATSAPP}, or in person at ${ADDRESS}. We will respond within the period required by the PDPA.`
        ]
      },
      {
        heading: "Notis Privasi (Bahasa Malaysia)",
        body: [
          `${COMPANY} menghormati privasi anda. Notis ini dikeluarkan di bawah Akta Perlindungan Data Peribadi 2010 (PDPA).`,
          "Data yang kami kumpul: nama, alamat e-mel, nombor telefon, dan bagi penghantaran, alamat penghantaran anda serta butiran penerima. Kami juga menyimpan rekod pesanan anda.",
          "Tujuan: untuk memproses dan memenuhi pesanan anda, menghubungi anda berkenaan pesanan tersebut, dan menyimpan rekod perakaunan seperti yang dikehendaki undang-undang. Data ini diperlukan untuk melengkapkan pembelian.",
          "Pendedahan: kepada rakan penghantaran dan kurier, penyedia pembayaran kami, sistem perakaunan dan penasihat profesional kami, serta pihak berkuasa apabila dikehendaki undang-undang. Kami tidak menjual data peribadi anda.",
          `Hak anda: anda boleh memohon akses kepada data peribadi anda, meminta pembetulan, mengehadkan pemprosesan, atau menarik balik kebenaran. Hubungi kami di ${PHONE} atau WhatsApp ${WHATSAPP}.`
        ]
      }
    ]
  },

  terms: {
    title: "Terms & Conditions",
    updated: UPDATED,
    intro: `These terms govern your use of this website and any order you place through it. By placing an order you agree to them. Your contract is with ${COMPANY}.`,
    sections: [
      {
        heading: "Orders",
        body: [
          "Placing an order is an offer to buy. Your order is accepted once we confirm it and payment has been received in full.",
          "We may decline or cancel an order — for example if an item turns out to be unavailable, or if a price or description was published in error. If we cancel an order you have already paid for, we refund it in full."
        ]
      },
      {
        heading: "Prices and payment",
        body: [
          "All prices are shown in Malaysian Ringgit (MYR).",
          "Prices may change at any time, but a change will not affect an order we have already accepted.",
          "Payment is taken online at checkout. We do not hold or see your card or banking credentials."
        ]
      },
      {
        heading: "Stock availability",
        body: [
          "Stock levels shown on the website are our best current figure, but the same stock is sold over the counter in store. Occasionally an item shows as available and is not.",
          "If that happens we will contact you to arrange a replacement, a partial fulfilment, or a refund."
        ]
      },
      {
        heading: "Collection and delivery",
        body: [
          "You may collect from our store or, where available, have your order delivered. Delivery coverage, timing and charges are set out in our Delivery Policy.",
          "Risk in the goods passes to you on collection or delivery."
        ]
      },
      {
        heading: "Returns",
        body: ["Returns and refunds are covered by our Returns & Refunds Policy."]
      },
      {
        heading: "Liability",
        body: [
          "Goods are supplied for normal use. You are responsible for selecting products suitable for your intended purpose, and for using them safely and in line with the manufacturer's instructions.",
          "Nothing in these terms limits liability where the law does not allow it to be limited.",
          "Manufacturer warranties, where they apply, are provided by the manufacturer and administered according to their terms."
        ]
      },
      {
        heading: "Governing law",
        body: [
          "These terms are governed by the laws of Malaysia, and the courts of Sarawak have jurisdiction over any dispute."
        ]
      }
    ]
  },

  returns: {
    title: "Returns & Refunds",
    updated: UPDATED,
    intro:
      "If something is not right with your order, contact us and we will put it right. This policy explains when an item can be returned and how a refund is handled.",
    sections: [
      {
        heading: "Return window",
        body: [
          // CONFIRM: 7 days is a common Malaysian hardware-retail default, not a decision you have made.
          "You may return an unused item within 7 days of collection or delivery, provided it is in its original condition and packaging with proof of purchase."
        ]
      },
      {
        heading: "Items we cannot accept back",
        body: [
          "Paint mixed or tinted to your specification.",
          "Products cut, mixed or made to your measurements.",
          "Items sold as clearance, ex-display or marked non-returnable at the time of sale.",
          "Items that have been used, installed, or damaged after delivery."
        ]
      },
      {
        heading: "Faulty or incorrect items",
        body: [
          "If an item arrives damaged, faulty, or is not what you ordered, tell us as soon as you notice and we will arrange a replacement, repair or refund at no cost to you.",
          "Where a manufacturer warranty applies, we will help you make the claim."
        ]
      },
      {
        heading: "How to start a return",
        body: [
          `Message us on WhatsApp ${WHATSAPP} or call ${PHONE} with your order number and a photo of the item. We will confirm whether to bring it in store or arrange collection.`
        ]
      },
      {
        heading: "Refunds",
        body: [
          "Approved refunds are returned to the original payment method.",
          // CONFIRM: gateway settlement timing — verify once your payment provider is live.
          "Once approved, refunds are processed within 7 working days. How quickly it appears depends on your bank.",
          "Delivery charges are refunded where the return is due to our error, and are otherwise non-refundable."
        ]
      }
    ]
  },

  delivery: {
    title: "Delivery & Collection",
    updated: UPDATED,
    intro:
      "We deliver across Sarawak, and you are always welcome to collect from our store in Sibu.",
    sections: [
      {
        heading: "Collection",
        body: [
          `Collect free of charge from ${ADDRESS}.`,
          "We will contact you when your order is ready. Please bring your order number.",
          "Store hours: Monday to Saturday, 8:00 AM – 6:00 PM. Sunday, 9:00 AM – 2:00 PM."
        ]
      },
      {
        heading: "Delivery coverage",
        body: [
          "We deliver within Sarawak. We do not currently deliver to Sabah or Peninsular Malaysia.",
          "If you are unsure whether we reach your area, message us before ordering and we will confirm."
        ]
      },
      {
        heading: "Charges and timing",
        body: [
          // CONFIRM: replace with your real zone pricing and lead times before launch.
          "Delivery charges are calculated at checkout based on your address and the size of the items ordered.",
          "Sibu and the immediate surrounding area is normally delivered within 1–2 working days. Other parts of Sarawak typically take 3–5 working days."
        ]
      },
      {
        heading: "Bulky and building materials",
        body: [
          "Heavy or oversized goods — cement, roofing sheets, long lengths, and similar — may need a separate delivery quote or a dedicated lorry.",
          `If your order includes these we will contact you to confirm the charge before dispatch. You can also ask for a quote in advance on WhatsApp ${WHATSAPP}.`
        ]
      },
      {
        heading: "If delivery fails",
        body: [
          "Please make sure someone can receive the order at the address and time given.",
          "If nobody is available and we have to attempt delivery again, a further delivery charge may apply."
        ]
      }
    ]
  },

  contact: {
    title: "Contact Us",
    updated: UPDATED,
    intro: `${COMPANY} — 永光五金. Sibu's hardware counter since 2017.`,
    sections: [
      {
        heading: "Store",
        body: [ADDRESS]
      },
      {
        heading: "Phone and WhatsApp",
        body: [`Phone ${PHONE}`, `WhatsApp ${WHATSAPP}`]
      },
      {
        heading: "Opening hours",
        body: ["Monday – Saturday: 8:00 AM – 6:00 PM", "Sunday: 9:00 AM – 2:00 PM"]
      },
      {
        heading: "Order enquiries",
        body: [
          "For anything about an existing order, message us on WhatsApp with your order number — it is the fastest way to reach us."
        ]
      }
    ]
  }
};

// Policy copy for the storefront's legal pages.
//
// These are drafts prepared from the business details already in the site (company name,
// address and contact). Owner-controlled policy values are intentionally not invented.
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

const COMPANY = "EKOWAY HARDWARE SDN. BHD.";
const REGISTRATION_NUMBER = "1353510-A";
const ADDRESS = "No. 43-44, Ground Floor, Lorong Salim 17, Jalan Salim, 96000 Sibu, Sarawak";
const PHONE = "084-253 883";
const WHATSAPP = "+60 17-405 6993";
const PRIVACY_CONTACT = "James Wong";
const PRIVACY_EMAIL = "ekowayhardware@gmail.com";
const UPDATED = "14 August 2026";

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  privacy: {
    title: "Privacy Notice",
    updated: UPDATED,
    intro: `${COMPANY} ("we", "us") respects your privacy. This notice explains what personal data we collect when you use this website, why we collect it, and the choices you have. It is issued under the Personal Data Protection Act 2010 (PDPA).`,
    sections: [
      {
        heading: "Who we are",
        body: [
          `${COMPANY} (Registration No. ${REGISTRATION_NUMBER}), ${ADDRESS}. You can reach us on ${PHONE}, WhatsApp ${WHATSAPP}, or email ${PRIVACY_EMAIL}.`
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
          `To make any of these requests, contact ${PRIVACY_CONTACT} at ${PRIVACY_EMAIL}, call ${PHONE}, use WhatsApp ${WHATSAPP}, or visit ${ADDRESS}. We will respond within the period required by the PDPA.`
        ]
      },
      {
        heading: "Notis Privasi (Bahasa Malaysia)",
        body: [
          `${COMPANY} menghormati privasi anda. Notis ini dikeluarkan di bawah Akta Perlindungan Data Peribadi 2010 (PDPA).`,
          "Data yang kami kumpul: nama, alamat e-mel, nombor telefon, dan bagi penghantaran, alamat penghantaran anda serta butiran penerima. Kami juga menyimpan rekod pesanan anda.",
          "Tujuan: untuk memproses dan memenuhi pesanan anda, menghubungi anda berkenaan pesanan tersebut, dan menyimpan rekod perakaunan seperti yang dikehendaki undang-undang. Data ini diperlukan untuk melengkapkan pembelian.",
          "Pendedahan: kepada rakan penghantaran dan kurier, penyedia pembayaran kami, sistem perakaunan dan penasihat profesional kami, serta pihak berkuasa apabila dikehendaki undang-undang. Kami tidak menjual data peribadi anda.",
          `Hak anda: anda boleh memohon akses kepada data peribadi anda, meminta pembetulan, mengehadkan pemprosesan, atau menarik balik kebenaran. Hubungi ${PRIVACY_CONTACT} di ${PRIVACY_EMAIL}, telefon ${PHONE}, atau WhatsApp ${WHATSAPP}.`
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
          "Contact us as soon as possible if you want to return an item. Keep it unused, in its original condition and packaging, and retain your proof of purchase while we assess the request.",
          "This policy does not limit any rights or remedies you have under applicable Malaysian consumer law."
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
          "We will submit an approved refund promptly. How quickly it appears after submission depends on your bank and payment provider.",
          "Delivery charges are refunded where the return is due to our error, and are otherwise non-refundable."
        ]
      }
    ]
  },

  delivery: {
    title: "Delivery & Collection",
    updated: UPDATED,
    intro:
      "Online orders are currently available for collection from our Sibu store. Contact us before ordering if you need delivery, so we can confirm availability and the charge.",
    sections: [
      {
        heading: "Collection",
        body: [
          `Collect free of charge from ${ADDRESS}.`,
          "We will contact you when your order is ready. Please bring your order number.",
          `Contact us on ${PHONE} or WhatsApp ${WHATSAPP} to confirm the current opening hours and collection time before travelling.`
        ]
      },
      {
        heading: "Delivery coverage",
        body: [
          "Delivery is arranged manually and is not currently offered as a standard online-checkout option.",
          `Message us on WhatsApp ${WHATSAPP} before ordering and we will confirm whether delivery is possible for your location and items.`
        ]
      },
      {
        heading: "Charges and timing",
        body: [
          // CONFIRM: replace with your real zone pricing and lead times before launch.
          "Any delivery charge and estimated date will be quoted and agreed with you before the order is dispatched."
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
    intro: `${COMPANY} — 永光五金. Hardware supplies in Sibu, Sarawak.`,
    sections: [
      {
        heading: "Store",
        body: [`${COMPANY} (Registration No. ${REGISTRATION_NUMBER})`, ADDRESS]
      },
      {
        heading: "Phone and WhatsApp",
        body: [`Phone ${PHONE}`, `WhatsApp ${WHATSAPP}`, `Email ${PRIVACY_EMAIL}`]
      },
      {
        heading: "Opening hours",
        body: [
          `Call ${PHONE} or WhatsApp ${WHATSAPP} to confirm today's opening hours before travelling.`
        ]
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

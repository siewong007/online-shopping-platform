import type {
  AdminCatalogPayload,
  AdminDashboardPayload,
  AdminUser,
  AuditEvent,
  CustomerPortalProfile,
  CustomerTransactionsPayload,
  Invoice,
  MembershipBenefitsPayload,
  MembershipPayload,
  Order,
  Payment,
  PermissionsPayload,
  ProductRestockResult,
  SalesRecord,
  SalesSummaryPayload,
  StorefrontPayload,
  SystemSetting
} from "../types";

export const fallbackStorefront: StorefrontPayload = {
  categories: [
    { slug: "all", name: "Shop All Departments", teaser: "Browse the homepage the way Ekoway customers expect to shop it." },
    { slug: "tools", name: "Tools", teaser: "Cordless systems, combo kits and garage-ready essentials." },
    { slug: "lumber", name: "Lumber", teaser: "Deck boards, framing packs and project quantities." },
    { slug: "paint", name: "Paint", teaser: "Interior refreshes, primers and color-matched finishes." },
    { slug: "appliances", name: "Appliances", teaser: "Kitchen upgrades with delivery and haul-away support." },
    { slug: "garden", name: "Garden Center", teaser: "Outdoor power, mulch, planters and spring prep." },
    { slug: "bath", name: "Bath", teaser: "Vanities, toilets and fixtures for quick bathroom resets." },
    { slug: "building-materials", name: "Building Materials", teaser: "Pavers, patio packs and bulky project essentials." },
    { slug: "storage", name: "Storage", teaser: "Totes, shelving and organization for garages and sheds." }
  ],
  promotions: [
    {
      label: "Spring Black Friday",
      title: "Big savings for the season's busiest projects",
      description: "Outdoor power, patio, grills and pro tool deals arranged around urgency and seasonal demand."
    },
    {
      label: "Fast Free Delivery",
      title: "Appliances and oversized orders moving faster",
      description: "Bring counter-tested freight confidence to dishwashers, laundry and kitchen refresh packages."
    },
    {
      label: "Special Buy Of The Day",
      title: "Daily value moments that feel merchandised, not random",
      description: "Use dense retail offer blocks to spotlight compelling product stories without losing the category flow."
    }
  ],
  products: [
    {
      id: 1,
      name: "Milwaukee M18 9-Tool Combo Kit",
      category_slug: "tools",
      price_cents: 64900,
      badge: "Special Buy",
      description: "Two batteries, charger and contractor bag for garages, remodels and everyday doer jobs.",
      tone: "Milwaukee",
      featured: true,
      stock_quantity: 25,
      low_stock_threshold: 5,
      image_url: "https://picsum.photos/seed/milwaukee-combo-kit/400/300"
    },
    {
      id: 2,
      name: "Pressure-Treated Decking Starter Pack",
      category_slug: "lumber",
      price_cents: 54900,
      badge: "Weekend Project",
      description: "Deck boards, posts and hardware grouped for a cleaner project kickoff.",
      tone: "Deck Build",
      featured: true,
      stock_quantity: 12,
      low_stock_threshold: 5,
      image_url: ""
    },
    {
      id: 3,
      name: "BEHR Ultra Scuff Defense Interior Paint",
      category_slug: "paint",
      price_cents: 4298,
      badge: "Top Rated",
      description: "Low-sheen interior coverage with durable washability for high-traffic spaces.",
      tone: "BEHR",
      featured: true,
      stock_quantity: 48,
      low_stock_threshold: 10,
      image_url: "https://picsum.photos/seed/behr-interior-paint/400/300"
    },
    {
      id: 4,
      name: "Frigidaire Front Control Dishwasher",
      category_slug: "appliances",
      price_cents: 29900,
      badge: "Fast Delivery",
      description: "Stainless finish, quiet operation and install-friendly scheduling for kitchen updates.",
      tone: "Frigidaire",
      featured: true,
      stock_quantity: 8,
      low_stock_threshold: 5,
      image_url: ""
    },
    {
      id: 5,
      name: "RYOBI 18V Walk-Behind Lawn Mower Kit",
      category_slug: "garden",
      price_cents: 26900,
      badge: "Spring Black Friday",
      description: "Battery mower bundle for smaller yards, weekend touchups and low-maintenance storage.",
      tone: "RYOBI",
      featured: true,
      stock_quantity: 16,
      low_stock_threshold: 5,
      image_url: "https://picsum.photos/seed/ryobi-mower-kit/400/300"
    },
    {
      id: 6,
      name: "Glacier Bay Shaila Vanity Combo",
      category_slug: "bath",
      price_cents: 39800,
      badge: "Bath Refresh",
      description: "Sink, cabinet and mirror styling arranged for a quick bathroom overhaul.",
      tone: "Glacier Bay",
      featured: true,
      stock_quantity: 3,
      low_stock_threshold: 5,
      image_url: ""
    },
    {
      id: 7,
      name: "Pavestone Patio Project Pallet",
      category_slug: "building-materials",
      price_cents: 64900,
      badge: "Bulk Savings",
      description: "A patio-ready paver assortment for outdoor living upgrades and curb appeal.",
      tone: "Pavestone",
      featured: true,
      stock_quantity: 20,
      low_stock_threshold: 5,
      image_url: "https://picsum.photos/seed/pavestone-patio-pallet/400/300"
    },
    {
      id: 8,
      name: "Husky Heavy-Duty Storage Tote 2-Pack",
      category_slug: "storage",
      price_cents: 2798,
      badge: "Everyday Value",
      description: "Garage, attic and jobsite storage with durable lids and stackable footprints.",
      tone: "Husky",
      featured: true,
      stock_quantity: 52,
      low_stock_threshold: 10,
      image_url: ""
    }
  ],
  services: [
    {
      name: "Home Services",
      description: "Book measurements, quotes and installation for flooring, appliances, doors and more."
    },
    {
      name: "Tool & Truck Rental",
      description: "Reserve equipment, trucks and project tools without leaving the storefront experience."
    },
    {
      name: "Pro Desk Support",
      description: "Manage quotes, volume pricing, delivery coordination and contractor-friendly purchasing."
    }
  ],
  pro_stats: [
    { label: "pickup-ready average", value: "2 hrs" },
    { label: "rental and service touchpoints", value: "1,300+" },
    { label: "pro quote turnaround", value: "30 min" }
  ]
};

export const fallbackCatalog: AdminCatalogPayload = {
  categories: fallbackStorefront.categories,
  products: fallbackStorefront.products
};

export const fallbackAdminDashboard: AdminDashboardPayload = {
  metrics: [
    { label: "Online revenue today", value: "$482,400", detail: "+18.2% vs last Tuesday" },
    { label: "Orders ready for pickup", value: "1,284", detail: "72 are tagged for priority lanes" },
    { label: "Low-stock spring SKUs", value: "94", detail: "12 require urgent replenishment" },
    { label: "Install consultations", value: "231", detail: "Bath and appliance demand are leading" }
  ],
  live_metrics: {
    revenue_today_cents: 48240000,
    revenue_yesterday_cents: 40810000,
    orders_awaiting_fulfillment: 37,
    low_stock_sku_count: 2,
    unpaid_invoice_count: 6,
    unpaid_invoice_amount_cents: 1284500
  },
  inventory: [
    { department: "Cordless Tools", on_hand: "412 units", lead_region: "South", status: "Healthy", note: "Promo inventory stable" },
    { department: "Deck Boards", on_hand: "88 bundles", lead_region: "Northeast", status: "Low", note: "Rush transfer queued" },
    { department: "Interior Paint", on_hand: "235 cans", lead_region: "Midwest", status: "Healthy", note: "Tinting lane clear" },
    { department: "Dishwashers", on_hand: "46 units", lead_region: "West", status: "Watch", note: "Vendor ETA under review" },
    { department: "Outdoor Power", on_hand: "124 units", lead_region: "South", status: "Healthy", note: "Spring event in stock" },
    { department: "Vanities", on_hand: "29 units", lead_region: "West", status: "Low", note: "Install demand spike" }
  ],
  fulfillment: [
    { stage: "Picking", title: "Milwaukee combo pallet", detail: "Store 118 · 14 items" },
    { stage: "Picking", title: "Deck board transfer", detail: "Cross-dock by 10:40" },
    { stage: "Staging", title: "Patio pickup bundle", detail: "Curbside lane 2" },
    { stage: "Staging", title: "Paint contractor order", detail: "Color match complete" },
    { stage: "Delivery", title: "Appliance install route", detail: "Truck 9 · ETA 12:25" },
    { stage: "Delivery", title: "Paver drop shipment", detail: "Jobsite gate code verified" }
  ],
  campaigns: [
    { name: "Spring Black Friday", description: "Daily merchandising updates for outdoor power, patio and spring demand peaks." },
    { name: "Patio and Garden", description: "Seasonal placement strategy for outdoor refresh projects and add-on bulk items." },
    { name: "Kitchen Refresh", description: "Appliance-forward pricing and install messaging for fast-converting remodel traffic." }
  ],
  activity: [
    { happened_at: "08:10", detail: "Milwaukee battery promo moved to the hero slot for western stores." },
    { happened_at: "08:42", detail: "Pro desk quote approved for Falcon Builders deck materials order." },
    { happened_at: "09:05", detail: "Dishwasher install route synced with updated delivery windows." }
  ]
};

export const fallbackAuditEvents: AuditEvent[] = [
  {
    id: 3,
    actor: "admin",
    action: "update",
    entity_type: "order_fulfillment",
    entity_id: "1042",
    detail: "Dishwasher install route synced with updated delivery windows.",
    happened_at: "09:05"
  },
  {
    id: 2,
    actor: "admin",
    action: "update",
    entity_type: "sale",
    entity_id: "1041",
    detail: "Pro desk quote approved for Falcon Builders deck materials order.",
    happened_at: "08:42"
  },
  {
    id: 1,
    actor: "admin",
    action: "update",
    entity_type: "product",
    entity_id: "204",
    detail: "Milwaukee battery promo moved to the hero slot for western stores.",
    happened_at: "08:10"
  }
];

export const fallbackOrders: Order[] = [
  {
    id: 1042,
    customer_name: "Falcon Builders",
    customer_email: "ap@falconbuilders.com",
    subtotal_cents: 119800,
    fulfillment_status: "packed",
    fulfillment_method: "pickup",
    created_at: "2026-06-29 08:42:00+00",
    items: [
      { product_id: 1, product_name: "Milwaukee M18 9-Tool Combo Kit", unit_price_cents: 64900, quantity: 1 },
      { product_id: 2, product_name: "Pressure-Treated Decking Starter Pack", unit_price_cents: 54900, quantity: 1 }
    ],
    fulfillment_history: [
      {
        id: 1,
        order_id: 1042,
        from_status: "received",
        to_status: "picking",
        note: "Queued for pro desk pickup.",
        changed_by: "demo-manager",
        happened_at: "2026-06-29 08:50:00+00"
      },
      {
        id: 2,
        order_id: 1042,
        from_status: "picking",
        to_status: "packed",
        note: "Large-format materials staged together.",
        changed_by: "demo-manager",
        happened_at: "2026-06-29 09:14:00+00"
      }
    ]
  },
  {
    id: 1041,
    customer_name: "Dana Whitfield",
    customer_email: "dana.w@example.com",
    subtotal_cents: 64900,
    fulfillment_status: "received",
    fulfillment_method: "delivery",
    created_at: "2026-06-29 07:15:00+00",
    items: [
      { product_id: 1, product_name: "Milwaukee M18 9-Tool Combo Kit", unit_price_cents: 64900, quantity: 1 }
    ],
    fulfillment_history: []
  }
];

export const fallbackCustomerPortalProfiles: CustomerPortalProfile[] = [
  {
    id: 1,
    customer_name: "Falcon Builders",
    customer_email: "ap@falconbuilders.com",
    membership_tier: "Pro Xtra",
    points_balance: 1840,
    lifetime_purchase_cents: 184000,
    total_orders: 3,
    last_purchase_at: "2026-06-29 08:42:00+00",
    created_at: "2026-06-29 08:00:00+00",
    updated_at: "2026-06-29 08:42:00+00"
  },
  {
    id: 2,
    customer_name: "Dana Whitfield",
    customer_email: "dana.w@example.com",
    membership_tier: "Silver",
    points_balance: 649,
    lifetime_purchase_cents: 64900,
    total_orders: 1,
    last_purchase_at: "2026-06-29 07:15:00+00",
    created_at: "2026-06-29 07:00:00+00",
    updated_at: "2026-06-29 07:15:00+00"
  }
];

export const fallbackCustomerPortalMembership: MembershipPayload = {
  profile: {
    customer_name: "Dana Whitfield",
    customer_email: "dana.w@example.com",
    membership_tier: "Silver",
    points_balance: 649,
    lifetime_purchase_cents: 64900,
    total_orders: 1,
    last_purchase_at: "2026-06-29 07:15:00+00"
  },
  current_tier: {
    name: "Silver",
    rank: 2,
    min_lifetime_purchase_cents: 50000
  },
  next_tier: {
    name: "Gold",
    min_lifetime_purchase_cents: 150000,
    remaining_cents: 85100
  }
};

export const fallbackCustomerPortalBenefits: MembershipBenefitsPayload = {
  current_tier: "Silver",
  tiers: [
    {
      name: "Bronze",
      rank: 1,
      min_lifetime_purchase_cents: 0,
      benefits: [
        { title: "Member pricing", description: "Access to members-only prices on select items." },
        { title: "Order history", description: "Track every past order and reorder in one click." },
        { title: "1x points", description: "Earn 1 point per dollar on every purchase." }
      ]
    },
    {
      name: "Silver",
      rank: 2,
      min_lifetime_purchase_cents: 50000,
      benefits: [
        { title: "Free delivery over $45", description: "Free standard delivery on eligible orders above $45." },
        { title: "1.25x points", description: "Earn 25% more points on every purchase." },
        { title: "Extended returns", description: "90-day returns on most items." }
      ]
    },
    {
      name: "Gold",
      rank: 3,
      min_lifetime_purchase_cents: 150000,
      benefits: [
        { title: "Free delivery over $25", description: "Free standard delivery on eligible orders above $25." },
        { title: "1.5x points", description: "Earn 50% more points on every purchase." },
        { title: "Early access to sales", description: "Shop seasonal and holiday sales before everyone else." },
        { title: "Priority support", description: "Faster response times from our support team." }
      ]
    },
    {
      name: "Pro Xtra",
      rank: 4,
      min_lifetime_purchase_cents: 300000,
      benefits: [
        { title: "Free delivery", description: "Free standard delivery on all eligible orders." },
        { title: "2x points", description: "Earn double points on every purchase." },
        { title: "Volume pricing", description: "Bulk and Pro pricing on qualifying quantities." },
        { title: "Dedicated Pro desk", description: "A dedicated account team and dedicated support line." }
      ]
    }
  ]
};

export const fallbackCustomerPortalTransactions: CustomerTransactionsPayload = {
  total: 1,
  transactions: [
    {
      id: 1041,
      created_at: "2026-06-29 07:15:00+00",
      status: "received",
      subtotal_cents: 64900,
      fulfillment_method: "delivery",
      items: [
        { product_name: "Milwaukee M18 9-Tool Combo Kit", quantity: 1, unit_price_cents: 64900 }
      ],
      payments: [
        {
          method: "ACH",
          status: "Pending",
          amount_cents: 64900,
          reference: "ach-dana-1041",
          processed_at: null
        }
      ]
    }
  ]
};

export const fallbackPayments: Payment[] = [
  {
    id: 501,
    order_id: 1042,
    order_customer_name: "Falcon Builders",
    order_customer_email: "ap@falconbuilders.com",
    order_subtotal_cents: 119800,
    idempotency_key: "pay-1042-capture-1",
    amount_cents: 119800,
    method: "Card",
    status: "Captured",
    reference: "ch_falcon_1042",
    notes: "Approved through contractor card terminal.",
    processed_at: "2026-06-29 08:43:00+00",
    created_at: "2026-06-29 08:43:00+00",
    updated_at: "2026-06-29 08:43:00+00"
  },
  {
    id: 500,
    order_id: 1041,
    order_customer_name: "Dana Whitfield",
    order_customer_email: "dana.w@example.com",
    order_subtotal_cents: 64900,
    idempotency_key: "pay-1041-pending-1",
    amount_cents: 64900,
    method: "ACH",
    status: "Pending",
    reference: "ach-dana-1041",
    notes: "Awaiting settlement batch.",
    processed_at: null,
    created_at: "2026-06-29 07:18:00+00",
    updated_at: "2026-06-29 07:18:00+00"
  }
];

export const fallbackSales: SalesRecord[] = [
  {
    order_id: 1042,
    customer_name: "Falcon Builders",
    customer_email: "ap@falconbuilders.com",
    subtotal_cents: 119800,
    status: "paid",
    payment_status: "paid",
    channel: "pro-desk",
    sales_rep: "Morgan Ellis",
    discount_cents: 5000,
    tax_cents: 8323,
    total_cents: 123123,
    created_at: "2026-06-29 08:42:00+00",
    updated_at: "2026-06-29 09:10:00+00"
  },
  {
    order_id: 1041,
    customer_name: "Dana Whitfield",
    customer_email: "dana.w@example.com",
    subtotal_cents: 64900,
    status: "confirmed",
    payment_status: "unpaid",
    channel: "web",
    sales_rep: "",
    discount_cents: 0,
    tax_cents: 4705,
    total_cents: 69605,
    created_at: "2026-06-29 07:15:00+00",
    updated_at: "2026-06-29 07:15:00+00"
  }
];

export const fallbackSalesSummary: SalesSummaryPayload = {
  total_revenue_cents: 192728,
  order_count: 2,
  by_status: [
    { status: "paid", count: 1, total_cents: 123123 },
    { status: "confirmed", count: 1, total_cents: 69605 }
  ],
  by_channel: [
    { channel: "pro-desk", count: 1, total_cents: 123123 },
    { channel: "web", count: 1, total_cents: 69605 }
  ]
};

export const fallbackInvoices: Invoice[] = [
  {
    id: 1,
    invoice_number: "INV-001001",
    order_id: 1042,
    status: "paid",
    billing_name: "Falcon Builders",
    billing_email: "ap@falconbuilders.com",
    billing_address: "",
    buyer_tin: null,
    buyer_registration_number: null,
    buyer_sst_registration_number: null,
    subtotal_cents: 119800,
    discount_cents: 5000,
    tax_cents: 8323,
    total_cents: 123123,
    amount_paid_cents: 123123,
    issued_at: "2026-06-29 09:00:00+00",
    due_at: "2026-07-29 09:00:00+00",
    voided_at: null,
    exported_to_autocount_at: null,
    line_items: [
      {
        product_id: 1,
        product_name: "Milwaukee M18 9-Tool Combo Kit",
        unit_price_cents: 64900,
        quantity: 1,
        tax_code: null,
        tax_rate_bps: 725,
        tax_cents: 4705
      },
      {
        product_id: 2,
        product_name: "Pressure-Treated Decking Starter Pack",
        unit_price_cents: 54900,
        quantity: 1,
        tax_code: null,
        tax_rate_bps: 725,
        tax_cents: 3618
      }
    ],
    payments: [
      {
        id: 1,
        amount_cents: 123123,
        method: "ACH",
        paid_at: "2026-06-29 09:10:00+00",
        note: "Paid in full via contractor account."
      }
    ]
  }
];

export const fallbackSystemSettings: SystemSetting[] = [
  {
    key: "general.company_name",
    value: "Project Depot",
    value_type: "string",
    category: "general",
    description: "Company name shown on invoices and storefront branding.",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "general.company_address",
    value: "2455 Paces Ferry Road, Atlanta, GA 30339",
    value_type: "string",
    category: "general",
    description: "Company mailing address shown on invoices.",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "general.currency_code",
    value: "USD",
    value_type: "string",
    category: "general",
    description: "ISO currency code used across sales and invoicing.",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "sales.default_tax_rate_bps",
    value: "725",
    value_type: "int",
    category: "sales",
    description: "Default sales tax rate in basis points (725 = 7.25%).",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "invoicing.number_prefix",
    value: "INV-",
    value_type: "string",
    category: "invoicing",
    description: "Prefix applied to generated invoice numbers.",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "invoicing.next_sequence",
    value: "1002",
    value_type: "int",
    category: "invoicing",
    description: "Next invoice sequence number to allocate.",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    key: "invoicing.payment_terms_days",
    value: "30",
    value_type: "int",
    category: "invoicing",
    description: "Default number of days until an invoice is due.",
    updated_at: "2026-06-29 08:00:00+00"
  }
];

export const fallbackPermissions: PermissionsPayload = {
  roles: [
    {
      id: 1,
      name: "Super Admin",
      description: "Ultimate access across every page and action.",
      is_super_admin: true,
      created_at: "2026-06-29 08:00:00+00"
    },
    {
      id: 2,
      name: "Store Manager",
      description: "Daily operations lead with broad store-console access.",
      is_super_admin: false,
      created_at: "2026-06-29 08:05:00+00"
    },
    {
      id: 3,
      name: "Catalog Specialist",
      description: "Maintains departments, products and promotional content.",
      is_super_admin: false,
      created_at: "2026-06-29 08:10:00+00"
    },
    {
      id: 4,
      name: "Fulfillment Lead",
      description: "Owns order flow, pickup readiness and inventory movement.",
      is_super_admin: false,
      created_at: "2026-06-29 08:15:00+00"
    }
  ],
  pages: [
    { id: 1, slug: "admin-overview", name: "Overview", description: "Store operations dashboard." },
    { id: 2, slug: "admin-inventory", name: "Inventory", description: "Inventory health and replenishment." },
    { id: 3, slug: "admin-fulfillment", name: "Fulfillment", description: "Order flow by fulfillment stage." },
    { id: 4, slug: "admin-campaigns", name: "Campaigns", description: "Promotional planning controls." },
    { id: 5, slug: "admin-catalog", name: "Catalog", description: "Category and product management." },
    { id: 6, slug: "admin-orders", name: "Orders", description: "Checkout order book." },
    { id: 7, slug: "admin-payments", name: "Payments", description: "Payment ledger, tender status and transaction controls." },
    { id: 8, slug: "admin-customers", name: "Customers", description: "Customer portal membership, points and purchase controls." },
    { id: 9, slug: "admin-permissions", name: "Permissions", description: "Role and page permission management." },
    { id: 10, slug: "storefront", name: "Storefront", description: "Customer-facing shopping experience." },
    { id: 11, slug: "admin-sales", name: "Sales", description: "Sales pipeline status, channel and payment tracking." },
    { id: 12, slug: "admin-invoices", name: "Invoices", description: "Invoice generation, billing details and payment records." },
    { id: 13, slug: "admin-settings", name: "Settings", description: "System-wide configuration for tax, invoicing and branding." },
    { id: 14, slug: "admin-support", name: "Support", description: "Guest support conversation inbox and replies." }
  ],
  permissions: [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((pageId) => ({
      role_id: 1,
      page_id: pageId,
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true
    })),
    ...[
      [2, 1, false, true, true, false],
      [2, 2, false, true, true, false],
      [2, 3, false, true, true, false],
      [2, 4, true, true, true, false],
      [2, 5, true, true, true, true],
      [2, 6, false, true, true, false],
      [2, 7, true, true, true, true],
      [2, 8, true, true, true, true],
      [2, 9, false, false, false, false],
      [2, 10, false, true, false, false],
      [2, 11, true, true, true, false],
      [2, 12, true, true, true, false],
      [2, 13, false, true, false, false],
      [2, 14, true, true, true, false],
      [3, 1, false, true, false, false],
      [3, 2, false, false, false, false],
      [3, 3, false, false, false, false],
      [3, 4, false, true, true, false],
      [3, 5, true, true, true, true],
      [3, 6, false, true, false, false],
      [3, 7, false, true, false, false],
      [3, 8, false, true, false, false],
      [3, 9, false, false, false, false],
      [3, 10, false, true, false, false],
      [3, 11, false, false, false, false],
      [3, 12, false, false, false, false],
      [3, 13, false, false, false, false],
      [3, 14, false, false, false, false],
      [4, 1, false, true, false, false],
      [4, 2, false, true, true, false],
      [4, 3, true, true, true, false],
      [4, 4, false, false, false, false],
      [4, 5, false, false, false, false],
      [4, 6, false, true, true, false],
      [4, 7, false, true, true, false],
      [4, 8, false, true, false, false],
      [4, 9, false, false, false, false],
      [4, 10, false, false, false, false],
      [4, 11, false, false, false, false],
      [4, 12, false, false, false, false],
      [4, 13, false, false, false, false],
      [4, 14, false, false, false, false]
    ].map(([roleId, pageId, canCreate, canRead, canUpdate, canDelete]) => ({
      role_id: Number(roleId),
      page_id: Number(pageId),
      can_create: Boolean(canCreate),
      can_read: Boolean(canRead),
      can_update: Boolean(canUpdate),
      can_delete: Boolean(canDelete)
    }))
  ]
};

export const fallbackAdminUsers: AdminUser[] = [
  {
    id: 1,
    username: "admin",
    display_name: "Admin",
    role_id: 1,
    is_active: true,
    created_at: "2026-06-29 08:00:00+00",
    updated_at: "2026-06-29 08:00:00+00"
  },
  {
    id: 2,
    username: "j.rivera",
    display_name: "Jordan Rivera",
    role_id: 3,
    is_active: false,
    created_at: "2026-06-30 09:30:00+00",
    updated_at: "2026-07-02 14:00:00+00"
  }
];

export const fallbackSupplierSync: ProductRestockResult[] = [];

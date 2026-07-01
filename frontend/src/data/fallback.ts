import type {
  AdminDashboardPayload,
  CustomerPortalProfile,
  Order,
  Payment,
  PermissionsPayload,
  StorefrontPayload
} from "../types";

export const fallbackStorefront: StorefrontPayload = {
  categories: [
    { slug: "all", name: "Shop All Departments", teaser: "Browse the homepage the way Home Depot customers expect to shop it." },
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
      description: "Bring Home Depot-style freight confidence to dishwashers, laundry and kitchen refresh packages."
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
      featured: true
    },
    {
      id: 2,
      name: "Pressure-Treated Decking Starter Pack",
      category_slug: "lumber",
      price_cents: 54900,
      badge: "Weekend Project",
      description: "Deck boards, posts and hardware grouped for a cleaner project kickoff.",
      tone: "Deck Build",
      featured: true
    },
    {
      id: 3,
      name: "BEHR Ultra Scuff Defense Interior Paint",
      category_slug: "paint",
      price_cents: 4298,
      badge: "Top Rated",
      description: "Low-sheen interior coverage with durable washability for high-traffic spaces.",
      tone: "BEHR",
      featured: true
    },
    {
      id: 4,
      name: "Frigidaire Front Control Dishwasher",
      category_slug: "appliances",
      price_cents: 29900,
      badge: "Fast Delivery",
      description: "Stainless finish, quiet operation and install-friendly scheduling for kitchen updates.",
      tone: "Frigidaire",
      featured: true
    },
    {
      id: 5,
      name: "RYOBI 18V Walk-Behind Lawn Mower Kit",
      category_slug: "garden",
      price_cents: 26900,
      badge: "Spring Black Friday",
      description: "Battery mower bundle for smaller yards, weekend touchups and low-maintenance storage.",
      tone: "RYOBI",
      featured: true
    },
    {
      id: 6,
      name: "Glacier Bay Shaila Vanity Combo",
      category_slug: "bath",
      price_cents: 39800,
      badge: "Bath Refresh",
      description: "Sink, cabinet and mirror styling arranged for a quick bathroom overhaul.",
      tone: "Glacier Bay",
      featured: true
    },
    {
      id: 7,
      name: "Pavestone Patio Project Pallet",
      category_slug: "building-materials",
      price_cents: 64900,
      badge: "Bulk Savings",
      description: "A patio-ready paver assortment for outdoor living upgrades and curb appeal.",
      tone: "Pavestone",
      featured: true
    },
    {
      id: 8,
      name: "Husky Heavy-Duty Storage Tote 2-Pack",
      category_slug: "storage",
      price_cents: 2798,
      badge: "Everyday Value",
      description: "Garage, attic and jobsite storage with durable lids and stackable footprints.",
      tone: "Husky",
      featured: true
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

export const fallbackAdminDashboard: AdminDashboardPayload = {
  metrics: [
    { label: "Online revenue today", value: "$482,400", detail: "+18.2% vs last Tuesday" },
    { label: "Orders ready for pickup", value: "1,284", detail: "72 are tagged for priority lanes" },
    { label: "Low-stock spring SKUs", value: "94", detail: "12 require urgent replenishment" },
    { label: "Install consultations", value: "231", detail: "Bath and appliance demand are leading" }
  ],
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

export const fallbackOrders: Order[] = [
  {
    id: 1042,
    customer_name: "Falcon Builders",
    customer_email: "ap@falconbuilders.com",
    subtotal_cents: 119800,
    created_at: "2026-06-29 08:42:00+00",
    items: [
      { product_id: 1, product_name: "Milwaukee M18 9-Tool Combo Kit", unit_price_cents: 64900, quantity: 1 },
      { product_id: 2, product_name: "Pressure-Treated Decking Starter Pack", unit_price_cents: 54900, quantity: 1 }
    ]
  },
  {
    id: 1041,
    customer_name: "Dana Whitfield",
    customer_email: "dana.w@example.com",
    subtotal_cents: 64900,
    created_at: "2026-06-29 07:15:00+00",
    items: [
      { product_id: 1, product_name: "Milwaukee M18 9-Tool Combo Kit", unit_price_cents: 64900, quantity: 1 }
    ]
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
    { id: 10, slug: "storefront", name: "Storefront", description: "Customer-facing shopping experience." }
  ],
  permissions: [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pageId) => ({
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
      [4, 1, false, true, false, false],
      [4, 2, false, true, true, false],
      [4, 3, true, true, true, false],
      [4, 4, false, false, false, false],
      [4, 5, false, false, false, false],
      [4, 6, false, true, true, false],
      [4, 7, false, true, true, false],
      [4, 8, false, true, false, false],
      [4, 9, false, false, false, false],
      [4, 10, false, false, false, false]
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

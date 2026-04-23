import type { AdminDashboardPayload, StorefrontPayload } from "../types";

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

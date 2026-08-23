/*
 * data.js — Direction A ("Trade Counter") prototype data.
 *
 * This is a STATIC, HAND-TRANSCRIBED copy of the real catalogue snapshot at
 * repo root `catalogue.json`, taken during the Step 2A design session on
 * 2026-07-31. It is NOT the live data path — there is no fetch() here and
 * no server dependency. Every name, price_cents, stock_quantity,
 * low_stock_threshold, badge, description, and category matches the live
 * `/api/storefront` snapshot byte-for-byte at the time of transcription.
 *
 * Do not treat this file as a live integration point. If the real catalogue
 * changes, this file will silently go stale — it exists only so these
 * throwaway static prototypes can run with zero build step and zero network
 * calls (including when opened directly via file://).
 *
 * NOTE (kept verbatim on purpose): the "all" category teaser and the
 * "Fast Free Delivery" promotion description both say "Online Shopping"
 * where they should say "Ekoway" — this is a real content bug documented in
 * design/audit/catalogue-hard-cases.md, not a transcription error here. It
 * is intentionally left uncorrected in this data file so the prototype
 * reflects real catalogue content; the UI flags it explicitly instead of
 * silently fixing it.
 */

const CATALOGUE = {
  categories: [
    { slug: "all", name: "Shop All Departments", teaser: "Browse the homepage the way Online Shopping customers expect to shop it." },
    { slug: "tools", name: "Tools", teaser: "Cordless systems, combo kits and garage-ready essentials." },
    { slug: "lumber", name: "Lumber", teaser: "Deck boards, framing packs and project quantities." },
    { slug: "paint", name: "Paint", teaser: "Interior refreshes, primers and color-matched finishes." },
    { slug: "appliances", name: "Appliances", teaser: "Kitchen upgrades with delivery and haul-away support." },
    { slug: "garden", name: "Garden Center", teaser: "Outdoor power, mulch, planters and spring prep." },
    { slug: "bath", name: "Bath", teaser: "Vanities, toilets and fixtures for quick bathroom resets." },
    { slug: "building-materials", name: "Building Materials", teaser: "Pavers, patio packs and bulky project essentials." },
    { slug: "storage", name: "Storage", teaser: "Totes, shelving and organization for garages and sheds." }
  ],
  products: [
    { id: 1, name: "Milwaukee M18 9-Tool Combo Kit", category_slug: "tools", price_cents: 64900, badge: "Special Buy", description: "Two batteries, charger and contractor bag for garages, remodels and everyday doer jobs.", tone: "Milwaukee", featured: true, stock_quantity: 25, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 2, name: "Pressure-Treated Decking Starter Pack", category_slug: "lumber", price_cents: 54900, badge: "Weekend Project", description: "Deck boards, posts and hardware grouped for a cleaner project kickoff.", tone: "Deck Build", featured: true, stock_quantity: 12, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 3, name: "BEHR Ultra Scuff Defense Interior Paint", category_slug: "paint", price_cents: 4298, badge: "Top Rated", description: "Low-sheen interior coverage with durable washability for high-traffic spaces.", tone: "BEHR", featured: true, stock_quantity: 48, low_stock_threshold: 10, image_url: "", avg_rating: null, review_count: 0 },
    { id: 4, name: "Frigidaire Front Control Dishwasher", category_slug: "appliances", price_cents: 29900, badge: "Fast Delivery", description: "Stainless finish, quiet operation and install-friendly scheduling for kitchen updates.", tone: "Frigidaire", featured: true, stock_quantity: 8, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 5, name: "RYOBI 18V Walk-Behind Lawn Mower Kit", category_slug: "garden", price_cents: 26900, badge: "Spring Black Friday", description: "Battery mower bundle for smaller yards, weekend touchups and low-maintenance storage.", tone: "RYOBI", featured: true, stock_quantity: 16, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 6, name: "Glacier Bay Shaila Vanity Combo", category_slug: "bath", price_cents: 39800, badge: "Bath Refresh", description: "Sink, cabinet and mirror styling arranged for a quick bathroom overhaul.", tone: "Glacier Bay", featured: true, stock_quantity: 3, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 7, name: "Pavestone Patio Project Pallet", category_slug: "building-materials", price_cents: 64900, badge: "Bulk Savings", description: "A patio-ready paver assortment for outdoor living upgrades and curb appeal.", tone: "Pavestone", featured: true, stock_quantity: 20, low_stock_threshold: 5, image_url: "", avg_rating: null, review_count: 0 },
    { id: 8, name: "Husky Heavy-Duty Storage Tote 2-Pack", category_slug: "storage", price_cents: 2798, badge: "Everyday Value", description: "Garage, attic and jobsite storage with durable lids and stackable footprints.", tone: "Husky", featured: true, stock_quantity: 52, low_stock_threshold: 10, image_url: "", avg_rating: null, review_count: 0 }
  ],
  promotions: [
    { label: "Spring Black Friday", title: "Big savings for the season's busiest projects", description: "Outdoor power, patio, grills and pro tool deals arranged around urgency and seasonal demand." },
    { label: "Fast Free Delivery", title: "Appliances and oversized orders moving faster", description: "Bring Online Shopping-style freight confidence to dishwashers, laundry and kitchen refresh packages." },
    { label: "Special Buy Of The Day", title: "Daily value moments that feel merchandised, not random", description: "Use dense retail offer blocks to spotlight compelling product stories without losing the category flow." }
  ],
  services: [
    { name: "Home Services", description: "Book measurements, quotes and installation for flooring, appliances, doors and more." },
    { name: "Tool & Truck Rental", description: "Reserve equipment, trucks and project tools without leaving the storefront experience." },
    { name: "Pro Desk Support", description: "Manage quotes, volume pricing, delivery coordination and contractor-friendly purchasing." }
  ],
  pro_stats: [
    { label: "pickup-ready average", value: "2 hrs" },
    { label: "rental and service touchpoints", value: "1,300+" },
    { label: "pro quote turnaround", value: "30 min" }
  ]
};

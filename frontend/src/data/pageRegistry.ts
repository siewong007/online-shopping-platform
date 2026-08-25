import type { PermissionPage } from "../types";

export const PAGE_REGISTRY: PermissionPage[] = [
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
];

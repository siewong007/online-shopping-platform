import { type FormEvent, startTransition, useDeferredValue, useEffect, useState } from "react";

import {
  createCategory as createCategoryRequest,
  createProduct as createProductRequest,
  fetchAdminDashboard,
  fetchStorefront
} from "./lib/api";
import type {
  ActivityItem,
  AdminDashboardPayload,
  CampaignOption,
  Category,
  CreateCategoryInput,
  CreateProductInput,
  FulfillmentItem,
  Product,
  StorefrontPayload
} from "./types";

type View = "store" | "admin";
type AdminTab = "overview" | "inventory" | "fulfillment" | "campaigns" | "catalog";

const departmentMenu = [
  "Shop All",
  "Specials & Offers",
  "Appliances",
  "Bath",
  "Building Materials",
  "Lumber",
  "Garden Center",
  "Tools",
  "Paint",
  "Storage",
  "Services",
  "DIY",
  "Pro"
];

const seasonalTags = [
  "Spring Black Friday",
  "Fast Free Delivery",
  "Special Buy of the Day",
  "Outdoor Power",
  "Patio Furniture",
  "Mulch",
  "Bathroom Vanities",
  "Refrigerators"
];

const quickServiceCalls = [
  { time: "Pickup", detail: "Buy online and collect in as little as 2 hours." },
  { time: "Delivery", detail: "Appliances, pallets and oversized orders scheduled fast." },
  { time: "Install", detail: "Measure, quote and book trusted installers from one flow." }
];

const storeClusterBars = [
  { label: "Northeast", width: "82%" },
  { label: "South", width: "91%" },
  { label: "Midwest", width: "76%" },
  { label: "West", width: "88%" }
];

const highValueAccounts = [
  { name: "Falcon Builders", detail: "$28.4k in deck and siding orders this week" },
  { name: "Northline Renovation", detail: "Kitchen appliance quote waiting on approval" },
  { name: "Summit Install Group", detail: "Bath vanity install calendar nearly full" }
];

function currencyFromCents(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value / 100);
}

function groupedFulfillment(items: FulfillmentItem[]): Record<string, FulfillmentItem[]> {
  return items.reduce<Record<string, FulfillmentItem[]>>((groups, item) => {
    groups[item.stage] = groups[item.stage] ? [...groups[item.stage], item] : [item];
    return groups;
  }, {});
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function DepotMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`depot-mark ${compact ? "compact" : ""}`} aria-hidden="true">
      <span>THE</span>
      <span>HOME</span>
      <span>DEPOT</span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>(window.location.pathname === "/admin" ? "admin" : "store");
  const [storefront, setStorefront] = useState<StorefrontPayload | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignOption | null>(null);
  const [discount, setDiscount] = useState(25);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    void Promise.all([fetchStorefront(), fetchAdminDashboard()]).then(([storefrontData, dashboardData]) => {
      setStorefront(storefrontData);
      setDashboard(dashboardData);
      setSelectedCampaign(dashboardData.campaigns[0] ?? null);
      setActivityFeed(dashboardData.activity);
    });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(window.location.pathname === "/admin" ? "admin" : "store");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = !storefront
    ? []
    : storefront.products.filter((product) => {
        const matchesCategory =
          selectedCategory === "all" || product.category_slug === selectedCategory;

        const search = deferredSearchTerm.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          product.name.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search) ||
          product.badge.toLowerCase().includes(search) ||
          product.tone.toLowerCase().includes(search);

        return matchesCategory && matchesSearch;
      });

  const fulfillmentByStage = groupedFulfillment(dashboard?.fulfillment ?? []);

  const openView = (nextView: View) => {
    startTransition(() => {
      const nextPath = nextView === "admin" ? "/admin" : "/";
      window.history.pushState({}, "", nextPath);
      setView(nextView);
    });
  };

  const addToCart = (product: Product) => {
    setCartCount((count) => count + 1);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${product.name} added to cart from the storefront.`
      },
      ...current
    ]);
  };

  const applyCampaign = () => {
    if (!selectedCampaign) {
      return;
    }

    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Campaign updated: ${selectedCampaign.name} set to ${discount}% off.`
      },
      ...current
    ]);
  };

  const runSupplierSync = () => {
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: "Supplier and pricing sync completed for all monitored merchandising feeds."
      },
      ...current
    ]);
  };

  const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
    const category = await createCategoryRequest(input);

    setStorefront((current) => {
      if (!current || current.categories.some((item) => item.slug === category.slug)) {
        return current;
      }

      return {
        ...current,
        categories: [...current.categories, category]
      };
    });
    setSelectedCategory(category.slug);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category created: ${category.name}.`
      },
      ...current
    ]);

    return category;
  };

  const createProduct = async (input: CreateProductInput): Promise<Product> => {
    const product = await createProductRequest(input);

    if (product.featured) {
      setStorefront((current) => {
        if (!current || current.products.some((item) => item.id === product.id)) {
          return current;
        }

        return {
          ...current,
          products: [...current.products, product]
        };
      });
    }

    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product created: ${product.name}${product.featured ? " and published to the storefront." : "."}`
      },
      ...current
    ]);

    return product;
  };

  if (!storefront || !dashboard) {
    return <main className="loading-shell">Loading Home Depot storefront...</main>;
  }

  return (
    <div className="app-shell">
      {view === "store" ? (
        <StorefrontView
          cartCount={cartCount}
          filteredProducts={filteredProducts}
          onAddToCart={addToCart}
          onChangeCategory={setSelectedCategory}
          onChangeSearch={setSearchTerm}
          onOpenAdmin={() => openView("admin")}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          storefront={storefront}
        />
      ) : (
        <AdminView
          activityFeed={activityFeed}
          adminTab={adminTab}
          categories={storefront.categories}
          dashboard={dashboard}
          discount={discount}
          fulfillmentByStage={fulfillmentByStage}
          highValueAccounts={highValueAccounts}
          onApplyCampaign={applyCampaign}
          onBackToStore={() => openView("store")}
          onChangeDiscount={setDiscount}
          onChangeTab={setAdminTab}
          onCreateCategory={createCategory}
          onCreateProduct={createProduct}
          onRunSync={runSupplierSync}
          onSelectCampaign={(name) =>
            setSelectedCampaign(dashboard.campaigns.find((item) => item.name === name) ?? null)
          }
          products={storefront.products}
          selectedCampaign={selectedCampaign}
          storeClusterBars={storeClusterBars}
        />
      )}
    </div>
  );
}

type StorefrontViewProps = {
  cartCount: number;
  filteredProducts: Product[];
  onAddToCart: (product: Product) => void;
  onChangeCategory: (slug: string) => void;
  onChangeSearch: (value: string) => void;
  onOpenAdmin: () => void;
  searchTerm: string;
  selectedCategory: string;
  storefront: StorefrontPayload;
};

function StorefrontView({
  cartCount,
  filteredProducts,
  onAddToCart,
  onChangeCategory,
  onChangeSearch,
  onOpenAdmin,
  searchTerm,
  selectedCategory,
  storefront
}: StorefrontViewProps) {
  const activeCategory =
    storefront.categories.find((category) => category.slug === selectedCategory) ?? storefront.categories[0];

  return (
    <>
      <div className="top-strip">
        <p>Spring Black Friday is live with daily savings, fast delivery and pickup-ready inventory.</p>
        <button className="top-link" onClick={onOpenAdmin}>
          Open Ops Console
        </button>
      </div>

      <header className="site-header">
        <div className="brand-block">
          <DepotMark />
          <div className="brand-copy">
            <p className="eyebrow">#1 Home Improvement Retailer</p>
            <h1>The Home Depot</h1>
            <p className="brand-tagline">How doers get more done.</p>
          </div>
        </div>

        <div className="header-actions">
          <label className="search-shell">
            <span>What can we help you find today?</span>
            <input
              type="search"
              placeholder="Search tools, appliances, patio, paint and more"
              value={searchTerm}
              onChange={(event) => onChangeSearch(event.target.value)}
            />
          </label>
          <button className="outline-button">Select Store</button>
          <button className="outline-button">My Account</button>
          <button className="solid-button cart-button">
            Cart
            <span>{cartCount}</span>
          </button>
        </div>
      </header>

      <nav className="mega-nav" aria-label="Primary">
        {departmentMenu.map((item) => (
          <a href="#categories" key={item}>
            {item}
          </a>
        ))}
        <button className="nav-button" onClick={onOpenAdmin}>
          Admin
        </button>
      </nav>

      <main className="page-shell">
        <section className="hero-grid">
          <article className="hero-panel hero-primary">
            <div className="hero-copy">
              <p className="eyebrow">Spring Black Friday</p>
              <h2>Big orange savings across tools, patio, appliances and pickup-ready essentials.</h2>
              <p>
                This storefront is rebuilt to feel like the real Home Depot homepage: utility-first
                navigation, dense promotional blocks and a strong mix of DIY, pro and service-driven
                merchandising.
              </p>
              <div className="hero-actions">
                <a className="solid-button" href="#featured-products">
                  Shop Deals
                </a>
                <a className="outline-button" href="#services">
                  Explore Services
                </a>
              </div>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>2 hrs</strong>
                <span>pickup-ready order window</span>
              </div>
              <div>
                <strong>48 states</strong>
                <span>delivery coverage on major appliances</span>
              </div>
              <div>
                <strong>1,300+</strong>
                <span>rental and service touchpoints</span>
              </div>
            </div>
          </article>

          <article className="hero-panel hero-secondary">
            <p className="eyebrow">Today&apos;s Big Savings</p>
            <h3>Deals stacked the way shoppers expect.</h3>
            <p>Browse category-led offers built for spring projects, quick refreshes and pro replenishment.</p>
            <ul className="deal-points">
              <li>Special Buy pricing on cordless tool kits</li>
              <li>Fast free delivery on select appliances</li>
              <li>Patio and garden markdowns ahead of the weekend</li>
            </ul>
            <a className="text-link" href="#deals">
              View all savings
            </a>
          </article>

          <article className="hero-panel hero-tertiary">
            <p className="eyebrow">Store Services</p>
            <h3>Pickup, delivery and installs from one shelf.</h3>
            <p>Bring the retail convenience layer closer to the product grid instead of hiding it in a side flow.</p>
            <div className="mini-board">
              {quickServiceCalls.map((item) => (
                <div key={item.time}>
                  <span>{item.time}</span>
                  <strong>{item.detail}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="promo-rail" id="deals">
          {storefront.promotions.map((promotion) => (
            <article key={promotion.title}>
              <p className="eyebrow">{promotion.label}</p>
              <h3>{promotion.title}</h3>
              <p>{promotion.description}</p>
            </article>
          ))}
        </section>

        <section className="seasonal-band" aria-label="Seasonal highlights">
          {seasonalTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading">
            <p className="eyebrow">Shop By Category</p>
            <h2>Department-first merchandising, just like the live site</h2>
            <p className="section-copy">Now showing: {activeCategory?.name ?? "All Departments"}</p>
          </div>

          <div className="category-grid">
            {storefront.categories.map((category) => (
              <button
                key={category.slug}
                className={`category-card ${selectedCategory === category.slug ? "active" : ""}`}
                onClick={() => onChangeCategory(category.slug)}
              >
                <strong>{category.name}</strong>
                <span>{category.teaser}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="savings-band">
          <div>
            <p className="eyebrow">Savings Snapshot</p>
            <h3>Promotions grouped around urgency, delivery and category breadth.</h3>
            <p>{filteredProducts.length} featured products match the current department and search filters.</p>
          </div>
          <div className="savings-tags">
            <span>Daily Deals</span>
            <span>Special Buy</span>
            <span>Free Delivery</span>
            <span>Pro Volume Pricing</span>
          </div>
        </section>

        <section className="product-section" id="featured-products">
          <div className="section-heading">
            <p className="eyebrow">Spring Black Friday Deals</p>
            <h2>Featured products with Home Depot-style density and hierarchy</h2>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => {
              const categoryName =
                storefront.categories.find((category) => category.slug === product.category_slug)?.name ??
                product.category_slug;

              return (
                <article className="product-card" key={product.id}>
                  <div className="product-topline">
                    <span className="badge-chip">{product.badge}</span>
                    <span className="tone-chip">{product.tone}</span>
                  </div>

                  <div className="product-visual">
                    <span>{categoryName}</span>
                    <strong>{product.tone}</strong>
                  </div>

                  <div className="product-meta">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                  </div>

                  <footer>
                    <div>
                      <p className="price-label">From</p>
                      <strong>{currencyFromCents(product.price_cents)}</strong>
                      <p>{categoryName}</p>
                    </div>
                    <button onClick={() => onAddToCart(product)}>Add to Cart</button>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <section className="services-section" id="services">
          <div className="section-heading">
            <p className="eyebrow">More Ways To Get It Done</p>
            <h2>Services belong next to the commerce, not outside it</h2>
          </div>

          <div className="service-grid">
            {storefront.services.map((service) => (
              <article className="service-card" key={service.name}>
                <p className="eyebrow">Service</p>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pro-section" id="pro-desk">
          <div className="pro-copy">
            <p className="eyebrow">Pro Services & Contractor Supply</p>
            <h2>Built for crews that need quotes, pickups and installs to move without friction.</h2>
            <p>
              The clone keeps the consumer storefront recognizable while still surfacing the operational
              muscle behind pickup windows, trade pricing and regional inventory flow.
            </p>
          </div>

          <div className="pro-panel">
            {storefront.pro_stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

type AdminViewProps = {
  activityFeed: ActivityItem[];
  adminTab: AdminTab;
  categories: Category[];
  dashboard: AdminDashboardPayload;
  discount: number;
  fulfillmentByStage: Record<string, FulfillmentItem[]>;
  highValueAccounts: { name: string; detail: string }[];
  onApplyCampaign: () => void;
  onBackToStore: () => void;
  onChangeDiscount: (value: number) => void;
  onChangeTab: (tab: AdminTab) => void;
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>;
  onCreateProduct: (input: CreateProductInput) => Promise<Product>;
  onRunSync: () => void;
  onSelectCampaign: (name: string) => void;
  products: Product[];
  selectedCampaign: CampaignOption | null;
  storeClusterBars: { label: string; width: string }[];
};

function AdminView({
  activityFeed,
  adminTab,
  categories,
  dashboard,
  discount,
  fulfillmentByStage,
  highValueAccounts,
  onApplyCampaign,
  onBackToStore,
  onChangeDiscount,
  onChangeTab,
  onCreateCategory,
  onCreateProduct,
  onRunSync,
  onSelectCampaign,
  products,
  selectedCampaign,
  storeClusterBars
}: AdminViewProps) {
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    slug: "",
    name: "",
    teaser: ""
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category_slug: categories[0]?.slug ?? "all",
    price: "",
    badge: "",
    description: "",
    tone: "",
    featured: true
  });
  const [categoryFeedback, setCategoryFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [productFeedback, setProductFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    setProductForm((current) =>
      categories.some((category) => category.slug === current.category_slug)
        ? current
        : { ...current, category_slug: categories[0].slug }
    );
  }, [categories]);

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingCategory(true);
    setCategoryFeedback(null);

    try {
      const payload: CreateCategoryInput = {
        slug: slugify(categoryForm.slug || categoryForm.name),
        name: categoryForm.name.trim(),
        teaser: categoryForm.teaser.trim()
      };

      const category = await onCreateCategory(payload);

      setCategoryForm({ slug: "", name: "", teaser: "" });
      setProductForm((current) => ({ ...current, category_slug: category.slug }));
      setCategoryFeedback({ kind: "success", message: `${category.name} is ready for products.` });
    } catch (error) {
      setCategoryFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create category."
      });
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingProduct(true);
    setProductFeedback(null);

    try {
      const normalizedPrice = Math.round(Number(productForm.price) * 100);

      if (Number.isNaN(normalizedPrice)) {
        throw new Error("Enter a valid product price.");
      }

      const product = await onCreateProduct({
        name: productForm.name.trim(),
        category_slug: productForm.category_slug,
        price_cents: normalizedPrice,
        badge: productForm.badge.trim(),
        description: productForm.description.trim(),
        tone: productForm.tone.trim(),
        featured: productForm.featured
      });

      setProductForm((current) => ({
        ...current,
        name: "",
        price: "",
        badge: "",
        description: "",
        tone: "",
        featured: true
      }));
      setProductFeedback({
        kind: "success",
        message: product.featured
          ? `${product.name} is live on the storefront.`
          : `${product.name} was created and saved as hidden.`
      });
    } catch (error) {
      setProductFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create product."
      });
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <DepotMark compact />
          <div>
            <p className="eyebrow">Internal Retail Tools</p>
            <h1>Ops Console</h1>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {(["overview", "inventory", "fulfillment", "campaigns", "catalog"] as AdminTab[]).map((tab) => (
            <button
              key={tab}
              className={`admin-nav-item ${adminTab === tab ? "active" : ""}`}
              onClick={() => onChangeTab(tab)}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Console Focus</p>
          <h3>Clone support modules</h3>
          <ul>
            <li>Promo timing and hero swaps</li>
            <li>Regional stock and pickup readiness</li>
            <li>Trade quote and install visibility</li>
          </ul>
        </div>

        <button className="outline-button" onClick={onBackToStore}>
          Back to Storefront
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Store Operations</p>
            <h2>Merchandising, fulfillment and promo controls</h2>
          </div>
          <div className="admin-actions">
            <button className="solid-button" onClick={onRunSync}>
              Run Supplier Sync
            </button>
          </div>
        </header>

        {adminTab === "overview" ? (
          <section className="admin-section active">
            <div className="metric-grid">
              {dashboard.metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  <span>{metric.detail}</span>
                </article>
              ))}
            </div>

            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Regional performance</p>
                    <h3>Store cluster momentum</h3>
                  </div>
                  <span className="status-pill live">Live</span>
                </div>
                <div className="bar-chart">
                  {storeClusterBars.map((bar) => (
                    <div key={bar.label}>
                      <span>{bar.label}</span>
                      <strong style={{ width: bar.width }}>{bar.width}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Trade account radar</p>
                    <h3>High-value customers</h3>
                  </div>
                  <span className="status-pill">Tracked</span>
                </div>
                <div className="customer-list">
                  {highValueAccounts.map((account) => (
                    <div key={account.name}>
                      <strong>{account.name}</strong>
                      <span>{account.detail}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        {adminTab === "inventory" ? (
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Inventory health</p>
                <h3>Replenishment watchlist</h3>
              </div>
              <span className="status-pill warning">Attention</span>
            </div>
            <div className="inventory-table">
              <div className="inventory-row inventory-header">
                <strong>Department</strong>
                <strong>On Hand</strong>
                <strong>Lead Region</strong>
                <strong>Status</strong>
                <strong>Notes</strong>
              </div>
              {dashboard.inventory.map((item) => (
                <div className="inventory-row" key={item.department}>
                  <span>{item.department}</span>
                  <span>{item.on_hand}</span>
                  <span>{item.lead_region}</span>
                  <span
                    className={`status-pill ${
                      item.status === "Healthy" ? "live" : item.status === "Low" ? "warning" : ""
                    }`}
                  >
                    {item.status}
                  </span>
                  <span>{item.note}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {adminTab === "fulfillment" ? (
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Fulfillment board</p>
                <h3>Order flow by stage</h3>
              </div>
              <span className="status-pill live">Real time</span>
            </div>
            <div className="fulfillment-grid">
              {Object.entries(fulfillmentByStage).map(([stage, items]) => (
                <article className="fulfillment-column" key={stage}>
                  <h4>{stage}</h4>
                  {items.map((item) => (
                    <div className="task-card" key={item.title}>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {adminTab === "campaigns" ? (
          <section className="admin-section active">
            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Campaign composer</p>
                    <h3>Promo controls</h3>
                  </div>
                  <span className="status-pill">Editable</span>
                </div>
                <div className="campaign-controls">
                  <label>
                    Featured department
                    <select
                      value={selectedCampaign?.name ?? ""}
                      onChange={(event) => onSelectCampaign(event.target.value)}
                    >
                      {dashboard.campaigns.map((campaign) => (
                        <option key={campaign.name} value={campaign.name}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Offer intensity
                    <input
                      max={40}
                      min={10}
                      onChange={(event) => onChangeDiscount(Number(event.target.value))}
                      type="range"
                      value={discount}
                    />
                  </label>
                  <button className="solid-button" onClick={onApplyCampaign}>
                    Apply Campaign Update
                  </button>
                </div>
              </article>

              <article className="dashboard-panel campaign-preview">
                <p className="eyebrow">Live preview</p>
                <h3>{selectedCampaign?.name ?? "Campaign"}</h3>
                <strong>{discount}% off</strong>
                <p>{selectedCampaign?.description ?? "Select a campaign to update the preview."}</p>
              </article>
            </div>
          </section>
        ) : null}

        {adminTab === "catalog" ? (
          <section className="admin-section active">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Catalog manager</p>
                <h3>Create categories and products</h3>
              </div>
              <span className="status-pill live">Writable</span>
            </div>

            <div className="catalog-grid">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">New category</p>
                    <h3>Add a department to the storefront</h3>
                  </div>
                  <span className="status-pill">{categories.length} total</span>
                </div>

                <form className="admin-form" onSubmit={handleCreateCategory}>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      Category name
                      <input
                        value={categoryForm.name}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Ceiling Fans"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Slug
                      <input
                        value={categoryForm.slug}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, slug: event.target.value }))
                        }
                        placeholder="Auto-generated if left blank"
                      />
                    </label>
                  </div>

                  <label className="admin-field">
                    Teaser
                    <textarea
                      value={categoryForm.teaser}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, teaser: event.target.value }))
                      }
                      placeholder="Fans, lighting and comfort upgrades for every room."
                      rows={4}
                      required
                    />
                  </label>

                  {categoryFeedback ? (
                    <p className={`catalog-feedback ${categoryFeedback.kind}`}>{categoryFeedback.message}</p>
                  ) : null}

                  <div className="form-actions">
                    <button className="solid-button" disabled={isCreatingCategory} type="submit">
                      {isCreatingCategory ? "Creating..." : "Create Category"}
                    </button>
                  </div>
                </form>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">New product</p>
                    <h3>Publish a new storefront item</h3>
                  </div>
                  <span className="status-pill">{products.length} featured</span>
                </div>

                <form className="admin-form" onSubmit={handleCreateProduct}>
                  <div className="admin-form-grid">
                    <label className="admin-field">
                      Product name
                      <input
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Home Decorators Ceiling Fan"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Category
                      <select
                        value={productForm.category_slug}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, category_slug: event.target.value }))
                        }
                      >
                        {categories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      Price
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, price: event.target.value }))
                        }
                        placeholder="249.00"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Badge
                      <input
                        value={productForm.badge}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, badge: event.target.value }))
                        }
                        placeholder="New Arrival"
                        required
                      />
                    </label>

                    <label className="admin-field">
                      Brand / tone
                      <input
                        value={productForm.tone}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, tone: event.target.value }))
                        }
                        placeholder="Home Decorators Collection"
                        required
                      />
                    </label>
                  </div>

                  <label className="admin-field">
                    Description
                    <textarea
                      value={productForm.description}
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Modern finish, integrated light kit and remote control for easy installs."
                      rows={4}
                      required
                    />
                  </label>

                  <label className="checkbox-field">
                    <input
                      checked={productForm.featured}
                      type="checkbox"
                      onChange={(event) =>
                        setProductForm((current) => ({ ...current, featured: event.target.checked }))
                      }
                    />
                    Show this product on the storefront immediately
                  </label>

                  {productFeedback ? (
                    <p className={`catalog-feedback ${productFeedback.kind}`}>{productFeedback.message}</p>
                  ) : null}

                  <div className="form-actions">
                    <button className="solid-button" disabled={isCreatingProduct} type="submit">
                      {isCreatingProduct ? "Creating..." : "Create Product"}
                    </button>
                  </div>
                </form>
              </article>
            </div>

            <div className="admin-panels two-up">
              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Current categories</p>
                    <h3>Available department slugs</h3>
                  </div>
                </div>
                <div className="catalog-list">
                  {categories.map((category) => (
                    <div key={category.slug}>
                      <strong>{category.name}</strong>
                      <span>{category.slug}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Storefront products</p>
                    <h3>Recently merchandised items</h3>
                  </div>
                </div>
                <div className="catalog-list">
                  {products.slice(-6).reverse().map((product) => (
                    <div key={product.id}>
                      <strong>{product.name}</strong>
                      <span>{product.featured ? "Live on storefront" : "Saved as hidden"}</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>
        ) : null}

        <section className="dashboard-panel activity-feed">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3>Team log</h3>
            </div>
            <span className="status-pill">Updated</span>
          </div>
          <div className="activity-list">
            {activityFeed.map((item, index) => (
              <div key={`${item.happened_at}-${item.detail}-${index}`}>
                <strong>{item.happened_at}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

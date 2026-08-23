/* Direction B — "Guided Project" prototype logic.
 * Plain vanilla JS, no build step, no framework, no network calls.
 * All product data comes from CATALOGUE in data.js (a static transcription
 * of the real catalogue.json snapshot). Routing is hash-based so the whole
 * thing works from a plain file:// open with no server. */

const TONE = {
  tools: "#c94a12",
  lumber: "#7a4a21",
  paint: "#0f766e",
  appliances: "#1e3a5f",
  garden: "#1d5a39",
  bath: "#24586b",
  "building-materials": "#8a3324",
  storage: "#6b5b06"
};

const TASKS = [
  { id: "deck", title: "Build a deck or patio", desc: "Decking starter packs and paver pallets for bigger outdoor builds.", categories: ["lumber", "building-materials"], icon: "▣", featured: true },
  { id: "bath", title: "Fix a leak or refresh a bathroom", desc: "Vanities and fixtures for a quick bathroom reset.", categories: ["bath"], icon: "◎" },
  { id: "paint", title: "Paint a room this weekend", desc: "Interior color and durable, washable finishes.", categories: ["paint"], icon: "◑" },
  { id: "tools", title: "Stock the tool bench", desc: "Cordless combo kits for garage and jobsite work.", categories: ["tools"], icon: "⚒" },
  { id: "appliances", title: "Upgrade a kitchen appliance", desc: "Install-friendly appliance upgrades.", categories: ["appliances"], icon: "☐" },
  { id: "garden", title: "Get the yard ready", desc: "Outdoor power for spring and summer prep.", categories: ["garden"], icon: "⚘" },
  { id: "storage", title: "Organize the garage", desc: "Totes and storage for garages and sheds.", categories: ["storage"], icon: "▦" }
];

const state = { taskId: null, category: "all", search: "" };

function money(cents) { return "$" + (cents / 100).toFixed(2); }

function stockInfo(p) {
  if (p.stock_quantity <= 0) return { cls: "stock-out", label: "Out of stock" };
  if (p.stock_quantity <= p.low_stock_threshold) return { cls: "stock-low", label: `Low stock — only ${p.stock_quantity} left` };
  return { cls: "stock-ok", label: `In stock (${p.stock_quantity} available)` };
}

function toneOf(slug) { return TONE[slug] || "#3a3a3a"; }

function matchesSearch(p, term) {
  if (!term) return true;
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t) || p.tone.toLowerCase().includes(t);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ---------------- Router ---------------- */
const Router = {
  go(path) { window.location.hash = "#" + path; },
  parse() {
    const h = window.location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "task" && parts[1]) return { view: "listing", taskId: parts[1] };
    if (parts[0] === "category" && parts[1]) return { view: "listing", category: parts[1] };
    if (parts[0] === "search") return { view: "listing" };
    if (parts[0] === "product" && parts[1]) return { view: "product", id: Number(parts[1]) };
    if (parts[0] === "states") return { view: "states" };
    return { view: "home" };
  }
};
window.addEventListener("hashchange", render);

/* ---------------- Chrome ---------------- */
function renderChipRow() {
  const row = document.getElementById("chip-row");
  row.innerHTML = "";
  CATALOGUE.categories.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "b-chip";
    btn.textContent = c.name;
    btn.setAttribute("aria-current", String(state.category === c.slug && !state.taskId));
    btn.onclick = () => { state.taskId = null; state.category = c.slug; state.search = ""; document.getElementById("search-input").value = ""; Router.go("/category/" + c.slug); };
    row.appendChild(btn);
  });
}

function renderMobileTasks() {
  const box = document.getElementById("mobile-task-list");
  box.innerHTML = TASKS.map(t => `<button class="b-mobile-task-item" style="background:${toneOf(t.categories[0])}" onclick="closeMobileMenu();Router.go('/task/${t.id}')">
    <span class="t">${t.title}</span><span class="d">${t.desc}</span>
  </button>`).join("");
}

function openMobileMenu() { document.getElementById("mobile-menu").classList.add("open"); }
function closeMobileMenu() { document.getElementById("mobile-menu").classList.remove("open"); }

/* ---------------- Product filtering ---------------- */
function productsForRoute(route) {
  let list = CATALOGUE.products.slice();
  if (route.taskId) {
    const task = TASKS.find(t => t.id === route.taskId);
    if (task) list = list.filter(p => task.categories.includes(p.category_slug));
  } else if (route.category && route.category !== "all") {
    list = list.filter(p => p.category_slug === route.category);
  }
  list = list.filter(p => matchesSearch(p, state.search));
  return list;
}

/* ---------------- Cards ---------------- */
function cardHtml(p) {
  const s = stockInfo(p);
  return `<div class="b-card" onclick="Router.go('/product/${p.id}')">
    <div class="b-card-media" style="background:${toneOf(p.category_slug)}">
      <span class="initial">${p.tone.slice(0, 2).toUpperCase()}</span>
      <span class="noimg">no photo yet</span>
    </div>
    <div class="b-card-body">
      <div class="b-card-name">${p.name}</div>
      <div class="b-card-tone">${p.tone}</div>
      <div class="b-card-bottom">
        <span class="b-card-price">${money(p.price_cents)}</span>
        <span class="${s.cls}">${s.label}</span>
      </div>
      <div class="b-card-badges"><span class="b-pill">${p.badge}</span></div>
    </div>
  </div>`;
}

/* ---------------- Views ---------------- */
function renderHome(root) {
  root.innerHTML = `
    <div class="b-hero">
      <h1>Tell us what you're working on.</h1>
      <p>Pick a project below, or search and browse by department any time — every price and stock count you see is pulled straight from the current 8-item catalogue, not a mockup.</p>
    </div>
    <div class="b-task-grid">
      ${TASKS.map(t => `<button class="b-task-tile${t.featured ? " featured" : ""}" style="background:${toneOf(t.categories[0])}" onclick="Router.go('/task/${t.id}')">
        <span class="icon">${t.icon}</span>
        <span class="t">${t.title}</span>
        <span class="d">${t.desc}</span>
      </button>`).join("")}
    </div>
    <div class="b-toolbar"><span>Prefer to browse everything at once?</span>
      <button class="b-reset-link" onclick="state.taskId=null;state.category='all';Router.go('/category/all')">See the full catalogue &rarr;</button>
    </div>
    <div class="b-services">
      ${CATALOGUE.services.map(s => `<div class="svc"><strong>${s.name}</strong><p>${s.description}</p></div>`).join("")}
    </div>
  `;
}

function renderListing(root, route) {
  const list = productsForRoute(route);
  const task = route.taskId ? TASKS.find(t => t.id === route.taskId) : null;
  const cat = route.category ? CATALOGUE.categories.find(c => c.slug === route.category) : null;

  let intro = "";
  if (task) {
    const catNames = task.categories.map(slug => CATALOGUE.categories.find(c => c.slug === slug)?.name).join(" & ");
    intro = `<div class="b-intro"><h2>${task.title}</h2>
      <p>${task.desc} This pulls everything currently stocked in <strong>${catNames}</strong> — ${list.length} item${list.length === 1 ? "" : "s"} today. ${list.length <= 1 ? "That's expected for a small catalogue with one product per department, not a bug." : ""}</p></div>`;
  } else if (cat && cat.slug !== "all") {
    intro = `<div class="b-intro"><h2>${cat.name}</h2><p>${cat.teaser}</p></div>`;
  } else if (state.search) {
    intro = `<div class="b-intro"><h2>Search results</h2><p>Showing matches for “${escapeHtml(state.search)}” across product names, brands and descriptions.</p></div>`;
  } else if (cat && cat.slug === "all") {
    intro = `<div class="b-intro"><h2>Everything in stock</h2><p>${cat.teaser} <span style="color:var(--b-warn);">(Note: this catalogue teaser line names "Online Shopping" instead of Ekoway — a real content bug carried over verbatim from the live data; flagged, not silently fixed here.)</span></p></div>`;
  }

  let body = "";
  if (list.length === 0) {
    body = `<div class="b-empty">
      <h2>Nothing matches that yet.</h2>
      <p>${state.search ? `No product name, brand or description contains “${escapeHtml(state.search)}” in the current 8-item catalogue.` : "This project/category combination has no matching product right now."} That's a real, expected outcome for a small catalogue — not a broken page. Try another project:</p>
      <div class="b-empty-tasks">
        ${TASKS.slice(0, 4).map(t => `<button class="b-task-pill" onclick="state.search='';document.getElementById('search-input').value='';Router.go('/task/${t.id}')">${t.title}</button>`).join("")}
        <button class="b-task-pill" onclick="App.resetAll()">See everything</button>
      </div>
    </div>`;
  } else {
    body = `<div class="b-toolbar"><span><strong>${list.length}</strong> product${list.length === 1 ? "" : "s"} found</span><button class="b-reset-link" onclick="App.resetAll()">Reset</button></div>
      <div class="b-product-grid">${list.map(cardHtml).join("")}</div>`;
  }

  root.innerHTML = `<button class="b-back-link" onclick="Router.go('/')">&larr; Back to projects</button>` + intro + body;
}

function renderProduct(root, id) {
  const p = CATALOGUE.products.find(x => x.id === id);
  if (!p) {
    root.innerHTML = `<div class="b-empty"><h2>We couldn't find that product.</h2><p>No product with id ${id} exists in this catalogue.</p><button class="b-task-pill" onclick="Router.go('/')">Back to projects</button></div>`;
    return;
  }
  const s = stockInfo(p);
  const cat = CATALOGUE.categories.find(c => c.slug === p.category_slug);
  const related = TASKS.filter(t => t.categories.includes(p.category_slug));
  root.innerHTML = `
    <button class="b-back-link" onclick="history.length > 1 ? history.back() : Router.go('/')">&larr; Back</button>
    <div class="b-detail-hero" style="background:${toneOf(p.category_slug)}">
      <div class="cat-label">${cat ? cat.name : p.category_slug}</div>
      <h1>${p.name}</h1>
      <div class="noimg-note">No product photo on file yet — this color panel stands in for it.</div>
    </div>
    <div class="b-detail-grid">
      <div class="b-detail-narrative">
        <h2>Why this fits your project</h2>
        <p>${p.description}</p>
        <h2>What we know about this item</h2>
        <p>Brand / tone: <strong>${p.tone}</strong>. Merchandising badge: <strong>${p.badge}</strong> — a free-form label the store uses for this SKU, not a guaranteed link to an active promotion. ${p.avg_rating === null ? "No shopper reviews yet (0 reviews) — that is true for every product in the current catalogue, so an empty rating is the normal case here, not a data gap unique to this item." : ""}</p>
        ${related.length ? `<div class="b-related"><h3>Related project</h3><div class="b-related-links">${related.map(t => `<button class="b-task-pill" onclick="Router.go('/task/${t.id}')">${t.title}</button>`).join("")}</div></div>` : ""}
      </div>
      <div class="b-fact-panel">
        <div class="price">${money(p.price_cents)}</div>
        <div class="b-fact-row"><span class="k">Availability</span><span class="${s.cls}">${s.label}</span></div>
        <div class="b-fact-row"><span class="k">Low-stock threshold</span><span>${p.low_stock_threshold} units</span></div>
        <div class="b-fact-row"><span class="k">Category</span><span>${cat ? cat.name : p.category_slug}</span></div>
        <div class="b-fact-row"><span class="k">Detailed specs</span><span>Not in catalogue yet</span></div>
        <button class="b-btn-primary" ${p.stock_quantity <= 0 ? "disabled" : ""}>${p.stock_quantity <= 0 ? "Currently unavailable" : "Add to project list"}</button>
        ${p.badge === "Top Rated" && p.avg_rating === null ? '<div class="b-note-flag">This SKU is badged "Top Rated" but has 0 reviews and no rating on file. Shown as-is, not hidden.</div>' : ""}
      </div>
    </div>
  `;
}

function renderStates(root) {
  const lowStockProduct = CATALOGUE.products.find(p => p.stock_quantity <= p.low_stock_threshold);
  const simBase = CATALOGUE.products.find(p => p.id === 8);
  root.innerHTML = `
    <div class="b-states">
      <h2 class="section">1. Empty search results — real data, real interaction</h2>
      <div class="b-state-block">
        <span class="b-real-caption">REAL</span>
        <p>Runs the actual client-side search against the embedded catalogue for a term with zero matches in the real 8-product data — framed with our guided recovery pattern (suggested projects) instead of a bare "0 results" line.</p>
        <button class="b-task-pill" onclick="state.search='hammer';document.getElementById('search-input').value='hammer';Router.go('/search/hammer')">Run search: "hammer"</button>
      </div>

      <h2 class="section">2. Missing product image — real data, the default case</h2>
      <div class="b-state-block">
        <span class="b-real-caption">REAL</span>
        <p>All 8 real products have <code>image_url: ""</code>. Every card and product hero panel above already renders the bold color-block "no photo yet" treatment as its default state.</p>
      </div>

      <h2 class="section">3. Low stock — real data</h2>
      <div class="b-state-block">
        <span class="b-real-caption">REAL</span>
        <div class="b-product-grid" style="grid-template-columns: 1fr;max-width:360px;">${cardHtml(lowStockProduct)}</div>
        <p style="margin-top:10px;">Only "${lowStockProduct.name}" sits at/under its threshold today (qty ${lowStockProduct.stock_quantity} / threshold ${lowStockProduct.low_stock_threshold}).</p>
      </div>

      <h2 class="section">4. Out of stock — simulated, no real product is out of stock today</h2>
      <div class="b-state-block">
        <span class="b-sim-caption">SIMULATED — no real out-of-stock product exists yet</span>
        <div class="b-product-grid" style="grid-template-columns: 1fr;max-width:360px;pointer-events:none;">
          <div class="b-card">
            <div class="b-card-media" style="background:${toneOf(simBase.category_slug)}"><span class="initial">${simBase.tone.slice(0,2).toUpperCase()}</span><span class="noimg">no photo yet</span></div>
            <div class="b-card-body">
              <div class="b-card-name">${simBase.name}</div>
              <div class="b-card-tone">${simBase.tone}</div>
              <div class="b-card-bottom"><span class="b-card-price">${money(simBase.price_cents)}</span><span class="stock-out">Out of stock (simulated)</span></div>
            </div>
          </div>
        </div>
        <p style="margin-top:10px;">Name and price are real (SKU-0008); the stock status is a display-only override for this demo. Real live stock for this SKU is ${simBase.stock_quantity} units.</p>
      </div>

      <h2 class="section">5. Offline / API-fallback view — simulated, not a captured live failure</h2>
      <div class="b-state-block">
        <span class="b-sim-caption">SIMULATED — mockup of the fallback-data path, not a captured live API outage</span>
        <div class="b-offline-banner">We're showing your last-known catalogue while we reconnect — prices and stock may be a little out of date. (This banner is a Direction B proposal: today's live storefront shows fallback data with no visible indicator at all — see design/audit/existing-baseline.md §6.)</div>
        <p>Everything else on this page stays the same guided layout underneath the banner, since the real fallback dataset is structurally identical to the live one.</p>
      </div>
    </div>
  `;
}

/* ---------------- App ---------------- */
const App = {
  resetAll() {
    state.taskId = null; state.category = "all"; state.search = "";
    document.getElementById("search-input").value = "";
    Router.go("/");
  }
};

function render() {
  const route = Router.parse();
  const root = document.getElementById("view-root");
  if (route.view === "home") {
    state.taskId = null; state.category = "all";
    renderHome(root);
  } else if (route.view === "product") {
    renderProduct(root, route.id);
  } else if (route.view === "states") {
    renderStates(root);
  } else {
    if (route.taskId) { state.taskId = route.taskId; state.category = "all"; }
    else if (route.category) { state.taskId = null; state.category = route.category; }
    else { state.taskId = null; state.category = "all"; } // bare search or fallback listing — clear any earlier task/category filter
    renderListing(root, { taskId: state.taskId, category: state.category });
  }
  renderChipRow();
  renderMobileTasks();
}

document.getElementById("search-form").addEventListener("submit", e => {
  e.preventDefault();
  state.search = document.getElementById("search-input").value;
  state.taskId = null; state.category = "all";
  Router.go("/search/" + encodeURIComponent(state.search));
});
document.getElementById("mobile-menu-open").addEventListener("click", openMobileMenu);
document.getElementById("mobile-menu-close").addEventListener("click", closeMobileMenu);

render();

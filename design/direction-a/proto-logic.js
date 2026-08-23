/* Direction A — "Trade Counter" prototype logic.
 * Plain vanilla JS, no build step, no framework, no network calls.
 * All product data comes from CATALOGUE in data.js (a static transcription
 * of the real catalogue.json snapshot). Routing is hash-based so the whole
 * thing works from a plain file:// open with no server. */

const state = {
  category: "all",
  search: "",
  priceBand: null,   // 'u50' | '50-150' | '150-400' | '400plus'
  stockFilter: null  // 'in' | 'low'
};

function money(cents) {
  return "$" + (cents / 100).toFixed(2);
}

function stockInfo(p) {
  // Real data has no out-of-stock product (see design/audit/catalogue-hard-cases.md);
  // this only ever renders "ok" or "low" for real products. The simulated
  // out-of-stock case lives exclusively on the /states page.
  if (p.stock_quantity <= 0) return { cls: "stock-out", label: "Out of stock" };
  if (p.stock_quantity <= p.low_stock_threshold) return { cls: "stock-low", label: `Low stock — ${p.stock_quantity} left` };
  return { cls: "stock-ok", label: `In stock — ${p.stock_quantity} avail.` };
}

function matchesSearch(p, term) {
  if (!term) return true;
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return (
    p.name.toLowerCase().includes(t) ||
    p.description.toLowerCase().includes(t) ||
    p.tone.toLowerCase().includes(t)
  );
}

function matchesPrice(p, band) {
  if (!band) return true;
  const d = p.price_cents / 100;
  if (band === "u50") return d < 50;
  if (band === "50-150") return d >= 50 && d < 150;
  if (band === "150-400") return d >= 150 && d < 400;
  if (band === "400plus") return d >= 400;
  return true;
}

function matchesStock(p, filter) {
  if (!filter) return true;
  if (filter === "low") return p.stock_quantity <= p.low_stock_threshold;
  if (filter === "in") return p.stock_quantity > 0;
  return true;
}

function matchesCategory(p, cat) {
  if (!cat || cat === "all") return true;
  return p.category_slug === cat;
}

function filteredProducts() {
  return CATALOGUE.products.filter(p =>
    matchesCategory(p, state.category) &&
    matchesSearch(p, state.search) &&
    matchesPrice(p, state.priceBand) &&
    matchesStock(p, state.stockFilter)
  );
}

/* ---------------- Router ---------------- */
const Router = {
  go(path) { window.location.hash = "#" + path; },
  parse() {
    const h = window.location.hash.replace(/^#/, "") || "/";
    const parts = h.split("/").filter(Boolean);
    if (parts[0] === "category" && parts[1]) return { view: "listing", category: parts[1] };
    if (parts[0] === "product" && parts[1]) return { view: "product", id: Number(parts[1]) };
    if (parts[0] === "states") return { view: "states" };
    return { view: "listing", category: state.category };
  }
};

window.addEventListener("hashchange", render);

/* ---------------- Chrome: department bar + drawer + facets ---------------- */
function renderDeptChips() {
  const row = document.getElementById("dept-chip-row");
  row.innerHTML = "";
  CATALOGUE.categories.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "a-dept-chip";
    btn.textContent = c.name;
    btn.setAttribute("aria-current", String(state.category === c.slug));
    btn.onclick = () => { state.category = c.slug; state.search = ""; document.getElementById("search-input").value = ""; Router.go("/"); };
    row.appendChild(btn);
  });

  const drawerList = document.getElementById("drawer-dept-list");
  drawerList.innerHTML = "";
  CATALOGUE.categories.forEach(c => {
    const btn = document.createElement("button");
    btn.className = "a-chip-btn";
    btn.style.display = "block";
    btn.style.width = "100%";
    btn.style.textAlign = "left";
    btn.style.marginBottom = "4px";
    btn.textContent = c.name;
    btn.onclick = () => { state.category = c.slug; closeDrawer(); Router.go("/"); };
    drawerList.appendChild(btn);
  });
}

function renderFacets() {
  const catBox = document.getElementById("facet-category");
  catBox.innerHTML = "";
  const bySearch = CATALOGUE.products.filter(p => matchesSearch(p, state.search));
  CATALOGUE.categories.forEach(c => {
    const count = c.slug === "all" ? bySearch.length : bySearch.filter(p => p.category_slug === c.slug).length;
    const row = document.createElement("div");
    row.className = "a-facet-row";
    row.innerHTML = `<input type="radio" name="cat" id="cat-${c.slug}" ${state.category === c.slug ? "checked" : ""}>
      <label for="cat-${c.slug}">${c.name}</label><span class="a-facet-count">${count}</span>`;
    row.querySelector("input").onchange = () => { state.category = c.slug; render(); };
    catBox.appendChild(row);
  });

  const priceBox = document.getElementById("facet-price");
  priceBox.innerHTML = "";
  [["", "Any price"], ["u50", "Under $50"], ["50-150", "$50 – $150"], ["150-400", "$150 – $400"], ["400plus", "$400+"]].forEach(([val, label]) => {
    const row = document.createElement("div");
    row.className = "a-facet-row";
    row.innerHTML = `<input type="radio" name="price" id="price-${val || 'any'}" ${(!state.priceBand && !val) || state.priceBand === val ? "checked" : ""}>
      <label for="price-${val || 'any'}">${label}</label>`;
    row.querySelector("input").onchange = () => { state.priceBand = val || null; render(); };
    priceBox.appendChild(row);
  });

  const stockBox = document.getElementById("facet-stock");
  stockBox.innerHTML = "";
  [["", "Any"], ["in", "In stock"], ["low", "Low stock only"]].forEach(([val, label]) => {
    const row = document.createElement("div");
    row.className = "a-facet-row";
    row.innerHTML = `<input type="radio" name="stock" id="stock-${val || 'any'}" ${(!state.stockFilter && !val) || state.stockFilter === val ? "checked" : ""}>
      <label for="stock-${val || 'any'}">${label}</label>`;
    row.querySelector("input").onchange = () => { state.stockFilter = val || null; render(); };
    stockBox.appendChild(row);
  });

  document.getElementById("drawer-facets").innerHTML =
    '<p style="font-size:12px;color:var(--a-text-faint);">Full facet controls are on the desktop sidebar. On mobile, use department links above or the search bar to narrow results.</p>';
}

function renderServices() {
  const box = document.getElementById("footer-services");
  box.innerHTML = CATALOGUE.services.map(s => `<div><strong>${s.name}</strong>${s.description}</div>`).join("");
}

/* ---------------- Drawer ---------------- */
function openDrawer() {
  document.getElementById("mobile-drawer").classList.add("open");
  document.getElementById("drawer-backdrop").classList.add("open");
}
function closeDrawer() {
  document.getElementById("mobile-drawer").classList.remove("open");
  document.getElementById("drawer-backdrop").classList.remove("open");
}

/* ---------------- Views ---------------- */
function renderListingView(container) {
  const list = filteredProducts();
  let html = "";

  if (state.category === "all" && !state.search && !state.priceBand && !state.stockFilter) {
    html += `<div class="a-cat-grid">` + CATALOGUE.categories.filter(c => c.slug !== "all").map(c =>
      `<button class="a-cat-tile" onclick="state.category='${c.slug}';render()"><span class="name">${c.name}</span><span class="teaser">${c.teaser}</span></button>`
    ).join("") + `</div>`;
  }

  html += `<div class="a-toolbar"><span><strong>${list.length}</strong> result${list.length === 1 ? "" : "s"}${state.search ? ` for “${escapeHtml(state.search)}”` : ""}${state.category !== "all" ? ` · ${CATALOGUE.categories.find(c=>c.slug===state.category)?.name || state.category}` : ""}</span>
    <button class="a-reset-link" onclick="App.resetFilters()">Reset</button></div>`;

  if (list.length === 0) {
    html += `<div class="a-empty">
      <div class="a-empty-code">RESULT_COUNT = 0</div>
      <h2>No SKUs match this query.</h2>
      <p>Nothing in the current 8-item catalogue matches <strong>${state.search ? `“${escapeHtml(state.search)}”` : "the selected filters"}</strong>. This is a real, expected outcome for an 8-product catalogue with one item per category — not an error state. Broaden the query or clear a filter below.</p>
      <div class="a-empty-suggest">
        <button class="a-chip-btn" onclick="App.resetFilters()">Clear all filters</button>
        <button class="a-chip-btn" onclick="state.search='';state.category='tools';document.getElementById('search-input').value='';render()">Try: Tools</button>
        <button class="a-chip-btn" onclick="state.search='paint';state.category='all';document.getElementById('search-input').value='paint';render()">Try: “paint”</button>
      </div>
    </div>`;
  } else {
    html += `<table class="a-table"><thead><tr>
      <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Badge</th>
    </tr></thead><tbody>` + list.map(rowHtml).join("") + `</tbody></table>`;
    html += `<div class="a-rowcards">` + list.map(rowCardHtml).join("") + `</div>`;
  }

  container.innerHTML = html;
}

function rowHtml(p) {
  const s = stockInfo(p);
  const cat = CATALOGUE.categories.find(c => c.slug === p.category_slug);
  return `<tr class="a-row" onclick="Router.go('/product/${p.id}')">
    <td><span class="cell-name">${p.name}</span><span class="cell-tone">${p.tone}${p.image_url ? "" : " · no image on file"}</span></td>
    <td class="cell-cat">${cat ? cat.name : p.category_slug}</td>
    <td class="cell-price">${money(p.price_cents)}</td>
    <td class="cell-stock ${s.cls}">${s.label}</td>
    <td class="cell-badge"><span class="a-badge-pill">${p.badge}</span></td>
  </tr>`;
}

function rowCardHtml(p) {
  const s = stockInfo(p);
  return `<div class="a-rowcard" onclick="Router.go('/product/${p.id}')">
    <div class="a-rowcard-top">
      <div><div class="a-rowcard-name">${p.name}</div><div class="a-rowcard-tone">${p.tone}</div></div>
      <div class="a-rowcard-price">${money(p.price_cents)}</div>
    </div>
    <div class="a-rowcard-meta"><span class="${s.cls}">${s.label}</span><span class="a-badge-pill">${p.badge}</span></div>
  </div>`;
}

function renderProductView(container, id) {
  const p = CATALOGUE.products.find(x => x.id === id);
  if (!p) {
    container.innerHTML = `<div class="a-empty"><h2>SKU not found</h2><p>No product with id ${id} exists in this catalogue.</p><button class="a-chip-btn" onclick="Router.go('/')">Back to listing</button></div>`;
    return;
  }
  const s = stockInfo(p);
  const cat = CATALOGUE.categories.find(c => c.slug === p.category_slug);
  container.innerHTML = `<div class="a-detail">
    <div class="a-detail-media">
      <span class="tag">NO IMAGE ON FILE</span>
      <span class="tag">SKU-${String(p.id).padStart(4, "0")}</span>
    </div>
    <div class="a-detail-body">
      <div class="a-detail-breadcrumb"><button onclick="Router.go('/')">&larr; Back to listing</button> / ${cat ? cat.name : p.category_slug}</div>
      <h1 class="a-detail-title">${p.name}</h1>
      <div class="a-detail-tone">Brand / tone: ${p.tone} &nbsp;·&nbsp; <span class="${s.cls}">${s.label}</span></div>
      <div class="a-detail-price">${money(p.price_cents)}</div>
      <table class="a-spec-table">
        <tr><th>Category</th><td>${cat ? cat.name : p.category_slug}</td></tr>
        <tr><th>Availability</th><td class="${s.cls}">${s.label} (threshold: ${p.low_stock_threshold})</td></tr>
        <tr><th>Merchandising badge</th><td>${p.badge} <span style="color:var(--a-text-faint);">— free-form label, not a linked promotion</span></td></tr>
        <tr><th>Rating</th><td>${p.avg_rating === null ? "No rating yet — 0 reviews" : p.avg_rating}</td></tr>
        <tr><th>Detailed spec sheet</th><td style="color:var(--a-text-faint);">Not provided for this SKU in the current catalogue schema (no dimensions/weight/materials fields exist yet).</td></tr>
      </table>
      <p class="a-detail-desc">${p.description}</p>
      <div class="a-cta-row">
        <button class="a-btn-primary" ${p.stock_quantity <= 0 ? "disabled" : ""}>${p.stock_quantity <= 0 ? "Unavailable" : "Add to Cart"}</button>
        <span style="color:var(--a-text-faint);font-size:12.5px;">Prototype only — no cart/checkout wiring.</span>
      </div>
      ${p.badge === "Top Rated" && p.avg_rating === null ? '<div class="a-note-flag">⚠ Badge says "Top Rated" but this SKU has 0 reviews and a null rating — shown honestly, not hidden.</div>' : ""}
    </div>
  </div>`;
}

function renderStatesView(container) {
  const lowStockProduct = CATALOGUE.products.find(p => p.stock_quantity <= p.low_stock_threshold);
  const simOutOfStockBase = CATALOGUE.products.find(p => p.id === 8); // Husky tote — real stock 52, used only as a display shell
  container.innerHTML = `
    <div class="a-states">
      <h2>1. Empty search results — real data, real interaction</h2>
      <div class="a-state-block">
        <span class="a-real-caption">REAL</span>
        <p>Try it: this button runs the actual client-side search against the embedded catalogue for a term with zero matches in the real 8-product data.</p>
        <button class="a-chip-btn" onclick="state.search='hammer';document.getElementById('search-input').value='hammer';Router.go('/')">Run search: "hammer"</button>
      </div>

      <h2>2. Missing product image — real data, the default case</h2>
      <div class="a-state-block">
        <span class="a-real-caption">REAL</span>
        <p>All 8 real products have <code>image_url: ""</code>. Every listing row and product detail page above already renders the "no image on file" tag treatment as its default state — nothing extra needed here.</p>
      </div>

      <h2>3. Low stock — real data</h2>
      <div class="a-state-block">
        <span class="a-real-caption">REAL</span>
        ${lowStockProduct ? rowCardHtml(lowStockProduct) : ""}
        <p style="margin-top:10px;">Only "${lowStockProduct.name}" is at/under its threshold today (qty ${lowStockProduct.stock_quantity} / threshold ${lowStockProduct.low_stock_threshold}).</p>
      </div>

      <h2>4. Out of stock — simulated, no real product is out of stock today</h2>
      <div class="a-state-block">
        <span class="a-sim-caption">SIMULATED — no real out-of-stock product exists yet</span>
        <div class="a-rowcard" style="pointer-events:none;">
          <div class="a-rowcard-top">
            <div><div class="a-rowcard-name">${simOutOfStockBase.name}</div><div class="a-rowcard-tone">${simOutOfStockBase.tone}</div></div>
            <div class="a-rowcard-price">${money(simOutOfStockBase.price_cents)}</div>
          </div>
          <div class="a-rowcard-meta"><span class="stock-out">Out of stock (simulated override)</span></div>
        </div>
        <p style="margin-top:10px;">Name and price above are real (SKU-0008); the stock number is a display-only override for this demo. Real live stock for this SKU is ${simOutOfStockBase.stock_quantity} units.</p>
      </div>

      <h2>5. Offline / API-fallback view — simulated, not a captured live failure</h2>
      <div class="a-state-block">
        <span class="a-sim-caption">SIMULATED — mockup of the fallback-data path, not a captured live API outage</span>
        <div class="a-offline-banner">⚠ API unreachable — showing last-known catalogue data. Prices and stock may be out of date. (This banner is a Direction A proposal: today's live storefront shows fallback data with no visible indicator at all — see design/audit/existing-baseline.md §6.)</div>
        <p>The rest of this page's layout is exactly what a shopper would see underneath the banner — same dense table, same real data — since the real app's fallback dataset is structurally identical to the live one.</p>
      </div>
    </div>
  `;
}

/* ---------------- App ---------------- */
const App = {
  resetFilters() {
    state.category = "all";
    state.search = "";
    state.priceBand = null;
    state.stockFilter = null;
    document.getElementById("search-input").value = "";
    render();
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function render() {
  const route = Router.parse();
  const root = document.getElementById("view-root");
  const isListing = route.view === "listing";
  document.getElementById("desktop-sidebar").style.display = isListing ? "" : "none";
  document.getElementById("desktop-sidebar").parentElement.classList.toggle("no-sidebar", !isListing);

  if (route.view === "product") {
    renderProductView(root, route.id);
  } else if (route.view === "states") {
    root.innerHTML = "";
    renderStatesView(root);
  } else {
    if (route.category) state.category = route.category;
    renderListingView(root);
  }
  renderDeptChips();
  renderFacets();
}

document.getElementById("search-form").addEventListener("submit", e => {
  e.preventDefault();
  state.search = document.getElementById("search-input").value;
  Router.go("/");
});
document.getElementById("drawer-open").addEventListener("click", openDrawer);
document.getElementById("drawer-close").addEventListener("click", closeDrawer);
document.getElementById("drawer-backdrop").addEventListener("click", closeDrawer);

renderServices();
render();

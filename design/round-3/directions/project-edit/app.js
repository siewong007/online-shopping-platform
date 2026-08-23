const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const categoryAccents = {
  tools: "#e35f32",
  lumber: "#9b6e48",
  paint: "#ca645e",
  appliances: "#567b91",
  garden: "#67805c",
  bath: "#568f91",
  "building-materials": "#b45f43",
  storage: "#7a6d98",
};

const state = {
  catalogue: null,
  category: "all",
  query: "",
  sort: "name",
  lowStockOnly: false,
};

const nodes = {
  categoryNav: document.querySelector("#category-nav"),
  selectedCategory: document.querySelector("#selected-category"),
  categoryTeaser: document.querySelector("#category-teaser"),
  search: document.querySelector("#store-search"),
  sort: document.querySelector("#sort-select"),
  lowStock: document.querySelector("#low-stock-filter"),
  filterSummary: document.querySelector("#filter-summary"),
  resultCount: document.querySelector("#result-count"),
  grid: document.querySelector("#product-grid"),
  empty: document.querySelector("#empty-state"),
};

function categoryFor(slug) {
  return state.catalogue.categories.find((category) => category.slug === slug);
}

function categoryName(slug) {
  return categoryFor(slug)?.name ?? slug;
}

function stockState(product) {
  const low = product.stock_quantity <= product.low_stock_threshold;
  return {
    low,
    text: low ? `Low stock — ${product.stock_quantity} left` : `${product.stock_quantity} in stock`,
  };
}

function filteredProducts() {
  const query = state.query.trim().toLocaleLowerCase();
  const products = state.catalogue.products.filter((product) => {
    const matchesCategory = state.category === "all" || product.category_slug === state.category;
    const matchesSearch = !query || product.name.toLocaleLowerCase().includes(query);
    const matchesStock = !state.lowStockOnly || product.stock_quantity <= product.low_stock_threshold;
    return matchesCategory && matchesSearch && matchesStock;
  });

  return products.sort((a, b) => {
    if (state.sort === "price-asc") return a.price_cents - b.price_cents;
    if (state.sort === "price-desc") return b.price_cents - a.price_cents;
    if (state.sort === "featured") return Number(b.featured) - Number(a.featured) || a.id - b.id;
    return a.name.localeCompare(b.name);
  });
}

function renderCategories() {
  nodes.categoryNav.innerHTML = state.catalogue.categories
    .map(
      (category) => `
        <button
          class="category-button"
          type="button"
          data-category="${category.slug}"
          aria-pressed="${category.slug === state.category}"
        >${category.name}</button>`,
    )
    .join("");

  nodes.categoryNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      render();
    });
  });
}

function productCard(product) {
  const stock = stockState(product);
  const category = categoryName(product.category_slug);
  const accent = categoryAccents[product.category_slug] ?? "#e35f32";
  const productHref = `#product-${product.id}`;

  return `
    <article class="product-card" id="product-${product.id}" style="--category-accent: ${accent}">
      <a class="image-status" href="${productHref}" aria-label="View ${product.name}">
        <span class="sample-tag">
          <i class="material-chip" aria-hidden="true"></i>
          <span>Exact product image unavailable</span>
        </span>
      </a>
      <div class="product-body">
        <div class="product-meta">
          <span class="catalogue-label">Catalogue label · <span>${product.tone}</span></span>
          <span class="product-category">${category}</span>
        </div>
        <a class="product-name" href="${productHref}">${product.name}</a>
        <p class="verified-attribute"><strong>Category</strong> · ${category}</p>
        <div class="decision-facts">
          <span class="price">${money.format(product.price_cents / 100)}</span>
          <span class="stock${stock.low ? " low" : ""}">${stock.text}</span>
        </div>
        <div class="card-space" aria-hidden="true"></div>
        <div class="product-actions">
          <a class="view-product" href="${productHref}">View product</a>
          <button class="add-cart" type="button">Add to Cart</button>
        </div>
      </div>
    </article>`;
}

function renderProducts() {
  const products = filteredProducts();
  nodes.grid.innerHTML = products.map(productCard).join("");
  nodes.empty.hidden = products.length > 0;
  nodes.grid.hidden = products.length === 0;
  nodes.resultCount.textContent = `${products.length} ${products.length === 1 ? "product" : "products"} in this edit`;
}

function renderCue() {
  const category = categoryFor(state.category) ?? state.catalogue.categories[0];
  nodes.selectedCategory.textContent = category.name;
  nodes.categoryTeaser.textContent = category.teaser;
}

function render() {
  renderCategories();
  renderCue();
  renderProducts();
  nodes.filterSummary.textContent = state.lowStockOnly ? "Active: Low stock" : "All stock states";
}

nodes.search.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  renderProducts();
});

nodes.sort.addEventListener("change", (event) => {
  state.sort = event.currentTarget.value;
  renderProducts();
});

nodes.lowStock.addEventListener("change", (event) => {
  state.lowStockOnly = event.currentTarget.checked;
  renderProducts();
  nodes.filterSummary.textContent = state.lowStockOnly ? "Active: Low stock" : "All stock states";
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== nodes.search) {
    event.preventDefault();
    nodes.search.focus();
  }
});

fetch("/catalogue.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
    return response.json();
  })
  .then((catalogue) => {
    state.catalogue = catalogue;
    render();
  })
  .catch((error) => {
    console.error(error);
    nodes.resultCount.textContent = "Catalogue unavailable";
    nodes.empty.hidden = false;
    nodes.empty.textContent = "The catalogue could not be loaded for this concept.";
  });

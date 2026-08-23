import { bindDiscovery, categoryName, formatPrice, loadCatalogue, stockLabel } from "../shared.js";

const catalogue = await loadCatalogue();
const rail = document.querySelector("#category-rail");
const grid = document.querySelector("#product-grid");
const count = document.querySelector("#result-count");

rail.innerHTML = catalogue.categories.map((category, index) => `
  <button type="button" data-category="${category.slug}" aria-current="false">
    <span>${String(index + 1).padStart(2, "0")}</span>${category.name.replace("Shop All Departments", "All products")}
  </button>
`).join("");

function render(products) {
  count.textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  grid.innerHTML = products.length ? products.map((product, index) => {
    const low = product.stock_quantity <= product.low_stock_threshold;
    return `
      <article class="product-card ${index === 0 ? "product-card--lead" : ""}">
        <a class="product-stage" href="#product-${product.id}" aria-label="Open ${product.name}">
          <span class="stage-index">${String(product.id).padStart(2, "0")}</span>
          <span class="stage-category">${categoryName(catalogue.categories, product.category_slug)}</span>
          <span class="stage-note">No product photo on file</span>
        </a>
        <div class="product-copy">
          <div class="product-meta"><span>${product.tone}</span><span>${product.badge}</span></div>
          <h2><a href="#product-${product.id}">${product.name}</a></h2>
          <p>${product.description}</p>
          <div class="buy-line">
            <div><strong class="price">${formatPrice(product.price_cents)}</strong><span class="stock ${low ? "stock--low" : ""}">${stockLabel(product)}</span></div>
            <button type="button">Add to Cart</button>
          </div>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty">No products match this search. Try another term or category.</p>`;
}

bindDiscovery({ catalogue, render, searchInput: document.querySelector("#search"), rail });


import { bindDiscovery, categoryName, formatPrice, loadCatalogue, stockLabel } from "../shared.js";

const catalogue = await loadCatalogue();
const rail = document.querySelector("#category-rail");
const grid = document.querySelector("#product-grid");
const count = document.querySelector("#result-count");

rail.innerHTML = catalogue.categories.map((category, index) => `
  <button type="button" data-category="${category.slug}" aria-current="false">
    <span>${String(index + 1).padStart(2, "0")}</span>${category.name.replace("Shop All Departments", "All stock")}
  </button>
`).join("");

function render(products) {
  count.textContent = String(products.length).padStart(2, "0");
  grid.innerHTML = products.length ? products.map((product) => {
    const low = product.stock_quantity <= product.low_stock_threshold;
    return `
      <article class="instrument-card">
        <a class="instrument-visual" href="#product-${product.id}" aria-label="Open ${product.name}">
          <span class="visual-code">EKW—${String(product.id).padStart(3, "0")}</span>
          <span class="visual-mark">${product.category_slug.slice(0, 2).toUpperCase()}</span>
          <span class="visual-note">IMAGE / NOT ON FILE</span>
        </a>
        <div class="instrument-copy">
          <div class="product-meta"><span>${categoryName(catalogue.categories, product.category_slug)}</span><span>${product.badge}</span></div>
          <h2><a href="#product-${product.id}">${product.name}</a></h2>
          <p>${product.description}</p>
          <div class="instrument-footer">
            <div class="price-block"><span>COUNTER PRICE</span><strong>${formatPrice(product.price_cents)}</strong></div>
            <div class="stock-block ${low ? "stock-block--low" : ""}"><span>AVAILABILITY</span><strong>${stockLabel(product)}</strong></div>
            <button type="button">Add to Cart <span>↗</span></button>
          </div>
        </div>
      </article>
    `;
  }).join("") : `<p class="empty">No products match this search. Reset the rail or try another term.</p>`;
}

bindDiscovery({ catalogue, render, searchInput: document.querySelector("#search"), rail });


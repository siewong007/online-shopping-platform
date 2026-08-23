export async function loadCatalogue() {
  const response = await fetch("/catalogue.json");
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
  return response.json();
}

export function formatPrice(priceCents) {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function categoryName(categories, slug) {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}

export function stockLabel(product) {
  if (product.stock_quantity === 0) return "Out of stock";
  if (product.stock_quantity <= product.low_stock_threshold) {
    return `Low stock — ${product.stock_quantity} left`;
  }
  return `In stock — ${product.stock_quantity} available`;
}

export function bindDiscovery({ catalogue, render, searchInput, rail }) {
  let activeCategory = "all";
  let query = "";

  const update = () => {
    const products = catalogue.products.filter((product) => {
      const categoryMatch = activeCategory === "all" || product.category_slug === activeCategory;
      const queryMatch = `${product.name} ${product.tone}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });

    rail.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.category === activeCategory;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    render(products);
  };

  rail.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    update();
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    update();
  });

  update();
}


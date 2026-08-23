const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const state = {
  catalogue: null,
  category: "all",
  query: "",
  sort: "name",
  lowStockOnly: false,
  activeId: null
};

const searchInput = document.querySelector("#searchInput");
const categoryButtons = document.querySelector("#categoryButtons");
const products = document.querySelector("#products");
const sortSelect = document.querySelector("#sortSelect");
const lowStockOnly = document.querySelector("#lowStockOnly");
const resultCount = document.querySelector("#resultCount");
const continuation = document.querySelector("#continuation");
const template = document.querySelector("#sceneTemplate");

function categoryName(slug) {
  return state.catalogue.categories.find((category) => category.slug === slug)?.name ?? slug;
}

function stockText(product) {
  if (product.stock_quantity === 0) return "Out of stock";
  if (product.stock_quantity <= product.low_stock_threshold) {
    return `Low stock — ${product.stock_quantity} left`;
  }
  return `In stock — ${product.stock_quantity} available`;
}

function sortedProducts() {
  const filtered = state.catalogue.products.filter((product) => {
    const inCategory = state.category === "all" || product.category_slug === state.category;
    const matchesQuery = `${product.name} ${categoryName(product.category_slug)}`
      .toLowerCase()
      .includes(state.query);
    const matchesStock =
      !state.lowStockOnly || product.stock_quantity <= product.low_stock_threshold;
    return inCategory && matchesQuery && matchesStock;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "price_asc") return a.price_cents - b.price_cents;
    if (state.sort === "price_desc") return b.price_cents - a.price_cents;
    if (state.sort === "name") return a.name.localeCompare(b.name);
    return Number(b.featured) - Number(a.featured) || a.id - b.id;
  });
}

function renderCategories() {
  categoryButtons.replaceChildren(
    ...state.catalogue.categories.map((category, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.category = category.slug;
      button.className = state.category === category.slug ? "is-active" : "";
      button.setAttribute("aria-current", state.category === category.slug ? "page" : "false");
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${category.name}`;
      return button;
    })
  );
}

function renderProducts() {
  const visible = sortedProducts();
  const fragment = document.createDocumentFragment();

  visible.forEach((product, index) => {
    const scene = template.content.firstElementChild.cloneNode(true);
    scene.dataset.productId = String(product.id);
    scene.classList.add(`scene--${product.category_slug}`);
    if ((state.activeId ?? visible[0]?.id) === product.id) scene.classList.add("is-active");
    scene.style.setProperty("--scene-order", index);
    scene.querySelector(".category-name").textContent = categoryName(product.category_slug);
    const name = scene.querySelector(".product-name");
    name.textContent = product.name;
    name.href = `#product-${product.id}`;
    scene.querySelector(".price").textContent = currency.format(product.price_cents / 100);
    const stock = scene.querySelector(".stock");
    stock.textContent = stockText(product);
    if (product.stock_quantity <= product.low_stock_threshold) stock.classList.add("is-low");
    scene.querySelector(".open-product").href = `#product-${product.id}`;
    fragment.append(scene);
  });

  products.replaceChildren(fragment);
  resultCount.textContent = `${visible.length} real products`;
  continuation.textContent =
    visible.length > 5 ? `${visible.length - 5} more products continue →` : "";
}

function update() {
  renderCategories();
  renderProducts();
}

categoryButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  state.activeId = null;
  update();
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim().toLowerCase();
  state.activeId = null;
  renderProducts();
});

sortSelect.addEventListener("change", () => {
  state.sort = sortSelect.value;
  state.activeId = null;
  renderProducts();
});

lowStockOnly.addEventListener("change", () => {
  state.lowStockOnly = lowStockOnly.checked;
  state.activeId = null;
  renderProducts();
});

function activateScene(event) {
  const scene = event.target.closest(".product-scene");
  if (!scene) return;
  state.activeId = Number(scene.dataset.productId);
  products.querySelectorAll(".product-scene").forEach((item) => {
    item.classList.toggle("is-active", item === scene);
  });
}

products.addEventListener("pointerover", activateScene);
products.addEventListener("focusin", activateScene);

try {
  const response = await fetch("/catalogue.json");
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
  state.catalogue = await response.json();
  update();
} catch (error) {
  products.innerHTML = `<p class="load-error">The concept catalogue could not be loaded.</p>`;
  console.error(error);
}

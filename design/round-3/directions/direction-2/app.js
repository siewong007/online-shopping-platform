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
const categorySelect = document.querySelector("#categorySelect");
const products = document.querySelector("#products");
const sortSelect = document.querySelector("#sortSelect");
const lowStockOnly = document.querySelector("#lowStockOnly");
const resultCount = document.querySelector("#resultCount");
const template = document.querySelector("#foldTemplate");

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

function renderCategorySelect() {
  categorySelect.replaceChildren(
    ...state.catalogue.categories.map((category) => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      option.selected = category.slug === state.category;
      return option;
    })
  );
}

function bindProduct(fold, product) {
  fold.dataset.productId = String(product.id);
  fold.classList.add(`fold--${product.category_slug}`);
  fold.setAttribute("aria-expanded", String((state.activeId ?? product.id) === product.id));
  fold.querySelectorAll(".category-name").forEach((element) => {
    element.textContent = categoryName(product.category_slug);
  });
  fold.querySelectorAll(".product-name").forEach((element) => {
    element.textContent = product.name;
    element.href = `#product-${product.id}`;
  });
  fold.querySelectorAll(".price").forEach((element) => {
    element.textContent = currency.format(product.price_cents / 100);
  });
  fold.querySelectorAll(".stock").forEach((element) => {
    element.textContent = stockText(product);
    element.classList.toggle("is-low", product.stock_quantity <= product.low_stock_threshold);
  });
  fold.querySelectorAll(".open-product").forEach((element) => {
    element.href = `#product-${product.id}`;
  });
}

function renderProducts() {
  const visible = sortedProducts();
  const selectedId = visible.some((product) => product.id === state.activeId)
    ? state.activeId
    : visible[0]?.id;
  state.activeId = selectedId ?? null;
  const fragment = document.createDocumentFragment();

  visible.forEach((product) => {
    const fold = template.content.firstElementChild.cloneNode(true);
    bindProduct(fold, product);
    fold.classList.toggle("is-active", product.id === state.activeId);
    fold.setAttribute("aria-expanded", String(product.id === state.activeId));
    fragment.append(fold);
  });

  products.replaceChildren(fragment);
  resultCount.textContent = `${visible.length} real products`;
}

function update() {
  renderCategorySelect();
  renderProducts();
}

function activateFold(event) {
  if (event.type === "click" && event.target.closest("a, button")) return;
  const fold = event.target.closest(".product-fold");
  if (!fold) return;
  state.activeId = Number(fold.dataset.productId);
  products.querySelectorAll(".product-fold").forEach((item) => {
    const active = item === fold;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-expanded", String(active));
  });
}

products.addEventListener("click", activateFold);
products.addEventListener("focusin", activateFold);

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  state.activeId = null;
  renderProducts();
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

try {
  const response = await fetch("/catalogue.json");
  if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
  state.catalogue = await response.json();
  update();
} catch (error) {
  products.innerHTML = `<p class="load-error">The concept catalogue could not be loaded.</p>`;
  console.error(error);
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const stages = [
  { id: "all", number: "00", label: "Whole project", advice: "Start anywhere. Search by product, or choose the point your job has reached.", categories: [] },
  { id: "prep", number: "01", label: "Prep & tooling", advice: "Set up the work before the work sets the pace: tools, outdoor power and dependable storage.", categories: ["tools", "garden", "storage"] },
  { id: "structure", number: "02", label: "Structure", advice: "Build the bones first. Choose the material quantities that make the rest of the job possible.", categories: ["lumber", "building-materials"] },
  { id: "fitout", number: "03", label: "Fit-out", advice: "Bring the room into service with the fixtures and appliances that do the daily work.", categories: ["appliances", "bath"] },
  { id: "finish", number: "04", label: "Finish & live", advice: "Close the job with the visible layer: a finish that makes the work feel complete.", categories: ["paint"] },
];
const state = { data: null, stage: "all", aisle: "all", query: "", sort: "name" };
const el = { nav: document.querySelector("#stage-nav"), num: document.querySelector("#stage-number"), title: document.querySelector("#stage-title"), advice: document.querySelector("#stage-advice"), count: document.querySelector("#stage-count"), aisles: document.querySelector("#aisle-filters"), products: document.querySelector("#products"), empty: document.querySelector("#empty"), search: document.querySelector("#stage-search"), sort: document.querySelector("#stage-sort") };
const stageForProduct = (product) => stages.find((stage) => stage.id !== "all" && stage.categories.includes(product.category_slug));
const categoryName = (slug) => state.data.categories.find((category) => category.slug === slug)?.name ?? slug;
const stock = (product) => product.stock_quantity <= product.low_stock_threshold ? { low: true, text: `Low stock — ${product.stock_quantity} left` } : { low: false, text: `${product.stock_quantity} in stock` };
function availableProducts() {
  const active = stages.find((stage) => stage.id === state.stage);
  const query = state.query.trim().toLowerCase();
  return state.data.products.filter((product) => (active.id === "all" || active.categories.includes(product.category_slug)) && (state.aisle === "all" || product.category_slug === state.aisle) && (!query || product.name.toLowerCase().includes(query))).sort((a,b) => state.sort === "price-asc" ? a.price_cents-b.price_cents : state.sort === "price-desc" ? b.price_cents-a.price_cents : state.sort === "featured" ? Number(b.featured)-Number(a.featured)||a.id-b.id : a.name.localeCompare(b.name));
}
function renderStages() {
  el.nav.innerHTML = stages.map((stage) => { const count = stage.id === "all" ? state.data.products.length : state.data.products.filter((product) => stage.categories.includes(product.category_slug)).length; return `<button class="stage-button" type="button" data-stage="${stage.id}" aria-pressed="${stage.id === state.stage}"><span class="num">${stage.number}</span><span class="label">${stage.label}</span><span class="count">${String(count).padStart(2,"0")}</span></button>`; }).join("");
  el.nav.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.stage = button.dataset.stage; state.aisle = "all"; render(); }));
}
function renderAisles() {
  const active = stages.find((stage) => stage.id === state.stage);
  const slugs = active.id === "all" ? state.data.categories.filter((category) => category.slug !== "all").map((category) => category.slug) : active.categories;
  el.aisles.innerHTML = [`<button class="aisle-chip" type="button" data-aisle="all" aria-pressed="${state.aisle === "all"}">All</button>`, ...slugs.map((slug) => `<button class="aisle-chip" type="button" data-aisle="${slug}" aria-pressed="${state.aisle === slug}">${categoryName(slug)}</button>`)].join("");
  el.aisles.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.aisle = button.dataset.aisle; render(); }));
}
function row(product) { const s=stock(product), stage=stageForProduct(product), category=categoryName(product.category_slug); return `<article class="product-row"><a class="image-plate" href="#product-${product.id}" aria-label="View ${product.name}"><span class="stage-tag">STAGE ${stage?.number ?? "00"}</span><span class="unavailable">Product image is not available yet.</span></a><div class="product-copy"><div class="eyebrow">Catalogue label · <b>${product.tone}</b></div><a class="product-name" href="#product-${product.id}">${product.name}</a><div class="product-facts"><span class="fact-chip">Aisle · ${category}</span><span class="stock-pill${s.low?" low":""}">${s.text}</span></div></div><div class="decision-rail"><div class="price-block"><span class="price-label">PRICE / USD</span><span class="price">${money.format(product.price_cents/100)}</span></div><a class="view" href="#product-${product.id}">View product</a><button class="cart-action" type="button">Add to cart</button></div></article>`; }
function renderProducts() { const products=availableProducts(); el.products.innerHTML=products.map(row).join(""); el.products.hidden=!products.length; el.empty.hidden=!!products.length; el.count.textContent=`${String(products.length).padStart(2,"0")} PRODUCTS`; }
function render() { const active=stages.find((stage)=>stage.id===state.stage); el.num.textContent=active.number; el.title.textContent=active.label; el.advice.textContent=active.advice; renderStages(); renderAisles(); renderProducts(); }
document.querySelector(".search").addEventListener("submit", (event)=>event.preventDefault());
el.search.addEventListener("input", (event)=>{state.query=event.currentTarget.value;renderProducts()});
el.sort.addEventListener("change", (event)=>{state.sort=event.currentTarget.value;renderProducts()});
fetch("/catalogue.json").then((response)=>{if(!response.ok)throw new Error(`Catalogue request failed: ${response.status}`);return response.json()}).then((data)=>{state.data=data;render()}).catch((error)=>{console.error(error);el.empty.hidden=false;el.empty.textContent="Catalogue unavailable."});

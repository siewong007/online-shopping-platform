import type { CartItem, Category, Product, StorefrontPayload } from "../types";

/**
 * Resolves a pipe-delimited category hint (e.g. from landing-page links) against live categories,
 * preferring exact slug matches before falling back to partial slug/name matches or `"all"`.
 */
export function resolveCategoryHint(categories: Category[], hint: string): string {
  const candidates = hint
    .split("|")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  for (const candidate of candidates) {
    const exact = categories.find((cat) => cat.slug.toLowerCase() === candidate);
    if (exact) return exact.slug;
  }
  for (const candidate of candidates) {
    const partial = categories.find(
      (cat) =>
        cat.slug !== "all" &&
        (cat.slug.toLowerCase().includes(candidate) || cat.name.toLowerCase().includes(candidate))
    );
    if (partial) return partial.slug;
  }
  return "all";
}

export type CartAdditionResult = {
  nextCart: CartItem[];
  addedCount: number;
  stockLimit: number;
};

/**
 * Adds a positive integer quantity of `product` to `cart` without exceeding available stock,
 * refreshing the stored product snapshot when the item is already present.
 */
export function appendProductToCart(
  cart: CartItem[],
  product: Product,
  quantity = 1
): CartAdditionResult {
  const stockLimit = Math.max(0, Math.floor(product.stock_quantity));
  if (stockLimit === 0) {
    return { nextCart: cart, addedCount: 0, stockLimit: 0 };
  }

  const delta = Math.max(1, Math.floor(quantity));
  const existing = cart.find((item) => item.product.id === product.id);
  const currentInCart = existing?.quantity ?? 0;
  const nextQty = Math.min(currentInCart + delta, stockLimit);
  const addedCount = nextQty - currentInCart;

  const nextCart = existing
    ? cart.map((item) =>
        item.product.id === product.id
          ? { ...item, product, quantity: Math.min(item.quantity + delta, stockLimit) }
          : item
      )
    : [...cart, { product, quantity: Math.min(delta, stockLimit) }];

  return { nextCart, addedCount, stockLimit };
}

/**
 * Updates a cart line's quantity while clamping to current stock; removes the line when
 * requested quantity or available stock drops to zero.
 */
export function setCartItemQuantity(
  cart: CartItem[],
  productId: number,
  quantity: number,
  latestProduct?: Product
): CartItem[] {
  if (quantity <= 0) {
    return cart.filter((item) => item.product.id !== productId);
  }

  const item = cart.find((candidate) => candidate.product.id === productId);
  if (!item) return cart;

  const currentProduct = latestProduct ?? item.product;
  const stockLimit = Math.max(0, Math.floor(currentProduct.stock_quantity));
  if (stockLimit === 0) {
    return cart.filter((candidate) => candidate.product.id !== productId);
  }

  return cart.map((candidate) =>
    candidate.product.id === productId
      ? { ...candidate, product: currentProduct, quantity: Math.min(quantity, stockLimit) }
      : candidate
  );
}

/** Appends a newly created category to the loaded storefront if not already present. */
export function upsertStorefrontCategory(
  storefront: StorefrontPayload | null,
  category: Category
): StorefrontPayload | null {
  if (!storefront || storefront.categories.some((item) => item.slug === category.slug)) {
    return storefront;
  }
  return {
    ...storefront,
    categories: [...storefront.categories, category]
  };
}

/** Replaces an updated category inside the loaded storefront snapshot. */
export function replaceStorefrontCategory(
  storefront: StorefrontPayload | null,
  category: Category
): StorefrontPayload | null {
  if (!storefront) return storefront;
  return {
    ...storefront,
    categories: storefront.categories.map((item) => (item.slug === category.slug ? category : item))
  };
}

/** Removes a deleted category from the loaded storefront snapshot. */
export function removeStorefrontCategory(
  storefront: StorefrontPayload | null,
  slug: string
): StorefrontPayload | null {
  if (!storefront) return storefront;
  return {
    ...storefront,
    categories: storefront.categories.filter((item) => item.slug !== slug)
  };
}

/**
 * Keeps the storefront product list aligned with admin create/update mutations:
 * non-featured items stay unpublished on create and are removed on update.
 */
export function syncProductInStorefront(
  storefront: StorefrontPayload | null,
  product: Product,
  mode: "create" | "update"
): StorefrontPayload | null {
  if (!storefront) return storefront;

  const exists = storefront.products.some((item) => item.id === product.id);
  if (!product.featured) {
    return mode === "create"
      ? storefront
      : {
          ...storefront,
          products: storefront.products.filter((item) => item.id !== product.id)
        };
  }

  if (mode === "create" && exists) {
    return storefront;
  }

  return {
    ...storefront,
    products: exists
      ? storefront.products.map((item) => (item.id === product.id ? product : item))
      : [...storefront.products, product]
  };
}

/** Removes a deleted product from the loaded storefront snapshot. */
export function removeProductFromStorefront(
  storefront: StorefrontPayload | null,
  productId: number
): StorefrontPayload | null {
  if (!storefront) return storefront;
  return {
    ...storefront,
    products: storefront.products.filter((item) => item.id !== productId)
  };
}

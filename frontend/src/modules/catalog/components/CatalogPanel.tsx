import { type ChangeEvent, useEffect, useMemo, useState } from "react";

import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import { ManagementTable } from "../../../shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "../../../shared/components/RecordModal";
import { currencyFromCents } from "../../../shared/formatters";
import { useNotifications } from "../../../shared/notifications";
import { importCatalogue, importProductImages } from "../api/catalogApi";
import type {
  CatalogueImportReport,
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  ProductImageImportReport,
  UpdateCategoryInput,
  UpdateProductInput
} from "../types";

const MAX_PRODUCT_IMAGE_BYTES = 1_000_000;
const ACCEPTED_PRODUCT_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

type CatalogConfirmAction =
  | { kind: "apply-images" }
  | { kind: "delete-category"; category: Category }
  | { kind: "delete-product"; product: Product }
  | { kind: "bulk-delete"; scope: "selected" | "all"; count: number };

type CatalogSubtab = "products" | "departments";
type ProductStockFilter = "all" | "low" | "out";

type ProductFormState = {
  badge: string;
  category_slug: string;
  description: string;
  featured: boolean;
  image_url: string;
  name: string;
  price: string;
  tone: string;
  stock_quantity: string;
  low_stock_threshold: string;
};

type CatalogPanelProps = {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  categories: Category[];
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>;
  onCreateProduct: (input: CreateProductInput) => Promise<Product>;
  onDeleteCategory: (slug: string) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onRefreshCatalog: () => Promise<void>;
  onUpdateCategory: (slug: string, input: UpdateCategoryInput) => Promise<Category>;
  onUpdateProduct: (productId: number, input: UpdateProductInput) => Promise<Product>;
  products: Product[];
  variant?: "catalog" | "inventory";
};

const categoryFields: RecordFormField<CreateCategoryInput>[] = [
  {
    name: "name",
    label: "Category name",
    required: true,
    minLength: 2,
    placeholder: "Ceiling Fans"
  },
  {
    name: "slug",
    label: "Slug",
    helpText: "Leave blank to auto-generate it from the category name.",
    placeholder: "ceiling-fans",
    validate: (value) => {
      const slug = String(value).trim();
      return slug.length === 0 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
        ? null
        : "Use lowercase letters, numbers and hyphens only.";
    }
  },
  {
    name: "teaser",
    label: "Teaser",
    type: "textarea",
    required: true,
    minLength: 12,
    placeholder: "Fans, lighting and comfort upgrades for every room.",
    rows: 4
  }
];

const updateCategoryFields: RecordFormField<UpdateCategoryInput>[] = [
  {
    name: "name",
    label: "Category name",
    required: true,
    minLength: 2
  },
  {
    name: "teaser",
    label: "Teaser",
    type: "textarea",
    required: true,
    minLength: 12,
    rows: 4
  }
];

function emptyProductForm(categories: Category[]): ProductFormState {
  return {
    name: "",
    category_slug: categories[0]?.slug ?? "all",
    price: "",
    badge: "",
    description: "",
    tone: "",
    featured: true,
    stock_quantity: "0",
    low_stock_threshold: "10",
    image_url: ""
  };
}

function productFormFromProduct(product: Product): ProductFormState {
  return {
    name: product.name,
    category_slug: product.category_slug,
    price: (product.price_cents / 100).toFixed(2),
    badge: product.badge,
    description: product.description,
    tone: product.tone,
    featured: product.featured,
    stock_quantity: String(product.stock_quantity),
    low_stock_threshold: String(product.low_stock_threshold),
    image_url: product.image_url
  };
}

function productInputFromForm(form: ProductFormState): CreateProductInput {
  const normalizedPrice = Math.round(Number(form.price) * 100);

  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
    throw new Error("Enter a valid product price.");
  }

  const stockQuantity = Number(form.stock_quantity);
  const lowStockThreshold = Number(form.low_stock_threshold);

  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
    throw new Error("Enter a valid stock quantity.");
  }

  if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
    throw new Error("Enter a valid low stock threshold.");
  }

  const imageUrl = form.image_url.trim() || undefined;

  return {
    name: form.name.trim(),
    category_slug: form.category_slug,
    price_cents: normalizedPrice,
    badge: form.badge.trim(),
    description: form.description.trim(),
    tone: form.tone.trim(),
    featured: form.featured,
    stock_quantity: stockQuantity,
    low_stock_threshold: lowStockThreshold,
    image_url: imageUrl
  };
}

function productFields(categories: Category[]): RecordFormField<ProductFormState>[] {
  return [
    {
      name: "name",
      label: "Product name",
      required: true,
      minLength: 2,
      placeholder: "Home Decorators Ceiling Fan"
    },
    {
      name: "category_slug",
      label: "Category",
      type: "select",
      options: categories.map((category) => ({ label: category.name, value: category.slug }))
    },
    {
      name: "price",
      label: "Price",
      type: "number",
      required: true,
      min: 0,
      step: "0.01",
      placeholder: "249.00",
      validate: (value) => (Number.isFinite(Number(value)) ? null : "Enter a valid product price.")
    },
    {
      name: "badge",
      label: "Badge",
      required: true,
      placeholder: "New Arrival"
    },
    {
      name: "tone",
      label: "Brand / tone",
      required: true,
      placeholder: "Home Decorators Collection"
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      required: true,
      minLength: 12,
      placeholder: "Modern finish, integrated light kit and remote control for easy installs.",
      rows: 4
    },
    {
      name: "featured",
      label: "Show on storefront",
      type: "toggle",
      description: "Turn on to publish this product to shoppers immediately."
    },
    {
      name: "stock_quantity",
      label: "Stock quantity",
      type: "number",
      required: true,
      min: 0,
      step: "1",
      placeholder: "48",
      validate: (value) =>
        Number.isInteger(Number(value)) && Number(value) >= 0
          ? null
          : "Enter a valid stock quantity."
    },
    {
      name: "low_stock_threshold",
      label: "Low stock threshold",
      type: "number",
      required: true,
      min: 0,
      step: "1",
      placeholder: "10",
      helpText: "Products at or below this level are flagged as low stock.",
      validate: (value) =>
        Number.isInteger(Number(value)) && Number(value) >= 0
          ? null
          : "Enter a valid low stock threshold."
    },
  ];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M10 11v6m4-6v6M9 7l1-2h4l1 2m-9 0 1 13h10l1-13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

export function CatalogPanel({
  canCreate,
  canDelete,
  canUpdate,
  categories,
  onCreateCategory,
  onCreateProduct,
  onDeleteCategory,
  onDeleteProduct,
  onRefreshCatalog,
  onUpdateCategory,
  onUpdateProduct,
  products,
  variant = "catalog"
}: CatalogPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    slug: "",
    name: "",
    teaser: ""
  });
  const [categoryEditForm, setCategoryEditForm] = useState<UpdateCategoryInput>({
    name: "",
    teaser: ""
  });
  const [productForm, setProductForm] = useState<ProductFormState>(() => emptyProductForm(categories));
  const [editingCategorySlug, setEditingCategorySlug] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingCategorySlug, setDeletingCategorySlug] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number | string>>(new Set());
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importReport, setImportReport] = useState<CatalogueImportReport | null>(null);
  const [imageManifestCsv, setImageManifestCsv] = useState("");
  const [imageManifestName, setImageManifestName] = useState("");
  const [imageImportReport, setImageImportReport] = useState<ProductImageImportReport | null>(null);
  const [isCheckingImages, setIsCheckingImages] = useState(false);
  const [isApplyingImages, setIsApplyingImages] = useState(false);
  const [catalogSubtab, setCatalogSubtab] = useState<CatalogSubtab>("products");
  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStockFilter, setProductStockFilter] = useState<ProductStockFilter>("all");
  const [pendingConfirm, setPendingConfirm] = useState<CatalogConfirmAction | null>(null);

  // The import calls are self-contained; the parent refresh callback synchronises the
  // catalogue and any currently loaded storefront products after a successful apply.
  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setImportReport(null);
    try {
      const report = await importCatalogue(await file.text());
      setImportReport(report);
      await onRefreshCatalog();
      notify({
        severity: report.problems.length > 0 ? "warning" : "success",
        title: "Catalogue imported",
        message: `${report.products_created} created, ${report.products_updated} updated.`,
        scope: "catalogue-import"
      });
    } catch (error) {
      notifyError(error, { operation: "import the catalogue", scope: "catalogue-import" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImageManifestFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsCheckingImages(true);
    setImageImportReport(null);
    try {
      const csv = await file.text();
      const report = await importProductImages(csv, true);
      setImageManifestCsv(csv);
      setImageManifestName(file.name);
      setImageImportReport(report);
      notify({
        severity: report.problems.length > 0 ? "warning" : "success",
        title: "Image manifest checked",
        message: `${report.products_matched} approved row(s) match catalogue products. Nothing was changed.`,
        scope: "product-image-import"
      });
    } catch (error) {
      setImageManifestCsv("");
      setImageManifestName("");
      notifyError(error, { operation: "check the product image manifest", scope: "product-image-import" });
    } finally {
      setIsCheckingImages(false);
    }
  };

  const requestApplyImageManifest = () => {
    if (!imageManifestCsv || !imageImportReport || imageImportReport.approved_rows === 0) return;
    setPendingConfirm({ kind: "apply-images" });
  };

  const executeApplyImageManifest = async () => {
    if (!imageManifestCsv || !imageImportReport || imageImportReport.approved_rows === 0) return;

    setIsApplyingImages(true);
    try {
      const report = await importProductImages(imageManifestCsv, false);
      setImageImportReport(report);
      await onRefreshCatalog();
      notify({
        severity: report.problems.length > 0 ? "warning" : "success",
        title: "Verified images applied",
        message: `${report.products_updated} image(s) updated and ${report.products_unchanged} unchanged.`,
        scope: "product-image-import"
      });
    } catch (error) {
      notifyError(error, { operation: "apply the product image manifest", scope: "product-image-import" });
    } finally {
      setIsApplyingImages(false);
      setPendingConfirm(null);
    }
  };
  const productFieldList = useMemo(() => productFields(categories), [categories]);
  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories]
  );
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (productCategoryFilter !== "all" && product.category_slug !== productCategoryFilter) {
        return false;
      }

      if (productStockFilter === "out") {
        return product.stock_quantity === 0;
      }

      if (productStockFilter === "low") {
        return product.stock_quantity <= product.low_stock_threshold;
      }

      return true;
    });
  }, [productCategoryFilter, productStockFilter, products]);

  const productSearchText = (product: Product) =>
    `${product.name} ${product.tone} ${product.badge} ${categoryNameBySlug.get(product.category_slug) ?? product.category_slug}`;

  const searchedProductCount = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase();
    if (!query) {
      return filteredProducts.length;
    }

    return filteredProducts.filter((product) =>
      `${product.name} ${product.tone} ${product.badge} ${categoryNameBySlug.get(product.category_slug) ?? product.category_slug}`
        .toLocaleLowerCase()
        .includes(query)
    ).length;
  }, [categoryNameBySlug, filteredProducts, productSearch]);

  const editingCategory =
    editingCategorySlug === null
      ? null
      : categories.find((category) => category.slug === editingCategorySlug) ?? null;
  const editingProduct =
    editingProductId === null
      ? null
      : products.find((product) => product.id === editingProductId) ?? null;

  useEffect(() => {
    if (categories.length === 0) {
      return;
    }

    setProductForm((current) =>
      categories.some((category) => category.slug === current.category_slug)
        ? current
        : { ...current, category_slug: categories[0].slug }
    );
  }, [categories]);

  useEffect(() => {
    setSelectedProductIds((current) => new Set([...current].filter((id) => products.some((product) => product.id === id))));
  }, [products]);

  const openCreateCategory = () => {
    setCategoryForm({ slug: "", name: "", teaser: "" });
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategorySlug(category.slug);
    setCategoryEditForm({ name: category.name, teaser: category.teaser });
    setIsCategoryEditOpen(true);
  };

  const closeCategoryEdit = () => {
    setIsCategoryEditOpen(false);
    setEditingCategorySlug(null);
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm(categories));
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm(productFormFromProduct(product));
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_PRODUCT_IMAGE_TYPES.has(file.type)) {
      notify({ severity: "error", title: "Image not selected", message: "Choose a PNG, JPEG, WebP, or GIF image.", scope: "catalog", dedupeKey: "catalog:product:image:type" });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      notify({ severity: "error", title: "Image too large", message: "Choose an image smaller than 1 MB.", scope: "catalog", dedupeKey: "catalog:product:image:size" });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const imageData = reader.result;
      if (typeof imageData === "string") {
        setProductForm((current) => ({ ...current, image_url: imageData }));
      }
    });
    reader.readAsDataURL(file);
  };

  const clearProductImage = () => setProductForm((current) => ({ ...current, image_url: "" }));

  const handleCreateCategory = async () => {
    if (!canCreate) {
      notify({ severity: "error", title: "Category not created", message: "The active role cannot create catalog records.", scope: "catalog", dedupeKey: "catalog:category:create:permission" });
      return;
    }

    setIsSavingCategory(true);

    try {
      const category = await onCreateCategory({
        slug: slugify(categoryForm.slug || categoryForm.name),
        name: categoryForm.name.trim(),
        teaser: categoryForm.teaser.trim()
      });

      setCategoryForm({ slug: "", name: "", teaser: "" });
      setProductForm((current) => ({ ...current, category_slug: category.slug }));
      setIsCategoryModalOpen(false);
      notify({ severity: "success", title: "Category created", message: `${category.name} was created successfully and is ready for products.`, scope: "catalog", dedupeKey: `catalog:category:${category.slug}:create:success` });
    } catch (error) {
      notifyError(error, { operation: "create category", scope: "catalog", dedupeKey: "catalog:category:create:error" });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategorySlug || !canUpdate) {
      notify({ severity: "error", title: "Category not updated", message: "The active role cannot update catalog records.", scope: "catalog", dedupeKey: "catalog:category:update:permission" });
      return;
    }

    setIsSavingCategory(true);

    try {
      const category = await onUpdateCategory(editingCategorySlug, {
        name: categoryEditForm.name.trim(),
        teaser: categoryEditForm.teaser.trim()
      });
      closeCategoryEdit();
      notify({ severity: "success", title: "Category updated", message: `${category.name} was updated successfully.`, scope: "catalog", dedupeKey: `catalog:category:${category.slug}:update:success` });
    } catch (error) {
      notifyError(error, { operation: "update category", scope: "catalog", dedupeKey: `catalog:category:${editingCategorySlug}:update:error` });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const requestDeleteCategory = (category: Category) => {
    if (!canDelete) {
      notify({ severity: "error", title: "Category not deleted", message: "The active role cannot delete catalog records.", scope: "catalog", dedupeKey: "catalog:category:delete:permission" });
      return;
    }

    setPendingConfirm({ kind: "delete-category", category });
  };

  const executeDeleteCategory = async (category: Category) => {
    setDeletingCategorySlug(category.slug);

    try {
      await onDeleteCategory(category.slug);
      notify({ severity: "success", title: "Category deleted", message: `${category.name} was deleted successfully.`, scope: "catalog", dedupeKey: `catalog:category:${category.slug}:delete:success` });
    } catch (error) {
      notifyError(error, { operation: "delete category", scope: "catalog", dedupeKey: `catalog:category:${category.slug}:delete:error` });
    } finally {
      setDeletingCategorySlug(null);
      setPendingConfirm(null);
    }
  };

  const handleSaveProduct = async () => {
    const canSave = editingProductId === null ? canCreate : canUpdate;

    if (!canSave) {
      notify({ severity: "error", title: "Product not saved", message: "The active role cannot save catalog records.", scope: "catalog", dedupeKey: "catalog:product:save:permission" });
      return;
    }

    setIsSavingProduct(true);
    const wasCreating = editingProductId === null;

    try {
      const product =
        editingProductId === null
          ? await onCreateProduct(productInputFromForm(productForm))
          : await onUpdateProduct(editingProductId, productInputFromForm(productForm));

      setProductForm(emptyProductForm(categories));
      closeProductModal();
      notify({ severity: "success", title: wasCreating ? "Product created" : "Product updated", message: `${product.name} was ${wasCreating ? "created" : "updated"} successfully.`, scope: "catalog", dedupeKey: `catalog:product:${product.id}:${wasCreating ? "create" : "update"}:success` });
    } catch (error) {
      notifyError(error, { operation: wasCreating ? "create product" : "update product", scope: "catalog", dedupeKey: `catalog:product:${editingProductId ?? "new"}:save:error` });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const requestDeleteProduct = (product: Product) => {
    if (!canDelete) {
      notify({ severity: "error", title: "Product not deleted", message: "The active role cannot delete catalog records.", scope: "catalog", dedupeKey: "catalog:product:delete:permission" });
      return;
    }

    setPendingConfirm({ kind: "delete-product", product });
  };

  const executeDeleteProduct = async (product: Product) => {
    setDeletingProductId(product.id);

    try {
      await onDeleteProduct(product.id);
      if (editingProductId === product.id) {
        closeProductModal();
      }
      notify({ severity: "success", title: "Product deleted", message: `${product.name} was deleted successfully.`, scope: "catalog", dedupeKey: `catalog:product:${product.id}:delete:success` });
    } catch (error) {
      notifyError(error, { operation: "delete product", scope: "catalog", dedupeKey: `catalog:product:${product.id}:delete:error` });
    } finally {
      setDeletingProductId(null);
      setPendingConfirm(null);
    }
  };

  const selectedProducts = products.filter((product) => selectedProductIds.has(product.id));

  const requestBulkDelete = (scope: "selected" | "all") => {
    const targets = scope === "all" ? products : selectedProducts;
    if (!canDelete || targets.length === 0) return;
    setPendingConfirm({ kind: "bulk-delete", scope, count: targets.length });
  };

  const executeBulkDelete = async (scope: "selected" | "all") => {
    const targets = scope === "all" ? products : selectedProducts;
    if (!canDelete || targets.length === 0) {
      setPendingConfirm(null);
      return;
    }

    setIsBulkActionRunning(true);
    try {
      await Promise.all(targets.map((product) => onDeleteProduct(product.id)));
      setSelectedProductIds(new Set());
      notify({ severity: "success", title: "Inventory deleted", message: `${targets.length} ${targets.length === 1 ? "record was" : "records were"} deleted successfully.`, scope: "catalog", dedupeKey: `catalog:product:bulk-delete:${scope}:success` });
    } catch (error) {
      notifyError(error, { operation: `delete ${scope} inventory records`, scope: "catalog", dedupeKey: `catalog:product:bulk-delete:${scope}:error` });
    } finally {
      setIsBulkActionRunning(false);
      setPendingConfirm(null);
    }
  };

  const executePendingConfirm = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === "apply-images") {
      await executeApplyImageManifest();
    } else if (pendingConfirm.kind === "delete-category") {
      await executeDeleteCategory(pendingConfirm.category);
    } else if (pendingConfirm.kind === "delete-product") {
      await executeDeleteProduct(pendingConfirm.product);
    } else {
      await executeBulkDelete(pendingConfirm.scope);
    }
  };

  const handlePublishSelected = async () => {
    if (!canUpdate || selectedProducts.length === 0) return;

    setIsBulkActionRunning(true);
    try {
      await Promise.all(selectedProducts.map((product) => onUpdateProduct(product.id, { ...product, featured: true })));
      setSelectedProductIds(new Set());
      notify({ severity: "success", title: "Storefront activated", message: `${selectedProducts.length} ${selectedProducts.length === 1 ? "product is" : "products are"} now visible on the storefront.`, scope: "catalog", dedupeKey: "catalog:product:bulk-publish:success" });
    } catch (error) {
      notifyError(error, { operation: "activate selected products on the storefront", scope: "catalog", dedupeKey: "catalog:product:bulk-publish:error" });
    } finally {
      setIsBulkActionRunning(false);
    }
  };

  const categoryColumns = [
    {
      key: "name",
      label: "Category",
      sortValue: (category: Category) => category.name,
      render: (category: Category) => (
        <div className="table-cell-main">
          <strong>{category.name}</strong>
          <span>{category.teaser}</span>
        </div>
      )
    },
    {
      key: "slug",
      label: "Slug",
      sortValue: (category: Category) => category.slug,
      render: (category: Category) => category.slug
    },
    {
      key: "products",
      label: "Products",
      align: "right" as const,
      sortValue: (category: Category) =>
        products.filter((product) => product.category_slug === category.slug).length,
      render: (category: Category) =>
        products.filter((product) => product.category_slug === category.slug).length
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (category: Category) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => openEditCategory(category)}
            type="button"
          >
            Edit
          </button>
          <button
            aria-label={`Delete ${category.name}`}
            className="outline-button table-action table-icon-action danger-button"
            disabled={!canDelete || deletingCategorySlug === category.slug}
            onClick={() => requestDeleteCategory(category)}
            title={`Delete ${category.name}`}
            type="button"
          >
            {deletingCategorySlug === category.slug ? "…" : <TrashIcon />}
          </button>
        </div>
      )
    }
  ];

  const productColumns = [
    {
      key: "name",
      label: "Product",
      sortValue: (product: Product) => product.name,
      render: (product: Product) => (
        <div className="table-cell-main">
          <strong>{product.name}</strong>
          <span>{product.tone}</span>
        </div>
      )
    },
    {
      key: "category",
      label: "Category",
      sortValue: (product: Product) =>
        categoryNameBySlug.get(product.category_slug) ?? product.category_slug,
      render: (product: Product) =>
        categoryNameBySlug.get(product.category_slug) ?? product.category_slug
    },
    {
      key: "price",
      label: "Price",
      align: "right" as const,
      sortValue: (product: Product) => product.price_cents,
      render: (product: Product) => currencyFromCents(product.price_cents)
    },
    {
      key: "stock",
      label: "On hand",
      align: "right" as const,
      sortValue: (product: Product) => product.stock_quantity,
      render: (product: Product) => product.stock_quantity
    },
    {
      key: "threshold",
      label: "Low-stock at",
      align: "right" as const,
      sortValue: (product: Product) => product.low_stock_threshold,
      render: (product: Product) => product.low_stock_threshold
    },
    {
      key: "status",
      label: "Stock status",
      sortValue: (product: Product) =>
        product.stock_quantity === 0 ? 0 : product.stock_quantity <= product.low_stock_threshold ? 1 : 2,
      render: (product: Product) => {
        const isOut = product.stock_quantity === 0;
        const isLow = product.stock_quantity <= product.low_stock_threshold;

        return (
          <span className={`status-pill ${isOut ? "danger" : isLow ? "warning" : "live"}`}>
            {isOut ? "Out of stock" : isLow ? "Low" : "Healthy"}
          </span>
        );
      }
    },
    {
      key: "featured",
      label: "Featured",
      sortValue: (product: Product) => product.featured,
      render: (product: Product) => (
        <span className={`status-pill ${product.featured ? "live" : ""}`}>
          {product.featured ? "Featured" : "Hidden"}
        </span>
      )
    },
    {
      key: "image",
      label: "Image",
      render: (product: Product) =>
        product.image_url ? (
          <div className="table-cell-main">
            <img
              src={product.image_url}
              alt=""
              className="product-thumbnail"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span className="status-pill live">Ready</span>
          </div>
        ) : <span className="status-pill warning">Missing</span>
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (product: Product) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => openEditProduct(product)}
            type="button"
          >
            Edit
          </button>
          <button
            aria-label={`Delete ${product.name}`}
            className="outline-button table-action table-icon-action danger-button"
            disabled={!canDelete || deletingProductId === product.id}
            onClick={() => requestDeleteProduct(product)}
            title={`Delete ${product.name}`}
            type="button"
          >
            {deletingProductId === product.id ? "…" : <TrashIcon />}
          </button>
        </div>
      )
    }
  ];

  const isConfirmBusy =
    isApplyingImages ||
    deletingCategorySlug !== null ||
    deletingProductId !== null ||
    isBulkActionRunning;

  const confirmModalCopy =
    pendingConfirm?.kind === "apply-images"
      ? {
          eyebrow: "Image manifest",
          title: "Apply verified product images",
          message: `Apply ${imageImportReport?.products_updated ?? 0} verified image change(s) from ${imageManifestName}?`,
          confirmLabel: "Apply images",
          tone: "warning" as const
        }
      : pendingConfirm?.kind === "delete-category"
        ? {
            eyebrow: "Department removal",
            title: `Delete ${pendingConfirm.category.name}`,
            message: `Delete the ${pendingConfirm.category.name} category?`,
            confirmLabel: "Delete category",
            tone: "danger" as const
          }
        : pendingConfirm?.kind === "delete-product"
          ? {
              eyebrow: "Product removal",
              title: `Delete ${pendingConfirm.product.name}`,
              message: `Delete ${pendingConfirm.product.name}?`,
              confirmLabel: "Delete product",
              tone: "danger" as const
            }
          : pendingConfirm?.kind === "bulk-delete"
            ? {
                eyebrow: pendingConfirm.scope === "all" ? "Bulk removal" : "Selected removal",
                title:
                  pendingConfirm.scope === "all"
                    ? "Delete all inventory records"
                    : "Delete selected inventory records",
                message: `Delete ${pendingConfirm.count} ${pendingConfirm.count === 1 ? "inventory record" : "inventory records"}?`,
                confirmLabel: pendingConfirm.scope === "all" ? "Delete all" : "Delete selected",
                tone: "danger" as const
              }
            : null;

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">{variant === "inventory" ? "Inventory manager" : "Catalog manager"}</p>
          <h3>{variant === "inventory" ? "Manage product stock and replenishment" : "Manage categories and products"}</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
          {canCreate || canUpdate || canDelete ? "Writable" : "Read only"}
        </span>
      </div>

      <div className="record-toolbar">
        {variant === "catalog" ? (
          <button className="outline-button" disabled={!canCreate} onClick={openCreateCategory} type="button">
            Create Category
          </button>
        ) : null}
        <button className="solid-button" disabled={!canCreate} onClick={openCreateProduct} type="button">
          {variant === "inventory" ? "Add Inventory Item" : "Create Product"}
        </button>
        {variant === "catalog" ? (
          <label className={`outline-button catalogue-import${canCreate ? "" : " is-disabled"}`}>
            {isImporting ? "Importing…" : "Import from AutoCount"}
            <input
              accept=".csv,text/csv"
              disabled={!canCreate || isImporting}
              onChange={handleImportFile}
              type="file"
            />
          </label>
        ) : null}
        {variant === "catalog" ? (
          <label className={`outline-button catalogue-import${canUpdate ? "" : " is-disabled"}`}>
            {isCheckingImages ? "Checking images…" : "Check image manifest"}
            <input
              accept=".csv,text/csv"
              disabled={!canUpdate || isCheckingImages || isApplyingImages}
              onChange={handleImageManifestFile}
              type="file"
            />
          </label>
        ) : null}
        {variant === "catalog" && imageImportReport?.dry_run && imageImportReport.approved_rows > 0 ? (
          <button
            className="solid-button"
            disabled={!canUpdate || isApplyingImages || imageImportReport.products_updated === 0}
            onClick={requestApplyImageManifest}
            type="button"
          >
            {isApplyingImages ? "Applying…" : `Apply ${imageImportReport.products_updated} verified images`}
          </button>
        ) : null}
      </div>

      {importReport ? (
        <div className="catalogue-import-report" role="status">
          <strong>
            {importReport.rows_read} rows read · {importReport.products_created} created ·{" "}
            {importReport.products_updated} updated · {importReport.categories_created} new
            categories
          </strong>
          {importReport.problems.length > 0 ? (
            <details>
              <summary>{importReport.problems.length} row(s) skipped</summary>
              <ul>
                {importReport.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {imageImportReport ? (
        <div className="catalogue-import-report" role="status">
          <strong>
            {imageImportReport.dry_run ? "Check only · no changes made · " : "Applied · "}
            {imageImportReport.rows_read} rows · {imageImportReport.rows_pending} pending ·{" "}
            {imageImportReport.approved_rows} approved · {imageImportReport.products_matched} matched ·{" "}
            {imageImportReport.products_updated} {imageImportReport.dry_run ? "ready to update" : "updated"}
          </strong>
          {imageImportReport.problems.length > 0 ? (
            <details>
              <summary>{imageImportReport.problems.length} issue(s) need attention</summary>
              <ul>
                {imageImportReport.problems.map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {variant === "catalog" ? (
        <div className="record-toolbar catalog-subtabs" role="tablist" aria-label="Catalog sections">
          <button
            aria-selected={catalogSubtab === "products"}
            className={catalogSubtab === "products" ? "solid-button catalog-subtab active" : "outline-button catalog-subtab"}
            onClick={() => setCatalogSubtab("products")}
            role="tab"
            type="button"
          >
            Products ({products.length})
          </button>
          <button
            aria-selected={catalogSubtab === "departments"}
            className={catalogSubtab === "departments" ? "solid-button catalog-subtab active" : "outline-button catalog-subtab"}
            onClick={() => setCatalogSubtab("departments")}
            role="tab"
            type="button"
          >
            Departments ({categories.length})
          </button>
        </div>
      ) : null}

      <div className="admin-panels">
        {variant === "catalog" && catalogSubtab === "departments" ? (
          <article className="dashboard-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Current categories</p>
                <h3>Department table</h3>
              </div>
            </div>
            <ManagementTable
              columns={categoryColumns}
              emptyMessage={
                categories.length === 0
                  ? "No categories have been created yet."
                  : "No departments match your search."
              }
              getRowKey={(category) => category.slug}
              getSearchText={(category) => `${category.name} ${category.slug} ${category.teaser}`}
              initialSortKey="name"
              onRowClick={canUpdate ? openEditCategory : undefined}
              onSearchChange={setCategorySearch}
              rows={categories}
              searchPlaceholder="Search departments..."
              searchValue={categorySearch}
              tableLabel="Category management table"
            />
          </article>
        ) : (
          <article className="dashboard-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">{variant === "inventory" ? "Stock records" : "Storefront products"}</p>
                <h3>{variant === "inventory" ? "Inventory management table" : "Product inventory table"}</h3>
              </div>
            </div>
            {variant === "inventory" ? (
              <div className="inventory-bulk-actions" aria-label="Inventory bulk actions">
                <span>{selectedProducts.length ? `${selectedProducts.length} selected` : "Select inventory records to run a bulk action"}</span>
                <div className="inventory-bulk-controls">
                  <div className="inventory-bulk-selection-actions">
                    <button disabled={!canUpdate || selectedProducts.length === 0 || isBulkActionRunning} onClick={() => void handlePublishSelected()} type="button">
                      Activate selected storefront
                    </button>
                    <button className="danger-button" disabled={!canDelete || selectedProducts.length === 0 || isBulkActionRunning} onClick={() => requestBulkDelete("selected")} type="button">
                      Delete selected
                    </button>
                  </div>
                  <span className="inventory-bulk-separator" aria-hidden="true" />
                  <button className="danger-button inventory-bulk-all-action" disabled={!canDelete || products.length === 0 || isBulkActionRunning} onClick={() => requestBulkDelete("all")} type="button">
                    Delete all
                  </button>
                </div>
              </div>
            ) : null}
            <ManagementTable
              columns={productColumns}
              emptyMessage={
                products.length === 0
                  ? "No products have been merchandised yet."
                  : "No products match the current filters."
              }
              filterSlot={
                <>
                  <label className="management-filter-select">
                    <span className="sr-only">Filter by category</span>
                    <select
                      aria-label="Filter by category"
                      className="table-select"
                      onChange={(event) => setProductCategoryFilter(event.target.value)}
                      value={productCategoryFilter}
                    >
                      <option value="all">All categories</option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="management-filter-pills" role="group" aria-label="Filter by stock status">
                    {(
                      [
                        { key: "all", label: "All" },
                        { key: "low", label: "Low stock" },
                        { key: "out", label: "Out of stock" }
                      ] as const
                    ).map((pill) => (
                      <button
                        aria-pressed={productStockFilter === pill.key}
                        className={
                          productStockFilter === pill.key
                            ? "solid-button table-action"
                            : "outline-button table-action"
                        }
                        key={pill.key}
                        onClick={() => setProductStockFilter(pill.key)}
                        type="button"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </>
              }
              getRowKey={(product) => product.id}
              getSearchText={productSearchText}
              initialSortKey="name"
              onRowClick={canUpdate ? openEditProduct : undefined}
              onSearchChange={setProductSearch}
              onSelectionChange={variant === "inventory" ? setSelectedProductIds : undefined}
              rows={filteredProducts}
              searchPlaceholder="Search products, brand, or category..."
              searchValue={productSearch}
              selectable={variant === "inventory"}
              selectedKeys={selectedProductIds}
              summaryText={`${searchedProductCount} of ${products.length} ${products.length === 1 ? "product" : "products"}`}
              tableLabel="Product inventory management table"
            />
          </article>
        )}
      </div>

      {variant === "catalog" ? (
        <RecordModal
        eyebrow="New category"
        isBusy={isSavingCategory}
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
        }}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Add a department to the storefront"
      >
        <RecordForm
          disabled={!canCreate}
          fields={categoryFields}
          isSubmitting={isSavingCategory}
          onCancel={() => {
            setIsCategoryModalOpen(false);
          }}
          onChange={setCategoryForm}
          onSubmit={() => void handleCreateCategory()}
          submitLabel="Create Category"
          values={categoryForm}
        />
        </RecordModal>
      ) : null}

      {variant === "catalog" ? (
        <RecordModal
        eyebrow="Editing category"
        isBusy={isSavingCategory}
        isOpen={isCategoryEditOpen}
        onClose={closeCategoryEdit}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title={editingCategory?.name ?? "Edit category"}
      >
        <RecordForm
          disabled={!canUpdate}
          fields={updateCategoryFields}
          isSubmitting={isSavingCategory}
          onCancel={closeCategoryEdit}
          onChange={setCategoryEditForm}
          onSubmit={() => void handleUpdateCategory()}
          submitLabel="Save Category"
          values={categoryEditForm}
        />
        </RecordModal>
      ) : null}

      <RecordModal
        eyebrow={editingProductId === null ? "New product" : "Editing product"}
        isBusy={isSavingProduct}
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        size="wide"
        statusLabel={editingProductId === null ? (canCreate ? "Writable" : "Read only") : canUpdate ? "Writable" : "Read only"}
        statusTone={editingProductId === null ? (canCreate ? "live" : undefined) : canUpdate ? "live" : undefined}
        title={
          editingProductId === null
            ? variant === "inventory" ? "Add inventory item" : "Publish a new storefront item"
            : editingProduct?.name ?? "Edit storefront item"
        }
      >
        <RecordForm
          disabled={editingProductId === null ? !canCreate : !canUpdate}
          fields={productFieldList}
          isSubmitting={isSavingProduct}
          onCancel={closeProductModal}
          onChange={setProductForm}
          onSubmit={() => void handleSaveProduct()}
          submitLabel={editingProductId === null ? "Create Product" : "Save Product"}
          values={productForm}
        >
          <div className="image-url-preview">
            <label className="product-image-upload">
              <span>Product image</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={editingProductId === null ? !canCreate : !canUpdate}
                onChange={handleImageFileChange}
                type="file"
              />
              <small>Choose a local PNG, JPEG, WebP, or GIF image up to 1 MB.</small>
            </label>
            {productForm.image_url.trim() ? (
              <>
                <img src={productForm.image_url.trim()} alt="Product preview" />
                <button className="text-link" onClick={clearProductImage} type="button">
                  Remove image
                </button>
              </>
            ) : (
              <p>No image selected — the tone block fallback will be used.</p>
            )}
          </div>
        </RecordForm>
      </RecordModal>

      <ConfirmModal
        confirmLabel={confirmModalCopy?.confirmLabel ?? "Confirm"}
        eyebrow={confirmModalCopy?.eyebrow}
        isConfirming={isConfirmBusy}
        isOpen={confirmModalCopy !== null}
        message={confirmModalCopy?.message ?? ""}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={executePendingConfirm}
        title={confirmModalCopy?.title ?? "Confirm action"}
        tone={confirmModalCopy?.tone ?? "danger"}
      />
    </section>
  );
}

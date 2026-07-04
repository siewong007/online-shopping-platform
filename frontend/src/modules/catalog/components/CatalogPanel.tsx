import { useEffect, useMemo, useState } from "react";

import { ManagementTable } from "../../../shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "../../../shared/components/RecordModal";
import { currencyFromCents } from "../../../shared/formatters";
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Product,
  UpdateCategoryInput,
  UpdateProductInput
} from "../types";

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
  onUpdateCategory: (slug: string, input: UpdateCategoryInput) => Promise<Category>;
  onUpdateProduct: (productId: number, input: UpdateProductInput) => Promise<Product>;
  products: Product[];
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

  if (imageUrl && !imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    throw new Error("Image URL must be empty or start with http:// or https://");
  }

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
    {
      name: "image_url",
      label: "Image URL",
      type: "text",
      placeholder: "https://example.com/product.jpg",
      helpText: "Optional. Must be a valid http or https URL. Leave empty to use tone fallback."
    }
  ];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  onUpdateCategory,
  onUpdateProduct,
  products
}: CatalogPanelProps) {
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
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingCategorySlug, setDeletingCategorySlug] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const productFieldList = useMemo(() => productFields(categories), [categories]);
  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories]
  );
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

  const openCreateCategory = () => {
    setCategoryForm({ slug: "", name: "", teaser: "" });
    setFeedback(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategorySlug(category.slug);
    setCategoryEditForm({ name: category.name, teaser: category.teaser });
    setFeedback(null);
    setIsCategoryEditOpen(true);
  };

  const closeCategoryEdit = () => {
    setIsCategoryEditOpen(false);
    setEditingCategorySlug(null);
    setFeedback(null);
  };

  const openCreateProduct = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm(categories));
    setFeedback(null);
    setIsProductModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm(productFormFromProduct(product));
    setFeedback(null);
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProductId(null);
    setFeedback(null);
  };

  const handleCreateCategory = async () => {
    if (!canCreate) {
      setFeedback({ kind: "error", message: "The active role cannot create catalog records." });
      return;
    }

    setIsSavingCategory(true);
    setFeedback(null);

    try {
      const category = await onCreateCategory({
        slug: slugify(categoryForm.slug || categoryForm.name),
        name: categoryForm.name.trim(),
        teaser: categoryForm.teaser.trim()
      });

      setCategoryForm({ slug: "", name: "", teaser: "" });
      setProductForm((current) => ({ ...current, category_slug: category.slug }));
      setIsCategoryModalOpen(false);
      setFeedback({ kind: "success", message: `${category.name} is ready for products.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create category."
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategorySlug || !canUpdate) {
      setFeedback({ kind: "error", message: "The active role cannot update catalog records." });
      return;
    }

    setIsSavingCategory(true);
    setFeedback(null);

    try {
      const category = await onUpdateCategory(editingCategorySlug, {
        name: categoryEditForm.name.trim(),
        teaser: categoryEditForm.teaser.trim()
      });
      closeCategoryEdit();
      setFeedback({ kind: "success", message: `${category.name} was updated.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update category."
      });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!canDelete) {
      setFeedback({ kind: "error", message: "The active role cannot delete catalog records." });
      return;
    }

    const confirmed = window.confirm(`Delete the ${category.name} category?`);
    if (!confirmed) {
      return;
    }

    setDeletingCategorySlug(category.slug);
    setFeedback(null);

    try {
      await onDeleteCategory(category.slug);
      setFeedback({ kind: "success", message: `${category.name} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete category."
      });
    } finally {
      setDeletingCategorySlug(null);
    }
  };

  const handleSaveProduct = async () => {
    const canSave = editingProductId === null ? canCreate : canUpdate;

    if (!canSave) {
      setFeedback({ kind: "error", message: "The active role cannot save catalog records." });
      return;
    }

    setIsSavingProduct(true);
    setFeedback(null);

    try {
      const product =
        editingProductId === null
          ? await onCreateProduct(productInputFromForm(productForm))
          : await onUpdateProduct(editingProductId, productInputFromForm(productForm));

      setProductForm(emptyProductForm(categories));
      closeProductModal();
      setFeedback({
        kind: "success",
        message:
          editingProductId === null ? `${product.name} was created.` : `${product.name} was updated.`
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to save product."
      });
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!canDelete) {
      setFeedback({ kind: "error", message: "The active role cannot delete catalog records." });
      return;
    }

    const confirmed = window.confirm(`Delete ${product.name}?`);
    if (!confirmed) {
      return;
    }

    setDeletingProductId(product.id);
    setFeedback(null);

    try {
      await onDeleteProduct(product.id);
      if (editingProductId === product.id) {
        closeProductModal();
      }
      setFeedback({ kind: "success", message: `${product.name} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete product."
      });
    } finally {
      setDeletingProductId(null);
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
            className="outline-button table-action danger-button"
            disabled={!canDelete || deletingCategorySlug === category.slug}
            onClick={() => void handleDeleteCategory(category)}
            type="button"
          >
            {deletingCategorySlug === category.slug ? "Deleting..." : "Delete"}
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
      key: "visibility",
      label: "Visibility",
      sortValue: (product: Product) => product.featured,
      render: (product: Product) => (
        <span className={`status-pill ${product.featured ? "live" : ""}`}>
          {product.featured ? "Live" : "Hidden"}
        </span>
      )
    },
    {
      key: "image",
      label: "Image",
      render: (product: Product) =>
        product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="product-thumbnail"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null
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
            className="outline-button table-action danger-button"
            disabled={!canDelete || deletingProductId === product.id}
            onClick={() => void handleDeleteProduct(product)}
            type="button"
          >
            {deletingProductId === product.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      )
    }
  ];

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Catalog manager</p>
          <h3>Manage categories and products</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate || canDelete ? "live" : ""}`}>
          {canCreate || canUpdate || canDelete ? "Writable" : "Read only"}
        </span>
      </div>

      <div className="record-toolbar">
        <button className="outline-button" disabled={!canCreate} onClick={openCreateCategory} type="button">
          Create Category
        </button>
        <button className="solid-button" disabled={!canCreate} onClick={openCreateProduct} type="button">
          Create Product
        </button>
      </div>

      {feedback && !isCategoryModalOpen && !isCategoryEditOpen && !isProductModalOpen ? (
        <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p>
      ) : null}

      <div className="admin-panels two-up">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Current categories</p>
              <h3>Department table</h3>
            </div>
          </div>
          <ManagementTable
            columns={categoryColumns}
            emptyMessage="No categories have been created yet."
            getRowKey={(category) => category.slug}
            initialSortKey="name"
            rows={categories}
            tableLabel="Category management table"
          />
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Storefront products</p>
              <h3>Product inventory table</h3>
            </div>
          </div>
          <ManagementTable
            columns={productColumns}
            emptyMessage="No products have been merchandised yet."
            getRowKey={(product) => product.id}
            initialSortKey="name"
            rows={products}
            tableLabel="Product inventory management table"
          />
        </article>
      </div>

      <RecordModal
        eyebrow="New category"
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setFeedback(null);
        }}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Add a department to the storefront"
      >
        <RecordForm
          disabled={!canCreate}
          feedback={
            feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null
          }
          fields={categoryFields}
          isSubmitting={isSavingCategory}
          onCancel={() => {
            setIsCategoryModalOpen(false);
            setFeedback(null);
          }}
          onChange={setCategoryForm}
          onSubmit={() => void handleCreateCategory()}
          submitLabel="Create Category"
          values={categoryForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow="Editing category"
        isOpen={isCategoryEditOpen}
        onClose={closeCategoryEdit}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title={editingCategory?.name ?? "Edit category"}
      >
        <RecordForm
          disabled={!canUpdate}
          feedback={
            feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null
          }
          fields={updateCategoryFields}
          isSubmitting={isSavingCategory}
          onCancel={closeCategoryEdit}
          onChange={setCategoryEditForm}
          onSubmit={() => void handleUpdateCategory()}
          submitLabel="Save Category"
          values={categoryEditForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow={editingProductId === null ? "New product" : "Editing product"}
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        size="wide"
        statusLabel={editingProductId === null ? (canCreate ? "Writable" : "Read only") : canUpdate ? "Writable" : "Read only"}
        statusTone={editingProductId === null ? (canCreate ? "live" : undefined) : canUpdate ? "live" : undefined}
        title={
          editingProductId === null
            ? "Publish a new storefront item"
            : editingProduct?.name ?? "Edit storefront item"
        }
      >
        <RecordForm
          disabled={editingProductId === null ? !canCreate : !canUpdate}
          feedback={
            feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null
          }
          fields={productFieldList}
          isSubmitting={isSavingProduct}
          onCancel={closeProductModal}
          onChange={setProductForm}
          onSubmit={() => void handleSaveProduct()}
          submitLabel={editingProductId === null ? "Create Product" : "Save Product"}
          values={productForm}
        />
        <div className="image-url-preview">
          <span>Image preview</span>
          {productForm.image_url.trim() ? (
            <img
              src={productForm.image_url.trim()}
              alt="Product preview"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                const parent = event.currentTarget.parentElement;
                if (parent) parent.classList.add("preview-broken");
              }}
              onLoad={(event) => {
                event.currentTarget.style.display = "block";
                const parent = event.currentTarget.parentElement;
                if (parent) parent.classList.remove("preview-broken");
              }}
            />
          ) : (
            <p>No image URL set — the tone block fallback will be used.</p>
          )}
          <p className="image-url-preview-broken-note">Image could not be loaded from that URL.</p>
        </div>
      </RecordModal>
    </section>
  );
}

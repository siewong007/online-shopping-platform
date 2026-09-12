import {
  lazy,
  startTransition,
  Suspense,
  useEffect,
  useRef,
  useState
} from "react";

import {
  changeOwnPassword as changeOwnPasswordRequest,
  startPaymentCheckout as startPaymentCheckoutRequest,
  createAdminOrder as createAdminOrderRequest,
  createAdminUser as createAdminUserRequest,
  createCategory as createCategoryRequest,
  createCustomerPortalProfile as createCustomerPortalProfileRequest,
  createInvoiceFromOrder as createInvoiceFromOrderRequest,
  createPayment as createPaymentRequest,
  createProduct as createProductRequest,
  createRole as createRoleRequest,
  deleteAdminOrder as deleteAdminOrderRequest,
  deleteCategory as deleteCategoryRequest,
  deleteCustomerPortalProfile as deleteCustomerPortalProfileRequest,
  deletePayment as deletePaymentRequest,
  AUDIT_EVENTS_PAGE_SIZE,
  deleteProduct as deleteProductRequest,
  deleteRole as deleteRoleRequest,
  exportAutoCountInvoices as exportAutoCountInvoicesRequest,
  fetchAdminCatalog,
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAuditEvents,
  fetchCustomerPortalProfiles,
  fetchInvoices,
  fetchMe,
  fetchOrders,
  fetchPayments,
  fetchPermissions,
  fetchSales,
  fetchSalesSummary,
  fetchStorefront,
  findInitialProductById,
  initialProductDirectory,
  fetchSystemSettings,
  login as loginRequest,
  verifyLogin,
  logout as logoutRequest,
  recordInvoicePayment as recordInvoicePaymentRequest,
  resetAdminUserPassword as resetAdminUserPasswordRequest,
  setAdminUserActive as setAdminUserActiveRequest,
  updateAdminOrder as updateAdminOrderRequest,
  updateAdminUserProfile as updateAdminUserProfileRequest,
  updateCategory as updateCategoryRequest,
  updateCustomerPortalProfile as updateCustomerPortalProfileRequest,
  updateInvoiceBilling as updateInvoiceBillingRequest,
  updatePayment as updatePaymentRequest,
  updateProduct as updateProductRequest,
  updateOrderFulfillment as updateOrderFulfillmentRequest,
  updateRole as updateRoleRequest,
  updateRolePermission as updateRolePermissionRequest,
  updateSalesDetails as updateSalesDetailsRequest,
  updateSalesStatus as updateSalesStatusRequest,
  updateSystemSetting as updateSystemSettingRequest,
  voidInvoice as voidInvoiceRequest
} from "./lib/api";
import { useI18n } from "./i18n/LanguageContext";
import { LandingView } from "./modules/landing/LandingView";
import { LegalPage } from "./modules/legal/LegalPage";
import { LEGAL_DOCUMENTS, type LegalSlug } from "./modules/legal/content";
import { JOB_LENSES, type JobLensId } from "./modules/storefront/jobLenses";
import {
  createPromotion as createPromotionRequest,
  createVoucher as createVoucherRequest,
  deletePromotion as deletePromotionRequest,
  deleteVoucher as deleteVoucherRequest,
  fetchPublicOffers,
  fetchPromotions,
  fetchVouchers,
  updatePromotion as updatePromotionRequest,
  updateVoucher as updateVoucherRequest
} from "./modules/offers/api/offersApi";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  Promotion,
  PublicOffersPayload,
  UpdatePromotionInput,
  UpdateVoucherInput,
  Voucher
} from "./modules/offers/types";
import { SupportChatWidget } from "./modules/support/components/SupportChatWidget";
import {
  ApiError,
  getAuthToken,
  setAuthToken,
  setOnUnauthorized
} from "./shared/api/http";
import type { PagedResponse } from "./shared/api/pagination";
import { StatusPage } from "./shared/components/StatusPage";
import { currencyFromCents } from "./shared/formatters";
import { useNotifications } from "./shared/notifications";
import type {
  ActivityItem,
  AdminCatalogPayload,
  AdminDashboardPayload,
  AdminLoginInput,
  AdminLoginResponse,
  AdminMePayload,
  AdminResetPasswordInput,
  AdminUser,
  AutoCountExportInput,
  AuditEvent,
  CartItem,
  Category,
  ChangeOwnPasswordInput,
  CreateAdminUserInput,
  CreateCategoryInput,
  CreateCustomerPortalProfileInput,
  CreateInvoiceFromOrderInput,
  CreateOrderInput,
  CreatePaymentInput,
  CreateProductInput,
  CreateRoleInput,
  CustomerPortalProfile,
  Invoice,
  Order,
  Payment,
  PermissionsPayload,
  Product,
  RecordInvoicePaymentInput,
  Role,
  RolePagePermission,
  SalesRecord,
  PaymentCheckout,
  SalesSummaryPayload,
  SetAdminUserActiveInput,
  StorefrontPayload,
  StorefrontSort,
  SystemSetting,
  UpdateAdminUserProfileInput,
  UpdateCategoryInput,
  UpdateCustomerPortalProfileInput,
  UpdateInvoiceBillingInput,
  UpdatePaymentInput,
  UpdateProductInput,
  UpdateOrderFulfillmentInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput,
  UpdateSystemSettingInput
} from "./types";
import {
  consumePaymentReturn,
  takePendingPayment
} from "./modules/payments/paymentReturn";

import {
  applyPermissionUpdate,
  canAccess,
  permissionsFromAuth,
  type AdminAuthSnapshot,
  type AdminAuthState,
  type AdminTab
} from "./app/adminHelpers";
import {
  legalSlugFromPath,
  productIdFromPath,
  viewFromPath,
  type View
} from "./app/routing";
import {
  appendUniqueByKey,
  auditEventToActivityItem,
  downloadBlob,
  fulfillmentLabel,
  readStoredAccountEmail,
  rememberAccountEmail
} from "./app/utils";
import { AccountDrawer } from "./modules/customer_auth/AccountDrawer";
import { AdminView } from "./modules/dashboard/AdminView";
import { CartDrawer } from "./modules/storefront/CartDrawer";
import {
  CART_STORAGE_KEY,
  PURCHASE_ENABLED,
  reconcileCartStock
} from "./modules/storefront/helpers";
import { ProductDetailView } from "./modules/storefront/ProductDetailView";
import { ShopFooter, ShopHeader } from "./modules/storefront/ShopChrome";
import { StorefrontView } from "./modules/storefront/StorefrontView";

const AdminLoginScreen = lazy(() =>
  import("./modules/auth/components/AdminLoginScreen").then((m) => ({ default: m.AdminLoginScreen }))
);

export default function App() {
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  // Held in state rather than read from location at render time: moving between two
  // policy pages leaves `view` on "legal", so nothing would trigger a re-render.
  const [legalSlug, setLegalSlug] = useState<LegalSlug | null>(() =>
    legalSlugFromPath(window.location.pathname)
  );
  const [productDetailId, setProductDetailId] = useState<number | null>(() =>
    productIdFromPath(window.location.pathname)
  );
  const [storefront, setStorefront] = useState<StorefrontPayload | null>(null);
  const [isStorefrontFallback, setIsStorefrontFallback] = useState(false);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  // Held here, not in StorefrontView: with a paged catalogue these must be part of the
  // query, otherwise they only filter the 60 products that happen to be loaded.
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [isStorefrontRefetching, setIsStorefrontRefetching] = useState(false);
  const [publicOffers, setPublicOffers] = useState<PublicOffersPayload | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeJobId, setActiveJobId] = useState<JobLensId | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [returnFocusProductId, setReturnFocusProductId] = useState<number | null>(null);
  const [minPriceCents, setMinPriceCents] = useState<number | null>(null);
  const [maxPriceCents, setMaxPriceCents] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<StorefrontSort>("featured");
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("overview");
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [oldestAuditEventId, setOldestAuditEventId] = useState<number | null>(null);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [isLoadingMoreActivity, setIsLoadingMoreActivity] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersNextCursor, setOrdersNextCursor] = useState<number | null>(null);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [salesNextCursor, setSalesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreSales, setIsLoadingMoreSales] = useState(false);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryPayload | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesNextCursor, setInvoicesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreInvoices, setIsLoadingMoreInvoices] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerPortalProfile[]>([]);
  const [customerProfilesNextCursor, setCustomerProfilesNextCursor] = useState<number | null>(null);
  const [isLoadingMoreCustomerProfiles, setIsLoadingMoreCustomerProfiles] = useState(false);
  const [customerAccountEmail, setCustomerAccountEmail] = useState(readStoredAccountEmail);
  const [permissions, setPermissions] = useState<PermissionsPayload | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<number | null>(null);
  const [adminMfaChallengeToken, setAdminMfaChallengeToken] = useState<string | null>(null);
  const [adminAuth, setAdminAuth] = useState<AdminAuthState>(() =>
    getAuthToken() ? "checking" : "unauthenticated"
  );
  const [currentAdmin, setCurrentAdmin] = useState<AdminMePayload | null>(null);
  const [adminCatalog, setAdminCatalog] = useState<AdminCatalogPayload | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const isInitialStorefrontFilter = useRef(true);
  const latestProductsById = useRef(
    new Map(initialProductDirectory().map((product) => [product.id, product]))
  );
  const productReturnFocusRef = useRef<number | null>(null);
  const storefrontRequestGeneration = useRef(0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const { t } = useI18n();
  const { notify, notifyError } = useNotifications();

  // A hosted gateway redirects the shopper back after showing its payment result. The signed
  // server-to-server webhook remains the source of truth, so do not promise success here.
  useEffect(() => {
    const paymentReturn = consumePaymentReturn(window.location.search);
    if (!paymentReturn.isPaymentReturn) {
      return;
    }

    let pendingPayment = null;
    try {
      pendingPayment = takePendingPayment(window.sessionStorage);
    } catch {
      // Storage may be unavailable in privacy-restricted browsers; the return remains safe.
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${paymentReturn.search ? `?${paymentReturn.search}` : ""}${window.location.hash}`
    );
    notify({
      severity: "info",
      title: "Payment verification in progress",
      message: pendingPayment
        ? `Order #${pendingPayment.orderId} has returned from the secure payment page. We are confirming it with the payment provider; the browser return itself does not mark it paid.`
        : "We are securely confirming your payment. The browser return itself does not mark an order paid.",
      scope: "payment-return",
      dedupeKey: "payment-return:verification"
    });
  }, [notify]);

  useEffect(() => {
    document.title =
      view === "landing"
        ? "Ekoway Hardware — 永光五金 · Sibu, Sarawak"
        : view === "store" || view === "product"
          ? "Ekoway Hardware — Shop Online"
          : view === "admin"
            ? "Ekoway Hardware — OPT Console"
            : view === "forbidden"
              ? "Access denied — Ekoway Hardware"
              : view === "legal" && legalSlug
                ? `${LEGAL_DOCUMENTS[legalSlug].title} — Ekoway Hardware`
                : "Page not found — Ekoway Hardware";
  }, [legalSlug, view]);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const requestGeneration = ++storefrontRequestGeneration.current;
    void fetchStorefront()
      .then(({ isFallback, payload }) => {
        if (storefrontRequestGeneration.current === requestGeneration) {
          payload.products.forEach((product) => latestProductsById.current.set(product.id, product));
          setCart((current) => reconcileCartStock(current, payload.products));
          setStorefront(payload);
          setIsStorefrontFallback(isFallback);
        }
      })
      .catch((error) => {
        notifyError(error, { operation: "load storefront catalogue", scope: "storefront", dedupeKey: "storefront:catalogue:error" });
      });
  }, []);

  useEffect(() => {
    void fetchPublicOffers()
      .then(setPublicOffers)
      .catch((error) => {
        notifyError(error, { operation: "load offers", scope: "offers", dedupeKey: "storefront:offers:error" });
      });
  }, []);

  // The API pages the catalogue; this appends the next page rather than replacing, so the
  // grid grows instead of jumping back to the first 60 results.
  const loadMoreProducts = async () => {
    if (!storefront || isLoadingMoreProducts) return;
    setIsLoadingMoreProducts(true);
    try {
      const { payload } = await fetchStorefront({
        q: searchTerm,
        category: selectedCategory,
        minPriceCents: minPriceCents ?? undefined,
        maxPriceCents: maxPriceCents ?? undefined,
        sort: sortOption,
        inStockOnly,
        onSaleOnly,
        offset: storefront.products.length
      });
      payload.products.forEach((product) => latestProductsById.current.set(product.id, product));
      setStorefront((current) => {
        if (!current) return payload;
        const seen = new Set(current.products.map((product) => product.id));
        return {
          ...current,
          total_products: payload.total_products,
          products: [...current.products, ...payload.products.filter((p) => !seen.has(p.id))]
        };
      });
    } catch (error) {
      notifyError(error, { operation: "load more products", scope: "storefront", dedupeKey: "storefront:load-more:error" });
    } finally {
      setIsLoadingMoreProducts(false);
    }
  };

  useEffect(() => {
    if (isInitialStorefrontFilter.current) {
      isInitialStorefrontFilter.current = false;
      return;
    }

    if (view !== "store") {
      setIsStorefrontRefetching(false);
      return;
    }

    let cancelled = false;
    const requestGeneration = ++storefrontRequestGeneration.current;

    const timeout = window.setTimeout(() => {
      setIsStorefrontRefetching(true);
      void fetchStorefront({
        q: searchTerm,
        category: selectedCategory,
        minPriceCents: minPriceCents ?? undefined,
        maxPriceCents: maxPriceCents ?? undefined,
        sort: sortOption,
        inStockOnly,
        onSaleOnly
      })
        .then(({ isFallback, payload }) => {
          if (!cancelled && storefrontRequestGeneration.current === requestGeneration) {
            payload.products.forEach((product) => latestProductsById.current.set(product.id, product));
            setCart((current) => reconcileCartStock(current, payload.products));
            setStorefront(payload);
            setIsStorefrontFallback(isFallback);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            notifyError(error, { operation: "filter storefront catalogue", scope: "storefront", dedupeKey: "storefront:filter:error" });
          }
        })
        .finally(() => {
          if (!cancelled && storefrontRequestGeneration.current === requestGeneration) {
            setIsStorefrontRefetching(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchTerm, selectedCategory, minPriceCents, maxPriceCents, sortOption, inStockOnly, onSaleOnly, view]);

  useEffect(() => {
    const onPopState = () => {
      const nextView = viewFromPath(window.location.pathname);
      const nextProductId = productIdFromPath(window.location.pathname);

      if (nextView === "store" && productReturnFocusRef.current !== null) {
        setIsStorefrontRefetching(true);
        setReturnFocusProductId(productReturnFocusRef.current);
      } else if (nextView === "product") {
        const historyProductId = window.history.state?.storefrontReturnProductId;
        productReturnFocusRef.current =
          typeof historyProductId === "number" ? historyProductId : productReturnFocusRef.current;
      }

      setView(nextView);
      setProductDetailId(nextProductId);
      setLegalSlug(legalSlugFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = storefront?.products ?? [];
  const isShowingFallbackStorefront = storefront != null && isStorefrontFallback;

  useEffect(() => {
    if (isShowingFallbackStorefront) {
      setActiveJobId(null);
    }
  }, [isShowingFallbackStorefront]);

  const openView = (nextView: Extract<View, "landing" | "store" | "admin">) => {
    startTransition(() => {
      const nextPath = nextView === "admin" ? "/admin" : nextView === "store" ? "/shop" : "/";
      window.history.pushState({}, "", nextPath);
      setView(nextView);
    });
  };

  const openProductDetail = (productId: number) => {
    startTransition(() => {
      window.history.pushState(
        {
          ekowayStorefrontProduct: view === "store",
          storefrontReturnProductId: productReturnFocusRef.current
        },
        "",
        `/shop/products/${productId}`
      );
      setProductDetailId(productId);
      setView("product");
    });
  };

  const applyAdminData = ({
    adminUsersData,
    auditEventsData,
    catalogData,
    dashboardData,
    invoicesData,
    ordersData,
    paymentsData,
    permissionsData,
    promotionsData,
    salesData,
    salesSummaryData,
    systemSettingsData,
    customerProfileData,
    vouchersData
  }: {
    adminUsersData: AdminUser[];
    auditEventsData: AuditEvent[];
    catalogData: AdminCatalogPayload;
    dashboardData: AdminDashboardPayload;
    invoicesData: PagedResponse<Invoice>;
    ordersData: PagedResponse<Order>;
    paymentsData: Payment[];
    permissionsData: PermissionsPayload;
    promotionsData: Promotion[];
    salesData: PagedResponse<SalesRecord>;
    salesSummaryData: SalesSummaryPayload;
    systemSettingsData: SystemSetting[];
    customerProfileData: PagedResponse<CustomerPortalProfile>;
    vouchersData: Voucher[];
  }) => {
    setAdminUsers(adminUsersData);
    setAdminCatalog(catalogData);
    setDashboard(dashboardData);
    setPromotions(promotionsData);
    setVouchers(vouchersData);
    setActivityFeed(auditEventsData.map(auditEventToActivityItem));
    setOldestAuditEventId(
      auditEventsData.length > 0
        ? auditEventsData[auditEventsData.length - 1].id
        : null
    );
    setHasMoreActivity(auditEventsData.length >= AUDIT_EVENTS_PAGE_SIZE);
    setOrders(ordersData.items);
    setOrdersNextCursor(ordersData.next_cursor);
    setPayments(paymentsData);
    setSales(salesData.items);
    setSalesNextCursor(salesData.next_cursor);
    setSalesSummary(salesSummaryData);
    setInvoices(invoicesData.items);
    setInvoicesNextCursor(invoicesData.next_cursor);
    setSystemSettings(systemSettingsData);
    setCustomerProfiles(customerProfileData.items);
    setCustomerProfilesNextCursor(customerProfileData.next_cursor);
    setPermissions(permissionsData);
  };

  const loadAdminData = async (auth: AdminAuthSnapshot) => {
    const ownPermissions = permissionsFromAuth(auth);
    const roleId = auth.role.id;
    const canReadPermissionMatrix = canAccess(
      ownPermissions,
      roleId,
      "admin-permissions",
      "read"
    );

    setCurrentAdmin({
      user: auth.user,
      role: auth.role,
      permissions: auth.permissions
    });
    setPermissions(ownPermissions);
    setActiveRoleId(roleId);

    const [
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchPromotions(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      fetchVouchers(),
      canReadPermissionMatrix ? fetchPermissions() : Promise.resolve(ownPermissions)
    ]);

    applyAdminData({
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    });
  };

  const loadDemoAdminData = async () => {
    const [
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    ] = await Promise.all([
      fetchAdminUsers(),
      fetchAuditEvents(),
      fetchAdminCatalog(),
      fetchAdminDashboard(),
      fetchOrders(),
      fetchPayments(),
      fetchPromotions(),
      fetchSales(),
      fetchSalesSummary(),
      fetchInvoices(),
      fetchSystemSettings(),
      fetchCustomerPortalProfiles(),
      fetchVouchers(),
      fetchPermissions()
    ]);

    setCurrentAdmin(null);
    setActiveRoleId(null);
    applyAdminData({
      adminUsersData,
      auditEventsData,
      catalogData,
      dashboardData,
      ordersData,
      paymentsData,
      promotionsData,
      salesData,
      salesSummaryData,
      invoicesData,
      systemSettingsData,
      customerProfileData,
      vouchersData,
      permissionsData
    });
  };

  const loadMoreOrders = async () => {
    if (ordersNextCursor === null || isLoadingMoreOrders) {
      return;
    }

    setIsLoadingMoreOrders(true);
    try {
      const page = await fetchOrders({ before: ordersNextCursor });
      setOrders((current) => appendUniqueByKey(current, page.items, (order) => order.id));
      setOrdersNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreOrders(false);
    }
  };

  const loadMoreSales = async () => {
    if (salesNextCursor === null || isLoadingMoreSales) {
      return;
    }

    setIsLoadingMoreSales(true);
    try {
      const page = await fetchSales({ before: salesNextCursor });
      setSales((current) => appendUniqueByKey(current, page.items, (sale) => sale.order_id));
      setSalesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreSales(false);
    }
  };

  const loadMoreInvoices = async () => {
    if (invoicesNextCursor === null || isLoadingMoreInvoices) {
      return;
    }

    setIsLoadingMoreInvoices(true);
    try {
      const page = await fetchInvoices({ before: invoicesNextCursor });
      setInvoices((current) => appendUniqueByKey(current, page.items, (invoice) => invoice.id));
      setInvoicesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreInvoices(false);
    }
  };

  const loadMoreCustomerProfiles = async () => {
    if (customerProfilesNextCursor === null || isLoadingMoreCustomerProfiles) {
      return;
    }

    setIsLoadingMoreCustomerProfiles(true);
    try {
      const page = await fetchCustomerPortalProfiles({ before: customerProfilesNextCursor });
      setCustomerProfiles((current) =>
        appendUniqueByKey(current, page.items, (profile) => profile.id)
      );
      setCustomerProfilesNextCursor(page.next_cursor);
    } finally {
      setIsLoadingMoreCustomerProfiles(false);
    }
  };

  const resetAdminSession = () => {
    setAuthToken(null);
    setCurrentAdmin(null);
    setActiveRoleId(null);
    setAdminAuth("unauthenticated");
  };

  const restoreAdminSession = async () => {
    if (!getAuthToken()) {
      resetAdminSession();
      return;
    }

    setAdminAuth("checking");

    try {
      const me = await fetchMe();
      await loadAdminData(me);
      setAdminAuth("authenticated");
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError && import.meta.env.DEV) {
        await loadDemoAdminData();
        setAdminAuth("demo");
        return;
      }

      if (error instanceof ApiError && error.isNetworkError) {
        setCurrentAdmin(null);
        setActiveRoleId(null);
        setAdminAuth("unauthenticated");
        return;
      }

      resetAdminSession();
    }
  };

  const handleAdminLogin = async (
    input: AdminLoginInput,
    turnstileToken: string | null
  ): Promise<AdminLoginResponse> => {
    const response = await loginRequest(input, turnstileToken);
    if ("mfa_required" in response) {
      setAdminMfaChallengeToken(response.challenge_token);
      setAdminAuth("mfa-challenge");
      return response;
    }
    setAdminMfaChallengeToken(null);
    await loadAdminData(response);
    setAdminAuth("authenticated");
    return response;
  };

  const handleAdminMfaVerify = async (input: { code?: string; recovery_code?: string }) => {
    if (!adminMfaChallengeToken) throw new Error("The sign-in session expired. Sign in again.");
    const payload = await verifyLogin({ challenge_token: adminMfaChallengeToken, ...input });
    setAdminMfaChallengeToken(null);
    await loadAdminData(payload);
    setAdminAuth("authenticated");
    return payload;
  };

  const handleAdminLogout = async () => {
    try {
      await logoutRequest();
    } catch (error) {
      console.warn("Unable to notify the API about logout.", error);
      setAuthToken(null);
    } finally {
      resetAdminSession();
    }
  };

  useEffect(() => {
    setOnUnauthorized(() => {
      resetAdminSession();
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  useEffect(() => {
    void restoreAdminSession();
  }, []);

  const addToCart = (product: Product) => {
    if (!PURCHASE_ENABLED) return;

    latestProductsById.current.set(product.id, product);
    const currentProduct = latestProductsById.current.get(product.id) ?? product;
    const stockLimit = Math.max(0, Math.floor(currentProduct.stock_quantity));
    if (stockLimit === 0) return;

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, product: currentProduct, quantity: Math.min(item.quantity + 1, stockLimit) }
            : item
        );
      }

      return [...current, { product: currentProduct, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: number) => {
    setCart((current) => current.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((current) => {
      const item = current.find((candidate) => candidate.product.id === productId);
      if (!item) return current;

      const currentProduct = latestProductsById.current.get(productId) ?? item.product;
      const stockLimit = Math.max(0, Math.floor(currentProduct.stock_quantity));
      if (stockLimit === 0) return current.filter((candidate) => candidate.product.id !== productId);

      return current.map((candidate) =>
        candidate.product.id === productId
          ? { ...candidate, product: currentProduct, quantity: Math.min(quantity, stockLimit) }
          : candidate
      );
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPromotionId(null);
    setVoucherCode("");
  };

  const grabPromotion = (promotionId: number) => {
    setSelectedPromotionId(promotionId);
    setIsAccountOpen(false);
    setIsCartOpen(true);
  };

  const submitCheckout = async (input: CreateOrderInput): Promise<PaymentCheckout> => {
    const checkout = await startPaymentCheckoutRequest(input);
    const order = checkout.order;
    const checkoutEmail = order.customer_email.trim().toLowerCase();

    setCustomerAccountEmail(checkoutEmail);
    rememberAccountEmail(checkoutEmail);
    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then((page) => {
      setCustomerProfiles(page.items);
      setCustomerProfilesNextCursor(page.next_cursor);
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} placed for ${currencyFromCents(
          order.total_cents ?? order.subtotal_cents
        )}.`
      },
      ...current
    ]);

    return checkout;
  };

  const createAdminOrder = async (input: CreateOrderInput): Promise<Order> => {
    const order = await createAdminOrderRequest(input);

    setOrders((current) => [order, ...current]);
    void fetchCustomerPortalProfiles().then((page) => {
      setCustomerProfiles(page.items);
      setCustomerProfilesNextCursor(page.next_cursor);
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Admin order #${order.id} created for ${order.customer_name}.`
      },
      ...current
    ]);

    return order;
  };

  const updateAdminOrder = async (orderId: number, input: CreateOrderInput): Promise<Order> => {
    const order = await updateAdminOrderRequest(orderId, input);

    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} updated for ${order.customer_name}.`
      },
      ...current
    ]);

    return order;
  };

  const updateOrderFulfillment = async (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ): Promise<Order> => {
    const order = await updateOrderFulfillmentRequest(orderId, input);

    setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    if (order.fulfillment_status === "completed" || order.fulfillment_status === "delivered") {
      void fetchSales().then((page) => {
        setSales(page.items);
        setSalesNextCursor(page.next_cursor);
      });
      void fetchSalesSummary().then(setSalesSummary);
    }
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${order.id} moved to ${fulfillmentLabel(order.fulfillment_status)}.`
      },
      ...current
    ]);

    return order;
  };

  const deleteAdminOrder = async (orderId: number): Promise<void> => {
    await deleteAdminOrderRequest(orderId);

    setOrders((current) => current.filter((order) => order.id !== orderId));
    setPayments((current) => current.filter((payment) => payment.order_id !== orderId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Order #${orderId} was removed from the order book.`
      },
      ...current
    ]);
  };

  const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
    const payment = await createPaymentRequest(input);

    setPayments((current) => {
      const exists = current.some((item) => item.id === payment.id);
      return exists
        ? current.map((item) => (item.id === payment.id ? payment : item))
        : [payment, ...current];
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${payment.id} recorded for order #${payment.order_id}.`
      },
      ...current
    ]);

    return payment;
  };

  const updatePayment = async (
    paymentId: number,
    input: UpdatePaymentInput
  ): Promise<Payment> => {
    const payment = await updatePaymentRequest(paymentId, input);

    setPayments((current) => current.map((item) => (item.id === payment.id ? payment : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${payment.id} was updated for order #${payment.order_id}.`
      },
      ...current
    ]);

    return payment;
  };

  const deletePayment = async (paymentId: number): Promise<void> => {
    await deletePaymentRequest(paymentId);

    setPayments((current) => current.filter((payment) => payment.id !== paymentId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment #${paymentId} was deleted from the ledger.`
      },
      ...current
    ]);
  };

  const updateSalesDetails = async (
    orderId: number,
    input: UpdateSalesDetailsInput
  ): Promise<SalesRecord> => {
    const sale = await updateSalesDetailsRequest(orderId, input);

    setSales((current) => current.map((item) => (item.order_id === sale.order_id ? sale : item)));
    void fetchSalesSummary().then(setSalesSummary);

    return sale;
  };

  const updateSalesStatus = async (
    orderId: number,
    input: UpdateSalesStatusInput
  ): Promise<SalesRecord> => {
    const sale = await updateSalesStatusRequest(orderId, input);

    setSales((current) => current.map((item) => (item.order_id === sale.order_id ? sale : item)));
    void fetchSalesSummary().then(setSalesSummary);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Sale #${sale.order_id} moved to ${sale.status}.`
      },
      ...current
    ]);

    return sale;
  };

  const createInvoiceFromOrder = async (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ): Promise<Invoice> => {
    const invoice = await createInvoiceFromOrderRequest(orderId, input);

    setInvoices((current) => [invoice, ...current]);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Invoice ${invoice.invoice_number} was created for order #${invoice.order_id}.`
      },
      ...current
    ]);

    return invoice;
  };

  const updateInvoiceBilling = async (
    invoiceId: number,
    input: UpdateInvoiceBillingInput
  ): Promise<Invoice> => {
    const invoice = await updateInvoiceBillingRequest(invoiceId, input);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));

    return invoice;
  };

  const voidInvoice = async (invoiceId: number): Promise<Invoice> => {
    const invoice = await voidInvoiceRequest(invoiceId);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Invoice ${invoice.invoice_number} was voided.` },
      ...current
    ]);

    return invoice;
  };

  const recordInvoicePayment = async (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ): Promise<Invoice> => {
    const invoice = await recordInvoicePaymentRequest(invoiceId, input);

    setInvoices((current) => current.map((item) => (item.id === invoice.id ? invoice : item)));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Payment recorded for invoice ${invoice.invoice_number}.`
      },
      ...current
    ]);

    return invoice;
  };

  const exportAutoCountInvoices = async (input: AutoCountExportInput): Promise<void> => {
    const blob = await exportAutoCountInvoicesRequest(input);
    downloadBlob(blob, `autocount-invoices-${new Date().toISOString().slice(0, 10)}.csv`);

    const page = await fetchInvoices();
    setInvoices(page.items);
    setInvoicesNextCursor(page.next_cursor);
    setActivityFeed((current) => [
      { happened_at: "Now", detail: "AutoCount invoice export was downloaded." },
      ...current
    ]);
  };

  const updateSystemSetting = async (
    key: string,
    input: UpdateSystemSettingInput
  ): Promise<SystemSetting> => {
    const setting = await updateSystemSettingRequest(key, input);

    setSystemSettings((current) =>
      current.map((item) => (item.key === setting.key ? setting : item))
    );

    return setting;
  };

  const createRole = async (input: CreateRoleInput): Promise<Role> => {
    const role = await createRoleRequest(input);

    setPermissions((current) =>
      current
        ? {
            ...current,
            roles: [...current.roles, role]
          }
        : current
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `${role.name} role was added to the permission matrix.` },
      ...current
    ]);

    return role;
  };

  const updateRole = async (roleId: number, input: UpdateRoleInput): Promise<Role> => {
    const role = await updateRoleRequest(roleId, input);

    setPermissions((current) =>
      current
        ? {
            ...current,
            roles: current.roles.map((item) => (item.id === role.id ? role : item))
          }
        : current
    );

    return role;
  };

  const deleteRole = async (roleId: number): Promise<void> => {
    await deleteRoleRequest(roleId);

    setPermissions((current) => {
      if (!current) {
        return current;
      }

      const roles = current.roles.filter((role) => role.id !== roleId);

      return {
        ...current,
        roles,
        permissions: current.permissions.filter((permission) => permission.role_id !== roleId)
      };
    });
  };

  const updateRolePermission = async (
    input: UpdateRolePagePermissionInput
  ): Promise<RolePagePermission> => {
    const permission = await updateRolePermissionRequest(input);

    setPermissions((current) => (current ? applyPermissionUpdate(current, permission) : current));

    return permission;
  };

  const createAdminUser = async (input: CreateAdminUserInput): Promise<AdminUser> => {
    const user = await createAdminUserRequest(input);

    setAdminUsers((current) => [...current, user]);
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `${user.display_name} was added as an admin user.` },
      ...current
    ]);

    return user;
  };

  const updateAdminUserProfile = async (
    userId: number,
    input: UpdateAdminUserProfileInput
  ): Promise<AdminUser> => {
    const user = await updateAdminUserProfileRequest(userId, input);

    setAdminUsers((current) => current.map((item) => (item.id === user.id ? user : item)));

    return user;
  };

  const setAdminUserActive = async (
    userId: number,
    input: SetAdminUserActiveInput
  ): Promise<AdminUser> => {
    const user = await setAdminUserActiveRequest(userId, input);

    setAdminUsers((current) => current.map((item) => (item.id === user.id ? user : item)));

    return user;
  };

  const resetAdminUserPassword = async (
    userId: number,
    input: AdminResetPasswordInput
  ): Promise<void> => {
    await resetAdminUserPasswordRequest(userId, input);
  };

  const changeOwnPassword = async (input: ChangeOwnPasswordInput): Promise<void> => {
    await changeOwnPasswordRequest(input);
    await handleAdminLogout();
  };

  const createPromotion = async (input: CreatePromotionInput): Promise<Promotion> => {
    const promotion = await createPromotionRequest(input);

    setPromotions((current) =>
      current.some((item) => item.id === promotion.id)
        ? current.map((item) => (item.id === promotion.id ? promotion : item))
        : [promotion, ...current]
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion created: ${promotion.title}.` },
      ...current
    ]);

    return promotion;
  };

  const updatePromotion = async (
    promotionId: number,
    input: UpdatePromotionInput
  ): Promise<Promotion> => {
    const promotion = await updatePromotionRequest(promotionId, input);

    setPromotions((current) =>
      current.map((item) => (item.id === promotion.id ? promotion : item))
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion updated: ${promotion.title}.` },
      ...current
    ]);

    return promotion;
  };

  const deletePromotion = async (promotionId: number): Promise<void> => {
    const promotion = promotions.find((item) => item.id === promotionId);

    await deletePromotionRequest(promotionId);

    setPromotions((current) => current.filter((item) => item.id !== promotionId));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Promotion deleted: ${promotion?.title ?? `#${promotionId}`}.` },
      ...current
    ]);
  };

  const createVoucher = async (input: CreateVoucherInput): Promise<Voucher> => {
    const voucher = await createVoucherRequest(input);

    setVouchers((current) =>
      current.some((item) => item.id === voucher.id)
        ? current.map((item) => (item.id === voucher.id ? voucher : item))
        : [voucher, ...current]
    );
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher created: ${voucher.code}.` },
      ...current
    ]);

    return voucher;
  };

  const updateVoucher = async (voucherId: number, input: UpdateVoucherInput): Promise<Voucher> => {
    const voucher = await updateVoucherRequest(voucherId, input);

    setVouchers((current) => current.map((item) => (item.id === voucher.id ? voucher : item)));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher updated: ${voucher.code}.` },
      ...current
    ]);

    return voucher;
  };

  const deleteVoucher = async (voucherId: number): Promise<void> => {
    const voucher = vouchers.find((item) => item.id === voucherId);

    await deleteVoucherRequest(voucherId);

    setVouchers((current) => current.filter((item) => item.id !== voucherId));
    setActivityFeed((current) => [
      { happened_at: "Now", detail: `Voucher deleted: ${voucher?.code ?? `#${voucherId}`}.` },
      ...current
    ]);
  };

  const refreshCatalog = async () => {
    const catalogData = await fetchAdminCatalog();
    const productsById = new Map(catalogData.products.map((product) => [product.id, product]));
    setAdminCatalog(catalogData);
    setStorefront((current) => current ? {
      ...current,
      products: current.products.map((product) => productsById.get(product.id) ?? product)
    } : current);
  };

  const loadMoreActivity = async () => {
    if (oldestAuditEventId === null || isLoadingMoreActivity) {
      return;
    }

    setIsLoadingMoreActivity(true);
    try {
      const events = await fetchAuditEvents(oldestAuditEventId);
      setActivityFeed((current) => [...current, ...events.map(auditEventToActivityItem)]);
      setOldestAuditEventId(events.length > 0 ? events[events.length - 1].id : null);
      setHasMoreActivity(events.length >= AUDIT_EVENTS_PAGE_SIZE);
    } finally {
      setIsLoadingMoreActivity(false);
    }
  };

  const createCategory = async (input: CreateCategoryInput): Promise<Category> => {
    const category = await createCategoryRequest(input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.some((item) => item.slug === category.slug)
              ? current.categories
              : [...current.categories, category]
          }
        : current
    );
    setStorefront((current) => {
      if (!current || current.categories.some((item) => item.slug === category.slug)) {
        return current;
      }

      return {
        ...current,
        categories: [...current.categories, category]
      };
    });
    setSelectedCategory(category.slug);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category created: ${category.name}.`
      },
      ...current
    ]);

    return category;
  };

  const updateCategory = async (
    slug: string,
    input: UpdateCategoryInput
  ): Promise<Category> => {
    const category = await updateCategoryRequest(slug, input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((item) =>
              item.slug === category.slug ? category : item
            )
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            categories: current.categories.map((item) =>
              item.slug === category.slug ? category : item
            )
          }
        : current
    );
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category updated: ${category.name}.`
      },
      ...current
    ]);

    return category;
  };

  const deleteCategory = async (slug: string): Promise<void> => {
    const category = adminCatalog?.categories.find((item) => item.slug === slug);

    await deleteCategoryRequest(slug);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            categories: current.categories.filter((item) => item.slug !== slug)
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            categories: current.categories.filter((item) => item.slug !== slug)
          }
        : current
    );
    setSelectedCategory((current) => (current === slug ? "all" : current));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Category deleted: ${category?.name ?? slug}.`
      },
      ...current
    ]);
  };

  const createProduct = async (input: CreateProductInput): Promise<Product> => {
    const product = await createProductRequest(input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.some((item) => item.id === product.id)
              ? current.products.map((item) => (item.id === product.id ? product : item))
              : [...current.products, product]
          }
        : current
    );
    if (product.featured) {
      setStorefront((current) => {
        if (!current || current.products.some((item) => item.id === product.id)) {
          return current;
        }

        return {
          ...current,
          products: [...current.products, product]
        };
      });
    }

    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product created: ${product.name}${product.featured ? " and published to the storefront." : "."}`
      },
      ...current
    ]);

    return product;
  };

  const updateProduct = async (
    productId: number,
    input: UpdateProductInput
  ): Promise<Product> => {
    const product = await updateProductRequest(productId, input);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.map((item) => (item.id === product.id ? product : item))
          }
        : current
    );
    setStorefront((current) => {
      if (!current) {
        return current;
      }

      const exists = current.products.some((item) => item.id === product.id);

      if (!product.featured) {
        return {
          ...current,
          products: current.products.filter((item) => item.id !== product.id)
        };
      }

      return {
        ...current,
        products: exists
          ? current.products.map((item) => (item.id === product.id ? product : item))
          : [...current.products, product]
      };
    });
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product updated: ${product.name}.`
      },
      ...current
    ]);

    return product;
  };

  const deleteProduct = async (productId: number): Promise<void> => {
    const product = adminCatalog?.products.find((item) => item.id === productId);

    await deleteProductRequest(productId);

    setAdminCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((item) => item.id !== productId)
          }
        : current
    );
    setStorefront((current) =>
      current
        ? {
            ...current,
            products: current.products.filter((item) => item.id !== productId)
          }
        : current
    );
    setCart((current) => current.filter((item) => item.product.id !== productId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `Product deleted: ${product?.name ?? `#${productId}`}.`
      },
      ...current
    ]);
  };

  const createCustomerPortalProfile = async (
    input: CreateCustomerPortalProfileInput
  ): Promise<CustomerPortalProfile> => {
    const profile = await createCustomerPortalProfileRequest(input);

    setCustomerProfiles((current) => [profile, ...current]);
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile.customer_name} customer portal profile was created.`
      },
      ...current
    ]);

    return profile;
  };

  const updateCustomerPortalProfile = async (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ): Promise<CustomerPortalProfile> => {
    const profile = await updateCustomerPortalProfileRequest(profileId, input);

    setCustomerProfiles((current) =>
      current.map((item) => (item.id === profile.id ? profile : item))
    );
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile.customer_name} customer portal profile was updated.`
      },
      ...current
    ]);

    return profile;
  };

  const deleteCustomerPortalProfile = async (profileId: number): Promise<void> => {
    const profile = customerProfiles.find((item) => item.id === profileId);

    await deleteCustomerPortalProfileRequest(profileId);

    setCustomerProfiles((current) => current.filter((item) => item.id !== profileId));
    setActivityFeed((current) => [
      {
        happened_at: "Now",
        detail: `${profile?.customer_name ?? "Customer"} portal profile was deleted.`
      },
      ...current
    ]);
  };

  const openShop = () => openView("store");

  if (view === "forbidden") {
    return <StatusPage code="403" onGoHome={() => openView("landing")} onShop={openShop} />;
  }

  if (view === "not-found") {
    return <StatusPage code="404" onGoHome={() => openView("landing")} onShop={openShop} />;
  }

  // Policy pages render before the storefront-data gate: they must stay readable when the
  // API is down, and a payment gateway reviewing the site should never hit a loading screen.
  if (view === "legal" && legalSlug) {
    return (
      <div className="app-shell legal-shell">
        <LegalPage onBack={openShop} onHome={() => openView("landing")} slug={legalSlug} />
      </div>
    );
  }

  // Show landing page immediately without waiting for storefront data
  if (view === "landing") {
    return (
      <div className="app-shell landing-shell">
        <LandingView onOpenShop={openShop} />
      </div>
    );
  }

  if (!storefront) {
    return <main className="loading-shell">{t("shop.loading")}</main>;
  }

  return (
    <div
      className={
        view === "admin"
          ? "app-shell admin-shell"
          : view === "store" || view === "product"
            ? "app-shell storefront-app-shell"
            : "app-shell"
      }
    >
      {view === "store" || view === "product" ? (
        <div className={`storefront-shell${view === "product" ? " storefront-shell--product" : ""}`}>
          <ShopHeader
            cartCount={cartCount}
            categories={storefront.categories}
            onChangeCategory={(slug) => {
              setActiveJobId(null);
              setSelectedCategory(slug);
              if (view !== "store") {
                productReturnFocusRef.current = null;
                setReturnFocusProductId(null);
                openView("store");
              }
            }}
            onChangeSearch={setSearchTerm}
            onOpenAccount={() => {
              setIsCartOpen(false);
              setIsAccountOpen(true);
            }}
            onOpenCart={() => {
              setIsAccountOpen(false);
              setIsCartOpen(true);
            }}
            onSubmitSearch={() => {
              setActiveJobId(null);
              if (view !== "store") {
                productReturnFocusRef.current = null;
                setReturnFocusProductId(null);
                openView("store");
              }
            }}
            searchTerm={searchTerm}
            selectedCategory={
              view === "product" && productDetailId != null
                ? storefront.products.find((product) => product.id === productDetailId)?.category_slug ?? selectedCategory
                : selectedCategory
            }
          />

          {view === "store" ? (
            <StorefrontView
              activeJobId={activeJobId}
              filteredProducts={filteredProducts}
              isRefetching={isStorefrontRefetching}
              isShowingFallbackData={isShowingFallbackStorefront}
              isLoadingMoreProducts={isLoadingMoreProducts}
              inStockOnly={inStockOnly}
              onSaleOnly={onSaleOnly}
              onChangeInStockOnly={setInStockOnly}
              onChangeOnSaleOnly={setOnSaleOnly}
              onLoadMoreProducts={() => void loadMoreProducts()}
              totalProducts={storefront.total_products}
              maxPriceCents={maxPriceCents}
              minPriceCents={minPriceCents}
              onAddToCart={addToCart}
              onChangeCategory={(slug) => {
                setActiveJobId(null);
                setSelectedCategory(slug);
              }}
              onChangeMaxPrice={setMaxPriceCents}
              onChangeMinPrice={setMinPriceCents}
              onChangeSearch={setSearchTerm}
              onChangeSort={setSortOption}
              onGrabPromotion={grabPromotion}
              onSelectJob={(jobId) => {
                setActiveJobId(jobId);
                setSelectedCategory("all");
              }}
              onReturnFocusComplete={() => {
                productReturnFocusRef.current = null;
                setReturnFocusProductId(null);
              }}
              onViewProduct={(productId) => {
                productReturnFocusRef.current = productId;
                openProductDetail(productId);
              }}
              publicOffers={publicOffers}
              returnFocusProductId={returnFocusProductId}
              searchTerm={searchTerm}
              selectedCategory={selectedCategory}
              sortOption={sortOption}
              storefront={storefront}
            />
          ) : (
            <ProductDetailView
              activeJobName={
                activeJobId
                  ? JOB_LENSES.find((job) => job.id === activeJobId && job.approvedForProduction)?.name ?? null
                  : null
              }
              fallbackProduct={
                isShowingFallbackStorefront && productDetailId != null
                  ? findInitialProductById(productDetailId)
                  : null
              }
              isCatalogueLoaded={storefront !== null}
              onAddToCart={addToCart}
              onBack={() => {
                setIsStorefrontRefetching(true);
                setReturnFocusProductId(productReturnFocusRef.current);
                if (window.history.state?.ekowayStorefrontProduct === true) {
                  window.history.back();
                  return;
                }
                openView("store");
              }}
              onOpenDepartment={(slug) => {
                productReturnFocusRef.current = null;
                setReturnFocusProductId(null);
                setActiveJobId(null);
                setSelectedCategory(slug);
                openView("store");
              }}
              onViewProduct={openProductDetail}
              productId={productDetailId}
              storefront={storefront}
            />
          )}

          <ShopFooter
            onOpenCategory={(slug) => {
              productReturnFocusRef.current = null;
              setReturnFocusProductId(null);
              setActiveJobId(null);
              setSelectedCategory(slug);
              if (view !== "store") openView("store");
            }}
            storefront={storefront}
          />

          <CartDrawer
            cart={cart}
            customerAccountEmail={customerAccountEmail}
            open={isCartOpen}
            onCheckout={submitCheckout}
            onClose={() => setIsCartOpen(false)}
            onCompleted={clearCart}
            onPromotionChange={setSelectedPromotionId}
            onRemoveFromCart={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onVoucherCodeChange={setVoucherCode}
            publicOffers={publicOffers}
            selectedPromotionId={selectedPromotionId}
            voucherCode={voucherCode}
          />
          <AccountDrawer
            open={isAccountOpen}
            customerAccountEmail={customerAccountEmail}
            onAuthenticated={(email) => {
              const normalizedEmail = email.trim().toLowerCase();
              setCustomerAccountEmail(normalizedEmail);
              rememberAccountEmail(normalizedEmail);
            }}
            onClose={() => setIsAccountOpen(false)}
          />
          <SupportChatWidget
            customerEmail={customerAccountEmail}
            isSuppressed={isCartOpen || isAccountOpen || view === "store" || view === "product"}
          />
        </div>
      ) : adminAuth === "unauthenticated" || adminAuth === "mfa-challenge" ? (
        <Suspense fallback={<main className="loading-shell">Loading admin console...</main>}>
          <AdminLoginScreen
            challengeToken={adminAuth === "mfa-challenge" ? adminMfaChallengeToken : null}
            onBackToStore={() => openView("store")}
            onLogin={handleAdminLogin}
            onVerify={handleAdminMfaVerify}
          />
        </Suspense>
      ) : adminAuth === "checking" || !dashboard || !adminCatalog ? (
        <main className="loading-shell">Loading admin console...</main>
      ) : (
        <Suspense fallback={<main className="loading-shell">Loading admin console...</main>}>
        <AdminView
          activityFeed={activityFeed}
          activeRoleId={activeRoleId}
          adminTab={adminTab}
          adminUsers={adminUsers}
          categories={adminCatalog.categories}
          currentAdmin={currentAdmin}
          customerProfiles={customerProfiles}
          dashboard={dashboard}
          demoMode={adminAuth === "demo"}
          hasMoreActivity={hasMoreActivity}
          isChangePasswordOpen={isChangePasswordOpen}
          isLoadingMoreActivity={isLoadingMoreActivity}
          isLoadingMoreCustomerProfiles={isLoadingMoreCustomerProfiles}
          isLoadingMoreInvoices={isLoadingMoreInvoices}
          isLoadingMoreOrders={isLoadingMoreOrders}
          isLoadingMoreSales={isLoadingMoreSales}
          onLoadMoreActivity={() => void loadMoreActivity()}
          onBackToStore={() => openView("store")}
          onChangeOwnPassword={changeOwnPassword}
          onChangeTab={setAdminTab}
          onCloseChangePassword={() => setIsChangePasswordOpen(false)}
          onCreateAdminOrder={createAdminOrder}
          onCreateAdminUser={createAdminUser}
          onCreateCategory={createCategory}
          onCreateCustomerPortalProfile={createCustomerPortalProfile}
          onCreateInvoiceFromOrder={createInvoiceFromOrder}
          onCreatePayment={createPayment}
          onCreateProduct={createProduct}
          onCreatePromotion={createPromotion}
          onCreateRole={createRole}
          onCreateVoucher={createVoucher}
          onDeleteAdminOrder={deleteAdminOrder}
          onDeleteCategory={deleteCategory}
          onDeleteCustomerPortalProfile={deleteCustomerPortalProfile}
          onDeletePayment={deletePayment}
          onDeleteProduct={deleteProduct}
          onDeletePromotion={deletePromotion}
          onDeleteRole={deleteRole}
          onDeleteVoucher={deleteVoucher}
          onExportAutoCountInvoices={exportAutoCountInvoices}
          onLogout={() => void handleAdminLogout()}
          onLoadMoreCustomerProfiles={() => void loadMoreCustomerProfiles()}
          onLoadMoreInvoices={() => void loadMoreInvoices()}
          onLoadMoreOrders={() => void loadMoreOrders()}
          onLoadMoreSales={() => void loadMoreSales()}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onRecordInvoicePayment={recordInvoicePayment}
          onRefreshCatalog={refreshCatalog}
          onResetAdminUserPassword={resetAdminUserPassword}
          onSetAdminUserActive={setAdminUserActive}
          onUpdateAdminOrder={updateAdminOrder}
          onUpdateAdminUserProfile={updateAdminUserProfile}
          onUpdateCategory={updateCategory}
          onUpdateOrderFulfillment={updateOrderFulfillment}
          onUpdateInvoiceBilling={updateInvoiceBilling}
          onUpdatePayment={updatePayment}
          onUpdateProduct={updateProduct}
          onUpdatePromotion={updatePromotion}
          onUpdateRole={updateRole}
          onUpdateRolePermission={updateRolePermission}
          onUpdateSalesDetails={updateSalesDetails}
          onUpdateSalesStatus={updateSalesStatus}
          onUpdateSystemSetting={updateSystemSetting}
          onUpdateVoucher={updateVoucher}
          onVoidInvoice={voidInvoice}
          hasMoreCustomerProfiles={customerProfilesNextCursor !== null}
          hasMoreInvoices={invoicesNextCursor !== null}
          hasMoreOrders={ordersNextCursor !== null}
          hasMoreSales={salesNextCursor !== null}
          orders={orders}
          payments={payments}
          invoices={invoices}
          sales={sales}
          salesSummary={salesSummary}
          systemSettings={systemSettings}
          permissions={permissions}
          products={adminCatalog.products}
          promotions={promotions}
          onUpdateCustomerPortalProfile={updateCustomerPortalProfile}
          vouchers={vouchers}
        />
        </Suspense>
      )}
    </div>
  );
}

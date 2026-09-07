import { lazy, useEffect, useState } from "react";

import { adminTabs, canAccess, changePasswordFields, type AdminTab } from "../../app/adminHelpers";
import { EkowayMark } from "../storefront/ShopChrome";
import { CustomerPortalPanel } from "../customer_portal/CustomerPortalPanel";
import type {
  CreatePromotionInput,
  CreateVoucherInput,
  Promotion,
  UpdatePromotionInput,
  UpdateVoucherInput,
  Voucher
} from "../offers/types";
import { RecordForm, RecordModal } from "../../shared/components/RecordModal";
import { useNotifications } from "../../shared/notifications";
import type {
  ActivityItem,
  AdminDashboardPayload,
  AdminMePayload,
  AdminResetPasswordInput,
  AdminUser,
  AutoCountExportInput,
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
  SalesSummaryPayload,
  SetAdminUserActiveInput,
  SystemSetting,
  UpdateAdminUserProfileInput,
  UpdateCategoryInput,
  UpdateCustomerPortalProfileInput,
  UpdateInvoiceBillingInput,
  UpdateOrderFulfillmentInput,
  UpdatePaymentInput,
  UpdateProductInput,
  UpdateRoleInput,
  UpdateRolePagePermissionInput,
  UpdateSalesDetailsInput,
  UpdateSalesStatusInput,
  UpdateSystemSettingInput
} from "../../types";

const TeamPanel = lazy(() =>
  import("../admin_users/components/TeamPanel").then((m) => ({ default: m.TeamPanel }))
);
const CatalogPanel = lazy(() =>
  import("../catalog/components/CatalogPanel").then((m) => ({ default: m.CatalogPanel }))
);
const OperationsConsole = lazy(() =>
  import("./components/OperationsConsole").then((m) => ({ default: m.OperationsConsole }))
);
const InvoicesPanel = lazy(() =>
  import("../invoices/components/InvoicesPanel").then((m) => ({ default: m.InvoicesPanel }))
);
const OfferManagementPanel = lazy(() =>
  import("../offers/components/OfferManagementPanel").then((m) => ({
    default: m.OfferManagementPanel
  }))
);
const OrderControlPanel = lazy(() =>
  import("../orders/components/OrderControlPanel").then((m) => ({ default: m.OrderControlPanel }))
);
const PaymentManagementPanel = lazy(() =>
  import("../payments/components/PaymentManagementPanel").then((m) => ({
    default: m.PaymentManagementPanel
  }))
);
const PermissionsPanel = lazy(() =>
  import("../permissions/components/PermissionsPanel").then((m) => ({ default: m.PermissionsPanel }))
);
const SalesPanel = lazy(() =>
  import("../sales/components/SalesPanel").then((m) => ({ default: m.SalesPanel }))
);
const SettingsPanel = lazy(() =>
  import("../settings/components/SettingsPanel").then((m) => ({ default: m.SettingsPanel }))
);
const SupportInboxPanel = lazy(() =>
  import("../support/components/SupportInboxPanel").then((m) => ({ default: m.SupportInboxPanel }))
);

type AdminViewProps = {
  activityFeed: ActivityItem[];
  activeRoleId: number | null;
  adminTab: AdminTab;
  adminUsers: AdminUser[];
  categories: Category[];
  currentAdmin: AdminMePayload | null;
  customerProfiles: CustomerPortalProfile[];
  dashboard: AdminDashboardPayload;
  demoMode: boolean;
  hasMoreCustomerProfiles: boolean;
  hasMoreActivity: boolean;
  hasMoreInvoices: boolean;
  hasMoreOrders: boolean;
  hasMoreSales: boolean;
  isChangePasswordOpen: boolean;
  isLoadingMoreActivity: boolean;
  isLoadingMoreCustomerProfiles: boolean;
  isLoadingMoreInvoices: boolean;
  isLoadingMoreOrders: boolean;
  isLoadingMoreSales: boolean;
  onBackToStore: () => void;
  onChangeOwnPassword: (input: ChangeOwnPasswordInput) => Promise<void>;
  onChangeTab: (tab: AdminTab) => void;
  onCloseChangePassword: () => void;
  onLoadMoreActivity: () => void;
  onCreateAdminOrder: (input: CreateOrderInput) => Promise<Order>;
  onCreateAdminUser: (input: CreateAdminUserInput) => Promise<AdminUser>;
  onCreateCategory: (input: CreateCategoryInput) => Promise<Category>;
  onCreateCustomerPortalProfile: (
    input: CreateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onCreateInvoiceFromOrder: (
    orderId: number,
    input: CreateInvoiceFromOrderInput
  ) => Promise<Invoice>;
  onCreatePayment: (input: CreatePaymentInput) => Promise<Payment>;
  onCreateProduct: (input: CreateProductInput) => Promise<Product>;
  onCreatePromotion: (input: CreatePromotionInput) => Promise<Promotion>;
  onCreateRole: (input: CreateRoleInput) => Promise<Role>;
  onCreateVoucher: (input: CreateVoucherInput) => Promise<Voucher>;
  onDeleteAdminOrder: (orderId: number) => Promise<void>;
  onDeleteCategory: (slug: string) => Promise<void>;
  onDeleteCustomerPortalProfile: (profileId: number) => Promise<void>;
  onDeletePayment: (paymentId: number) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onDeletePromotion: (promotionId: number) => Promise<void>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onDeleteVoucher: (voucherId: number) => Promise<void>;
  onExportAutoCountInvoices: (input: AutoCountExportInput) => Promise<void>;
  onLogout: () => void;
  onLoadMoreCustomerProfiles: () => void;
  onLoadMoreInvoices: () => void;
  onLoadMoreOrders: () => void;
  onLoadMoreSales: () => void;
  onOpenChangePassword: () => void;
  onRecordInvoicePayment: (
    invoiceId: number,
    input: RecordInvoicePaymentInput
  ) => Promise<Invoice>;
  onRefreshCatalog: () => Promise<void>;
  onResetAdminUserPassword: (userId: number, input: AdminResetPasswordInput) => Promise<void>;
  onSetAdminUserActive: (userId: number, input: SetAdminUserActiveInput) => Promise<AdminUser>;
  onUpdateAdminOrder: (orderId: number, input: CreateOrderInput) => Promise<Order>;
  onUpdateAdminUserProfile: (
    userId: number,
    input: UpdateAdminUserProfileInput
  ) => Promise<AdminUser>;
  onUpdateCategory: (slug: string, input: UpdateCategoryInput) => Promise<Category>;
  onUpdateCustomerPortalProfile: (
    profileId: number,
    input: UpdateCustomerPortalProfileInput
  ) => Promise<CustomerPortalProfile>;
  onUpdateInvoiceBilling: (invoiceId: number, input: UpdateInvoiceBillingInput) => Promise<Invoice>;
  onUpdatePayment: (paymentId: number, input: UpdatePaymentInput) => Promise<Payment>;
  onUpdateProduct: (productId: number, input: UpdateProductInput) => Promise<Product>;
  onUpdatePromotion: (promotionId: number, input: UpdatePromotionInput) => Promise<Promotion>;
  onUpdateOrderFulfillment: (
    orderId: number,
    input: UpdateOrderFulfillmentInput
  ) => Promise<Order>;
  onUpdateRole: (roleId: number, input: UpdateRoleInput) => Promise<Role>;
  onUpdateRolePermission: (input: UpdateRolePagePermissionInput) => Promise<RolePagePermission>;
  onUpdateSalesDetails: (orderId: number, input: UpdateSalesDetailsInput) => Promise<SalesRecord>;
  onUpdateSalesStatus: (orderId: number, input: UpdateSalesStatusInput) => Promise<SalesRecord>;
  onUpdateSystemSetting: (key: string, input: UpdateSystemSettingInput) => Promise<SystemSetting>;
  onUpdateVoucher: (voucherId: number, input: UpdateVoucherInput) => Promise<Voucher>;
  onVoidInvoice: (invoiceId: number) => Promise<Invoice>;
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];
  sales: SalesRecord[];
  salesSummary: SalesSummaryPayload | null;
  systemSettings: SystemSetting[];
  permissions: PermissionsPayload | null;
  products: Product[];
  promotions: Promotion[];
  vouchers: Voucher[];
};

export function AdminView({
  activityFeed,
  activeRoleId,
  adminTab,
  adminUsers,
  categories,
  currentAdmin,
  customerProfiles,
  dashboard,
  demoMode,
  hasMoreCustomerProfiles,
  hasMoreActivity,
  hasMoreInvoices,
  hasMoreOrders,
  hasMoreSales,
  isChangePasswordOpen,
  isLoadingMoreActivity,
  isLoadingMoreCustomerProfiles,
  isLoadingMoreInvoices,
  isLoadingMoreOrders,
  isLoadingMoreSales,
  onBackToStore,
  onChangeOwnPassword,
  onChangeTab,
  onCloseChangePassword,
  onLoadMoreActivity,
  onCreateAdminOrder,
  onCreateAdminUser,
  onCreateCategory,
  onCreateCustomerPortalProfile,
  onCreateInvoiceFromOrder,
  onCreatePayment,
  onCreateProduct,
  onCreatePromotion,
  onCreateRole,
  onCreateVoucher,
  onDeleteAdminOrder,
  onDeleteCategory,
  onDeleteCustomerPortalProfile,
  onDeletePayment,
  onDeleteProduct,
  onDeletePromotion,
  onDeleteRole,
  onDeleteVoucher,
  onExportAutoCountInvoices,
  onLogout,
  onLoadMoreCustomerProfiles,
  onLoadMoreInvoices,
  onLoadMoreOrders,
  onLoadMoreSales,
  onOpenChangePassword,
  onRecordInvoicePayment,
  onRefreshCatalog,
  onResetAdminUserPassword,
  onSetAdminUserActive,
  onUpdateAdminOrder,
  onUpdateAdminUserProfile,
  onUpdateCategory,
  onUpdateCustomerPortalProfile,
  onUpdateInvoiceBilling,
  onUpdatePayment,
  onUpdateProduct,
  onUpdatePromotion,
  onUpdateOrderFulfillment,
  onUpdateRole,
  onUpdateRolePermission,
  onUpdateSalesDetails,
  onUpdateSalesStatus,
  onUpdateSystemSetting,
  onUpdateVoucher,
  onVoidInvoice,
  orders,
  payments,
  invoices,
  sales,
  salesSummary,
  systemSettings,
  permissions,
  products,
  promotions,
  vouchers
}: AdminViewProps) {
  const { notify, notifyError } = useNotifications();
  const [permissionEditorRoleId, setPermissionEditorRoleId] = useState<number | null>(activeRoleId);
  const [changePasswordForm, setChangePasswordForm] = useState<ChangeOwnPasswordInput>({
    current_password: "",
    new_password: ""
  });
  const [isSavingChangePassword, setIsSavingChangePassword] = useState(false);
  const activeRole = currentAdmin?.role ?? permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canCreateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "create");
  const canUpdateCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "update");
  const canDeleteCatalog = canAccess(permissions, activeRoleId, "admin-catalog", "delete");
  const canCreateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "create");
  const canUpdateCustomers = canAccess(permissions, activeRoleId, "admin-customers", "update");
  const canDeleteCustomers = canAccess(permissions, activeRoleId, "admin-customers", "delete");
  const canReadSupport = canAccess(permissions, activeRoleId, "admin-support", "read");
  const canUpdateSupport = canAccess(permissions, activeRoleId, "admin-support", "update");
  const canCreateOrders = canAccess(permissions, activeRoleId, "admin-orders", "create");
  const canUpdateOrders = canAccess(permissions, activeRoleId, "admin-orders", "update");
  const canDeleteOrders = canAccess(permissions, activeRoleId, "admin-orders", "delete");
  const canCreatePayments = canAccess(permissions, activeRoleId, "admin-payments", "create");
  const canUpdatePayments = canAccess(permissions, activeRoleId, "admin-payments", "update");
  const canDeletePayments = canAccess(permissions, activeRoleId, "admin-payments", "delete");
  const canUpdateSales = canAccess(permissions, activeRoleId, "admin-sales", "update");
  const canCreateInvoices = canAccess(permissions, activeRoleId, "admin-invoices", "create");
  const canUpdateInvoices = canAccess(permissions, activeRoleId, "admin-invoices", "update");
  const canUpdateSettings = canAccess(permissions, activeRoleId, "admin-settings", "update");
  const canCreateCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "create");
  const canUpdateCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "update");
  const canDeleteCampaigns = canAccess(permissions, activeRoleId, "admin-campaigns", "delete");
  const canRunOperationsSync = canAccess(permissions, activeRoleId, "admin-overview", "update");
  const canCreateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "create");
  const canUpdateAdminUsers = canAccess(permissions, activeRoleId, "admin-permissions", "update");

  const handleChangeOwnPassword = async () => {
    setIsSavingChangePassword(true);

    try {
      await onChangeOwnPassword(changePasswordForm);
      setChangePasswordForm({ current_password: "", new_password: "" });
      onCloseChangePassword();
      notify({ severity: "success", title: "Password changed", message: "Your password was changed successfully.", scope: "admin-account", dedupeKey: "admin-account:password:success" });
    } catch (error) {
      notifyError(error, { operation: "change own password", scope: "admin-account", dedupeKey: "admin-account:password:error" });
    } finally {
      setIsSavingChangePassword(false);
    }
  };

  useEffect(() => {
    if (!permissions || permissions.roles.length === 0) {
      return;
    }

    setPermissionEditorRoleId((current) =>
      current !== null && permissions.roles.some((role) => role.id === current)
        ? current
        : permissions.roles[0].id
    );
  }, [permissions]);

  useEffect(() => {
    const currentTab = adminTabs.find((item) => item.tab === adminTab);

    if (!currentTab || canAccess(permissions, activeRoleId, currentTab.pageSlug, "read")) {
      return;
    }

    const nextTab = adminTabs.find((item) =>
      canAccess(permissions, activeRoleId, item.pageSlug, "read")
    );

    if (nextTab) {
      onChangeTab(nextTab.tab);
    }
  }, [activeRoleId, adminTab, onChangeTab, permissions]);

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <EkowayMark compact />
          <div>
            <p className="eyebrow">Internal Retail Tools</p>
            <h1>OPT Console</h1>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {adminTabs.map(({ tab, label, pageSlug }) => {
            const canReadTab = canAccess(permissions, activeRoleId, pageSlug, "read");

            return (
              <button
                key={tab}
                className={`admin-nav-item ${adminTab === tab ? "active" : ""}`}
                disabled={!canReadTab}
                onClick={() => onChangeTab(tab)}
              >
                <span>{label}</span>
                {!canReadTab ? <small>Locked</small> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">{demoMode ? "Demo mode" : "Signed in"}</p>
          <h3>{currentAdmin?.user.display_name ?? "Read-only demo"}</h3>
          <p>{activeRole?.name ?? "Fallback data"} access</p>
          <p>{activeRole?.description ?? "The API is unreachable, so live writes are disabled."}</p>
          {activeRole?.is_super_admin ? <span className="status-pill live">Ultimate access</span> : null}
          {demoMode ? <span className="status-pill warning">Fallback</span> : null}
          {!demoMode ? (
            <button className="outline-button" onClick={onOpenChangePassword}>
              Change Password
            </button>
          ) : null}
        </div>

        <button className="outline-button" onClick={onBackToStore}>
          Back to Storefront
        </button>
        {!demoMode ? (
          <button className="outline-button" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </aside>

      <section className="admin-main">
        {adminTab !== "overview" ? <header className="admin-topbar">
          <div><p className="eyebrow">Store operations</p><h2>{adminTabs.find((item) => item.tab === adminTab)?.label}</h2></div>
          <div className="admin-actions"><button className="solid-button" disabled={!canRunOperationsSync} onClick={() => void onRefreshCatalog()}>Refresh data</button></div>
        </header> : null}

        {demoMode && adminTab !== "overview" ? (
          <p className="admin-demo-banner">
            API unreachable. Showing fallback admin data with write controls disabled.
          </p>
        ) : null}

        {adminTab === "overview" ? (
          <OperationsConsole
            activity={activityFeed}
            canRefresh={canRunOperationsSync}
            dashboard={dashboard}
            demoMode={demoMode}
            onOpenFulfillment={() => onChangeTab("fulfillment")}
            onOpenOrders={() => onChangeTab("orders")}
            onOpenPayments={() => onChangeTab("payments")}
            onRefresh={onRefreshCatalog}
            orders={orders}
            payments={payments}
          />
        ) : null}

        {adminTab === "inventory" ? (
          <CatalogPanel
            canCreate={canCreateCatalog}
            canDelete={canDeleteCatalog}
            canUpdate={canUpdateCatalog}
            categories={categories}
            onCreateCategory={onCreateCategory}
            onCreateProduct={onCreateProduct}
            onDeleteCategory={onDeleteCategory}
            onDeleteProduct={onDeleteProduct}
            onRefreshCatalog={onRefreshCatalog}
            onUpdateCategory={onUpdateCategory}
            onUpdateProduct={onUpdateProduct}
            products={products}
            variant="inventory"
          />
        ) : null}

        {adminTab === "fulfillment" ? (
          <OrderControlPanel
            canCreate={canCreateOrders}
            canDelete={canDeleteOrders}
            canUpdate={canUpdateOrders}
            hasMore={hasMoreOrders}
            isLoadingMore={isLoadingMoreOrders}
            onCreateOrder={onCreateAdminOrder}
            onDeleteOrder={onDeleteAdminOrder}
            onLoadMore={onLoadMoreOrders}
            onUpdateOrder={onUpdateAdminOrder}
            onUpdateFulfillment={onUpdateOrderFulfillment}
            orders={orders}
            products={products}
            variant="fulfillment"
          />
        ) : null}

        {adminTab === "campaigns" ? (
          <OfferManagementPanel
            canCreate={canCreateCampaigns}
            canDelete={canDeleteCampaigns}
            canUpdate={canUpdateCampaigns}
            demoMode={demoMode}
            onCreatePromotion={onCreatePromotion}
            onCreateVoucher={onCreateVoucher}
            onDeletePromotion={onDeletePromotion}
            onDeleteVoucher={onDeleteVoucher}
            onUpdatePromotion={onUpdatePromotion}
            onUpdateVoucher={onUpdateVoucher}
            promotions={promotions}
            vouchers={vouchers}
          />
        ) : null}

        {adminTab === "catalog" ? (
          <CatalogPanel
            canCreate={canCreateCatalog}
            canDelete={canDeleteCatalog}
            canUpdate={canUpdateCatalog}
            categories={categories}
            onCreateCategory={onCreateCategory}
            onCreateProduct={onCreateProduct}
            onDeleteCategory={onDeleteCategory}
            onDeleteProduct={onDeleteProduct}
            onRefreshCatalog={onRefreshCatalog}
            onUpdateCategory={onUpdateCategory}
            onUpdateProduct={onUpdateProduct}
            products={products}
          />
        ) : null}

        {adminTab === "customers" ? (
          <CustomerPortalPanel
            canCreate={canCreateCustomers}
            canDelete={canDeleteCustomers}
            canUpdate={canUpdateCustomers}
            hasMore={hasMoreCustomerProfiles}
            isLoadingMore={isLoadingMoreCustomerProfiles}
            onCreateCustomerPortalProfile={onCreateCustomerPortalProfile}
            onDeleteCustomerPortalProfile={onDeleteCustomerPortalProfile}
            onLoadMore={onLoadMoreCustomerProfiles}
            onUpdateCustomerPortalProfile={onUpdateCustomerPortalProfile}
            orders={orders}
            profiles={customerProfiles}
          />
        ) : null}

        {adminTab === "support" && canReadSupport ? (
          <SupportInboxPanel
            canUpdate={canUpdateSupport}
            currentAdminUserId={currentAdmin?.user.id ?? null}
          />
        ) : null}

        {adminTab === "orders" ? (
          <OrderControlPanel
            canCreate={canCreateOrders}
            canDelete={canDeleteOrders}
            canUpdate={canUpdateOrders}
            hasMore={hasMoreOrders}
            isLoadingMore={isLoadingMoreOrders}
            onCreateOrder={onCreateAdminOrder}
            onDeleteOrder={onDeleteAdminOrder}
            onLoadMore={onLoadMoreOrders}
            onUpdateOrder={onUpdateAdminOrder}
            onUpdateFulfillment={onUpdateOrderFulfillment}
            orders={orders}
            products={products}
          />
        ) : null}

        {adminTab === "payments" ? (
          <PaymentManagementPanel
            canCreate={canCreatePayments}
            canDelete={canDeletePayments}
            canUpdate={canUpdatePayments}
            onCreatePayment={onCreatePayment}
            onDeletePayment={onDeletePayment}
            onUpdatePayment={onUpdatePayment}
            orders={orders}
            payments={payments}
          />
        ) : null}

        {adminTab === "sales" ? (
          <SalesPanel
            canUpdate={canUpdateSales}
            hasMore={hasMoreSales}
            isLoadingMore={isLoadingMoreSales}
            onLoadMore={onLoadMoreSales}
            onUpdateSalesDetails={onUpdateSalesDetails}
            onUpdateSalesStatus={onUpdateSalesStatus}
            sales={sales}
            summary={salesSummary}
          />
        ) : null}

        {adminTab === "invoices" ? (
          <InvoicesPanel
            canCreate={canCreateInvoices}
            canUpdate={canUpdateInvoices}
            hasMore={hasMoreInvoices}
            invoices={invoices}
            isLoadingMore={isLoadingMoreInvoices}
            onCreateInvoiceFromOrder={onCreateInvoiceFromOrder}
            onExportAutoCountInvoices={onExportAutoCountInvoices}
            onLoadMore={onLoadMoreInvoices}
            onRecordInvoicePayment={onRecordInvoicePayment}
            onUpdateInvoiceBilling={onUpdateInvoiceBilling}
            onVoidInvoice={onVoidInvoice}
            orders={orders}
            settings={systemSettings}
          />
        ) : null}

        {adminTab === "settings" ? (
          <SettingsPanel
            canUpdate={canUpdateSettings}
            onUpdateSetting={onUpdateSystemSetting}
            settings={systemSettings}
          />
        ) : null}

        {adminTab === "permissions" ? (
          <>
            <PermissionsPanel
              activeRoleId={permissionEditorRoleId}
              onChangeRole={setPermissionEditorRoleId}
              onCreateRole={onCreateRole}
              onDeleteRole={onDeleteRole}
              onUpdateRole={onUpdateRole}
              onUpdateRolePermission={onUpdateRolePermission}
              permissions={permissions}
            />
            <TeamPanel
              canCreate={canCreateAdminUsers}
              canUpdate={canUpdateAdminUsers}
              currentUserId={currentAdmin?.user.id ?? -1}
              onCreateUser={onCreateAdminUser}
              onResetUserPassword={onResetAdminUserPassword}
              onSetUserActive={onSetAdminUserActive}
              onUpdateUserProfile={onUpdateAdminUserProfile}
              roles={permissions?.roles ?? []}
              users={adminUsers}
            />
          </>
        ) : null}

        {adminTab === "team-log" ? <section className="dashboard-panel activity-feed" aria-labelledby="team-log-title">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Recent activity</p>
              <h3 id="team-log-title">Team log</h3>
            </div>
            <span className="status-pill">
              {activityFeed.length} {activityFeed.length === 1 ? "event" : "events"}
            </span>
          </div>
          <div className="activity-list">
            {activityFeed.length > 0 ? (
              activityFeed.map((item, index) => (
                <div key={`${item.happened_at}-${item.detail}-${index}`}>
                  <strong>{item.happened_at}</strong>
                  <span>{item.detail}</span>
                </div>
              ))
            ) : (
              <p>No team activity has been recorded yet.</p>
            )}
          </div>
          {hasMoreActivity ? (
            <button
              type="button"
              className="outline-button"
              disabled={isLoadingMoreActivity}
              onClick={onLoadMoreActivity}
            >
              {isLoadingMoreActivity ? "Loading..." : "Load more"}
            </button>
          ) : null}
        </section> : null}
      </section>

      <RecordModal
        eyebrow="Account security"
        isOpen={isChangePasswordOpen}
        onClose={() => {
          onCloseChangePassword();
        }}
        title="Change Password"
      >
        <RecordForm
          fields={changePasswordFields}
          isSubmitting={isSavingChangePassword}
          onCancel={() => {
            onCloseChangePassword();
          }}
          onChange={setChangePasswordForm}
          onSubmit={() => void handleChangeOwnPassword()}
          submitLabel="Change Password"
          values={changePasswordForm}
        />
      </RecordModal>
    </main>
  );
}

use axum::{
    Router,
    http::{HeaderValue, Method, header::AUTHORIZATION, header::CONTENT_TYPE},
    routing::{get, post, put},
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{
    app_state::AppState,
    modules::{
        admin_users, audit, auth, catalog, customer_auth, customer_portal, dashboard, health,
        invoices, orders, payments, permissions, sales, settings, storefront,
    },
};

pub fn build_router(state: AppState, frontend_origin: HeaderValue) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(frontend_origin)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([CONTENT_TYPE, AUTHORIZATION]);

    Router::new()
        .route("/api/health", get(health::controller::health))
        .route("/api/storefront", get(storefront::controller::storefront))
        .route(
            "/api/customer-portal/lookup",
            get(customer_portal::controller::lookup_customer_portal),
        )
        .route(
            "/api/customer-portal/me/membership",
            get(customer_portal::controller::membership),
        )
        .route(
            "/api/customer-portal/me/benefits",
            get(customer_portal::controller::benefits),
        )
        .route(
            "/api/customer-portal/me/transactions",
            get(customer_portal::controller::transactions),
        )
        .route("/api/admin/login", post(auth::controller::login))
        .route("/api/admin/logout", post(auth::controller::logout))
        .route("/api/admin/me", get(auth::controller::me))
        .route(
            "/api/admin/me/password",
            put(admin_users::controller::change_own_password),
        )
        .route(
            "/api/admin/users",
            get(admin_users::controller::list_users).post(admin_users::controller::create_user),
        )
        .route(
            "/api/admin/users/{user_id}",
            put(admin_users::controller::update_profile),
        )
        .route(
            "/api/admin/users/{user_id}/status",
            put(admin_users::controller::set_active),
        )
        .route(
            "/api/admin/users/{user_id}/password",
            put(admin_users::controller::admin_reset_password),
        )
        .route(
            "/api/admin/dashboard",
            get(dashboard::controller::admin_dashboard),
        )
        .route(
            "/api/admin/audit-events",
            get(audit::controller::admin_audit_events),
        )
        .route(
            "/api/admin/orders",
            get(orders::controller::admin_orders).post(orders::controller::admin_create_order),
        )
        .route(
            "/api/admin/orders/{order_id}",
            put(orders::controller::admin_update_order)
                .delete(orders::controller::admin_delete_order),
        )
        .route(
            "/api/admin/orders/{order_id}/fulfillment",
            put(orders::controller::admin_update_order_fulfillment),
        )
        .route(
            "/api/admin/payments",
            get(payments::controller::admin_payments)
                .post(payments::controller::admin_create_payment),
        )
        .route(
            "/api/admin/payments/{payment_id}",
            put(payments::controller::admin_update_payment)
                .delete(payments::controller::admin_delete_payment),
        )
        .route("/api/admin/sales", get(sales::controller::admin_sales))
        .route(
            "/api/admin/sales/summary",
            get(sales::controller::admin_sales_summary),
        )
        .route(
            "/api/admin/sales/{order_id}",
            put(sales::controller::admin_update_sales_details),
        )
        .route(
            "/api/admin/sales/{order_id}/status",
            put(sales::controller::admin_update_sales_status),
        )
        .route(
            "/api/admin/invoices",
            get(invoices::controller::admin_invoices),
        )
        .route(
            "/api/admin/invoices/from-order/{order_id}",
            post(invoices::controller::admin_create_invoice_from_order),
        )
        .route(
            "/api/admin/invoices/autocount-export",
            post(invoices::controller::admin_export_autocount_invoices),
        )
        .route(
            "/api/admin/invoices/{invoice_id}",
            put(invoices::controller::admin_update_invoice_billing),
        )
        .route(
            "/api/admin/invoices/{invoice_id}/void",
            post(invoices::controller::admin_void_invoice),
        )
        .route(
            "/api/admin/invoices/{invoice_id}/payments",
            post(invoices::controller::admin_record_invoice_payment),
        )
        .route(
            "/api/admin/settings",
            get(settings::controller::admin_settings),
        )
        .route(
            "/api/admin/settings/{key}",
            put(settings::controller::admin_update_setting),
        )
        .route(
            "/api/admin/customer-portal",
            get(customer_portal::controller::customer_portal_profiles)
                .post(customer_portal::controller::create_customer_portal_profile),
        )
        .route(
            "/api/admin/customer-portal/{profile_id}",
            put(customer_portal::controller::update_customer_portal_profile)
                .delete(customer_portal::controller::delete_customer_portal_profile),
        )
        .route(
            "/api/admin/permissions",
            get(permissions::controller::admin_permissions),
        )
        .route(
            "/api/admin/roles",
            post(permissions::controller::create_role),
        )
        .route(
            "/api/admin/roles/{role_id}",
            put(permissions::controller::update_role).delete(permissions::controller::delete_role),
        )
        .route(
            "/api/admin/role-permissions",
            put(permissions::controller::update_role_permission),
        )
        .route(
            "/api/admin/categories",
            post(catalog::controller::create_category),
        )
        .route(
            "/api/admin/categories/{slug}",
            put(catalog::controller::update_category).delete(catalog::controller::delete_category),
        )
        .route(
            "/api/admin/catalog",
            get(catalog::controller::admin_catalog),
        )
        .route(
            "/api/admin/products",
            post(catalog::controller::create_product),
        )
        .route(
            "/api/admin/products/{product_id}",
            put(catalog::controller::update_product).delete(catalog::controller::delete_product),
        )
        .route(
            "/api/admin/products/{product_id}/stock",
            put(catalog::controller::update_product_stock),
        )
        .route(
            "/api/admin/inventory/supplier-sync",
            post(catalog::controller::supplier_sync),
        )
        .route("/api/checkout", post(orders::controller::checkout))
        .route(
            "/api/account/register",
            post(customer_auth::controller::register),
        )
        .route("/api/account/login", post(customer_auth::controller::login))
        .route(
            "/api/account/logout",
            post(customer_auth::controller::logout),
        )
        .route("/api/account/me", get(customer_auth::controller::me))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}

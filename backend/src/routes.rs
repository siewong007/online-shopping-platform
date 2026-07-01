use axum::{
    Router,
    http::{HeaderName, HeaderValue, Method, header::CONTENT_TYPE},
    routing::{get, post, put},
};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use crate::{
    app_state::AppState,
    modules::{
        catalog, customer_portal, dashboard, health, orders, payments, permissions, storefront,
    },
};

pub fn build_router(state: AppState, frontend_origin: HeaderValue) -> Router {
    let admin_role_header = HeaderName::from_static(permissions::model::ADMIN_ROLE_HEADER);
    let cors = CorsLayer::new()
        .allow_origin(frontend_origin)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([CONTENT_TYPE, admin_role_header]);

    Router::new()
        .route("/api/health", get(health::controller::health))
        .route("/api/storefront", get(storefront::controller::storefront))
        .route(
            "/api/admin/dashboard",
            get(dashboard::controller::admin_dashboard),
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
            "/api/admin/payments",
            get(payments::controller::admin_payments)
                .post(payments::controller::admin_create_payment),
        )
        .route(
            "/api/admin/payments/{payment_id}",
            put(payments::controller::admin_update_payment)
                .delete(payments::controller::admin_delete_payment),
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
            "/api/admin/products",
            post(catalog::controller::create_product),
        )
        .route("/api/checkout", post(orders::controller::checkout))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(cors)
}

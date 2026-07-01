pub use crate::db::PermissionAction;
pub use crate::models::{Role, RolePagePermission};

pub const ADMIN_CATALOG_PAGE: &str = "admin-catalog";
pub const ADMIN_CUSTOMERS_PAGE: &str = "admin-customers";
pub const ADMIN_ORDERS_PAGE: &str = "admin-orders";
pub const ADMIN_PAYMENTS_PAGE: &str = "admin-payments";
pub const ADMIN_PERMISSIONS_PAGE: &str = "admin-permissions";
pub const ADMIN_ROLE_HEADER: &str = "x-admin-role-id";

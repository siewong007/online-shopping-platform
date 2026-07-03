ALTER TABLE admin_users DROP CONSTRAINT admin_users_username_key;

CREATE UNIQUE INDEX idx_admin_users_username_ci ON admin_users (lower(username));

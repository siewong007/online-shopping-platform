CREATE TABLE support_conversations (
    id                      SERIAL PRIMARY KEY,
    guest_name              TEXT NOT NULL,
    guest_email             TEXT NOT NULL,
    customer_account_id     INTEGER REFERENCES customer_accounts(id) ON DELETE SET NULL,
    assigned_admin_user_id  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    status                  TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'pending', 'closed')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT support_conversations_guest_name_not_blank
        CHECK (char_length(trim(guest_name)) > 0),
    CONSTRAINT support_conversations_guest_email_not_blank
        CHECK (char_length(trim(guest_email)) > 0)
);

CREATE TABLE support_messages (
    id                  SERIAL PRIMARY KEY,
    conversation_id     INTEGER NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    author_kind         TEXT NOT NULL CHECK (author_kind IN ('guest', 'admin')),
    admin_user_id       INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    body                TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT support_messages_body_length_check
        CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE TABLE support_sessions (
    id                  SERIAL PRIMARY KEY,
    token               TEXT NOT NULL UNIQUE,
    conversation_id     INTEGER NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_conversations_inbox
    ON support_conversations (last_message_at DESC, id DESC);

CREATE INDEX idx_support_conversations_status_inbox
    ON support_conversations (status, last_message_at DESC, id DESC);

CREATE INDEX idx_support_messages_conversation_id
    ON support_messages (conversation_id, id ASC);

CREATE INDEX idx_support_sessions_conversation_id
    ON support_sessions (conversation_id);

CREATE INDEX idx_support_sessions_expires_at
    ON support_sessions (expires_at);

INSERT INTO permission_pages (slug, name, description, sort_order)
SELECT 'admin-support',
       'Support',
       'Guest support conversation inbox and replies.',
       COALESCE(MAX(sort_order), 0) + 1
FROM permission_pages
ON CONFLICT (slug) DO NOTHING;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, TRUE
FROM roles
CROSS JOIN permission_pages
WHERE roles.is_super_admin = TRUE
  AND permission_pages.slug = 'admin-support'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = TRUE;

INSERT INTO role_page_permissions (role_id, page_id, can_create, can_read, can_update, can_delete)
SELECT roles.id, permission_pages.id, TRUE, TRUE, TRUE, FALSE
FROM roles
CROSS JOIN permission_pages
WHERE roles.name = 'Store Manager'
  AND permission_pages.slug = 'admin-support'
ON CONFLICT (role_id, page_id) DO UPDATE SET
    can_create = TRUE,
    can_read = TRUE,
    can_update = TRUE,
    can_delete = FALSE;

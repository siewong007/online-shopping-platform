import { type FormEvent, useEffect, useState } from "react";

import { RecordForm, type RecordFormField, RecordModal } from "../../../shared/components/RecordModal";
import type {
  CreateRoleInput,
  PermissionsPayload,
  Role,
  RolePagePermission,
  UpdateRoleInput,
  UpdateRolePagePermissionInput
} from "../types";

type PermissionAction = "create" | "read" | "update" | "delete";

const roleFields: RecordFormField<CreateRoleInput>[] = [
  {
    name: "name",
    label: "Role name",
    required: true,
    minLength: 2,
    placeholder: "Regional Admin"
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Owns regional catalog and fulfillment access.",
    rows: 4
  }
];

type PermissionsPanelProps = {
  activeRoleId: number | null;
  onChangeRole: (roleId: number) => void;
  onCreateRole: (input: CreateRoleInput) => Promise<Role>;
  onDeleteRole: (roleId: number) => Promise<void>;
  onUpdateRole: (roleId: number, input: UpdateRoleInput) => Promise<Role>;
  onUpdateRolePermission: (input: UpdateRolePagePermissionInput) => Promise<RolePagePermission>;
  permissions: PermissionsPayload | null;
};

function emptyPermission(roleId: number, pageId: number): RolePagePermission {
  return {
    role_id: roleId,
    page_id: pageId,
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false
  };
}

export function PermissionsPanel({
  activeRoleId,
  onChangeRole,
  onCreateRole,
  onDeleteRole,
  onUpdateRole,
  onUpdateRolePermission,
  permissions
}: PermissionsPanelProps) {
  const [roleForm, setRoleForm] = useState<CreateRoleInput>({ name: "", description: "" });
  const [editForm, setEditForm] = useState<UpdateRoleInput>({ name: "", description: "" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [savingPermissionKey, setSavingPermissionKey] = useState<string | null>(null);

  const activeRole = permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canEditActiveRole = Boolean(activeRole && !activeRole.is_super_admin);

  useEffect(() => {
    if (!activeRole) {
      setEditForm({ name: "", description: "" });
      return;
    }

    setEditForm({ name: activeRole.name, description: activeRole.description });
  }, [activeRole]);

  const handleCreateRole = async () => {
    setFeedback(null);
    setIsCreatingRole(true);

    try {
      const role = await onCreateRole({
        name: roleForm.name.trim(),
        description: roleForm.description.trim()
      });
      setRoleForm({ name: "", description: "" });
      setIsCreateOpen(false);
      setFeedback({ kind: "success", message: `${role.name} was created.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to create role."
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!activeRole || activeRole.is_super_admin) {
      return;
    }

    setFeedback(null);
    setIsSavingRole(true);

    try {
      const role = await onUpdateRole(activeRole.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim()
      });
      setIsEditOpen(false);
      setFeedback({ kind: "success", message: `${role.name} was updated.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update role."
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!activeRole || activeRole.is_super_admin) {
      return;
    }

    const confirmed = window.confirm(`Delete the ${activeRole.name} role?`);
    if (!confirmed) {
      return;
    }

    setFeedback(null);
    setIsDeletingRole(true);

    try {
      await onDeleteRole(activeRole.id);
      setFeedback({ kind: "success", message: `${activeRole.name} was deleted.` });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to delete role."
      });
    } finally {
      setIsDeletingRole(false);
    }
  };

  const permissionForPage = (pageId: number): RolePagePermission | null => {
    if (!permissions || activeRoleId === null) {
      return null;
    }

    const activeRoleRecord = permissions.roles.find((role) => role.id === activeRoleId);
    if (activeRoleRecord?.is_super_admin) {
      return {
        role_id: activeRoleRecord.id,
        page_id: pageId,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true
      };
    }

    return (
      permissions.permissions.find(
        (permission) => permission.role_id === activeRoleId && permission.page_id === pageId
      ) ?? emptyPermission(activeRoleId, pageId)
    );
  };

  const updatePermission = async (
    permission: RolePagePermission,
    action: PermissionAction,
    checked: boolean
  ) => {
    if (!canEditActiveRole) {
      return;
    }

    let nextPermission: RolePagePermission = { ...permission };

    if (action === "read" && !checked) {
      nextPermission = {
        ...nextPermission,
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false
      };
    } else if (action === "create") {
      nextPermission = { ...nextPermission, can_create: checked, can_read: checked || nextPermission.can_read };
    } else if (action === "update") {
      nextPermission = { ...nextPermission, can_update: checked, can_read: checked || nextPermission.can_read };
    } else if (action === "delete") {
      nextPermission = { ...nextPermission, can_delete: checked, can_read: checked || nextPermission.can_read };
    } else {
      nextPermission = { ...nextPermission, can_read: checked };
    }

    const key = `${nextPermission.role_id}-${nextPermission.page_id}-${action}`;
    setFeedback(null);
    setSavingPermissionKey(key);

    try {
      await onUpdateRolePermission(nextPermission);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to update permission."
      });
    } finally {
      setSavingPermissionKey(null);
    }
  };

  if (!permissions) {
    return (
      <section className="admin-section active">
        <article className="dashboard-panel">
          <p>Permission data is loading.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="admin-section active">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Access control</p>
          <h3>Roles and page permissions</h3>
        </div>
        <span className="status-pill live">{permissions.roles.length} roles</span>
      </div>

      <div className="permission-layout">
        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Role editor</p>
              <h3>{activeRole?.name ?? "Select a role"}</h3>
            </div>
            {activeRole?.is_super_admin ? <span className="status-pill live">Reserved</span> : null}
          </div>

          <label className="admin-field">
            Active role
            <select
              value={activeRoleId ?? ""}
              onChange={(event) => onChangeRole(Number(event.target.value))}
            >
              {permissions.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <form className="admin-form role-edit-form" onSubmit={handleUpdateRole}>
            <label className="admin-field">
              Role name
              <input
                disabled={!canEditActiveRole}
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>

            <label className="admin-field">
              Description
              <textarea
                disabled={!canEditActiveRole}
                rows={3}
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <div className="form-actions split-actions">
              <button className="solid-button" disabled={!canEditActiveRole || isSavingRole} type="submit">
                {isSavingRole ? "Saving..." : "Save Role"}
              </button>
              <button
                className="outline-button danger-button"
                disabled={!canEditActiveRole || isDeletingRole}
                onClick={() => void handleDeleteRole()}
                type="button"
              >
                {isDeletingRole ? "Deleting..." : "Delete Role"}
              </button>
            </div>
          </form>
        </article>

        <article className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New role</p>
              <h3>Create dynamic roles</h3>
            </div>
          </div>

          <form className="admin-form" onSubmit={handleCreateRole}>
            <label className="admin-field">
              Role name
              <input
                value={roleForm.name}
                onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Regional Admin"
                required
              />
            </label>

            <label className="admin-field">
              Description
              <textarea
                value={roleForm.description}
                onChange={(event) =>
                  setRoleForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Owns regional catalog and fulfillment access."
                rows={4}
              />
            </label>

            {feedback ? <p className={`catalog-feedback ${feedback.kind}`}>{feedback.message}</p> : null}

            <div className="form-actions">
              <button className="solid-button" disabled={isCreatingRole} type="submit">
                {isCreatingRole ? "Creating..." : "Create Role"}
              </button>
            </div>
          </form>
        </article>
      </div>

      <article className="dashboard-panel permission-matrix-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Page matrix</p>
            <h3>{activeRole?.name ?? "Role"} CRUD grants</h3>
          </div>
          {activeRole?.is_super_admin ? <span className="status-pill live">All access</span> : null}
        </div>

        <div className="permission-table">
          <div className="permission-row permission-header">
            <strong>Page</strong>
            <strong>Create</strong>
            <strong>Read</strong>
            <strong>Update</strong>
            <strong>Delete</strong>
          </div>

          {permissions.pages.map((page) => {
            const permission = permissionForPage(page.id);

            if (!permission) {
              return null;
            }

            return (
              <div className="permission-row" key={page.id}>
                <div className="permission-page">
                  <strong>{page.name}</strong>
                  <span>{page.description}</span>
                </div>

                {(["create", "read", "update", "delete"] as PermissionAction[]).map((action) => {
                  const checked =
                    action === "create"
                      ? permission.can_create
                      : action === "read"
                        ? permission.can_read
                        : action === "update"
                          ? permission.can_update
                          : permission.can_delete;
                  const key = `${permission.role_id}-${permission.page_id}-${action}`;

                  return (
                    <label className="permission-toggle" key={action}>
                      <input
                        aria-label={`${page.name} ${action}`}
                        checked={checked}
                        disabled={!canEditActiveRole || savingPermissionKey === key}
                        onChange={(event) => void updatePermission(permission, action, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{checked ? "On" : "Off"}</span>
                    </label>
                  );
                })}
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

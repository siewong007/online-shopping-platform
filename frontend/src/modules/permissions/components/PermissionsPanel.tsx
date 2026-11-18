import { type FormEvent, useState } from "react";

import { ConfirmModal } from "../../../shared/components/ConfirmModal";
import {
  RecordForm,
  type RecordFormField,
  RecordModal
} from "../../../shared/components/RecordModal";
import { useNotifications } from "../../../shared/notifications";
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
  canCreate?: boolean;
  canDelete?: boolean;
  canUpdate?: boolean;
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
  canCreate = true,
  canDelete = true,
  canUpdate = true,
  onChangeRole,
  onCreateRole,
  onDeleteRole,
  onUpdateRole,
  onUpdateRolePermission,
  permissions
}: PermissionsPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [roleForm, setRoleForm] = useState<CreateRoleInput>({ name: "", description: "" });
  const [editForm, setEditForm] = useState<UpdateRoleInput>({ name: "", description: "" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [pendingDeleteRole, setPendingDeleteRole] = useState<Role | null>(null);
  const [savingPermissionKey, setSavingPermissionKey] = useState<string | null>(null);

  const activeRole = permissions?.roles.find((role) => role.id === activeRoleId) ?? null;
  const canEditActiveRole = Boolean(canUpdate && activeRole && !activeRole.is_super_admin);
  const canDeleteActiveRole = Boolean(canDelete && activeRole && !activeRole.is_super_admin);

  const activeRoleKey = activeRole
    ? `${activeRole.id}:${activeRole.name}:${activeRole.description}`
    : "";
  const [prevActiveRoleKey, setPrevActiveRoleKey] = useState(activeRoleKey);
  if (prevActiveRoleKey !== activeRoleKey) {
    setPrevActiveRoleKey(activeRoleKey);
    setEditForm(
      activeRole
        ? { name: activeRole.name, description: activeRole.description }
        : { name: "", description: "" }
    );
  }

  const handleCreateRole = async () => {
    if (!canCreate) {
      notify({
        severity: "error",
        title: "Role not created",
        message: "The active role cannot create roles.",
        scope: "permissions",
        dedupeKey: "permissions:role:create:permission"
      });
      return;
    }

    setIsCreatingRole(true);

    try {
      const role = await onCreateRole({
        name: roleForm.name.trim(),
        description: roleForm.description.trim()
      });
      setRoleForm({ name: "", description: "" });
      setIsCreateOpen(false);
      onChangeRole(role.id);
      notify({
        severity: "success",
        title: "Role created",
        message: `${role.name} was created successfully.`,
        scope: "permissions",
        dedupeKey: `permissions:role:${role.id}:create:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "create role",
        scope: "permissions",
        dedupeKey: "permissions:role:create:error"
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!permissions || !activeRole || activeRole.is_super_admin || !canUpdate) {
      return;
    }

    setIsSavingRole(true);

    try {
      const role = await onUpdateRole(activeRole.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim()
      });
      notify({
        severity: "success",
        title: "Role updated",
        message: `${role.name} was updated successfully.`,
        scope: "permissions",
        dedupeKey: `permissions:role:${role.id}:update:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "update role",
        scope: "permissions",
        dedupeKey: `permissions:role:${activeRole.id}:update:error`
      });
    } finally {
      setIsSavingRole(false);
    }
  };

  const requestDeleteRole = () => {
    if (!permissions || !activeRole || activeRole.is_super_admin || !canDelete) {
      return;
    }

    setPendingDeleteRole(activeRole);
  };

  const confirmDeleteRole = async () => {
    if (!permissions || !pendingDeleteRole || pendingDeleteRole.is_super_admin || !canDelete) {
      return;
    }

    const roleToDelete = pendingDeleteRole;
    setIsDeletingRole(true);

    try {
      const nextRoleId = permissions.roles.find((role) => role.id !== roleToDelete.id)?.id ?? null;
      await onDeleteRole(roleToDelete.id);
      setPendingDeleteRole(null);
      if (nextRoleId !== null) {
        onChangeRole(nextRoleId);
      }
      notify({
        severity: "success",
        title: "Role deleted",
        message: `${roleToDelete.name} was deleted successfully.`,
        scope: "permissions",
        dedupeKey: `permissions:role:${roleToDelete.id}:delete:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "delete role",
        scope: "permissions",
        dedupeKey: `permissions:role:${roleToDelete.id}:delete:error`
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
      nextPermission = {
        ...nextPermission,
        can_create: checked,
        can_read: checked || nextPermission.can_read
      };
    } else if (action === "update") {
      nextPermission = {
        ...nextPermission,
        can_update: checked,
        can_read: checked || nextPermission.can_read
      };
    } else if (action === "delete") {
      nextPermission = {
        ...nextPermission,
        can_delete: checked,
        can_read: checked || nextPermission.can_read
      };
    } else {
      nextPermission = { ...nextPermission, can_read: checked };
    }

    const key = `${nextPermission.role_id}-${nextPermission.page_id}-${action}`;
    setSavingPermissionKey(key);

    try {
      await onUpdateRolePermission(nextPermission);
      notify({
        severity: "success",
        title: "Permission updated",
        message: `The ${action} permission was updated successfully.`,
        scope: "permissions",
        dedupeKey: `permissions:${key}:success`
      });
    } catch (error) {
      notifyError(error, {
        operation: "update role permission",
        scope: "permissions",
        dedupeKey: `permissions:${key}:error`
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
        <div className="admin-actions">
          <span className="status-pill live">{permissions.roles.length} roles</span>
          <button
            className="solid-button"
            disabled={!canCreate}
            onClick={() => {
              setRoleForm({ name: "", description: "" });
              setIsCreateOpen(true);
            }}
            type="button"
          >
            New role
          </button>
        </div>
      </div>

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
              onChange={(event) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
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
            <button
              className="solid-button"
              disabled={!canEditActiveRole || isSavingRole}
              type="submit"
            >
              {isSavingRole ? "Saving..." : "Save Role"}
            </button>
            <button
              className="outline-button danger-button"
              disabled={!canDeleteActiveRole || isDeletingRole}
              onClick={requestDeleteRole}
              type="button"
            >
              {isDeletingRole ? "Deleting..." : "Delete Role"}
            </button>
          </div>
        </form>
      </article>

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
                        onChange={(event) =>
                          void updatePermission(permission, action, event.target.checked)
                        }
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

      <RecordModal
        eyebrow="New role"
        isBusy={isCreatingRole}
        isOpen={isCreateOpen}
        onClose={() => {
          if (!isCreatingRole) {
            setIsCreateOpen(false);
          }
        }}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Create dynamic role"
      >
        <RecordForm
          disabled={!canCreate}
          fields={roleFields}
          isSubmitting={isCreatingRole}
          onCancel={() => setIsCreateOpen(false)}
          onChange={setRoleForm}
          onSubmit={() => void handleCreateRole()}
          submitLabel="Create Role"
          values={roleForm}
        />
      </RecordModal>

      <ConfirmModal
        confirmLabel="Delete role"
        eyebrow="Access control"
        isConfirming={isDeletingRole}
        isOpen={pendingDeleteRole !== null}
        message={
          pendingDeleteRole
            ? `Delete the ${pendingDeleteRole.name} role? Staff assigned to this role must be reassigned first.`
            : ""
        }
        onCancel={() => {
          if (!isDeletingRole) {
            setPendingDeleteRole(null);
          }
        }}
        onConfirm={confirmDeleteRole}
        title={pendingDeleteRole ? `Delete ${pendingDeleteRole.name}?` : "Delete role"}
        tone="danger"
      />
    </section>
  );
}

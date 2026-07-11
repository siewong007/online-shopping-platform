import { useMemo, useState } from "react";

import type { Role } from "../../permissions/types";
import { ManagementTable } from "../../../shared/components/ManagementTable";
import { RecordForm, type RecordFormField, RecordModal } from "../../../shared/components/RecordModal";
import { useNotifications } from "../../../shared/notifications";
import type {
  AdminResetPasswordInput,
  AdminUser,
  CreateAdminUserInput,
  SetAdminUserActiveInput,
  UpdateAdminUserProfileInput
} from "../types";

type CreateUserFormState = {
  username: string;
  display_name: string;
  password: string;
  role_id: string;
};

type EditProfileFormState = {
  display_name: string;
  role_id: string;
};

type ResetPasswordFormState = {
  new_password: string;
};

type TeamPanelProps = {
  canCreate: boolean;
  canUpdate: boolean;
  currentUserId: number;
  onCreateUser: (input: CreateAdminUserInput) => Promise<AdminUser>;
  onResetUserPassword: (userId: number, input: AdminResetPasswordInput) => Promise<void>;
  onSetUserActive: (userId: number, input: SetAdminUserActiveInput) => Promise<AdminUser>;
  onUpdateUserProfile: (userId: number, input: UpdateAdminUserProfileInput) => Promise<AdminUser>;
  roles: Role[];
  users: AdminUser[];
};

function emptyCreateUserForm(roles: Role[]): CreateUserFormState {
  return {
    username: "",
    display_name: "",
    password: "",
    role_id: String(roles[0]?.id ?? "")
  };
}

function editProfileFormFromUser(user: AdminUser): EditProfileFormState {
  return {
    display_name: user.display_name,
    role_id: String(user.role_id)
  };
}

function createUserFields(roles: Role[]): RecordFormField<CreateUserFormState>[] {
  return [
    {
      name: "username",
      label: "Username",
      required: true,
      minLength: 3,
      placeholder: "j.smith"
    },
    {
      name: "display_name",
      label: "Display name",
      required: true,
      minLength: 2,
      placeholder: "Jamie Smith"
    },
    {
      name: "password",
      label: "Temporary password",
      type: "password",
      required: true,
      minLength: 8
    },
    {
      name: "role_id",
      label: "Role",
      type: "select",
      options: roles.map((role) => ({ label: role.name, value: String(role.id) }))
    }
  ];
}

function editProfileFields(roles: Role[]): RecordFormField<EditProfileFormState>[] {
  return [
    {
      name: "display_name",
      label: "Display name",
      required: true,
      minLength: 2
    },
    {
      name: "role_id",
      label: "Role",
      type: "select",
      options: roles.map((role) => ({ label: role.name, value: String(role.id) }))
    }
  ];
}

const resetPasswordFields: RecordFormField<ResetPasswordFormState>[] = [
  {
    name: "new_password",
    label: "New password",
    type: "password",
    required: true,
    minLength: 8
  }
];

export function TeamPanel({
  canCreate,
  canUpdate,
  currentUserId,
  onCreateUser,
  onResetUserPassword,
  onSetUserActive,
  onUpdateUserProfile,
  roles,
  users
}: TeamPanelProps) {
  const { notify, notifyError } = useNotifications();
  const [createForm, setCreateForm] = useState<CreateUserFormState>(() => emptyCreateUserForm(roles));
  const [editForm, setEditForm] = useState<EditProfileFormState>({ display_name: "", role_id: "" });
  const [resetForm, setResetForm] = useState<ResetPasswordFormState>({ new_password: "" });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingReset, setIsSavingReset] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  const roleNameById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);
  const editingUser =
    editingUserId === null ? null : users.find((user) => user.id === editingUserId) ?? null;
  const resettingUser =
    resettingUserId === null ? null : users.find((user) => user.id === resettingUserId) ?? null;

  const openCreate = () => {
    setCreateForm(emptyCreateUserForm(roles));
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUserId(user.id);
    setEditForm(editProfileFormFromUser(user));
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingUserId(null);
  };

  const openReset = (user: AdminUser) => {
    setResettingUserId(user.id);
    setResetForm({ new_password: "" });
    setIsResetOpen(true);
  };

  const closeReset = () => {
    setIsResetOpen(false);
    setResettingUserId(null);
  };

  const handleCreateUser = async () => {
    if (!canCreate) {
      notify({ severity: "error", title: "Admin user not created", message: "The active role cannot create admin users.", scope: "admin-users", dedupeKey: "admin-users:create:permission" });
      return;
    }

    setIsSavingCreate(true);

    try {
      const user = await onCreateUser({
        username: createForm.username.trim(),
        display_name: createForm.display_name.trim(),
        password: createForm.password,
        role_id: Number(createForm.role_id)
      });

      closeCreate();
      notify({ severity: "success", title: "Admin user created", message: `${user.display_name} was created successfully.`, scope: "admin-users", dedupeKey: `admin-users:${user.id}:create:success` });
    } catch (error) {
      notifyError(error, { operation: "create admin user", scope: "admin-users", dedupeKey: "admin-users:create:error" });
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingUserId || !canUpdate) {
      notify({ severity: "error", title: "Admin user not updated", message: "The active role cannot update admin users.", scope: "admin-users", dedupeKey: "admin-users:update:permission" });
      return;
    }

    setIsSavingEdit(true);

    try {
      const user = await onUpdateUserProfile(editingUserId, {
        display_name: editForm.display_name.trim(),
        role_id: Number(editForm.role_id)
      });
      closeEdit();
      notify({ severity: "success", title: "Admin user updated", message: `${user.display_name} was updated successfully.`, scope: "admin-users", dedupeKey: `admin-users:${user.id}:update:success` });
    } catch (error) {
      notifyError(error, { operation: "update admin user", scope: "admin-users", dedupeKey: `admin-users:${editingUserId}:update:error` });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUserId || !canUpdate) {
      notify({ severity: "error", title: "Password not reset", message: "The active role cannot reset admin passwords.", scope: "admin-users", dedupeKey: "admin-users:password:permission" });
      return;
    }

    setIsSavingReset(true);

    try {
      await onResetUserPassword(resettingUserId, { new_password: resetForm.new_password });
      const name = resettingUser?.display_name ?? "The user";
      closeReset();
      notify({ severity: "success", title: "Password reset", message: `${name}'s password was reset successfully.`, scope: "admin-users", dedupeKey: `admin-users:${resettingUserId}:password:success` });
    } catch (error) {
      notifyError(error, { operation: "reset admin password", scope: "admin-users", dedupeKey: `admin-users:${resettingUserId}:password:error` });
    } finally {
      setIsSavingReset(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!canUpdate || user.id === currentUserId) {
      return;
    }

    const nextActive = !user.is_active;
    const confirmed = window.confirm(
      nextActive
        ? `Reactivate ${user.display_name}?`
        : `Deactivate ${user.display_name}? They will be signed out immediately.`
    );

    if (!confirmed) {
      return;
    }

    setTogglingUserId(user.id);

    try {
      await onSetUserActive(user.id, { is_active: nextActive });
      notify({ severity: "success", title: nextActive ? "Admin user reactivated" : "Admin user deactivated", message: `${user.display_name} was ${nextActive ? "reactivated" : "deactivated"} successfully.`, scope: "admin-users", dedupeKey: `admin-users:${user.id}:active:success` });
    } catch (error) {
      notifyError(error, { operation: "change admin user status", scope: "admin-users", dedupeKey: `admin-users:${user.id}:active:error` });
    } finally {
      setTogglingUserId(null);
    }
  };

  const userColumns = [
    {
      key: "name",
      label: "User",
      sortValue: (user: AdminUser) => user.display_name,
      render: (user: AdminUser) => (
        <div className="table-cell-main">
          <strong>{user.display_name}</strong>
          <span>{user.username}</span>
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      sortValue: (user: AdminUser) => roleNameById.get(user.role_id) ?? "",
      render: (user: AdminUser) => roleNameById.get(user.role_id) ?? "Unknown role"
    },
    {
      key: "status",
      label: "Status",
      sortValue: (user: AdminUser) => user.is_active,
      render: (user: AdminUser) => (
        <span className={`status-pill ${user.is_active ? "live" : ""}`}>
          {user.is_active ? "Active" : "Deactivated"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right" as const,
      render: (user: AdminUser) => (
        <div className="management-action-stack">
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => openEdit(user)}
            type="button"
          >
            Edit
          </button>
          <button
            className="outline-button table-action"
            disabled={!canUpdate}
            onClick={() => openReset(user)}
            type="button"
          >
            Reset Password
          </button>
          <button
            className={`outline-button table-action ${user.is_active ? "danger-button" : ""}`}
            disabled={!canUpdate || user.id === currentUserId || togglingUserId === user.id}
            onClick={() => void handleToggleActive(user)}
            type="button"
          >
            {togglingUserId === user.id ? "Saving..." : user.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      )
    }
  ];

  return (
    <article className="dashboard-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Team</p>
          <h3>Admin users</h3>
        </div>
        <span className={`status-pill ${canCreate || canUpdate ? "live" : ""}`}>
          {canCreate || canUpdate ? "Writable" : "Read only"}
        </span>
      </div>

      <div className="record-toolbar">
        <button className="solid-button" disabled={!canCreate} onClick={openCreate} type="button">
          Invite Admin User
        </button>
      </div>

      <ManagementTable
        columns={userColumns}
        emptyMessage="No admin users have been created yet."
        getRowKey={(user) => user.id}
        initialSortKey="name"
        rows={users}
        tableLabel="Admin user management table"
      />

      <RecordModal
        eyebrow="New admin user"
        isOpen={isCreateOpen}
        onClose={closeCreate}
        statusLabel={canCreate ? "Writable" : "Read only"}
        statusTone={canCreate ? "live" : undefined}
        title="Invite a staff member"
      >
        <RecordForm
          disabled={!canCreate}
          fields={createUserFields(roles)}
          isSubmitting={isSavingCreate}
          onCancel={closeCreate}
          onChange={setCreateForm}
          onSubmit={() => void handleCreateUser()}
          submitLabel="Create User"
          values={createForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow="Editing admin user"
        isOpen={isEditOpen}
        onClose={closeEdit}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title={editingUser?.display_name ?? "Edit admin user"}
      >
        <RecordForm
          disabled={!canUpdate}
          fields={editProfileFields(roles)}
          isSubmitting={isSavingEdit}
          onCancel={closeEdit}
          onChange={setEditForm}
          onSubmit={() => void handleUpdateProfile()}
          submitLabel="Save Changes"
          values={editForm}
        />
      </RecordModal>

      <RecordModal
        eyebrow="Reset password"
        isOpen={isResetOpen}
        onClose={closeReset}
        statusLabel={canUpdate ? "Writable" : "Read only"}
        statusTone={canUpdate ? "live" : undefined}
        title={resettingUser?.display_name ?? "Reset password"}
      >
        <RecordForm
          disabled={!canUpdate}
          fields={resetPasswordFields}
          isSubmitting={isSavingReset}
          onCancel={closeReset}
          onChange={setResetForm}
          onSubmit={() => void handleResetPassword()}
          submitLabel="Reset Password"
          values={resetForm}
        />
      </RecordModal>
    </article>
  );
}

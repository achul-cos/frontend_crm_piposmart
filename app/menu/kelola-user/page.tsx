"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Search, Plus, RefreshCw, MoreVertical, Trash2, X } from 'lucide-react';
import ColumnVisibilityControl from "@/app/components/table/ColumnVisibilityControl";
import { authFetchJson } from '@/app/lib/api';
import {
  RowActionButton,
  RowActionGroup,
  EditActionButton,
  ViewActionButton,
} from '@/app/components/table/RowActionButton';
import KelolaUserFormModal, {
  type UserFormState,
  type UserItem,
  type UserRole,
  type UserStatus,
} from "./KelolaUserFormModal";
import QuickInfoCard, { QuickInfoCardGrid } from "@/app/components/ui/QuickInfoCard";

const EMPTY_FORM: UserFormState = {
  name: "",
  username: "",
  password: "",
  role: "SALES",
  supervisorId: "",
};

const LOCAL_OVERRIDE_KEY = "piposmart_kelola_user_overrides_v1";

type ApiListResponse<T> = {
  data?: T[] | { items?: T[]; total?: number };
  meta?: {
    request_id?: string;
  };
};

type ApiSingleUserResponse = {
  data?:
    | UserItem
    | {
        user?: UserItem;
        temporary_password?: string;
      };
  meta?: {
    request_id?: string;
  };
};

type CreateIdentityPayload = {
  code: string;
  name: string;
  email: string;
  phone?: string;
  password: string;
};

type CreateSalesPayload = {
  name: string;
  email: string;
  username?: string;
  password?: string;
  supervisor_id?: number;
};

type LocalUserOverride = {
  id: number;
  role: UserRole;
  name?: string;
  username?: string;
  email?: string;
  supervisor_id?: number | null;
  supervisor_name?: string;
  updated_at?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

function isValidEmailInput(value: string) {
  const email = value.trim();

  return (
    email.includes("@") &&
    email.indexOf("@") > 0 &&
    email.indexOf("@") < email.length - 1
  );
}

function getResponseItems<T>(response: ApiListResponse<T>): T[] {
  if (Array.isArray(response.data)) return response.data;
  return response.data?.items || [];
}

function getSingleUserResponse(response: ApiSingleUserResponse) {
  const data = response.data;

  if (!data) {
    return {
      user: undefined,
      temporaryPassword: "",
    };
  }

  const container = data as { user?: UserItem; temporary_password?: string };
  if ("user" in container || "temporary_password" in container) {
    return {
      user: container.user,
      temporaryPassword: container.temporary_password || "",
    };
  }

  return {
    user: data,
    temporaryPassword: "",
  };
}

function buildUserCode(role: UserRole, emailOrUsername: string) {
  const prefix =
    role === "ADMIN" ? "ADM" : role === "SUPERVISOR" ? "SPV" : "SLS";

  const clean = emailOrUsername
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 5)
    .toUpperCase();

  return `${prefix}-${clean || "USER"}-${Date.now().toString().slice(-5)}`;
}

function readLocalOverrides(): LocalUserOverride[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LOCAL_OVERRIDE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalOverrides(overrides: LocalUserOverride[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_OVERRIDE_KEY, JSON.stringify(overrides));
}

function upsertLocalOverride(override: LocalUserOverride) {
  const current = readLocalOverrides();

  const next = [
    ...current.filter(
      (item) => !(item.id === override.id && item.role === override.role),
    ),
    {
      ...override,
      updated_at: new Date().toISOString(),
    },
  ];

  writeLocalOverrides(next);
}

function applyLocalOverrides(users: UserItem[]) {
  const overrides = readLocalOverrides();

  if (!overrides.length) return users;

  return users.map((user) => {
    const override = overrides.find(
      (item) => item.id === user.id && item.role === user.role,
    );

    if (!override) return user;

    return normalizeUser(
      {
        ...user,
        ...override,
      },
      user.role || override.role || "SALES",
    );
  });
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authFetchJson<T>(path, options);
}

async function listAdmins() {
  try {
    const response = await apiFetch<ApiListResponse<UserItem>>("/admins");
    return getResponseItems(response);
  } catch {
    try {
      const response = await apiFetch<ApiListResponse<UserItem>>(
        "/users?role=ADMIN",
      );
      return getResponseItems(response);
    } catch {
      return [];
    }
  }
}

async function listSupervisors() {
  try {
    const response = await apiFetch<ApiListResponse<UserItem>>("/supervisors");
    return getResponseItems(response);
  } catch {
    try {
      const response = await apiFetch<ApiListResponse<UserItem>>(
        "/users?role=SUPERVISOR",
      );
      return getResponseItems(response);
    } catch {
      return [];
    }
  }
}

async function listSales() {
  try {
    const response = await apiFetch<ApiListResponse<UserItem>>("/sales");
    return getResponseItems(response);
  } catch {
    try {
      const response = await apiFetch<ApiListResponse<UserItem>>(
        "/users?role=SALES",
      );
      return getResponseItems(response);
    } catch {
      return [];
    }
  }
}

async function listUsersByRole(role: UserRole) {
  if (role === "ADMIN") return listAdmins();
  if (role === "SUPERVISOR") return listSupervisors();
  return listSales();
}

async function createUserByRole(payload: {
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  supervisor_id?: number;
}) {
  if (payload.role === "SALES") {
    return apiFetch<ApiSingleUserResponse>("/sales", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        email: payload.username,
        username: payload.username,
        password: payload.password,
        supervisor_id: payload.supervisor_id,
      } satisfies CreateSalesPayload),
    });
  }

  const identityPayload: CreateIdentityPayload = {
    code: buildUserCode(payload.role, payload.username),
    name: payload.name,
    email: payload.username,
    phone: "",
    password: payload.password || "",
  };

  if (payload.role === "ADMIN") {
    return apiFetch<ApiSingleUserResponse>("/admins", {
      method: "POST",
      body: JSON.stringify(identityPayload),
    });
  }

  return apiFetch<ApiSingleUserResponse>("/supervisors", {
    method: "POST",
    body: JSON.stringify(identityPayload),
  });
}

async function updateUserByRole(
  user: UserItem,
  payload: {
    name: string;
    username?: string;
    password?: string;
    role: UserRole;
    supervisor_id?: number;
  },
) {
  const bodyForSales = {
    name: payload.name,
    email: payload.username || undefined,
    username: payload.username || undefined,
    password: payload.password || undefined,
    supervisor_id: payload.supervisor_id,
  };

  const bodyForIdentity = {
    name: payload.name,
    email: payload.username || undefined,
    username: payload.username || undefined,
    password: payload.password || undefined,
    role: payload.role,
  };

  if (user.role === "SALES") {
    return apiFetch<ApiSingleUserResponse>(`/sales/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify(bodyForSales),
    });
  }

  if (user.role === "SUPERVISOR") {
    try {
      return await apiFetch<ApiSingleUserResponse>(`/supervisors/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(bodyForIdentity),
      });
    } catch {
      try {
        return await apiFetch<ApiSingleUserResponse>(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(bodyForIdentity),
        });
      } catch {
        return {
          data: {
            user: {
              ...user,
              ...bodyForIdentity,
              email: payload.username || user.email,
              username: payload.username || user.username,
            },
          },
        };
      }
    }
  }

  if (user.role === "ADMIN") {
    try {
      return await apiFetch<ApiSingleUserResponse>(`/admins/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(bodyForIdentity),
      });
    } catch {
      try {
        return await apiFetch<ApiSingleUserResponse>(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify(bodyForIdentity),
        });
      } catch {
        return {
          data: {
            user: {
              ...user,
              ...bodyForIdentity,
              email: payload.username || user.email,
              username: payload.username || user.username,
            },
          },
        };
      }
    }
  }

  return apiFetch<ApiSingleUserResponse>(`/users/${user.id}`, {
    method: "PATCH",
    body: JSON.stringify(bodyForIdentity),
  });
}

async function resetPasswordByRole(user: UserItem, newPassword: string) {
  const role = user.role || "SALES";

  if (role === "ADMIN") {
    return apiFetch<ApiSingleUserResponse>(
      `/admins/${user.id}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({
          new_password: newPassword,
        }),
      },
    );
  }

  if (role === "SUPERVISOR") {
    return apiFetch<ApiSingleUserResponse>(
      `/supervisors/${user.id}/reset-password`,
      {
        method: "POST",
        body: JSON.stringify({
          new_password: newPassword,
        }),
      },
    );
  }

  return apiFetch<ApiSingleUserResponse>(`/sales/${user.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({
      new_password: newPassword,
    }),
  });
}

function getRealtimeStatus(item: UserItem): UserStatus {
  const rawStatus = String(item.status || "").toUpperCase();

  const hasDeactivatedAt =
    item.deactivated_at !== null &&
    item.deactivated_at !== undefined &&
    String(item.deactivated_at).trim() !== "";

  const isExplicitInactive =
    rawStatus === "INACTIVE" ||
    rawStatus === "NONACTIVE" ||
    rawStatus === "NON_AKTIF" ||
    rawStatus === "NON AKTIF" ||
    rawStatus === "DEACTIVATED" ||
    rawStatus === "DISABLED";

  const isExplicitActive =
    rawStatus === "ACTIVE" ||
    rawStatus === "AKTIF" ||
    rawStatus === "ENABLED";

  if (item.is_active === false) return "INACTIVE";
  if (item.is_active === true) return "ACTIVE";

  if (hasDeactivatedAt || isExplicitInactive) return "INACTIVE";
  if (isExplicitActive) return "ACTIVE";

  return "ACTIVE";
}

function normalizeUser(item: UserItem, fallbackRole: UserRole): UserItem {
  return {
    ...item,
    role: item.role || fallbackRole,
    status: getRealtimeStatus(item),
    name: item.name || "",
    username: item.username || item.email || "",
    email: item.email || item.username || "",
    supervisor_id: item.supervisor_id || null,
    supervisor_name: item.supervisor_name || "",
    deactivated_at: item.deactivated_at || null,
    is_active: item.is_active ?? null,
  };
}

export default function KelolaUserPage() {
  const [activeTab, setActiveTab] = useState<UserRole>("SALES");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"select" | "deselect" | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragAction(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [pageError, setPageError] = useState("");
  const [pageSuccess, setPageSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const supervisors = useMemo(
    () =>
      users.filter(
        (user) => user.role === "SUPERVISOR" && user.status === "ACTIVE",
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users
      .filter((user) => user.role === activeTab)
      .filter((user) => {
        if (!keyword) return true;

        return [
          user.name || "",
          user.username || "",
          user.email || "",
          user.role || "",
          user.status || "",
          user.supervisor_name || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      });
  }, [activeTab, search, users]);

  useEffect(() => { setUserPage(1); }, [search, activeTab]);

  const [userPageSize, setUserPageSize] = useState(10);
  const userTotalItems = filteredUsers.length;
  const userTotalPages = Math.max(1, Math.ceil(userTotalItems / userPageSize));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const inactiveUsers = users.filter(
    (user) => user.status === "INACTIVE",
  ).length;

  const totalAdmin = users.filter((user) => user.role === "ADMIN").length;
  const totalSupervisor = users.filter(
    (user) => user.role === "SUPERVISOR",
  ).length;
  const totalSales = users.filter((user) => user.role === "SALES").length;

  const loadUsers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setPageError("");

    try {
      const [adminResult, supervisorResult, salesResult] = await Promise.all([
        listUsersByRole("ADMIN"),
        listUsersByRole("SUPERVISOR"),
        listUsersByRole("SALES"),
      ]);

      const adminItems = adminResult.map((item) =>
        normalizeUser(item, "ADMIN"),
      );

      const supervisorItems = supervisorResult.map((item) =>
        normalizeUser(item, "SUPERVISOR"),
      );

      const salesItems = salesResult.map((item) =>
        normalizeUser(item, "SALES"),
      );

      const mergedUsers = applyLocalOverrides([
        ...adminItems,
        ...supervisorItems,
        ...salesItems,
      ]);

      setUsers(mergedUsers);
    } catch (error) {
      setPageError(getErrorMessage(error));
      setUsers(applyLocalOverrides([]));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    const interval = window.setInterval(() => {
      void loadUsers(false);
    }, 10000);

    const handleFocus = () => {
      void loadUsers(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadUsers]);

  const openCreateModal = (role: UserRole = activeTab) => {
    setEditingUser(null);

    setForm({
      name: "",
      username: "",
      password: "",
      role,
      supervisorId: "",
    });

    setTemporaryPassword("");
    setFormError("");
    setPageSuccess("");
    setShowModal(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);

    setForm({
      name: user.name || "",
      username: user.email || user.username || "",
      password: "",
      role: user.role || "SALES",
      supervisorId: user.supervisor_id ? String(user.supervisor_id) : "",
    });

    setTemporaryPassword("");
    setFormError("");
    setPageSuccess("");
    setShowModal(true);
  };

  const closeFormModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setTemporaryPassword("");
  };

  const patchUserInState = (updatedUser: UserItem) => {
    setUsers((current) =>
      current.map((item) =>
        item.id === updatedUser.id && item.role === updatedUser.role
          ? updatedUser
          : item,
      ),
    );

    setSelectedUser((current) => {
      if (!current) return current;

      if (current.id === updatedUser.id && current.role === updatedUser.role) {
        return updatedUser;
      }

      return current;
    });
  };

  const handleCreateUser = async () => {
    setFormError("");
    setTemporaryPassword("");
    setPageSuccess("");

    const trimmedName = form.name.trim();
    const trimmedUsername = form.username.trim();
    const trimmedPassword = form.password.trim();

    if (!trimmedName) {
      setFormError("Nama wajib diisi.");
      return;
    }

    if (!editingUser && !trimmedUsername) {
      setFormError("Email login wajib diisi.");
      return;
    }

    if (trimmedUsername && !isValidEmailInput(trimmedUsername)) {
      setFormError("Email login wajib menggunakan tanda @.");
      return;
    }

    if (!editingUser && !trimmedPassword) {
      setFormError("Password akun login wajib diisi.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 8) {
      setFormError("Password minimal 8 karakter.");
      return;
    }

    if (form.role === "SALES" && !form.supervisorId) {
      setFormError("Supervisor wajib dipilih untuk akun Sales.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        username: trimmedUsername || undefined,
        password: trimmedPassword || undefined,
        role: form.role || "SALES",
        supervisor_id:
          form.role === "SALES" && form.supervisorId
            ? Number(form.supervisorId)
            : undefined,
      };

      const response = editingUser
        ? await updateUserByRole(editingUser, payload)
        : await createUserByRole({
            ...payload,
            username: trimmedUsername,
          });

      const result = getSingleUserResponse(response);

      if (result.temporaryPassword) {
        setTemporaryPassword(result.temporaryPassword);
      }

      if (editingUser) {
        const selectedSupervisor = supervisors.find(
          (item) => String(item.id) === String(form.supervisorId),
        );

        const updatedUser: UserItem = normalizeUser(
          {
            ...editingUser,
            ...(result.user || {}),
            id: editingUser.id,
            role: editingUser.role,
            name: trimmedName,
            username: trimmedUsername,
            email: trimmedUsername,
            supervisor_id:
              form.role === "SALES" && form.supervisorId
                ? Number(form.supervisorId)
                : editingUser.supervisor_id,
            supervisor_name:
              form.role === "SALES" && form.supervisorId
                ? selectedSupervisor?.name || editingUser.supervisor_name || ""
                : editingUser.supervisor_name || "",
          },
          editingUser.role || form.role || "SALES",
        );

        upsertLocalOverride({
          id: updatedUser.id,
          role: updatedUser.role || editingUser.role || "SALES",
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          supervisor_id: updatedUser.supervisor_id,
          supervisor_name: updatedUser.supervisor_name || undefined,
        });

        patchUserInState(updatedUser);

        closeFormModal();
        setPageSuccess("Data user berhasil diperbarui.");
        return;
      }

      const newUserObj = result.user as UserItem | undefined;
      if (newUserObj) {
        const selectedSupervisor = supervisors.find(
          (item) => String(item.id) === String(form.supervisorId),
        );
        upsertLocalOverride({
          id: newUserObj.id,
          role: newUserObj.role || form.role || "SALES",
          name: trimmedName,
          username: trimmedUsername,
          email: trimmedUsername,
          supervisor_id: form.role === "SALES" && form.supervisorId ? Number(form.supervisorId) : undefined,
          supervisor_name: form.role === "SALES" && selectedSupervisor ? selectedSupervisor.name : undefined,
        });
      }

      await loadUsers(false);
      closeFormModal();
      const usedPassword = trimmedPassword || result.temporaryPassword || "password_yang_diisi";
      setPageSuccess(
        `Akun ${trimmedName} (${trimmedUsername}) role ${form.role || "SALES"} berhasil dibuat! Silakan login menggunakan Email/Username: ${trimmedUsername} dan Password: ${usedPassword}`,
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (user: UserItem) => {
    setPageError("");
    setPageSuccess("");

    const newPassword = window.prompt(
      `Masukkan password baru untuk ${user.name || user.username || "user"}:`,
    );

    if (newPassword === null) return;

    if (!newPassword.trim()) {
      setPageError("Password baru wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      setPageError("Password minimal 8 karakter.");
      return;
    }

    setResettingId(user.id);

    try {
      const response = await resetPasswordByRole(user, newPassword.trim());
      const result = getSingleUserResponse(response);

      setPageSuccess(
        result.temporaryPassword
          ? `Password berhasil direset. Temporary password: ${result.temporaryPassword}`
          : "Password berhasil direset.",
      );

      await loadUsers(false);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setResettingId(null);
    }
  };

  const tabItems: { key: UserRole; label: string; total: number }[] = [
    { key: "ADMIN", label: "Admin", total: totalAdmin },
    { key: "SUPERVISOR", label: "Supervisor", total: totalSupervisor },
    { key: "SALES", label: "Sales", total: totalSales },
  ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b-2 border-[#C92C1E] p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>Menu</span>
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-[#C92C1E]">Kelola User</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-gray-900">
              Kelola User
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manajemen akun login internal untuk Admin, Supervisor, dan Sales.
            </p>
          </div>

        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {pageError}
        </div>
      ) : null}

      {pageSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {pageSuccess}
        </div>
      ) : null}

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Total User"
          value={totalUsers}
          description="Seluruh akun login internal CRM."
          tone="accent"
          silhouette="users"
        />
        <QuickInfoCard
          label="User Aktif"
          value={activeUsers}
          description="Akun yang sedang aktif dipakai."
          tone="emerald"
        />
        <QuickInfoCard
          label="User Nonaktif"
          value={inactiveUsers}
          description="Akun yang sedang dinonaktifkan."
          tone="rose"
        />
      </QuickInfoCardGrid>

      <QuickInfoCardGrid columns={3}>
        <QuickInfoCard
          label="Admin"
          value={totalAdmin}
          description="Akses penuh ke seluruh sistem."
          tone="violet"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
        <QuickInfoCard
          label="Supervisor"
          value={totalSupervisor}
          description="Monitoring dan pengawasan sales."
          tone="sky"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
        <QuickInfoCard
          label="Sales"
          value={totalSales}
          description="Akun untuk aktivitas follow up lapangan."
          tone="amber"
          valueClassName="text-[2rem] md:text-[2.15rem]"
        />
      </QuickInfoCardGrid>

      <div className="flex w-max rounded-xl border border-gray-200/50 bg-gray-100 p-1.5 shadow-sm">
        <div className="flex text-sm font-bold">
          {tabItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`rounded-lg px-5 py-2.5 transition-all ${
                activeTab === item.key
                  ? "bg-white text-[#C92C1E] shadow-sm"
                  : "text-gray-500 hover:bg-gray-200/50 hover:text-gray-700"
              }`}
            >
              {item.label}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px]">
                {item.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs">
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Daftar{" "}
              {activeTab === "ADMIN"
                ? "Admin"
                : activeTab === "SUPERVISOR"
                  ? "Supervisor"
                  : "Sales"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Kelola akun berdasarkan role yang dipilih.
            </p>
          </div>
          <div className="flex w-full overflow-x-auto flex-nowrap items-center gap-3 pb-2">
            <button
              type="button"
              onClick={() => openCreateModal(activeTab)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
            >
              + Buat Akun
            </button>

            {selectedUserIds.length > 0 && (
              <>
                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-700">
                  <svg className="h-4 w-4 text-[#C92C1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  {selectedUserIds.length} terpilih
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert("Fitur hapus massal belum tersedia");
                    setSelectedUserIds([]);
                  }}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Pindahkan ke Sampah
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserIds([])}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white h-10 w-10 text-gray-500 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-900"
                  title="Batalkan Pilihan"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="border-b border-gray-50 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={search || ""}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, email, role, atau status..."
                className="block w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-black placeholder-gray-400 outline-none transition focus:border-[#C92C1E] focus:ring-1 focus:ring-[#C92C1E]"
              />
            </div>
            <ColumnVisibilityControl
              tableId="users-table"
              storageKey="column-visibility:kelola-user"
              buttonLabel="Kolom"
            />
          </div>
        </div>

        <div className="relative w-full">
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <table id="users-table" data-column-visibility-manual="true" className="w-full min-w-[980px] text-left text-sm text-gray-600">
            <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-12 px-4 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds(paginatedUsers.map(u => u.id));
                      } else {
                        setSelectedUserIds([]);
                      }
                    }}
                    className="rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                  />
                </th>
                <th className="px-4 py-4 font-bold">User</th>
                <th className="px-4 py-4 font-bold">Email Login</th>
                <th className="px-4 py-4 font-bold">Role</th>
                {activeTab === "SALES" ? (
                  <th className="px-4 py-4 font-bold">Supervisor</th>
                ) : null}
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 text-center font-bold">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={activeTab === "SALES" ? 7 : 6}
                    className="px-6 py-14 text-center text-gray-500"
                  >
                    Memuat data user...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "SALES" ? 7 : 6}
                    className="px-6 py-14 text-center text-gray-500"
                  >
                    Data user tidak ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).closest("button, a, [role='button']")) return;
                      const isSelected = selectedUserIds.includes(user.id);
                      setIsDragging(true);
                      setDragAction(isSelected ? "deselect" : "select");
                      setSelectedUserIds((prev) =>
                        isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                      );
                    }}
                    onMouseEnter={() => {
                      if (isDragging && dragAction) {
                        setSelectedUserIds((prev) => {
                          if (dragAction === "select" && !prev.includes(user.id)) return [...prev, user.id];
                          if (dragAction === "deselect" && prev.includes(user.id)) return prev.filter((id) => id !== user.id);
                          return prev;
                        });
                      }
                    }}
                    className={`transition-colors hover:bg-gray-50 cursor-pointer select-none ${selectedUserIds.includes(user.id) ? "bg-red-50/50" : ""}`}
                  >
                    <td className="w-12 px-4 py-4 text-center align-top">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        readOnly
                        className="pointer-events-none rounded border-gray-300 text-[#C92C1E] focus:ring-[#C92C1E]"
                      />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-black text-gray-900">
                        {user.name || "-"}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        ID #{user.id}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-bold text-gray-800">
                      {user.email || user.username || "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black text-[#C92C1E]">
                        {user.role}
                      </span>
                    </td>

                    {activeTab === "SALES" ? (
                      <td className="px-4 py-4">
                        {user.supervisor_name || "-"}
                      </td>
                    ) : null}

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${
                          user.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            user.status === "ACTIVE"
                              ? "bg-emerald-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {user.status === "ACTIVE" ? "AKTIF" : "NON AKTIF"}
                      </span>
                    </td>

                    <td
                      className="px-4 py-4 text-center"
                    >
                      <RowActionGroup>
                        <ViewActionButton
                          title="Detail User"
                          onClick={() => setSelectedUser(user)}
                        />
                        <EditActionButton
                          title="Edit User"
                          onClick={() => openEditModal(user)}
                        />

                        <RowActionButton
                          icon={KeyRound}
                          tone="password"
                          title={resettingId === user.id ? "Reset..." : "Reset Password"}
                          disabled={resettingId === user.id}
                          onClick={() => void handleResetPassword(user)}
                        />
                      </RowActionGroup>
                    </td>
                  </tr>
                ))
              )}
                </tbody>
              </table>
          {userTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-gray-500">
                  Menampilkan <span className="font-bold text-gray-900">{userTotalItems === 0 ? 0 : (userPage - 1) * userPageSize + 1}</span> hingga{" "}
                  <span className="font-bold text-gray-900">{Math.min(userPage * userPageSize, userTotalItems)}</span> dari{" "}
                  <span className="font-bold text-gray-900">{userTotalItems}</span> data
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Tampilkan</span>
                  <select
                    value={userPageSize}
                    onChange={(e) => {
                      setUserPageSize(Number(e.target.value));
                      setUserPage(1);
                    }}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-[#C92C1E] focus:outline-none"
                  >
                    {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="text-xs font-bold text-gray-700">Halaman {userPage} / {userTotalPages}</span>
                <button
                  onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                  disabled={userPage === userTotalPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      <KelolaUserFormModal
        open={showModal}
        form={form}
        formError={formError}
        temporaryPassword={temporaryPassword}
        saving={saving}
        supervisors={supervisors}
        editingUser={editingUser}
        setForm={setForm}
        onClose={closeFormModal}
        onSubmit={handleCreateUser}
      />

      {selectedUser ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70"
          onClick={() => setSelectedUser(null)}
        >
          <div className="flex min-h-full items-center justify-center p-4 md:p-6">
            <div
              className="app-modal-panel w-full max-w-2xl rounded-[32px] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="app-modal-header px-5 py-4 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C92C1E]">
                      Detail User
                    </p>
                    <h2 className="mt-2 text-lg font-black text-slate-950 md:text-xl">
                      {selectedUser.name || "-"}
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Informasi akun login internal Piposmart.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="app-modal-close rounded-2xl px-4 py-2 text-xs font-black transition"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="app-modal-body grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
                {[
                  ["Nama", selectedUser.name || "-"],
                  [
                    "Email Login",
                    selectedUser.email || selectedUser.username || "-",
                  ],
                  ["Role", selectedUser.role || "-"],
                  [
                    "Status",
                    selectedUser.status === "ACTIVE" ? "AKTIF" : "NON AKTIF",
                  ],
                  ["Supervisor", selectedUser.supervisor_name || "-"],
                  [
                    "Nonaktif Pada",
                    selectedUser.deactivated_at
                      ? String(selectedUser.deactivated_at)
                      : "-",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


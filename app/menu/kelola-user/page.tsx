"use client";

import { useEffect, useMemo, useState } from "react";
import KelolaUserFormModal, {
  type UserFormState,
  type UserItem,
  type UserRole,
  type UserStatus,
} from "./form/page";

const EMPTY_FORM: UserFormState = {
  name: "",
  username: "",
  password: "",
  role: "SALES",
  supervisorId: "",
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
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

function getAccessToken() {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("piposmart_access_token") ||
    localStorage.getItem("piposmart_token") ||
    ""
  );
}

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

  if ("user" in data || "temporary_password" in data) {
    return {
      user: data.user,
      temporaryPassword: data.temporary_password || "",
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
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      json?.error?.message ||
        json?.message ||
        `Request gagal dengan status ${response.status}`,
    );
  }

  return json as T;
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

  const loadUsers = async (showLoading = true) => {
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
  };

  useEffect(() => {
    void loadUsers();

    const interval = window.setInterval(() => {
      void loadUsers(false);
    }, 10000);

    const handleFocus = () => {
      void loadUsers(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

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
          supervisor_name: updatedUser.supervisor_name,
        });

        patchUserInState(updatedUser);

        closeFormModal();
        setPageSuccess("Data user berhasil diperbarui.");
        return;
      }

      await loadUsers(false);

      if (!result.temporaryPassword) {
        closeFormModal();
        setPageSuccess("User berhasil dibuat.");
      }
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

          <button
            type="button"
            onClick={() => openCreateModal(activeTab)}
            className="rounded-xl bg-[#C92C1E] px-4 py-2 text-sm font-bold text-white shadow-sm shadow-red-200 transition-all hover:bg-red-700"
          >
            + Buat Akun
          </button>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C92C1E] to-[#A82216] p-5 text-white shadow-lg">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-red-100">
            Total User
          </p>
          <h2 className="text-3xl font-black">{totalUsers}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            User Aktif
          </p>
          <h2 className="text-3xl font-black text-gray-900">{activeUsers}</h2>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition-colors hover:border-[#C92C1E]">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            User Nonaktif
          </p>
          <h2 className="text-3xl font-black text-gray-900">{inactiveUsers}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Admin
          </p>
          <h2 className="text-2xl font-black text-gray-900">{totalAdmin}</h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Akses penuh ke sistem.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Supervisor
          </p>
          <h2 className="text-2xl font-black text-gray-900">
            {totalSupervisor}
          </h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Monitoring dan pengawasan sales.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Sales
          </p>
          <h2 className="text-2xl font-black text-gray-900">{totalSales}</h2>
          <p className="mt-1 text-xs font-medium text-gray-400">
            Akun untuk follow up dan aktivitas sales.
          </p>
        </div>
      </div>

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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-4">
          <div>
            <p className="text-sm font-black text-gray-900">
              Daftar{" "}
              {activeTab === "ADMIN"
                ? "Admin"
                : activeTab === "SUPERVISOR"
                  ? "Supervisor"
                  : "Sales"}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Kelola akun berdasarkan role yang dipilih.
            </p>
          </div>

          <input
            value={search || ""}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama, email, role, atau status"
            className="min-w-[240px] rounded-lg border border-gray-200 bg-[#FAFAFA] px-3 py-2 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:border-[#C92C1E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm text-gray-600">
            <thead className="border-y border-gray-200 bg-[#f9fafb] text-xs font-black uppercase tracking-wider text-gray-500">
              <tr>
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
                    colSpan={activeTab === "SALES" ? 6 : 5}
                    className="px-6 py-14 text-center text-gray-500"
                  >
                    Memuat data user...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "SALES" ? 6 : 5}
                    className="px-6 py-14 text-center text-gray-500"
                  >
                    Belum ada data {activeTab.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={`${user.role}-${user.id}`}
                    onClick={() => setSelectedUser(user)}
                    className="cursor-pointer transition-colors hover:bg-red-50/40"
                    title="Klik untuk lihat detail user"
                  >
                    <td className="px-4 py-4">
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

                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(user);
                          }}
                          className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 transition-colors hover:bg-orange-100"
                          title="Edit User"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={resettingId === user.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleResetPassword(user);
                          }}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Reset Password"
                        >
                          {resettingId === user.id ? "Reset..." : "Reset"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff_0%,#fff8f5_55%,#fee2e2_100%)] px-5 py-4 md:px-6">
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
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 md:p-6">
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
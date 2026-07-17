"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserRole = "Developer" | "Supervisor" | "Sales";

type DummyUser = {
  name: string;
  username: string;
  password: string;
  role: UserRole;
};

const DUMMY_USERS: DummyUser[] = [
  {
    name: "Satria",
    username: "satria",
    password: "satria123",
    role: "Developer",
  },
  {
    name: "Achul",
    username: "achul",
    password: "achul123",
    role: "Developer",
  },
  {
    name: "Wati",
    username: "wati",
    password: "wati123",
    role: "Supervisor",
  },
  {
    name: "Lidya",
    username: "lidya",
    password: "lidya123",
    role: "Sales",
  },
  {
    name: "Rangga",
    username: "rangga",
    password: "rangga123",
    role: "Sales",
  },
  {
    name: "Maya",
    username: "maya",
    password: "maya123",
    role: "Sales",
  },
  {
    name: "Arabella",
    username: "arabella",
    password: "arabella123",
    role: "Sales",
  },
];

const getRoleClass = (role: UserRole) => {
  if (role === "Developer") return "border-red-100 bg-red-50 text-[#C92C1E]";
  if (role === "Supervisor") return "border-amber-100 bg-amber-50 text-amber-700";
  return "border-gray-100 bg-gray-50 text-gray-500";
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("satria");
  const [password, setPassword] = useState("satria123");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selectedUser = useMemo(
    () => DUMMY_USERS.find((user) => user.username === username),
    [username],
  );

  const handleQuickLogin = (user: DummyUser) => {
    setUsername(user.username);
    setPassword(user.password);
    setErrorMessage("");
  };

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    const user = DUMMY_USERS.find(
      (item) =>
        item.username.toLowerCase() === username.toLowerCase().trim() &&
        item.password === password,
    );

    if (!user) {
      setErrorMessage("Username atau password tidak sesuai.");
      return;
    }

    localStorage.setItem("piposmart_is_logged_in", "true");
    localStorage.setItem("piposmart_user_name", user.name);
    localStorage.setItem("piposmart_user_role", user.role);
    localStorage.setItem("piposmart_user_username", user.username);
    localStorage.setItem(
      "piposmart_user",
      JSON.stringify({
        name: user.name,
        username: user.username,
        role: user.role,
      }),
    );

    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-[#F6F7F9] px-4 py-8 font-sans text-[#1C1C1E]">
      <div className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden rounded-[32px] border border-red-100 bg-white p-8 shadow-sm lg:block">
          <div className="inline-flex rounded-full border border-red-100 bg-red-50 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-[#C92C1E]">
            CRM PIPOSMART
          </div>

          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight text-gray-950">
            Login Workspace Data Kelolaan Nasabah
          </h1>

          <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-gray-500">
            Masuk menggunakan akun dummy yang sudah tersedia. Role Developer
            untuk Satria dan Achul, Supervisor untuk Wati, dan akun lainnya sebagai Sales.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-red-100 bg-red-50/50 p-5">
              <p className="text-xs font-black uppercase text-[#C92C1E]">
                Developer
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Satria dan Achul
              </p>
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
              <p className="text-xs font-black uppercase text-amber-700">
                Supervisor
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Wati
              </p>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-xs font-black uppercase text-gray-500">
                Sales
              </p>
              <p className="mt-2 text-sm font-bold text-gray-700">
                Lidya, Rangga, Maya, Arabella
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#C92C1E]">
              Login Akun
            </p>
            <h2 className="mt-2 text-2xl font-black text-gray-950">
              Masuk ke CRM
            </h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Pilih akun dummy atau isi username dan password manual.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Username
              </label>
              <input
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Contoh: satria"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-800 outline-none transition focus:border-[#C92C1E]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="flex overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-[#C92C1E]">
                <input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrorMessage("");
                  }}
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  className="min-w-0 flex-1 px-4 py-3 text-sm font-bold text-gray-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="border-l border-gray-100 px-4 text-xs font-black text-gray-500 hover:bg-gray-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {selectedUser && (
              <div className={`rounded-2xl border px-4 py-3 ${getRoleClass(selectedUser.role)}`}>
                <p className="text-[10px] font-black uppercase">
                  Login sebagai
                </p>
                <p className="mt-1 text-sm font-black">
                  {selectedUser.name} — {selectedUser.role}
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#C92C1E] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#A82216]"
            >
              Login Sekarang
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Quick Login Dummy
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DUMMY_USERS.map((user) => (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => handleQuickLogin(user)}
                  className={`rounded-2xl border px-4 py-3 text-left transition hover:bg-gray-50 ${
                    username === user.username
                      ? "border-[#C92C1E] bg-red-50"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <p className="text-xs font-black text-gray-900">{user.name}</p>
                  <p
                    className={`mt-0.5 text-[10px] font-black uppercase ${
                      user.role === "Developer"
                        ? "text-[#C92C1E]"
                        : user.role === "Supervisor"
                          ? "text-amber-700"
                          : "text-gray-400"
                    }`}
                  >
                    {user.role}
                  </p>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[11px] font-medium text-gray-400">
              Format password dummy: username + 123. Contoh: satria123.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
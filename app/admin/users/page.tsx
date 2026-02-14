"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

type UserItem = {
  id: number;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
  roles?: string[];
};

const ALL_ROLES = ["ADMIN", "EXPERT", "SUPPORT", "CARE_GIVER", "USER"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [form, setForm] = useState({
    phone: "",
    password: "",
    firstName: "",
    lastName: "",
    roles: [] as string[],
  });

  const [filters, setFilters] = useState({
    phone: "",
    name: "",
    roles: "",
    status: "",
  });
  const [sort, setSort] = useState<{ key: keyof UserItem | "name" | "roles"; dir: "asc" | "desc" }>({
    key: "phone",
    dir: "asc",
  });

  const loadUsers = async () => {
    const res = await fetch("/api/users");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleRole = (role: string) => {
    setForm((prev) => {
      if (prev.roles.includes(role)) {
        return { ...prev, roles: prev.roles.filter((r) => r !== role) };
      }
      return { ...prev, roles: [...prev.roles, role] };
    });
  };

  const createUser = async () => {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ phone: "", password: "", firstName: "", lastName: "", roles: [] });
    loadUsers();
  };

  const filteredUsers = useMemo(() => {
    const normalize = (val?: string | null) => (val ?? "").toString().toLowerCase().trim();
    return users.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      const roles = (u.roles ?? []).join(",");
      return (
        normalize(u.phone).includes(normalize(filters.phone)) &&
        normalize(name).includes(normalize(filters.name)) &&
        normalize(roles).includes(normalize(filters.roles)) &&
        normalize(u.status ?? "").includes(normalize(filters.status))
      );
    });
  }, [users, filters]);

  const sortedUsers = useMemo(() => {
    const sorted = [...filteredUsers];
    sorted.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      let aVal = "";
      let bVal = "";
      if (sort.key === "name") {
        aVal = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim();
        bVal = `${b.firstName ?? ""} ${b.lastName ?? ""}`.trim();
      } else if (sort.key === "roles") {
        aVal = (a.roles ?? []).join(",");
        bVal = (b.roles ?? []).join(",");
      } else {
        aVal = (a[sort.key] ?? "").toString();
        bVal = (b[sort.key] ?? "").toString();
      }
      return aVal.localeCompare(bVal, "fa") * dir;
    });
    return sorted;
  }, [filteredUsers, sort]);

  const toggleSort = (key: keyof UserItem | "name" | "roles") => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold text-primary">مدیریت کاربران</h1>
        <span className="absolute right-0" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">ساخت کاربر جدید</div>
        <input
          type="text"
          placeholder="شماره موبایل"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="password"
          placeholder="رمز عبور"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="نام"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="نام خانوادگی"
          value={form.lastName}
          onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {ALL_ROLES.map((role) => (
            <label key={role} className="text-xs text-textSub flex items-center gap-1">
              <input
                type="checkbox"
                checked={form.roles.includes(role)}
                onChange={() => toggleRole(role)}
              />
              {role}
            </label>
          ))}
        </div>
        <button onClick={createUser} className="bg-primary text-white rounded-lg py-2 text-sm">
          ایجاد
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">لیست کاربران</div>
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-gray-50 text-textSub">
              <tr>
                <th className="text-right p-2 cursor-pointer" onClick={() => toggleSort("phone")}>
                  موبایل
                </th>
                <th className="text-right p-2 cursor-pointer" onClick={() => toggleSort("name")}>
                  نام
                </th>
                <th className="text-right p-2 cursor-pointer" onClick={() => toggleSort("roles")}>
                  نقش
                </th>
                <th className="text-right p-2 cursor-pointer" onClick={() => toggleSort("status")}>
                  وضعیت
                </th>
              </tr>
              <tr>
                <th className="p-2">
                  <input
                    value={filters.phone}
                    onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-md p-1 text-xs"
                    placeholder="فیلتر"
                  />
                </th>
                <th className="p-2">
                  <input
                    value={filters.name}
                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-md p-1 text-xs"
                    placeholder="فیلتر"
                  />
                </th>
                <th className="p-2">
                  <input
                    value={filters.roles}
                    onChange={(e) => setFilters({ ...filters, roles: e.target.value })}
                    className="w-full border border-gray-200 rounded-md p-1 text-xs"
                    placeholder="فیلتر"
                  />
                </th>
                <th className="p-2">
                  <input
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-md p-1 text-xs"
                    placeholder="فیلتر"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="p-2">{u.phone}</td>
                  <td className="p-2">
                    {u.firstName ?? ""} {u.lastName ?? ""}
                  </td>
                  <td className="p-2">{u.roles?.join(", ")}</td>
                  <td className="p-2">{u.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

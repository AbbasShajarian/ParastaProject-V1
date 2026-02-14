"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

type PatientItem = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  nationalCode?: string | null;
  verificationStatus?: string | null;
};

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
  });

  const refreshPatients = async () => {
    const res = await fetch("/api/patients?all=true", { cache: "no-store" });
    if (res.status === 401) {
      router.push("/login");
      return;
    }

    if (res.status === 403) {
      const fallback = await fetch("/api/patients", { cache: "no-store" });
      if (fallback.ok) {
        const data = await fallback.json();
        setPatients(data);
      }
      return;
    }

    if (!res.ok) return;
    const data = await res.json();
    setPatients(data);
  };

  useEffect(() => {
    const load = async () => {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRoles((session?.user?.roles as string[]) ?? []);
      }

      await refreshPatients();
    };

    load();
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshPatients();
    }, 30000);
    const handleVisibility = () => {
      if (!document.hidden) refreshPatients();
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const isStaff = roles.includes("ADMIN") || roles.includes("EXPERT") || roles.includes("SUPPORT");

  const createPatient = async () => {
    if (!newPatient.nationalCode) {
      alert("کد ملی الزامی است");
      return;
    }

    setCreating(true);
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nationalCode: newPatient.nationalCode,
        firstName: newPatient.firstName || undefined,
        lastName: newPatient.lastName || undefined,
      }),
    });
    setCreating(false);

    if (!res.ok) {
      alert("ثبت بیمار ناموفق بود");
      return;
    }

    const created = await res.json();
    setNewPatient({ firstName: "", lastName: "", nationalCode: "" });
    setPatients((prev) => [created, ...prev]);
    router.push(`/patients/${created.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold text-primary">بیماران</h1>
        <span className="absolute right-0 text-sm text-textSub">{patients.length} مورد</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 mb-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">افزودن بیمار جدید</div>
        <input
          type="text"
          placeholder="نام"
          value={newPatient.firstName}
          onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="نام خانوادگی"
          value={newPatient.lastName}
          onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="کد ملی"
          value={newPatient.nationalCode}
          onChange={(e) => setNewPatient({ ...newPatient, nationalCode: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <button
          onClick={createPatient}
          disabled={creating}
          className="bg-primary text-white rounded-lg py-2 text-sm disabled:opacity-60"
        >
          ثبت بیمار
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {patients.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-1"
          >
            <div className="text-sm font-medium">
              {p.fullName
                ? p.fullName
                : p.firstName || p.lastName
                ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
                : "بدون نام"}
            </div>
            <div className="text-xs text-textSub">کد ملی: {p.nationalCode ?? "-"}</div>
            {isStaff && (
              <div className="text-xs text-textSub">وضعیت تایید: {p.verificationStatus ?? "-"}</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

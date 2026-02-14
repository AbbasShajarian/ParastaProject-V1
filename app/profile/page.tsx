"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: "",
    nationalCode: "",
    firstName: "",
    lastName: "",
    password: "",
    passwordConfirm: "",
  });

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/profile");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        phone: data?.phone ?? "",
        nationalCode: data?.nationalCode ?? "",
        firstName: data?.firstName ?? "",
        lastName: data?.lastName ?? "",
      }));
      setLoading(false);
    };

    load();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (form.password && form.password !== form.passwordConfirm) {
      alert("رمز عبور و تکرار آن برابر نیست");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nationalCode: form.nationalCode,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password || undefined,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      alert("ذخیره اطلاعات ناموفق بود");
      return;
    }

    alert("اطلاعات شما ذخیره شد");
    setForm((prev) => ({ ...prev, password: "", passwordConfirm: "" }));
  };

  if (loading) {
    return <div className="p-6">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold text-primary">پروفایل</h1>
        <span />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
        <div className="text-sm text-textSub">
          تکمیل اطلاعات اختیاری است و بعداً هم می‌توانید ویرایش کنید.
        </div>

        <label className="text-textSub text-sm">شماره موبایل</label>
        <input
          value={form.phone}
          readOnly
          className="border border-gray-200 rounded-lg p-3 text-sm bg-gray-50"
        />

        <label className="text-textSub text-sm">کد ملی</label>
        <input
          type="text"
          name="nationalCode"
          value={form.nationalCode}
          onChange={handleChange}
          placeholder="کد ملی"
          className="border border-gray-300 rounded-lg p-3 text-sm bg-bgcolor"
        />

        <label className="text-textSub text-sm">نام</label>
        <input
          type="text"
          name="firstName"
          value={form.firstName}
          onChange={handleChange}
          placeholder="نام"
          className="border border-gray-300 rounded-lg p-3 text-sm bg-bgcolor"
        />

        <label className="text-textSub text-sm">نام خانوادگی</label>
        <input
          type="text"
          name="lastName"
          value={form.lastName}
          onChange={handleChange}
          placeholder="نام خانوادگی"
          className="border border-gray-300 rounded-lg p-3 text-sm bg-bgcolor"
        />

        <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
          <div className="text-sm text-textSub">تنظیم رمز عبور (اختیاری)</div>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="رمز عبور جدید"
            className="border border-gray-300 rounded-lg p-3 text-sm bg-bgcolor"
          />
          <input
            type="password"
            name="passwordConfirm"
            value={form.passwordConfirm}
            onChange={handleChange}
            placeholder="تکرار رمز عبور"
            className="border border-gray-300 rounded-lg p-3 text-sm bg-bgcolor"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition disabled:opacity-60"
        >
          ذخیره اطلاعات
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export const dynamic = "force-dynamic";

const roleHome = (roles: string[]) => {
    if (roles.includes("ADMIN")) return "/admin/users";
    if (roles.includes("EXPERT")) return "/requests";
    if (roles.includes("SUPPORT")) return "/requests";
    if (roles.includes("CARE_GIVER")) return "/requests";
    return "/dashboard";
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form, setForm] = useState({ phone: "", password: "", otp: "" });
    const [method, setMethod] = useState<"password" | "otp">("otp");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSendOtp = async () => {
        if (!form.phone) {
            alert("شماره موبایل را وارد کنید");
            return;
        }

        const res = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: form.phone, purpose: "login" }),
        });

        if (res.status === 404) {
            alert("این شماره ثبت نشده است. به صفحه ثبت‌نام منتقل می‌شوید.");
            router.push("/register");
            return;
        }

        if (!res.ok) {
            alert("خطا در ارسال کد");
            return;
        }

        const data = await res.json();
        if (data?.devCode) {
            alert(`کد موقت (فقط توسعه): ${data.devCode}`);
        } else {
            alert("کد ارسال شد");
        }
    };

    const handleSubmit = async () => {
        const check = await fetch("/api/auth/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: form.phone }),
        });

        if (check.ok) {
            const data = await check.json();
            if (!data?.exists) {
                alert("این شماره ثبت نشده است. به صفحه ثبت‌نام منتقل می‌شوید.");
                router.push("/register");
                return;
            }
        }

        const res = await signIn("credentials", {
            redirect: false,
            phone: form.phone,
            password: form.password,
            otp: form.otp,
            method,
        });

        if (res?.ok) {
            const callbackUrl = searchParams.get("callbackUrl");
            router.push(callbackUrl || "/");
            return;
        }

        alert("ورود ناموفق بود");
    };

    return (
        <div className="flex flex-col min-h-screen px-4 py-6 justify-center">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">
                ورود
            </h1>

            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setMethod("password")}
                        className={`flex-1 py-2 rounded-xl border ${
                            method === "password" ? "bg-primary text-white border-primary" : "border-gray-300"
                        }`}
                    >
                        رمز عبور
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod("otp")}
                        className={`flex-1 py-2 rounded-xl border ${
                            method === "otp" ? "bg-primary text-white border-primary" : "border-gray-300"
                        }`}
                    >
                        کد یکبار مصرف
                    </button>
                </div>

                <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="شماره موبایل"
                    className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                />
                {method === "password" ? (
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="رمز عبور"
                        className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                    />
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            name="otp"
                            value={form.otp}
                            onChange={handleChange}
                            placeholder="کد یکبار مصرف"
                            className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                        />
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            className="px-3 rounded-lg border border-primary text-primary"
                        >
                            ارسال کد
                        </button>
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    className="bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition"
                >
                    ورود
                </button>

                <p className="text-center text-textSub text-sm">
                    حساب ندارید؟{" "}
                    <a href="/register" className="text-primary font-medium">
                        ثبت‌نام
                    </a>
                </p>
            </div>
        </div>
    );
}

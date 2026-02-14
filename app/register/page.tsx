"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [form, setForm] = useState({ phone: "", nationalCode: "", otp: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSendOtp = async () => {
        if (!form.phone || !form.nationalCode) {
            alert("شماره موبایل و کد ملی لازم است");
            return;
        }

        setLoading(true);
        const res = await fetch("/api/auth/otp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: form.phone, purpose: "register" }),
        });
        setLoading(false);

        if (res.status === 409) {
            alert("این شماره قبلاً ثبت شده است. به صفحه ورود منتقل می‌شوید.");
            router.push("/login");
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
            alert("کد تایید ارسال شد");
        }
        setStep("otp");
    };

    const handleRegister = async () => {
        if (!form.otp) {
            alert("کد تایید را وارد کنید");
            return;
        }

        setLoading(true);
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: form.phone,
                nationalCode: form.nationalCode,
                otp: form.otp,
            }),
        });
        setLoading(false);

        if (res.status === 409) {
            alert("این شماره قبلاً ثبت شده است. به صفحه ورود منتقل می‌شوید.");
            router.push("/login");
            return;
        }

        if (!res.ok) {
            alert("ثبت‌نام ناموفق بود");
            return;
        }

        const login = await signIn("credentials", {
            redirect: false,
            phone: form.phone,
            otp: form.otp,
            method: "otp",
        });

        if (login?.ok) {
            router.push("/profile");
            return;
        }

        router.push("/login");
    };

    return (
        <div className="flex flex-col min-h-screen px-4 py-6 justify-center">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">ثبت‌نام</h1>

            <div className="flex flex-col gap-4">
                <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="شماره موبایل"
                    className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                />
                <input
                    type="text"
                    name="nationalCode"
                    value={form.nationalCode}
                    onChange={handleChange}
                    placeholder="کد ملی"
                    className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                />

                {step === "otp" && (
                    <input
                        type="text"
                        name="otp"
                        value={form.otp}
                        onChange={handleChange}
                        placeholder="کد تایید"
                        className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary bg-bgcolor"
                    />
                )}

                {step === "phone" ? (
                    <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition disabled:opacity-60"
                    >
                        ارسال کد تایید
                    </button>
                ) : (
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition disabled:opacity-60"
                    >
                        تکمیل ثبت‌نام
                    </button>
                )}

                <p className="text-center text-textSub text-sm">
                    حساب دارید؟{" "}
                    <a href="/login" className="text-primary font-medium">
                        ورود
                    </a>
                </p>
            </div>
        </div>
    );
}

"use client";
// بلا استفاده

import { useState } from "react";
import { FiMenu, FiX, FiLogIn, FiUserPlus, FiGrid } from "react-icons/fi";

export default function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="w-full flex justify-between items-center p-4 bg-bgcolor shadow-md fixed top-0 z-50">
            <h1 className="text-lg font-bold text-primary">نرسا</h1>

            {/* دکمه همبرگر برای موبایل */}
            <button
                className="md:hidden p-2 text-primary"
                onClick={() => setOpen(true)}
            >
                <FiMenu size={24} />
            </button>

            {/* لینک‌ها برای دسکتاپ */}
            <div className="hidden md:flex gap-4">
                <a href="/login" className="text-textSub hover:text-primary transition flex items-center gap-1">
                    <FiLogIn /> ورود
                </a>
                <a href="/register" className="text-textSub hover:text-primary transition flex items-center gap-1">
                    <FiUserPlus /> ثبت‌نام
                </a>
                <a href="/dashboard" className="text-textSub hover:text-primary transition flex items-center gap-1">
                    <FiGrid /> داشبورد
                </a>
            </div>

            {/* Full-screen overlay موبایل */}
            <div
                className={`fixed inset-0 bg-white z-50 flex flex-col p-6
              transition-all duration-300 ease-out
              ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"}`}
            >
                {/* دکمه بستن */}
                <div className="flex justify-end mb-8">
                    <button
                        onClick={() => setOpen(false)}
                        className="p-2 text-primary"
                    >
                        <FiX size={28} />
                    </button>
                </div>

                {/* لینک‌ها با آیکن و divider */}
                <div className="flex flex-col">
                    <a
                        href="/login"
                        className="flex items-center gap-3 py-4 text-primary font-semibold"
                        onClick={() => setOpen(false)}
                    >
                        <FiLogIn size={24} /> ورود
                    </a>
                    <div className="h-[1px] bg-gray-200 w-full"></div>

                    <a
                        href="/register"
                        className="flex items-center gap-3 py-4 text-primary font-semibold"
                        onClick={() => setOpen(false)}
                    >
                        <FiUserPlus size={24} /> ثبت‌نام
                    </a>
                    <div className="h-[1px] bg-gray-200 w-full"></div>

                    <a
                        href="/dashboard"
                        className="flex items-center gap-3 py-4 text-primary font-semibold"
                        onClick={() => setOpen(false)}
                    >
                        <FiGrid size={24} /> داشبورد
                    </a>
                </div>
            </div>
        </nav>
    );
}

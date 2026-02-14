"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    FiHome,
    FiMessageCircle,
    FiUser,
    FiSettings,
    FiLogOut,
    FiLogIn,
    FiUserPlus,
    FiUsers,
    FiClipboard,
    FiBriefcase,
} from "react-icons/fi";

type SidebarItem = {
    label: string;
    path?: string;
    action?: "logout";
    icon?: React.ReactNode;
};

export default function BottomNav() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);
    const [isAuthed, setIsAuthed] = useState(false);

    const loadSession = async () => {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const session = await res.json();
        if (session?.user?.id) {
            setIsAuthed(true);
            setRoles((session?.user?.roles as string[]) ?? []);
        } else {
            setIsAuthed(false);
            setRoles([]);
        }
    };

    useEffect(() => {
        loadSession();
    }, []);

    useEffect(() => {
        if (open) {
            loadSession();
        }
    }, [open]);

    const sidebarItems = useMemo(() => {
        const items: SidebarItem[] = [];

        const pushUnique = (item: SidebarItem) => {
            if (item.path && items.some((i) => i.path === item.path)) return;
            items.push(item);
        };

        if (!isAuthed) {
            pushUnique({ label: "ورود", path: "/login", icon: <FiLogIn /> });
            pushUnique({ label: "ثبت‌نام", path: "/register", icon: <FiUserPlus /> });
            return items;
        }

        if (roles.includes("ADMIN")) {
            pushUnique({ label: "مدیریت کاربران", path: "/admin/users", icon: <FiUsers /> });
            pushUnique({ label: "مدیریت خدمات", path: "/admin/services", icon: <FiBriefcase /> });
        }

        if (roles.some((r) => ["ADMIN", "EXPERT", "SUPPORT", "CARE_GIVER"].includes(r))) {
            pushUnique({ label: "درخواست‌ها", path: "/requests", icon: <FiClipboard /> });
            pushUnique({ label: "بیماران", path: "/patients", icon: <FiUsers /> });
        }

        if (roles.includes("USER")) {
            pushUnique({ label: "پروفایل", path: "/profile", icon: <FiUser /> });
            pushUnique({ label: "ثبت درخواست", path: "/request", icon: <FiClipboard /> });
            pushUnique({ label: "بیماران من", path: "/patients", icon: <FiUsers /> });
            pushUnique({ label: "تاریخچه", path: "/dashboard", icon: <FiUser /> });
        }

        items.push({ label: "خروج", action: "logout", icon: <FiLogOut /> });
        return items;
    }, [isAuthed, roles]);

    const navItems = [
        { icon: <FiHome />, label: "خانه", path: "/" },
        { icon: <FiMessageCircle />, label: "ارتباط با ما", path: "/support" },

        { icon: <FiSettings />, label: "تنظیمات", path: "/settings" },
        { icon: <FiUser />, label: "حساب کاربری", action: "sidebar" },
    ];

    const handleSidebarItem = (item: SidebarItem) => {
        if (item.action === "logout") {
            signOut({ callbackUrl: "/login" });
            return;
        }
        if (item.path) {
            router.push(item.path);
        }
        setOpen(false);
    };

    return (
        <>
            <div className="hidden md:flex fixed top-0 left-0 right-0 bg-bgcolor border-b border-gray-200 h-16 z-40 shadow-sm">
                <div className="w-full max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <div className="text-lg font-bold text-primary">نرسا</div>
                    <div className="flex items-center gap-6">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => {
                                    if (item.action === "sidebar") {
                                        setOpen(true);
                                    } else if (item.path) {
                                        router.push(item.path);
                                    }
                                }}
                                className="flex items-center gap-2 text-gray-600 hover:text-primary transition text-sm"
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-bgcolor border-t border-gray-200 flex justify-around items-center h-16 z-50 shadow-inner md:hidden">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => {
                            if (item.action === "sidebar") {
                                setOpen(true);
                            } else if (item.path) {
                                router.push(item.path);
                            }
                        }}
                        className="flex flex-col items-center justify-center text-gray-600 hover:text-primary transition"
                    >
                        {item.icon}
                        <span className="text-xs">{item.label}</span>
                    </button>
                ))}
            </div>

            <div
                className={`fixed inset-0 bg-black/40 transition-opacity duration-200 z-50 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={() => setOpen(false)}
            />

            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="font-semibold text-primary">حساب کاربری</div>
                    <button
                        onClick={() => setOpen(false)}
                        className="text-sm text-textSub"
                    >
                        بستن
                    </button>
                </div>

                <div className="flex flex-col">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => handleSidebarItem(item)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-textMain hover:bg-gray-50"
                        >
                            <span className="text-primary">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            </aside>
        </>
    );
}

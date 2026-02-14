"use client";
// فعلا بلا استفاده
import { useState, useEffect, useRef } from "react";
import { FiPhone, FiMessageCircle } from "react-icons/fi";

export default function FloatingSupport() {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    return (

        <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

            {/* Overlay مات‌کننده کل صفحه — زیر منو */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
                />
            )}

            {/* منوی گزینه‌ها — بالای overlay */}
            <div
                className={`flex flex-col gap-3 absolute bottom-16 right-0 z-50
                transition-all duration-300 ease-out
                ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"}`}
            >
                <a
                    href="tel:09000000000"
                    className="flex items-center gap-2 bg-primary/80 text-white px-4 py-2 rounded-2xl shadow-md text-sm active:scale-95 transition"
                >
                    <FiPhone /> تماس تلفنی
                </a>
                <a
                    href="https://wa.me/09000000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-primary/80 text-white px-4 py-2 rounded-2xl shadow-md text-sm active:scale-95 transition"
                >
                    <FiMessageCircle /> چت واتساپ
                </a>
            </div>

            {/* دکمه اصلی FloatingSupport — بالاتر از همه */}
            <button
                onClick={() => setOpen(!open)}
                className="bg-primary/30 backdrop-blur-sm text-white p-4 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition z-50"
                title="پشتیبانی فوری"
            >
                <FiMessageCircle size={24} />
            </button>
        </div>


    );
}

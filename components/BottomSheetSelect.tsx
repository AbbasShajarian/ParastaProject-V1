"use client";

import { useEffect, useRef, useState } from "react";

type Option = {
    value: string;
    label: string;
};

type BottomSheetSelectProps = {
    label: string;
    placeholder?: string;
    value?: string;
    displayValue?: string;
    options: Option[];
    onSelect: (option: Option) => void;
    searchEnabled?: boolean; // ← اضافه شد

};

export default function BottomSheetSelect({
    label,
    placeholder = "انتخاب کنید",
    value,
    displayValue,
    options,
    onSelect,
    searchEnabled = false,
}: BottomSheetSelectProps) {

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const filteredOptions = searchEnabled ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
        : options;


    return (
        <div className="flex flex-col gap-1">
            {/* Label */}
            <label className="text-textSub text-sm">{label}</label>

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full p-3 border border-gray-300 rounded-xl bg-bgcolor flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-primary"
            >
                <span className={value ? "text-textMain" : "text-gray-400"}>
                    {value ? displayValue : placeholder}
                </span>
                <span className="text-gray-400">▾</span>
            </button>

            {/* Overlay */}
            <div
                onClick={() => setOpen(false)}
                className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300
        ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            />

            {/* Bottom Sheet */}
            <div
                className={`fixed left-0 right-0 bottom-0 z-50 bg-bgcolor rounded-t-2xl p-4 pb-20 md:pb-6 shadow-lg
        transition-transform duration-300 ease-out
        ${open ? "translate-y-0" : "translate-y-full"}`}
            >
                <div className="flex flex-col gap-2">
                    <p className="text-center font-medium text-textMain mb-2">
                        {label}
                    </p>
                    {searchEnabled && (
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="جستجو..."
                            className="w-full p-3 mb-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    )}


                    {filteredOptions.map((option, idx) => (
                        <div key={option.value}>
                            <button
                                onClick={() => {
                                    onSelect(option);
                                    setOpen(false);
                                    setSearchQuery("");
                                }}
                                className="w-full text-right p-3 rounded-xl hover:bg-primary/10 transition text-textMain flex justify-between items-center"
                            >
                                {option.label}
                            </button>
                            {/* خط جداکننده بین گزینه‌ها */}
                            {idx !== filteredOptions.length - 1 && (
                                <hr className="border-t border-gray-200 my-1" />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RequestItem = {
    id: number;
    status?: string | null;
    supportType?: string | null;
    city?: string | null;
    time?: string | null;
    notes?: string | null;
    serviceItem?: { title: string } | null;
    patient?: { firstName?: string | null; lastName?: string | null; nationalCode?: string | null } | null;
};

export default function DashboardPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [serviceItems, setServiceItems] = useState<{ id: number; title: string }[]>([]);
    const [supportEdits, setSupportEdits] = useState<Record<number, {
        serviceItemId?: string;
        city?: string;
        time?: string;
        notes?: string;
    }>>({});
    const [loadingId, setLoadingId] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            const sessionRes = await fetch("/api/auth/session");
            if (sessionRes.ok) {
                const session = await sessionRes.json();
                const sessionRoles = (session?.user?.roles as string[]) ?? [];
                setRoles(sessionRoles);
            }

            const res = await fetch("/api/requests");
            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (!res.ok) return;

            const data = await res.json();
            setRequests(data);
        };

        load();
    }, [router]);

    useEffect(() => {
        const isSupport = roles.includes("SUPPORT") || roles.includes("ADMIN");
        if (!isSupport) return;

        const loadItems = async () => {
            const res = await fetch("/api/services/items");
            if (!res.ok) return;
            const data = await res.json();
            setServiceItems(data);
        };

        loadItems();
    }, [roles]);

    const refreshRequests = async () => {
        const res = await fetch("/api/requests");
        if (res.ok) {
            const data = await res.json();
            setRequests(data);
        }
    };

    const setEdit = (id: number, field: string, value: string) => {
        setSupportEdits((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleSupportCancel = async (id: number, approve: boolean) => {
        setLoadingId(id);
        await fetch(`/api/requests/${id}/support/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approve }),
        });
        setLoadingId(null);
        refreshRequests();
    };

    const handleSupportChange = async (id: number, approve: boolean) => {
        setLoadingId(id);
        const edit = supportEdits[id] ?? {};
        await fetch(`/api/requests/${id}/support/change`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                approve,
                serviceItemId: edit.serviceItemId ? Number(edit.serviceItemId) : undefined,
                city: edit.city,
                time: edit.time,
                notes: edit.notes,
            }),
        });
        setLoadingId(null);
        refreshRequests();
    };

    const isSupport = roles.includes("SUPPORT") || roles.includes("ADMIN");

    return (
        <div className="flex flex-col min-h-screen px-4 py-6">
            <h1 className="text-2xl font-bold text-primary mb-6 text-center">
                داشبورد شما
            </h1>

            <div className="flex flex-col gap-4">
                {requests.map((r) => (
                    <div
                        key={r.id}
                        className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2"
                    >
                        <div className="flex justify-between items-center">
                            <span>{r.serviceItem?.title ?? "بدون عنوان"}</span>
                            <span className="text-textSub text-sm">{r.status ?? "نامشخص"}</span>
                        </div>
                        <div className="text-xs text-textSub">
                            {r.patient?.firstName || r.patient?.lastName
                                ? `${r.patient?.firstName ?? ""} ${r.patient?.lastName ?? ""}`.trim()
                                : r.patient?.nationalCode ?? ""}
                        </div>

                        {isSupport && r.supportType && (
                            <div className="mt-2 rounded-lg border border-dashed border-gray-200 p-3 bg-gray-50">
                                <div className="text-xs text-textSub mb-2">
                                    درخواست پشتیبانی: {r.supportType}
                                </div>

                                {r.supportType === "CHANGE" && (
                                    <div className="flex flex-col gap-2">
                                        <select
                                            value={supportEdits[r.id]?.serviceItemId ?? ""}
                                            onChange={(e) => setEdit(r.id, "serviceItemId", e.target.value)}
                                            className="border border-gray-300 rounded-lg p-2 text-sm"
                                        >
                                            <option value="">انتخاب خدمت</option>
                                            {serviceItems.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.title}
                                                </option>
                                            ))}
                                        </select>

                                        <input
                                            type="text"
                                            placeholder="شهر / منطقه"
                                            value={supportEdits[r.id]?.city ?? r.city ?? ""}
                                            onChange={(e) => setEdit(r.id, "city", e.target.value)}
                                            className="border border-gray-300 rounded-lg p-2 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="زمان"
                                            value={supportEdits[r.id]?.time ?? r.time ?? ""}
                                            onChange={(e) => setEdit(r.id, "time", e.target.value)}
                                            className="border border-gray-300 rounded-lg p-2 text-sm"
                                        />
                                        <textarea
                                            placeholder="توضیحات"
                                            value={supportEdits[r.id]?.notes ?? r.notes ?? ""}
                                            onChange={(e) => setEdit(r.id, "notes", e.target.value)}
                                            className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() =>
                                            r.supportType === "CANCEL"
                                                ? handleSupportCancel(r.id, true)
                                                : handleSupportChange(r.id, true)
                                        }
                                        disabled={loadingId === r.id}
                                        className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm"
                                    >
                                        تایید
                                    </button>
                                    <button
                                        onClick={() =>
                                            r.supportType === "CANCEL"
                                                ? handleSupportCancel(r.id, false)
                                                : handleSupportChange(r.id, false)
                                        }
                                        disabled={loadingId === r.id}
                                        className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
                                    >
                                        رد
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

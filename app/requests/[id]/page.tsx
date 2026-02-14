"use client";
// بلا استفاده
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type RequestDetail = {
  id: number;
  status?: string | null;
  supportType?: string | null;
  city?: string | null;
  time?: string | null;
  notes?: string | null;
  assignedCaregiverId?: number | null;
  serviceItem?: { id: number; title: string } | null;
  patient?: { id: number; firstName?: string | null; lastName?: string | null; nationalCode?: string | null } | null;
  requester?: { phone?: string | null; userId?: number | null } | null;
  logs?: { id: number; action: string; createdAt: string; payload?: string | null; actorUser?: { phone?: string | null } | null }[];
};

type ServiceItem = { id: number; title: string };
type Caregiver = { id: number; phone: string; firstName?: string | null; lastName?: string | null };

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [form, setForm] = useState({
    serviceItemId: "",
    city: "",
    time: "",
    notes: "",
  });
  const [supportEdit, setSupportEdit] = useState({
    serviceItemId: "",
    city: "",
    time: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const requestId = Number(params?.id);

  useEffect(() => {
    const loadSession = async () => {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) return;
      const session = await sessionRes.json();
      const sessionRoles = (session?.user?.roles as string[]) ?? [];
      setRoles(sessionRoles);
      setUserId(session?.user?.id ? Number(session.user.id) : null);
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const load = async () => {
      const res = await fetch(`/api/requests/${requestId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      setRequest(data);
      setForm({
        serviceItemId: data?.serviceItem?.id ? String(data.serviceItem.id) : "",
        city: data?.city ?? "",
        time: data?.time ?? "",
        notes: data?.notes ?? "",
      });
      setSupportEdit({
        serviceItemId: data?.serviceItem?.id ? String(data.serviceItem.id) : "",
        city: data?.city ?? "",
        time: data?.time ?? "",
        notes: data?.notes ?? "",
      });
    };

    load();
  }, [requestId, router]);

  useEffect(() => {
    const isStaff = roles.includes("ADMIN") || roles.includes("EXPERT") || roles.includes("SUPPORT");
    if (!isStaff) return;

    const loadItems = async () => {
      const res = await fetch("/api/services/items");
      if (!res.ok) return;
      const data = await res.json();
      setServiceItems(data);
    };

    loadItems();
  }, [roles]);

  useEffect(() => {
    const canAssign = roles.includes("ADMIN") || roles.includes("EXPERT");
    if (!canAssign) return;

    const loadCaregivers = async () => {
      const res = await fetch("/api/users?role=CARE_GIVER");
      if (!res.ok) return;
      const data = await res.json();
      setCaregivers(data);
    };

    loadCaregivers();
  }, [roles]);

  const refresh = async () => {
    const res = await fetch(`/api/requests/${requestId}`);
    if (res.ok) {
      const data = await res.json();
      setRequest(data);
    }
  };

  const updateRequest = async () => {
    setLoading(true);
    await fetch(`/api/requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceItemId: form.serviceItemId ? Number(form.serviceItemId) : undefined,
        city: form.city,
        time: form.time,
        notes: form.notes,
      }),
    });
    setLoading(false);
    refresh();
  };

  const assignCaregiver = async (caregiverId: string) => {
    setLoading(true);
    await fetch(`/api/requests/${requestId}/assign-caregiver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverId: Number(caregiverId) }),
    });
    setLoading(false);
    refresh();
  };

  const caregiverAction = async (action: "accept" | "reject" | "done") => {
    setLoading(true);
    await fetch(`/api/requests/${requestId}/${action}`, { method: "POST" });
    setLoading(false);
    refresh();
  };

  const closeRequest = async () => {
    setLoading(true);
    await fetch(`/api/requests/${requestId}/close`, { method: "POST" });
    setLoading(false);
    refresh();
  };

  const supportAction = async (approve: boolean) => {
    if (!request?.supportType) return;
    setLoading(true);
    const path = request.supportType === "CANCEL" ? "cancel" : "change";
    await fetch(`/api/requests/${requestId}/support/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approve,
        serviceItemId: supportEdit.serviceItemId ? Number(supportEdit.serviceItemId) : undefined,
        city: supportEdit.city,
        time: supportEdit.time,
        notes: supportEdit.notes,
      }),
    });
    setLoading(false);
    refresh();
  };

  if (!request) {
    return <div className="p-6">در حال بارگذاری...</div>;
  }

  const isExpert = roles.includes("EXPERT") || roles.includes("ADMIN");
  const isSupport = roles.includes("SUPPORT") || roles.includes("ADMIN");
  const isCaregiver = roles.includes("CARE_GIVER") && request.assignedCaregiverId === userId;

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary">جزئیات درخواست #{request.id}</h1>
        <span className="text-sm text-textSub">{request.status ?? "نامشخص"}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">بیمار</div>
        <div className="text-sm">
          {request.patient?.firstName || request.patient?.lastName
            ? `${request.patient?.firstName ?? ""} ${request.patient?.lastName ?? ""}`.trim()
            : request.patient?.nationalCode ?? "-"}
        </div>
        <div className="text-xs text-textSub mt-1">
          کد ملی: {request.patient?.nationalCode ?? "-"}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">اطلاعات درخواست</div>
        <div className="text-sm">خدمت: {request.serviceItem?.title ?? "-"}</div>
        <div className="text-sm">شهر: {request.city ?? "-"}</div>
        <div className="text-sm">زمان: {request.time ?? "-"}</div>
        <div className="text-sm">توضیحات: {request.notes ?? "-"}</div>
      </div>

      {isExpert && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
          <div className="text-sm text-textSub">ویرایش اطلاعات</div>
          <select
            value={form.serviceItemId}
            onChange={(e) => setForm({ ...form, serviceItemId: e.target.value })}
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
            placeholder="شهر"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
          <input
            type="text"
            placeholder="زمان"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          />
          <textarea
            placeholder="توضیحات"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
          />
          <button
            onClick={updateRequest}
            disabled={loading}
            className="bg-primary text-white rounded-lg py-2 text-sm"
          >
            ذخیره
          </button>
        </div>
      )}

      {isExpert && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-3">
          <div className="text-sm text-textSub">تخصیص پرستار</div>
          <select
            value={request.assignedCaregiverId ? String(request.assignedCaregiverId) : ""}
            onChange={(e) => assignCaregiver(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          >
            <option value="">انتخاب پرستار</option>
            {caregivers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName || c.lastName ? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() : c.phone}
              </option>
            ))}
          </select>
        </div>
      )}

      {isCaregiver && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex gap-2">
          <button
            onClick={() => caregiverAction("accept")}
            disabled={loading}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm"
          >
            پذیرش
          </button>
          <button
            onClick={() => caregiverAction("reject")}
            disabled={loading}
            className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
          >
            رد
          </button>
          <button
            onClick={() => caregiverAction("done")}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm"
          >
            پایان کار
          </button>
        </div>
      )}

      {isExpert && (
        <button
          onClick={closeRequest}
          disabled={loading}
          className="bg-black text-white rounded-lg py-2 text-sm"
        >
          بستن درخواست
        </button>
      )}

      {isSupport && request.supportType && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
          <div className="text-sm text-textSub">رسیدگی پشتیبانی: {request.supportType}</div>
          {request.supportType === "CHANGE" && (
            <div className="flex flex-col gap-2">
              <select
                value={supportEdit.serviceItemId}
                onChange={(e) => setSupportEdit({ ...supportEdit, serviceItemId: e.target.value })}
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
                placeholder="شهر"
                value={supportEdit.city}
                onChange={(e) => setSupportEdit({ ...supportEdit, city: e.target.value })}
                className="border border-gray-300 rounded-lg p-2 text-sm"
              />
              <input
                type="text"
                placeholder="زمان"
                value={supportEdit.time}
                onChange={(e) => setSupportEdit({ ...supportEdit, time: e.target.value })}
                className="border border-gray-300 rounded-lg p-2 text-sm"
              />
              <textarea
                placeholder="توضیحات"
                value={supportEdit.notes}
                onChange={(e) => setSupportEdit({ ...supportEdit, notes: e.target.value })}
                className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => supportAction(true)}
              disabled={loading}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm"
            >
              تایید
            </button>
            <button
              onClick={() => supportAction(false)}
              disabled={loading}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
            >
              رد
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">لاگ‌ها</div>
        <div className="flex flex-col gap-2">
          {request.logs?.map((log) => (
            <div key={log.id} className="text-xs text-textSub">
              {new Date(log.createdAt).toLocaleString()} - {log.action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

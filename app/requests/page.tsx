"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

type RequestItem = {
  id: number;
  status?: string | null;
  supportType?: string | null;
  city?: string | null;
  time?: string | null;
  notes?: string | null;
  serviceItem?: { id: number; title: string } | null;
  patient?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    nationalCode?: string | null;
    age?: number | null;
    gender?: string | null;
    birthDate?: string | null;
    medicalNotes?: string | null;
    conditions?: string | null;
    documents?: { status?: string | null }[];
  } | null;
  requester?: { id: number; phone?: string | null; userId?: number | null } | null;
};

type RequestDetail = RequestItem & {
  assignedCaregiverId?: number | null;
  logs?: {
    id: number;
    action: string;
    createdAt: string;
    payload?: string | null;
    actorUser?: { phone?: string | null } | null;
  }[];
};

type ServiceItem = { id: number; title: string };
type Caregiver = { id: number; phone: string; firstName?: string | null; lastName?: string | null };

export default function RequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [docLink, setDocLink] = useState<string | null>(null);
  const [docLinkLoading, setDocLinkLoading] = useState(false);
  const [patientForm, setPatientForm] = useState({
    nationalCode: "",
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    birthDate: "",
    medicalNotes: "",
    conditions: "",
  });
  const [patientSearch, setPatientSearch] = useState<"idle" | "found" | "not_found" | "error">("idle");
  const [initialEditForm, setInitialEditForm] = useState({
    serviceItemId: "",
    city: "",
    time: "",
    notes: "",
  });
  const [initialSupportEdit, setInitialSupportEdit] = useState({
    serviceItemId: "",
    city: "",
    time: "",
    notes: "",
  });
  const [editForm, setEditForm] = useState({
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
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    id: "",
    service: "",
    patient: "",
    requester: "",
    city: "",
    time: "",
    status: "",
    support: "",
  });
  const [sort, setSort] = useState<{ key: keyof typeof filters; dir: "asc" | "desc" }>({
    key: "id",
    dir: "desc",
  });

  const refreshList = async () => {
    const res = await fetch("/api/requests", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  };

  useEffect(() => {
    const load = async () => {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRoles((session?.user?.roles as string[]) ?? []);
        setUserId(session?.user?.id ? Number(session.user.id) : null);
      }

      const res = await fetch("/api/requests", { cache: "no-store" });
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
    const interval = setInterval(() => {
      refreshList();
    }, 30000);
    const handleVisibility = () => {
      if (!document.hidden) refreshList();
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const canEdit = roles.includes("ADMIN") || roles.includes("EXPERT") || roles.includes("SUPPORT");
    if (!canEdit) return;

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

  const openModal = async (request: RequestItem) => {
    setEditingId(request.id);
    setDetailLoading(true);
    setSavedOnce(false);
    setDocLink(null);
    const res = await fetch(`/api/requests/${request.id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      setPatientForm({
        nationalCode: data?.patient?.nationalCode ?? "",
        firstName: data?.patient?.firstName ?? "",
        lastName: data?.patient?.lastName ?? "",
        age: data?.patient?.age ? String(data.patient.age) : "",
        gender: data?.patient?.gender ?? "",
        birthDate: data?.patient?.birthDate ? data.patient.birthDate.slice(0, 10) : "",
        medicalNotes: data?.patient?.medicalNotes ?? "",
        conditions: data?.patient?.conditions ?? "",
      });
      setPatientSearch("idle");
      const nextEdit = {
        serviceItemId: data?.serviceItem?.id ? String(data.serviceItem.id) : "",
        city: data?.city ?? "",
        time: data?.time ?? "",
        notes: data?.notes ?? "",
      };
      const nextSupport = {
        serviceItemId: data?.serviceItem?.id ? String(data.serviceItem.id) : "",
        city: data?.city ?? "",
        time: data?.time ?? "",
        notes: data?.notes ?? "",
      };
      setEditForm(nextEdit);
      setSupportEdit(nextSupport);
      setInitialEditForm(nextEdit);
      setInitialSupportEdit(nextSupport);
    } else {
      setDetail(null);
    }
    setDetailLoading(false);
  };

  const isDirty =
    JSON.stringify(editForm) !== JSON.stringify(initialEditForm) ||
    JSON.stringify(supportEdit) !== JSON.stringify(initialSupportEdit);

  const cancelEdit = () => {
    setEditingId(null);
    setDetail(null);
  };

  const requestClose = () => {
    if (isDirty) {
      const ok = window.confirm("اطلاعات ذخیره نشده است. خارج می‌شوید؟");
      if (!ok) return;
    }
    cancelEdit();
  };

  const saveEdit = async (id: number) => {
    setSaving(true);
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceItemId: editForm.serviceItemId ? Number(editForm.serviceItemId) : undefined,
        city: editForm.city,
        time: editForm.time,
        notes: editForm.notes,
      }),
    });
    setSaving(false);
    setSavedOnce(true);
    await refreshList();
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      if (data?.assignedCaregiverId) {
        cancelEdit();
      }
    }
  };

  const assignCaregiver = async (id: number, caregiverId: string) => {
    if (!caregiverId) return;
    setSaving(true);
    await fetch(`/api/requests/${id}/assign-caregiver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverId: Number(caregiverId) }),
    });
    setSaving(false);
    await refreshList();
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      if (savedOnce && data?.assignedCaregiverId) {
        cancelEdit();
      }
    }
  };

  const caregiverAction = async (id: number, action: "accept" | "reject" | "done") => {
    setSaving(true);
    await fetch(`/api/requests/${id}/${action}`, { method: "POST" });
    setSaving(false);
    await refreshList();
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const closeRequest = async (id: number) => {
    setSaving(true);
    await fetch(`/api/requests/${id}/close`, { method: "POST" });
    setSaving(false);
    await refreshList();
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const supportAction = async (id: number, supportType: string, approve: boolean) => {
    setSaving(true);
    const path = supportType === "CANCEL" ? "cancel" : "change";
    await fetch(`/api/requests/${id}/support/${path}`, {
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
    setSaving(false);
    await refreshList();
    const res = await fetch(`/api/requests/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const canEdit = roles.includes("ADMIN") || roles.includes("EXPERT");
  const canOpen = roles.some((r) => ["ADMIN", "EXPERT", "SUPPORT", "CARE_GIVER"].includes(r));
  const isSupport = roles.includes("SUPPORT") || roles.includes("ADMIN");
  const isExpert = roles.includes("EXPERT") || roles.includes("ADMIN");

  const getDocStatus = (request: RequestItem) => {
    const national = request.patient?.nationalCode ?? "";
    if (!national || national.startsWith("TEMP-")) return "missing";
    const docs = request.patient?.documents ?? [];
    if (docs.length === 0) return "missing";
    if (docs.some((doc) => doc.status === "APPROVED")) return "approved";
    return "pending";
  };

  const getDocLabel = (status: string) => {
    if (status === "approved") return "مدارک تایید شده";
    if (status === "pending") return "مدارک در انتظار بررسی";
    return "مدارک ناقص یا بدون کد ملی";
  };

  const filteredRequests = useMemo(() => {
    const normalize = (val?: string | number | null) => (val ?? "").toString().toLowerCase().trim();

    return requests.filter((r) => {
      const patientLabel = r.patient
        ? `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.trim() || (r.patient.nationalCode ?? "")
        : "";
      return (
        normalize(r.id).includes(normalize(filters.id)) &&
        normalize(r.serviceItem?.title).includes(normalize(filters.service)) &&
        normalize(patientLabel).includes(normalize(filters.patient)) &&
        normalize(r.requester?.phone).includes(normalize(filters.requester)) &&
        normalize(r.city).includes(normalize(filters.city)) &&
        normalize(r.time).includes(normalize(filters.time)) &&
        normalize(r.status).includes(normalize(filters.status)) &&
        normalize(r.supportType).includes(normalize(filters.support))
      );
    });
  }, [requests, filters]);

  const sortedRequests = useMemo(() => {
    const sorted = [...filteredRequests];
    sorted.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const getValue = (r: RequestItem) => {
        switch (sort.key) {
          case "id":
            return r.id;
          case "service":
            return r.serviceItem?.title ?? "";
          case "patient":
            return r.patient
              ? `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.trim() || (r.patient.nationalCode ?? "")
              : "";
          case "requester":
            return r.requester?.phone ?? "";
          case "city":
            return r.city ?? "";
          case "time":
            return r.time ?? "";
          case "status":
            return r.status ?? "";
          case "support":
            return r.supportType ?? "";
          default:
            return "";
        }
      };
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }
      return aVal.toString().localeCompare(bVal.toString(), "fa") * dir;
    });
    return sorted;
  }, [filteredRequests, sort]);

  const toggleSort = (key: keyof typeof filters) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  const sendDocLink = async () => {
    if (!editingId) return;
    setDocLinkLoading(true);
    const res = await fetch(`/api/requests/${editingId}/doc-link`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = origin
        ? `${origin}/patients/${data.patientId}?uploadToken=${data.token}`
        : data.token;
      setDocLink(link);
    }
    setDocLinkLoading(false);
  };

  const searchPatientByNationalCode = async () => {
    if (!patientForm.nationalCode || !editingId) return;
    setPatientSearch("idle");
    const res = await fetch(
      `/api/patients/search?nationalCode=${encodeURIComponent(patientForm.nationalCode)}`,
    );
    if (!res.ok) {
      setPatientSearch("error");
      return;
    }
    const data = await res.json();
    if (!data?.found) {
      setPatientSearch("not_found");
      return;
    }
    const found = data.patient;
    setPatientForm({
      nationalCode: found?.nationalCode ?? "",
      firstName: found?.firstName ?? "",
      lastName: found?.lastName ?? "",
      age: found?.age ? String(found.age) : "",
      gender: found?.gender ?? "",
      birthDate: found?.birthDate ? found.birthDate.slice(0, 10) : "",
      medicalNotes: found?.medicalNotes ?? "",
      conditions: found?.conditions ?? "",
    });
    setPatientSearch("found");

    if (detail?.patient?.id && found?.id && detail.patient.id !== found.id) {
      await fetch(`/api/requests/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: found.id }),
      });
      await refreshList();
      const next = await fetch(`/api/requests/${editingId}`);
      if (next.ok) setDetail(await next.json());
    }
  };

  const savePatientInfo = async () => {
    if (!detail?.patient?.id) return;
    const res = await fetch(`/api/patients/${detail.patient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nationalCode: patientForm.nationalCode || undefined,
        firstName: patientForm.firstName || undefined,
        lastName: patientForm.lastName || undefined,
        age: patientForm.age ? Number(patientForm.age) : undefined,
        gender: patientForm.gender || undefined,
        birthDate: patientForm.birthDate || undefined,
        medicalNotes: patientForm.medicalNotes || undefined,
        conditions: patientForm.conditions || undefined,
      }),
    });

    if (!res.ok) {
      alert("ذخیره اطلاعات بیمار ناموفق بود");
      return;
    }

    const next = await fetch(`/api/requests/${editingId}`);
    if (next.ok) setDetail(await next.json());
    await refreshList();
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold text-primary">درخواست‌ها</h1>
        <span className="absolute right-0 text-sm text-textSub">{requests.length} مورد</span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 text-textSub">
            <tr>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("id")}>شناسه</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("service")}>خدمت</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("patient")}>بیمار</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("requester")}>درخواست‌دهنده</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("city")}>شهر</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("time")}>زمان</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("status")}>وضعیت</th>
              <th className="text-right p-3 cursor-pointer" onClick={() => toggleSort("support")}>پشتیبانی</th>
              <th className="text-right p-3">مدارک</th>
              <th className="text-right p-3">عملیات</th>
            </tr>
            <tr>
              <th className="p-2">
                <input
                  value={filters.id}
                  onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.service}
                  onChange={(e) => setFilters({ ...filters, service: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.patient}
                  onChange={(e) => setFilters({ ...filters, patient: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.requester}
                  onChange={(e) => setFilters({ ...filters, requester: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.time}
                  onChange={(e) => setFilters({ ...filters, time: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2">
                <input
                  value={filters.support}
                  onChange={(e) => setFilters({ ...filters, support: e.target.value })}
                  className="w-full border border-gray-200 rounded-md p-1 text-xs"
                  placeholder="فیلتر"
                />
              </th>
              <th className="p-2" />
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {sortedRequests.map((r) => (
              <tr key={r.id} className="border-t border-gray-200">
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.serviceItem?.title ?? "-"}</td>
                <td className="p-3">
                  {r.patient ? (
                    <Link className="text-primary" href={`/patients/${r.patient.id}`}>
                      <div className="text-sm">
                        {r.patient.firstName || r.patient.lastName
                          ? `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.trim()
                          : "بدون نام"}
                      </div>
                      <div className="text-xs text-textSub">کد ملی: {r.patient.nationalCode ?? "-"}</div>
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3">
                  {r.requester ? (
                    <Link className="text-primary" href={`/requesters/${r.requester.id}`}>
                      {r.requester.phone ?? "-"}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-3">{r.city ?? "-"}</td>
                <td className="p-3">{r.time ?? "-"}</td>
                <td className="p-3">{r.status ?? "-"}</td>
                <td className="p-3">{r.supportType ?? "-"}</td>
                <td className="p-3">
                  {(() => {
                    const status = getDocStatus(r);
                    const color =
                      status === "approved" ? "bg-green-500" : status === "pending" ? "bg-yellow-400" : "bg-red-500";
                    return (
                      <span
                        title={getDocLabel(status)}
                        className={`inline-block w-3 h-3 rounded-full ${color}`}
                      />
                    );
                  })()}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {canOpen && (
                      <button
                        onClick={() => openModal(r)}
                        className="text-blue-600"
                      >
                        ویرایش
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={requestClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh]">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-primary">درخواست #{editingId}</div>
                <button onClick={requestClose} className="text-textSub text-sm">
                  بستن
                </button>
              </div>

              {detailLoading && <div className="text-sm text-textSub">در حال بارگذاری...</div>}

              {!detailLoading && detail && (
                <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                    <div className="text-sm text-textSub mb-2">وضعیت</div>
                    <div className="text-sm">{detail.status ?? "-"}</div>
                    {detail.supportType && (
                      <div className="text-xs text-red-600 mt-1">پشتیبانی: {detail.supportType}</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-textSub mb-2">بیمار</div>
                    {detail.patient ? (
                      <Link className="text-primary" href={`/patients/${detail.patient.id}`}>
                        <div className="text-sm">
                          {detail.patient.firstName || detail.patient.lastName
                            ? `${detail.patient.firstName ?? ""} ${detail.patient.lastName ?? ""}`.trim()
                            : "بدون نام"}
                        </div>
                        <div className="text-xs text-textSub">کد ملی: {detail.patient.nationalCode ?? "-"}</div>
                      </Link>
                    ) : (
                      <div className="text-sm text-textSub">نامشخص</div>
                    )}
                  </div>

                  {isExpert && detail.patient && (
                    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                      <div className="text-sm text-textSub">ویرایش اطلاعات بیمار</div>
                      <input
                        type="text"
                        placeholder="کد ملی"
                        value={patientForm.nationalCode}
                        onChange={(e) => setPatientForm({ ...patientForm, nationalCode: e.target.value })}
                        onBlur={searchPatientByNationalCode}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <button
                        onClick={searchPatientByNationalCode}
                        className="border border-gray-300 rounded-lg py-2 text-xs"
                      >
                        جستجو بر اساس کد ملی
                      </button>
                      {patientSearch === "found" && (
                        <div className="text-xs text-green-600">پرونده یافت شد و اطلاعات بارگذاری شد.</div>
                      )}
                      {patientSearch === "not_found" && (
                        <div className="text-xs text-yellow-600">پرونده‌ای با این کد ملی پیدا نشد.</div>
                      )}
                      {patientSearch === "error" && (
                        <div className="text-xs text-red-600">خطا در جستجو</div>
                      )}
                      <input
                        type="text"
                        placeholder="نام"
                        value={patientForm.firstName}
                        onChange={(e) => setPatientForm({ ...patientForm, firstName: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="نام خانوادگی"
                        value={patientForm.lastName}
                        onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="date"
                        value={patientForm.birthDate}
                        onChange={(e) => setPatientForm({ ...patientForm, birthDate: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="سن"
                        value={patientForm.age}
                        onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="جنسیت"
                        value={patientForm.gender}
                        onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="بیماری‌ها"
                        value={patientForm.conditions}
                        onChange={(e) => setPatientForm({ ...patientForm, conditions: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm"
                      />
                      <textarea
                        placeholder="یادداشت پزشکی"
                        value={patientForm.medicalNotes}
                        onChange={(e) => setPatientForm({ ...patientForm, medicalNotes: e.target.value })}
                        className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
                      />
                      <button
                        onClick={savePatientInfo}
                        className="bg-primary text-white rounded-lg py-2 text-sm"
                      >
                        ذخیره اطلاعات بیمار
                      </button>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-textSub mb-2">درخواست‌دهنده</div>
                    {detail.requester ? (
                      <Link className="text-primary" href={`/requesters/${detail.requester.id}`}>
                        {detail.requester.phone ?? "-"}
                      </Link>
                    ) : (
                      <div className="text-sm text-textSub">نامشخص</div>
                    )}
                  </div>

                  {isExpert && (
                    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                      <div className="text-sm text-textSub">ویرایش اطلاعات</div>
                      <select
                        value={editForm.serviceItemId}
                        onChange={(e) => setEditForm({ ...editForm, serviceItemId: e.target.value })}
                        className="border border-gray-300 rounded-lg p-3 text-sm"
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
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="border border-gray-300 rounded-lg p-3 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="زمان"
                        value={editForm.time}
                        onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                        className="border border-gray-300 rounded-lg p-3 text-sm"
                      />
                      <textarea
                        placeholder="توضیحات"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="border border-gray-300 rounded-lg p-3 text-sm resize-none"
                      />
                      <button
                        onClick={() => saveEdit(editingId)}
                        disabled={saving}
                        className="bg-primary text-white rounded-lg py-2 text-sm"
                      >
                        ذخیره
                      </button>
                    </div>
                  )}

                  {isExpert && (
                    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                      <div className="text-sm text-textSub">لینک تکمیل مدارک</div>
                      <button
                        onClick={sendDocLink}
                        disabled={docLinkLoading}
                        className="bg-blue-600 text-white rounded-lg py-2 text-sm"
                      >
                        ساخت لینک تکمیل مدارک
                      </button>
                      {docLink && (
                        <div className="text-xs text-textSub break-all flex flex-col gap-1">
                          <a href={docLink} target="_blank" className="text-primary">
                            باز کردن لینک
                          </a>
                          <div>{docLink}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {isExpert && (
                    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                      <div className="text-sm text-textSub">تخصیص پرستار</div>
                      <select
                        value={detail.assignedCaregiverId ? String(detail.assignedCaregiverId) : ""}
                        onChange={(e) => assignCaregiver(editingId, e.target.value)}
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

                  {detail.assignedCaregiverId === userId && roles.includes("CARE_GIVER") && (
                    <div className="rounded-xl border border-gray-200 p-4 flex gap-2">
                      <button
                        onClick={() => caregiverAction(editingId, "accept")}
                        disabled={saving}
                        className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm"
                      >
                        پذیرش
                      </button>
                      <button
                        onClick={() => caregiverAction(editingId, "reject")}
                        disabled={saving}
                        className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
                      >
                        رد
                      </button>
                      <button
                        onClick={() => caregiverAction(editingId, "done")}
                        disabled={saving}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm"
                      >
                        پایان کار
                      </button>
                    </div>
                  )}

                  {isExpert && (
                    <button
                      onClick={() => closeRequest(editingId)}
                      disabled={saving}
                      className="bg-black text-white rounded-lg py-2 text-sm"
                    >
                      بستن درخواست
                    </button>
                  )}

                  {isSupport && detail.supportType && (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 flex flex-col gap-2">
                      <div className="text-sm text-textSub">رسیدگی پشتیبانی: {detail.supportType}</div>
                      {detail.supportType === "CHANGE" && (
                        <>
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
                        </>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => supportAction(editingId, detail.supportType ?? "", true)}
                          disabled={saving}
                          className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm"
                        >
                          تایید
                        </button>
                        <button
                          onClick={() => supportAction(editingId, detail.supportType ?? "", false)}
                          disabled={saving}
                          className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm"
                        >
                          رد
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-textSub mb-2">لاگ‌ها</div>
                    <div className="flex flex-col gap-2">
                      {detail.logs?.map((log) => (
                        <div key={log.id} className="text-xs text-textSub">
                          {new Date(log.createdAt).toLocaleString()} - {log.action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={requestClose}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

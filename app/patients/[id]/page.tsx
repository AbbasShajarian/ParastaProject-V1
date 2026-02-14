"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

type DocumentItem = {
  id: number;
  type: string;
  title?: string | null;
  doctorName?: string | null;
  visitDate?: string | null;
  visitReason?: string | null;
  visitLocation?: string | null;
  notes?: string | null;
  status: string;
  mimeType: string;
  size: number;
  originalSize?: number | null;
  isCompressed: boolean;
  createdAt: string;
  updatedAt?: string;
};

type PatientDetail = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  nationalCode?: string | null;
  birthDate?: string | null;
  age?: number | null;
  gender?: string | null;
  medicalNotes?: string | null;
  conditions?: string | null;
  verificationStatus?: string | null;
  documents?: DocumentItem[];
  requests?: {
    id: number;
    status?: string | null;
    createdAt: string;
    serviceItem?: { title: string } | null;
  }[];
};

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const dirtyRef = useRef(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<{
    open: boolean;
    title?: string;
    src?: string;
    mimeType?: string;
  }>({ open: false });
  const [previewMap, setPreviewMap] = useState<Record<number, { src: string; mimeType: string }>>({});
  const previewCacheRef = useRef<Record<number, string>>({});
  const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    nationalCode: "",
    birthDate: "",
    age: "",
    gender: "",
    medicalNotes: "",
    conditions: "",
    verificationStatus: "PENDING",
  });
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [showMedicalMeta, setShowMedicalMeta] = useState(false);
  const [medicalUpload, setMedicalUpload] = useState({
    title: "",
    doctorName: "",
    visitDate: "",
    visitReason: "",
    visitLocation: "",
    notes: "",
  });

  const patientId = Number(params?.id);

  const syncForm = (data: PatientDetail) => {
    setForm({
      firstName: data?.firstName ?? "",
      lastName: data?.lastName ?? "",
      nationalCode: data?.nationalCode ?? "",
      birthDate: data?.birthDate ? data.birthDate.slice(0, 10) : "",
      age: data?.age ? String(data.age) : "",
      gender: data?.gender ?? "",
      medicalNotes: data?.medicalNotes ?? "",
      conditions: data?.conditions ?? "",
      verificationStatus: data?.verificationStatus ?? "PENDING",
    });
    dirtyRef.current = false;
  };

  const fetchPatient = useCallback(
    async (force = false) => {
      if (!patientId) return;
      const res = await fetch(`/api/patients/${patientId}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      setPatient(data);
      if (force || !dirtyRef.current) {
        syncForm(data);
      }
    },
    [patientId, router],
  );

  useEffect(() => {
    const loadSession = async () => {
      const sessionRes = await fetch("/api/auth/session");
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setRoles((session?.user?.roles as string[]) ?? []);
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!patientId) return;
    fetchPatient(true);
  }, [fetchPatient, patientId]);

  useEffect(() => {
    if (!patientId) return;
    const interval = setInterval(() => {
      fetchPatient(false);
    }, 30000);
    const handleVisibility = () => {
      if (!document.hidden) fetchPatient(false);
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchPatient, patientId]);

  const updateField =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      dirtyRef.current = true;
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const canVerify = roles.includes("ADMIN") || roles.includes("EXPERT");

  const updatePatient = async () => {
    await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nationalCode: form.nationalCode,
        firstName: form.firstName,
        lastName: form.lastName,
        age: form.age ? Number(form.age) : undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender,
        medicalNotes: form.medicalNotes,
        conditions: form.conditions,
        verificationStatus: form.verificationStatus,
      }),
    });
    await fetchPatient(true);
  };

  const updateDocStatus = async (docId: number, status: string) => {
    await fetch(`/api/patients/${patientId}/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    await fetchPatient(true);
  };

  const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
  const MAX_IMAGE_SIZE = 1600;
  const IMAGE_QUALITY = 0.7;

  const compressImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return file;

    const imageBitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.round(imageBitmap.width * scale);
    const height = Math.round(imageBitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", IMAGE_QUALITY),
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  };

  const prepareFile = async (file: File) => {
    const processed = await compressImage(file);
    if (processed.size > MAX_UPLOAD_BYTES) {
      alert("حجم فایل بیش از حد مجاز است. لطفاً حجم را کاهش دهید.");
      return null;
    }
    return processed;
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const uploadDocument = async (
    type: string,
    file: File,
    meta?: {
      title?: string;
      doctorName?: string;
      visitDate?: string;
      visitReason?: string;
      visitLocation?: string;
      notes?: string;
    },
  ) => {
    const processed = await prepareFile(file);
    if (!processed) return;
    const dataBase64 = await fileToBase64(processed);
    await fetch(`/api/patients/${patientId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: meta?.title,
        doctorName: meta?.doctorName,
        visitDate: meta?.visitDate,
        visitReason: meta?.visitReason,
        visitLocation: meta?.visitLocation,
        notes: meta?.notes,
        mimeType: processed.type || "application/octet-stream",
        data: dataBase64,
      }),
    });
  };

  const handleUploadSingle = async (type: string, file: File) => {
    setUploadingType(type);
    try {
      await uploadDocument(type, file, type === "MEDICAL_DOC" ? medicalUpload : undefined);
      previewCacheRef.current = {};
      setPreviewMap({});
      await fetchPatient(true);
      if (type === "MEDICAL_DOC") {
        setMedicalUpload({
          title: "",
          doctorName: "",
          visitDate: "",
          visitReason: "",
          visitLocation: "",
          notes: "",
        });
      }
    } finally {
      setUploadingType(null);
    }
  };

  const openDocument = async (doc: DocumentItem) => {
    setPreview({
      open: true,
      title: doc.title || docTypeLabel(doc.type),
      src: undefined,
      mimeType: undefined,
    });
    setPreviewLoadingId(doc.id);
    const res = await fetch(`/api/patients/${patientId}/documents/${doc.id}`);
    if (!res.ok) {
      setPreviewLoadingId(null);
      setPreview({ open: false });
      return;
    }
    const data = await res.json();
    if (!data?.data || !data?.mimeType) {
      setPreviewLoadingId(null);
      setPreview({ open: false });
      return;
    }
    const url = `data:${data.mimeType};base64,${data.data}`;
    setPreview({
      open: true,
      title: data.title || data.type,
      src: url,
      mimeType: data.mimeType,
    });
    setPreviewLoadingId(null);
  };

  const loadPreview = useCallback(
    async (doc: DocumentItem) => {
      if (!doc.mimeType?.startsWith("image/")) return;
      if (previewCacheRef.current[doc.id]) return;
      const res = await fetch(`/api/patients/${patientId}/documents/${doc.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.data || !data?.mimeType) return;
      const url = `data:${data.mimeType};base64,${data.data}`;
      previewCacheRef.current[doc.id] = url;
      setPreviewMap((prev) => ({ ...prev, [doc.id]: { src: url, mimeType: data.mimeType } }));
    },
    [patientId],
  );

  useEffect(() => {
    if (!patient) return;
    (patient.documents ?? []).forEach((doc) => {
      loadPreview(doc);
    });
  }, [patient, loadPreview]);

  if (!patient) {
    return <div className="p-6">در حال بارگذاری...</div>;
  }

  const identityTypes = ["NATIONAL_CARD_FRONT", "NATIONAL_CARD_BACK", "BIRTH_CERT_PAGE1"];
  const docByType = new Map<string, DocumentItem>();
  (patient.documents ?? []).forEach((doc) => {
    const existing = docByType.get(doc.type);
    if (!existing) {
      docByType.set(doc.type, doc);
      return;
    }
    const docDate = new Date(doc.updatedAt || doc.createdAt).getTime();
    const existingDate = new Date(existing.updatedAt || existing.createdAt).getTime();
    if (docDate > existingDate) {
      docByType.set(doc.type, doc);
    }
  });

  const docTypeLabel = (type: string) => {
    if (type === "NATIONAL_CARD_FRONT") return "کارت ملی (رو)";
    if (type === "NATIONAL_CARD_BACK") return "کارت ملی (پشت)";
    if (type === "BIRTH_CERT_PAGE1") return "صفحه اول شناسنامه";
    if (type === "MEDICAL_DOC") return "مدرک پزشکی";
    return type;
  };

  const statusLabel = (status?: string | null) => {
    if (status === "APPROVED") return "تایید شده";
    if (status === "REJECTED") return "رد شده";
    return "در انتظار تایید";
  };

  const renderDocRow = (type: string, allowMeta?: boolean) => {
    const doc = docByType.get(type);
    const previewItem = doc ? previewMap[doc.id] : undefined;
    const isApproved = doc?.status === "APPROVED";

    const statusText = doc ? statusLabel(doc.status) : "ثبت نشده";

    return (
      <div key={type} className="border border-gray-200 rounded-lg p-3 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">{docTypeLabel(type)}</div>
            <span className="text-xs text-textSub">{statusText}</span>
          </div>
          <div className="flex items-center gap-2">
            {doc && (
              <button
                onClick={() => openDocument(doc)}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1"
              >
                مشاهده
              </button>
            )}
            <button
              onClick={() => fileInputRefs.current[type]?.click()}
              disabled={uploadingType === type}
              className="text-xs bg-primary text-white rounded-lg px-3 py-1 disabled:opacity-60"
            >
              + آپلود
            </button>
            <input
              type="file"
              accept="image/*,application/pdf"
              ref={(el) => {
                fileInputRefs.current[type] = el;
              }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void handleUploadSingle(type, file);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div
            className="w-full md:w-40 h-24 border border-dashed border-gray-200 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer"
            onClick={() => doc && openDocument(doc)}
          >
            {previewItem?.src ? (
              <img
                src={previewItem.src}
                alt={docTypeLabel(type)}
                className="w-full h-full object-cover"
              />
            ) : doc?.mimeType === "application/pdf" ? (
              <span className="text-xs text-textSub">PDF</span>
            ) : (
              <span className="text-xs text-textSub">پیش‌نمایش ندارد</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
          {doc && (
            <span className="text-xs text-textSub">
              تاریخ: {new Date(doc.updatedAt || doc.createdAt).toLocaleDateString("fa-IR")}
            </span>
          )}
            {doc && doc.status && (
              <span className="text-xs text-textSub">وضعیت: {statusLabel(doc.status)}</span>
            )}
          </div>
          {canVerify && doc && (
            <div className="flex gap-2">
              {isApproved ? (
                <button
                  onClick={() => updateDocStatus(doc.id, "PENDING")}
                  className="text-xs bg-yellow-500 text-white rounded-lg px-3 py-1"
                >
                  لغو تایید
                </button>
              ) : (
                <>
                  <button
                    onClick={() => updateDocStatus(doc.id, "APPROVED")}
                    className="text-xs bg-green-600 text-white rounded-lg px-3 py-1"
                  >
                    تایید
                  </button>
                  <button
                    onClick={() => updateDocStatus(doc.id, "REJECTED")}
                    className="text-xs bg-red-600 text-white rounded-lg px-3 py-1"
                  >
                    رد
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {allowMeta && (
          <div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
            <button
              onClick={() => setShowMedicalMeta((prev) => !prev)}
              className="text-xs text-primary text-right"
            >
              {showMedicalMeta ? "بستن جزئیات پزشکی" : "جزئیات پزشکی"}
            </button>
            {showMedicalMeta && (
              <>
                <input
                  type="text"
                  placeholder="عنوان پرونده"
                  value={medicalUpload.title}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, title: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="نام پزشک"
                  value={medicalUpload.doctorName}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, doctorName: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm"
                />
                <input
                  type="date"
                  value={medicalUpload.visitDate}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, visitDate: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="علت مراجعه"
                  value={medicalUpload.visitReason}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, visitReason: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="محل ویزیت"
                  value={medicalUpload.visitLocation}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, visitLocation: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm"
                />
                <textarea
                  placeholder="یادداشت"
                  value={medicalUpload.notes}
                  onChange={(e) => setMedicalUpload({ ...medicalUpload, notes: e.target.value })}
                  className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
                />
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold text-primary">بیمار #{patient.id}</h1>
        <span className="absolute right-0 text-sm text-textSub">{patient.verificationStatus ?? "-"}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">اطلاعات بیمار</div>
        <div className="text-sm">کد ملی: {patient.nationalCode ?? "-"}</div>
        <div className="text-sm">نام کامل: {patient.fullName ?? "-"}</div>
        <div className="text-sm">نام: {patient.firstName ?? "-"}</div>
        <div className="text-sm">نام خانوادگی: {patient.lastName ?? "-"}</div>
        <div className="text-sm">تاریخ تولد: {patient.birthDate ? patient.birthDate.slice(0, 10) : "-"}</div>
        <div className="text-sm">سن: {patient.age ?? "-"}</div>
        <div className="text-sm">جنسیت: {patient.gender ?? "-"}</div>
        <div className="text-sm">بیماری‌ها: {patient.conditions ?? "-"}</div>
        <div className="text-sm">یادداشت: {patient.medicalNotes ?? "-"}</div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">ویرایش اطلاعات</div>
        <input
          type="text"
          placeholder="کد ملی"
          value={form.nationalCode}
          onChange={updateField("nationalCode")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="نام"
          value={form.firstName}
          onChange={updateField("firstName")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="نام خانوادگی"
          value={form.lastName}
          onChange={updateField("lastName")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="date"
          placeholder="تاریخ تولد"
          value={form.birthDate}
          onChange={updateField("birthDate")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="number"
          placeholder="سن"
          value={form.age}
          onChange={updateField("age")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="جنسیت"
          value={form.gender}
          onChange={updateField("gender")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="text"
          placeholder="بیماری‌ها"
          value={form.conditions}
          onChange={updateField("conditions")}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <textarea
          placeholder="یادداشت پزشکی"
          value={form.medicalNotes}
          onChange={updateField("medicalNotes")}
          className="border border-gray-300 rounded-lg p-2 text-sm resize-none"
        />
        {canVerify && (
          <select
            value={form.verificationStatus}
            onChange={updateField("verificationStatus")}
            className="border border-gray-300 rounded-lg p-2 text-sm"
          >
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        )}
        <button
          onClick={updatePatient}
          className="bg-primary text-white rounded-lg py-2 text-sm"
        >
          ذخیره
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-4">
        <div className="text-sm text-textSub">مدارک هویتی</div>
        {identityTypes.map((type) => renderDocRow(type))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-4">
        <div className="text-sm text-textSub">مدارک پزشکی</div>
        {renderDocRow("MEDICAL_DOC", true)}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">تاریخچه خدمات</div>
        <div className="flex flex-col gap-2">
          {patient.requests?.map((req) => (
            <div key={req.id} className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-textSub">
                {req.serviceItem?.title ?? "بدون عنوان"}
              </div>
              <div className="text-xs text-textSub">وضعیت: {req.status ?? "-"}</div>
              <div className="text-xs text-textSub">
                {new Date(req.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">پیشنهادات</div>
        <div className="text-xs text-textSub leading-relaxed">
          بر اساس اطلاعات ثبت‌شده بیمار، در صورت نیاز به پایش علائم حیاتی یا مراقبت شبانه می‌توانید
          درخواست جدید ثبت کنید.
        </div>
      </div>

      {preview.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPreview({ open: false })}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm text-textSub">{preview.title ?? "پیش‌نمایش مدرک"}</div>
              <button
                onClick={() => setPreview({ open: false })}
                className="text-xs text-textSub"
              >
                بستن
              </button>
            </div>
            {previewLoadingId && (
              <div className="text-xs text-textSub">در حال بارگذاری...</div>
            )}
            {preview.mimeType?.startsWith("image/") && preview.src && (
              <img src={preview.src} alt={preview.title ?? "preview"} className="w-full rounded-lg" />
            )}
            {preview.mimeType === "application/pdf" && preview.src && (
              <iframe title="preview" src={preview.src} className="w-full h-[70vh] rounded-lg" />
            )}
            {!preview.mimeType?.startsWith("image/") &&
              preview.mimeType !== "application/pdf" &&
              preview.src && (
                <a
                  href={preview.src}
                  target="_blank"
                  className="text-primary text-sm"
                  rel="noreferrer"
                >
                  دانلود فایل
                </a>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomSheetSelect from "../../components/BottomSheetSelect";

type ServiceItem = {
    id: number;
    title: string;
    categoryId: number;
};

type ServiceCategory = {
    id: number;
    title: string;
    items: ServiceItem[];
};

type PatientItem = {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    nationalCode?: string | null;
};

export default function RequestPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState(1);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
    const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([]);
    const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
    const [patients, setPatients] = useState<PatientItem[]>([]);
    const [isAuthed, setIsAuthed] = useState(false);
    const [userPhone, setUserPhone] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const [form, setForm] = useState({
        categoryId: "",
        categoryLabel: "",
        serviceItemId: "",
        serviceItemLabel: "",
        city: "",
        time: "",
        phone: "",
        patientId: "",
        patientLabel: "",
        nationalCode: "",
        firstName: "",
        lastName: "",
        age: "",
        gender: "",
        notes: "",
    });

    useEffect(() => {
        const loadServices = async () => {
            const res = await fetch("/api/services/categories");
            if (!res.ok) return;
            const data = await res.json();
            setCategories(data);
            setCategoryOptions(
                data.map((cat: ServiceCategory) => ({ value: String(cat.id), label: cat.title })),
            );
        };

        loadServices();
    }, []);

    useEffect(() => {
        const loadSession = async () => {
            const res = await fetch("/api/auth/session");
            if (!res.ok) return;
            const session = await res.json();
            if (session?.user?.id) {
                setIsAuthed(true);
                setUserPhone(session?.user?.phone ?? "");
            }
        };

        loadSession();
    }, []);

    useEffect(() => {
        if (!isAuthed) return;

        const loadPatients = async () => {
            const res = await fetch("/api/patients", { cache: "no-store" });
            if (!res.ok) return;
            const data: PatientItem[] = await res.json();
            setPatients(data);
            setPatientOptions(
                data.map((patient) => {
                    const name =
                        patient.fullName ||
                        `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
                        "بیمار بدون نام";
                    const national = patient.nationalCode ? ` - ${patient.nationalCode}` : "";
                    return {
                        value: String(patient.id),
                        label: `${name}${national}`,
                    };
                }),
            );
        };

        loadPatients();
    }, [isAuthed]);

    useEffect(() => {
        if (!categories.length) return;
        const requestedCategoryId = searchParams.get("categoryId");
        if (!requestedCategoryId) return;
        const matched = categories.find((cat) => String(cat.id) === requestedCategoryId);
        if (!matched) return;
        setForm((prev) => ({
            ...prev,
            categoryId: requestedCategoryId,
            categoryLabel: matched.title,
            serviceItemId: "",
            serviceItemLabel: "",
        }));
    }, [categories, searchParams]);

    useEffect(() => {
        if (!form.categoryId) {
            setServiceOptions([]);
            return;
        }

        const category = categories.find((cat) => String(cat.id) === form.categoryId);
        if (!category) {
            setServiceOptions([]);
            return;
        }

        setServiceOptions(category.items.map((item) => ({ value: String(item.id), label: item.title })));
    }, [categories, form.categoryId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === "phone") {
            const digits = value.replace(/\D/g, "").slice(0, 11);
            setForm({ ...form, phone: digits });
            return;
        }
        setForm({ ...form, [name]: value });
    };

    const handleBack = () => setStep(1);

    const isGuestPhoneValid = (value: string) => /^09\d{9}$/.test(value);

    const handleNext = () => {
        if (!isAuthed && !form.phone) {
            alert("لطفا شماره تماس را وارد کنید");
            return;
        }
        if (!isAuthed && !isGuestPhoneValid(form.phone)) {
            alert("شماره تماس باید با 09 شروع شود و 11 رقم باشد");
            return;
        }

        setStep(2);
    };

    const handleSubmit = async () => {
        if (!isAuthed && !form.phone) {
            alert("لطفا شماره تماس را وارد کنید");
            return;
        }
        if (!isAuthed && !isGuestPhoneValid(form.phone)) {
            alert("شماره تماس باید با 09 شروع شود و 11 رقم باشد");
            return;
        }

        const patientPayload = {
            nationalCode: form.nationalCode.trim() || undefined,
            firstName: form.firstName.trim() || undefined,
            lastName: form.lastName.trim() || undefined,
            age: form.age ? Number(form.age) : undefined,
            gender: form.gender || undefined,
        };

        const hasPatientData = Object.values(patientPayload).some((value) => value !== undefined);

        const res = await fetch("/api/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: isAuthed ? undefined : form.phone,
                patientId: form.patientId ? Number(form.patientId) : undefined,
                serviceItemId: form.serviceItemId ? Number(form.serviceItemId) : undefined,
                city: undefined,
                time: form.time || undefined,
                notes: form.notes || undefined,
                patient: hasPatientData ? patientPayload : undefined,
            }),
        });

        if (!res.ok) {
            alert("خطا: ثبت نهایی ناموفق بود");
            return;
        }

        setShowSuccess(true);
    };

    const timeOptions = [
        { value: "immediate", label: "فوری" },
        { value: "today", label: "امروز" },
        { value: "custom", label: "تاریخ دلخواه" },
    ];

    const selectedTimeLabel = timeOptions.find((opt) => opt.value === form.time)?.label || "";
    const hasPhone = isAuthed ? true : isGuestPhoneValid(form.phone);

    return (
        <div className="flex flex-col min-h-screen px-4 py-6 pb-24">
            <h1 className="text-2xl font-bold text-center mb-6 text-primary">ثبت درخواست</h1>

            {step === 1 && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                        <div className="font-semibold text-primary mb-1">
                            {isAuthed ? "ثبت سریع با حساب کاربری" : "ثبت سریع فقط با شماره تماس"}
                        </div>
                        <p className="text-textSub leading-relaxed">
                            سایر اطلاعات اختیاری است و می‌توانید الان ثبت کنید یا در مرحله بعد کامل‌تر وارد کنید.
                        </p>
                    </div>

                    <BottomSheetSelect
                        label="دسته خدمت"
                        value={form.categoryId}
                        displayValue={form.categoryLabel}
                        placeholder="مثلاً خدمات پرستاری"
                        options={categoryOptions}
                        onSelect={(option) =>
                            setForm({
                                ...form,
                                categoryId: option.value,
                                categoryLabel: option.label,
                                serviceItemId: "",
                                serviceItemLabel: "",
                            })
                        }
                    />

                    <div className="flex flex-col gap-1">
                        <BottomSheetSelect
                            label="خدمت موردنظر"
                            value={form.serviceItemId}
                            displayValue={form.serviceItemLabel}
                            placeholder="مثلاً پرستار سالمند"
                            searchEnabled={true}
                            options={serviceOptions}
                            onSelect={(option) =>
                                setForm({ ...form, serviceItemId: option.value, serviceItemLabel: option.label })
                            }
                        />
                        <span className="text-xs text-textSub">
                            اگر خدمت مشخصی ندارید، این بخش را خالی بگذارید.
                        </span>
                    </div>

                    <BottomSheetSelect
                        label="زمان مورد نیاز"
                        value={form.time}
                        displayValue={selectedTimeLabel}
                        options={timeOptions}
                        onSelect={(option) => setForm({ ...form, time: option.value })}
                    />

                    {!isAuthed && (
                        <>
                            <label className="text-textSub text-sm flex items-center gap-2">
                                شماره تماس
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    فقط همین مورد اجباری است
                                </span>
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="09xxxxxxxx"
                                inputMode="numeric"
                                maxLength={11}
                                pattern="^09\\d{9}$"
                                className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </>
                    )}

                    {isAuthed && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
                            <BottomSheetSelect
                                label="انتخاب بیمار"
                                value={form.patientId}
                                displayValue={form.patientLabel}
                                placeholder="بیمار قبلی را انتخاب کنید"
                                options={patientOptions}
                                onSelect={(option) => {
                                    const selected = patients.find(
                                        (patient) => String(patient.id) === option.value,
                                    );
                                    setForm({
                                        ...form,
                                        patientId: option.value,
                                        patientLabel: option.label,
                                        nationalCode: selected?.nationalCode ?? "",
                                        firstName: selected?.firstName ?? "",
                                        lastName: selected?.lastName ?? "",
                                    });
                                }}
                            />
                            {form.patientId && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm({
                                            ...form,
                                            patientId: "",
                                            patientLabel: "",
                                            nationalCode: "",
                                            firstName: "",
                                            lastName: "",
                                        })
                                    }
                                    className="text-xs text-primary text-right"
                                >
                                    ثبت بیمار جدید
                                </button>
                            )}
                        </div>
                    )}

                    <label className="text-textSub text-sm">نام بیمار</label>
                    <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="نام"
                        disabled={Boolean(form.patientId)}
                        className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                    />

                    <label className="text-textSub text-sm">نام خانوادگی بیمار</label>
                    <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="نام خانوادگی"
                        disabled={Boolean(form.patientId)}
                        className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                    />

                    {form.patientId && (
                        <div className="text-xs text-textSub">
                            برای ثبت بیمار جدید، ابتدا روی «ثبت بیمار جدید» بزنید.
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="text-sm text-textSub mb-3">خلاصه درخواست</div>
                        <div className="grid gap-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-textSub">دسته خدمت</span>
                                <span className="text-textMain">{form.categoryLabel || "انتخاب نشده"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-textSub">خدمت</span>
                                <span className="text-textMain">{form.serviceItemLabel || "انتخاب نشده"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-textSub">زمان</span>
                                <span className="text-textMain">{selectedTimeLabel || "ثبت نشده"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-textSub">شماره تماس</span>
                                <span className="text-textMain">
                                    {isAuthed ? userPhone || "ثبت شده در حساب" : form.phone || "ثبت نشده"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-textSub">نام بیمار</span>
                                <span className="text-textMain">
                                    {`${form.firstName ?? ""} ${form.lastName ?? ""}`.trim() ||
                                        form.patientLabel ||
                                        "ثبت نشده"}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleSubmit}
                                disabled={!hasPhone}
                                className={`flex-1 py-3 rounded-2xl font-medium active:scale-95 transition ${hasPhone
                                    ? "bg-primary text-white"
                                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    }`}
                            >
                                ثبت سریع
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!hasPhone}
                                className={`flex-1 py-3 rounded-2xl font-medium active:scale-95 transition ${hasPhone
                                    ? "border border-primary text-primary"
                                    : "border border-gray-200 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                تکمیل جزئیات
                            </button>
                        </div>

                        {!hasPhone && (
                            <div className="mt-2 text-xs text-textSub">
                                برای فعال شدن دکمه‌ها، شماره تماس را وارد کنید.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-textSub">
                        تکمیل جزئیات اختیاری است و به ما کمک می‌کند سریع‌تر خدمت مناسب را اعزام کنیم.
                    </div>

                    <label className="text-textSub text-sm">کد ملی بیمار (اختیاری)</label>
                    <input
                        type="text"
                        name="nationalCode"
                        value={form.nationalCode}
                        onChange={handleChange}
                        placeholder="کد ملی"
                        disabled={Boolean(form.patientId)}
                        className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
                    />
                    {form.patientId && (
                        <div className="text-xs text-textSub">
                            برای تغییر کد ملی بیمار انتخاب‌شده، از بخش «بیماران من» استفاده کنید.
                        </div>
                    )}

                    <label className="text-textSub text-sm">سن بیمار</label>
                    <input
                        type="number"
                        name="age"
                        value={form.age}
                        onChange={handleChange}
                        placeholder="سن"
                        className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                    />

                    <BottomSheetSelect
                        label="جنسیت"
                        value={form.gender}
                        displayValue={
                            form.gender === "MALE"
                                ? "مرد"
                                : form.gender === "FEMALE"
                                    ? "زن"
                                    : form.gender === "OTHER"
                                        ? "سایر"
                                        : ""
                        }
                        options={[
                            { value: "MALE", label: "مرد" },
                            { value: "FEMALE", label: "زن" },
                            { value: "OTHER", label: "سایر" },
                        ]}
                        onSelect={(option) => setForm({ ...form, gender: option.value })}
                    />

                    <label className="text-textSub text-sm">توضیحات تکمیلی</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="در صورت نیاز توضیح دهید"
                        className="bg-bgcolor border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />

                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={handleBack}
                            className="flex-1 border border-primary text-primary py-3 rounded-2xl font-medium active:scale-95 transition order-2 md:order-1"
                        >
                            بازگشت
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition order-1 md:order-2"
                        >
                            ثبت نهایی
                        </button>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
                        <div className="text-lg font-semibold text-primary mb-2">درخواست ثبت شد</div>
                        <p className="text-sm text-textSub leading-relaxed mb-4">
                            درخواست شما با موفقیت ثبت شد. کارشناس ما به‌زودی با شما تماس خواهد گرفت.
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            className="w-full bg-primary text-white py-3 rounded-2xl font-medium active:scale-95 transition"
                        >
                            بازگشت به خانه
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

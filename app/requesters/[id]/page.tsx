"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";

type RequesterDetail = {
  id: number;
  phone: string;
  userId?: number | null;
  totalRequests?: number | null;
  lastRequestAt?: string | null;
  user?: { id: number; phone: string; firstName?: string | null; lastName?: string | null } | null;
  patient?: { id: number; firstName?: string | null; lastName?: string | null; nationalCode?: string | null } | null;
  requests?: {
    id: number;
    status?: string | null;
    createdAt: string;
    serviceItem?: { title: string } | null;
    patient?: { id: number; firstName?: string | null; lastName?: string | null; nationalCode?: string | null } | null;
  }[];
};

export default function RequesterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [requester, setRequester] = useState<RequesterDetail | null>(null);

  const requesterId = Number(params?.id);

  useEffect(() => {
    if (!requesterId) return;

    const load = async () => {
      const res = await fetch(`/api/requesters/${requesterId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) return;

      const data = await res.json();
      setRequester(data);
    };

    load();
  }, [requesterId, router]);

  if (!requester) {
    return <div className="p-6">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-xl font-bold text-primary">درخواست‌دهنده #{requester.id}</h1>
        <span className="absolute right-0 text-sm text-textSub">{requester.phone}</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">وضعیت حساب</div>
        {requester.userId ? (
          <div className="text-sm">حساب کاربری متصل است</div>
        ) : (
          <div className="text-sm text-red-600">حساب کاربری ندارد</div>
        )}
        <div className="text-xs text-textSub mt-2">
          مجموع درخواست‌ها: {requester.totalRequests ?? 0}
        </div>
        <div className="text-xs text-textSub">
          آخرین درخواست:{" "}
          {requester.lastRequestAt ? new Date(requester.lastRequestAt).toLocaleString() : "-"}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">بیمار مرتبط</div>
        {requester.patient ? (
          <Link className="text-primary" href={`/patients/${requester.patient.id}`}>
            {requester.patient.firstName || requester.patient.lastName
              ? `${requester.patient.firstName ?? ""} ${requester.patient.lastName ?? ""}`.trim()
              : requester.patient.nationalCode ?? ""}
          </Link>
        ) : (
          <div className="text-sm text-textSub">نامشخص</div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">تاریخچه درخواست‌ها</div>
        <div className="flex flex-col gap-2">
          {requester.requests?.map((req) => (
            <div key={req.id} className="border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-textSub">
                {req.serviceItem?.title ?? "بدون عنوان"}
              </div>
              <div className="text-xs text-textSub">وضعیت: {req.status ?? "-"}</div>
              <div className="text-xs text-textSub">
                {new Date(req.createdAt).toLocaleString()}
              </div>
              {req.patient && (
                <Link className="text-xs text-primary" href={`/patients/${req.patient.id}`}>
                  مشاهده بیمار
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

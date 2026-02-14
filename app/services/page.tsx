"use client";

import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";

type ServiceItem = {
  id: number;
  title: string;
};

type ServiceCategory = {
  id: number;
  title: string;
  items: ServiceItem[];
};

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/services/categories");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data);
    };

    load();
  }, []);

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 pb-24 md:pb-6 gap-6">
      <div className="flex items-center justify-between">
        <BackButton />
        <h1 className="text-2xl font-bold text-primary">آشنایی با خدمات</h1>
        <span />
      </div>

      <section className="text-sm text-textSub leading-relaxed">
        با انتخاب خدمت مناسب، سریع‌تر به نتیجه می‌رسید. در ادامه خدمات اصلی به‌صورت دسته‌بندی
        آمده تا راحت‌تر تصمیم بگیرید.
      </section>

      <div className="grid gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-primary mb-3">{cat.title}</div>
            <div className="grid gap-2">
              {cat.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm"
                >
                  <span>{item.title}</span>
                  <span className="text-xs text-textSub">جزئیات بیشتر</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">
        <div className="font-semibold text-primary mb-2">چرا نرسا؟</div>
        <ul className="list-disc pr-5 text-textSub space-y-1">
          <li>پرستاران تأییدشده و حرفه‌ای</li>
          <li>پیگیری دقیق کیفیت خدمات</li>
          <li>پشتیبانی واقعی در کنار شما</li>
        </ul>
      </section>
    </div>
  );
}

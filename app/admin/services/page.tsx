"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";

type ServiceItem = {
  id: number;
  title: string;
  price?: number | null;
  isActive: boolean;
};

type ServiceCategory = {
  id: number;
  title: string;
  sortOrder: number;
  isActive: boolean;
  items: ServiceItem[];
};

export default function AdminServicesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({ title: "", sortOrder: "" });
  const [itemForm, setItemForm] = useState({ title: "", price: "", categoryId: "" });

  const loadCategories = async () => {
    const res = await fetch("/api/services/categories?all=true");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const createCategory = async () => {
    await fetch("/api/services/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: categoryForm.title,
        sortOrder: categoryForm.sortOrder ? Number(categoryForm.sortOrder) : 0,
      }),
    });
    setCategoryForm({ title: "", sortOrder: "" });
    loadCategories();
  };

  const createItem = async () => {
    await fetch("/api/services/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: itemForm.title,
        price: itemForm.price ? Number(itemForm.price) : null,
        categoryId: Number(itemForm.categoryId),
      }),
    });
    setItemForm({ title: "", price: "", categoryId: "" });
    loadCategories();
  };

  const toggleCategory = async (id: number, isActive: boolean) => {
    await fetch(`/api/services/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadCategories();
  };

  const toggleItem = async (id: number, isActive: boolean) => {
    await fetch(`/api/services/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadCategories();
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 gap-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute left-0">
          <BackButton />
        </div>
        <h1 className="text-2xl font-bold text-primary">مدیریت خدمات</h1>
        <span className="absolute right-0" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">دسته‌بندی جدید</div>
        <input
          type="text"
          placeholder="عنوان"
          value={categoryForm.title}
          onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="number"
          placeholder="ترتیب"
          value={categoryForm.sortOrder}
          onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <button onClick={createCategory} className="bg-primary text-white rounded-lg py-2 text-sm">
          ایجاد دسته
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2">
        <div className="text-sm text-textSub">آیتم جدید</div>
        <select
          value={itemForm.categoryId}
          onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        >
          <option value="">انتخاب دسته</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="عنوان خدمت"
          value={itemForm.title}
          onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <input
          type="number"
          placeholder="قیمت (تومان)"
          value={itemForm.price}
          onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
          className="border border-gray-300 rounded-lg p-2 text-sm"
        />
        <button onClick={createItem} className="bg-primary text-white rounded-lg py-2 text-sm">
          ایجاد آیتم
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm text-textSub mb-2">لیست دسته‌ها</div>
        <div className="flex flex-col gap-3">
          {categories.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{c.title}</div>
                <button
                  onClick={() => toggleCategory(c.id, c.isActive)}
                  className="text-xs text-blue-600"
                >
                  {c.isActive ? "غیرفعال" : "فعال"}
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {c.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs text-textSub">
                    <span>{item.title}</span>
                    <button
                      onClick={() => toggleItem(item.id, item.isActive)}
                      className="text-xs text-blue-600"
                    >
                      {item.isActive ? "غیرفعال" : "فعال"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

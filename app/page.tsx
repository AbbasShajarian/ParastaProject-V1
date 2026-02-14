"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ServiceItem = {
  id: number;
  title: string;
};

type ServiceCategory = {
  id: number;
  title: string;
  items: ServiceItem[];
};

export default function HomePage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return;
      const session = await res.json();
      if (session?.user?.id) {
        setIsAuthed(true);
        setRoles((session?.user?.roles as string[]) ?? []);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/services/categories");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data);
      setActiveIndex(0);
    };

    load();
  }, []);

  useEffect(() => {
    if (categories.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [categories.length]);

  const buttons = useMemo(() => {
    if (!isAuthed) {
      return [
        { label: "ثبت درخواست پرستار", href: "/request", primary: true },
        { label: "آشنایی با خدمات", href: "/services" },
        { label: "ورود", href: "/login" },
        { label: "ثبت‌نام", href: "/register" },
      ];
    }

    const items: { label: string; href: string; primary?: boolean }[] = [];
    const has = (r: string) => roles.includes(r);

    if (has("ADMIN")) {
      items.push({ label: "مدیریت کاربران", href: "/admin/users" });
      items.push({ label: "مدیریت درخواست‌ها", href: "/requests", primary: true });
      items.push({ label: "مدیریت خدمات", href: "/admin/services" });
      return items;
    }

    if (has("EXPERT")) {
      items.push({ label: "درخواست‌های کارشناسی", href: "/requests", primary: true });
      items.push({ label: "بیماران", href: "/patients" });
      return items;
    }

    if (has("SUPPORT")) {
      items.push({ label: "درخواست‌های پشتیبانی", href: "/requests", primary: true });
      items.push({ label: "بیماران", href: "/patients" });
      return items;
    }

    if (has("CARE_GIVER")) {
      items.push({ label: "درخواست‌های من", href: "/requests", primary: true });
      return items;
    }

    items.push({ label: "ثبت درخواست پرستار", href: "/request", primary: true });
    items.push({ label: "آشنایی با خدمات", href: "/services" });
    items.push({ label: "تاریخچه من", href: "/dashboard" });
    return items;
  }, [isAuthed, roles]);

  const isSimpleUser =
    !isAuthed || roles.length === 0 || roles.every((role) => role === "USER");

  const getCategoryMeta = (title: string) => {
    const normalized = title.replace(/\s+/g, "");
    if (normalized.includes("پرستار") || normalized.includes("پرستاری")) {
      return {
        image: "/services/clinical-care.svg",
        description: "رسیدگی بالینی، تزریقات، پانسمان و مراقبت پس از عمل.",
      };
    }
    if (normalized.includes("مراقبت")) {
      return {
        image: "/services/daily-care.svg",
        description: "کمک در امور روزانه، همراهی، تغذیه و بهداشت فردی.",
      };
    }
    if (normalized.includes("نظافت") || normalized.includes("خانه")) {
      return {
        image: "/services/home-care.svg",
        description: "نظافت و رسیدگی به محیط زندگی سالمند با اولویت آرامش.",
      };
    }
    if (normalized.includes("پایش") || normalized.includes("بهداشت") || normalized.includes("سلامت")) {
      return {
        image: "/services/health-monitor.svg",
        description: "کنترل فشار، قند خون و علائم حیاتی در منزل.",
      };
    }
    if (normalized.includes("همراه") || normalized.includes("بیمارستان")) {
      return {
        image: "/services/companion.svg",
        description: "همراهی بیمار، پیگیری درمان و اطمینان خانواده.",
      };
    }
    return {
      image: "/services/default.svg",
      description: "خدمات تخصصی متناسب با نیاز سالمند در محل شما.",
    };
  };

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 pb-24 md:pb-6">
      <section className="text-center">
        <h2 className="text-2xl font-bold mb-4">پرستاری مطمئن در منزل</h2>
        <p className="text-textSub leading-relaxed">
          اعزام پرستاران تأییدشده برای سالمند، بیمار و خدمات تخصصی در منزل
        </p>
      </section>

      {isSimpleUser && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-textMain">دسته‌بندی خدمات</h3>
            <Link href="/services" className="text-xs text-primary">
              آشنایی با خدمات
            </Link>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm text-textSub">
              دسته‌های خدمات هنوز اضافه نشده‌اند. از بخش مدیریت خدمات اضافه کنید.
            </div>
          ) : (
            <div className="relative">
              <div className="relative h-[420px] sm:h-[380px]">
                {categories.map((cat, idx) => {
                  const meta = getCategoryMeta(cat.title);
                  const items = cat.items?.map((item) => item.title).filter(Boolean) ?? [];

                  return (
                    <div
                      key={cat.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${idx === activeIndex ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                    >
                      <div className="h-full rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                        <div className="relative h-44 sm:h-40">
                          <img
                            src={meta.image}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                          <div className="absolute bottom-3 right-3 left-3 text-white">
                            <div className="text-lg font-semibold">{cat.title}</div>
                            <div className="text-xs opacity-90">{meta.description}</div>
                          </div>
                        </div>

                        <div className="p-4 flex flex-col gap-3 text-right">
                          {items.length ? (
                            <div className="flex flex-wrap gap-2 text-xs text-textSub">
                              {items.slice(0, 4).map((title) => (
                                <span
                                  key={title}
                                  className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1"
                                >
                                  {title}
                                </span>
                              ))}
                              {items.length > 4 && (
                                <span className="text-xs text-textSub">و {items.length - 4} مورد دیگر</span>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-textSub">
                              هنوز خدمتی برای این دسته ثبت نشده است.
                            </div>
                          )}

                          <Link
                            href={`/request?categoryId=${cat.id}`}
                            className="inline-flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 py-2 text-sm font-medium text-primary transition hover:bg-primary/15 text-center"
                          >
                            ثبت درخواست این دسته
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="قبلی"
                onClick={() =>
                  setActiveIndex((prev) => (prev - 1 + categories.length) % categories.length)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-textMain shadow-md w-10 h-10 flex items-center justify-center transition hover:bg-white"
              >
                <span className="text-lg">‹</span>
              </button>
              <button
                type="button"
                aria-label="بعدی"
                onClick={() =>
                  setActiveIndex((prev) => (prev + 1) % categories.length)
                }
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 text-textMain shadow-md w-10 h-10 flex items-center justify-center transition hover:bg-white"
              >
                <span className="text-lg">›</span>
              </button>

              <div className="mt-3 flex items-center justify-center gap-2">
                {categories.map((cat, idx) => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-label={`اسلاید ${idx + 1}`}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-2 rounded-full transition ${idx === activeIndex ? "w-6 bg-primary" : "w-2 bg-gray-300"
                      }`}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="mt-8">
        <div className="flex flex-col gap-3 max-w-sm mx-auto w-full">
          {buttons.map((btn) => (
            <Link
              key={btn.href}
              href={btn.href}
              className="py-3 rounded-2xl text-lg font-medium transition active:scale-95 bg-primary text-white text-center"
            >
              {btn.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid grid-cols-3 gap-4 text-center text-xs text-textSub">
        <div>پرستاران تأییدشده</div>
        <div>اعزام سریع</div>
        <div>پشتیبانی واقعی</div>
      </section>
    </div>
  );
}

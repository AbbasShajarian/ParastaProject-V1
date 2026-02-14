"use client";

import { useRouter } from "next/navigation";
import { FiChevronLeft } from "react-icons/fi";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center text-textSub hover:text-primary transition"
      aria-label="بازگشت"
    >
      <FiChevronLeft size={20} />
    </button>
  );
}

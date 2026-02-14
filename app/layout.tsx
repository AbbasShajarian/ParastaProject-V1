import "./globals.css";
// import FloatingSupport from "../components/FloatingSupport";
import BottomNav from "@/components/BottomNav";


export const metadata = {
  title: "خدمات پرستاری در منزل",
  description: "پرستاری مطمئن در منزل",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-bgcolor text-textMain antialiased">
        <main className="min-h-screen mx-auto bg-bgcolor
                         w-full
                         px-4 md:px-0
                         pb-20 md:pb-6 md:pt-20">
          {children}
        </main>
        {/* Floating Support */}
        {/* <FloatingSupport /> */}
        {/* Bottom Nav */}
        <BottomNav />

      </body>
    </html>
  );
}

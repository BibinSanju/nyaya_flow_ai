import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AssistantSidebar from "@/components/assistant-sidebar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NyayaFlow | Court & Case Management Platform",
  description:
    "Electronic case filing, registry scrutiny, and daily cause-list management portal.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full dark`}>
      <body className="min-h-full flex flex-col text-neutral-100 relative antialiased bg-[#12100e]">
        {/* Courtroom Law Library Background (Fixed Layer) */}
        <div
          className="fixed inset-0 -z-10 pointer-events-none bg-cover bg-center bg-no-repeat bg-fixed opacity-40"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(18, 16, 14, 0.88) 0%, rgba(18, 16, 14, 0.95) 100%), url('/images/courtroom-bg.jpg')`,
            backgroundAttachment: "fixed",
          }}
        />

        <div className="relative z-10 flex-1 flex flex-col">
          {children}
        </div>

        {/* Floating Court Assistant */}
        <AssistantSidebar />
      </body>
    </html>
  );
}

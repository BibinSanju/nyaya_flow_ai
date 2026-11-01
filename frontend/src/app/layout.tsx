import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import AssistantSidebar from "@/components/assistant-sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NyayaFlow — Court case filing and tracking",
    template: "%s · NyayaFlow",
  },
  description:
    "File petitions, track cases by CNR, and manage court workflows for citizens, advocates, police, registry and judges.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f6f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        <div className="flex-1 flex flex-col">{children}</div>
        <AssistantSidebar />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "J·ATLAS - Joint All-Domain Threat Location & Awareness System",
  description: "An experimental command & control (C2) dashboard for real-time, cross-domain threat monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen relative selection:bg-zinc-800 selection:text-white pb-32`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(24,24,27,0.6),rgba(9,9,11,1))]"></div>
        <div className="absolute inset-0 -z-20 bg-grid-zinc [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

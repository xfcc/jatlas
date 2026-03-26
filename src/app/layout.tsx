import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";


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
      <body className={`${inter.className} min-h-screen relative selection:bg-zinc-800 selection:text-white`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--radial-gradient-start),var(--radial-gradient-end))]"></div>
        <div className="absolute inset-0 -z-20 bg-grid-zinc [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        {children}

      </body>
    </html>
  );
}

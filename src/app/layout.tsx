import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { projectConfig } from "@/config/project.config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: projectConfig.seo.title,
  description: projectConfig.seo.description,
  openGraph: {
    title: projectConfig.seo.title,
    description: projectConfig.seo.description,
    images: projectConfig.seo.image ? [projectConfig.seo.image] : undefined,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const defaultThemeClass =
    projectConfig.theme.defaultMode === "dark" || projectConfig.theme.preset !== "minimal-light" ? "dark" : "";

  return (
    <html
      lang="en"
      data-theme={projectConfig.theme.preset}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${defaultThemeClass} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

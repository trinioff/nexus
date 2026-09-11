import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS",
  description: "Spatial operating environment",
};

export const viewport: Viewport = {
  themeColor: "#03060d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-nexus-void text-nexus-white">{children}</body>
    </html>
  );
}

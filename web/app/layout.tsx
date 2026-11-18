import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Face Finder",
  description: "ค้นหารูปตัวเองจาก Google Drive",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-950">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "갈래 — 문제를 갈라 봅니다",
  description:
    "문제를 적으면 본질, 핵심 가지, 첫 한 걸음으로 구조분해해 시각화합니다. DeepSeek가 함께 사고합니다.",
  openGraph: {
    title: "갈래",
    description: "문제를 갈라 봅니다 · 구조분해 시각화",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="aurora-bg min-h-full antialiased">{children}</body>
    </html>
  );
}

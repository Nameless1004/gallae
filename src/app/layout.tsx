import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Re:Frame — 문제를 다시 보는 사고 도구",
  description:
    "문제를 적으면 본질, 핵심 가지, 검증 포인트, 첫 한 걸음으로 구조화해 시각화합니다.",
  openGraph: {
    title: "Re:Frame",
    description: "문제를 다시 보면, 다음 행동이 보입니다.",
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRT Terminal OS",
  description: "A standalone web-based WebGL terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

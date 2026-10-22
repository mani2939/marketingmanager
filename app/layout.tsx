import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Strozpy • Marketing Manager", template: "%s | Strozpy" },
  description: "One thoughtful workspace for your brands, content and growth.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

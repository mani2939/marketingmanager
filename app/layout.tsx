import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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
  const configured = Boolean(
    process.env.CLERK_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return (
    <html lang="en">
      <body>
        {configured ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}

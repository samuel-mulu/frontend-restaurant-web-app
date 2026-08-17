import ProtectedRoute from "@/components/protected-route";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { branding } from "@/config/branding";
import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: branding.name,
    template: `%s | ${branding.name}`,
  },
  description: `${branding.name} — juice-house management for POS, inventory, and orders`,
  openGraph: {
    title: branding.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lato.variable} antialiased`}>
        <Providers>
          <ProtectedRoute>{children}</ProtectedRoute>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

import ProtectedRoute from "@/components/protected-route";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { branding } from "@/config/branding";
import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: {
    default: branding.name,
    template: `%s | ${branding.name}`,
  },
  description: `${branding.name} — juice-house management for POS, inventory, and orders`,
  appleWebApp: {
    capable: true,
    title: branding.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
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

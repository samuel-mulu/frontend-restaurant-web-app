import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import ProtectedRoute from "@/components/protected-route";
import { Toaster } from "@/components/ui/toaster";

const lato = Lato({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Restaurant Management System",
  description:
    "Modern restaurant management system with POS, inventory, and order tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-slate-50">
      <body className={`${lato.variable} antialiased`}>
        <Providers>
          <ProtectedRoute>{children}</ProtectedRoute>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

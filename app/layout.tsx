import ProtectedRoute from "@/components/protected-route";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
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
  title: "kandino's kitchen | Management System",
  description:
    "Professional restaurant management system for kandino's kitchen - POS, inventory, and order tracking",
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

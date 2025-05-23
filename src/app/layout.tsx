import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/providers/AuthProvider";
import TokenRefreshProvider from "@/components/providers/TokenRefreshProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Remlo - Send money instantly",
  description: "Send and receive money instantly, simply, and securely with Remlo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        <AuthProvider>
          <TokenRefreshProvider />
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}

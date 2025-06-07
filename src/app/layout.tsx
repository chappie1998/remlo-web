import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AuthProvider from "@/components/providers/AuthProvider";
import TokenRefreshProvider from "@/components/providers/TokenRefreshProvider";
import AppWalletProvider from "@/components/AppWalletProvider";
import { OktoWalletProvider } from "@/components/providers/OktoWalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Remlo - Send Money Instantly on Solana",
  description: "Send and receive money instantly, simply, and securely with Remlo. Built on Solana blockchain with bank-level security and no hidden fees.",
  keywords: ["solana", "wallet", "payments", "crypto", "defi", "send money", "receive money", "blockchain"],
  authors: [{ name: "Remlo Team" }],
  creator: "Remlo",
  publisher: "Remlo",
  openGraph: {
    title: "Remlo - Send Money Instantly on Solana",
    description: "Send and receive money instantly, simply, and securely with Remlo. Built on Solana blockchain with bank-level security and no hidden fees.",
    url: "https://remlo.com",
    siteName: "Remlo",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Remlo - Send Money Instantly",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Remlo - Send Money Instantly on Solana",
    description: "Send and receive money instantly, simply, and securely with Remlo.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
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
          <OktoWalletProvider>
            <AppWalletProvider>
              <TokenRefreshProvider />
              {children}
              <Toaster position="top-right" richColors theme="dark" />
            </AppWalletProvider>
          </OktoWalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

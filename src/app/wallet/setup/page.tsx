"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { UniversalWalletSetup } from "@/components/universal/UniversalWalletSetup";

export default function WalletSetup() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Handle redirect if user already has wallet
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (session?.user?.hasPasscode && session?.user?.solanaAddress) {
      router.push("/wallet");
    }
  }, [status, session, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  // If user already has a wallet, show loading until redirect
  if (session?.user?.hasPasscode && session?.user?.solanaAddress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Redirecting to wallet...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-400 mb-2">
            Welcome to Remlo
          </h1>
          <p className="text-gray-400">
            Set up your universal wallet to start sending money instantly
          </p>
        </div>
        
        <UniversalWalletSetup />
      </div>
    </div>
  );
}

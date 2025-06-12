import { Suspense } from "react";
import Header from "@/components/header";
import CrossChainWallet from "@/components/CrossChainWallet";

export default function CrossChainWalletPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading cross-chain wallet...</p>
            </div>
          </div>
        }>
          <CrossChainWallet />
        </Suspense>
      </main>
    </div>
  );
} 
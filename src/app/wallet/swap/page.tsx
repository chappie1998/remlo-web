"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowLeftRight,
  ArrowRight,
  CircleDashed,
  Info,
  TrendingUp,
  PiggyBank
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";
import { isValidPasscode } from "@/lib/utils";
import Link from "next/link";

function SwapPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form inputs
  const [swapAmount, setSwapAmount] = useState("");
  const [tokenType, setTokenType] = useState(searchParams.get('from') === 'usds' ? 'usd' : 'usdc'); // "usdc" = USDC to USDs, "usd" = USDs to USDC
  const [passcode, setPasscode] = useState("");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [error, setError] = useState("");
  
  // Data states
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  
  // Animation state
  const [isRotating, setIsRotating] = useState(false);
  
  // Check authentication and fetch balances
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
    
    if (session?.user?.solanaAddress) {
      fetchBalances();
    }
  }, [status, session, router]);
  
  // Fetch token balances
  const fetchBalances = async () => {
    try {
      setIsLoading(true);

      // Use the optimized overview endpoint - only returns USDC and USDS
      const response = await fetch("/api/wallet/overview");
      if (response.ok) {
        const data = await response.json();
        setUsdcBalance(data.balances.usdc.formattedBalance);
        setUsdsBalance(data.balances.usds.formattedBalance);
      } else {
        console.error("Failed to fetch wallet overview");
        // Set default values if API fails
        setUsdcBalance("0.000000");
        setUsdsBalance("0.000000");
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Set default values if error occurs
      setUsdcBalance("0.000000");
      setUsdsBalance("0.000000");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validate form before opening passcode modal
  const validateForm = () => {
    // Reset error
    setError("");
    
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setError("Enter a valid amount to swap");
      return false;
    }

    // Check if user has enough balance for the swap
    if (tokenType === "usdc") {
      // USDC to USDs swap
      if (parseFloat(swapAmount) > parseFloat(usdcBalance)) {
        setError("Insufficient USDC balance for swap");
        return false;
      }
    } else {
      // USDs to USDC swap
      if (parseFloat(swapAmount) > parseFloat(usdsBalance)) {
        setError("Insufficient USDs balance for swap");
        return false;
      }
    }
    
    return true;
  };
  
  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setShowPasscodeModal(true);
    }
  };
  
  // Handle swap direction toggle
  const handleSwapDirection = () => {
    setIsRotating(true);
    setTokenType(tokenType === "usdc" ? "usd" : "usdc");
    
    // Reset rotation animation after it completes
    setTimeout(() => {
      setIsRotating(false);
    }, 300);
  };
  
  // Handle swap execution
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      // Determine which endpoint to use based on swap direction
      const endpoint = tokenType === "usdc"
        ? "/api/wallet/swap-usdc-to-usds"
        : "/api/wallet/swap-usds-to-usdc";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: swapAmount,
          passcode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Swap failed");
      }

      toast.success("Swap completed successfully!");
      setShowPasscodeModal(false);
      setPasscode("");
      setSwapAmount("");

      // Refresh balance
      fetchBalances();
      
      // Give time for visual confirmation before redirecting
      setTimeout(() => {
        router.push("/wallet");
      }, 2000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Swap failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading your account...</p>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = tokenType === "usdc" ? "Earn 4.2% APY" : "Convert USDs to USDC";

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="container mx-auto py-6 px-4 flex-1">
        <div className="max-w-lg mx-auto">
          {/* Back button and title */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/wallet" className="text-gray-400 hover:text-white transition-colors">
              <span className="flex items-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Wallet
              </span>
            </Link>
            <h1 className="text-xl font-medium text-white">{pageTitle}</h1>
          </div>
          
          {/* Swap card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center mb-6">
              <div className={`p-3 rounded-full ${tokenType === "usdc" ? "bg-emerald-900/50 text-emerald-400" : "bg-blue-900/50 text-blue-400"} mr-3`}>
                {tokenType === "usdc" ? <PiggyBank size={20} /> : <ArrowLeftRight size={20} />}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {tokenType === "usdc" ? "Swap USDC to USDs" : "Swap USDs to USDC"}
                </h2>
                {tokenType === "usdc" && (
                  <p className="text-xs text-emerald-400 flex items-center">
                    <TrendingUp size={12} className="mr-1" /> Earn 4.2% APY on your stablecoins
                  </p>
                )}
                {tokenType === "usd" && (
                  <p className="text-xs text-gray-400 flex items-center">
                    <Info size={12} className="mr-1" /> Convert back to USDC for spending
                  </p>
                )}
              </div>
            </div>
            
            {/* APY banner for USDC to USDs */}
            {tokenType === "usdc" && (
              <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 border border-emerald-800/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-emerald-800/50 text-emerald-300">
                    <PiggyBank size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-300 text-sm">4.2% Annual Yield</h3>
                    <p className="text-xs text-emerald-200/80">
                      USDs automatically earns interest. Swap your stablecoins to start earning.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Spending banner for USDs to USDC */}
            {tokenType === "usd" && (
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-800/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-blue-800/50 text-blue-300">
                    <ArrowLeftRight size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-300 text-sm">Access Your Funds</h3>
                    <p className="text-xs text-blue-200/80">
                      Convert USDs back to USDC when you need funds for spending or transfers.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleFormSubmit}>
              {/* Source token (From) */}
              <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">From</span>
                  <span className="text-xs text-gray-500">
                    Balance: {tokenType === "usdc" ? usdcBalance : usdsBalance} {tokenType === "usdc" ? "USDC" : "USDs"}
                  </span>
                </div>
                <div className="flex items-center bg-zinc-900 rounded-md p-3 border border-zinc-700">
                  <div className="pr-3 border-r border-zinc-700">
                    <div className="flex items-center gap-2">
                      {tokenType === "usdc" ? (
                        <>
                          <USDCIcon width={20} height={20} className="text-blue-400" />
                          <span className="font-medium text-gray-200 flex items-center">
                            USDC
                            <ArrowRight size={14} className="ml-1 text-emerald-400 opacity-70" />
                          </span>
                        </>
                      ) : (
                        <>
                          <USDsIcon width={20} height={20} className="text-emerald-400" />
                          <span className="font-medium text-gray-200 flex items-center">
                            USDs
                            <ArrowRight size={14} className="ml-1 text-blue-400 opacity-70" />
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="flex-1 bg-transparent border-0 text-right text-lg focus:outline-none text-gray-200 px-3"
                  />
                </div>
              </div>
              
              {/* Swap direction toggle */}
              <div className="flex justify-center my-4">
                <button 
                  type="button"
                  className="p-2 rounded-full bg-emerald-900/20 border border-emerald-900/30 hover:bg-emerald-900/40 active:bg-emerald-800/30 transition-colors relative group overflow-hidden"
                  onClick={handleSwapDirection}
                  title="Switch swap direction"
                >
                  <div className={`transition-all duration-300 ${isRotating ? 'rotate-180' : ''}`}>
                    <ArrowLeftRight size={20} className="text-emerald-400" />
                  </div>
                  <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-active:opacity-100 rounded-full transition-opacity duration-200"></div>
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800 text-xs text-gray-300 py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Switch direction
                  </span>
                </button>
              </div>
              
              {/* Destination token (To) */}
              <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">To</span>
                  <span className="text-xs text-gray-500">
                    Balance: {tokenType === "usdc" ? usdsBalance : usdcBalance} {tokenType === "usdc" ? "USDs" : "USDC"}
                  </span>
                </div>
                <div className="flex items-center bg-zinc-900 rounded-md p-3 border border-zinc-700">
                  <div className="pr-3 border-r border-zinc-700">
                    <div className="flex items-center gap-2">
                      {tokenType === "usdc" ? (
                        <>
                          <USDsIcon width={20} height={20} className="text-emerald-400" />
                          <span className="font-medium text-gray-200">USDs</span>
                        </>
                      ) : (
                        <>
                          <USDCIcon width={20} height={20} className="text-blue-400" />
                          <span className="font-medium text-gray-200">USDC</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-right text-lg text-gray-200 px-3">
                    {swapAmount ? (
                      tokenType === "usdc" 
                        ? (parseFloat(swapAmount) * 1.042).toFixed(6) // Apply bonus for USDC to USDs 
                        : parseFloat(swapAmount).toFixed(6)           // No bonus for USDs to USDC
                    ) : "0.00"}
                  </div>
                </div>
                {tokenType === "usdc" && (
                  <div className="mt-2 text-xs text-emerald-400 text-right">+4.2% bonus applied</div>
                )}
              </div>
              
              {/* Swap button */}
              <Button
                type="submit"
                disabled={isLoading || !swapAmount}
                className={`w-full py-3 rounded-md font-medium flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${tokenType === "usdc" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  tokenType === "usdc" ? (
                    <>
                      <TrendingUp size={16} />
                      Start Earning 4.2% APY
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={16} />
                      Convert USDs to USDC
                    </>
                  )
                )}
              </Button>
              
              {/* Information note */}
              <div className={`mt-4 border rounded-md p-3 text-sm 
                ${tokenType === "usdc" ? "bg-emerald-900/20 border-emerald-900/30 text-gray-300" : "bg-blue-900/20 border-blue-900/30 text-gray-300"}`}
              >
                <p className="flex items-start gap-2">
                  <Info size={16} className={`${tokenType === "usdc" ? "text-emerald-400" : "text-blue-400"} mt-0.5 flex-shrink-0`} />
                  {tokenType === "usdc" 
                    ? "By swapping USDC to USDs, you'll automatically earn 4.2% APY on your stablecoins. No lock-up period required."
                    : "Swap back to USDC whenever you need funds for spending or transfers. Your remaining USDs will continue earning."}
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
      
      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">
              {tokenType === "usdc" ? "Start Earning 4.2% APY" : "Convert USDs to USDC"}
            </h3>
            
            <p className="text-gray-400 mb-6">
              Enter your 6-digit passcode to swap {swapAmount} {tokenType === "usdc" ? "USDC to USDs" : "USDs to USDC"}
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-900 rounded-md text-red-300 text-sm">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSwap}>
              <div className="mb-4">
                <input
                  type="password"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Enter 6-digit passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-md text-white text-center text-xl tracking-wider"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscode("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  className={`flex-1 text-white ${tokenType === "usdc" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                  disabled={isLoading || !isValidPasscode(passcode)}
                >
                  {isLoading ? (
                    <>
                      <span className="mr-2">Processing</span>
                      <span className="animate-spin">
                        <CircleDashed size={16} />
                      </span>
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SwapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SwapPageContent />
    </Suspense>
  );
} 
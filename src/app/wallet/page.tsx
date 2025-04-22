"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import {
  shortenAddress,
  formatDate,
  isValidPasscode,
  copyToClipboard,
} from "@/lib/utils";
import { isValidSolanaAddress, SPL_TOKEN_ADDRESS } from "@/lib/solana";
import {
  ArrowDownUp,
  LineChart,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  RefreshCw,
} from "lucide-react";

interface Transaction {
  id: string;
  status: string;
  txData: string;
  signature?: string;
  createdAt: string;
}

export default function StableFiDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");

  // Token state
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [stableFiBalance, setStableFiBalance] = useState("0.00");
  const [swapAmount, setSwapAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"swap" | "send" | "receive">("swap");

  // Transaction state
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSwapFromUsdc, setIsSwapFromUsdc] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [currentTxStatus, setCurrentTxStatus] = useState("");

  // Projected earnings calculation
  const APY = 0.042; // 4.2% APY
  const [projectedEarnings, setProjectedEarnings] = useState({
    monthly: "0.00",
    yearly: "0.00",
  });

  // Fetch balances and transactions on mount or when session changes
  useEffect(() => {
    if (session?.user?.solanaAddress) {
      fetchUsdcBalance();
      fetchStableFiBalance();
      fetchTransactions();
    }
  }, [session]);

  // Calculate projected earnings whenever stableFiBalance changes
  useEffect(() => {
    const balanceNum = parseFloat(stableFiBalance) || 0;
    const yearly = (balanceNum * APY).toFixed(2);
    const monthly = (balanceNum * (APY / 12)).toFixed(2);
    setProjectedEarnings({
      yearly,
      monthly,
    });
  }, [stableFiBalance]);

  // Handle authentication redirects using useEffect for client-side only execution
  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    // If user doesn't have a wallet yet, redirect to setup
    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
  }, [status, session, router]);

  const fetchUsdcBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await fetch("/api/stablefi/usdc-balance");
      const data = await response.json();
      if (response.ok) {
        setUsdcBalance(data.balance ?? "0.00");
      } else {
        console.error("Failed to fetch USDC balance:", data.error);
      }
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchStableFiBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await fetch("/api/stablefi/balance");
      const data = await response.json();
      if (response.ok) {
        setStableFiBalance(data.balance ?? "0.00");
      } else {
        console.error("Failed to fetch StableFi balance:", data.error);
      }
    } catch (error) {
      console.error("Error fetching StableFi balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/stablefi/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  // Validate form inputs before proceeding
  const validateSwapForm = () => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setError("Enter a valid amount to swap");
      return false;
    }
    if (isSwapFromUsdc && parseFloat(swapAmount) > parseFloat(usdcBalance)) {
      setError("Insufficient USDC balance");
      return false;
    }
    if (!isSwapFromUsdc && parseFloat(swapAmount) > parseFloat(stableFiBalance)) {
      setError("Insufficient StableFi balance");
      return false;
    }
    return true;
  };

  const validateSendForm = () => {
    if (!recipient) {
      setError("Recipient address is required");
      return false;
    }
    if (!isValidSolanaAddress(recipient)) {
      setError("Invalid Solana address");
      return false;
    }
    if (!sendAmount || isNaN(parseFloat(sendAmount)) || parseFloat(sendAmount) <= 0) {
      setError("Enter a valid amount to send");
      return false;
    }
    if (parseFloat(sendAmount) > parseFloat(stableFiBalance)) {
      setError("Insufficient StableFi balance");
      return false;
    }
    return true;
  };

  // If loading, show loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading wallet...</p>
      </div>
    );
  }

  // Return null if we're redirecting (handled in useEffect above)
  if (
    status === "unauthenticated" ||
    (status === "authenticated" && !session?.user?.hasPasscode)
  ) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Redirecting...</p>
      </div>
    );
  }

  // Format transaction data for display
  const formatTxData = (txDataString: string) => {
    try {
      const txData = JSON.parse(txDataString);
      if (txData.type === "swap") {
        return (
          <>
            <ArrowDownUp className="inline w-4 h-4 mr-1 text-blue-500" />
            Swapped {txData.fromAmount} {txData.fromToken} to {txData.toAmount} {txData.toToken}
          </>
        );
      } else if (txData.type === "send") {
        return (
          <>
            <ArrowUp className="inline w-4 h-4 mr-1 text-green-500" />
            Sent {txData.amount} {txData.token} to {shortenAddress(txData.to)}
          </>
        );
      } else if (txData.type === "receive") {
        return (
          <>
            <ArrowDown className="inline w-4 h-4 mr-1 text-purple-500" />
            Received {txData.amount} {txData.token} from {shortenAddress(txData.from)}
          </>
        );
      }
      return "Unknown transaction";
    } catch (e) {
      return "Unknown transaction";
    }
  };

  // Open passcode modal when submitting forms
  const handleSwapFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateSwapForm()) {
      setShowPasscodeModal(true);
    }
  };

  const handleSendFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (validateSendForm()) {
      setShowPasscodeModal(true);
    }
  };

  // Handle the transaction (swap or send)
  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    setIsLoading(true);
    setCurrentTxStatus("Processing...");

    try {
      let endpoint = "";
      let body: any = {
        passcode,
      };

      if (activeTab === "swap") {
        endpoint = "/api/stablefi/swap";
        body.fromToken = isSwapFromUsdc ? "USDC" : "STABLEFI";
        body.toToken = isSwapFromUsdc ? "STABLEFI" : "USDC";
        body.amount = swapAmount;
      } else if (activeTab === "send") {
        endpoint = "/api/stablefi/send";
        body.to = recipient;
        body.amount = sendAmount;
      } else {
        setError("Unsupported operation");
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      setCurrentTxStatus("Transaction completed!");
      toast.success("Transaction successful!");
      setShowPasscodeModal(false);
      setPasscode("");
      setSwapAmount("");
      setRecipient("");
      setSendAmount("");

      // Refresh balances and transactions
      fetchUsdcBalance();
      fetchStableFiBalance();
      fetchTransactions();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      toast.error(errorMessage);
      setCurrentTxStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  // UI
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Account Overview */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">StableFi Dashboard</h2>
                <div className="flex flex-col items-end">
                  <span className="text-sm text-muted-foreground">
                    USDC Balance
                  </span>
                  <span className="text-xl font-bold">
                    {loadingBalance ? "Loading..." : `${usdcBalance} USDC`}
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">
                    StableFi Balance
                  </span>
                  <span className="text-lg font-bold">
                    {loadingBalance ? "Loading..." : `${stableFiBalance} STABLEFI`}
                  </span>
                </div>
              </div>
              <div className="bg-muted p-2 rounded break-all font-mono text-xs relative group">
                {session?.user?.solanaAddress || "Loading..."}
                <button
                  className="absolute right-2 top-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={async () => {
                    if (session?.user?.solanaAddress) {
                      const success = await copyToClipboard(
                        session.user.solanaAddress
                      );
                      if (success) {
                        toast.success("Address copied to clipboard");
                      } else {
                        toast.error("Failed to copy address");
                      }
                    }
                  }}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This is your Solana wallet address on{" "}
                {process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}.
              </p>
            </div>

            {/* Tabs: Swap / Send / Receive */}
            <div className="p-6 border rounded-lg">
              <div className="flex space-x-4 mb-6">
                <button
                  className={`px-4 py-2 rounded font-semibold ${
                    activeTab === "swap"
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground"
                  }`}
                  onClick={() => setActiveTab("swap")}
                >
                  <ArrowDownUp className="inline w-4 h-4 mr-1" />
                  Swap
                </button>
                <button
                  className={`px-4 py-2 rounded font-semibold ${
                    activeTab === "send"
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground"
                  }`}
                  onClick={() => setActiveTab("send")}
                >
                  <ArrowUp className="inline w-4 h-4 mr-1" />
                  Send
                </button>
                <button
                  className={`px-4 py-2 rounded font-semibold ${
                    activeTab === "receive"
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground"
                  }`}
                  onClick={() => setActiveTab("receive")}
                >
                  <ArrowDown className="inline w-4 h-4 mr-1" />
                  Receive
                </button>
              </div>

              {activeTab === "swap" && (
                <form
                  onSubmit={handleSwapFormSubmit}
                  className="space-y-4 max-w-md"
                >
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded ${
                        isSwapFromUsdc
                          ? "bg-primary text-white"
                          : "bg-muted text-foreground"
                      }`}
                      onClick={() => setIsSwapFromUsdc(true)}
                    >
                      USDC
                    </button>
                    <ArrowDownUp className="w-5 h-5" />
                    <button
                      type="button"
                      className={`px-3 py-1 rounded ${
                        !isSwapFromUsdc
                          ? "bg-primary text-white"
                          : "bg-muted text-foreground"
                      }`}
                      onClick={() => setIsSwapFromUsdc(false)}
                    >
                      STABLEFI
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Amount
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {isSwapFromUsdc
                      ? "Swap USDC → StableFi"
                      : "Swap StableFi → USDC"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Instant, gasless swaps powered by StableFi protocol.
                  </p>
                </form>
              )}

              {activeTab === "send" && (
                <form
                  onSubmit={handleSendFormSubmit}
                  className="space-y-4 max-w-md"
                >
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Solana address (e.g., 3Dru...y149)"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Amount (STABLEFI)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Send STABLEFI
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Gasless transfer to any Solana address.
                  </p>
                </form>
              )}

              {activeTab === "receive" && (
                <div className="space-y-3 max-w-md">
                  <p className="text-sm text-muted-foreground">
                    Share your wallet address to receive USDC or StableFi tokens.
                  </p>
                  <div className="bg-muted p-2 rounded break-all font-mono text-xs relative group">
                    {session?.user?.solanaAddress || "Loading..."}
                    <button
                      className="absolute right-2 top-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={async () => {
                        if (session?.user?.solanaAddress) {
                          const success = await copyToClipboard(
                            session.user.solanaAddress
                          );
                          if (success) {
                            toast.success("Address copied to clipboard");
                          } else {
                            toast.error("Failed to copy address");
                          }
                        }
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mt-4">
                  {error}
                </div>
              )}
            </div>

            {/* Projected Earnings */}
            <div className="p-6 border rounded-lg flex items-center space-x-4">
              <LineChart className="w-10 h-10 text-green-600" />
              <div>
                <div className="font-bold text-lg">
                  Projected Earnings (4.2% APY)
                </div>
                <div className="flex space-x-6 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Monthly: <span className="font-semibold text-green-700">{projectedEarnings.monthly} STABLEFI</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Yearly: <span className="font-semibold text-green-700">{projectedEarnings.yearly} STABLEFI</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction history */}
          <div className="md:col-span-1">
            <div className="p-6 border rounded-lg h-full">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Transaction History
                <button
                  className="ml-auto"
                  title="Refresh"
                  onClick={() => {
                    fetchUsdcBalance();
                    fetchStableFiBalance();
                    fetchTransactions();
                  }}
                >
                  <RefreshCw className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </button>
              </h2>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === "executed"
                              ? "bg-green-100 text-green-800"
                              : tx.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tx.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm mt-1">{formatTxData(tx.txData)}</div>
                      {tx.signature && (
                        <div className="flex flex-col space-y-1 mt-1">
                          <a
                            href={`https://solscan.io/tx/${
                              tx.signature
                            }?cluster=${
                              process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 inline-flex items-center w-fit"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View on Solscan
                          </a>
                          <a
                            href={`https://explorer.solana.com/tx/${
                              tx.signature
                            }?cluster=${
                              process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-block"
                          >
                            View on Explorer
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No transactions yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Passcode modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Enter your passcode</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your 6-digit passcode to authorize this transaction.
            </p>

            {currentTxStatus && (
              <div className="p-3 rounded bg-blue-100 text-blue-800 text-sm mb-4">
                {currentTxStatus}
              </div>
            )}

            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={passcode}
                onChange={(e) =>
                  setPasscode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                }
                className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary text-center text-xl tracking-widest"
                placeholder="******"
                autoFocus
              />

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscode("");
                    setError("");
                    setCurrentTxStatus("");
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? "Processing..." : "Confirm"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

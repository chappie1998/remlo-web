"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { shortenAddress, formatDate, isValidPasscode, copyToClipboard } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Wallet,
  ArrowRightLeft,
  Info
} from "lucide-react";

interface Transaction {
  id: string;
  status: string;
  txData: string;
  signature?: string;
  createdAt: string;
}

export default function WalletDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState("0.0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user?.solanaAddress) {
      fetchBalance();
      fetchTransactions();
    }
  }, [session]);

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

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await fetch("/api/wallet/balance");
      const data = await response.json();
      if (response.ok) {
        setBalance(data.formattedBalance);
      } else {
        console.error("Failed to fetch balance:", data.error);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/wallet/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
    toast.success("Wallet data refreshed");
    setRefreshing(false);
  };

  // Validate form inputs before proceeding
  const validateSendForm = () => {
    if (!recipient) {
      setError("Recipient address is required");
      return false;
    }

    if (!isValidSolanaAddress(recipient)) {
      setError("Invalid Solana address");
      return false;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Enter a valid amount");
      return false;
    }

    return true;
  };

  // If loading, show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/80">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-primary" />
            </div>
            <p className="text-lg">Loading your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  // Return null if we're redirecting (handled in useEffect above)
  if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.hasPasscode)) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/80">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-pulse">
              <ArrowRightLeft size={32} className="text-primary" />
            </div>
            <p className="text-lg">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/wallet/send-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          amount,
          passcode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      toast.success("Transaction sent successfully!");
      setShowPasscodeModal(false);
      setPasscode("");
      setRecipient("");
      setAmount("");

      // Refresh balance and transactions
      fetchBalance();
      fetchTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Format transaction data for display
  const formatTxData = (txDataString: string) => {
    try {
      const txData = JSON.parse(txDataString);
      return `${txData.amount} SOL to ${shortenAddress(txData.to)}`;
    } catch (e) {
      return "Unknown transaction";
    }
  };

  // Open passcode modal when submitting the send form
  const handleSendFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (validateSendForm()) {
      setShowPasscodeModal(true);
    }
  };

  // Get transaction status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'executed':
        return <CheckCircle2 className="text-green-500" size={16} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={16} />;
      default:
        return <XCircle className="text-red-500" size={16} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/80">
      <Header />

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Dashboard Header with Balance */}
        <div className="mb-8 p-6 rounded-xl bg-card border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mt-4 -mr-4"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-1">Your Wallet</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
                  </span>
                  <span>•</span>
                  <span className="hover:text-primary transition cursor-pointer flex items-center gap-1"
                    onClick={refreshData}>
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  </span>
                </p>
              </div>
              <div className="mt-4 md:mt-0 md:text-right">
                <p className="text-muted-foreground text-sm">Total Balance</p>
                <div className="flex items-end gap-2 md:justify-end">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    {loadingBalance ? "..." : balance}
                  </h2>
                  <span className="text-xl font-medium text-muted-foreground">SOL</span>
                </div>
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur border p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2 group relative">
              <div className="p-1 bg-primary/10 rounded text-primary">
                <Wallet size={16} />
              </div>
              <div className="font-mono text-xs sm:text-sm break-all flex-1 max-w-full overflow-hidden">
                {session?.user?.solanaAddress || "Loading..."}
              </div>
              <button
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium flex items-center gap-1 hover:bg-primary/90 transition"
                onClick={async () => {
                  if (session?.user?.solanaAddress) {
                    const success = await copyToClipboard(session.user.solanaAddress);
                    if (success) {
                      toast.success("Address copied to clipboard");
                    } else {
                      toast.error("Failed to copy address");
                    }
                  }
                }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>
        </div>

        {/* Tabs for different sections */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm relative ${
              activeTab === "overview"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative ${
              activeTab === "send"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("send")}
          >
            Send
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative ${
              activeTab === "transactions"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab("send")}
                  className="flex flex-col items-center justify-center p-4 bg-primary/5 hover:bg-primary/10 rounded-lg transition group"
                >
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition">
                    <ArrowUpCircle size={24} />
                  </div>
                  <span className="font-medium">Send</span>
                </button>

                <Link href="/about" className="flex flex-col items-center justify-center p-4 bg-card hover:bg-muted rounded-lg border transition group">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 group-hover:bg-primary/20 transition">
                    <Info size={24} />
                  </div>
                  <span className="font-medium">About</span>
                </Link>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Transactions</h2>
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => setActiveTab("transactions")}
                >
                  View all <ArrowRightLeft size={12} />
                </button>
              </div>

              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition">
                      <div className="mr-3">
                        {getStatusIcon(tx.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{formatTxData(tx.txData)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>
                      {tx.signature && (
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline ml-2"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ArrowRightLeft size={24} className="text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                    <p className="text-xs text-muted-foreground">Your transaction history will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Send Tab */}
        {activeTab === "send" && (
          <div className="max-w-lg mx-auto bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-primary/10 text-primary mr-3">
                <ArrowUpCircle size={20} />
              </div>
              <h2 className="text-xl font-semibold">Send SOL</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSendFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="recipient" className="text-sm font-medium flex items-center">
                  Recipient Address <span className="text-destructive ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    id="recipient"
                    type="text"
                    required
                    placeholder="Enter Solana address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-3 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary pr-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Enter a valid Solana wallet address</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium flex items-center">
                  Amount (SOL) <span className="text-destructive ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary pr-16"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 font-medium text-muted-foreground text-sm">
                    SOL
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Amount to send</span>
                  <span>Balance: {loadingBalance ? "..." : balance} SOL</span>
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full mt-4 text-primary-foreground">
                Continue to Confirm
              </Button>
            </form>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Transaction History</h2>

            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 border rounded-lg hover:bg-muted/50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className="text-sm font-medium ml-2">{tx.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)}
                      </span>
                    </div>
                    <p className="text-base font-medium mb-2">{formatTxData(tx.txData)}</p>
                    {tx.signature && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md hover:bg-primary/20 inline-flex items-center"
                        >
                          <ExternalLink size={12} className="mr-1" /> View on Solscan
                        </a>
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md hover:bg-muted/80 inline-flex items-center"
                        >
                          <ExternalLink size={12} className="mr-1" /> Solana Explorer
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-muted mb-3">
                  <ArrowRightLeft size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No transactions yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  When you send or receive SOL, your transactions will appear here
                </p>
                <Button
                  onClick={() => setActiveTab("send")}
                  className="mt-4"
                  variant="outline"
                >
                  Send your first transaction
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Passcode modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-background rounded-xl p-6 w-full max-w-md shadow-xl border animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-primary/10 text-primary mr-3">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Confirm Transaction</h2>
                <p className="text-sm text-muted-foreground">Enter your 6-digit passcode</p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <span className="font-mono text-xs">{shortenAddress(recipient)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSendTransaction} className="space-y-4">
              <div>
                <label htmlFor="passcode" className="text-sm font-medium block mb-2">
                  Passcode
                </label>
                <div className="relative">
                  <input
                    id="passcode"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="w-full p-3 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary text-center text-xl tracking-[1em] font-mono"
                    placeholder="······"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit passcode you set up with your wallet
                </p>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscode("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm & Send"
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

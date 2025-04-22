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
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading wallet...</p>
      </div>
    );
  }

  // Return null if we're redirecting (handled in useEffect above)
  if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.hasPasscode)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Redirecting...</p>
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Wallet info */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Wallet Address</h2>
                <div className="flex flex-col items-end">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-xl font-bold">
                    {loadingBalance ? "Loading..." : `${balance} SOL`}
                  </p>
                </div>
              </div>
              <div className="bg-muted p-2 rounded break-all font-mono text-xs relative group">
                {session?.user?.solanaAddress || "Loading..."}
                <button
                  className="absolute right-2 top-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                  Copy
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This is your Solana wallet address on {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-bold mb-4">Send SOL</h2>
              <form onSubmit={handleSendFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="recipient" className="text-sm font-medium">
                    Recipient Address
                  </label>
                  <input
                    id="recipient"
                    type="text"
                    required
                    placeholder="Solana address (e.g., 3Dru...y149)"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Amount (SOL)
                  </label>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button type="submit" className="w-full">
                  Send Transaction
                </Button>
              </form>
            </div>
          </div>

          {/* Transaction history */}
          <div className="md:col-span-1">
            <div className="p-6 border rounded-lg h-full">
              <h2 className="text-xl font-bold mb-4">Transaction History</h2>
              <div className="space-y-3">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="p-3 border rounded">
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === 'executed'
                              ? 'bg-green-100 text-green-800'
                              : tx.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(tx.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{formatTxData(tx.txData)}</p>
                      {tx.signature && (
                        <div className="flex flex-col space-y-1 mt-1">
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 inline-flex items-center w-fit"
                          >
                            View on Solscan
                          </a>
                          <a
                            href={`https://explorer.solana.com/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
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

            {error && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSendTransaction} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
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
                  {isLoading ? "Sending..." : "Confirm"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

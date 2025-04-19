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
import { DEVNET_TEST_TOKENS } from "@/lib/token";

interface TokenData {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance: number;
  formattedBalance: string;
}

interface Transaction {
  id: string;
  status: string;
  txData: string;
  signature?: string;
  createdAt: string;
}

export default function TokenWalletDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [useRelayer, setUseRelayer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [relayerStatus, setRelayerStatus] = useState({
    initialized: false,
    publicKey: "",
    formattedBalance: "0",
  });

  useEffect(() => {
    // Only fetch data if we have a session with a Solana address
    // and not already loading tokens
    if (session?.user?.solanaAddress && !loadingTokens && status === "authenticated") {
      console.log("Fetching token data for address:", session.user.solanaAddress);
      fetchTokens();
      fetchTransactions();
      checkRelayerStatus();
    }
  }, [session?.user?.solanaAddress, status]); // Only depend on the address and auth status

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

  const fetchTokens = async () => {
    try {
      setLoadingTokens(true);
      const response = await fetch("/api/wallet/token-balance");
      const data = await response.json();
      if (response.ok) {
        setTokens(data.tokens || []);

        // Select the first token by default
        if (data.tokens?.length > 0 && !selectedToken) {
          setSelectedToken(data.tokens[0].address);
        }
      } else {
        console.error("Failed to fetch tokens:", data.error);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/wallet/transactions");
      if (response.ok) {
        const data = await response.json();
        // Filter transactions to show only token transfers
        const tokenTxs = (data.transactions || []).filter((tx: Transaction) => {
          try {
            const txData = JSON.parse(tx.txData);
            return !!txData.tokenMint; // Only include transactions with tokenMint
          } catch {
            return false;
          }
        });
        setTransactions(tokenTxs);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const checkRelayerStatus = async () => {
    try {
      const response = await fetch("/api/relayer/status");
      if (response.ok) {
        const data = await response.json();
        setRelayerStatus({
          initialized: data.initialized,
          publicKey: data.publicKey || "",
          formattedBalance: data.formattedBalance || "0",
        });
      }
    } catch (error) {
      console.error("Error checking relayer status:", error);
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

    if (!selectedToken) {
      setError("Please select a token");
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

    if (!selectedToken) {
      setError("Please select a token");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/wallet/send-token-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          amount,
          tokenMint: selectedToken,
          passcode,
          useRelayer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      toast.success("Token transaction sent successfully!");
      setShowPasscodeModal(false);
      setPasscode("");
      setRecipient("");
      setAmount("");

      // Refresh tokens and transactions
      fetchTokens();
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

      // Check if it's a token transaction
      if (txData.tokenMint) {
        const token = tokens.find(t => t.address === txData.tokenMint);
        const symbol = token?.symbol || "Unknown";
        return `${txData.amount} ${symbol} to ${shortenAddress(txData.to)}`;
      }

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

  // Get the selected token data
  const getSelectedTokenData = () => {
    return tokens.find(token => token.address === selectedToken);
  };

  const selectedTokenData = getSelectedTokenData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Token Wallet</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/wallet">SOL Wallet</Link>
            </Button>
            <Button variant="default" asChild>
              <Link href="/wallet/tokens">SPL Tokens</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Wallet info */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 border rounded-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">Wallet Address</h2>
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

            {/* Token balances */}
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-bold mb-4">Token Balances</h2>
              {loadingTokens ? (
                <p>Loading tokens...</p>
              ) : tokens.length > 0 ? (
                <div className="space-y-4">
                  {tokens.map((token) => (
                    <div key={token.address} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {token.logoURI && (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium">{token.name}</div>
                          <div className="text-sm text-muted-foreground">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{token.formattedBalance}</div>
                        <div className="text-sm text-muted-foreground">
                          {shortenAddress(token.address)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No tokens found.</p>
              )}
            </div>

            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-bold mb-4">Send Tokens</h2>
              <form onSubmit={handleSendFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="token" className="text-sm font-medium">
                    Select Token
                  </label>
                  <select
                    id="token"
                    required
                    value={selectedToken || ""}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a token</option>
                    {tokens.map((token) => (
                      <option key={token.address} value={token.address}>
                        {token.symbol} - {token.formattedBalance}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Amount {selectedTokenData ? `(${selectedTokenData.symbol})` : ""}
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

                {relayerStatus.initialized && (
                  <div className="flex items-center space-x-2">
                    <input
                      id="useRelayer"
                      type="checkbox"
                      checked={useRelayer}
                      onChange={(e) => setUseRelayer(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="useRelayer" className="text-sm font-medium">
                      Use gasless transaction (relayer pays gas)
                    </label>
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full">
                  Send Transaction
                </Button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Relayer status */}
            <div className="p-6 border rounded-lg">
              <h2 className="text-lg font-bold mb-4">Relayer Status</h2>
              {relayerStatus.initialized ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Relayer address:</div>
                    <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                      {relayerStatus.publicKey}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Balance:</span>
                    <span>{relayerStatus.formattedBalance} SOL</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="text-muted-foreground">Relayer not active</div>
                  <p className="text-xs mt-2">
                    The relayer is not initialized. Your transactions will use your own SOL for gas fees.
                  </p>
                </div>
              )}
            </div>

            {/* Transaction history */}
            <div className="p-6 border rounded-lg h-full">
              <h2 className="text-lg font-bold mb-4">Token Transaction History</h2>
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
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No token transactions yet.
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

"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { shortenAddress, formatDate, isValidPasscode, copyToClipboard } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import QRCode from 'react-qr-code';
import {
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  ArrowLeftRight,
  ArrowDown,
  Info,
  ChevronDown,
  PiggyBank,
  Percent,
  TrendingUp,
  Download,
  Filter,
} from "lucide-react";
import { USDsIcon, USDCIcon, SwapIcon, ReceiveIcon, SendIcon, SolanaIcon } from "@/components/icons";

// Define interfaces
interface Transaction {
  id: string;
  status: string;
  txData: string;
  signature?: string;
  createdAt: string;
}

interface TokenBalance {
  tokenSymbol: string;
  balance: string;
  usdValue: string;
  icon: React.ReactNode;
}

export default function WalletDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("usds"); // "usds" or "usdc"
  const [swapAmount, setSwapAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Balance states
  const [solBalance, setSolBalance] = useState("0.0");
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  // Calculate the total balance in USD (assuming 1 USDC = 1 USDs = $1)
  const totalUsdBalance = parseFloat(usdsBalance) + parseFloat(usdcBalance);

  useEffect(() => {
    if (session?.user?.solanaAddress) {
      fetchBalances();
      fetchTransactions();
    }
  }, [session]);

  // Handle authentication redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
  }, [status, session, router]);

  const fetchBalances = async () => {
    try {
      setLoadingBalance(true);
      // Fetch SOL balance
      const solResponse = await fetch("/api/wallet/balance");
      if (solResponse.ok) {
        const solData = await solResponse.json();
        setSolBalance(solData.formattedBalance);
      }

      // Fetch token balance (treat this as USDC for demonstration)
      const tokenResponse = await fetch("/api/wallet/token-balance");
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        setUsdcBalance(tokenData.formattedBalance);

        // For demonstration, show a simulated USDs balance (normally this would be fetched separately)
        // We'll simulate that users have more USDs than USDC as if they have already swapped
        const usdsFactor = 2.5; // Show 2.5x of USDC balance as USDs
        setUsdsBalance((parseFloat(tokenData.formattedBalance) * usdsFactor).toFixed(6));
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
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
    await Promise.all([fetchBalances(), fetchTransactions()]);
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

    // Check if there are sufficient funds
    if (tokenType === "usds" && parseFloat(amount) > parseFloat(usdsBalance)) {
      setError("Insufficient USDs balance");
      return false;
    } else if (tokenType === "usdc" && parseFloat(amount) > parseFloat(usdcBalance)) {
      setError("Insufficient USDC balance");
      return false;
    }

    return true;
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirecting state
  if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.hasPasscode)) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-pulse">
              <ArrowLeftRight size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Redirecting...</p>
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
      // Determine which endpoint to use based on token type
      const endpoint = tokenType === "usdc"
        ? "/api/wallet/send-token-transaction"
        : "/api/wallet/send-transaction"; // Assuming USDs use the regular SOL transaction endpoint for now

      const response = await fetch(endpoint, {
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
      fetchBalances();
      fetchTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate a swap from USDC to USDs
  const handleSwap = () => {
    if (!swapAmount || isNaN(parseFloat(swapAmount)) || parseFloat(swapAmount) <= 0) {
      setError("Enter a valid amount to swap");
      return;
    }

    if (parseFloat(swapAmount) > parseFloat(usdcBalance)) {
      setError("Insufficient USDC balance for swap");
      return;
    }

    setIsLoading(true);

    // Simulate a swap with a delay
    setTimeout(() => {
      const swapAmountNum = parseFloat(swapAmount);
      setUsdcBalance((parseFloat(usdcBalance) - swapAmountNum).toFixed(6));

      // Add swapped amount to USDs with 4.2% bonus
      const bonusRate = 1.042; // 4.2% bonus
      setUsdsBalance((parseFloat(usdsBalance) + (swapAmountNum * bonusRate)).toFixed(6));

      setSwapAmount("");
      setIsLoading(false);
      toast.success(`Successfully swapped ${swapAmount} USDC to USDs with 4.2% bonus!`);
    }, 1500);
  };

  // Format transaction data for display
  const formatTxData = (txDataString: string) => {
    try {
      const txData = JSON.parse(txDataString);
      return `${txData.amount} ${txData.token ? 'USDC' : 'SOL'} to ${shortenAddress(txData.to)}`;
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

  const tokenBalances: TokenBalance[] = [
    {
      tokenSymbol: "USDs",
      balance: usdsBalance,
      usdValue: `$${parseFloat(usdsBalance).toFixed(2)}`,
      icon: <USDsIcon className="text-emerald-400" />
    },
    {
      tokenSymbol: "USDC",
      balance: usdcBalance,
      usdValue: `$${parseFloat(usdcBalance).toFixed(2)}`,
      icon: <USDCIcon className="text-blue-400" />
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-6xl">
        {/* Dashboard Header with Balance */}
        <div className="mb-8 p-6 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-900/20 rounded-bl-full -mt-4 -mr-4"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold mb-1 text-white">Your Wallet</h1>
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-0.5 rounded">
                    {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}
                  </span>
                  <span>•</span>
                  <span
                    className="hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
                    onClick={refreshData}
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                    <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  </span>
                </p>
              </div>
              <div className="mt-4 md:mt-0 md:text-right">
                <p className="text-gray-400 text-sm">Total Balance</p>
                <div className="flex items-end gap-2 md:justify-end">
                  <h2 className="text-3xl md:text-4xl font-bold text-white">
                    ${loadingBalance ? "..." : totalUsdBalance.toFixed(2)}
                  </h2>
                  <span className="text-xl font-medium text-gray-400">USD</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-2 group relative">
              <div className="p-1 bg-emerald-900/30 rounded text-emerald-400">
                <SolanaIcon className="h-5 w-5" />
              </div>
              <div className="font-mono text-xs sm:text-sm break-all flex-1 max-w-full overflow-hidden text-gray-300">
                {session?.user?.solanaAddress || "Loading..."}
              </div>
              <button
                className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-1 hover:bg-emerald-600 transition"
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

        {/* Token Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {tokenBalances.map((token) => (
            <div
              key={token.tokenSymbol}
              className={`p-5 border rounded-xl flex items-center gap-4 relative ${
                token.tokenSymbol === 'USDs'
                  ? 'bg-emerald-900/20 border-emerald-800'
                  : 'bg-blue-900/20 border-blue-800'
              }`}
            >
              {token.tokenSymbol === 'USDs' && (
                <div className="absolute -top-3 -right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center shadow-lg">
                  <Percent size={12} className="mr-1" /> 4.2% APY
                </div>
              )}
              <div className={`p-3 rounded-full ${
                token.tokenSymbol === 'USDs' ? 'bg-emerald-900/30' : 'bg-blue-900/30'
              }`}>
                {token.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">{token.tokenSymbol}</p>
                <p className="text-xl font-bold text-white">{token.balance}</p>
                <p className="text-xs text-gray-400">{token.usdValue}</p>
                {token.tokenSymbol === 'USDs' && (
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-emerald-400 flex items-center">
                      <TrendingUp size={12} className="mr-1" /> Earning 4.2% APY
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs for different sections */}
        <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "overview"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "send"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("send")}
          >
            Send
          </button>
          <Link
            href="/wallet/receive"
            className="px-4 py-2 font-medium text-sm relative whitespace-nowrap text-gray-400 hover:text-gray-300"
          >
            Receive
          </Link>
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "swap"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("swap")}
          >
            Swap
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "transactions"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* New APY Highlight Banner */}
            <div className="bg-gradient-to-r from-emerald-800/70 to-emerald-900/70 border border-emerald-700 rounded-xl p-6 shadow-md">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="p-3 bg-emerald-800/70 rounded-full text-emerald-300">
                  <PiggyBank size={30} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-bold text-emerald-100 flex items-center gap-2">
                    Earn 4.2% APY
                    <span className="bg-emerald-700/70 text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                      <Percent size={12} className="inline mr-1" /> Highest rate
                    </span>
                  </h3>
                  <p className="text-emerald-200 mt-1">
                    Convert your USDC to USDs and start earning 4.2% APY automatically. No lock-up period, no minimum deposit.
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab("swap")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 flex items-center gap-2 whitespace-nowrap"
                >
                  <TrendingUp size={16} />
                  Swap Now
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveTab("send")}
                    className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition group"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <SendIcon size={24} />
                    </div>
                    <span className="font-medium text-white">Send</span>
                  </button>

                  <Link
                    href="/wallet/receive"
                    className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition group"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <ReceiveIcon size={24} />
                    </div>
                    <span className="font-medium text-white">Receive</span>
                  </Link>

                  <button
                    onClick={() => setActiveTab("swap")}
                    className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border-emerald-800 border transition group"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <SwapIcon size={24} />
                    </div>
                    <span className="font-medium text-white">Swap</span>
                  </button>

                  <Link href="/about" className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition group">
                    <div className="p-3 rounded-full bg-zinc-700 text-gray-300 mb-3 group-hover:bg-zinc-600 transition">
                      <Info size={24} />
                    </div>
                    <span className="font-medium text-white">About</span>
                  </Link>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
                  <button
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    onClick={() => setActiveTab("transactions")}
                  >
                    View all <ArrowLeftRight size={12} />
                  </button>
                </div>

                <div className="space-y-3">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 3).map((tx) => (
                      <div key={tx.id} className="flex items-center p-3 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition">
                        <div className="mr-3">
                          {getStatusIcon(tx.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-200">{formatTxData(tx.txData)}</p>
                          <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                        </div>
                        {tx.signature && (
                          <a
                            href={`https://solscan.io/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:underline ml-2"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ArrowLeftRight size={24} className="text-gray-600 mb-2" />
                      <p className="text-sm text-gray-400">No transactions yet</p>
                      <p className="text-xs text-gray-500">Your transaction history will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Tab */}
        {activeTab === "send" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                <SendIcon size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">Send</h2>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSendFormSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="token-selector" className="text-sm font-medium flex items-center text-gray-300">
                  Token <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    id="token-selector"
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value)}
                    className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                  >
                    <option value="usds">USDs</option>
                    <option value="usdc">USDC</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <ChevronDown size={18} className="text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex justify-between">
                  <span>Selected token to send</span>
                  <span>Balance: {tokenType === "usds" ? usdsBalance : usdcBalance}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="recipient" className="text-sm font-medium flex items-center text-gray-300">
                  Recipient Address <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    id="recipient"
                    type="text"
                    required
                    placeholder="Enter Solana address"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-500">Enter a valid Solana wallet address</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium flex items-center text-gray-300">
                  Amount <span className="text-red-400 ml-1">*</span>
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
                    className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-16"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 font-medium text-gray-400 text-sm">
                    {tokenType.toUpperCase()}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Continue to Confirm
              </Button>
            </form>
          </div>
        )}

        {/* Receive Tab */}
        {activeTab === "receive" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                <ReceiveIcon size={20} />
              </div>
              <h2 className="text-xl font-semibold text-white">Receive</h2>
            </div>

            <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 text-center mb-6">
              <p className="text-sm text-gray-400 mb-4">This feature has moved to a dedicated page</p>
              <Link href="/wallet/receive" className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded inline-flex items-center gap-2 text-sm font-medium transition">
                Go to Receive Page
              </Link>
            </div>
          </div>
        )}

        {/* Swap Tab */}
        {activeTab === "swap" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                <SwapIcon size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Swap USDC to USDs</h2>
                <p className="text-xs text-emerald-400 flex items-center">
                  <TrendingUp size={12} className="mr-1" /> Earn 4.2% APY on your stablecoins
                </p>
              </div>
            </div>

            {/* New APY highlight banner for swap tab */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 border border-emerald-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-emerald-800/50 text-emerald-300">
                  <PiggyBank size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-300 text-sm">4.2% Annual Yield</h3>
                  <p className="text-xs text-emerald-200/80">
                    USDs automatically earns interest - no staking or locking required. Interest accrues daily.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">From</span>
                <span className="text-xs text-gray-500">Balance: {usdcBalance} USDC</span>
              </div>
              <div className="flex items-center bg-zinc-900 rounded-md p-3 border border-zinc-700">
                <div className="pr-3 border-r border-zinc-700">
                  <div className="flex items-center gap-2">
                    <USDCIcon className="text-blue-400" size={24} />
                    <span className="font-medium text-gray-200">USDC</span>
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

            <div className="flex justify-center my-2">
              <div className="p-2 rounded-full bg-emerald-900/20 border border-emerald-900/30">
                <ArrowDown className="text-emerald-400" size={20} />
              </div>
            </div>

            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">To</span>
                <span className="text-xs text-gray-500">Balance: {usdsBalance} USDs</span>
              </div>
              <div className="flex items-center bg-zinc-900 rounded-md p-3 border border-zinc-700">
                <div className="pr-3 border-r border-zinc-700">
                  <div className="flex items-center gap-2">
                    <USDsIcon className="text-emerald-400" size={24} />
                    <span className="font-medium text-gray-200">USDs</span>
                  </div>
                </div>
                <div className="flex-1 text-right text-lg text-gray-200 px-3">
                  {swapAmount ? (parseFloat(swapAmount) * 1.042).toFixed(6) : "0.00"}
                </div>
              </div>
              <div className="mt-2 text-xs text-emerald-400 text-right">+4.2% bonus applied</div>
            </div>

            <Button
              onClick={handleSwap}
              disabled={isLoading || !swapAmount}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-md font-medium flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Swapping...
                </>
              ) : (
                "Swap USDC to USDs"
              )}
            </Button>

            <div className="mt-4 bg-emerald-900/20 border border-emerald-900/30 rounded-md p-3 text-sm text-gray-300">
              <p className="flex items-start gap-2">
                <Info size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                By swapping USDC to USDs, you'll automatically earn 4.2% APY on your stablecoins.
              </p>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">Transaction History</h2>

            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className="text-sm font-medium ml-2 text-gray-300">{tx.status}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(tx.createdAt)}
                      </span>
                    </div>
                    <p className="text-base font-medium mb-2 text-gray-200">{formatTxData(tx.txData)}</p>
                    {tx.signature && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-900/50 inline-flex items-center"
                        >
                          <ExternalLink size={12} className="mr-1" /> View on Solscan
                        </a>
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-zinc-800 text-gray-400 px-2 py-1 rounded-md hover:bg-zinc-700 inline-flex items-center"
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
                <div className="p-4 rounded-full bg-zinc-800 mb-3">
                  <ArrowLeftRight size={32} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-1 text-gray-300">No transactions yet</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  When you send or receive tokens, your transactions will appear here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Passcode Modal */}
        {showPasscodeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-800 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center mb-6">
                <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Confirm Transaction</h2>
                  <p className="text-sm text-gray-400">Enter your 6-digit passcode</p>
                </div>
              </div>

              <div className="bg-zinc-800 p-4 rounded-lg mb-5 border border-zinc-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Amount</span>
                  <span className="font-medium text-white">{amount} {tokenType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">To</span>
                  <span className="font-mono text-xs text-gray-300">{shortenAddress(recipient)}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
                  <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <form onSubmit={handleSendTransaction} className="space-y-4">
                <div>
                  <label htmlFor="passcode" className="text-sm font-medium block mb-2 text-gray-300">
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
                      className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-xl tracking-[1em] font-mono"
                      placeholder="······"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit passcode you set up with your wallet
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-zinc-700 hover:bg-zinc-800 text-gray-300"
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
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
      </main>
    </div>
  );
}

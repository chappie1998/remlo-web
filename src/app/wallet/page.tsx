"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  DollarSign,
  Wallet,
  CircleDashed,
  FileText,
  Wallet2,
  CopyIcon,
  Search,
  SlidersHorizontal,
  User,
  ArrowRight
} from "lucide-react";
import { USDsIcon, USDCIcon, SwapIcon, ReceiveIcon, SendMoneyIcon, RemloIcon, ActivityIcon } from "@/components/icons";
import FaucetButton from '@/components/FaucetButton';

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

// Main component wrapper with Suspense
export default function WalletPage() {
  return (
    <Suspense fallback={<WalletLoadingState />}>
      <AccountDashboard />
    </Suspense>
  );
}

// Loading state component
function WalletLoadingState() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin">
            <CircleDashed className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-lg">Loading wallet...</p>
        </div>
      </div>
    </div>
  );
}

// Original component now as a separate function
function AccountDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [foundUser, setFoundUser] = useState<{ username: string, solanaAddress: string } | null>(null);
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);

  // State variables for account details
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return (tabParam === "overview" || tabParam === "transactions" || tabParam === "receive") 
      ? tabParam 
      : "overview";
  });
  
  const [solanaAddress, setSolanaAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tokenType, setTokenType] = useState("usd"); // "usd" or "usdc"
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressCopied, setIsAddressCopied] = useState(false);

  // Transaction filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | "sent" | "received" | "swapped">("all");
  const [txStatusFilter, setTxStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Calculate the total balance in USD (assuming 1 USDC = 1 USDs = $1)
  const totalUsdBalance = parseFloat(usdsBalance) + parseFloat(usdcBalance);

  useEffect(() => {
    if (session?.user?.solanaAddress) {
      fetchBalances();
    }
  }, [session?.user?.solanaAddress]); // Only re-run when solanaAddress changes

  // Check for refresh parameter and fetch balances if present
  useEffect(() => {
    const refreshParam = searchParams.get("refresh");
    if (refreshParam === "true" && session?.user?.solanaAddress) {
      console.log("Refreshing balances due to refresh parameter - using cache busting");
      toast.info("Updating balance after transaction...", { 
        duration: 3000,
        icon: "🔄" 
      });
      fetchBalances(true); // Use cache busting for immediate refresh
      
      // Reduced polling: only 2 polls over 10 seconds instead of 6 polls over 30 seconds
      let pollCount = 0;
      const maxPolls = 2; // Poll 2 times over 10 seconds (every 5 seconds)
      
      const pollInterval = setInterval(() => {
        pollCount++;
        console.log(`Polling for balance updates... (${pollCount}/${maxPolls})`);
        fetchBalances(true); // Use cache busting for polling too
        
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log("Finished polling for balance updates");
        }
      }, 5000); // Poll every 5 seconds
      
      // Remove refresh parameter from URL to prevent repeated refreshes
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("refresh");
      window.history.replaceState({}, "", newUrl.toString());
      
      // Cleanup interval on component unmount
      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [searchParams, session?.user?.solanaAddress]);

  // Handle authentication redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
  }, [status, session, router]);

  const fetchBalances = async (bustCache = false) => {
    try {
      setIsLoading(true);
      
      // Add cache-busting parameter if needed (e.g., after transactions)
      const url = bustCache 
        ? `/api/wallet/overview?t=${Date.now()}` 
        : "/api/wallet/overview";
      
      // Use the optimized overview endpoint - now only returns USDC and USDS
      const response = await fetch(url, {
        // Disable caching when cache busting is requested
        ...(bustCache && {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update only USDC and USDS balances from optimized response
        setUsdcBalance(data.balances.usdc.formattedBalance);
        setUsdsBalance(data.balances.usds.formattedBalance);
        setTransactions(data.transactions || []);
      } else {
        console.error("Overview API failed, trying again...");
        // Retry the same optimized endpoint instead of falling back to individual calls
        const retryResponse = await fetch("/api/wallet/overview");
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          setUsdcBalance(retryData.balances.usdc.formattedBalance);
          setUsdsBalance(retryData.balances.usds.formattedBalance);
          setTransactions(retryData.transactions || []);
        } else {
          throw new Error("Failed to fetch wallet data");
        }
      }
    } catch (error) {
      console.error("Error fetching wallet overview:", error);
      // Set default values if all attempts fail
      setUsdcBalance("0.000000");
      setUsdsBalance("0.000000");
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    toast.info("Refreshing balances...", { 
      duration: 2000,
      icon: "🔄" 
    });
    await fetchBalances(true); // Always use cache busting for manual refresh
    toast.success("Account data refreshed");
  };

  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  // Look up a user by username
  const lookupUsername = async () => {
    if (!username || username.trim() === "") {
      setError("Username cannot be empty");
      return;
    }

    setIsValidatingUsername(true);
    setError("");
    setFoundUser(null);

    try {
      const response = await fetch("/api/user/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find user");
      }

      // Set the recipient address from the username lookup
      setRecipient(data.solanaAddress);
      setFoundUser({
        username: data.username,
        solanaAddress: data.solanaAddress
      });
      
      toast.success(`Found user ${data.username}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to find user";
      setError(errorMessage);
      setRecipient(""); // Clear recipient address if lookup fails
    } finally {
      setIsValidatingUsername(false);
    }
  };

  // Modified validation function to handle either username or address
  const validateSendForm = () => {
    // If neither username nor address is provided, show error
    if ((!recipient || recipient.trim() === "") && (!foundUser || !foundUser.solanaAddress)) {
      setError("Recipient address or username is required");
      return false;
    }

    // Validate the Solana address if one is provided directly
    if (recipient && !isValidSolanaAddress(recipient)) {
      setError("Invalid recipient address");
      return false;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Enter a valid amount");
      return false;
    }

    // Check if there are sufficient funds
    if (foundUser && foundUser.solanaAddress && tokenType === "usd" && parseFloat(amount) > parseFloat(usdsBalance)) {
      setError("Insufficient balance");
      return false;
    } else if (foundUser && foundUser.solanaAddress && tokenType === "usdc" && parseFloat(amount) > parseFloat(usdcBalance)) {
      setError("Insufficient balance");
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
            <p className="text-lg text-gray-300">Loading your account...</p>
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
      const endpoint = foundUser && foundUser.solanaAddress ? "/api/wallet/send-token-transaction" : "/api/wallet/send-transaction";

      // Include username in the request if a user was found
      const requestData: {
        to: string;
        amount: string;
        passcode: string;
        username?: string;
        tokenType?: string;
      } = {
        to: recipient,
        amount,
        passcode,
      };
      
      // If sending to a user found by username, include the username in the transaction data
      if (foundUser) {
        requestData.username = foundUser.username;
      }
      
      // Convert "usd" to "usds" when passing to the backend
      if (tokenType) {
        requestData.tokenType = tokenType === "usd" ? "usds" : tokenType;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      // Create a success message that includes the username if available
      const successMessage = foundUser 
        ? `Transaction sent successfully to ${foundUser.username}!`
        : "Transaction sent successfully!";
      
      toast.success(successMessage);
      setShowPasscodeModal(false);
      setPasscode("");
      setRecipient("");
      setUsername("");
      setFoundUser(null);
      setAmount("");

      // Refresh balance and transactions with cache busting
      fetchBalances(true);
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
      
      // Check if it's a swap transaction
      if (txData.swap) {
        if (txData.swap === "USDC_TO_USDS") {
          return `Swapped ${txData.amount} USDC to USDs`;
        } else if (txData.swap === "USDS_TO_USDC") {
          return `Swapped ${txData.amount} USDs to USDC`;
        }
        return `Swapped ${txData.amount}`;
      }
      
      // Use tokenType if available, fallback to checking token address
      const getTokenDisplay = () => {
        if (txData.tokenType) {
          return txData.tokenType; // Use the actual token type (USDC, USDS, etc.)
        }
        return txData.token ? 'USDC' : 'SOL'; // Fallback for old transactions
      };
      
      const tokenDisplay = getTokenDisplay();
      
      // Check if the transaction includes a username
      if (txData.username) {
        return `${txData.amount} ${tokenDisplay} to ${txData.username}`;
      }
      
      return `${txData.amount} ${tokenDisplay} to ${shortenAddress(txData.to)}`;
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

  // Get transaction type icon
  const getTransactionTypeIcon = (txDataString: string) => {
    try {
      const txData = JSON.parse(txDataString);
      
      // Swap transaction icon
      if (txData.swap) {
        return <ArrowLeftRight className="text-emerald-500" size={16} />;
      }
      
      // Send transaction icon
      if (txData.to) {
        return <ArrowRight className="text-blue-500" size={16} />;
      }
      
      // Receive transaction icon (default)
      return <ArrowDown className="text-green-500" size={16} />;
    } catch (e) {
      // Unknown transaction type
      return <CircleDashed className="text-gray-500" size={16} />;
    }
  };

  const tokenBalances: TokenBalance[] = [
    {
      tokenSymbol: "USDs",
      balance: usdsBalance,
      usdValue: `$${parseFloat(usdsBalance).toFixed(2)}`,
      icon: <USDsIcon width={20} height={20} className="text-emerald-400 mr-2" />
    },
    {
      tokenSymbol: "USDC",
      balance: usdcBalance,
      usdValue: `$${parseFloat(usdcBalance).toFixed(2)}`,
      icon: <USDCIcon width={20} height={20} className="text-blue-400 mr-2" />
    }
  ];

  // Add copy address function
  const copyAddress = () => {
    if (session?.user?.solanaAddress) {
      navigator.clipboard.writeText(session.user.solanaAddress);
      toast.success("Address copied to clipboard");
    }
  };

  // Filter transactions based on search query and filters
  const getFilteredTransactions = () => {
    return transactions.filter(tx => {
      // Parse transaction data to get more details
      let txData;
      try {
        txData = JSON.parse(tx.txData);
      } catch (e) {
        txData = {};
      }
      
      // Apply status filter
      if (txStatusFilter !== "all" && tx.status !== txStatusFilter) {
        return false;
      }
      
      // Apply transaction type filter
      if (txFilter !== "all") {
        if (txFilter === "sent" && (!txData.to || txData.swap)) {
          return false;
        }
        if (txFilter === "received" && (txData.to || txData.swap)) {
          return false;
        }
        if (txFilter === "swapped" && !txData.swap) {
          return false;
        }
      }
      
      // Apply search query
      if (searchQuery) {
        const formattedTx = formatTxData(tx.txData).toLowerCase();
        if (!formattedTx.includes(searchQuery.toLowerCase())) {
          // Check recipient address or username
          if (txData.to && !txData.to.toLowerCase().includes(searchQuery.toLowerCase()) &&
              (!txData.username || !txData.username.toLowerCase().includes(searchQuery.toLowerCase()))) {
            return false;
          }
        }
      }
      
      return true;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="container mx-auto py-6 px-4 flex-1">
        {/* Account balance card */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 mb-6 overflow-hidden">
          <div className="p-6 bg-emerald-900/20 border-b border-emerald-900/30">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium text-emerald-400">Total Balance</h2>
                <div className="flex items-baseline mt-1">
                  <span className="text-3xl font-bold text-white">${totalUsdBalance.toFixed(2)}</span>
                  <span className="ml-1 text-sm text-gray-400">USD</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-gray-300 border-zinc-700 hover:bg-zinc-800"
                onClick={refreshData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1">{isLoading ? "Refreshing..." : "Refresh"}</span>
              </Button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium text-white">Your Accounts</h3>
            </div>
            <div className="space-y-3">
              {/* USDs Balance with APY indicator */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 border-emerald-700/40 border">
                <div className="flex items-center">
                  <div className="mr-3 p-2 rounded-full bg-emerald-900/40">
                    <DollarSign size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white">USDs Balance</div>
                    <div className="flex items-center text-xs text-emerald-400 mt-0.5">
                      <TrendingUp size={10} className="mr-1" />
                      Earning 4.2% APY
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold text-white">${usdsBalance}</div>
              </div>
              
              {/* USDC Balance */}
              <div className="flex flex-col p-3 rounded-lg bg-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="mr-3 p-2 rounded-full bg-zinc-700">
                      <DollarSign size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">USDC Balance</div>
                      <div className="flex items-center text-xs text-gray-400 mt-0.5">
                        <Link 
                          href="/wallet/swap" 
                          className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                        >
                          <ArrowLeftRight size={10} className="mr-1" />
                          Swap to earn 4.2% APY
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-white">${usdcBalance}</div>
                </div>
                
                {/* Add FaucetButton within the USDC balance section */}
                <FaucetButton 
                  usdcBalance={parseFloat(usdcBalance)} 
                  onFaucetComplete={refreshData} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick links section - add after the balances */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/wallet/contacts" className="flex items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition">
            <div className="p-2 mr-3 rounded-full bg-emerald-900/20 text-emerald-400">
              <User size={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-200">Contacts</h3>
              <p className="text-xs text-gray-500">Manage your recipients</p>
            </div>
          </Link>
          
          <Link href="/wallet/send" className="flex items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition">
            <div className="p-2 mr-3 rounded-full bg-emerald-900/20 text-emerald-400">
              <SendMoneyIcon width={18} height={18} />
            </div>
            <div>
              <h3 className="font-medium text-gray-200">Send</h3>
              <p className="text-xs text-gray-500">Send USDs or USDC</p>
            </div>
          </Link>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Link 
            href="/wallet/send"
            className="flex flex-col items-center p-4 h-auto bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md"
          >
            <SendMoneyIcon width={24} height={24} className="text-emerald-400 mb-2" />
            <span>Send Money</span>
          </Link>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center p-4 h-auto bg-zinc-900 hover:bg-zinc-800 border-zinc-800"
            onClick={() => handleTabChange("receive")}
          >
            <ReceiveIcon width={24} height={24} className="text-emerald-400 mb-2" />
            <span>Request Money</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center p-4 h-auto bg-zinc-900 hover:bg-zinc-800 border-zinc-800 col-span-2 sm:col-span-1"
            onClick={() => router.push("/activity")}
          >
            <ActivityIcon width={24} height={24} className="text-emerald-400 mb-2" />
            <span>Activity</span>
          </Button>
        </div>

        {/* Tabs for different sections */}
        <div className="flex overflow-x-auto border-b border-zinc-800 mb-6 no-scrollbar">
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "overview"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => handleTabChange("overview")}
          >
            Overview
          </button>
          <Link
            href="/wallet/send"
            className="px-4 py-2 font-medium text-sm relative whitespace-nowrap text-gray-400 hover:text-gray-300"
          >
            Send
          </Link>
          <Link
            href="/wallet/receive"
            className="px-4 py-2 font-medium text-sm relative whitespace-nowrap text-gray-400 hover:text-gray-300"
          >
            Receive
          </Link>
          <Link
            href="/wallet/swap"
            className="px-4 py-2 font-medium text-sm relative whitespace-nowrap text-gray-400 hover:text-gray-300"
          >
            Swap
          </Link>
          <button
            className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
              activeTab === "transactions"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => handleTabChange("transactions")}
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
                <Link
                  href="/wallet/swap"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 px-4 py-2 rounded flex items-center gap-2 whitespace-nowrap font-medium"
                >
                  <TrendingUp size={16} />
                  Swap Now
                </Link>
              </div>
            </div>

            {/* Faucet Button for users with low USDC balance */}
            {parseFloat(usdcBalance) < 1 && (
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-700/30 rounded-xl p-6 shadow-md">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="p-3 bg-blue-800/50 rounded-full text-blue-300">
                    <DollarSign size={30} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-blue-100">
                      Need USDC for Testing?
                    </h3>
                    <p className="text-blue-200 mt-1">
                      Your USDC balance is low. Get free USDC from our faucet for testing the wallet.
                    </p>
                  </div>
                  <FaucetButton 
                    usdcBalance={parseFloat(usdcBalance)} 
                    onFaucetComplete={refreshData} 
                  />
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    href="/wallet/send"
                    className="flex flex-col items-center justify-center p-4 bg-emerald-900/40 hover:bg-emerald-900/60 rounded-lg transition group border border-emerald-800"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <SendMoneyIcon width={24} height={24} />
                    </div>
                    <span className="font-medium text-emerald-400">Send by Username</span>
                  </Link>

                  <Link
                    href="/wallet/receive"
                    className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition group"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <ReceiveIcon width={24} height={24} />
                    </div>
                    <span className="font-medium text-white">Receive</span>
                  </Link>

                  <Link
                    href="/wallet/swap"
                    className="flex flex-col items-center justify-center p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border-emerald-800 border transition group"
                  >
                    <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mb-3 group-hover:bg-emerald-900/60 transition">
                      <SwapIcon width={24} height={24} />
                    </div>
                    <span className="font-medium text-white">Swap</span>
                  </Link>

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
                    onClick={() => handleTabChange("transactions")}
                  >
                    View all <ArrowLeftRight size={12} />
                  </button>
                </div>

                <div className="space-y-3">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 3).map((tx) => (
                      <div key={tx.id} className="flex items-center p-3 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition">
                        <div className="mr-3 flex items-center">
                          {getStatusIcon(tx.status)}
                          <div className="ml-2">
                            {getTransactionTypeIcon(tx.txData)}
                          </div>
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

        {/* Receive Tab */}
        {activeTab === "receive" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                <ReceiveIcon width={20} height={20} />
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

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-white">Transaction History</h2>
              
              <div className="flex space-x-2">
                <div className="relative flex-1 min-w-[200px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="border-zinc-700 text-gray-300 hover:bg-zinc-800"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal size={16} />
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="p-4 mb-6 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Transaction Type</label>
                    <div className="flex space-x-2">
                      {(["all", "sent", "received", "swapped"] as const).map((filter) => (
                        <Button
                          key={filter}
                          size="sm"
                          variant={txFilter === filter ? "default" : "outline"}
                          className={txFilter === filter 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                            : "border-zinc-700 text-gray-300 hover:bg-zinc-700"
                          }
                          onClick={() => setTxFilter(filter)}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Status</label>
                    <div className="flex space-x-2">
                      {(["all", "success", "pending", "failed"] as const).map((filter) => (
                        <Button
                          key={filter}
                          size="sm"
                          variant={txStatusFilter === filter ? "default" : "outline"}
                          className={txStatusFilter === filter 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                            : "border-zinc-700 text-gray-300 hover:bg-zinc-700"
                          }
                          onClick={() => setTxStatusFilter(filter)}
                        >
                          {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {(searchQuery || txFilter !== "all" || txStatusFilter !== "all") && (
                  <div className="flex justify-end mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-zinc-700 text-gray-300 hover:bg-zinc-700"
                      onClick={() => {
                        setSearchQuery("");
                        setTxFilter("all");
                        setTxStatusFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {getFilteredTransactions().length > 0 ? (
              <div className="space-y-3">
                {getFilteredTransactions().map((tx) => (
                  <div key={tx.id} className="p-4 border border-zinc-800 rounded-lg hover:bg-zinc-800/50 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className="text-sm font-medium ml-2 text-gray-300">{tx.status}</span>
                        <div className="ml-3">
                          {getTransactionTypeIcon(tx.txData)}
                        </div>
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
                {searchQuery || txFilter !== "all" || txStatusFilter !== "all" ? (
                  <>
                    <Filter size={32} className="text-gray-500 mb-3" />
                    <h3 className="text-lg font-medium mb-1 text-gray-300">No matching transactions</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      Try adjusting your filters or search query
                    </p>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight size={32} className="text-gray-500 mb-3" />
                    <h3 className="text-lg font-medium mb-1 text-gray-300">No transactions yet</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      When you send or receive tokens, your transactions will appear here
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Passcode modal */}
        {showPasscodeModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-75 p-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">
                Confirm Send
              </h3>
              
              <p className="text-gray-400 mb-6">
                Enter your 6-digit passcode to send {amount} {tokenType === "usdc" ? "USDC" : "USDs"} to {foundUser ? foundUser.username : shortenAddress(recipient)}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-900 rounded-md text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendTransaction}>
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
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
                      "Send"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* SOL Card */}
          <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800/30 backdrop-blur-sm rounded-xl p-6 relative overflow-hidden hover:shadow-lg hover:border-purple-700/50 transition-all duration-300">
            {/* ... existing SOL card content ... */}
          </div>

          {/* Token Cards */}
          {tokenBalances.map((token) => (
            <div 
              key={token.tokenSymbol}
              className={`${
                token.tokenSymbol === "USDs" 
                  ? "bg-gradient-to-r from-emerald-900/20 to-green-900/20 border-emerald-800/30 hover:border-emerald-700/50" 
                  : "bg-gradient-to-r from-blue-900/20 to-sky-900/20 border-blue-800/30 hover:border-blue-700/50"
              } border backdrop-blur-sm rounded-xl p-6 relative overflow-hidden hover:shadow-lg transition-all duration-300`}
            >
              {/* ... existing token card content ... */}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

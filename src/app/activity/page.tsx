"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { shortenAddress, formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeftRight,
  ExternalLink,
  Filter,
  Calendar,
  Download,
  Search,
  CircleDashed
} from "lucide-react";
import { ActivityIcon, SendMoneyIcon, ReceiveIcon, RemloIcon } from "@/components/icons";

// Define interfaces
interface Transaction {
  id: string;
  status: string;
  txData: string;
  signature?: string;
  createdAt: string;
}

interface PaymentRequest {
  id: string;
  shortId: string;
  amount: string;
  status: string;
  createdAt: string;
  requesterName: string;
  requesterEmail: string;
}

// Main wrapper component with Suspense
export default function ActivityPageWrapper() {
  return (
    <Suspense fallback={<ActivityLoadingState />}>
      <ActivityPage />
    </Suspense>
  );
}

// Loading state component
function ActivityLoadingState() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin">
            <CircleDashed className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-lg">Loading activity...</p>
        </div>
      </div>
    </div>
  );
}

// Original component now as a separate function
function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [txOffset, setTxOffset] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [prOffset, setPrOffset] = useState(0);
  const [prTotal, setPrTotal] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (session?.user?.solanaAddress) {
      fetchData();
    }
  }, [session?.user?.solanaAddress]);

  // Check for refresh parameter and fetch fresh data if present
  useEffect(() => {
    const refreshParam = searchParams.get("refresh");
    if (refreshParam === "true" && session?.user?.solanaAddress) {
      console.log("Refreshing activity due to refresh parameter - using cache busting");
      toast.info("Updating activity after transaction...", { 
        duration: 3000,
        icon: "🔄" 
      });
      fetchData(true); // Use cache busting for immediate refresh
      
      // Remove refresh parameter from URL to prevent repeated refreshes
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("refresh");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, session?.user?.solanaAddress]);

  // Handle authentication redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
  }, [status, session, router]);

  const fetchData = async (bustCache = false) => {
    setIsLoading(true);
    try {
      // Use the new combined activity overview endpoint
      const url = bustCache 
        ? `/api/activity/overview?limit=${PAGE_SIZE}&offset=0&includeCounts=true&t=${Date.now()}` 
        : `/api/activity/overview?limit=${PAGE_SIZE}&offset=0&includeCounts=true`;
      
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
        
        // Update all state from single response
        setTransactions(data.transactions || []);
        setPaymentRequests(data.paymentRequests || []);
        
        if (data.totals) {
          setTxTotal(data.totals.transactions);
          setPrTotal(data.totals.createdRequests + data.totals.receivedRequests);
        }
        
        // Reset offsets for fresh data
        setTxOffset(data.transactions?.length || 0);
        setPrOffset(data.paymentRequests?.length || 0);
      } else {
        // Fallback to individual calls if combined endpoint fails
        await fetchDataIndividually();
      }
    } catch (error) {
      console.error("Error fetching activity overview:", error);
      // Fallback to individual calls
      await fetchDataIndividually();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDataIndividually = async () => {
    await Promise.all([
      fetchTransactions(),
      fetchPaymentRequests()
    ]);
  };

  const fetchTransactions = async (append = false) => {
    try {
      const response = await fetch(`/api/wallet/transactions?limit=${PAGE_SIZE}&offset=${append ? txOffset : 0}`);
      if (response.ok) {
        const data = await response.json();
        setTxTotal(data.total || 0);
        setTxOffset((append ? txOffset : 0) + (data.transactions?.length || 0));
        setTransactions(prev => append ? [...prev, ...(data.transactions || [])] : (data.transactions || []));
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchPaymentRequests = async (append = false) => {
    try {
      const response = await fetch(`/api/payment-request/list?limit=${PAGE_SIZE}&offset=${append ? prOffset : 0}`);
      if (response.ok) {
        const data = await response.json();
        setPrTotal((data.createdTotal || 0) + (data.receivedTotal || 0));
        setPrOffset((append ? prOffset : 0) + (data.paymentRequests?.length || 0));
        setPaymentRequests(prev => append ? [...prev, ...(data.paymentRequests || [])] : (data.paymentRequests || []));
      }
    } catch (error) {
      console.error("Error fetching payment requests:", error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    toast.info("Refreshing activity...", { 
      duration: 2000,
      icon: "🔄" 
    });
    await fetchData(true); // Use cache busting for refresh
    toast.success("Activity data refreshed");
    setRefreshing(false);
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
      
      // Regular transaction - use tokenType if available, fallback to checking token address
      const getTokenDisplay = () => {
        if (txData.tokenType) {
          return txData.tokenType; // Use the actual token type (USDC, USDS, etc.)
        }
        return txData.token ? 'USDC' : 'SOL'; // Fallback for old transactions
      };
      
      const tokenDisplay = getTokenDisplay();
      
      if (txData.username) {
        return `${txData.amount} ${tokenDisplay} to ${txData.username}`;
      }
      
      return `${txData.amount} ${tokenDisplay} to ${shortenAddress(txData.to)}`;
    } catch (e) {
      return "Unknown transaction";
    }
  };

  // Get transaction status icon
  const getStatusIcon = (status: string) => {
    switch(status.toLowerCase()) {
      case 'executed':
      case 'completed':
      case 'confirmed':
        return <CheckCircle2 className="text-green-500" size={16} />;
      case 'pending':
      case 'processing':
        return <Clock className="text-yellow-500" size={16} />;
      case 'failed':
      case 'canceled':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <Clock className="text-gray-500" size={16} />;
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
        return <SendMoneyIcon className="text-blue-500" width={16} height={16} />;
      }
      
      // Receive transaction icon (default)
      return <ReceiveIcon className="text-green-500" width={16} height={16} />;
    } catch (e) {
      // Unknown transaction type
        return <Clock className="text-gray-500" size={16} />;
    }
  };

  // Filter transactions based on the selected type
  const filteredTransactions = transactions.filter(tx => {
    if (filterType === "all") return true;
    try {
      const txData = JSON.parse(tx.txData);
      
      // Check token type more precisely
      if (filterType === "sol") {
        return !txData.token; // SOL transactions don't have token field
      }
      
      if (filterType === "usdc") {
        // For USDC, check tokenType first, then fallback to checking if any token exists
        if (txData.tokenType) {
          return txData.tokenType.toLowerCase() === "usdc";
        }
        return !!txData.token; // Fallback for old transactions
      }
      
      // Handle other token types (like USDS) - for future expansion
      if (filterType === "usds") {
        return txData.tokenType && txData.tokenType.toLowerCase() === "usds";
      }
      
      return false;
    } catch {
      return false;
    }
  });

  // Add load more handlers
  const loadMoreTransactions = () => fetchTransactions(true);
  const loadMorePaymentRequests = () => fetchPaymentRequests(true);

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading your activity...</p>
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

  // Get all activity items combined for "All" tab
  const getAllActivity = () => {
    // Define proper types for activity items
    type TransactionItem = {
      id: string;
      title: string;
      status: string;
      date: string;
      type: 'transaction';
      signature?: string;
      data: Transaction;
    };

    type PaymentRequestItem = {
      id: string;
      title: string;
      status: string;
      date: string;
      type: 'payment-request';
      data: PaymentRequest;
    };

    type ActivityItem = TransactionItem | PaymentRequestItem;

    const txItems: TransactionItem[] = filteredTransactions.map(tx => ({
      id: tx.id,
      title: formatTxData(tx.txData),
      status: tx.status,
      date: tx.createdAt,
      type: 'transaction' as const,
      signature: tx.signature,
      data: tx
    }));

    const prItems: PaymentRequestItem[] = paymentRequests.map(pr => ({
      id: pr.id,
      title: `${pr.amount} USD ${pr.status.toLowerCase() === 'pending' ? 'requested from' : 'paid to'} ${pr.requesterName || pr.requesterEmail}`,
      status: pr.status,
      date: pr.createdAt,
      type: 'payment-request' as const,
      data: pr
    }));

    return [...txItems, ...prItems].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const allActivity = getAllActivity();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />

      <main className="container mx-auto py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-emerald-900/30 text-emerald-400 mr-3">
              <ActivityIcon width={24} height={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">Activity</h1>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-gray-300 border-zinc-700 hover:bg-zinc-800"
            onClick={refreshData}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 mb-6 overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-zinc-800">
            <div className="flex overflow-x-auto hide-scrollbar gap-1">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                className={activeTab === "all" ? "bg-emerald-700 hover:bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}
                size="sm"
                onClick={() => setActiveTab("all")}
              >
                All Activity
              </Button>
              <Button
                variant={activeTab === "transactions" ? "default" : "ghost"}
                className={activeTab === "transactions" ? "bg-emerald-700 hover:bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}
                size="sm"
                onClick={() => setActiveTab("transactions")}
              >
                Transactions
              </Button>
              <Button
                variant={activeTab === "payments" ? "default" : "ghost"}
                className={activeTab === "payments" ? "bg-emerald-700 hover:bg-emerald-600 text-white" : "text-gray-400 hover:text-white"}
                size="sm"
                onClick={() => setActiveTab("payments")}
              >
                Payment Requests
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-emerald-400 hover:bg-zinc-800"
              >
                <Filter size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-emerald-400 hover:bg-zinc-800"
              >
                <Calendar size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-emerald-400 hover:bg-zinc-800"
              >
                <Download size={18} />
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full py-2 pl-10 pr-4 bg-zinc-800 border border-zinc-700 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            {/* Activity Content */}
            <div className="space-y-3">
              {activeTab === "all" && allActivity.length > 0 ? (
                allActivity.map(item => (
                  <div key={item.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(item.status)}
                        <span className="text-sm font-medium ml-2 text-gray-300 capitalize">{item.status.toLowerCase()}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-gray-300">
                          {item.type === 'transaction' ? 'Transaction' : 'Payment Request'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <p className="text-base font-medium mb-2 text-gray-200">{item.title}</p>
                    {item.type === 'transaction' && 'signature' in item && item.signature && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <a
                          href={`https://solscan.io/tx/${item.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-900/50 inline-flex items-center"
                        >
                          <ExternalLink size={12} className="mr-1" /> View on Solscan
                        </a>
                      </div>
                    )}
                    {item.type === 'payment-request' && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Link
                          href={`/pay/${(item.data as PaymentRequest).shortId}`}
                          className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-900/50 inline-flex items-center"
                        >
                          <ExternalLink size={12} className="mr-1" /> View Payment
                        </Link>
                      </div>
                    )}
                  </div>
                ))
              ) : activeTab === "transactions" && filteredTransactions.length > 0 ? (
                filteredTransactions.map(tx => (
                  <div key={tx.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(tx.status)}
                        <span className="text-sm font-medium ml-2 text-gray-300 capitalize">{tx.status.toLowerCase()}</span>
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
                ))
              ) : activeTab === "payments" && paymentRequests.length > 0 ? (
                paymentRequests.map(pr => (
                  <div key={pr.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        {getStatusIcon(pr.status)}
                        <span className="text-sm font-medium ml-2 text-gray-300 capitalize">{pr.status.toLowerCase()}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(pr.createdAt)}
                      </span>
                    </div>
                    <p className="text-base font-medium mb-2 text-gray-200">
                      {`${pr.amount} USD ${pr.status.toLowerCase() === 'pending' ? 'requested from' : 'paid to'} ${pr.requesterName || pr.requesterEmail}`}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Link
                        href={`/pay/${pr.shortId}`}
                        className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-md hover:bg-emerald-900/50 inline-flex items-center"
                      >
                        <ExternalLink size={12} className="mr-1" /> View Payment
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-zinc-800 mb-3">
                    <ActivityIcon width={32} height={32} className="text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-1 text-gray-300">No activity found</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    {activeTab === "all" 
                      ? "When you send or receive money, your activity will appear here" 
                      : activeTab === "transactions" 
                        ? "No transactions found. When you send or receive money, your transactions will appear here."
                        : "No payment requests found. Create a payment request to get started."}
                  </p>
                  {activeTab === "payments" && (
                    <Button 
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700" 
                      asChild
                    >
                      <Link href="/wallet/receive">Create Payment Request</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-2 p-4 h-auto bg-zinc-900 hover:bg-zinc-800 border-zinc-800"
            asChild
          >
            <Link href="/wallet">
              <SendMoneyIcon width={18} height={18} className="text-emerald-400" />
              <span>Send Money</span>
            </Link>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-2 p-4 h-auto bg-zinc-900 hover:bg-zinc-800 border-zinc-800"
            asChild
          >
            <Link href="/wallet/receive">
              <ReceiveIcon width={18} height={18} className="text-emerald-400" />
              <span>Request Money</span>
            </Link>
          </Button>
        </div>

        {/* Load More buttons */}
        {filteredTransactions.length < txTotal && (
          <Button onClick={loadMoreTransactions} className="mt-4 w-full">Load More Transactions</Button>
        )}
        {paymentRequests.length < prTotal && (
          <Button onClick={loadMorePaymentRequests} className="mt-4 w-full">Load More Payment Requests</Button>
        )}
      </main>
    </div>
  );
} 
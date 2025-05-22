"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { copyToClipboard, formatDate, shortenAddress } from "@/lib/utils";
import { toast } from "sonner";
import QRCode from 'react-qr-code';
import {
  Copy,
  Share2,
  Trash2,
  RefreshCw,
  ArrowLeftRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
  QrCode,
  AtSign,
  CreditCard,
  User,
  UserRound,
  Search,
  CircleDashed
} from "lucide-react";
import { USDsIcon, USDCIcon, SolanaIcon } from "@/components/icons";

// Define interfaces
interface PaymentRequest {
  id: string;
  amount: string;
  tokenType: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  link: string;
  recipientUsername?: string;
  recipientEmail?: string;
  requesterUsername?: string;
  requesterEmail?: string;
  type?: 'created' | 'received';
  note?: string;
}

interface ClaimedPaymentLink {
  id: string;
  shortId: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  claimedBy?: string;
  claimedAt?: string;
  createdAt: string;
  type: 'payment_link_claimed';
}

// Main wrapper component with Suspense
export default function ReceivePageWrapper() {
  return (
    <Suspense fallback={<ReceiveLoadingState />}>
      <ReceivePage />
    </Suspense>
  );
}

// Loading state component
function ReceiveLoadingState() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin">
            <CircleDashed className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-lg">Loading receive options...</p>
        </div>
      </div>
    </div>
  );
}

// Original component now as a separate function
function ReceivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize activeTab from URL query param
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return (tabParam === "username" || tabParam === "address" || tabParam === "link" || tabParam === "request") 
      ? tabParam 
      : "username"; // Default to the username tab
  });
  
  const [tokenType, setTokenType] = useState("usds");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [recipientUsername, setRecipientUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [claimedLinks, setClaimedLinks] = useState<ClaimedPaymentLink[]>([]);
  const [newRequestId, setNewRequestId] = useState<string | null>(null);
  const [newRequestLink, setNewRequestLink] = useState<string | null>(null);
  
  // Username validation states
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [foundUser, setFoundUser] = useState<{ username: string, solanaAddress: string } | null>(null);

  // Handle authentication redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
  }, [status, session, router]);

  // Function to refresh payment requests
  const refreshPaymentRequests = async () => {
    try {
      const response = await fetch('/api/payment-request/list');
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching payment requests:', error);
        return;
      }
      
      const data = await response.json();
      console.log('Refreshed payment requests:', data);
      
      if (data.success && Array.isArray(data.paymentRequests)) {
        setPaymentRequests(data.paymentRequests.map((pr: any) => ({
          id: pr.id,
          amount: pr.amount,
          tokenType: pr.tokenType,
          status: pr.status.toLowerCase(),
          createdAt: pr.createdAt,
          link: pr.link,
          recipientUsername: pr.recipientUsername,
          recipientEmail: pr.recipientEmail,
          requesterUsername: pr.requesterUsername,
          requesterEmail: pr.requesterEmail,
          type: pr.type,
          note: pr.note
        })));
      }
    } catch (error) {
      console.error('Error refreshing payment requests:', error);
    }
  };

  // Function to refresh claimed payment links
  const refreshClaimedLinks = async () => {
    try {
      const response = await fetch('/api/payment-link/claimed');
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching claimed payment links:', error);
        return;
      }
      
      const data = await response.json();
      console.log('Refreshed claimed payment links:', data);
      
      if (data.success && Array.isArray(data.claimedLinks)) {
        setClaimedLinks(data.claimedLinks);
      }
    } catch (error) {
      console.error('Error refreshing claimed payment links:', error);
    }
  };

  // Combined refresh function
  const refreshAll = async () => {
    await Promise.all([
      refreshPaymentRequests(),
      refreshClaimedLinks()
    ]);
  };

  // Fetch payment requests and claimed links from the API
  useEffect(() => {
    const fetchData = async () => {
      if (status === "authenticated") {
        try {
          // Fetch payment requests
          const requestsResponse = await fetch('/api/payment-request/list');
          
          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            console.log('Fetched payment requests:', requestsData);
            
            if (requestsData.success && Array.isArray(requestsData.paymentRequests)) {
              setPaymentRequests(requestsData.paymentRequests.map((pr: any) => ({
                id: pr.id,
                amount: pr.amount,
                tokenType: pr.tokenType,
                status: pr.status.toLowerCase(),
                createdAt: pr.createdAt,
                link: pr.link,
                recipientUsername: pr.recipientUsername,
                recipientEmail: pr.recipientEmail,
                requesterUsername: pr.requesterUsername,
                requesterEmail: pr.requesterEmail,
                type: pr.type,
                note: pr.note
              })));
            }
          }

          // Fetch claimed payment links
          const claimedResponse = await fetch('/api/payment-link/claimed');
          
          if (claimedResponse.ok) {
            const claimedData = await claimedResponse.json();
            console.log('Fetched claimed payment links:', claimedData);
            
            if (claimedData.success && Array.isArray(claimedData.claimedLinks)) {
              setClaimedLinks(claimedData.claimedLinks);
            }
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData();
  }, [status]);

  // Validate username
  const validateUsername = async (username: string) => {
    if (!username || username.trim() === "") {
      setUsernameStatus("idle");
      setFoundUser(null);
      return;
    }

    setIsValidatingUsername(true);
    setUsernameStatus("validating");

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

      if (response.ok && data.found) {
        setUsernameStatus("valid");
        setFoundUser({
          username: data.username,
          solanaAddress: data.solanaAddress,
        });
      } else {
        setUsernameStatus("invalid");
        setFoundUser(null);
      }
    } catch (err) {
      setUsernameStatus("invalid");
      setFoundUser(null);
    } finally {
      setIsValidatingUsername(false);
    }
  };

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const username = e.target.value;
    setRecipientUsername(username);
    
    if (username.length >= 3) {
      validateUsername(username);
    } else {
      setUsernameStatus("idle");
      setFoundUser(null);
    }
  };

  // Handle tab change with URL update
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
    
    // Reset form values when switching tabs
    setAmount("");
    setNote("");
    setNewRequestId(null);
    setNewRequestLink(null);
    
    // Reset tab-specific fields
    if (tab === "username") {
      // No specific fields to reset for username tab
    } else if (tab === "address") {
      // No specific fields to reset for address tab
    } else if (tab === "link") {
      // Reset username-specific fields
      setRecipientUsername("");
      setFoundUser(null);
      setUsernameStatus("idle");
    } else if (tab === "request") {
      // No need to reset username fields for request tab as they're used there
    }
  };

  // Add the function for creating link-based payment requests
  const handleCreateLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call API to create a general payment request (without username)
      const response = await fetch('/api/payment-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          tokenType,
          note,
          expiresIn: '', // Optional expiration in hours
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating payment request link:', error);
        throw new Error(error.error || 'Failed to create payment request link');
      }
      
      const result = await response.json();
      console.log('Payment request link created:', result);
      
      if (result.success) {
        const paymentRequest = result.paymentRequest;
        
        // Add to the local list
        const newRequest: PaymentRequest = {
          id: paymentRequest.id,
          amount: paymentRequest.amount,
          tokenType: paymentRequest.tokenType,
          status: paymentRequest.status.toLowerCase(),
          createdAt: paymentRequest.createdAt,
          link: paymentRequest.link,
          note: paymentRequest.note,
          type: 'created'
        };
        
        // Add to the list
        setPaymentRequests(prev => [newRequest, ...prev]);
        
        // Show the new request
        setNewRequestId(paymentRequest.id);
        setNewRequestLink(paymentRequest.link);
        
        // Reset form
        setAmount("");
        setNote("");
        
        toast.success("Payment request link created!");
      } else {
        throw new Error('Failed to create payment request link');
      }
    } catch (error) {
      console.error('Create payment request link error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment request link");
    } finally {
      setIsLoading(false);
    }
  };

  // Modify the existing handleCreatePaymentRequest function to require a username
  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Username is required for this tab
    if (!recipientUsername || usernameStatus !== "valid") {
      toast.error("Please enter a valid username");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the API endpoint to create a directed payment request
      const response = await fetch('/api/payment-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          tokenType,
          note,
          expiresIn: '', // Optional expiration in hours
          recipientUsername: recipientUsername, // Always include username here
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error creating payment request:', error);
        throw new Error(error.error || 'Failed to create payment request');
      }
      
      const result = await response.json();
      console.log('Payment request created:', result);
      
      if (result.success) {
        const paymentRequest = result.paymentRequest;
        
        // Add to the local list
        const newRequest: PaymentRequest = {
          id: paymentRequest.id,
          amount: paymentRequest.amount,
          tokenType: paymentRequest.tokenType,
          status: paymentRequest.status.toLowerCase(),
          createdAt: paymentRequest.createdAt,
          link: paymentRequest.link,
          recipientUsername: paymentRequest.recipientUsername,
          note: paymentRequest.note,
          type: 'created'
        };
        
        // Add to the list
        setPaymentRequests(prev => [newRequest, ...prev]);
        
        // Show the new request but not the link (just ID)
        setNewRequestId(paymentRequest.id);
        setNewRequestLink(null); // Don't show link for user requests
        
        toast.success(`Payment request sent to ${recipientUsername}!`);
      } else {
        throw new Error('Failed to create payment request');
      }
    } catch (error) {
      console.error('Create payment request error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    try {
      // Call the API to cancel the payment request
      const response = await fetch('/api/payment-request/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequestId: id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error cancelling payment request:', error);
        throw new Error(error.error || 'Failed to cancel payment request');
      }

      const result = await response.json();
      console.log('Payment request cancelled:', result);

      if (result.success) {
        // Instead of just updating local state, refresh from server
        await refreshPaymentRequests();
        toast.success("Payment request cancelled");
      } else {
        throw new Error('Failed to cancel payment request');
      }
    } catch (error) {
      console.error('Cancel payment request error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel payment request");
    }
  };

  const handleShareRequest = async (link: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Payment Request",
          text: "Please pay this request using Remlo",
          url: link,
        });
      } else {
        await copyToClipboard(link);
        toast.success("Payment link copied to clipboard");
      }
    } catch (error) {
      toast.error("Failed to share payment request");
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw width={32} height={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading...</p>
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
              <ArrowLeftRight width={32} height={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" width={16} height={16} />;
      case 'pending':
        return <Clock width={14} height={14} />;
      default:
        return <XCircle className="text-red-500" width={16} height={16} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <main className="flex-1 container max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-3xl font-bold mb-6">Receive Money</h1>

        <div className="bg-zinc-900 rounded-lg mb-6">
          <div className="flex border-b border-zinc-800">
            <button
              className={`flex-1 py-4 text-center font-medium ${
                activeTab === "username" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-400"
              }`}
              onClick={() => handleTabChange("username")}
            >
              <div className="flex items-center justify-center gap-2">
                <AtSign size={16} />
                <span>Username</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium ${
                activeTab === "address" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-400"
              }`}
              onClick={() => handleTabChange("address")}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard size={16} />
                <span>Wallet Address</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium ${
                activeTab === "link" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-400"
              }`}
              onClick={() => handleTabChange("link")}
            >
              <div className="flex items-center justify-center gap-2">
                <LinkIcon size={16} />
                <span>Generate Link</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium ${
                activeTab === "request" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-400"
              }`}
              onClick={() => handleTabChange("request")}
            >
              <div className="flex items-center justify-center gap-2">
                <UserRound size={16} />
                <span>Request User</span>
              </div>
            </button>
          </div>

          <div className="p-6">
            {activeTab === "username" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <QRCode 
                      value={`remlo:username:${session?.user?.username || ''}`}
                      size={180}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="w-full text-center mt-2">
                    <p className="text-sm text-gray-400 mb-1">Your Username</p>
                    <div className="flex items-center justify-center space-x-2 bg-zinc-800 rounded-lg p-3">
                      <AtSign size={16} className="text-emerald-400" />
                      <h2 className="text-lg font-bold">
                        {session?.user?.username || "Loading..."}
                      </h2>
                      <button
                        onClick={async () => {
                          await copyToClipboard(session?.user?.username || "");
                          toast.success("Username copied to clipboard");
                        }}
                        className="ml-2 p-1 rounded-full hover:bg-zinc-700 transition"
                        title="Copy username"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-400 mt-2">
                      Share your username with friends to receive payments
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <QRCode 
                      value={session?.user?.solanaAddress || ''}
                      size={180}
                      className="rounded"
                    />
                  </div>
                  
                  <div className="w-full">
                    <p className="text-sm text-gray-400 mb-1 text-center">Your Solana Address</p>
                    <div className="flex items-center justify-center space-x-2 bg-zinc-800 rounded-lg p-3">
                      <SolanaIcon className="text-emerald-400 h-4 w-4" />
                      <p className="font-mono text-sm overflow-hidden">
                        {shortenAddress(session?.user?.solanaAddress || "")}
                      </p>
                      <button
                        onClick={async () => {
                          await copyToClipboard(session?.user?.solanaAddress || "");
                          toast.success("Address copied to clipboard");
                        }}
                        className="ml-2 p-1 rounded-full hover:bg-zinc-700 transition"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    
                    <div className="flex justify-center mt-3">
                      <a
                        href={`https://explorer.solana.com/address/${session?.user?.solanaAddress}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-emerald-400 flex items-center space-x-1 hover:underline"
                      >
                        <span>View on Explorer</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "link" && (
              <div>
                {newRequestLink ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-center">Request Link Created!</h3>
                      
                      <div className="bg-zinc-800 p-4 rounded-lg">
                        <QRCode 
                          value={newRequestLink}
                          size={180}
                          className="rounded"
                        />
                      </div>
                      
                      <div className="w-full">
                        <p className="text-sm text-gray-400 mb-1 text-center">Payment Link</p>
                        <div className="flex items-center space-x-2 bg-zinc-800 rounded-lg p-3">
                          <p className="font-mono text-xs overflow-hidden truncate">
                            {newRequestLink}
                          </p>
                          <button
                            onClick={async () => {
                              await copyToClipboard(newRequestLink);
                              toast.success("Link copied to clipboard");
                            }}
                            className="ml-auto p-1 rounded-full hover:bg-zinc-700 flex-shrink-0"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex space-x-3 w-full">
                        <Button 
                          onClick={() => handleShareRequest(newRequestLink)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Share2 size={16} className="mr-2" />
                          Share Link
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            setNewRequestLink(null);
                            setNewRequestId(null);
                          }}
                          variant="secondary"
                          className="flex-1"
                        >
                          Create Another
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateLinkRequest} className="space-y-6">
                    {/* Token Selection */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Button
                        type="button"
                        variant={tokenType === "usds" ? "default" : "outline"}
                        className={`flex-1 flex items-center justify-center ${
                          tokenType === "usds" 
                            ? "bg-emerald-600 hover:bg-emerald-700" 
                            : "bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                        }`}
                        onClick={() => setTokenType("usds")}
                      >
                        <USDsIcon width={16} height={16} className="mr-2" />
                        USDs
                      </Button>
                      <Button
                        type="button"
                        variant={tokenType === "usdc" ? "default" : "outline"}
                        className={`flex-1 flex items-center justify-center ${
                          tokenType === "usdc" 
                            ? "bg-blue-600 hover:bg-blue-700" 
                            : "bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                        }`}
                        onClick={() => setTokenType("usdc")}
                      >
                        <USDCIcon width={16} height={16} className="mr-2" />
                        USDC
                      </Button>
                    </div>
                    
                    {/* Amount Input */}
                    <div className="mb-4">
                      <label htmlFor="amount" className="block text-sm font-medium mb-2">
                        Amount
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</div>
                        <input
                          type="number"
                          name="amount"
                          id="amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          className="w-full py-3 pl-8 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="note" className="block text-sm font-medium mb-2">
                        Note (Optional)
                      </label>
                      <input
                        type="text"
                        name="note"
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="For dinner, rent, etc."
                        className="w-full py-3 px-4 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating..." : "Create Payment Link"}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {activeTab === "request" && (
              <div>
                {newRequestId ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-center">Request Sent!</h3>
                      
                      <div className="w-full text-center p-4 bg-zinc-800 rounded-lg">
                        <p className="text-emerald-400 mb-2">
                          Your request has been sent to <span className="font-semibold">{recipientUsername}</span>
                        </p>
                        <p className="text-gray-300">
                          They will see your request in their payment requests list.
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => {
                          setNewRequestId(null);
                          setRecipientUsername("");
                          setUsernameStatus("idle");
                          setFoundUser(null);
                          setAmount("");
                          setNote("");
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 w-full"
                      >
                        Create Another Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePaymentRequest} className="space-y-6">
                    {/* Token Selection */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Button
                        type="button"
                        variant={tokenType === "usds" ? "default" : "outline"}
                        className={`flex-1 flex items-center justify-center ${
                          tokenType === "usds" 
                            ? "bg-emerald-600 hover:bg-emerald-700" 
                            : "bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                        }`}
                        onClick={() => setTokenType("usds")}
                      >
                        <USDsIcon width={16} height={16} className="mr-2" />
                        USDs
                      </Button>
                      <Button
                        type="button"
                        variant={tokenType === "usdc" ? "default" : "outline"}
                        className={`flex-1 flex items-center justify-center ${
                          tokenType === "usdc" 
                            ? "bg-blue-600 hover:bg-blue-700" 
                            : "bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                        }`}
                        onClick={() => setTokenType("usdc")}
                      >
                        <USDCIcon width={16} height={16} className="mr-2" />
                        USDC
                      </Button>
                    </div>
                    
                    {/* Username Input (Required) */}
                    <div className="mb-4">
                      <label htmlFor="username" className="block text-sm font-medium mb-2">
                        Request From Username <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <UserRound size={16} />
                        </div>
                        <input
                          type="text"
                          id="username"
                          value={recipientUsername}
                          onChange={handleUsernameChange}
                          placeholder="Enter username"
                          className="w-full py-3 pl-10 pr-10 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {isValidatingUsername ? (
                            <RefreshCw size={16} className="animate-spin text-gray-400" />
                          ) : usernameStatus === "valid" ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : usernameStatus === "invalid" && recipientUsername.length >= 3 ? (
                            <XCircle size={16} className="text-red-400" />
                          ) : null}
                        </div>
                      </div>
                      {usernameStatus === "valid" && foundUser && (
                        <div className="mt-1 text-xs text-emerald-400 flex items-center">
                          <CheckCircle2 size={12} className="mr-1 flex-shrink-0" />
                          Found: {foundUser.username}
                        </div>
                      )}
                      {usernameStatus === "invalid" && recipientUsername.length >= 3 && (
                        <div className="mt-1 text-xs text-red-400 flex items-center">
                          <XCircle size={12} className="mr-1 flex-shrink-0" />
                          Username not found
                        </div>
                      )}
                    </div>
                    
                    {/* Amount Input */}
                    <div className="mb-4">
                      <label htmlFor="amount" className="block text-sm font-medium mb-2">
                        Amount
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</div>
                        <input
                          type="number"
                          name="amount"
                          id="amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          className="w-full py-3 pl-8 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="note" className="block text-sm font-medium mb-2">
                        Note (Optional)
                      </label>
                      <input
                        type="text"
                        name="note"
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="For dinner, rent, etc."
                        className="w-full py-3 px-4 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading || !foundUser || usernameStatus !== "valid"}
                    >
                      {isLoading ? "Sending..." : "Send Payment Request"}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Requests History */}
        {activeTab === "request" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Payment Requests</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshPaymentRequests}
                className="text-emerald-400"
              >
                <RefreshCw size={14} className="mr-1" />
                Refresh
              </Button>
            </div>
            
            <div className="bg-zinc-900 rounded-lg">
              {(() => {
                // Filter to only show requests to specific users (recipientUsername exists)
                const userRequests = paymentRequests.filter(pr => pr.recipientUsername);
                
                if (userRequests.length === 0) {
                  return (
                    <div className="p-6 text-center text-gray-400">
                      <p>No payment requests to specific users yet</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-zinc-800">
                    {userRequests.map((pr) => (
                    <div key={pr.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          {pr.tokenType === "usds" ? (
                            <USDsIcon width={24} height={24} className="text-emerald-400 mr-2" />
                          ) : (
                            <USDCIcon width={24} height={24} className="text-blue-400 mr-2" />
                          )}
                          <span className="text-lg font-medium">
                            ${pr.amount} {pr.tokenType.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(pr.status)}
                          <span className="text-sm capitalize text-gray-300">{pr.status}</span>
                        </div>
                      </div>
                      
                      {/* Show recipient or requester info */}
                      {pr.type === 'received' && (
                        <div className="bg-emerald-900/30 text-emerald-400 px-3 py-2 rounded-md mb-3 flex items-center">
                          <UserRound size={14} className="mr-2" />
                          <span className="text-sm">
                            Requested by {pr.requesterUsername || pr.requesterEmail || 'Someone'}
                          </span>
                        </div>
                      )}
                      
                      {pr.type === 'created' && pr.recipientUsername && (
                        <div className="bg-blue-900/30 text-blue-400 px-3 py-2 rounded-md mb-3 flex items-center">
                          <User size={14} className="mr-2" />
                          <span className="text-sm">
                            Requested from {pr.recipientUsername}
                          </span>
                        </div>
                      )}
                      
                      {pr.note && (
                        <div className="bg-zinc-700/50 px-3 py-2 rounded-md mb-3 text-sm text-gray-300">
                          "{pr.note}"
                        </div>
                      )}
                        
                      <div className="text-xs text-gray-500 mb-3">
                        Created {formatDate(pr.createdAt)}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="bg-zinc-700 hover:bg-zinc-600 text-gray-300"
                          onClick={() => copyToClipboard(pr.link)}
                        >
                          <Copy size={14} className="mr-1" />
                          Copy Link
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="bg-zinc-700 hover:bg-zinc-600 text-gray-300"
                          onClick={() => handleShareRequest(pr.link)}
                        >
                          <Share2 size={14} className="mr-1" />
                          Share
                        </Button>
                          
                        {pr.status === "pending" && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="bg-red-900/30 text-red-400 hover:bg-red-900/50"
                            onClick={() => handleCancelRequest(pr.id)}
                          >
                            <Trash2 size={14} className="mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                                      ))}
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* Payment Links History */}
        {activeTab === "link" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Payment Links History</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshClaimedLinks}
                className="text-emerald-400"
              >
                <RefreshCw size={14} className="mr-1" />
                Refresh
              </Button>
            </div>
            
            <div className="bg-zinc-900 rounded-lg">
              {(() => {
                // Combine payment receive links (no specific recipient) and claimed payment links
                const receiveLinks = paymentRequests.filter(pr => !pr.recipientUsername);
                const allLinkActivity = [
                  ...receiveLinks.map(pr => ({ ...pr, type: 'payment_receive_link' as const })),
                  ...claimedLinks
                ].sort((a, b) => {
                  const dateA = new Date(a.type === 'payment_link_claimed' ? (a as ClaimedPaymentLink).claimedAt || a.createdAt : a.createdAt);
                  const dateB = new Date(b.type === 'payment_link_claimed' ? (b as ClaimedPaymentLink).claimedAt || b.createdAt : b.createdAt);
                  return dateB.getTime() - dateA.getTime();
                });

                if (allLinkActivity.length === 0) {
                  return (
                    <div className="p-6 text-center text-gray-400">
                      <p>No payment link activity yet</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-zinc-800">
                    {allLinkActivity.map((item) => {
                                             // Handle payment receive links
                       if (item.type === 'payment_receive_link') {
                         const pr = item as unknown as PaymentRequest;
                        return (
                          <div key={pr.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center">
                                {pr.tokenType === "usds" ? (
                                  <USDsIcon width={24} height={24} className="text-emerald-400 mr-2" />
                                ) : (
                                  <USDCIcon width={24} height={24} className="text-blue-400 mr-2" />
                                )}
                                <span className="text-lg font-medium">
                                  ${pr.amount} {pr.tokenType.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(pr.status)}
                                <span className="text-sm capitalize text-gray-300">{pr.status}</span>
                              </div>
                            </div>
                            
                            {/* Payment Receive Link Info */}
                            <div className="bg-blue-900/30 text-blue-400 px-3 py-2 rounded-md mb-3 flex items-center">
                              <LinkIcon size={14} className="mr-2" />
                              <span className="text-sm">
                                Payment receive link - anyone can pay
                              </span>
                            </div>
                            
                            {pr.note && (
                              <div className="bg-zinc-700/50 px-3 py-2 rounded-md mb-3 text-sm text-gray-300">
                                "{pr.note}"
                              </div>
                            )}
                              
                            <div className="text-xs text-gray-500 mb-3">
                              Created {formatDate(pr.createdAt)}
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="bg-zinc-700 hover:bg-zinc-600 text-gray-300"
                                onClick={() => copyToClipboard(pr.link)}
                              >
                                <Copy size={14} className="mr-1" />
                                Copy Link
                              </Button>
                              
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="bg-zinc-700 hover:bg-zinc-600 text-gray-300"
                                onClick={() => handleShareRequest(pr.link)}
                              >
                                <Share2 size={14} className="mr-1" />
                                Share
                              </Button>
                                
                              {pr.status === "pending" && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                  onClick={() => handleCancelRequest(pr.id)}
                                >
                                  <Trash2 size={14} className="mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                                             } else {
                         // Handle claimed payment links
                         const cl = item as ClaimedPaymentLink;
                         return (
                           <div key={cl.id} className="p-4 border border-zinc-800 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition">
                             <div className="flex justify-between items-start mb-3">
                               <div className="flex items-center">
                                 {cl.tokenType === "usds" ? (
                                   <USDsIcon width={24} height={24} className="text-emerald-400 mr-2" />
                                 ) : (
                                   <USDCIcon width={24} height={24} className="text-blue-400 mr-2" />
                                 )}
                                 <span className="text-lg font-medium">
                                   ${cl.amount} {cl.tokenType.toUpperCase()}
                                 </span>
                               </div>
                               <div className="flex items-center space-x-1">
                                 <CheckCircle2 size={16} className="text-emerald-400" />
                                 <span className="text-sm text-emerald-400">Claimed</span>
                               </div>
                             </div>
                             
                             {/* Payment Link Claimed Info */}
                             <div className="bg-emerald-900/30 text-emerald-400 px-3 py-2 rounded-md mb-3 flex items-center">
                               <LinkIcon size={14} className="mr-2" />
                               <span className="text-sm">
                                 Payment link claimed by {cl.claimedBy ? shortenAddress(cl.claimedBy) : 'Someone'}
                               </span>
                             </div>
                             
                             {cl.note && (
                               <div className="bg-zinc-700/50 px-3 py-2 rounded-md mb-3 text-sm text-gray-300">
                                 "{cl.note}"
                               </div>
                             )}
                               
                             <div className="text-xs text-gray-500 mb-3">
                               Claimed {formatDate(cl.claimedAt || cl.createdAt)}
                             </div>
                             
                             <div className="flex flex-wrap gap-2">
                               <Button 
                                 size="sm" 
                                 variant="ghost" 
                                 className="bg-zinc-700 hover:bg-zinc-600 text-gray-300"
                                 onClick={() => copyToClipboard(`${window.location.origin}/payment-link/${cl.shortId}`)}
                               >
                                 <Copy size={14} className="mr-1" />
                                 Copy Link
                               </Button>
                             </div>
                           </div>
                         );
                       }
                     })}
                   </div>
                 );
               })()}
             </div>
          </>
        )}
      </main>
    </div>
  );
} 
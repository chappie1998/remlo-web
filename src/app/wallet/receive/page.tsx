"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { copyToClipboard, formatDate } from "@/lib/utils";
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
}

export default function ReceivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("address");
  const [tokenType, setTokenType] = useState("usds");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [newRequestId, setNewRequestId] = useState<string | null>(null);
  const [newRequestLink, setNewRequestLink] = useState<string | null>(null);

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
          link: pr.link
        })));
      }
    } catch (error) {
      console.error('Error refreshing payment requests:', error);
    }
  };

  // Fetch payment requests from the API
  useEffect(() => {
    const fetchPaymentRequests = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch('/api/payment-request/list');
          
          if (!response.ok) {
            const error = await response.json();
            console.error('Error fetching payment requests:', error);
            return;
          }
          
          const data = await response.json();
          console.log('Fetched payment requests:', data);
          
          if (data.success && Array.isArray(data.paymentRequests)) {
            setPaymentRequests(data.paymentRequests.map((pr: any) => ({
              id: pr.id,
              amount: pr.amount,
              tokenType: pr.tokenType,
              status: pr.status.toLowerCase(),
              createdAt: pr.createdAt,
              link: pr.link
            })));
          }
        } catch (error) {
          console.error('Error fetching payment requests:', error);
        }
      }
    };

    fetchPaymentRequests();
  }, [status]);

  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the real API endpoint to create the payment request
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
        };
        
        // Add to the list
        setPaymentRequests(prev => [newRequest, ...prev]);
        
        // Show the new request
        setNewRequestId(paymentRequest.id);
        setNewRequestLink(paymentRequest.link);
        
        // Reset form
        setAmount("");
        setNote("");
        
        toast.success("Payment request created!");
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
          text: "Please pay this request using Solana Passcode Wallet",
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

      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-bold">Receive</h1>
          <button 
            className="ml-auto text-gray-400 hover:text-white"
            onClick={() => router.push("/wallet")}
          >
            Back to Wallet
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm relative flex items-center gap-2 ${
              activeTab === "address"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("address")}
          >
            <QrCode width={16} height={16} />
            Address
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative flex items-center gap-2 ${
              activeTab === "payment-request"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("payment-request")}
          >
            <LinkIcon width={16} height={16} />
            Payment Request
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm relative flex items-center gap-2 ${
              activeTab === "history"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("history")}
          >
            <Clock width={14} height={14} />
            Request History
          </button>
        </div>

        {/* Address Tab */}
        {activeTab === "address" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 text-center mb-6">
              <p className="text-sm text-gray-400 mb-2">Your wallet address</p>
              <p className="font-mono text-sm text-gray-200 break-all mb-4">{session?.user?.solanaAddress}</p>
              
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-white rounded-lg">
                  {session?.user?.solanaAddress && (
                    <QRCode 
                      value={session.user.solanaAddress}
                      size={160}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  )}
                </div>
              </div>
              
              <div className="flex justify-center">
                <button
                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium transition"
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
                  <Copy width={16} height={16} />
                  Copy Address
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Supported Assets</h3>
              <div className="grid gap-3">
                <div className="flex items-center p-3 border border-zinc-800 rounded-lg bg-zinc-800/30">
                  <div className="p-2 rounded-full bg-emerald-900/30 mr-3">
                    <USDsIcon className="text-emerald-400" width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">USDs</p>
                    <p className="text-xs text-gray-400">Stable token with 4.2% APY</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border border-zinc-800 rounded-lg bg-zinc-800/30">
                  <div className="p-2 rounded-full bg-blue-900/30 mr-3">
                    <USDCIcon className="text-blue-400" width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">USDC</p>
                    <p className="text-xs text-gray-400">USD Coin stablecoin</p>
                  </div>
                </div>

                <div className="flex items-center p-3 border border-zinc-800 rounded-lg bg-zinc-800/30">
                  <div className="p-2 rounded-full bg-purple-900/30 mr-3">
                    <SolanaIcon className="text-purple-400" width={20} height={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-200">SOL</p>
                    <p className="text-xs text-gray-400">Solana native token</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Request Tab */}
        {activeTab === "payment-request" && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            {newRequestId ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Payment Request Created</h2>
                  <button 
                    className="text-gray-400 hover:text-white"
                    onClick={() => {
                      setNewRequestId(null);
                      setNewRequestLink(null);
                    }}
                  >
                    Create New
                  </button>
                </div>
                
                <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700 text-center">
                  <p className="text-sm text-gray-400 mb-4">Scan this QR code to pay</p>
                  
                  {/* QR Code for the payment link */}
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-lg">
                      {newRequestLink && (
                        <QRCode 
                          value={newRequestLink}
                          size={160}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                          viewBox={`0 0 256 256`}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-400">Payment Request Link</p>
                    <p className="font-mono text-sm text-gray-200 break-all bg-zinc-900 p-2 rounded mt-1">
                      {newRequestLink}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition"
                      onClick={() => newRequestLink && handleShareRequest(newRequestLink)}
                    >
                      <Share2 width={14} height={14} />
                      Share
                    </button>
                    <button
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition"
                      onClick={async () => {
                        if (newRequestLink) {
                          const success = await copyToClipboard(newRequestLink);
                          if (success) {
                            toast.success("Link copied to clipboard");
                          } else {
                            toast.error("Failed to copy link");
                          }
                        }
                      }}
                    >
                      <Copy width={14} height={14} />
                      Copy Link
                    </button>
                  </div>
                </div>
                
                <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Status</span>
                    <span className="flex items-center text-yellow-500 text-sm">
                      <Clock width={14} height={14} /> Pending
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Amount</span>
                    <span className="font-medium text-white">
                      {paymentRequests.find(req => req.id === newRequestId)?.amount || "0"} 
                      {" "}
                      {paymentRequests.find(req => req.id === newRequestId)?.tokenType.toUpperCase() || ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Created</span>
                    <span className="text-sm text-gray-300">
                      {formatDate(new Date().toISOString())}
                    </span>
                  </div>
                </div>
                
                <button
                  className="w-full bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 text-sm font-medium transition"
                  onClick={async () => {
                    if (newRequestId) {
                      await handleCancelRequest(newRequestId);
                      // After cancellation, go back to the create form
                      setNewRequestId(null);
                      setNewRequestLink(null);
                    }
                  }}
                >
                  <Trash2 width={16} height={16} />
                  Cancel Payment Request
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-white">Create Payment Request</h2>
                <p className="text-gray-400 text-sm">
                  Generate a payment link to request funds from anyone. They don't need to have an account.
                </p>
                
                <form onSubmit={handleCreatePaymentRequest} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="token-selector" className="text-sm font-medium text-gray-300">
                      Token
                    </label>
                    <select
                      id="token-selector"
                      value={tokenType}
                      onChange={(e) => setTokenType(e.target.value)}
                      className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="usds">USDs</option>
                      <option value="usdc">USDC</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="amount" className="text-sm font-medium text-gray-300">
                      Amount
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
                  
                  <div className="space-y-2">
                    <label htmlFor="note" className="text-sm font-medium text-gray-300">
                      Note (Optional)
                    </label>
                    <input
                      id="note"
                      type="text"
                      placeholder="What's this payment for?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw width={16} height={16} className="animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      "Create Payment Request"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6 text-white">Payment Request History</h2>
            
            {paymentRequests.length > 0 ? (
              <div className="space-y-4">
                {paymentRequests.map((request) => (
                  <div key={request.id} className="bg-zinc-800 rounded-lg border border-zinc-700 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className="ml-2 text-sm font-medium capitalize text-gray-200">
                          {request.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-400">Amount</span>
                        <span className="font-medium text-white">
                          {request.amount} {request.tokenType.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Link</span>
                        <span className="text-sm text-emerald-400 truncate max-w-[200px]">
                          {request.link}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      {request.status === "pending" && (
                        <>
                          <button
                            className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
                            onClick={() => handleShareRequest(request.link)}
                          >
                            <Share2 width={14} height={14} />
                            Share
                          </button>
                          <button
                            className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
                            onClick={async () => {
                              const success = await copyToClipboard(request.link);
                              if (success) {
                                toast.success("Link copied to clipboard");
                              } else {
                                toast.error("Failed to copy link");
                              }
                            }}
                          >
                            <Copy width={14} height={14} />
                            Copy
                          </button>
                          <button
                            className="flex-1 bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
                            onClick={() => handleCancelRequest(request.id)}
                          >
                            <Trash2 width={14} height={14} />
                            Cancel
                          </button>
                        </>
                      )}
                      
                      {request.status === "completed" && (
                        <button
                          className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
                          onClick={() => router.push(`/pay/${request.id}`)}
                        >
                          <ExternalLink width={14} height={14} />
                          View Details
                        </button>
                      )}
                      
                      {request.status === "cancelled" && (
                        <span className="text-xs text-gray-500 italic">
                          This request has been cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-zinc-800 mb-3">
                  <LinkIcon width={32} height={32} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-medium mb-1 text-gray-300">No payment requests yet</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Create a payment request link to make it easy for others to pay you
                </p>
                <Button
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setActiveTab("payment-request")}
                >
                  Create Payment Request
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 
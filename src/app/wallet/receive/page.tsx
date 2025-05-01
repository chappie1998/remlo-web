"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  CreditCard
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
  const [activeTab, setActiveTab] = useState("username");
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
              onClick={() => setActiveTab("username")}
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
              onClick={() => setActiveTab("address")}
            >
              <div className="flex items-center justify-center gap-2">
                <CreditCard size={16} />
                <span>Wallet Address</span>
              </div>
            </button>
            <button
              className={`flex-1 py-4 text-center font-medium ${
                activeTab === "request" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-gray-400"
              }`}
              onClick={() => setActiveTab("request")}
            >
              <div className="flex items-center justify-center gap-2">
                <LinkIcon size={16} />
                <span>Request Money</span>
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

            {activeTab === "request" && (
              <div>
                {newRequestLink ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-center">Request Created!</h3>
                      
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
                  <form onSubmit={handleCreatePaymentRequest} className="space-y-6">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium mb-2">
                        Amount
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          name="amount"
                          id="amount"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="w-full pl-7 pr-20 py-3 bg-zinc-800 border-0 rounded-md focus:ring-1 focus:ring-emerald-400 text-white"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <label htmlFor="token-type" className="sr-only">
                            Token Type
                          </label>
                          <select
                            id="token-type"
                            name="token-type"
                            value={tokenType}
                            onChange={(e) => setTokenType(e.target.value)}
                            className="h-full py-0 pl-2 pr-7 border-0 bg-zinc-800 rounded-r-md focus:ring-1 focus:ring-emerald-400 text-white"
                          >
                            <option value="usds">USDS</option>
                            <option value="usdc">USDC</option>
                          </select>
                        </div>
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
                      {isLoading ? "Creating..." : "Create Payment Request"}
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
              {paymentRequests.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p>No payment requests yet</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {paymentRequests.map((request) => (
                    <div key={request.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">
                              ${parseFloat(request.amount).toFixed(2)}
                            </span>
                            <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-gray-300">
                              {request.tokenType.toUpperCase()}
                            </span>
                            <span className="flex items-center text-xs text-gray-400">
                              {getStatusIcon(request.status)}
                              <span className="ml-1 capitalize">{request.status}</span>
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(request.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleShareRequest(request.link)}
                            className="p-2 rounded-full hover:bg-zinc-800 transition"
                            title="Share payment link"
                          >
                            <Share2 size={14} />
                          </button>
                          
                          {request.status === "pending" && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="p-2 rounded-full hover:bg-zinc-800 transition text-red-400"
                              title="Cancel request"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
} 
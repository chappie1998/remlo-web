"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { USDsIcon, USDCIcon } from "@/components/icons";
import { Clock, Link, Copy, ExternalLink, UserRound, User, LinkIcon, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentRequest {
  id: string;
  shortId: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  expiresAt?: string;
  createdAt: string;
  link: string;
  type: string;
  requesterUsername?: string;
  requesterEmail?: string;
  recipientUsername?: string;
}

export default function PaymentRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch payment requests
  useEffect(() => {
    const fetchPaymentRequests = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/payment-request/list");
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch payment requests");
        }
        
        const data = await response.json();
        setPaymentRequests(data.paymentRequests);
      } catch (error) {
        console.error("Error fetching payment requests:", error);
        setError(error instanceof Error ? error.message : "Failed to load payment requests");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchPaymentRequests();
    }
  }, [status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard");
  };

  // Add the missing functions
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
        // Refresh the payment requests list
        const fetchPaymentRequests = async () => {
          setIsLoading(true);
          try {
            const response = await fetch("/api/payment-request/list");
            
            if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || "Failed to fetch payment requests");
            }
            
            const data = await response.json();
            setPaymentRequests(data.paymentRequests);
          } catch (error) {
            console.error("Error fetching payment requests:", error);
            setError(error instanceof Error ? error.message : "Failed to load payment requests");
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchPaymentRequests();
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

  // Not authenticated
  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  // Loading state
  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin">
            <Clock size={32} className="text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Payment Requests</h1>
          <Button 
            onClick={() => router.push("/wallet/receive")} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Create New
          </Button>
        </div>
        
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-900/20 text-red-400">
            {error}
          </div>
        )}
        
        {paymentRequests.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <Link className="mx-auto mb-4 h-12 w-12 text-gray-500" />
            <h2 className="text-xl font-semibold mb-2">No Payment Requests</h2>
            <p className="text-gray-400 mb-6">You haven't created any payment requests yet.</p>
            <Button 
              onClick={() => router.push("/wallet/receive")} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Create Your First Request
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentRequests.map((pr) => (
              <div key={pr.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center">
                    {pr.tokenType === "usds" ? (
                      <USDsIcon width={20} height={20} className="text-emerald-400 mr-2" />
                    ) : (
                      <USDCIcon width={20} height={20} className="text-blue-400 mr-2" />
                    )}
                    <span className="text-lg font-medium">
                      {pr.amount} {pr.tokenType.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-400">
                    <Clock size={14} />
                    <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                {/* Request Type Indicators */}
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
                
                {pr.type === 'created' && !pr.recipientUsername && (
                  <div className="bg-gray-800 text-gray-300 px-3 py-2 rounded-md mb-3 flex items-center">
                    <LinkIcon size={14} className="mr-2" />
                    <span className="text-sm">
                      General payment request
                    </span>
                  </div>
                )}
                
                {pr.note && (
                  <div className="bg-zinc-800 rounded p-2 mb-3 text-sm text-gray-300">
                    {pr.note}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="bg-zinc-800 hover:bg-zinc-700 text-gray-300"
                    onClick={() => copyToClipboard(pr.link)}
                  >
                    <Copy size={14} className="mr-1" />
                    Copy Link
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="bg-zinc-800 hover:bg-zinc-700 text-gray-300"
                    onClick={() => window.open(pr.link, "_blank")}
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Open
                  </Button>
                  
                  {pr.status.toLowerCase() === "pending" && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="bg-red-900/30 hover:bg-red-900/50 text-red-400"
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
        )}
      </main>
    </div>
  );
} 
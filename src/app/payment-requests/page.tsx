"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { USDsIcon, USDCIcon } from "@/components/icons";
import { Clock, Link, Copy, ExternalLink } from "lucide-react";
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
                
                {pr.note && (
                  <div className="bg-zinc-800 rounded p-2 mb-3 text-sm text-gray-300">
                    {pr.note}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-400">
                    Status: <span className="text-yellow-500">{pr.status}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-zinc-700 hover:bg-zinc-800 text-gray-300"
                      onClick={() => copyToClipboard(pr.link)}
                    >
                      <Copy size={14} className="mr-1" /> Copy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-zinc-700 hover:bg-zinc-800 text-gray-300"
                      onClick={() => window.open(pr.link, "_blank")}
                    >
                      <ExternalLink size={14} className="mr-1" /> Open
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import { isValidSolanaAddress } from "@/lib/solana";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  CreditCard,
  Key,
  Shield,
  User,
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";

export default function PaymentLinkClaimPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch payment link details when component mounts
  useEffect(() => {
    const fetchPaymentLink = async () => {
      if (!params) return;
      
      // Access shortId directly without destructuring
      const shortId = Array.isArray(params.shortId) 
        ? params.shortId[0] 
        : params.shortId;
        
      if (!shortId) return;
      
      setIsLoading(true);
      
      try {
        // Fetch the payment link details from API using the new route
        const response = await fetch(`/api/payment-link/info?id=${encodeURIComponent(shortId)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch payment link");
        }
        
        const data = await response.json();
        setPaymentLink(data);
        
        // If the payment link is already claimed, set success to true
        if (data.status === "claimed") {
          setSuccess(true);
        }
      } catch (error) {
        console.error("Error fetching payment link:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load payment link");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentLink();
  }, [params]);

  // Handle OTP verification and claim
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("OTP must be exactly 6 digits");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Access shortId directly without destructuring 
      const shortId = Array.isArray(params.shortId) 
        ? params.shortId[0] 
        : params.shortId;
        
      const response = await fetch("/api/payment-link/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shortId,
          otp
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify payment link");
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        toast.success("Payment successfully received!");
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      setError(error instanceof Error ? error.message : "Verification failed");
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // Format sender name for display
  const getSenderName = () => {
    if (!paymentLink?.creator) return "Unknown sender";
    
    if (paymentLink.creator.name) {
      return paymentLink.creator.name;
    } else if (paymentLink.creator.username) {
      return `@${paymentLink.creator.username}`;
    } else if (paymentLink.creator.solanaAddress) {
      return `${paymentLink.creator.solanaAddress.slice(0, 4)}...${paymentLink.creator.solanaAddress.slice(-4)}`;
    } else {
      return "Unknown sender";
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8 text-emerald-400" />
        </div>
      </div>
    );
  }

  // Show error if payment link not found
  if (!paymentLink) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Link Not Found</h1>
          <p className="text-center mb-6 text-gray-300">
            This payment link may have been expired or revoked.
          </p>
          <Button onClick={() => router.push("/wallet")}>
            Go to Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Show expired state
  if (paymentLink.status === "expired" || new Date(paymentLink.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Clock className="h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Link Expired</h1>
          <p className="text-center mb-6 text-gray-300">
            This payment link has expired and is no longer valid.
          </p>
          <Button onClick={() => router.push("/wallet")}>
            Go to Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Show already claimed state
  if (paymentLink.status === "claimed") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Already Claimed</h1>
          <p className="text-center mb-6 text-gray-300">
            This payment has already been claimed.
          </p>
          <Button onClick={() => router.push("/wallet")}>
            Go to Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Show success state after claiming
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Received!</h1>
          <p className="text-center mb-2 text-gray-200">
            You have successfully claimed {paymentLink.amount} {paymentLink.tokenType.toUpperCase()}.
          </p>
          <p className="text-center text-sm text-gray-400 mb-6">
            The funds have been transferred to your wallet.
          </p>
          <Button onClick={() => router.push("/wallet")}>
            View in Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Require authentication to claim
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <CreditCard className="h-16 w-16 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Available</h1>
          <p className="text-center mb-2 text-gray-200">
            You've received {paymentLink.amount} {paymentLink.tokenType.toUpperCase()} from {getSenderName()}
          </p>
          <p className="text-center text-sm text-gray-400 mb-6">
            Please sign in to claim this payment.
          </p>
          <Button onClick={() => {
            // Get shortId safely without destructuring
            const shortId = Array.isArray(params.shortId) 
              ? params.shortId[0] 
              : params.shortId;
            router.push(`/auth/signin?callbackUrl=/payment-link/${shortId}`);
          }}>
            Sign In to Claim
          </Button>
        </div>
      </div>
    );
  }

  // Require wallet setup to claim
  if (status === "authenticated" && !session?.user?.solanaAddress) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <CreditCard className="h-16 w-16 text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Setup Required</h1>
          <p className="text-center mb-2 text-gray-200">
            You've received {paymentLink.amount} {paymentLink.tokenType.toUpperCase()} from {getSenderName()}
          </p>
          <p className="text-center text-sm text-gray-400 mb-6">
            Please set up your wallet to claim this payment.
          </p>
          <Button onClick={() => router.push("/wallet")}>
            Set Up Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Main claim form
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="container max-w-md mx-auto px-4 py-8 flex-1">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4 text-center">Claim Payment</h1>
          
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              {paymentLink.tokenType.toLowerCase() === 'usds' ? (
                <USDsIcon className="w-8 h-8" />
              ) : (
                <USDCIcon className="w-8 h-8" />
              )}
              <span className="text-3xl font-bold">{paymentLink.amount}</span>
              <span className="text-lg font-medium">{paymentLink.tokenType.toUpperCase()}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-3 text-emerald-400">
              <User size={16} />
              <span className="font-medium">From: {getSenderName()}</span>
            </div>
            
            {paymentLink.note && (
              <p className="text-center text-gray-300 mb-3 italic border-l-4 border-zinc-700 pl-3 py-2 mx-auto max-w-xs">
                "{paymentLink.note}"
              </p>
            )}
            
            <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-1">
              <Clock size={14} />
              Expires {new Date(paymentLink.expiresAt).toLocaleString()}
            </p>
          </div>
          
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="block">Enter OTP to Claim</Label>
              <div className="relative">
                <Shield 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" 
                />
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="pl-8 bg-zinc-800 border-zinc-700 text-white"
                  maxLength={6}
                  required
                />
              </div>
              <p className="text-xs text-gray-400">
                Enter the OTP (One-Time Password) that the sender shared with you.
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Claim Payment"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 
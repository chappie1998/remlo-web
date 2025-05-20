"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { isValidPasscode, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";
import QRCode from 'react-qr-code';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeftRight,
  UserRound,
  QrCode,
  Copy,
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";

// This would come from your API in a real implementation
interface PaymentRequest {
  id: string;
  amount: string;
  tokenType: string;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  note?: string;
  requesterAddress: string;
  requesterName?: string;
}

export default function PaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [showQrCode, setShowQrCode] = useState(true);
  const [processingStage, setProcessingStage] = useState("idle");

  // Add console logging to debug session state
  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [session, status]);

  // Fetch payment request details
  useEffect(() => {
    const fetchPaymentRequest = async () => {
      setIsLoading(true);
      try {
        console.log(`Fetching payment request with ID: ${requestId}`);
        
        // Fetch the payment request from the API
        const response = await fetch(`/api/payment-request/${requestId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error response: ${JSON.stringify(errorData)}`);
          throw new Error(errorData.error || "Failed to fetch payment request");
        }
        
        const data = await response.json();
        console.log(`Payment request data:`, data);
        setPaymentRequest(data);
      } catch (error) {
        console.error("Error fetching payment request:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load payment request");
      } finally {
        setIsLoading(false);
      }
    };

    if (requestId) {
      fetchPaymentRequest();
    }
  }, [requestId]);

  // This function will be used to refetch the payment request
  const refreshPaymentRequest = async () => {
    try {
      console.log(`Refreshing payment request with ID: ${requestId}`);
      
      // Fetch the payment request from the API
      const response = await fetch(`/api/payment-request/${requestId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error response: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.error || "Failed to fetch payment request");
      }
      
      const data = await response.json();
      console.log(`Refreshed payment request data:`, data);
      setPaymentRequest(data);
    } catch (error) {
      console.error("Error refreshing payment request:", error);
      toast.error(error instanceof Error ? error.message : "Failed to refresh payment request");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setProcessingStage("validating");

    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      setProcessingStage("idle");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("connecting");

    // Create an abort controller for the token transaction to implement a timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

    try {
      if (!paymentRequest) {
        throw new Error("Payment request not found");
      }

      // Step 1: Send the actual token transaction
      console.log("Sending token transaction to relayer...");
      setProcessingStage("sending");
      
      const tokenResponse = await fetch('/api/wallet/send-token-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: paymentRequest.requesterAddress,
          amount: paymentRequest.amount,
          passcode: passcode
        }),
        signal: abortController.signal
      }).catch(err => {
        // Handle fetch errors like network issues or timeouts
        if (err.name === 'AbortError') {
          throw new Error('Transaction request timed out. The relayer may be unavailable.');
        }
        throw err;
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("Token transaction failed:", errorData);
        throw new Error(errorData.error || 'Transaction failed');
      }
      
      const tokenResult = await tokenResponse.json();
      console.log('Token transaction completed:', tokenResult);
      
      // Step 2: Update the payment request status in the database
      setProcessingStage("completing");
      const completeResponse = await fetch('/api/payment-request/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentRequestId: requestId,
          transactionSignature: tokenResult.signature, // Use the actual transaction signature
        }),
      });
      
      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Payment status update failed');
      }
      
      const completeResult = await completeResponse.json();
      console.log('Payment completed:', completeResult);
      
      setProcessingStage("success");
      toast.success("Payment successful!");
      
      // Refresh payment request data from server
      await refreshPaymentRequest();
      
      setShowPasscodeModal(false);
      setPasscode("");
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      setProcessingStage("error");
      toast.error(errorMessage);
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  // Add a better check function to handle session states
  const getAuthState = () => {
    // Loading state
    if (status === "loading") {
      return "loading";
    }
    
    // Authenticated with passcode set up
    if (status === "authenticated" && session?.user?.hasPasscode) {
      return "authenticated_with_passcode";
    }
    
    // Authenticated but no passcode
    if (status === "authenticated" && !session?.user?.hasPasscode) {
      return "authenticated_without_passcode";
    }
    
    // Not authenticated
    return "unauthenticated";
  };

  // Handle initialization and loading states
  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin">
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading payment request...</p>
          </div>
        </div>
      </div>
    );
  }

  // If payment request not found
  if (!paymentRequest) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <div className="p-4 rounded-full bg-red-800/50 text-red-400">
              <XCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold">Payment Request Not Found</h1>
            <p className="text-gray-400">
              The payment request you're looking for doesn't exist or has been canceled.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
              onClick={() => router.push("/wallet")}
            >
              Go to Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If payment request has been cancelled
  if (paymentRequest.status === "cancelled") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <div className="p-4 rounded-full bg-red-800/50 text-red-400">
              <XCircle size={40} />
            </div>
            <h1 className="text-2xl font-bold">Payment Request Cancelled</h1>
            <p className="text-gray-400">
              This payment request has been cancelled by the requester.
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
              onClick={() => router.push("/wallet")}
            >
              Go to Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If payment has been completed
  if (paymentRequest.status === "completed") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4 max-w-md text-center p-6">
            <div className="p-4 rounded-full bg-green-800/50 text-green-400">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-gray-400">
              You have successfully sent {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()} to {paymentRequest.requesterName || "the recipient"}.
            </p>
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 w-full mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Amount</span>
                <span className="font-medium text-white">
                  {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()}
                </span>
              </div>
              {paymentRequest.note && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Note</span>
                  <span className="text-sm text-gray-300">{paymentRequest.note}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Recipient</span>
                <span className="text-sm text-emerald-400 truncate max-w-[200px]">
                  {paymentRequest.requesterName || paymentRequest.requesterAddress.substring(0, 8) + '...'}
                </span>
              </div>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white mt-4"
              onClick={() => router.push("/wallet")}
            >
              Return to Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment request is pending
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      
      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-lg">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-4 mb-4 rounded-full bg-zinc-800 text-gray-300">
              <UserRound size={32} />
            </div>
            <h1 className="text-2xl font-bold">Payment Request</h1>
            <p className="text-gray-400 mt-2">
              {paymentRequest.requesterName || "Someone"} is requesting a payment of {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()}
            </p>
            
            <button 
              className="flex items-center mt-4 px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-all text-sm"
              onClick={() => setShowQrCode(!showQrCode)}
              aria-expanded={showQrCode}
            >
              <QrCode size={14} className={`mr-2 ${showQrCode ? 'text-emerald-400' : ''}`} />
              {showQrCode ? "Hide QR Code" : "Show QR Code"}
            </button>
          </div>
          
          {/* QR Code for direct payment */}
          {showQrCode && (
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6 transition-all duration-300">
              <div className="flex flex-col items-center text-center mb-4">
                <p className="text-sm text-gray-300 mb-4 font-medium">Scan QR Code to Pay</p>
                <div className="bg-white p-4 rounded-lg mb-2 shadow-lg">
                  <QRCode
                    value={JSON.stringify({
                      action: "send",
                      recipient: paymentRequest.requesterAddress,
                      amount: paymentRequest.amount,
                      token: paymentRequest.tokenType,
                      note: paymentRequest.note || ""
                    })}
                    size={180}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 256 256`}
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                  />
                </div>
                <div className="flex items-center mt-2 text-emerald-400">
                  <p className="text-xs">Scan with Remlo App</p>
                </div>
              </div>
              <div className="bg-zinc-900 rounded p-3 mt-2">
                <p className="text-xs text-gray-400 text-center font-medium">Recipient Address</p>
                <div className="flex items-center justify-center mt-1">
                  <p className="text-xs text-gray-300 font-mono truncate max-w-[80%]">
                    {paymentRequest.requesterAddress}
                  </p>
                  <button 
                    className="ml-2 p-1 rounded-md hover:bg-zinc-700 transition-colors"
                    onClick={() => {
                      copyToClipboard(paymentRequest.requesterAddress);
                      toast.success("Address copied to clipboard");
                    }}
                    aria-label="Copy address"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Status</span>
              <span className="flex items-center text-yellow-500 text-sm">
                <Clock size={14} className="mr-1" /> Pending
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">Amount</span>
              <div className="flex items-center">
                {paymentRequest.tokenType === "usds" ? (
                  <USDsIcon className="text-emerald-400 mr-2" width={16} height={16} />
                ) : (
                  <USDCIcon className="text-blue-400 mr-2" width={16} height={16} />
                )}
                <span className="font-medium text-white">
                  {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-400">To</span>
              <span className="text-sm text-gray-300">
                {paymentRequest.requesterName || "Anonymous"}
              </span>
            </div>
            {paymentRequest.note && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Note</span>
                <span className="text-sm text-gray-300">{paymentRequest.note}</span>
              </div>
            )}
          </div>
          
          {getAuthState() === "authenticated_with_passcode" && (
            <Button
              onClick={() => setShowPasscodeModal(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
            >
              Pay {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()}
            </Button>
          )}
          
          {getAuthState() === "authenticated_without_passcode" && (
            <div className="space-y-3">
              <p className="text-sm text-amber-400">You need to set up your wallet passcode first.</p>
              <Button
                onClick={() => router.push("/wallet/setup")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
              >
                Set up Wallet
              </Button>
            </div>
          )}
          
          {getAuthState() === "unauthenticated" && (
            <Button
              onClick={() => router.push("/auth/signin?callbackUrl=" + encodeURIComponent(window.location.href))}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
            >
              Sign in to Pay
            </Button>
          )}
          
          <p className="text-center text-xs text-gray-500 mt-4">
            This payment will be processed on the Solana {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'} network.
          </p>
        </div>
      </main>
      
      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-800 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Confirm Payment</h2>
                <p className="text-sm text-gray-400">Enter your 6-digit passcode</p>
              </div>
            </div>

            <div className="bg-zinc-800 p-4 rounded-lg mb-5 border border-zinc-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Amount</span>
                <span className="font-medium text-white">
                  {paymentRequest.amount} {paymentRequest.tokenType.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">To</span>
                <span className="text-sm text-gray-300">
                  {paymentRequest.requesterName || paymentRequest.requesterAddress.substring(0, 8) + '...'}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-400 text-sm mb-4 flex items-start">
                <XCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Transaction Failed</p>
                  <p className="break-words text-xs">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
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
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center">
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      {processingStage === "validating" && "Validating..."}
                      {processingStage === "connecting" && "Connecting..."}
                      {processingStage === "sending" && "Sending Transaction..."}
                      {processingStage === "completing" && "Confirming Payment..."}
                      {processingStage === "success" && "Payment Completed!"}
                      {processingStage === "error" && "Failed - Retry"}
                      {processingStage !== "validating" && 
                       processingStage !== "connecting" && 
                       processingStage !== "sending" && 
                       processingStage !== "completing" && 
                       processingStage !== "success" && 
                       processingStage !== "error" && "Processing..."}
                    </span>
                  ) : (
                    "Confirm & Pay"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 
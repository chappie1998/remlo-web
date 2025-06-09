"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Header from "@/components/header";
import { isValidPasscode, shortenAddress } from "@/lib/utils";
import { toast } from "sonner";
import QRCode from 'react-qr-code';
import {
  Plus,
  Copy,
  QrCode,
  RefreshCw,
  Clock,
  Share,
  LinkIcon,
  Key,
  AlertCircle,
  X,
  Calendar,
  Hash,
  CheckCircle2,
  Timer,
  ExternalLink,
  Sparkles,
  Send,
  MessageCircle,
  CreditCard,
  History,
  XCircle,
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = ((...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  
  return debounced;
}

// Enhanced Passcode Dialog Component
function PasscodeDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  linkData 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSubmit: (passcode: string) => void,
  linkData: {
    amount: string;
    tokenType: string;
    note?: string;
  }
}) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  
  // Reset on open
  useEffect(() => {
    if(isOpen) {
      setPasscode("");
      setError("");
    }
  }, [isOpen]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidPasscode(passcode)) {
      setError("Please enter a valid 6-digit passcode");
      return;
    }
    
    onSubmit(passcode);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-xl p-6 w-full max-w-md shadow-xl border border-zinc-800 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center mb-6">
          <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Confirm Payment Link</h2>
            <p className="text-sm text-gray-400">Enter your 6-digit passcode</p>
          </div>
        </div>

        <div className="bg-zinc-800 p-4 rounded-lg mb-5 border border-zinc-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Amount</span>
            <span className="font-medium text-white">{linkData.amount} {linkData.tokenType.toUpperCase()}</span>
          </div>
          {linkData.note && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Note</span>
              <span className="font-medium text-white">{linkData.note}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Create Link
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Enhanced Create Payment Link Form Component
function CreatePaymentLinkForm({ onLinkCreated }: { onLinkCreated: () => void }) {
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("usds");
  const [note, setNote] = useState("");
  const [expiresIn, setExpiresIn] = useState("24");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);
  
  // Balance states - same as send page
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Fetch balances on component mount - same as send page
  useEffect(() => {
    const fetchBalances = async () => {
      setIsLoadingBalances(true);
      try {
        const response = await fetch("/api/wallet/overview");
        if (response.ok) {
          const data = await response.json();
          // Use same structure as send page
          setUsdsBalance(data.balances.usds.formattedBalance || "0.0");
          setUsdcBalance(data.balances.usdc.formattedBalance || "0.0");
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, []);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setShowPasscodeDialog(true);
  };
  
  // Function to handle passcode submission and create payment link
  const handlePasscodeSubmit = async (passcode: string) => {
    setShowPasscodeDialog(false);
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/payment-link/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          tokenType,
          note,
          expiresIn,
          passcode,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment link");
      }
      
      const data = await response.json();
      if (data.success) {
        setPaymentLink(data.paymentLink);
        toast.success("Payment link created successfully!");
        onLinkCreated();
      } else {
        throw new Error(data.error || "Failed to create payment link");
      }
    } catch (error) {
      console.error("Error creating payment link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create payment link");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to copy OTP to clipboard
  const copyOTP = () => {
    if (paymentLink?.otp) {
      navigator.clipboard.writeText(paymentLink.otp);
      toast.success("OTP copied to clipboard!");
    }
  };

  // Function to copy link to clipboard
  const copyLink = () => {
    if (paymentLink?.link) {
      navigator.clipboard.writeText(paymentLink.link);
      toast.success("Link copied to clipboard!");
    }
  };

  // Reset the form after successful creation
  const createAnother = () => {
    setPaymentLink(null);
    setAmount("");
    setNote("");
    setShowQR(false);
  };

  // Enhanced Success Screen
  if (paymentLink) {
    return (
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Payment Link Created!</h2>
            <p className="text-gray-400">Your secure payment link is ready to share</p>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/80 rounded-xl p-6 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Payment Details</h3>
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Active
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Amount</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  {tokenType.toLowerCase() === 'usds' ? (
                    <USDsIcon className="w-4 h-4" />
                  ) : (
                    <USDCIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="font-bold text-xl">{paymentLink.amount}</span>
                <span className="font-medium text-emerald-400">{paymentLink.tokenType.toUpperCase()}</span>
              </div>
            </div>
            
            {paymentLink.note && (
              <div className="flex items-start justify-between">
                <span className="text-gray-400">Note</span>
                <span className="text-right max-w-[200px]">{paymentLink.note}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Expires</span>
              <div className="flex items-center gap-2 text-sm">
                <Timer size={14} className="text-amber-400" />
                <span>{new Date(paymentLink.expiresAt).toLocaleDateString()} at {new Date(paymentLink.expiresAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* OTP Section */}
        <div className="bg-gradient-to-r from-emerald-950/50 to-emerald-900/30 rounded-xl p-6 border border-emerald-800/50">
          <div className="flex items-center gap-3 mb-4">
            <Hash size={20} className="text-emerald-400" />
            <h3 className="font-semibold">One-Time Password (OTP)</h3>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 bg-emerald-950/40 rounded-lg p-4 border border-emerald-800/50">
              <div className="font-mono text-2xl font-bold text-center text-emerald-400 tracking-[0.2em]">
                {paymentLink.otp}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyOTP}
              className="border-emerald-700 hover:bg-emerald-800/50 h-auto"
            >
              <Copy size={18} />
            </Button>
          </div>
          <p className="text-sm text-emerald-300/70 mt-3 text-center">
            Share this OTP securely with the recipient to claim the payment
          </p>
        </div>
        
        {/* Payment Link Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <LinkIcon size={18} className="text-blue-400" />
              Payment Link
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyLink}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <Copy size={14} className="mr-2" />
                Copy
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowQR(!showQR)}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <QrCode size={14} className="mr-2" />
                QR Code
              </Button>
            </div>
          </div>
          
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div className="text-sm text-gray-300 break-all font-mono">
              {paymentLink.link}
            </div>
          </div>
        </div>
        
        {/* QR Code */}
        {showQR && (
          <div className="bg-white rounded-xl p-6 text-center animate-in slide-in-from-top-4 duration-300">
            <QRCode value={paymentLink.link} size={220} className="mx-auto" />
            <p className="text-gray-600 text-sm mt-4 font-medium">Scan to open payment link</p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 border-zinc-700 hover:bg-zinc-800 h-12"
            onClick={createAnother}
          >
            <Plus size={18} className="mr-2" />
            Create Another
          </Button>
          
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 shadow-lg"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `Payment Link - ${paymentLink.amount} ${paymentLink.tokenType.toUpperCase()}`,
                  text: `I've sent you a payment link for ${paymentLink.amount} ${paymentLink.tokenType.toUpperCase()}. Use OTP: ${paymentLink.otp}`,
                  url: paymentLink.link
                }).catch(console.error);
              } else {
                copyLink();
              }
            }}
          >
            <Share size={18} className="mr-2" />
            Share Link
          </Button>
        </div>
      </div>
    );
  }

  // Send Page Style Create Form
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Token selection - matches send page style */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center text-gray-300">
            Token <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex items-center space-x-2">
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
              USDS
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
          {isLoadingBalances ? (
            <p className="text-xs text-gray-500">Loading balance...</p>
          ) : (
            <p className="text-xs text-gray-500">
              Balance: <span className="font-medium text-gray-400">
                {tokenType === "usds" ? usdsBalance : usdcBalance}
              </span>
            </p>
          )}
        </div>
        
        {/* Amount input - matches send page style */}
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
          <p className="text-xs text-gray-500">Enter the amount for the payment link</p>
        </div>

        {/* Note Section */}
        <div className="space-y-2">
          <label htmlFor="note" className="text-sm font-medium flex items-center text-gray-300">
            Note <span className="text-gray-500 text-sm font-normal ml-1">(Optional)</span>
          </label>
          <textarea
            id="note"
            placeholder="Payment for..."
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            maxLength={100}
            rows={3}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none p-3"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Optional description for the payment</span>
            <span>{note.length}/100</span>
          </div>
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <label htmlFor="expiresIn" className="text-sm font-medium flex items-center text-gray-300">
            Expires In <span className="text-red-400 ml-1">*</span>
          </label>
          <select
            id="expiresIn"
            value={expiresIn}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExpiresIn(e.target.value)}
            className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="1">1 hour</option>
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours (Recommended)</option>
            <option value="48">48 hours</option>
            <option value="168">7 days</option>
          </select>
          <p className="text-xs text-gray-500">When the payment link will expire</p>
        </div>

        {/* Action Buttons - matches send page style */}
        <div className="flex items-center space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-zinc-700 text-gray-300 hover:bg-zinc-800"
            onClick={() => {
              setAmount("");
              setNote("");
              setTokenType("usds");
              setExpiresIn("24");
            }}
          >
            Clear
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isSubmitting || !amount}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Generate Link"
            )}
          </Button>
        </div>
      </form>
      
      <PasscodeDialog
        isOpen={showPasscodeDialog}
        onClose={() => setShowPasscodeDialog(false)}
        onSubmit={handlePasscodeSubmit}
        linkData={{
          amount,
          tokenType,
          note
        }}
      />
    </>
  );
}

// Define the type for a payment link (matching API response)
interface PaymentLink {
  id: string;
  shortId: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  expiresAt: string; // Dates are usually strings from API
  createdAt: string;
  claimedAt?: string;
  claimedBy?: string;
  displayOtp?: string; // OTP to display for active links
  // Add any other fields you might need from the API response
}

interface TwitterSend {
  id: string;
  type: 'direct_transfer' | 'payment_link';
  twitterUsername: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  createdAt: string;
  signature?: string; // for direct transfers
  paymentUrl?: string; // for payment links
  claimedAt?: string; // for payment links
  claimedBy?: string; // for payment links
  dmSent?: boolean;
}

// Twitter Send Form Component
function TwitterSendForm({ onSendCompleted }: { onSendCompleted: () => void }) {
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("usds");
  const [note, setNote] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);
  
  // Twitter validation states
  const [twitterStatus, setTwitterStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [twitterUser, setTwitterUser] = useState<any>(null);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [isValidatingTwitter, setIsValidatingTwitter] = useState(false);
  
  // Balance states
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Fetch balances on component mount
  useEffect(() => {
    const fetchBalances = async () => {
      setIsLoadingBalances(true);
      try {
        const response = await fetch("/api/wallet/overview");
        if (response.ok) {
          const data = await response.json();
          setUsdsBalance(data.balances.usds.formattedBalance || "0.0");
          setUsdcBalance(data.balances.usdc.formattedBalance || "0.0");
        }
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    fetchBalances();
  }, []);

  // Debounced Twitter username validation
  const debouncedValidateTwitterUsername = useCallback(
    debounce(async (username: string) => {
      if (!username || username.length < 3) {
        setTwitterStatus("idle");
        setTwitterUser(null);
        return;
      }

      setIsValidatingTwitter(true);
      setTwitterStatus("validating");
      setTwitterUser(null);

      try {
        const response = await fetch("/api/twitter/validate-username", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });

        const data = await response.json();

        if (response.ok && data.valid) {
          setTwitterStatus("valid");
          setTwitterUser(data.user);
          setTwitterError(null);
        } else {
          setTwitterStatus("invalid");
          setTwitterUser(null);
          setTwitterError(data.error || "Twitter user not found");
        }
      } catch (err) {
        console.error("Twitter validation error:", err);
        setTwitterStatus("invalid");
        setTwitterUser(null);
        setTwitterError("Network error. Please try again.");
      } finally {
        setIsValidatingTwitter(false);
      }
    }, 2000),
    []
  );

  // Trigger Twitter username validation on input change
  useEffect(() => {
    if (twitterUsername && twitterUsername.length >= 3) {
      debouncedValidateTwitterUsername(twitterUsername);
    } else {
      setTwitterStatus("idle");
      setTwitterUser(null);
      setTwitterError(null);
    }

    return () => {
      debouncedValidateTwitterUsername.cancel();
    };
  }, [twitterUsername, debouncedValidateTwitterUsername]);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!twitterUsername || twitterUsername.length < 3) {
      toast.error("Please enter a valid Twitter username");
      return;
    }
    
    setShowPasscodeDialog(true);
  };
  
  // Function to handle passcode submission and send to Twitter
  const handlePasscodeSubmit = async (passcode: string) => {
    setShowPasscodeDialog(false);
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/wallet/send-to-twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          twitterUsername: twitterUsername.replace(/^@/, ''), // Remove @ if present
          amount,
          tokenType,
          passcode,
          note: note || `Payment sent via Remlo Wallet`
        }),
      });
      
        if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send to Twitter");
        }
      
        const data = await response.json();
      if (data.success) {
        toast.success(`Successfully sent ${amount} ${tokenType.toUpperCase()} to @${twitterUsername}!`);
        
        // Reset form
        setAmount("");
        setNote("");
        setTwitterUsername("");
        setTwitterUser(null);
        setTwitterStatus("idle");
        setTwitterError(null);
        
        onSendCompleted();
      } else {
        throw new Error(data.error || "Failed to send to Twitter");
      }
      } catch (error) {
      console.error("Error sending to Twitter:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send to Twitter");
      } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Twitter Username */}
        <div className="space-y-2">
          <Label htmlFor="twitterUsername" className="text-sm font-medium flex items-center text-gray-300">
            Twitter Username <span className="text-red-400 ml-1">*</span>
          </Label>
          <div className="relative">
            <Input
              id="twitterUsername"
              type="text"
              placeholder="@username or username"
              value={twitterUsername}
              onChange={(e) => setTwitterUsername(e.target.value)}
              className={`pr-10 ${
                twitterStatus === "valid" 
                  ? "border-emerald-500 bg-emerald-900/20" 
                  : twitterStatus === "invalid" 
                    ? "border-red-500 bg-red-900/20" 
                    : "border-zinc-700 bg-zinc-800"
              }`}
              disabled={isSubmitting}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isValidatingTwitter ? (
                <RefreshCw size={16} className="animate-spin text-gray-400" />
              ) : twitterStatus === "valid" ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
              ) : twitterStatus === "invalid" && twitterUsername.length >= 1 ? (
                <XCircle size={16} className="text-red-400" />
              ) : null}
            </div>
          </div>
          {twitterStatus === "valid" && twitterUser && (
            <div className="bg-blue-900/30 border border-blue-800 rounded-md p-3 text-sm text-blue-400 flex items-center">
              {twitterUser.profile_image_url && (
                <img 
                  src={twitterUser.profile_image_url} 
                  alt={`${twitterUser.username} profile`}
                  className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{twitterUser.name}</div>
                <div className="text-xs text-blue-300">@{twitterUser.username}</div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="text-xs hover:bg-blue-800/50 p-1 h-auto"
                  onClick={() => window.open(`https://twitter.com/${twitterUser.username}`, '_blank')}
                  title="View Twitter Profile"
                >
                  <ExternalLink size={14} />
                </Button>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="text-xs hover:bg-blue-800/50 p-1 h-auto"
                  onClick={() => {
                    setTwitterUsername("");
                    setTwitterUser(null);
                    setTwitterStatus("idle");
                  }}
                  title="Clear selection"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          )}
          {twitterStatus === "invalid" && twitterUsername.length >= 3 && (
            <p className="text-xs text-red-400">{twitterError || "Twitter user not found or API issue. Try again later."}</p>
          )}
          {twitterUsername.length > 0 && twitterUsername.length < 3 && (
            <p className="text-xs text-gray-500">Type at least 3 characters to validate username</p>
          )}
        </div>

        {/* Amount and Token Selection */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium flex items-center text-gray-300">
            Amount <span className="text-red-400 ml-1">*</span>
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold border-zinc-700 bg-zinc-800"
                disabled={isSubmitting}
              />
            </div>
            <div className="col-span-1">
              <RadioGroup
                value={tokenType}
                onValueChange={setTokenType}
                className="flex flex-col gap-2"
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2 p-2 rounded border border-zinc-700 hover:bg-zinc-800/50">
                  <RadioGroupItem value="usds" id="usds-twitter" />
                  <Label htmlFor="usds-twitter" className="flex items-center text-sm cursor-pointer">
                    <USDsIcon className="w-4 h-4 mr-2" />
                    USDs
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded border border-zinc-700 hover:bg-zinc-800/50">
                  <RadioGroupItem value="usdc" id="usdc-twitter" />
                  <Label htmlFor="usdc-twitter" className="flex items-center text-sm cursor-pointer">
                    <USDCIcon className="w-4 h-4 mr-2" />
                    USDC
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          {/* Balance Display */}
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>Available: </span>
            <div className="space-x-4">
              <span className={tokenType === "usds" ? "text-emerald-400 font-medium" : ""}>
                USDs: {isLoadingBalances ? "..." : usdsBalance}
              </span>
              <span className={tokenType === "usdc" ? "text-emerald-400 font-medium" : ""}>
                USDC: {isLoadingBalances ? "..." : usdcBalance}
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note-twitter" className="text-sm font-medium text-gray-300">
            Note (Optional)
          </Label>
          <Input
            id="note-twitter"
            type="text"
            placeholder="Add a message..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-zinc-700 bg-zinc-800"
            maxLength={100}
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500">This note will be included in the DM sent to the user</p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-white font-semibold"
          disabled={isSubmitting || !amount || !twitterUsername || parseFloat(amount) <= 0}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="animate-spin mr-2 h-4 w-4" />
              Sending...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Send to Twitter
            </>
          )}
        </Button>
      </form>

      {/* Passcode Dialog */}
      <PasscodeDialog
        isOpen={showPasscodeDialog}
        onClose={() => setShowPasscodeDialog(false)}
        onSubmit={handlePasscodeSubmit}
        linkData={{
          amount,
          tokenType,
          note: `Send to @${twitterUsername}`,
        }}
      />
    </div>
  );
}

// Enhanced Active Payment Links Component
function ActivePaymentLinks({ links, isLoading, error, onRefresh }: {
  links: PaymentLink[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <RefreshCw size={18} className="text-emerald-400 animate-spin" />
        </div>
        <p className="text-gray-400">Loading your payment links...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-900/20 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Failed to load payment links</h3>
          <p className="text-gray-400 max-w-sm mx-auto">{error}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          className="border-zinc-700 hover:bg-zinc-800 h-11"
        >
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
          <LinkIcon size={32} className="text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No payment links yet</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            Create your first payment link to start receiving payments securely.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            const createTab = document.querySelector('[data-state="inactive"][data-value="create"]');
            if (createTab instanceof HTMLElement) {
              createTab.click();
            }
          }}
          className="border-zinc-700 hover:bg-zinc-800 h-11"
        >
          <Plus size={16} className="mr-2" />
          Create your first payment link
        </Button>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Active' };
      case 'expired':
        return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Expired' };
      case 'claimed':
        return { color: 'bg-blue-500', text: 'text-blue-400', label: 'Claimed' };
      default:
        return { color: 'bg-gray-500', text: 'text-gray-400', label: 'Unknown' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Payment Links</h2>
        <div className="flex items-center gap-3">
        <div className="text-sm text-gray-400">
          {links.length} link{links.length !== 1 ? 's' : ''}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-400 hover:bg-zinc-800"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {links.map((link: any) => {
          const statusConfig = getStatusConfig(link.status);
          
          return (
            <div key={link.id} className="bg-gradient-to-r from-zinc-900 to-zinc-900/80 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                  <span className={`text-sm font-medium ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(link.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {/* Amount */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  {link.tokenType.toLowerCase() === 'usds' ? (
                    <USDsIcon className="w-5 h-5" />
                  ) : (
                    <USDCIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{link.amount}</span>
                    <span className="text-sm font-medium text-emerald-400">{link.tokenType.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              {/* Note */}
              {link.note && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300">{link.note}</p>
                </div>
              )}

              {/* Display OTP for active links */}
              {link.status === 'active' && link.displayOtp && (
                <div className="my-4 py-3 border-y border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      <Key size={15} className="mr-2 text-amber-400 flex-shrink-0" />
                      <span className="font-medium text-zinc-300">Share Code (OTP):</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-mono tracking-wider text-amber-300 bg-zinc-700/60 px-2.5 py-1 rounded-md shadow-sm mr-2">
                        {link.displayOtp}
                      </span>
                      <Button
                        variant="ghost" // Use ghost for less emphasis, or outline like others
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-amber-400 hover:bg-zinc-700/80"
                        onClick={() => {
                          navigator.clipboard.writeText(link.displayOtp!);
                          toast.success("OTP copied to clipboard!");
                        }}
                        title="Copy OTP"
                      >
                        <Copy size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-zinc-700 hover:bg-zinc-800"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/payment-link/${link.shortId}`);
                    toast.success('Link copied to clipboard');
                  }}
                >
                  <Copy size={12} className="mr-1.5" />
                  Copy Link
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs border-zinc-700 hover:bg-zinc-800"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `Payment Link - ${link.amount} ${link.tokenType}`,
                        text: `I've sent you ${link.amount} ${link.tokenType}. Click the link to claim it.`,
                        url: `${window.location.origin}/payment-link/${link.shortId}`
                      }).catch(err => {
                        console.error('Share failed:', err);
                        navigator.clipboard.writeText(`${window.location.origin}/payment-link/${link.shortId}`);
                        toast.success('Link copied to clipboard');
                      });
                    } else {
                      navigator.clipboard.writeText(`${window.location.origin}/payment-link/${link.shortId}`);
                      toast.success('Link copied to clipboard');
                    }
                  }}
                >
                  <Share size={12} className="mr-1.5" />
                  Share
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 border-zinc-700 hover:bg-zinc-800"
                  onClick={() => {
                    window.open(`/payment-link/${link.shortId}`, '_blank');
                  }}
                >
                  <ExternalLink size={12} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Twitter Sends History Component
function TwitterSendsHistory({ sends, isLoading, error, onRefresh }: {
  sends: TwitterSend[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <RefreshCw size={18} className="text-emerald-400 animate-spin" />
        </div>
        <p className="text-gray-400">Loading your Twitter sends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-900/20 flex items-center justify-center">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Failed to load Twitter sends</h3>
          <p className="text-gray-400 max-w-sm mx-auto">{error}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          className="border-zinc-700 hover:bg-zinc-800 h-11"
        >
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (sends.length === 0) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
          <MessageCircle size={32} className="text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No Twitter sends yet</h3>
          <p className="text-gray-400 max-w-sm mx-auto">
            Send tokens to Twitter users and track them here.
          </p>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string, type: string) => {
    if (type === 'direct_transfer') {
      switch (status) {
        case 'submitted':
        case 'confirmed':
          return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Sent' };
        case 'failed':
          return { color: 'bg-red-500', text: 'text-red-400', label: 'Failed' };
        default:
          return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Pending' };
      }
    } else {
      switch (status) {
        case 'active':
          return { color: 'bg-amber-500', text: 'text-amber-400', label: 'Pending' };
        case 'claimed':
          return { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Claimed' };
        case 'expired':
          return { color: 'bg-gray-500', text: 'text-gray-400', label: 'Expired' };
        default:
          return { color: 'bg-gray-500', text: 'text-gray-400', label: 'Unknown' };
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Twitter Sends</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            {sends.length} send{sends.length !== 1 ? 's' : ''}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-400 hover:bg-zinc-800"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Sends List */}
      <div className="space-y-4">
        {sends.map((send) => {
          const statusConfig = getStatusConfig(send.status, send.type);
          
          return (
            <div key={send.id} className="bg-gradient-to-r from-zinc-900 to-zinc-900/80 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                  <span className={`text-sm font-medium ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(send.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {/* Amount and Recipient */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    {send.tokenType.toLowerCase() === 'usds' ? (
                      <USDsIcon className="w-5 h-5" />
                    ) : (
                      <USDCIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{send.amount}</span>
                      <span className="text-sm font-medium text-emerald-400">{send.tokenType.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <MessageCircle size={14} />
                    <span>@{send.twitterUsername}</span>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="p-1 h-auto hover:bg-zinc-700/50 ml-1"
                      onClick={() => window.open(`https://twitter.com/${send.twitterUsername}`, '_blank')}
                      title="View Twitter Profile"
                    >
                      <ExternalLink size={12} />
                    </Button>
                  </div>
                  {send.dmSent && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={12} />
                      DM Sent
                    </div>
                  )}
                </div>
              </div>
              
              {/* Note */}
              {send.note && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300">{send.note}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                {send.type === 'direct_transfer' && send.signature && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs border-zinc-700 hover:bg-zinc-800"
                    onClick={() => {
                      window.open(`https://solscan.io/tx/${send.signature}?cluster=devnet`, '_blank');
                    }}
                  >
                    <ExternalLink size={12} className="mr-1.5" />
                    View Transaction
                  </Button>
                )}
                
                {send.type === 'payment_link' && send.paymentUrl && (
                  <Button 
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 text-xs border-zinc-700 hover:bg-zinc-800"
                    onClick={() => {
                      window.open(send.paymentUrl, '_blank');
                    }}
                  >
                    <ExternalLink size={12} className="mr-1.5" />
                    View Payment Link
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PaymentLinksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <RefreshCw className="animate-spin h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </div>
    }>
      <PaymentLinksContent />
    </Suspense>
  );
}

function PaymentLinksContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Payment links state management at parent level
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksFetched, setLinksFetched] = useState(false);
  
  // Twitter sends state management
  const [twitterSends, setTwitterSends] = useState<TwitterSend[]>([]);
  const [isLoadingTwitterSends, setIsLoadingTwitterSends] = useState(false);
  const [twitterSendsError, setTwitterSendsError] = useState<string | null>(null);
  const [twitterSendsFetched, setTwitterSendsFetched] = useState(false);
  
  // Initialize tabs from URL parameter
  const [currentMainTab, setCurrentMainTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'send' || tabParam === 'history') ? tabParam : 'send';
  });
  
  const [currentSendTab, setCurrentSendTab] = useState(() => {
    const sendTabParam = searchParams.get('sendTab');
    return (sendTabParam === 'link' || sendTabParam === 'twitter') ? sendTabParam : 'link';
  });
  
  const [currentHistoryTab, setCurrentHistoryTab] = useState(() => {
    const historyTabParam = searchParams.get('historyTab');
    return (historyTabParam === 'links' || historyTabParam === 'twitter') ? historyTabParam : 'links';
  });

  // Function to fetch payment links (only when needed)
  const fetchPaymentLinks = async () => {
    if (isLoadingLinks || linksFetched) return; // Prevent duplicate calls
    
    setIsLoadingLinks(true);
    setLinksError(null);
    
    try {
      const response = await fetch('/api/payment-link/list');
      if (!response.ok) {
        throw new Error('Failed to fetch payment links');
      }
      const data = await response.json();
      setPaymentLinks(data);
      setLinksFetched(true);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      setLinksError('Failed to load payment links');
      toast.error('Failed to load payment links');
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // Function to fetch Twitter sends (only when needed)
  const fetchTwitterSends = async () => {
    if (isLoadingTwitterSends || twitterSendsFetched) return; // Prevent duplicate calls
    
    setIsLoadingTwitterSends(true);
    setTwitterSendsError(null);
    
    try {
      const response = await fetch('/api/wallet/twitter-sends');
      if (!response.ok) {
        throw new Error('Failed to fetch Twitter sends');
      }
      const data = await response.json();
      setTwitterSends(data.sends || []);
      setTwitterSendsFetched(true);
    } catch (error) {
      console.error('Error fetching Twitter sends:', error);
      setTwitterSendsError('Failed to load Twitter sends');
      toast.error('Failed to load Twitter sends');
    } finally {
      setIsLoadingTwitterSends(false);
    }
  };

  // Update URL when main tab changes
  const handleMainTabChange = (newTab: string) => {
    setCurrentMainTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', newTab);
    router.replace(`/payment-links?${newSearchParams.toString()}`, { scroll: false });
    
    // Fetch data when switching to history tab
    if (newTab === 'history') {
      if (currentHistoryTab === 'links' && !linksFetched && !isLoadingLinks) {
        fetchPaymentLinks();
      } else if (currentHistoryTab === 'twitter' && !twitterSendsFetched && !isLoadingTwitterSends) {
        fetchTwitterSends();
      }
    }
  };

  // Update URL when send sub-tab changes
  const handleSendTabChange = (newTab: string) => {
    setCurrentSendTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('sendTab', newTab);
    router.replace(`/payment-links?${newSearchParams.toString()}`, { scroll: false });
  };

  // Update URL when history sub-tab changes
  const handleHistoryTabChange = (newTab: string) => {
    setCurrentHistoryTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('historyTab', newTab);
    router.replace(`/payment-links?${newSearchParams.toString()}`, { scroll: false });
    
    // Fetch data when switching history tabs
    if (newTab === 'links' && !linksFetched && !isLoadingLinks) {
      fetchPaymentLinks();
    } else if (newTab === 'twitter' && !twitterSendsFetched && !isLoadingTwitterSends) {
      fetchTwitterSends();
    }
  };

  // Update tabs if URL parameters change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const sendTabParam = searchParams.get('sendTab');
    const historyTabParam = searchParams.get('historyTab');
    
    if (tabParam && (tabParam === 'send' || tabParam === 'history') && tabParam !== currentMainTab) {
      setCurrentMainTab(tabParam);
    }
    
    if (sendTabParam && (sendTabParam === 'link' || sendTabParam === 'twitter') && sendTabParam !== currentSendTab) {
      setCurrentSendTab(sendTabParam);
    }
    
    if (historyTabParam && (historyTabParam === 'links' || historyTabParam === 'twitter') && historyTabParam !== currentHistoryTab) {
      setCurrentHistoryTab(historyTabParam);
    }
  }, [searchParams, currentMainTab, currentSendTab, currentHistoryTab]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Function to refresh payment links (for when a new link is created)
  const refreshPaymentLinks = () => {
    setLinksFetched(false);
    setPaymentLinks([]);
    fetchPaymentLinks();
  };

  // Function to refresh Twitter sends (for when a new send is completed)
  const refreshTwitterSends = () => {
    setTwitterSendsFetched(false);
    setTwitterSends([]);
    fetchTwitterSends();
  };

  // Combined refresh function for when actions are completed
  const handleSendCompleted = () => {
    refreshPaymentLinks();
    refreshTwitterSends();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <RefreshCw className="animate-spin h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "authenticated" && !session?.user?.hasPasscode) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Key size={32} className="text-amber-400" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Passcode Setup Required</h1>
            <p className="text-gray-400 max-w-sm">
              You need to set up your wallet passcode before creating payment links for security.
            </p>
          </div>
          <Button 
            onClick={() => router.push("/wallet")} 
            className="bg-emerald-600 hover:bg-emerald-700 h-11 shadow-lg"
          >
            <Key size={16} className="mr-2" />
            Set Up Passcode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      
      <main className="container mx-auto py-6 px-4 flex-1">
        <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
              <Send size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Send & Links</h1>
              <p className="text-sm text-gray-400">Send tokens and manage payment links</p>
            </div>
          </div>
          
          {/* Main Tabs */}
          <Tabs value={currentMainTab} onValueChange={handleMainTabChange} className="w-full">
            <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
              <TabsList className="grid grid-cols-2 w-full bg-transparent border-0 p-0">
                <TabsTrigger 
                  value="send"
                  className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300"
                >
                  <Send size={16} className="mr-2" />
                  Send
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300"
                >
                  <History size={16} className="mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Send Tab Content */}
            <TabsContent value="send" className="mt-0">
              <Tabs value={currentSendTab} onValueChange={handleSendTabChange} className="w-full">
                <div className="flex border-b border-zinc-700 mb-6 overflow-x-auto">
                  <TabsList className="grid grid-cols-2 w-full bg-transparent border-0 p-0">
                    <TabsTrigger 
                      value="link"
                      className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-300 data-[state=active]:border-b-2 data-[state=active]:border-emerald-300 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-400"
                    >
                      <LinkIcon size={14} className="mr-2" />
                      Payment Link
                    </TabsTrigger>
                    <TabsTrigger 
                      value="twitter"
                      className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-300 data-[state=active]:border-b-2 data-[state=active]:border-emerald-300 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-400"
                    >
                      <MessageCircle size={14} className="mr-2" />
                      Twitter Send
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="link" className="mt-0">
                  <CreatePaymentLinkForm onLinkCreated={handleSendCompleted} />
                </TabsContent>
                
                <TabsContent value="twitter" className="mt-0">
                  <TwitterSendForm onSendCompleted={handleSendCompleted} />
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            {/* History Tab Content */}
            <TabsContent value="history" className="mt-0">
              <Tabs value={currentHistoryTab} onValueChange={handleHistoryTabChange} className="w-full">
                <div className="flex border-b border-zinc-700 mb-6 overflow-x-auto">
                  <TabsList className="grid grid-cols-2 w-full bg-transparent border-0 p-0">
                    <TabsTrigger 
                      value="links"
                      className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-300 data-[state=active]:border-b-2 data-[state=active]:border-emerald-300 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-400"
                    >
                      <LinkIcon size={14} className="mr-2" />
                      Payment Links
                    </TabsTrigger>
                    <TabsTrigger 
                      value="twitter"
                      className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-300 data-[state=active]:border-b-2 data-[state=active]:border-emerald-300 data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-400"
                    >
                      <MessageCircle size={14} className="mr-2" />
                      Twitter Sends
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="links" className="mt-0">
                  <ActivePaymentLinks 
                    links={paymentLinks}
                    isLoading={isLoadingLinks}
                    error={linksError}
                    onRefresh={refreshPaymentLinks}
                  />
                </TabsContent>
                
                <TabsContent value="twitter" className="mt-0">
                  <TwitterSendsHistory 
                    sends={twitterSends}
                    isLoading={isLoadingTwitterSends}
                    error={twitterSendsError}
                    onRefresh={refreshTwitterSends}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 
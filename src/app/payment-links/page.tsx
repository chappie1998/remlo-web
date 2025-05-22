"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";

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
function CreatePaymentLinkForm() {
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

// Enhanced Active Payment Links Component
function ActivePaymentLinks() {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentLinks = async () => {
      try {
        const response = await fetch('/api/payment-link/list');
        if (!response.ok) {
          throw new Error('Failed to fetch payment links');
        }
        const data = await response.json();
        setLinks(data);
      } catch (error) {
        console.error('Error fetching payment links:', error);
        toast.error('Failed to load payment links');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentLinks();
  }, []);

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
        <div className="text-sm text-gray-400">
          {links.length} link{links.length !== 1 ? 's' : ''}
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

export default function PaymentLinksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

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
          {/* Header - matches send page style */}
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-full bg-emerald-900/50 text-emerald-400 mr-3">
              <LinkIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Payment Links</h1>
              <p className="text-sm text-gray-400">Create secure links to receive payments</p>
            </div>
          </div>
          
          {/* Tabs for different sections */}
          <Tabs defaultValue="create" className="w-full">
            <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
              <TabsList className="grid grid-cols-2 w-full bg-transparent border-0 p-0">
                <TabsTrigger 
                  value="create"
                  className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300"
                >
                  Create Link
                </TabsTrigger>
                <TabsTrigger 
                  value="active"
                  className="px-4 py-2 font-medium text-sm relative whitespace-nowrap bg-transparent border-0 data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-400 data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300"
                >
                  Active Links
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="create" className="mt-0">
              <CreatePaymentLinkForm />
            </TabsContent>
            
            <TabsContent value="active" className="mt-0">
              <ActivePaymentLinks />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
} 
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
  Send,
  CreditCard,
  Plus,
  Check,
  Copy,
  QrCode,
  RefreshCw,
  Clock,
  Trash,
  Share,
  Banknote,
  DollarSign,
  LinkIcon,
  Key,
  AlertCircle,
  X,
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";

// Passcode Dialog Component
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Confirm with Passcode</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        
        <div className="bg-zinc-800/50 rounded-md p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Amount</span>
            <div className="flex items-center gap-1.5">
              {linkData.tokenType.toLowerCase() === 'usds' ? (
                <USDsIcon className="w-4 h-4" />
              ) : (
                <USDCIcon className="w-4 h-4" />
              )}
              <span className="font-semibold">{linkData.amount}</span>
              <span className="text-sm">{linkData.tokenType.toUpperCase()}</span>
            </div>
          </div>
          
          {linkData.note && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Note</span>
              <span className="text-sm">{linkData.note}</span>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="passcode" className="text-gray-300 text-sm">
              Enter your 6-digit passcode to authorize
            </Label>
            <div className="mt-1.5 relative">
              <Key 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" 
              />
              <Input
                id="passcode"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="Enter 6-digit passcode"
                value={passcode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasscode(e.target.value)}
                className="pl-9"
                maxLength={6}
                required
              />
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>
          
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Confirm & Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Component to create a new payment link
function CreatePaymentLinkForm() {
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("usds");
  const [note, setNote] = useState("");
  const [expiresIn, setExpiresIn] = useState("24");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  
  // Passcode dialog state
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Show passcode dialog instead of directly submitting
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
    // Keep the token type and expiration the same for convenience
  };

  // If payment link has been created, show the success screen with link and OTP
  if (paymentLink) {
    return (
      <div className="flex flex-col gap-6 items-center text-center p-4">
        <div className="flex items-center justify-center rounded-full bg-emerald-950/50 text-emerald-400 p-3 w-12 h-12">
          <Check size={24} />
        </div>
        
        <h2 className="text-2xl font-bold">Payment Link Created!</h2>
        
        <div className="bg-zinc-900 rounded-lg p-4 w-full border border-zinc-800">
          <div className="mb-4">
            <Label className="text-gray-500 mb-1 block">Amount</Label>
            <p className="font-bold text-xl flex items-center justify-center gap-1.5">
              {tokenType.toLowerCase() === 'usds' ? (
                <USDsIcon className="w-5 h-5" />
              ) : (
                <USDCIcon className="w-5 h-5" />
              )}
              <span>{paymentLink.amount}</span>
              <span className="font-medium">{paymentLink.tokenType.toUpperCase()}</span>
            </p>
          </div>
          
          {paymentLink.note && (
            <div className="mb-4">
              <Label className="text-gray-500 mb-1 block">Note</Label>
              <p>{paymentLink.note}</p>
            </div>
          )}

          <div className="mb-4">
            <Label className="text-gray-500 mb-1 block">Expiration</Label>
            <p className="flex items-center justify-center gap-1 text-sm text-gray-400">
              <Clock size={14} />
              Expires {new Date(paymentLink.expiresAt).toLocaleString()}
            </p>
          </div>
        </div>
        
        <div className="w-full mb-4">
          <Label className="text-gray-500 mb-1 block">OTP (One-Time Password)</Label>
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-950/20 rounded-lg p-4 font-mono text-xl font-bold text-center text-emerald-400">
              {paymentLink.otp}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyOTP}
              title="Copy OTP"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Copy size={18} />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Share this OTP securely with the recipient
          </p>
        </div>
        
        <div className="w-full mb-4">
          <Label className="text-gray-500 mb-1 block">Payment Link</Label>
          <div className="flex gap-2">
            <div className="flex-1 bg-zinc-800 rounded-lg p-2 text-sm overflow-hidden text-ellipsis">
              {paymentLink.link}
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyLink}
              title="Copy Link"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Copy size={18} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowQR(!showQR)}
              title="Show QR Code"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <QrCode size={18} />
            </Button>
          </div>
        </div>
        
        {showQR && (
          <div className="p-4 bg-white rounded-lg mb-4 w-full max-w-[240px]">
            <QRCode value={paymentLink.link} size={200} />
          </div>
        )}
        
        <div className="flex gap-4 w-full">
          <Button 
            variant="outline" 
            className="flex-1 border-zinc-700 hover:bg-zinc-800"
            onClick={createAnother}
          >
            <Plus size={18} className="mr-2" />
            Create Another
          </Button>
          
          <Button 
            variant="default" 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              // Use Web Share API if available
              if (navigator.share) {
                navigator.share({
                  title: `Payment Link for ${paymentLink.amount} ${paymentLink.tokenType.toUpperCase()}`,
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

  // Show the form to create a payment link
  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" 
              />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                className="pl-8"
                required
              />
            </div>
            <RadioGroup 
              value={tokenType} 
              onValueChange={setTokenType}
              className="flex gap-2"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="usds" id="usds" />
                <Label htmlFor="usds" className="flex items-center">
                  <USDsIcon className="w-5 h-5 mr-1" /> USDS
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="usdc" id="usdc" />
                <Label htmlFor="usdc" className="flex items-center">
                  <USDCIcon className="w-5 h-5 mr-1" /> USDC
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note" className="flex items-center justify-between">
            Note <span className="text-gray-500 text-sm">(Optional)</span>
          </Label>
          <textarea
            id="note"
            placeholder="Payment for..."
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            maxLength={100}
            className="flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiresIn">Expires in</Label>
          <select
            id="expiresIn"
            value={expiresIn}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExpiresIn(e.target.value)}
            className="w-full p-2 bg-transparent border border-zinc-700 rounded-md text-sm"
          >
            <option value="1">1 hour</option>
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">24 hours</option>
            <option value="48">48 hours</option>
            <option value="168">7 days</option>
          </select>
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="mt-4 bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={18} className="mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <LinkIcon size={18} className="mr-2" />
              Generate Payment Link
            </>
          )}
        </Button>
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

// Component to list active payment links
function ActivePaymentLinks() {
  const [links, setLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch active payment links
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
      <div className="flex justify-center items-center min-h-[200px]">
        <p className="text-gray-500 flex items-center">
          <RefreshCw size={18} className="mr-2 animate-spin" />
          Loading your payment links...
        </p>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4 flex justify-center">
          <LinkIcon size={48} className="text-zinc-700" />
        </div>
        <h3 className="text-lg font-medium">No payment links</h3>
        <p className="text-gray-500 mb-4">
          You haven't created any payment links yet.
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            const createTab = document.querySelector('[data-state="inactive"][data-value="create"]');
            if (createTab instanceof HTMLElement) {
              createTab.click();
            }
          }}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          <Plus size={16} className="mr-2" />
          Create your first payment link
        </Button>
      </div>
    );
  }

  // Render the list of active payment links
  return (
    <div className="space-y-4">
      {links.map((link: any) => (
        <div key={link.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                link.status === 'active' ? 'bg-emerald-500' : 
                link.status === 'expired' ? 'bg-amber-500' : 
                link.status === 'claimed' ? 'bg-blue-500' : 'bg-gray-500'
              }`} />
              <span className="text-sm capitalize">{link.status}</span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(link.createdAt).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            {link.tokenType.toLowerCase() === 'usds' ? (
              <USDsIcon className="w-5 h-5" />
            ) : (
              <USDCIcon className="w-5 h-5" />
            )}
            <span className="text-lg font-bold">{link.amount}</span>
            <span className="text-sm">{link.tokenType.toUpperCase()}</span>
          </div>
          
          {link.note && (
            <p className="text-sm text-gray-400 mb-2 truncate">{link.note}</p>
          )}
          
          <div className="mt-3 flex gap-2">
            <Button 
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/payment-link/${link.shortId}`);
                toast.success('Link copied to clipboard');
              }}
            >
              <Copy size={14} className="mr-1" />
              Copy Link
            </Button>
            
            <Button 
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8"
              onClick={() => {
                navigator.share({
                  title: `Payment Link for ${link.amount} ${link.tokenType}`,
                  text: `I've sent you ${link.amount} ${link.tokenType}. Click the link to claim it.`,
                  url: `${window.location.origin}/payment-link/${link.shortId}`
                }).catch(err => {
                  console.error('Share failed:', err);
                  navigator.clipboard.writeText(`${window.location.origin}/payment-link/${link.shortId}`);
                  toast.success('Link copied to clipboard');
                });
              }}
            >
              <Share size={14} className="mr-1" />
              Share
            </Button>
          </div>
        </div>
      ))}
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
          <RefreshCw className="animate-spin h-8 w-8 text-gray-400" />
        </div>
      </div>
    );
  }

  if (status === "authenticated" && !session?.user?.hasPasscode) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-4">Set Up Needed</h1>
          <p className="text-center mb-6 text-gray-400">
            You need to set up your wallet passcode before creating payment links.
          </p>
          <Button onClick={() => router.push("/wallet")} className="bg-emerald-600 hover:bg-emerald-700">
            Set Up Passcode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="container max-w-md mx-auto px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <LinkIcon size={24} className="mr-2 text-emerald-400" />
          Payment Links
        </h1>
        
        <Tabs defaultValue="create" className="mb-8">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="create">Create Link</TabsTrigger>
            <TabsTrigger value="active">Active Links</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            <CreatePaymentLinkForm />
          </TabsContent>
          
          <TabsContent value="active">
            <ActivePaymentLinks />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 
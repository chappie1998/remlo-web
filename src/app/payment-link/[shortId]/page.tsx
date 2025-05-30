"use client";

import { useState, useEffect, Fragment, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Copy,
  Wallet,
  Landmark,
  LogIn,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

// Define receive option types
type ReceiveOption = "remlio" | "web3" | "bank";

function PaymentLinkReceiveContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [otp, setOtp] = useState("");
  const [externalWalletAddress, setExternalWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedReceiveOption, setSelectedReceiveOption] = useState<ReceiveOption | null>("remlio");
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const { publicKey, connected, select, connect, disconnect } = useWallet();

  // Computed authentication state - more robust check
  const isAuthenticated = authStatus === "authenticated" && session && session.user && session.user.email;
  const isAuthLoading = authStatus === "loading";
  const isUnauthenticated = authStatus === "unauthenticated" || !session || !session.user;

  useEffect(() => {
    const fetchPaymentLink = async () => {
      if (!params?.shortId) return;
      
      const shortId = Array.isArray(params.shortId) ? params.shortId[0] : params.shortId;
      
      setIsLoading(true);
      setError("");
      setSuccess(false);
      
      try {
        const response = await fetch(`/api/payment-link/info?id=${encodeURIComponent(shortId)}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch payment link details");
        }
        const data = await response.json();
        setPaymentLink(data);
        
        if (data.status === "claimed") {
          setSuccess(true);
          setSelectedReceiveOption(null);
        } else if (data.status === "active") {
          setSelectedReceiveOption("remlio");
        }
      } catch (err) {
        console.error("Error fetching payment link:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load payment link details";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaymentLink();
  }, [params?.shortId]);

  useEffect(() => {
    if (publicKey) {
      setExternalWalletAddress(publicKey.toBase58());
    }
  }, [publicKey]);

  useEffect(() => {
    // Check for tab parameter from URL (when user returns from sign-in)
    const tabParam = searchParams.get('tab');
    if (tabParam === 'remlio' && authStatus === 'authenticated') {
      setSelectedReceiveOption('remlio');
    }
    
    // Debug authentication status
    console.log("🔐 Auth Debug:", {
      authStatus,
      sessionExists: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      hasSession: session !== null,
      hasUser: !!session?.user
    });
  }, [searchParams, authStatus, session]);

  const handlePasteAddress = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (isValidSolanaAddress(text)) {
        setExternalWalletAddress(text);
        setError("");
        toast.success("Address pasted successfully!");
      } else {
        setError("Invalid Solana address pasted.");
        toast.error("Invalid Solana address pasted.");
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      setError("Failed to paste address. Please type it manually.");
      toast.error("Failed to paste address.");
    }
  };

  const handleSubmitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (otp.length !== 6) {
      setError("OTP must be exactly 6 digits long.");
      toast.error("OTP must be exactly 6 digits long.");
      return;
    }

    if (selectedReceiveOption === "web3" && !isValidSolanaAddress(externalWalletAddress)) {
      setError("Please enter a valid Solana wallet address.");
      toast.error("Please enter a valid Solana wallet address.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const shortId = Array.isArray(params.shortId) ? params.shortId[0] : params.shortId;
      let endpoint = "/api/payment-link/verify";
      let payload: any = { shortId, otp };

      if (selectedReceiveOption === "web3") {
        endpoint = "/api/payment-link/claim-external";
        payload = { ...payload, targetAddress: externalWalletAddress };
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process payment.");
      
      if (data.success) {
        setSuccess(true);
        toast.success(data.message || "Payment successfully received!");
        setPaymentLink((prev: any) => ({ ...prev, status: 'claimed' }));
        // Store transaction signature for explorer link - handle both formats
        const signature = data.signature || data.transactionId;
        if (signature) {
          setTransactionSignature(signature);
        }
      } else {
        throw new Error(data.error || "Receiving payment failed.");
      }
    } catch (err) {
      console.error("Error receiving payment:", err);
      const errorMessage = err instanceof Error ? err.message : "Receiving payment failed.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getSenderName = () => {
    if (!paymentLink?.creator) return "Unknown Sender";
    if (paymentLink.creator.name) return paymentLink.creator.name;
    if (paymentLink.creator.username) return `@${paymentLink.creator.username}`;
    if (paymentLink.creator.solanaAddress) return `${paymentLink.creator.solanaAddress.slice(0, 4)}...${paymentLink.creator.solanaAddress.slice(-4)}`;
    return "Unknown Sender";
  };

  const getSolanaExplorerUrl = (signature: string) => {
    // Using Solscan for better UI and more detailed transaction info
    return `https://solscan.io/tx/${signature}?cluster=devnet`;
  };

  const TokenIcon = paymentLink?.tokenType?.toLowerCase() === 'usdc' ? USDCIcon : USDsIcon;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin h-8 w-8 text-emerald-500" />
        </div>
      </div>
    );
  }

  if (error && !paymentLink) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2 text-gray-100">Error Loading Link</h1>
          <p className="text-gray-400 mb-6 max-w-sm">{error}</p>
          <Button onClick={() => router.push("/")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm">Go to Home</Button>
        </div>
      </div>
    );
  }
  
  if (!paymentLink) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2 text-gray-100">Payment Link Not Found</h1>
          <p className="text-gray-400 mb-6 max-w-sm">
            This link may be invalid, expired, or already used.
          </p>
          <Button onClick={() => router.push("/")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm">Go to Home</Button>
        </div>
      </div>
    );
  }

  if (paymentLink.status === "expired" || new Date(paymentLink.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Clock className="h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2 text-gray-100">Payment Link Expired</h1>
          <p className="text-gray-400 mb-6 max-w-sm">
            This payment link has expired and is no longer valid.
          </p>
          <Button onClick={() => router.push("/wallet")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm">
            Go to Your Wallet
          </Button>
        </div>
      </div>
    );
  }

  if (paymentLink.status === "claimed" || success) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-100">Payment Received!</h1>
              <p className="text-base text-gray-300">
                You successfully received{" "}
                <span className="font-semibold text-emerald-400">
                  {paymentLink.amount} {paymentLink.tokenType.toUpperCase()}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                From: <span className="font-medium text-gray-300">{getSenderName()}</span>
              </p>
            </div>

            {/* Transaction Details */}
            {transactionSignature && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Transaction ID:</span>
                </div>
                <div className="text-xs font-mono text-gray-400 bg-zinc-800 p-2 rounded break-all">
                  {transactionSignature}
                </div>
                <a
                  href={getSolanaExplorerUrl(transactionSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solscan
                </a>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button 
                onClick={() => router.push("/wallet")} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-medium rounded-lg transition-colors"
              >
                View in Your Wallet
              </Button>
              
              <Button 
                onClick={() => router.push("/")} 
                variant="outline"
                className="w-full border-zinc-600 bg-transparent hover:bg-zinc-800 text-gray-300 hover:text-white px-6 py-2.5 text-sm rounded-lg transition-colors"
              >
                Back to Home
              </Button>
            </div>

            <p className="text-xs text-gray-500 pt-2">
              The funds have been successfully transferred to your account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md bg-zinc-900 border border-zinc-800 shadow-lg rounded-lg">
          <CardHeader className="text-center pt-6 pb-4 px-6">
            <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/50 border border-emerald-800/50">
              <TokenIcon className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-100 mb-2">
              Receive {paymentLink.amount} {paymentLink.tokenType.toUpperCase()}
            </CardTitle>
            <CardDescription className="text-sm text-gray-400">
              From: <span className="font-medium text-emerald-400">{getSenderName()}</span>
            </CardDescription>
            {paymentLink.note && (
              <div className="mt-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-sm text-gray-300">{paymentLink.note}</p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmitReceive} noValidate>
              <Tabs 
                value={selectedReceiveOption || "remlio"} 
                onValueChange={(value) => setSelectedReceiveOption(value as ReceiveOption)} 
                className="w-full mb-6"
              >
                <TabsList className="grid w-full grid-cols-3 bg-zinc-800 p-1 rounded-lg h-auto">
                  <TabsTrigger 
                    value="remlio" 
                    className="py-2 px-2 text-sm font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-300 hover:bg-zinc-700 rounded-md transition-all duration-150"
                  >
                    <Shield className="w-4 h-4 mr-1.5 inline-block"/> 
                    <span className="hidden sm:inline">Remlo</span>
                    <span className="sm:hidden">Remlo</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="web3" 
                    className="py-2 px-2 text-sm font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-300 hover:bg-zinc-700 rounded-md transition-all duration-150"
                  >
                    <Wallet className="w-4 h-4 mr-1.5 inline-block"/> 
                    <span className="hidden sm:inline">Web3</span>
                    <span className="sm:hidden">Web3</span>
                  </TabsTrigger>
                  <TabsTrigger value="bank" disabled className="py-2 px-2 text-sm font-medium text-gray-600 cursor-not-allowed relative rounded-md opacity-60">
                    <Landmark className="w-4 h-4 mr-1.5 inline-block"/> 
                    <span className="hidden sm:inline">Bank</span>
                    <span className="sm:hidden">Bank</span>
                    <span 
                      className="absolute -top-0.5 -right-0.5 text-[8px] bg-amber-500 text-black font-bold px-1 py-0.5 rounded-full transform scale-75"
                    >
                      SOON
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="remlio" className="mt-4">
                  {selectedReceiveOption === "remlio" && (
                    <div className="space-y-4">
                      {isUnauthenticated ? (
                        <div className="text-center space-y-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                          <Shield size={32} className="mx-auto text-emerald-500 mb-3" />
                          <div className="space-y-2">
                            <h3 className="text-base font-semibold text-zinc-200">Sign in to Receive Payment</h3>
                            <p className="text-sm text-zinc-400">
                              Sign in with your Google account to receive this payment.
                            </p>
                          </div>
                          <Button 
                            onClick={() => signIn('google', { 
                              callbackUrl: window.location.href + '?tab=remlio',
                              prompt: 'select_account' 
                            })} 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                            Sign in with Google
                          </Button>
                          <p className="text-xs text-zinc-500">
                            You'll be redirected back after signing in.
                          </p>
                        </div>
                      ) : isAuthenticated ? (
                        <div className="space-y-4">
                          <div className="text-center p-2.5 bg-emerald-900/20 border border-emerald-800/50 rounded-lg">
                            <p className="text-emerald-300 text-sm">
                              ✓ Signed in as <span className="font-medium">{session?.user?.email}</span>
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="otp-remlio" className="block text-sm font-medium text-zinc-300 mb-2">
                              Enter 6-Digit Code
                            </Label>
                            <Input
                              id="otp-remlio"
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                              placeholder="000000"
                              maxLength={6}
                              className="text-center tracking-widest text-lg font-mono bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 h-12 rounded-lg focus:border-emerald-500 focus:ring-emerald-500"
                              pattern="\\d{6}"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              disabled={isProcessing}
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center py-6">
                          <RefreshCw className="animate-spin h-6 w-6 text-zinc-400" />
                          <span className="ml-2 text-zinc-400">Checking authentication...</span>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="web3" className="mt-4 space-y-5">
                  {/* Wallet Connection Section */}
                  <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        <Label className="text-sm font-medium text-zinc-200">Wallet Connection</Label>
                      </div>
                      {connected && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-emerald-300 font-medium">Connected</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Connect your wallet or enter your Solana address to receive the payment.
                      </p>
                      
                      <div className="space-y-3">
                        <WalletMultiButton 
                          className="!bg-emerald-600 !hover:bg-emerald-700 !text-white !font-medium !text-sm !py-2.5 !rounded-lg !w-full !transition-all !duration-200" 
                        />
                        
                        {!connected && (
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-zinc-700"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="bg-zinc-900 px-2 text-zinc-500">or enter manually</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Input Section */}
                  <div className="space-y-3">
                    <Label htmlFor="walletAddress" className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <span>Solana Address</span>
                      {isValidSolanaAddress(externalWalletAddress) && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                    </Label>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="walletAddress"
                          type="text"
                          value={externalWalletAddress}
                          onChange={(e) => setExternalWalletAddress(e.target.value)}
                          placeholder="Enter Solana wallet address..."
                          className={`bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 flex-grow h-11 rounded-lg focus:border-emerald-500 focus:ring-emerald-500 text-sm transition-all ${
                            connected ? 'border-emerald-500/50' : ''
                          } ${externalWalletAddress && !isValidSolanaAddress(externalWalletAddress) ? 'border-red-500/50' : ''}`}
                          required={selectedReceiveOption === 'web3'}
                          readOnly={connected}
                        />
                        {!connected && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handlePasteAddress} 
                            className="border-zinc-600 bg-zinc-700/40 hover:bg-zinc-600 text-zinc-300 hover:text-white h-11 px-3 rounded-lg transition-all"
                          >
                            <Copy className="w-4 h-4 mr-0 sm:mr-1.5"/>
                            <span className="hidden sm:inline">Paste</span>
                          </Button>
                        )}
                      </div>
                      
                      {externalWalletAddress && !isValidSolanaAddress(externalWalletAddress) && (
                        <p className="text-xs text-red-400 flex items-center gap-1.5">
                          <XCircle className="w-3 h-3" />
                          Please enter a valid Solana address
                        </p>
                      )}
                      
                      {connected && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Wallet connected and address auto-filled
                        </p>
                      )}
                    </div>
                  </div>

                  {/* OTP Input Section */}
                  <div className="space-y-3">
                    <Label htmlFor="otp-web3" className="text-sm font-medium text-zinc-200">
                      Verification Code
                    </Label>
                    <p className="text-xs text-zinc-400 -mt-1">
                      Enter the 6-digit code shared by the sender.
                    </p>
                    <Input
                      id="otp-web3"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center tracking-widest text-lg font-mono bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 h-12 rounded-lg focus:border-emerald-500 focus:ring-emerald-500"
                      pattern="\\d{6}"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required={selectedReceiveOption === 'web3'}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="bank" className="mt-4">
                  <p className="text-center text-gray-400 text-sm py-6">This feature is coming soon. Please choose another option to receive your payment.</p>
                </TabsContent>
              </Tabs>

              {selectedReceiveOption && selectedReceiveOption !== 'bank' && 
                ( (selectedReceiveOption === 'remlio' && isAuthenticated) || selectedReceiveOption === 'web3' ) && (
                <Button 
                  type="submit" 
                  className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isProcessing || otp.length !== 6 || (selectedReceiveOption === 'web3' && !isValidSolanaAddress(externalWalletAddress))}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2"/>
                      Verify & Receive {paymentLink.amount} {paymentLink.tokenType.toUpperCase()}
                    </>
                  )}
                </Button>
              )}
              
              {error && <p className="mt-4 text-sm text-red-500 text-center font-medium bg-red-900/20 px-3 py-2 rounded-md">{error}</p>}
            </form>
          </CardContent>
          <CardFooter className="text-center px-6 pb-6">
            <p className="text-xs text-gray-500">
              Having trouble? Contact support or the person who sent you this link.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function PaymentLinkReceivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="animate-spin h-10 w-10 text-emerald-500" />
        </div>
      </div>
    }>
      <PaymentLinkReceiveContent />
    </Suspense>
  );
} 
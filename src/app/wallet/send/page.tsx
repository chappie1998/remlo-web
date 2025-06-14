"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ArrowLeftRight, 
  ChevronDown,
  AtSign,
  User,
  CreditCard,
  TabletSmartphone,
  CircleDashed
} from "lucide-react";
import { USDsIcon, USDCIcon } from "@/components/icons";
import { shortenAddress, isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import Link from "next/link";
import debounce from "lodash/debounce";

// Main wrapper component with Suspense
export default function SendPageWrapper() {
  return (
    <Suspense fallback={<SendLoadingState />}>
      <SendPage />
    </Suspense>
  );
}

// Loading state component
function SendLoadingState() {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin">
            <CircleDashed className="h-10 w-10 text-blue-500" />
          </div>
          <p className="text-lg">Loading send options...</p>
        </div>
      </div>
    </div>
  );
}

// Original component now as a separate function
function SendPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Tab control - read initial value from URL query parameter
  const [activeTab, setActiveTab] = useState<"username" | "address">(() => {
    const tabParam = searchParams.get("tab");
    return (tabParam === "username" || tabParam === "address") ? tabParam : "username";
  });
  
  // Form inputs
  const [username, setUsername] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("usd"); // "usd" or "usdc"
  const [passcode, setPasscode] = useState("");
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpUsername, setIsLookingUpUsername] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [error, setError] = useState("");
  
  // Data states
  const [foundUser, setFoundUser] = useState<{ username: string, solanaAddress: string } | null>(null);
  const [usdsBalance, setUsdsBalance] = useState("0.0");
  const [usdcBalance, setUsdcBalance] = useState("0.0");
  
  // Username validation states
  const [isValidatingUsername, setIsValidatingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  
  // Debounced username validation function
  const debouncedValidateUsername = useCallback(
    debounce(async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameStatus("idle");
        setFoundUser(null);
        return;
      }

      setIsValidatingUsername(true);
      setUsernameStatus("validating");
      setFoundUser(null);

      try {
        const response = await fetch("/api/user/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });

        const data = await response.json();

        if (response.ok && data.found) {
          setUsernameStatus("valid");
          setFoundUser({ username: data.username, solanaAddress: data.solanaAddress });
        } else {
          setUsernameStatus("invalid");
          setFoundUser(null);
        }
      } catch (err) {
        setUsernameStatus("invalid");
        setFoundUser(null);
      } finally {
        setIsValidatingUsername(false);
      }
    }, 500),
    []
  );

  // Trigger username validation on input change
  useEffect(() => {
    if (activeTab === "username" && username && username.length >= 3) {
      debouncedValidateUsername(username);
    } else {
      setUsernameStatus("idle");
    }

    // Cleanup function to cancel debounced calls
    return () => {
      debouncedValidateUsername.cancel();
    };
  }, [username, activeTab, debouncedValidateUsername]);
  
  // Check authentication and fetch balances
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    if (status === "authenticated" && !session?.user?.hasPasscode) {
      router.push("/wallet/setup");
    }
    
    if (session?.user?.solanaAddress) {
      fetchBalances();
    }
  }, [status, session, router]);
  
  // Fetch token balances using combined endpoint
  const fetchBalances = async () => {
    try {
      setIsLoading(true);
      
      // Use the optimized overview endpoint - only returns USDC and USDS
      const response = await fetch("/api/wallet/overview");
      if (response.ok) {
        const data = await response.json();
        setUsdcBalance(data.balances.usdc.formattedBalance);
        setUsdsBalance(data.balances.usds.formattedBalance);
      } else {
        console.error("Failed to fetch wallet overview");
        // Set default values if API fails
        setUsdcBalance("0.000000");
        setUsdsBalance("0.000000");
      }
    } catch (error) {
      console.error("Error fetching balances:", error);
      // Set default values if error occurs
      setUsdcBalance("0.000000");
      setUsdsBalance("0.000000");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Look up a user by username
  const lookupUsername = async () => {
    if (!username || username.trim() === "") {
      setError("Username cannot be empty");
      return;
    }

    setIsLookingUpUsername(true);
    setError("");
    setFoundUser(null);

    try {
      const response = await fetch("/api/user/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to find user");
      }

      // Set the recipient address from the username lookup
      setRecipient(data.solanaAddress);
      setFoundUser({
        username: data.username,
        solanaAddress: data.solanaAddress
      });
      
      toast.success(`Found user ${data.username}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to find user";
      setError(errorMessage);
      setRecipient(""); // Clear recipient address if lookup fails
    } finally {
      setIsLookingUpUsername(false);
    }
  };
  
  // Validate the form based on active tab
  const validateForm = async () => {
    // Reset error
    setError("");
    
    if (activeTab === "username") {
      if (!username || username.trim() === "") {
        setError("Username cannot be empty");
        return false;
      }
      
      // Check if username exists when validating the form
      if (!foundUser) {
        setIsLookingUpUsername(true);
        try {
          const response = await fetch("/api/user/lookup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: username,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to verify username");
          }

          if (!data.found) {
            setError("Username not found");
            setIsLookingUpUsername(false);
            return false;
          }

          // Set the found user if lookup is successful
          setFoundUser({
            username: data.username,
            solanaAddress: data.solanaAddress
          });
          
          // Also update the recipient field with the address for consistency
          setRecipient(data.solanaAddress);
          
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to verify username";
          setError(errorMessage);
          setIsLookingUpUsername(false);
          return false;
        }
        setIsLookingUpUsername(false);
      }
    } else {
      // Address validation
      if (!recipient || recipient.trim() === "") {
        setError("Recipient address cannot be empty");
        return false;
      }

      if (!isValidSolanaAddress(recipient)) {
        setError("Invalid Solana address");
        return false;
      }
    }

    // Validate amount for both tabs
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount");
      return false;
    }

    // Check if sufficient balance based on selected token type
    const balance = tokenType === "usdc" ? usdcBalance : usdsBalance;
    if (Number(amount) > Number(balance)) {
      setError(`Insufficient ${tokenType.toUpperCase()} balance`);
      return false;
    }

    return true;
  };
  
  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (await validateForm()) {
      setShowPasscodeModal(true);
    }
  };
  
  // Handle the send transaction
  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    setIsLoading(true);

    try {
      // Use token transaction endpoint for both USDC and USDs
      // Only use send-transaction endpoint if somehow tokenType is something else
      const endpoint = (tokenType === "usdc" || tokenType === "usd")
        ? "/api/wallet/send-token-transaction"
        : "/api/wallet/send-transaction";

      // Determine the recipient address - if using username tab and found a user, use their address
      const recipientAddress = activeTab === "username" && foundUser 
        ? foundUser.solanaAddress 
        : recipient;

      // Include username in the request if a user was found
      const requestData: {
        to: string;
        amount: string;
        passcode: string;
        username?: string;
        tokenType?: string;
      } = {
        to: recipientAddress,
        amount,
        passcode,
      };
      
      // If using token transaction endpoint, include the token type
      if (endpoint === "/api/wallet/send-token-transaction") {
        requestData.tokenType = tokenType;
      }
      
      // If sending to a user found by username, include the username in the transaction data
      if (foundUser) {
        requestData.username = foundUser.username;
      }

      // Log the request payload to help with debugging
      console.log("Sending transaction with payload:", requestData);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      // Log the response status
      console.log("Transaction response status:", response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      // Create a success message that includes the username if available
      const successMessage = foundUser 
        ? `Transaction sent successfully to ${foundUser.username}!`
        : "Transaction sent successfully!";
      
      toast.success(successMessage);
      
      // Reset state and go back to wallet
      setShowPasscodeModal(false);
      setPasscode("");
      setRecipient("");
      setUsername("");
      setFoundUser(null);
      setAmount("");
      
      // Redirect back to wallet page with refresh parameter to trigger balance update
      setTimeout(() => {
        router.push("/wallet?refresh=true");
      }, 1500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle tab change with URL update
  const handleTabChange = (tab: "username" | "address") => {
    setActiveTab(tab);
    
    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
    
    // Reset form fields and errors
    setError("");
    
    if (tab === "username") {
      setRecipient("");
    } else {
      setUsername("");
      setFoundUser(null);
      setUsernameStatus("idle");
    }
  };
  
  // Handle recipient address input change
  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRecipient(value);
    
    // Clear error when user starts typing
    if (error && error.includes("address")) {
      setError("");
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
              <RefreshCw size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Loading your account...</p>
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
              <ArrowLeftRight size={32} className="text-emerald-400" />
            </div>
            <p className="text-lg text-gray-300">Redirecting...</p>
          </div>
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
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Send Money</h1>
              <p className="text-sm text-gray-400">Send SOL, USDC, or USDs to any wallet</p>
            </div>
          </div>
          
          {/* Tabs for different send methods */}
          <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
            <button
              className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
                activeTab === "username"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => handleTabChange("username")}
            >
              <span className="flex items-center gap-1.5">
                <AtSign size={16} />
                Send by Username
              </span>
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm relative whitespace-nowrap ${
                activeTab === "address"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => handleTabChange("address")}
            >
              <span className="flex items-center gap-1.5">
                <TabletSmartphone size={16} />
                Send by Address
              </span>
            </button>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
              <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Username Tab Content */}
            {activeTab === "username" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium flex items-center text-gray-300">
                    Recipient Username <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        // Clear found user whenever username changes
                        if (foundUser) {
                          setFoundUser(null);
                          setRecipient("");
                        }
                      }}
                      className={`w-full p-3 rounded-md border ${
                        usernameStatus === "valid" 
                          ? "border-emerald-500 bg-emerald-900/20" 
                          : usernameStatus === "invalid" 
                            ? "border-red-500 bg-red-900/20" 
                            : "border-zinc-700 bg-zinc-800"
                      } text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
                      disabled={isLookingUpUsername}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isLookingUpUsername || isValidatingUsername ? (
                        <RefreshCw size={16} className="animate-spin text-gray-400" />
                      ) : usernameStatus === "valid" ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : usernameStatus === "invalid" && username.length >= 3 ? (
                        <XCircle size={16} className="text-red-400" />
                      ) : null}
                    </div>
                  </div>
                  {usernameStatus === "valid" && !foundUser && username.length >= 3 && (
                    <p className="text-xs text-emerald-400">Username exists! Click 'Review & Send' to continue.</p>
                  )}
                  {usernameStatus === "invalid" && username.length >= 3 && (
                    <p className="text-xs text-red-400">Username doesn't exist.</p>
                  )}
                  {foundUser && (
                    <div className="bg-emerald-900/30 border border-emerald-800 rounded-md p-2 text-sm text-emerald-400 flex items-center">
                      <CheckCircle2 size={16} className="mr-2" />
                      Found: {foundUser.username} ({shortenAddress(foundUser.solanaAddress)})
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="sm" 
                        className="ml-auto text-xs hover:bg-emerald-800/50"
                        onClick={() => {
                          setUsername("");
                          setFoundUser(null);
                          setRecipient("");
                          setUsernameStatus("idle");
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Enter the username of the person you want to send to</p>
                </div>
              </div>
            )}
            
            {/* Address Tab Content */}
            {activeTab === "address" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="recipient" className="text-sm font-medium flex items-center text-gray-300">
                    Recipient Solana Address <span className="text-red-400 ml-1">*</span>
                  </label>
                  <input
                    id="recipient"
                    type="text"
                    placeholder="Enter Solana address"
                    value={recipient}
                    onChange={handleRecipientChange}
                    className="w-full p-3 rounded-md border border-zinc-700 bg-zinc-800 text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500">Enter a valid Solana wallet address</p>
                </div>
              </div>
            )}
            
            {/* Common fields for both tabs */}
            <div className="pt-2 border-t border-zinc-800">
              {/* Token selection - one-click buttons */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium flex items-center text-gray-300">
                  Token <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant={tokenType === "usd" ? "default" : "outline"}
                    className={`flex-1 flex items-center justify-center ${
                      tokenType === "usd" 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700"
                    }`}
                    onClick={() => setTokenType("usd")}
                  >
                    <USDsIcon width={16} height={16} className="mr-2" />
                    USDs
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
                <p className="text-xs text-gray-500 flex justify-between">
                  <span>Selected token to send</span>
                  <span>Balance: {tokenType === "usd" ? usdsBalance : usdcBalance}</span>
                </p>
              </div>
              
              {/* Amount input */}
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
              </div>
            </div>
            
            <div className="flex items-center space-x-3 pt-4">
              <Link 
                href="/wallet" 
                className="px-4 py-2 border border-zinc-700 rounded-md text-gray-300 hover:bg-zinc-800 flex-1 text-center"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={activeTab === "username" && (!foundUser || usernameStatus !== "valid")}
              >
                Review & Send
              </Button>
            </div>
          </form>
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
                <h2 className="text-xl font-bold text-white">Confirm Transaction</h2>
                <p className="text-sm text-gray-400">Enter your 6-digit passcode</p>
              </div>
            </div>

            <div className="bg-zinc-800 p-4 rounded-lg mb-5 border border-zinc-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Amount</span>
                <span className="font-medium text-white">{amount} {tokenType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">To</span>
                <span className="font-medium text-white">
                  {foundUser ? foundUser.username : shortenAddress(recipient)}
                </span>
              </div>
              
              {foundUser && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-400">Wallet Address</span>
                  <span className="font-mono text-xs text-gray-300">{shortenAddress(foundUser.solanaAddress)}</span>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 text-red-400 text-sm mb-4 flex items-start">
                <XCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSendTransaction} className="space-y-4">
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
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm & Send"
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
"use client";

import { useState, useEffect } from "react";
import { useOkto } from "@okto_web3/react-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export function UniversalWalletSetup() {
  const { data: session } = useSession();
  const oktoClient = useOkto();
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupData, setSetupData] = useState<any>(null);

  console.log("🚀 UniversalWalletSetup component rendered!");

  // Debug session data
  console.log("🔍 Session Debug:", {
    hasSession: !!session,
    sessionKeys: session ? Object.keys(session) : [],
    userKeys: session?.user ? Object.keys(session.user) : [],
    hasIdToken: !!session?.google_id_token,
    idTokenLength: session?.google_id_token?.length,
    fullSession: session
  });

  // Debug Okto client state
  console.log("🏛️ Okto Client Debug:", {
    userSWA: oktoClient.userSWA,
    isLoggedIn: oktoClient.isLoggedIn,
    clientKeys: Object.keys(oktoClient),
    fullClient: oktoClient
  });

  // On component mount, fetch the ID token and authenticate with Okto
  useEffect(() => {
    async function authenticateWithOkto() {
      if (!session?.user?.email) {
        // Not logged in with NextAuth yet, just wait.
        setIsAuthenticating(false);
        return;
      }
      
      if (oktoClient.userSWA) {
        // Already authenticated with Okto.
        setIsAuthenticating(false);
        return;
      }

      try {
        console.log("Fetching ID token from server...");
        const response = await fetch("/api/auth/get-id-token");
        const { idToken, error } = await response.json();

        if (error || !idToken) {
          throw new Error(error || "Failed to retrieve authentication token.");
        }

        console.log("Authenticating with Okto SDK...");
        await oktoClient.loginUsingOAuth({ idToken, provider: "google" });
        console.log("Okto authentication successful.");
      } catch (error: any) {
        console.error("Okto authentication flow failed:", error);
        toast.error(error.message || "Failed to connect to Base wallet.", {
          description: "Please try signing out and back in.",
        });
      } finally {
        setIsAuthenticating(false);
      }
    }

    authenticateWithOkto();
  }, [session, oktoClient]);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      if (passcode.length !== 6 || passcode !== confirmPasscode) {
        toast.error("Please enter a valid 6-digit passcode and confirm it.");
        return;
      }
      if (!oktoClient.userSWA) {
        toast.error("Base wallet is not connected. Please wait or refresh the page.");
        return;
      }
      
      const response = await fetch("/api/wallet/universal-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode,
          oktoUserSWA: oktoClient.userSWA,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to create universal wallet.");
      }
      
      setSetupData(data);
      setSetupComplete(true);
      toast.success("Universal wallet created successfully!");

    } catch (error: any) {
      console.error("Wallet setup failed:", error);
      toast.error(error.message || "An unexpected error occurred during setup.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticating) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Connecting Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Initializing wallet infrastructure...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (setupComplete && setupData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle>Wallet Setup Complete!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Your Universal Wallet is Ready
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              You now have access to both Solana and Base blockchains with a single account.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Username</Label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="font-mono">{setupData.username}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Solana Address</Label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="font-mono text-xs">
                  {setupData.solanaAddress}
                </span>
              </div>
            </div>

            {setupData.baseAddress && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Base Address</Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="font-mono text-xs">
                    {setupData.baseAddress}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Important: Save Your Recovery Shares
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Please save these recovery shares in a secure location. You'll need them to recover your wallet if you forget your passcode.
                </p>
                <div className="mt-3 space-y-2">
                  <div>
                    <Label className="text-xs">Backup Share:</Label>
                    <div className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                      {setupData.backupShare}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Recovery Share:</Label>
                    <div className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                      {setupData.recoveryShare}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set Up Your Universal Wallet</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create a wallet that works on both Solana and Base networks
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            What you'll get:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Solana wallet for USDC, USDS, and SOL</li>
            <li>• Base wallet for USDC and ETH</li>
            <li>• Single username for easy transfers</li>
            <li>• Gas-free transactions on Base</li>
          </ul>
        </div>

        {oktoClient.userSWA && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <div className="text-xs text-green-800 dark:text-green-200">
              <strong>Base Address Ready:</strong>
              <br />
              <span className="font-mono">{oktoClient.userSWA}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="passcode">6-Digit Passcode</Label>
            <Input
              id="passcode"
              type="password"
              placeholder="000000"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              maxLength={6}
              className="font-mono text-center"
            />
          </div>

          <div>
            <Label htmlFor="confirmPasscode">Confirm Passcode</Label>
            <Input
              id="confirmPasscode"
              type="password"
              placeholder="000000"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              maxLength={6}
              className="font-mono text-center"
            />
          </div>
        </div>

        <Button
          onClick={handleSetup}
          disabled={isLoading || isAuthenticating || !oktoClient.userSWA || passcode.length !== 6 || passcode !== confirmPasscode}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Create Universal Wallet"
          )}
        </Button>
      </CardContent>
    </Card>
  );
} 
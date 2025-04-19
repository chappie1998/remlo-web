"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isValidPasscode } from "@/lib/utils";
import { generateMnemonic } from "@/lib/crypto";

export default function WalletSetup() {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = create passcode, 2 = backup info, 3 = success
  const [solanaAddress, setSolanaAddress] = useState("");
  const [backupShare, setBackupShare] = useState("");
  const [recoveryShare, setRecoveryShare] = useState(""); // New state for recovery share
  const router = useRouter();
  const { data: session, update, status } = useSession();

  // Handle redirect if user already has wallet (in client-side only)
  useEffect(() => {
    if (status === "loading") {
      // Still loading, do nothing yet
      return;
    }

    if (status === "unauthenticated") {
      console.log("User is not authenticated, redirecting to sign in page");
      router.push("/auth/signin");

      // Force redirect as fallback
      setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 1000);
      return;
    }

    if (session?.user?.solanaAddress && session?.user?.hasPasscode && step !== 3) {
      console.log("User already has wallet, redirecting to wallet page");
      router.push("/wallet");

      // Force redirect as fallback
      setTimeout(() => {
        window.location.href = "/wallet";
      }, 1000);
    }
  }, [session, step, router, status]);

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPasscode(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match");
      return;
    }

    // With MPC approach, we don't need the mnemonic step
    // We can directly set up the wallet
    setupWallet();
  };

  const setupWallet = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/wallet/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          passcode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set up wallet");
      }

      // Update the session with the new wallet info
      await update({
        hasPasscode: true,
        solanaAddress: data.solanaAddress
      });

      // Store info for the success screen
      setSolanaAddress(data.solanaAddress);
      setBackupShare(data.backupShare);
      setRecoveryShare(data.recoveryShare); // Store the recovery share

      // Move to backup share information
      setStep(2);
      toast.success("Wallet created successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set up wallet";
      setError(errorMessage);
      toast.error("Failed to set up wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupConfirm = () => {
    // Move to success state
    setStep(3);
  };

  // If user already has a wallet, show loading until client-side redirect happens
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Please sign in to set up your wallet</p>
        <Button
          className="mt-4"
          onClick={() => {
            window.location.href = "/auth/signin";
          }}
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  if (session?.user?.solanaAddress && session?.user?.hasPasscode && step !== 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>You already have a wallet. Redirecting to wallet dashboard...</p>
        <Button
          className="mt-4"
          onClick={() => {
            window.location.href = "/wallet";
          }}
        >
          Go to Wallet
        </Button>
      </div>
    );
  }

  // Step 1: Create passcode
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create Your Passcode</h1>
            <p className="text-muted-foreground mt-2">
              Set up a 6-digit passcode to secure your Solana wallet.
              You'll use this to sign transactions.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handlePasscodeSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="passcode"
                  className="text-sm font-medium"
                >
                  Create 6-digit passcode
                </label>
                <input
                  id="passcode"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary text-center text-xl tracking-widest"
                  placeholder="******"
                />
                <p className="text-xs text-muted-foreground">
                  This passcode will be used to sign transactions. Do not share it with anyone.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPasscode"
                  className="text-sm font-medium"
                >
                  Confirm passcode
                </label>
                <input
                  id="confirmPasscode"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary text-center text-xl tracking-widest"
                  placeholder="******"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating Wallet..." : "Create My Wallet"}
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            <p>
              Your wallet will be created on the Solana {process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}.
              This process is free and doesn't require any SOL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Backup share information
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Save Your Backup Shares</h1>
            <p className="text-muted-foreground mt-2">
              These backup shares are critical for recovering your wallet if you lose your passcode.
              Write them down and keep them in secure, separate locations.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <p className="font-medium mb-2 text-sm">Primary Backup Share:</p>
              <div className="p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
                {backupShare}
              </div>
            </div>

            <div>
              <p className="font-medium mb-2 text-sm">Recovery Share:</p>
              <div className="p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
                {recoveryShare}
              </div>
            </div>
          </div>

          <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>IMPORTANT:</strong> Store these backup shares in different secure locations.
              Anyone with your passcode and these shares can access your wallet.
            </p>
          </div>

          <Button
            onClick={handleBackupConfirm}
            className="w-full"
          >
            I've Saved My Backup Shares
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Success state
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 text-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Wallet Created Successfully!</h1>
          <p className="text-muted-foreground mt-2">
            Your Solana wallet has been created and is ready to use.
          </p>
        </div>

        <div className="p-4 bg-muted rounded-md">
          <p className="font-medium mb-1 text-sm">Your Wallet Address:</p>
          <p className="font-mono text-xs break-all">{solanaAddress}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-center">
            Remember your 6-digit passcode and keep your backup shares in secure locations.
            You'll need the passcode to authorize transactions.
          </p>
          <Button asChild className="w-full">
            <Link href="/wallet">Go to My Wallet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isValidPasscode } from "@/lib/utils";

export default function WalletSetup() {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState("");
  const router = useRouter();
  const { data: session, update } = useSession();

  // Handle redirect if user already has wallet (in client-side only)
  useEffect(() => {
    if (session?.user?.solanaAddress && !success) {
      router.push("/wallet");
    }
  }, [session, success, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    try {
      const response = await fetch("/api/wallet/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passcode }),
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

      // Show success state instead of redirecting immediately
      setSuccess(true);
      setSolanaAddress(data.solanaAddress);
      toast.success("Wallet set up successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set up wallet";
      setError(errorMessage);
      toast.error("Failed to set up wallet");
    } finally {
      setIsLoading(false);
    }
  };

  // If user already has a wallet, show loading until client-side redirect happens
  if (session?.user?.solanaAddress && !success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Redirecting to wallet...</p>
      </div>
    );
  }

  // Success state
  if (success) {
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
              Remember your 6-digit passcode. You'll need it to authorize transactions.
            </p>
            <Button asChild className="w-full">
              <Link href="/wallet">Go to My Wallet</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

        <form onSubmit={handleSubmit} className="space-y-6">
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
            {isLoading ? "Setting up wallet..." : "Create My Wallet"}
          </Button>
        </form>

        <div className="text-sm text-center text-muted-foreground">
          <p>
            Your wallet will be created on the Solana devnet.
            This process is free and doesn't require any SOL.
          </p>
        </div>
      </div>
    </div>
  );
}

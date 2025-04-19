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
  const [step, setStep] = useState(1); // 1 = create passcode, 2 = view mnemonic, 3 = verify mnemonic, 4 = success
  const [solanaAddress, setSolanaAddress] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [mnemonicConfirmation, setMnemonicConfirmation] = useState("");
  const [isShowingMnemonic, setIsShowingMnemonic] = useState(false);
  const router = useRouter();
  const { data: session, update } = useSession();

  // Generate a mnemonic when the component mounts
  useEffect(() => {
    if (!mnemonic) {
      setMnemonic(generateMnemonic());
    }
  }, [mnemonic]);

  // Handle redirect if user already has wallet (in client-side only)
  useEffect(() => {
    if (session?.user?.solanaAddress && step !== 4) {
      router.push("/wallet");
    }
  }, [session, step, router]);

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

    // Move to mnemonic step
    setStep(2);
  };

  const handleMnemonicConfirm = () => {
    setIsShowingMnemonic(false);
    setStep(3);
  };

  const handleVerifyMnemonic = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up whitespace and compare
    const cleanedOriginal = mnemonic.trim().toLowerCase();
    const cleanedConfirmation = mnemonicConfirmation.trim().toLowerCase();

    if (cleanedOriginal !== cleanedConfirmation) {
      setError("The recovery phrase you entered doesn't match. Please try again.");
      return;
    }

    // If mnemonic is correct, proceed with wallet setup
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
          mnemonic
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

      // Move to success state
      setStep(4);
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
  if (session?.user?.solanaAddress && step !== 4) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Redirecting to wallet...</p>
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
            >
              Continue
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

  // Step 2: View secret recovery phrase
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Save Your Recovery Phrase</h1>
            <p className="text-muted-foreground mt-2">
              This secret recovery phrase is the only way to recover your wallet if you lose access.
              Write it down and keep it in a secure location.
            </p>
          </div>

          <div className="p-4 bg-muted/50 border rounded-md relative">
            <div className={`absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center ${isShowingMnemonic ? 'hidden' : ''}`}>
              <p className="text-sm font-medium mb-3">Make sure no one can see your screen</p>
              <Button
                onClick={() => setIsShowingMnemonic(true)}
                variant="outline"
              >
                Show Recovery Phrase
              </Button>
            </div>
            <div className="font-mono text-center break-words text-sm p-3">
              {mnemonic}
            </div>
          </div>

          <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>IMPORTANT:</strong> Never share this phrase with anyone. Anyone with this phrase can access your wallet.
            </p>
          </div>

          <Button
            onClick={handleMnemonicConfirm}
            className="w-full"
            disabled={!isShowingMnemonic}
          >
            I've Saved My Recovery Phrase
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Verify secret recovery phrase
  if (step === 3) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Verify Your Recovery Phrase</h1>
            <p className="text-muted-foreground mt-2">
              Please enter your 12-word recovery phrase to confirm you've saved it correctly.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyMnemonic} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="mnemonic-confirm"
                className="text-sm font-medium"
              >
                Your Recovery Phrase
              </label>
              <textarea
                id="mnemonic-confirm"
                required
                rows={3}
                value={mnemonicConfirmation}
                onChange={(e) => setMnemonicConfirmation(e.target.value)}
                className="w-full p-3 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary font-mono text-sm resize-none"
                placeholder="Enter all 12 or 24 words, separated by spaces"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating Wallet..." : "Create My Wallet"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Step 4: Success state
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
            Remember your recovery phrase and 6-digit passcode. You'll need the passcode to authorize transactions.
          </p>
          <Button asChild className="w-full">
            <Link href="/wallet">Go to My Wallet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

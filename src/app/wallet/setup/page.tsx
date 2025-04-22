"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/header";
import { CircleDollarSign, ShieldCheck, ArrowRight } from "lucide-react";

export default function WalletSetup() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // If not authenticated, redirect to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }

    // If user already has a passcode set, redirect to wallet
    if (status === "authenticated" && session?.user?.hasPasscode) {
      router.push("/wallet");
    }
  }, [status, session, router]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passcode length and format
    if (passcode.length !== 6 || !/^\d+$/.test(passcode)) {
      setError("Passcode must be exactly 6 digits");
      return;
    }

    // Confirm passcodes match
    if (passcode !== confirmPasscode) {
      setError("Passcodes do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Send request to setup wallet
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

      // Update session
      await update({ hasPasscode: true });

      // Show success message and redirect
      toast.success("Wallet set up successfully!");
      router.push("/wallet");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to set up wallet";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // If loading session, show loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-card border rounded-lg shadow-sm">
          <div className="text-center mb-6">
            <div className="bg-primary/10 rounded-full p-3 inline-block mb-2">
              <CircleDollarSign className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Set Up Your StableFi Wallet</h1>
            <p className="text-muted-foreground mt-2">
              Create a 6-digit passcode to secure your wallet and start earning 4.2% APY.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="passcode" className="block text-sm font-medium mb-1">
                Enter a 6-digit passcode
              </label>
              <input
                id="passcode"
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full p-2 rounded-md border border-input bg-background text-foreground text-center text-xl tracking-widest focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="confirm-passcode" className="block text-sm font-medium mb-1">
                Confirm passcode
              </label>
              <input
                id="confirm-passcode"
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full p-2 rounded-md border border-input bg-background text-foreground text-center text-xl tracking-widest focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="p-3 bg-muted rounded flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p>This passcode will be used to secure your wallet and authorize transactions.</p>
                <p className="mt-1">Make sure to remember it, as it cannot be recovered if forgotten.</p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Setting up..." : "Create Wallet"} {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

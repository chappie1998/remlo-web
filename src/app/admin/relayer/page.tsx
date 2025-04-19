"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";

export default function RelayerAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [privateKey, setPrivateKey] = useState("");
  const [relayerStatus, setRelayerStatus] = useState({
    initialized: false,
    publicKey: "",
    formattedBalance: "0",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkRelayerStatus();
  }, []);

  // Handle authentication redirects
  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const checkRelayerStatus = async () => {
    try {
      const response = await fetch("/api/relayer/status");
      if (response.ok) {
        const data = await response.json();
        setRelayerStatus({
          initialized: data.initialized,
          publicKey: data.publicKey || "",
          formattedBalance: data.formattedBalance || "0",
        });
      }
    } catch (error) {
      console.error("Error checking relayer status:", error);
    }
  };

  const handleInitializeRelayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!privateKey) {
      setError("Private key is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/relayer/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privateKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize relayer");
      }

      toast.success("Relayer initialized successfully!");
      setPrivateKey("");
      checkRelayerStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize relayer";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // If loading, show loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  // If not admin, show access denied
  if (status === "authenticated" && !session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto p-4 md:p-6 flex items-center justify-center">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md">
            <h1 className="text-xl font-bold mb-4">Access Denied</h1>
            <p>You don't have permission to access the admin area.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/wallet")}
            >
              Back to Wallet
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Relayer Administration</h1>

          <div className="p-6 border rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Relayer Status</h2>
            {relayerStatus.initialized ? (
              <div className="space-y-4">
                <div className="p-3 bg-green-100 text-green-800 rounded">
                  Relayer is active and running
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Relayer Public Key:</p>
                  <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                    {relayerStatus.publicKey}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Balance:</span>
                  <span>{relayerStatus.formattedBalance} SOL</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Make sure the relayer has enough SOL to pay for transaction fees.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-100 text-yellow-800 rounded">
                  Relayer is not initialized
                </div>
                <p className="text-sm text-muted-foreground">
                  Initialize the relayer with a Solana private key to enable gasless transactions.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-bold mb-4">
              {relayerStatus.initialized ? "Update Relayer Key" : "Initialize Relayer"}
            </h2>
            <form onSubmit={handleInitializeRelayer} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="privateKey" className="text-sm font-medium">
                  Relayer Private Key (bs58 encoded)
                </label>
                <input
                  id="privateKey"
                  type="password"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background text-foreground focus:ring-2 focus:ring-primary"
                  placeholder="Enter private key"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This key will be used to pay for transaction fees on behalf of users. Keep it secure and fund it with SOL.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? "Initializing..."
                  : relayerStatus.initialized
                  ? "Update Relayer"
                  : "Initialize Relayer"}
              </Button>
            </form>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">Important Notes</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>The relayer needs SOL to pay for transaction fees</li>
              <li>Use a dedicated account with limited funds for security</li>
              <li>Private keys are sensitive information - handle with care</li>
              <li>For production use, implement proper key management practices</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

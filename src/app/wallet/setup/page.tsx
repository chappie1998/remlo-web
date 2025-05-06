"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { isValidPasscode } from "@/lib/utils";
import { generateMnemonic } from "@/lib/crypto";
import { Pencil } from "lucide-react";

export default function WalletSetup() {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = create passcode, 2 = backup info, 3 = success
  const [solanaAddress, setSolanaAddress] = useState("");
  const [backupShare, setBackupShare] = useState("");
  const [recoveryShare, setRecoveryShare] = useState(""); // New state for recovery share
  const [username, setUsername] = useState(""); // New state for generated username
  
  // States for username editing
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  
  const router = useRouter();
  const { data: session, update } = useSession();

  // Handle redirect if user already has wallet (in client-side only)
  useEffect(() => {
    if (session?.user?.solanaAddress && step !== 3) {
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
      setUsername(data.username); // Store the generated username
      setEditedUsername(data.username); // Initialize edited username

      // Skip the backup step and go straight to success
      setStep(3);
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

  const updateUsername = async () => {
    if (!editedUsername || editedUsername.trim() === "") {
      setUsernameError("Username cannot be empty");
      return;
    }

    if (editedUsername === username) {
      setIsEditingUsername(false);
      return;
    }

    setIsUpdatingUsername(true);
    setUsernameError("");

    try {
      const response = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: editedUsername }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      // Update the local state and session
      setUsername(editedUsername);
      await update({ username: editedUsername });
      
      setIsEditingUsername(false);
      toast.success("Username updated successfully");
    } catch (error) {
      console.error("Error updating username:", error);
      if (error instanceof Error && error.message.includes("taken")) {
        setUsernameError("This username is already taken");
      } else {
        setUsernameError(error instanceof Error ? error.message : "Failed to update username");
      }
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  // If user already has a wallet, show loading until client-side redirect happens
  if (session?.user?.solanaAddress && step !== 3) {
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

  // Step 2: Backup share information (now skipped)
  // if (step === 2) {
  //   return (
  //     <div className="flex min-h-screen flex-col items-center justify-center p-4">
  //       <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
  //         <div className="text-center">
  //           <h1 className="text-2xl font-bold">Save Your Backup Shares</h1>
  //           <p className="text-muted-foreground mt-2">
  //             These backup shares are critical for recovering your wallet if you lose your passcode.
  //             Write them down and keep them in secure, separate locations.
  //           </p>
  //         </div>

  //         <div className="space-y-6">
  //           <div>
  //             <p className="font-medium mb-2 text-sm">Primary Backup Share:</p>
  //             <div className="p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
  //               {backupShare}
  //             </div>
  //           </div>

  //           <div>
  //             <p className="font-medium mb-2 text-sm">Recovery Share:</p>
  //             <div className="p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
  //               {recoveryShare}
  //             </div>
  //           </div>
  //         </div>

  //         <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded">
  //           <p className="text-sm text-amber-800 dark:text-amber-200">
  //             <strong>IMPORTANT:</strong> Store these backup shares in different secure locations.
  //             Anyone with your passcode and these shares can access your wallet.
  //           </p>
  //         </div>

  //         <Button
  //           onClick={handleBackupConfirm}
  //           className="w-full"
  //         >
  //           I've Saved My Backup Shares
  //         </Button>
  //       </div>
  //     </div>
  //   );
  // }

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
            Your Solana wallet is ready to use. You can now send and receive payments.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-2 text-sm">Your Username:</p>
            
            {isEditingUsername ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  className="w-full p-3 font-mono text-center bg-background rounded-md border focus:ring-2 focus:ring-primary"
                  placeholder="Enter username"
                  autoFocus
                />
                
                {usernameError && (
                  <p className="text-destructive text-xs text-center">{usernameError}</p>
                )}
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={updateUsername}
                    disabled={isUpdatingUsername}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    size="sm"
                  >
                    {isUpdatingUsername ? "Saving..." : "Save Username"}
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingUsername(false);
                      setEditedUsername(username);
                      setUsernameError("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
                {username || "Loading..."}
                <button
                  onClick={() => {
                    setIsEditingUsername(true);
                    setEditedUsername(username);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Edit username"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">
              This is your unique Remlo username. Others can use it to send you payments easily.
            </p>
          </div>
          
          {/* <div>
            <p className="font-medium mb-2 text-sm">Your Solana Address:</p>
            <div className="p-3 font-mono text-center break-words text-sm border bg-background rounded-md">
              {solanaAddress}
            </div>
          </div> */}
        </div>

        <div className="p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Remember:</strong> Your wallet is secured with your 6-digit passcode.
            Keep your backup shares in safe locations.
          </p>
        </div>

        <Button
          onClick={() => router.push('/wallet')}
          className="w-full"
        >
          Go to My Wallet
        </Button>
      </div>
    </div>
  );
}

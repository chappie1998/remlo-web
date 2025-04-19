"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function DebugPage() {
  const { data: session, status, update } = useSession();
  const [otpData, setOtpData] = useState<{ email: string; otp: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [repairData, setRepairData] = useState<any>(null);

  // Function to generate OTP for debugging
  const generateOTP = async () => {
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        // Fetch the OTP for dev mode
        setTimeout(async () => {
          try {
            const otpResponse = await fetch(`/api/dev/get-otp?email=${encodeURIComponent(email)}`);
            if (otpResponse.ok) {
              const data = await otpResponse.json();
              setOtpData(data);
            }
          } catch (error) {
            console.error("Error fetching OTP:", error);
          } finally {
            setIsLoading(false);
          }
        }, 1000);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error generating OTP:", error);
      setIsLoading(false);
    }
  };

  // Force refresh session
  const refreshSession = async () => {
    try {
      await update();
      toast.success("Session refreshed");
    } catch (error) {
      console.error("Error refreshing session:", error);
      toast.error("Failed to refresh session");
    }
  };

  // Attempt to repair session
  const repairSession = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/repair-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });

      const data = await response.json();

      if (response.ok) {
        setRepairData(data);
        // Update session with the repaired data
        await update({
          ...data.user
        });
        toast.success("Session repaired successfully");
      } else {
        toast.error(data.error || "Failed to repair session");
      }
    } catch (error) {
      console.error("Error repairing session:", error);
      toast.error("Failed to repair session");
    } finally {
      setIsLoading(false);
    }
  };

  // Force navigation to specific routes
  const forceNavigate = (route: string) => {
    window.location.href = route;
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Debug Page</h1>
        <p className="text-muted-foreground">
          This page displays authentication and session information for debugging purposes.
        </p>
      </div>

      <div className="space-y-8">
        {/* Session Status */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Session Status</h2>
          <div className="bg-muted p-3 rounded flex justify-between mb-4">
            <span>Current Status:</span>
            <span className={`font-medium ${
              status === "authenticated" ? "text-green-500" :
              status === "loading" ? "text-blue-500" : "text-red-500"
            }`}>
              {status}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshSession} disabled={isLoading}>Refresh Session</Button>
            <Button onClick={repairSession} disabled={isLoading} variant="outline">Repair Session</Button>
            {status === "authenticated" && (
              <Button variant="destructive" onClick={() => signOut()}>Sign Out</Button>
            )}
            {status !== "authenticated" && (
              <Button asChild variant="outline">
                <Link href="/auth/signin">Go to Sign In</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Session Data */}
        {status === "authenticated" && session && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-bold mb-4">Session Data</h2>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(session, null, 2)}
            </pre>

            {/* Force navigation based on session state */}
            <div className="mt-4 p-4 border rounded-md">
              <h3 className="text-md font-bold mb-2">Force Navigation</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => forceNavigate("/wallet/setup")}
                  disabled={!session?.user?.email}
                >
                  Force to Wallet Setup
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => forceNavigate("/wallet")}
                  disabled={!session?.user?.email}
                >
                  Force to Wallet Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Repair Session Data */}
        {repairData && (
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-bold mb-4">Repair Session Data</h2>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(repairData, null, 2)}
            </pre>
          </div>
        )}

        {/* Development OTP Generator */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Development OTP Generator</h2>
          <p className="text-muted-foreground mb-4">
            This tool allows you to generate and retrieve OTPs for testing (development mode only).
          </p>

          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="flex-1 p-2 rounded-md border border-input bg-background"
            />
            <Button onClick={generateOTP} disabled={isLoading || !email}>
              {isLoading ? "Generating..." : "Generate OTP"}
            </Button>
          </div>

          {otpData && (
            <div className="bg-muted p-4 rounded-md">
              <p className="font-medium mb-2">Generated OTP for {otpData.email}:</p>
              <p className="text-2xl font-mono tracking-widest text-center">{otpData.otp}</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-bold mb-4">Navigation</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/wallet">Wallet</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/wallet/setup">Wallet Setup</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

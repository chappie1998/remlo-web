"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/wallet";
  const error = searchParams.get("error");

  const handleRequestOTP = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP");
      }

      // Move to the OTP verification step
      setStep("otp");
      toast.success("OTP sent to your email");
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("otp-login", {
        email,
        otp,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        throw new Error(result.error || "Invalid OTP");
      }

      // Redirect to the callback URL or wallet page
      toast.success("Successfully signed in");
      router.push(callbackUrl);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(error instanceof Error ? error.message : "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-muted-foreground mt-2">
            {step === "email"
              ? "Enter your email to receive a one-time code."
              : "Enter the 6-digit code sent to your email."}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            {error === "OAuthSignin" ? "Error signing in. Please try again." :
             error === "OAuthCallback" ? "Error during callback. Please try again." :
             error === "OAuthCreateAccount" ? "Error creating account. Please try again." :
             error === "EmailCreateAccount" ? "Error creating account. Please try again." :
             error === "Callback" ? "Error during callback. Please try again." :
             error === "OAuthAccountNotLinked" ? "Account not linked. Please sign in with the same account you used originally." :
             error === "EmailSignin" ? "Error sending email. Please try again." :
             error === "CredentialsSignin" ? "Invalid code. Please try again." :
             error === "SessionRequired" ? "Please sign in to access this page." :
             "An error occurred. Please try again."}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 rounded-md border focus:ring-2 focus:ring-primary"
                placeholder="your@email.com"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Sending code..." : "Send Verification Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="otp"
                className="text-sm font-medium"
              >
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                className="w-full p-2 text-center rounded-md border focus:ring-2 focus:ring-primary tracking-widest text-xl"
                placeholder="000000"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                disabled={isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await fetch("/api/auth/send-otp", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ email }),
                    });
                    toast.success("New code sent to your email");
                  } catch (error) {
                    toast.error("Failed to send new code");
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Resend Code
              </Button>

              <Button
                type="button"
                variant="link"
                className="w-full text-sm"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
              >
                Change Email
              </Button>
            </div>
          </form>
        )}

        <div className="text-sm text-center text-muted-foreground">
          <p>
            {step === "email"
              ? "We'll send you a one-time verification code to your email."
              : "The code will expire in 10 minutes."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

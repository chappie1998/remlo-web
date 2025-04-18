"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/wallet";
  const error = searchParams.get("error");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      // Redirect to verification page
      router.push("/auth/verify-request");
    } catch (error) {
      console.error("Sign in error:", error);
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
            Enter your email to sign in to your wallet.
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
             error === "CredentialsSignin" ? "Invalid credentials. Please try again." :
             error === "SessionRequired" ? "Please sign in to access this page." :
             "An error occurred. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            {isLoading ? "Signing in..." : "Sign In with Email"}
          </Button>
        </form>

        <div className="text-sm text-center text-muted-foreground">
          <p>
            We'll send you a magic link to your email.
            <br />
            No password required.
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

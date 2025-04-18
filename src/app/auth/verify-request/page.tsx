"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyRequest() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground mt-2">
            A verification code has been sent to your email address.
            <br />
            Enter the 6-digit code to sign in to your wallet.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-md text-sm">
            <p>
              The verification code will expire in 10 minutes. If you don't see the email, check
              your spam folder or click the button below to request a new code.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">Return to Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

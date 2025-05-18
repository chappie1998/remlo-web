"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/wallet";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign In</h1>
        </div>

        <Button type="button" onClick={() => signIn("google", { callbackUrl, prompt: "select_account" })} className="w-full">
          Login with google
        </Button>
      </div>

      <div className="mt-4">
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg border">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Sign In</h1>
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

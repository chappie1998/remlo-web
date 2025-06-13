"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/wallet";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Main Content */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-gray-400 text-base">
              Sign in using your Google account to continue
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button 
            type="button" 
            onClick={() => signIn("google", { callbackUrl, prompt: "select_account" })} 
            className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-3 text-base font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          {/* Terms and Privacy */}
          <p className="text-sm text-gray-500">
            By signing in, you agree to our{" "}
            <Link 
              href="/terms" 
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link 
              href="/privacy" 
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Back to home link */}
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Sign in to your account
              </h1>
              <p className="text-gray-400 text-base">
                Loading...
              </p>
            </div>
            
            <div className="w-full bg-zinc-800 border border-zinc-700 py-3 px-4 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

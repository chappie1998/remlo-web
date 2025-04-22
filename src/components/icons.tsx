import * as React from "react";

export function SolanaIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M93.96 42.2H34.77c-2.64 0-3.96 3.2-2.11 5.07l19.95 20.12c0.78 0.78 1.84 1.21 2.94 1.21h39.33c2.64 0 3.96-3.2 2.11-5.07L76.96 43.41c-0.78-0.78-1.84-1.21-2.94-1.21h-0.06z"
        fill="currentColor"
      />
      <path
        d="M93.96 84.4H34.77c-2.64 0-3.96-3.2-2.11-5.07l19.95-20.12c0.78-0.78 1.84-1.21 2.94-1.21h39.33c2.64 0 3.96 3.2 2.11 5.07L76.96 83.19c-0.78 0.78-1.84 1.21-2.94 1.21h-0.06z"
        fill="currentColor"
      />
    </svg>
  );
}

export function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 11h1a2 2 0 0 1 2 2v-5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      <path d="M17 11V9a2 2 0 0 1 2-2h.5V5a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2" />
      <path d="M20 11v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1Z" />
    </svg>
  );
}

export function PasscodeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <line x1="9" y1="16" x2="9" y2="16" />
      <line x1="12" y1="16" x2="12" y2="16" />
      <line x1="15" y1="16" x2="15" y2="16" />
    </svg>
  );
}

export function TransactionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 3v10" />
      <path d="m12.5 7.5 4.5-4.5 4.5 4.5" />
      <path d="M7 21v-10" />
      <path d="m11.5 16.5-4.5 4.5-4.5-4.5" />
    </svg>
  );
}

export function SecurityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

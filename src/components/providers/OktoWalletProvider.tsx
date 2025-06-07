"use client";

import { OktoProvider } from "@okto_web3/react-sdk";
import { ReactNode } from "react";
import { BASE_CONFIG } from "@/lib/base-config";

interface OktoWalletProviderProps {
  children: ReactNode;
}

export function OktoWalletProvider({ children }: OktoWalletProviderProps) {
  const oktoConfig = {
    environment: BASE_CONFIG.OKTO.environment as "sandbox",
    clientPrivateKey: BASE_CONFIG.OKTO.clientPrivateKey as `0x${string}`,
    clientSWA: BASE_CONFIG.OKTO.clientSWA as `0x${string}`,
  };

  console.log("🔧 Okto Provider Config:", {
    environment: oktoConfig.environment,
    clientSWA: oktoConfig.clientSWA,
    clientPrivateKeyLength: oktoConfig.clientPrivateKey?.length,
    fullConfig: BASE_CONFIG.OKTO
  });

  return (
    <OktoProvider config={oktoConfig}>
      {children}
    </OktoProvider>
  );
} 
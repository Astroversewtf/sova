"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { avalancheFuji } from "viem/chains";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId= {process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: { theme: "dark" },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        defaultChain: avalancheFuji,
        supportedChains: [avalancheFuji],
        loginMethods: ["email", "wallet", "google"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
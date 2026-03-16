"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { avalancheFuji } from "viem/chains";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

function shouldEnablePrivy(appId?: string) {
  if (!appId) return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  return isLocalhost || window.isSecureContext;
}

export function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [privyEnabled, setPrivyEnabled] = useState(false);

  useEffect(() => {
    setPrivyEnabled(shouldEnablePrivy(appId));
  }, [appId]);

  if (!privyEnabled) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId!}
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

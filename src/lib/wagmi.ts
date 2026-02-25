import { http, createConfig } from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = "00000000000000000000000000000000"; // placeholder WalletConnect project ID

export const config = createConfig({
  chains: [avalancheFuji, avalanche],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [avalancheFuji.id]: http(),
    [avalanche.id]: http(),
  },
});

export const AVALANCHE_FUJI_CHAIN_ID = avalancheFuji.id;
export const AVALANCHE_CHAIN_ID = avalanche.id;
export const SUPPORTED_CHAIN_IDS = [avalancheFuji.id, avalanche.id] as const;

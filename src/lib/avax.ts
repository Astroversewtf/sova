declare global {
    interface Window {
        ethereum?: any;
    }
}

import { createAvalancheClient, createAvalancheWalletClient } from "@avalanche-sdk/client";
import { avalancheFuji } from "@avalanche-sdk/client/chains";
import { parseEther, type Address, type Hash, type TransactionReceipt } from "viem";


const testNetClient = createAvalancheClient({
    chain: avalancheFuji,
    transport: { type: "http" }
});


export async function getBalance(address: Address) {
    return testNetClient.getBalance({ address });
}



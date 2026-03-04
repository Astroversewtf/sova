import { createAvalancheClient } from "@avalanche-sdk/client";
import { avalancheFuji } from "@avalanche-sdk/client/chains";
import { type Address } from "viem";


const testNetClient = createAvalancheClient({
    chain: avalancheFuji,
    transport: { type: "http" }
});


export async function getBalance(address: Address) {
    return testNetClient.getBalance({ address });
}

export async function checkTransaction(hash: `0x${string}`) {
    return testNetClient.waitForTransactionReceipt({ hash });
}



import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { Address, parseEther } from "viem";

const CHAIN_ID = Number(process.env.NEXT_CHAIN_ID)

export function usePrivyTransaction() {
    const { sendTransaction } = usePrivy();

    async function sendTransactionBuy(to: `0x${string}`, amount: string) {
        return sendTransaction({
            to,
            value: parseEther(amount),
            chainId: CHAIN_ID
        });
    }

    return { sendTransactionBuy }
}
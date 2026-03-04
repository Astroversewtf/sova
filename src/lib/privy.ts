import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { Address, parseEther } from "viem";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)

export function usePrivyTransaction() {
    const { sendTransaction } = useSendTransaction();

    async function sendTransactionBuy(to: `0x${string}`, amount: string) {
        return sendTransaction({
            to,
            value: parseEther(amount).toString(),
            chainId: CHAIN_ID
        });
    }

    return { sendTransactionBuy }
}
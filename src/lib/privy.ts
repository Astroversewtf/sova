import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { Address, encodeFunctionData, erc20Abi, parseEther, parseUnits } from "viem";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`


export function usePrivyTransaction() {
    const { sendTransaction } = useSendTransaction();
    
    async function sendTransactionBuy(amount: string) {
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [WALLET_ADDRESS, parseUnits(amount, 6)]
        
        });

        return sendTransaction({
            to: USDC_ADDRESS,
            data,
            chainId: CHAIN_ID
        });
    }

    return { sendTransactionBuy }
}
import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { Address, encodeFunctionData, erc20Abi, parseEther, parseUnits } from "viem";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`
const KEY_SHOP_ADDRESS = "0xf423783d4B3b0288502Fa7c3a3C174a8cb4F4F7D" as `0x${string}`

const keyShopAbi = [
    {
        name: "buyKeys",
        type: "function",
        stateMutability: "payable",
        inputs: [{ name: "quantity", type: "uint256" }],
        outputs: [],
    },
] as const;

export function usePrivyTransaction() {
    const { sendTransaction } = useSendTransaction();

    async function sendTransactionBuyUSDT(amount: string) {
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [WALLET_ADDRESS, parseUnits(amount, 6)]

        });

        return sendTransaction({
            to: USDT_ADDRESS,
            data,
            chainId: CHAIN_ID
        });
    }

    async function sendTransactionBuyAVAX(amount: string) {
        return sendTransaction({
            to: WALLET_ADDRESS,
            value: parseEther(amount),
            chainId: CHAIN_ID
        })
    }

    async function sendTransactionBuyKeys(quantity: number, totalAvax: string) {
        const data = encodeFunctionData({
            abi: keyShopAbi,
            functionName: "buyKeys",
            args: [BigInt(quantity)],
        });

        return sendTransaction({
            to: KEY_SHOP_ADDRESS,
            data,
            value: parseEther(totalAvax),
            chainId: CHAIN_ID,
        });
    }

    return { sendTransactionBuyUSDT, sendTransactionBuyAVAX, sendTransactionBuyKeys }
}
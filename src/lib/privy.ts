import { usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { useParams } from "next/navigation";
import { Address, createPublicClient, createWalletClient, custom, encodeFunctionData, erc20Abi, http, parseEther, parseUnits } from "viem";
import { avalancheFuji } from "viem/chains";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID)
const WALLET_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS as `0x${string}`
const KEY_SHOP_ADDRESS = process.env.NEXT_PUBLIC_KEY_SHOP_ADDRESS as `0x${string}`

const keyShopAbi = [
    {
        name: "buyKeys",
        type: "function",
        stateMutability: "payable",
        inputs: [{ name: "quantity", type: "uint256" }],
        outputs: [],
    },
] as const;

const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(),
});

export function usePrivyTransaction() {
    const { wallets } = useWallets();

    async function getWalletClient() {
        const wallet = wallets[0];
        if(!wallet) {
            throw new Error("No wallet connected");
        }
        const provider = await wallet.getEthereumProvider();
        return createWalletClient({
            chain: avalancheFuji,
            transport: custom(provider),
            account: wallet.address as `0x${string}`
        })
    }

    async function sendTransactionBuyUSDT(amount: string) {
        const client = await getWalletClient();
        const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [WALLET_ADDRESS, parseUnits(amount, 6)]

        });

        return client.sendTransaction({
            to: USDT_ADDRESS,
            data,
            chainId: CHAIN_ID
        });
    }

    async function sendTransactionBuyAVAX(amount: string) {
        const client = await getWalletClient();
        return client.sendTransaction({
            to: WALLET_ADDRESS,
            value: parseEther(amount),
            chainId: CHAIN_ID
        })
    }

    async function sendTransactionBuyKeys(quantity: number, totalAvax: string) {
        const client = await getWalletClient();
        const data = encodeFunctionData({
            abi: keyShopAbi,
            functionName: "buyKeys",
            args: [BigInt(quantity)],
        });

        const txHash = await client.sendTransaction({
            to: KEY_SHOP_ADDRESS,
            data,
            value: parseEther(totalAvax),
            chainId: CHAIN_ID,
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        return txHash;
    }

    return { sendTransactionBuyUSDT, sendTransactionBuyAVAX, sendTransactionBuyKeys }
}
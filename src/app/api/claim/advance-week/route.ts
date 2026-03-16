import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const POOL_ADDRESS = process.env.WEEKLY_POOL_ADDRESS as `0x${string}`;

const account = privateKeyToAccount(DEPLOYER_KEY);

const walletClient = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});

const abi = [
  {
    name: "advanceWeek",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = await walletClient.writeContract({
    address: POOL_ADDRESS,
    abi,
    functionName: "advanceWeek",
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return Response.json({ success: true, txHash: hash });
}

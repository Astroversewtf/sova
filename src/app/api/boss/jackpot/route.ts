import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const JACKPOT_ADDRESS = process.env.JACKPOT_CONTRACT_ADDRESS as `0x${string}`;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

const abi = [
  {
    inputs: [{ name: "player", type: "address" }],
    name: "requestSeed",
    outputs: [{ name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "requestId", type: "uint256" }],
    name: "getResult",
    outputs: [
      { name: "player", type: "address" },
      { name: "fulfilled", type: "bool" },
      { name: "seed", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const seedRequestedEvent = parseAbiItem(
  "event SeedRequested(uint256 indexed requestId, address indexed player)"
);

const account = privateKeyToAccount(DEPLOYER_KEY);

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(),
});

export async function POST(req: NextRequest) {
  try {
    const { player } = await req.json();

    if (!player) {
      return NextResponse.json({ error: "missing player address" }, { status: 400 });
    }

    const hash = await walletClient.writeContract({
      address: JACKPOT_ADDRESS,
      abi,
      functionName: "requestSeed",
      args: [player as `0x${string}`],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const log = receipt.logs.find((l) => {
      try {
        decodeEventLog({
          abi: [seedRequestedEvent],
          data: l.data,
          topics: l.topics,
        });
        return true;
      } catch {
        return false;
      }
    });

    if (!log) {
      return NextResponse.json({ error: "SeedRequested event not found" }, { status: 500 });
    }

    const decoded = decodeEventLog({
      abi: [seedRequestedEvent],
      data: log.data,
      topics: log.topics,
    });

    const requestId = (decoded.args as { requestId: bigint }).requestId;

    return NextResponse.json({ requestId: requestId.toString() });
  } catch (err) {
    console.error("Jackpot POST error:", err);
    return NextResponse.json({ error: "failed to request seed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "missing requestId" }, { status: 400 });
    }

    const [player, fulfilled, seed, timestamp] = await publicClient.readContract({
      address: JACKPOT_ADDRESS,
      abi,
      functionName: "getResult",
      args: [BigInt(requestId)],
    });

    if (!fulfilled) {
      return NextResponse.json({ fulfilled: false });
    }

    return NextResponse.json({
      fulfilled: true,
      seed: seed.toString(),
    });
  } catch (err) {
    console.error("Jackpot GET error:", err);
    return NextResponse.json({ error: "failed to get result" }, { status: 500 });
  }
}

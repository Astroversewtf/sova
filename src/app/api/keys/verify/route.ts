import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, parseAbiItem, parseEther } from "viem";
import { avalancheFuji } from "viem/chains";
import { updateUser, getUser } from "@/lib/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SPLITTER_ADDRESS = process.env.SPLITTER_ADDRESS as `0x${string}`;
const KEY_PRICE = parseEther("0.25");

const splitEvent = parseAbiItem(
  "event Split(uint256 total, uint256 toJackpot, uint256 toWeekly, uint256 toTeam)"
);

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});

export async function POST(req: NextRequest) {
  const { txHash, address } = await req.json();

  if (!txHash || !address) {
    return NextResponse.json({ error: "missing txHash or address" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();

  try {
    const txRef = doc(db, "processedTx", txHash);
    const txDoc = await getDoc(txRef);
    if (txDoc.exists()) {
      return NextResponse.json({ error: "transaction already processed" }, { status: 409 });
    }

    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "transaction failed" }, { status: 400 });
    }

    if (receipt.to?.toLowerCase() !== SPLITTER_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: "transaction not to SovaSplitter contract" }, { status: 400 });
    }

    const log = receipt.logs.find((l) => {
      try {
        const decoded = decodeEventLog({
          abi: [splitEvent],
          data: l.data,
          topics: l.topics,
        });
        return decoded.eventName === "Split";
      } catch {
        return false;
      }
    });

    if (!log) {
      return NextResponse.json({ error: "Split event not found" }, { status: 400 });
    }

    const decoded = decodeEventLog({
      abi: [splitEvent],
      data: log.data,
      topics: log.topics,
    });

    const total = (decoded.args as { total: bigint }).total;
    const quantity = Number(total / KEY_PRICE);

    if (quantity <= 0) {
      return NextResponse.json({ error: "invalid payment amount" }, { status: 400 });
    }

    const sender = receipt.from.toLowerCase();
    if (sender !== normalizedAddress) {
      return NextResponse.json({ error: "sender does not match address" }, { status: 403 });
    }

    await setDoc(txRef, { address: normalizedAddress, quantity, processedAt: new Date().toISOString() });

    const user = await getUser(normalizedAddress);
    const currentKeys = user?.keys ?? 0;
    await updateUser(normalizedAddress, { keys: currentKeys + quantity });

    return NextResponse.json({ ok: true, keysAdded: quantity });
  } catch (err) {
    console.error("Verify keys error:", err);
    return NextResponse.json({ error: "verification failed" }, { status: 500 });
  }
}
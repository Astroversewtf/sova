import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, parseAbiItem } from "viem";
import { avalancheFuji } from "viem/chains";
import { updateUser, getUser } from "@/lib/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const KEY_SHOP_ADDRESS = process.env.NEXT_PUBLIC_KEY_SHOP_ADDRESS as `0x${string}`;

const keysPurchasedEvent = parseAbiItem(
  "event KeysPurchased(address indexed buyer, uint256 quantity, uint256 totalPaid)"
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

    if (receipt.to?.toLowerCase() !== KEY_SHOP_ADDRESS.toLowerCase()) {
      return NextResponse.json({ error: "transaction not to KeyShop contract" }, { status: 400 });
    }

    const log = receipt.logs.find((l) => {
      try {
        const decoded = decodeEventLog({
          abi: [keysPurchasedEvent],
          data: l.data,
          topics: l.topics,
        });
        return decoded.eventName === "KeysPurchased";
      } catch {
        return false;
      }
    });

    if (!log) {
      return NextResponse.json({ error: "KeysPurchased event not found" }, { status: 400 });
    }

    const decoded = decodeEventLog({
      abi: [keysPurchasedEvent],
      data: log.data,
      topics: log.topics,
    });

    const buyer = (decoded.args as { buyer: string }).buyer.toLowerCase();
    const quantity = Number((decoded.args as { quantity: bigint }).quantity);

    if (buyer !== normalizedAddress) {
      return NextResponse.json({ error: "buyer does not match address" }, { status: 403 });
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
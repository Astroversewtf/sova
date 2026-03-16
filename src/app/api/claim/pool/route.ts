import { keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getUser } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SIGNER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(SIGNER_KEY);

// TODO finish reward logic
async function calculateReward(player: string, week: number): Promise<bigint> {
  return BigInt(0);
}

export async function POST(req: Request) {
  const { player, week } = await req.json();

  if (!player || week == null) {
    return Response.json({ error: "Missing player or week" }, { status: 400 });
  }

  const address = player.toLowerCase();

  const claimRef = doc(db, "poolClaims", `${address}_${week}`);
  const claimDoc = await getDoc(claimRef);
  if (claimDoc.exists()) {
    return Response.json({ error: "Already claimed this week" }, { status: 409 });
  }

  const user = await getUser(address);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const amount = await calculateReward(address, week);

  await setDoc(claimRef, {
    address,
    week,
    amount: amount.toString(),
    claimedAt: new Date().toISOString(),
  });

  const hash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256"],
      [player as `0x${string}`, BigInt(week), amount]
    )
  );

  const signature = await account.signMessage({
    message: { raw: hash },
  });

  return Response.json({ amount: amount.toString(), signature });
}

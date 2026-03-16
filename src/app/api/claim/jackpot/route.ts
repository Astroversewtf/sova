import { keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getUser, updateUser } from "@/lib/firestore";

const SIGNER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(SIGNER_KEY);

export async function POST(req: Request) {
  const { player, requestId } = await req.json();

  if (!player || requestId == null) {
    return Response.json({ error: "Missing player or requestId" }, { status: 400 });
  }

  const address = player.toLowerCase();
  const user = await getUser(address);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if ((user.goldenTickets ?? 0) < 1) {
    return Response.json({ error: "No golden ticket available" }, { status: 403 });
  }

  await updateUser(address, { goldenTickets: user.goldenTickets - 1 });

  const hash = keccak256(
    encodePacked(
      ["address", "uint256"],
      [player as `0x${string}`, BigInt(requestId)]
    )
  );

  const signature = await account.signMessage({
    message: { raw: hash },
  });

  return Response.json({ signature });
}

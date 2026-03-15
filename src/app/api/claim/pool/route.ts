import { createWalletClient, http, keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const SIGNER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
// TODO create a signer account
const account = privateKeyToAccount(SIGNER_KEY);

const signerWallet = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(),
});

// TODO finish reward logic
async function calculateReward(player: string, week: number): Promise<bigint> {
  return BigInt(0);
}

export async function POST(req: Request) {
  const { player, week } = await req.json();

  const amount = await calculateReward(player, week);

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

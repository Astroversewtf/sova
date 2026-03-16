import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const jackpot = process.env.JACKPOT_PRIZE_ADDRESS;
  const weeklyPool = process.env.WEEKLY_POOL_ADDRESS;
  const teamWallet = process.env.TEAM_WALLET_ADDRESS;

  if (!jackpot) throw new Error("Set JACKPOT_PRIZE_ADDRESS env variable");
  if (!weeklyPool) throw new Error("Set WEEKLY_POOL_ADDRESS env variable");
  if (!teamWallet) throw new Error("Set TEAM_WALLET_ADDRESS env variable");

  const factory = await ethers.getContractFactory("SovaSplitter");
  const contract = await factory.deploy(
    jackpot,
    weeklyPool,
    teamWallet,
    60, // jackpot %
    30, // weekly pool %
    10  // team %
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SovaSplitter deployed to:", address);
}

main();

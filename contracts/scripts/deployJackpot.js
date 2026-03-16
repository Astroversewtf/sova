import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const vrfCoordinator = process.env.VRF_COORDINATOR;
  const keyHash = process.env.VRF_KEY_HASH;

  const subscriptionId = process.env.VRF_SUBSCRIPTION_ID;
  if (!subscriptionId) {
    throw new Error("Set VRF_SUBSCRIPTION_ID env variable");
  }

  const factory = await ethers.getContractFactory("SovaJackpot");
  const contract = await factory.deploy(vrfCoordinator, subscriptionId, keyHash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SovaJackpot deployed to:", address);
}

main();
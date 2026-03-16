import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const signer = process.env.WALLET_ADDRESS;
  if (!signer) throw new Error("Set WALLET_ADDRESS env variable");

  const factory = await ethers.getContractFactory("SovaJackpotPrize");
  const contract = await factory.deploy(signer);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SovaJackpotPrize deployed to:", address);
}

main();

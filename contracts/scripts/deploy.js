import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const factory = await ethers.getContractFactory("SovaKeyShop");
  const keyPrice = ethers.parseEther("0.25");
  const contract = await factory.deploy(keyPrice);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("SovaKeyShop deployed to:", address);
}

main();
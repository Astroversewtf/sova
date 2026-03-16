require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const config = {
  solidity: "0.8.19",
  networks: {
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

module.exports = config;

require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

console.log("RPC", process.env.VITE_GOODVIBE_CHAIN_RPC_WITH_CREDENTIALS);

const privateKeyFounder = process.env.TEST_FOUNDER_PKEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.27",
  settings: {
    optimizer: {
      enabled: true,
      runs: 333,
    },
    viaIR: true,
    evmVersion: "paris",
  },
  defaultNetwork: "GoodVibeTestnet",
  networks: {
    hardhat: {},
    GoodVibeTestnet: {
      chainId: 22052024,
      gasPrice: "auto",
      gas: "auto",
      url: process.env.VITE_GOODVIBE_CHAIN_RPC_WITH_CREDENTIALS,
      accounts: [privateKeyFounder],
    },
  },
};

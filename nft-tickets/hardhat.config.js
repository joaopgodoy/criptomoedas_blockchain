require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    amoy: {
      url: RPC_URL,      // ex.: https://polygon-amoy.g.alchemy.com/v2/<KEY>
      chainId: 80002,    // Polygon Amoy
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

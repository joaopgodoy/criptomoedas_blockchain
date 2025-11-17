require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { RPC_URL, PRIVATE_KEY } = process.env;

const amoyNetwork = RPC_URL
  ? {
      url: RPC_URL, // ex.: https://polygon-amoy.g.alchemy.com/v2/<KEY>
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    }
  : undefined;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    ...(amoyNetwork ? { amoy: amoyNetwork } : {}),
  },
};

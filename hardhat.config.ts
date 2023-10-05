require("./tasks/diamondABI.js");

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";

import "solidity-coverage";
import * as dotenv from "dotenv";
dotenv.config();

//@notice just for testing
/*
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
};
*/

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    // hardhat: {
    //   forking: {
    //     url: process.env.MUMBAI_URL || "",
    //   },
    //   // blockGasLimit: 20000000,
    //   // gas: 12000000,
    //   // allowUnlimitedContractSize: true,
    // },
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined
          ? [process.env.PRIVATE_KEY]
          : [],
      blockGasLimit: 20000000,
    },

    BTTC: {
      url: process.env.BTTC_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined
          ? [process.env.PRIVATE_KEY]
          : [],
      blockGasLimit: 20000000, //90000000,
    },
  },
  gasReporter: {
    enabled: false,
  },
};
export default config;

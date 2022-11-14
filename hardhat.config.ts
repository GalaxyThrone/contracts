import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
dotenv.config();

require("./tasks/diamondABI.js");

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MUMBAI_URL || "",
      },
      // blockGasLimit: 20000000,
      // gas: 12000000,
      // allowUnlimitedContractSize: true,
    },
    mumbai: {
      url: process.env.MUMBAI_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      blockGasLimit: 20000000,
    },
  },
};

export default config;

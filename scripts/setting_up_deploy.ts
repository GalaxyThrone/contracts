// Import necessary modules and contracts
import { ethers, upgrades } from "hardhat";
import {
  AdminFacet,
  // ... other necessary contract artifacts ...
} from "../typechain-types";
import { addBuildings } from "./addBuildings";
import { addFleets } from "./addFleets";
import { addGovernanceTechLevels } from "./addResearchTreesGovernance";
import { addMilitaryTechLevels } from "./addResearchTreesMilitary";
import { addShipTechLevels } from "./addResearchTreesShips";
import { addUtilityTechLevels } from "./addResearchTreesUtility";
import { addFaction } from "./addShipModules";

// Define Utility Function for delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main function for adding game elements
async function addGameElements() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const diamondAddress = "0x366aA055B9B94003BB78551a90D94CA9167D042D"; // Replace with actual diamond address

  // Initialize the necessary contract instances
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  // Extracted code
  await delay(50);

  console.log("adding buildings");
  await addBuildings(diamondAddress); // Ensure addBuildings is imported or defined
  console.log("adding ships");
  await addFleets(diamondAddress); // Ensure addFleets is imported or defined
  await delay(10);

  await addShipTechLevels(diamondAddress);
  console.log("adding Military Research Tree, ID 2");
  await delay(100);
  await addMilitaryTechLevels(diamondAddress);
  await delay(100);
  console.log("adding Governance Research Tree, ID 3 ");
  await addGovernanceTechLevels(diamondAddress);
  console.log("adding Utility Research Tree, ID 4");
  await delay(100);
  await addUtilityTechLevels(diamondAddress);
  console.log("adding Factions");
  await addFaction(diamondAddress, 4);

  console.log("starting init");
  await delay(50);
  await delay(50);

  // await delay(5000);

  // for (let i = 0; i < 40; i++) {
  //   await delay(2000);
  //   const initPlanets = await adminFacet.startInit(4, 0);
  //   await initPlanets.wait();
  //   await delay(2000);

  //   if (Math.random() < 0.1) {
  //     const initBelts = await adminFacet.startInit(1, 1);
  //     await initBelts.wait();
  //   } else {
  //     const initPlanets2 = await adminFacet.startInit(1, 0);
  //     await initPlanets2.wait();
  //   }

  //   console.log("Planet Gen Batch:", i);
  // }

  // console.log("ALL DONE");
}

// Script execution and error handling
addGameElements()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

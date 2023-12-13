// Import necessary modules and contracts
import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

// Define Utility Function for delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main function for planet generation
async function generatePlanets() {
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const diamondAddress = "0x366aA055B9B94003BB78551a90D94CA9167D042D"; // Replace with actual diamond address

  // Initialize the necessary contract instances
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  /*
  console.log("Tradehub Planet Gen");
  const genesisPlanets = await adminFacet.startInit(1, 2);
  await genesisPlanets.wait();
  console.log("Starting Planet Gen");
*/
  // Planet generation logic
  for (let i = 0; i < 2; i++) {
    await delay(20);
    const initPlanets = await adminFacet.startInit(4, 0);
    await initPlanets.wait();
    await delay(20);

    if (Math.random() < 0.1) {
      const initBelts = await adminFacet.startInit(1, 1);
      await initBelts.wait();
    } else {
      const initPlanets2 = await adminFacet.startInit(1, 0);
      await initPlanets2.wait();
    }

    console.log("Planet Gen Batch:", i);
  }
  console.log("Planet generation completed");
}

// Script execution and error handling
generatePlanets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

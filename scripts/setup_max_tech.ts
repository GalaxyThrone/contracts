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

  const maxTechTreeCount = await adminFacet.setupMaxTechResearch(8); // Set the max tech research count
  maxTechTreeCount.wait();
}

// Script execution and error handling
generatePlanets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

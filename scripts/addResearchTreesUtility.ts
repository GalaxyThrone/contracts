import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addUtilityTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  //@notice  see /docs/techTreesUtility.md

  const utilityTechTrees = [
    {
      techId: 4, // Unique ID for the tech
      name: "Enhanced Planetary Mining",
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 24 * 3600, // 24 hours cooldown
      typeOfUtilityBoost: 1, // Mining Planets
      utilityBoost: 20, // 20% boost
      utilityBoostFlat: 0,
      preRequisiteTech: 0,
    },
    {
      techId: 5, //  50% chance to get Aether on planetmining
      name: "Aether Mining Technology",
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours cooldown
      typeOfUtilityBoost: 2, // Aether Mining
      utilityBoost: 0,
      utilityBoostFlat: 0,
      preRequisiteTech: 4, // Requires Enhanced Planetary Mining
    },

    {
      techId: 6, //  100% chance to get Aether on planetmining
      name: "Advanced Aether Mining",
      price: [
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("50"),
      ],
      cooldown: 96 * 3600, // 96 hours cooldown
      typeOfUtilityBoost: 2, // Aether Mining
      utilityBoost: 0, // No percentage boost for this tech
      utilityBoostFlat: 0, // No flat boost for this tech
      preRequisiteTech: 5, // Requires Aether Mining Technology
    },

    {
      techId: 7, // Increase asteroid mining yield by 10%
      name: "Enhanced Asteroid Mining Yield",
      price: [
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 48 * 3600, // 48 hours cooldown
      typeOfUtilityBoost: 3, // Asteroid Mining Yield
      utilityBoost: 10, // 10% increase in yield
      utilityBoostFlat: 0,
      preRequisiteTech: 0,
    },
    {
      techId: 8, // Increase asteroid mining speed by 20%
      name: "Rapid Asteroid Mining Procedures",
      price: [
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours cooldown
      typeOfUtilityBoost: 4, // Asteroid Mining Speed
      utilityBoost: 20, // 20% increase in speed
      utilityBoostFlat: 0,
      preRequisiteTech: 7,
    },
    {
      techId: 9, // Increase asteroid yield by another 25%
      name: "Advanced Asteroid Resource Extraction",
      price: [
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 96 * 3600, // 96 hours cooldown
      typeOfUtilityBoost: 3, // Asteroid Mining Yield
      utilityBoost: 25, // Additional 25% increase in yield
      utilityBoostFlat: 0,
      preRequisiteTech: 8,
    },
    {
      techId: 10, // Militarization of miner ships: double combat stats
      name: "Miner Ship Combat Deputization",
      price: [
        ethers.utils.parseEther("30000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 120 * 3600, // 120 hours cooldown
      typeOfUtilityBoost: 5, // Miner Ship Militarization
      utilityBoost: 0,
      utilityBoostFlat: 0,
      preRequisiteTech: 9,
    },
  ];

  for (const techTree of utilityTechTrees) {
    const TechTreeDeploy = await adminFacet.initializeUtilityTechTree(
      techTree
    );
    await delay(50);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

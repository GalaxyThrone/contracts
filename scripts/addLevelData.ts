import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addShipTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const CRAFT_TIME_FACTOR = 1; // Adjust as needed

  const shipTechTrees = [
    {
      techId: 1,
      name: "Antimatter ammunition",
      shipTypeId: 1,
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 16 * CRAFT_TIME_FACTOR,
      hpBuff: 20,
      attackBoostStat: [20, 20, 20],
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 0,
    },
    {
      techId: 2,
      name: "Carbon Nano-Tube Reinforcement",
      shipTypeId: 1,
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 16 * CRAFT_TIME_FACTOR,
      hpBuff: 20,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [20, 20, 20],
      preRequisiteTech: 0,
    },
    {
      techId: 3,
      name: "Advanced Shielding Techniques",
      shipTypeId: 1,
      price: [
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 24 * CRAFT_TIME_FACTOR,
      hpBuff: 100,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [20, 20, 20],
      preRequisiteTech: 2,
    },
    // Add more technologies as needed
  ];

  for (const techTree of shipTechTrees) {
    await adminFacet.initializeShipTechTree(techTree);
  }

  await adminFacet.setupMaxTechResearch(8); // Set the max tech research count
}

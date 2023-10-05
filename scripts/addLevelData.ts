import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";
import { ship } from "../types";

export async function addLevels(diamondAddr: string) {
  const fleetsContract = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const CRAFT_TIME_FACTOR = 1; // 20;

  const TechTrees = [
    {
      techId: 1,
      name: "Red makes ships go fasta",
      shipTypeId: 1,
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 16 * CRAFT_TIME_FACTOR, // 1 hour in seconds
      hpBuff: 10,
      attackBoostStat: [10, 10, 10],
      defenseBoostStat: [5, 5, 5],
      preRequisiteTech: [0, 0],
    },

    {
      techId: 2,
      name: "Black makes ships cooler",
      shipTypeId: 2,
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 16 * CRAFT_TIME_FACTOR, // 1 hour in seconds
      hpBuff: 10,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [20, 20, 20],
      preRequisiteTech: [0, 0],
    },
  ];

  for (const techTree of TechTrees) {
    await fleetsContract.initalizeShipTechTree(techTree);
  }

  await fleetsContract.setupMaxTechResearch(10);
}

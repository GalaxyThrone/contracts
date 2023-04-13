import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";
import { ship } from "../types";

export async function addLevels(diamondAddr: string) {
  const fleetsContract = await ethers.getContractAt("AdminFacet", diamondAddr) as AdminFacet;

  const fleets = [
    {
      shipTypeId: 1,
      maxLevel: 10,
      levelStats: [10, 10, 10, 10, 10, 10, 5],
      costsLeveling: [50, 50, 50],
    },
    {
      shipTypeId: 2,
      maxLevel: 10,
      levelStats: [10, 10, 10, 10, 10, 10, 5],
      costsLeveling: [50, 50, 50],
    },
    // Add more fleets as needed
  ];

  for (const fleet of fleets) {
    for (let i = 0; i < fleet.maxLevel; i++) {
      await fleetsContract.addLevels(fleet.shipTypeId, i, fleet.levelStats, fleet.costsLeveling, fleet.maxLevel);
    }
  }
}

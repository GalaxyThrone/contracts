import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addMilitaryTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  //@notice  see /docs/techTreesMilitary.md
  const militaryTechTrees = [
    {
      techId: 1, // Boost innate defense of planets
      name: "Civilian Defense Mobilization",
      price: [
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 24 * 3600, // 24 hours cooldown
      hpBuff: 0, // Assuming no HP buff
      attackBoostStat: [0, 0, 0], // Assuming no attack boost
      defenseBoostStat: [300, 300, 300], // 300% boost in defense stats
      preRequisiteTech: 0,
    },
    {
      techId: 2, // Boost planetary defense buildings
      name: " Defensive Infrastructure Enhancement",
      price: [
        ethers.utils.parseEther("25000"),
        ethers.utils.parseEther("25000"),
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // 10% boost in defense building stats
      preRequisiteTech: 1,
    },
    {
      techId: 3, // Boost planetary fleets that are defending, 10%
      name: "Fleet Defense Coordination Drills",
      price: [
        ethers.utils.parseEther("25000"),
        ethers.utils.parseEther("30000"),
        ethers.utils.parseEther("40000"),
        ethers.utils.parseEther("100"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // 10% boost in defense fleet stats
      preRequisiteTech: 2,
    },
    {
      techId: 4, // Boost planetary fleets that are defending, 10%
      name: "Elite Naval Defense Tactics",
      price: [
        ethers.utils.parseEther("50000"),
        ethers.utils.parseEther("60000"),
        ethers.utils.parseEther("80000"),
        ethers.utils.parseEther("1000"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // another 10% boost in defense fleet stats
      preRequisiteTech: 3,
    },

    {
      techId: 5, // Health Boost for Ships
      name: "Ship Health Enhancement",
      price: [
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("10000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 24 * 3600, // 24 hours cooldown
      hpBuff: 10, // 10% increase in health
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 0,
    },
    {
      techId: 6, // Attack Boost for Ships
      name: "Ship Attack Enhancement",
      price: [
        ethers.utils.parseEther("25000"),
        ethers.utils.parseEther("25000"),
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours cooldown
      hpBuff: 0,
      attackBoostStat: [5, 5, 5], // 10% boost in attack
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 5,
    },
    {
      techId: 7, // Reducing Combat Malus
      name: "Fleetsize Combat Debuff Reduction",
      price: [
        ethers.utils.parseEther("50000"),
        ethers.utils.parseEther("50000"),
        ethers.utils.parseEther("40000"),
        ethers.utils.parseEther("100"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 6,
    },
    {
      techId: 8, // Further Attack Boost
      name: "Advanced Ship Weaponry",
      price: [
        ethers.utils.parseEther("80000"),
        ethers.utils.parseEther("80000"),
        ethers.utils.parseEther("70000"),
        ethers.utils.parseEther("1000"),
      ],
      cooldown: 192 * 3600, // 192 hours cooldown
      hpBuff: 0,
      attackBoostStat: [5, 5, 5], // Additional 10% boost in attack
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 7,
    },
  ];

  for (const techTree of militaryTechTrees) {
    const techTreeDeploy =
      await adminFacet.initializeMilitaryTechTree(techTree);

    techTreeDeploy.wait();
    await delay(40);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

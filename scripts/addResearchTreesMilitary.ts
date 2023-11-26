import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addMilitaryTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const militaryTechTrees = [
    {
      techId: 7, // Boost innate defense of planets
      name: "Planetary Defense System Enhancement",
      price: [
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("800"),
        ethers.utils.parseEther("400"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 120 * 3600, // 120 hours cooldown
      hpBuff: 0, // Assuming no HP buff
      attackBoostStat: [0, 0, 0], // Assuming no attack boost
      defenseBoostStat: [300, 300, 300], // 300% boost in defense stats
      preRequisiteTech: 0,
    },
    {
      techId: 8, // Boost planetary defense buildings
      name: "Advanced Defense Architecture",
      price: [
        ethers.utils.parseEther("2500"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 144 * 3600, // 144 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // 10% boost in defense building stats
      preRequisiteTech: 7,
    },
    {
      techId: 9, // Boost planetary fleets that are defending, 10%
      name: "Fleet Defense Coordination",
      price: [
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("1200"),
        ethers.utils.parseEther("600"),
        ethers.utils.parseEther("500"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // 10% boost in defense fleet stats
      preRequisiteTech: 8,
    },
    {
      techId: 10, // Boost planetary fleets that are defending, 10%
      name: "Advanced Fleet Defense Coordination",
      price: [
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("1200"),
        ethers.utils.parseEther("600"),
        ethers.utils.parseEther("500"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [10, 10, 10], // another 10% boost in defense fleet stats
      preRequisiteTech: 8,
    },

    {
      techId: 11, // Health Boost for Ships
      name: "Ship Health Enhancement",
      price: [
        ethers.utils.parseEther("3500"),
        ethers.utils.parseEther("1400"),
        ethers.utils.parseEther("700"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 120 * 3600, // 120 hours cooldown
      hpBuff: 10, // 10% increase in health
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 0,
    },
    {
      techId: 12, // Attack Boost for Ships
      name: "Ship Attack Enhancement",
      price: [
        ethers.utils.parseEther("4000"),
        ethers.utils.parseEther("1600"),
        ethers.utils.parseEther("800"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 144 * 3600, // 144 hours cooldown
      hpBuff: 0,
      attackBoostStat: [5, 5, 5], // 5% boost in attack
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 11,
    },
    {
      techId: 13, // Reducing Combat Malus
      name: "Combat Malus Reduction",
      price: [
        ethers.utils.parseEther("4500"),
        ethers.utils.parseEther("1800"),
        ethers.utils.parseEther("900"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 168 * 3600, // 168 hours cooldown
      hpBuff: 0,
      attackBoostStat: [0, 0, 0],
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 12,
    },
    {
      techId: 14, // Further Attack Boost
      name: "Advanced Ship Weaponry",
      price: [
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 192 * 3600, // 192 hours cooldown
      hpBuff: 0,
      attackBoostStat: [5, 5, 5], // Additional 5% boost in attack
      defenseBoostStat: [0, 0, 0],
      preRequisiteTech: 13,
    },
  ];

  for (const techTree of militaryTechTrees) {
    await adminFacet.initializeMilitaryTechTree(techTree);
  }
}

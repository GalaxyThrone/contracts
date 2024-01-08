import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addGovernanceTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  //@notice  see /docs/techTreesGovernance.md

  const governanceTechTrees = [
    {
      techId: 1,
      name: "Rapid Infrastructure Development",
      price: [
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("5000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 24 * 3600, // 48 hours
      governanceBuff: 10, // 10% faster building construction
      preRequisiteTech: 0,
    },
    {
      techId: 2,
      name: "Fleet Fabrication Mastery",
      price: [
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("20000"),
        ethers.utils.parseEther("30000"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours
      governanceBuff: 10, // 10% faster shipbuilding
      preRequisiteTech: 1, // Requires Rapid Infrastructure Development
    },
    {
      techId: 3,
      name: "Resource-Savvy Constructions",
      price: [
        ethers.utils.parseEther("60000"),
        ethers.utils.parseEther("60000"),
        ethers.utils.parseEther("60000"),
        ethers.utils.parseEther("100"),
      ],
      cooldown: 168 * 3600, // 96 hours
      governanceBuff: 10, // 10% cheaper building costs
      preRequisiteTech: 2, // Requires Fleet Fabrication Mastery
    },
  ];

  for (const techTree of governanceTechTrees) {
    const techTreeDeploy =
      await adminFacet.initializeGovernanceTechTree(techTree);
    techTreeDeploy.wait();
    await delay(50);
  }
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

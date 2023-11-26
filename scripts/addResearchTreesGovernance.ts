import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addGovernanceTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const governanceTechTrees = [
    {
      techId: 1,
      name: "Efficient Construction Methods",
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("250"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 48 * 3600, // 48 hours
      governanceBuff: 10, // 10% faster building construction
      preRequisiteTech: 0,
    },
    {
      techId: 2,
      name: "Advanced Shipbuilding Techniques",
      price: [
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 72 * 3600, // 72 hours
      governanceBuff: 10, // 10% faster shipbuilding
      preRequisiteTech: 1, // Requires Efficient Construction Methods
    },
    {
      techId: 3,
      name: "Economical Building Designs",
      price: [
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther("750"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 96 * 3600, // 96 hours
      governanceBuff: 10, // 10% cheaper building costs
      preRequisiteTech: 2, // Requires Advanced Shipbuilding Techniques
    },
  ];

  for (const techTree of governanceTechTrees) {
    await adminFacet.initializeGovernanceTechTree(techTree);
  }
}

import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addGovernanceTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  /*

### Governance Tech Tree ( ID 3)

#### 1. Rapid Infrastructure Development
- **Tech ID**: 1
- **Description**: Streamline your empire's growth with 'Rapid Infrastructure Development'. This technology grants a 10% reduction in building construction time, allowing for swift expansion and development.
- **Prerequisites**: None
- **Cooldown**: 48 hours
- **Governance Buff**: 10% faster building construction

#### 2. Fleet Fabrication Mastery
- **Tech ID**: 2
- **Description**: Revolutionize your naval capabilities with 'Fleet Fabrication Mastery'. This technology optimizes your shipyards, cutting down ship construction time by 10%, giving you an edge in naval warfare.
- **Prerequisites**: Rapid Infrastructure Development (Tech ID: 1)
- **Cooldown**: 72 hours
- **Governance Buff**: 10% faster shipbuilding

#### 3. Resource-Savvy Constructions
- **Tech ID**: 3
- **Description**: Embrace 'Resource-Savvy Constructions' to make building more affordable. This advanced technology slashes the resource costs for building construction by 10%, boosting your economy's efficiency.
- **Prerequisites**: Fleet Fabrication Mastery (Tech ID: 2)
- **Cooldown**: 96 hours
- **Governance Buff**: 10% cheaper building costs

  */
  const governanceTechTrees = [
    {
      techId: 1,
      name: "Rapid Infrastructure Development",
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
      name: "Fleet Fabrication Mastery",
      price: [
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
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
        ethers.utils.parseEther("3000"),
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther("750"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 96 * 3600, // 96 hours
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

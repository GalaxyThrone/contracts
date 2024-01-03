import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function addUtilityTechLevels(diamondAddr: string) {
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  /*
### Utility Tech Tree (ID 4)

Utility Tech Tree
├── 1. Enhanced Planetary Mining (Tech ID: 4)
│    └── 2. Aether Mining Technology (Tech ID: 5)
│         └── 3. Advanced Aether Mining (Tech ID: 6)
└── 4. Enhanced Asteroid Mining Yield (Tech ID: 7)
     └── 5. Rapid Asteroid Mining Procedures (Tech ID: 8)
          └── 6. Advanced Asteroid Resource Extraction (Tech ID: 9)
               └── 7. Miner Ship Combat Deputization (Tech ID: 10)



#### 1. Enhanced Planetary Mining
- **Tech ID**: 4
- **Description**: Enhance resource extraction with 'Enhanced Planetary Mining'. This technology provides a 20% boost in planetary mining output, improving resource gathering efficiency.
- **Prerequisites**: None
- **Cooldown**: 24 hours
- **Utility Buff**: 20% boost in planetary mining output

#### 2. Aether Mining Technology
- **Tech ID**: 5
- **Description**: Introduce the capability to mine Aether with 'Aether Mining Technology'. This tech enables Aether mining, adding a vital resource to your collection.
- **Prerequisites**: Enhanced Planetary Mining (Tech ID: 4)
- **Cooldown**: 72 hours
- **Utility Buff**: Enables Aether mining

#### 3. Advanced Aether Mining
- **Tech ID**: 6
- **Description**: Master Aether extraction with 'Advanced Aether Mining'. This advanced technology ensures a 100% success rate in Aether mining.
- **Prerequisites**: Aether Mining Technology (Tech ID: 5)
- **Cooldown**: 96 hours
- **Utility Buff**: 100% success rate in Aether mining

#### 4. Enhanced Asteroid Mining Yield
- **Tech ID**: 7
- **Description**: Improve asteroid mining yield by 10% with 'Enhanced Asteroid Mining Yield'. This technology boosts the efficiency of asteroid mining.
- **Prerequisites**: None
- **Cooldown**: 48 hours
- **Utility Buff**: 10% increase in asteroid mining yield

#### 5. Rapid Asteroid Mining Procedures
- **Tech ID**: 8
- **Description**: Accelerate asteroid mining by 20% with 'Rapid Asteroid Mining Procedures'. This technology enhances the speed of asteroid mining.
- **Prerequisites**: Enhanced Asteroid Mining Yield (Tech ID: 7)
- **Cooldown**: 72 hours
- **Utility Buff**: 20% increase in asteroid mining speed

#### 6. Advanced Asteroid Resource Extraction
- **Tech ID**: 9
- **Description**: Further increase asteroid yield by 25% with 'Advanced Asteroid Resource Extraction'. This technology significantly enhances the yield from asteroid mining.
- **Prerequisites**: Rapid Asteroid Mining Procedures (Tech ID: 8)
- **Cooldown**: 96 hours
- **Utility Buff**: Additional 25% increase in asteroid yield

#### 7. Miner Ship Combat Deputization
- **Tech ID**: 10
- **Description**: Militarize miner ships to double their combat stats with 'Miner Ship Combat Deputization'. This technology transforms mining ships for combat readiness.
- **Prerequisites**: Advanced Asteroid Resource Extraction (Tech ID: 9)
- **Cooldown**: 120 hours
- **Utility Buff**: Doubles combat stats of miner ships

*/

  const utilityTechTrees = [
    {
      techId: 4, // Unique ID for the tech
      name: "Enhanced Planetary Mining",
      price: [
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("0"),
      ],
      cooldown: 48 * 1800, // 24 hours cooldown
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
        ethers.utils.parseEther("400"),
        ethers.utils.parseEther("200"),
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
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther("600"),
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("0"),
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
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("250"),
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
        ethers.utils.parseEther("1200"),
        ethers.utils.parseEther("600"),
        ethers.utils.parseEther("300"),
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
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther("750"),
        ethers.utils.parseEther("375"),
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
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
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

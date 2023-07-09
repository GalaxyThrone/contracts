import { ethers } from "hardhat";
import { AdminFacet, Buildings } from "../typechain-types";
import { Building } from "../types";

export async function addBuildings(diamondAddr: string) {
  // const gasPrice = 35000000000;
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const CRAFT_TIME_FACTOR = 20; // 20;

  const building1: Building = {
    price: [
      ethers.utils.parseEther("15000"),
      ethers.utils.parseEther("7000"),
      ethers.utils.parseEther("6000"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [100, 100, 100],
    health: 1000,
    craftTime: 216 * CRAFT_TIME_FACTOR,
    name: "Space Station",
  };

  const building2: Building = {
    price: [
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("500"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [20, 20, 20],
    health: 100,
    craftTime: 108 * CRAFT_TIME_FACTOR,
    name: "Tower",
  };

  const building3: Building = {
    price: [
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("500"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [10, 300, 10],
    health: 100,
    craftTime: 108 * CRAFT_TIME_FACTOR,
    name: "Missile Silo",
  };

  const building4: Building = {
    price: [
      ethers.utils.parseEther("4000"),
      ethers.utils.parseEther("4000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [50, 50, 50],
    health: 200,
    craftTime: 108 * CRAFT_TIME_FACTOR,
    name: "Defense Turret",
  };

  const building5: Building = {
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("2000"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [150, 150, 0],
    health: 100,
    craftTime: 108 * CRAFT_TIME_FACTOR,
    name: "anti-material turret",
  };

  const building6: Building = {
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("4000"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [10, 10, 300],
    health: 100,
    craftTime: 108 * CRAFT_TIME_FACTOR,
    name: "Ion Cannon",
  };

  const building7: Building = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [1000, 0, 0],

    defenseTypes: [0, 0, 0],
    health: 50,
    craftTime: 72 * CRAFT_TIME_FACTOR,
    name: "Metal Refinery",
  };

  const building8: Building = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [0, 1000, 0],

    defenseTypes: [0, 0, 0],
    health: 50,
    craftTime: 72 * CRAFT_TIME_FACTOR,
    name: "Crystal Mine",
  };

  const building9: Building = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [0, 0, 1000],

    defenseTypes: [0, 0, 0],
    health: 50,
    craftTime: 72 * CRAFT_TIME_FACTOR,
    name: "Antimatter Collector",
  };

  const building10: Building = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [0, 0, 0],

    defenseTypes: [0, 0, 0],
    health: 10,
    craftTime: 36 * CRAFT_TIME_FACTOR,
    name: "Shipyard",
  };

  const buildingsToAdd = [
    { id: 1, building: building1 },
    { id: 2, building: building2 },
    { id: 3, building: building3 },
    { id: 4, building: building4 },
    { id: 5, building: building5 },
    { id: 6, building: building6 },
    { id: 7, building: building7 },
    { id: 8, building: building8 },
    { id: 9, building: building9 },
    { id: 10, building: building10 },
  ];

  for (const { id, building } of buildingsToAdd) {
    const addBuildingTx = await adminFacet.addBuildingType(
      id,
      building
    );
  }
}

if (require.main === module) {
  addBuildings("0x07A37B8E1368368A3bC77cE97cDCe33a0010FD0c")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

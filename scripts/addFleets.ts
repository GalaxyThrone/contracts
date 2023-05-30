import { ethers } from "hardhat";
import { AdminFacet, Ships } from "../typechain-types";
import { ship } from "../types";

export async function addFleets(fleetsAddress: string) {
  // const gasPrice = 35000000000;
  let fleetsContract = (await ethers.getContractAt(
    "Ships",
    fleetsAddress
  )) as Ships;

  const fleet1: ship = {
    shipType: 1,
    price: [
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("50"),
      ethers.utils.parseEther("0"),
    ],
    attack: 30,
    attackTypes: [100, 10, 10],
    defenseTypes: [100, 10, 10],
    health: 20,
    cargo: 30,
    craftTime: 18,
    craftedFrom: 10,
    name: "Fighter",
    moduleSlots: 1,
  };

  const fleet2: ship = {
    shipType: 2,
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("400"),
      ethers.utils.parseEther("0"),
    ],
    attack: 200,
    attackTypes: [100, 10, 10],
    defenseTypes: [100, 10, 10],
    health: 500,
    cargo: 30,
    craftTime: 72,
    craftedFrom: 10,
    name: "Frigate",
    moduleSlots: 1,
  };

  const fleet3: ship = {
    shipType: 3,
    price: [
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("0"),
    ],
    attack: 400,
    attackTypes: [200, 10, 10],
    defenseTypes: [100, 10, 10],
    health: 600,
    cargo: 30,
    craftTime: 144,
    craftedFrom: 10,
    name: "Cruiser",
    moduleSlots: 1,
  };

  const fleet4: ship = {
    shipType: 4,
    price: [
      ethers.utils.parseEther("600"),
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("0"),
    ],
    attack: 60,
    attackTypes: [300, 50, 50],
    defenseTypes: [20, 5, 5],
    health: 100,
    cargo: 30,
    craftTime: 36,
    craftedFrom: 10,
    name: "Raider",
    moduleSlots: 1,
  };

  const fleet5: ship = {
    shipType: 5,
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1500"),
      ethers.utils.parseEther("800"),
      ethers.utils.parseEther("0"),
    ],
    attack: 300,
    attackTypes: [100, 100, 100],
    defenseTypes: [300, 300, 300],
    health: 300,
    cargo: 30,
    craftTime: 72,
    craftedFrom: 10,
    name: "Warship",
    moduleSlots: 1,
  };
  const fleet6: ship = {
    shipType: 6,
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("1500"),
      ethers.utils.parseEther("1500"),
      ethers.utils.parseEther("0"),
    ],
    attack: 600,
    attackTypes: [600, 400, 200],
    defenseTypes: [5, 5, 5],
    health: 150,
    cargo: 50,
    craftTime: 72,
    craftedFrom: 10,
    name: "Bomber",
    moduleSlots: 1,
  };

  const fleet7: ship = {
    shipType: 7,
    price: [
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("0"),
    ],
    attack: 0,
    attackTypes: [100, 10, 10],
    defenseTypes: [100, 10, 10],
    health: 100,
    cargo: 10000,
    craftTime: 18,
    craftedFrom: 10,
    name: "Miner Ship",
    moduleSlots: 1,
  };

  const fleet8: ship = {
    shipType: 8,
    price: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
      ethers.utils.parseEther("0"),
    ],
    attack: 0,
    attackTypes: [30, 10, 10],
    defenseTypes: [150, 10, 10],
    health: 30,
    cargo: 300,
    craftTime: 9,
    craftedFrom: 10,
    name: "Courier",
    moduleSlots: 1,
  };

  const fleet9: ship = {
    shipType: 9,
    price: [
      ethers.utils.parseEther("8000"),
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("0"),
    ],
    attack: 50,
    attackTypes: [10, 10, 10],
    defenseTypes: [20, 10, 10],
    health: 500,
    cargo: 30,
    craftTime: 180,
    craftedFrom: 10,
    name: "Terraformer",
    moduleSlots: 1,
  };

  const fleet10: ship = {
    shipType: 10,
    price: [
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("8000"),
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("1000"),
    ],
    attack: 1000,
    attackTypes: [1000, 1000, 1000],
    defenseTypes: [1000, 1000, 1000],
    health: 30,
    cargo: 500,
    craftTime: 9,
    craftedFrom: 10,
    name: "Capital-Class Destroyer",
    moduleSlots: 1,
  };

  const fleetData = [
    { id: 1, fleet: fleet1 },
    { id: 2, fleet: fleet2 },
    { id: 3, fleet: fleet3 },
    { id: 4, fleet: fleet4 },
    { id: 5, fleet: fleet5 },
    { id: 6, fleet: fleet6 },
    { id: 7, fleet: fleet7 },
    { id: 8, fleet: fleet8 },
    { id: 9, fleet: fleet9 },
    { id: 10, fleet: fleet10 },
  ];

  for (const { id, fleet } of fleetData) {
    const addFleetTx = await fleetsContract.addShipType(id, fleet);
    await addFleetTx.wait();
  }
}

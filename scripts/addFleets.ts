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
    craftedFrom: 7,
    name: "Fighter",
    moduleSlots: 1,
  };

  const fleet1Lvl = {
    shipTypeId:1,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet2Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet3Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }


  const fleet4Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet5Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet6Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet7Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet8Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet9Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet10Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

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
    health: 300,
    cargo: 30,
    craftTime: 72,
    craftedFrom: 7,
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
    craftedFrom: 7,
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
    attack: 80,
    attackTypes: [300, 50, 50],
    defenseTypes: [20, 5, 5],
    health: 100,
    cargo: 30,
    craftTime: 36,
    craftedFrom: 7,
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
    craftedFrom: 7,
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
    health: 100,
    cargo: 50,
    craftTime: 72,
    craftedFrom: 7,
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
    attack: 10,
    attackTypes: [100, 10, 10],
    defenseTypes: [100, 10, 10],
    health: 100,
    cargo: 10000,
    craftTime: 18,
    craftedFrom: 7,
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
    craftedFrom: 7,
    name: "Courier",
    moduleSlots: 1,
  };

  const fleet9: ship = {
    shipType: 9,
    price: [
      ethers.utils.parseEther("20000"),
      ethers.utils.parseEther("13000"),
      ethers.utils.parseEther("11000"),
      ethers.utils.parseEther("0"),
    ],
    attack: 100,
    attackTypes: [10, 10, 10],
    defenseTypes: [20, 10, 10],
    health: 500,
    cargo: 30,
    craftTime: 180,
    craftedFrom: 7,
    name: "Terraformer",
    moduleSlots: 1,
  };

  const fleet10: ship = {
    shipType: 10,
    price: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
      ethers.utils.parseEther("1000"),
    ],
    attack: 0,
    attackTypes: [50000, 50000, 50000],
    defenseTypes: [30000, 30000, 30000],
    health: 30,
    cargo: 500,
    craftTime: 9,
    craftedFrom: 7,
    name: "Capital-Class Destroyer",
    moduleSlots: 1,
  };

  const addFleet1Tx = await fleetsContract.addShipType(1, fleet1);
  await addFleet1Tx.wait();

  const addFleet2Tx = await fleetsContract.addShipType(2, fleet2);
  await addFleet2Tx.wait();

  const addFleet3Tx = await fleetsContract.addShipType(3, fleet3);
  await addFleet3Tx.wait();

  const addFleet4Tx = await fleetsContract.addShipType(4, fleet4);
  await addFleet4Tx.wait();

  const addFleet5Tx = await fleetsContract.addShipType(5, fleet5);
  await addFleet5Tx.wait();

  const addFleet6Tx = await fleetsContract.addShipType(6, fleet6);
  await addFleet6Tx.wait();

  const addFleet7Tx = await fleetsContract.addShipType(7, fleet7);
  await addFleet7Tx.wait();

  const addFleet8Tx = await fleetsContract.addShipType(8, fleet8);
  await addFleet8Tx.wait();

  const addFleet9Tx = await fleetsContract.addShipType(9, fleet9);
  await addFleet9Tx.wait();

  const addFleet10Tx = await fleetsContract.addShipType(10, fleet10);
  await addFleet10Tx.wait();


}

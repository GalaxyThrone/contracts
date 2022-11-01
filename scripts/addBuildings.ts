import { ethers } from "hardhat";
import { Buildings } from "../typechain-types";
import { Building } from "../types";

export async function addBuildings(buildingsAddress: string) {
  // const gasPrice = 35000000000;
  let buildingsContract = (await ethers.getContractAt(
    "Buildings",
    buildingsAddress
  )) as Buildings;

  const building1: Building = {
    price: [
      ethers.utils.parseEther("15000"),
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("7000"),
    ],
    boosts: [0, 0, 0],
    attack: 300,
    health: 600,
    craftTime: 108,
    name: "Space Station",
  };

  const building2: Building = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
    ],
    boosts: [0, 0, 0],
    attack: 100,
    health: 100,
    craftTime: 72,
    name: "Tower",
  };

  const building3: Building = {
    price: [
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("200"),
    ],
    boosts: [0, 0, 0],
    attack: 50,
    health: 30,
    craftTime: 18,
    name: "Cannon",
  };

  const building4: Building = {
    price: [
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("0"),
    ],
    boosts: [0, 0, 200],
    attack: 0,
    health: 0,
    craftTime: 36,
    name: "Ethereus Miner",
  };

  const building5: Building = {
    price: [
      ethers.utils.parseEther("0"),
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
    ],
    boosts: [300, 0, 0],
    attack: 0,
    health: 0,
    craftTime: 36,
    name: "Metal Miner",
  };

  const building6: Building = {
    price: [
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("0"),
      ethers.utils.parseEther("200"),
    ],
    boosts: [0, 250, 0],
    attack: 0,
    health: 0,
    craftTime: 36,
    name: "Crystal Miner",
  };

  const building7: Building = {
    price: [
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("800"),
      ethers.utils.parseEther("700"),
    ],
    boosts: [0, 0, 0],
    attack: 0,
    health: 0,
    craftTime: 72,
    name: "Shipyard",
  };

  const addBuilding1Tx = await buildingsContract.addBuilding(1, building1);
  await addBuilding1Tx.wait();

  const addBuilding2Tx = await buildingsContract.addBuilding(2, building2);
  await addBuilding2Tx.wait();

  const addBuilding3Tx = await buildingsContract.addBuilding(3, building3);
  await addBuilding3Tx.wait();

  const addBuilding4Tx = await buildingsContract.addBuilding(4, building4);
  await addBuilding4Tx.wait();

  const addBuilding5Tx = await buildingsContract.addBuilding(5, building5);
  await addBuilding5Tx.wait();

  const addBuilding6Tx = await buildingsContract.addBuilding(6, building6);
  await addBuilding6Tx.wait();

  const addBuilding7Tx = await buildingsContract.addBuilding(7, building7);
  await addBuilding7Tx.wait();
}

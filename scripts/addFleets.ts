import { ethers } from "hardhat";
import { Fleets } from "../typechain-types";
import { Fleet } from "../types";

export async function addFleets(fleetsAddress: string) {
  // const gasPrice = 35000000000;
  let fleetsContract = (await ethers.getContractAt(
    "Fleets",
    fleetsAddress
  )) as Fleets;

  const fleet1: Fleet = {
    price: [
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("50"),
    ],
    attack: 30,
    health: 20,
    cargo: 0,
    craftTime: 18,
    craftedFrom: 7,
    name: "Fighter",
  };

  const fleet2: Fleet = {
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("400"),
    ],
    attack: 200,
    health: 300,
    cargo: 0,
    craftTime: 72,
    craftedFrom: 7,
    name: "Frigate",
  };

  const fleet3: Fleet = {
    price: [
      ethers.utils.parseEther("5000"),
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1000"),
    ],
    attack: 400,
    health: 600,
    cargo: 0,
    craftTime: 144,
    craftedFrom: 7,
    name: "Cruiser",
  };

  const fleet4: Fleet = {
    price: [
      ethers.utils.parseEther("600"),
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("150"),
    ],
    attack: 80,
    health: 100,
    cargo: 0,
    craftTime: 36,
    craftedFrom: 7,
    name: "Raider",
  };

  const fleet5: Fleet = {
    price: [
      ethers.utils.parseEther("3000"),
      ethers.utils.parseEther("1500"),
      ethers.utils.parseEther("800"),
    ],
    attack: 300,
    health: 300,
    cargo: 0,
    craftTime: 72,
    craftedFrom: 7,
    name: "Warship",
  };

  const fleet6: Fleet = {
    price: [
      ethers.utils.parseEther("2000"),
      ethers.utils.parseEther("1500"),
      ethers.utils.parseEther("1500"),
    ],
    attack: 400,
    health: 200,
    cargo: 0,
    craftTime: 72,
    craftedFrom: 7,
    name: "Bomber",
  };

  const fleet7: Fleet = {
    price: [
      ethers.utils.parseEther("500"),
      ethers.utils.parseEther("300"),
      ethers.utils.parseEther("200"),
    ],
    attack: 10,
    health: 100,
    cargo: 1000,
    craftTime: 18,
    craftedFrom: 7,
    name: "Cargo Ship",
  };

  const fleet8: Fleet = {
    price: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
    ],
    attack: 0,
    health: 30,
    cargo: 200,
    craftTime: 9,
    craftedFrom: 7,
    name: "Courier",
  };

  const fleet9: Fleet = {
    price: [
      ethers.utils.parseEther("20000"),
      ethers.utils.parseEther("13000"),
      ethers.utils.parseEther("11000"),
    ],
    attack: 100,
    health: 500,
    cargo: 0,
    craftTime: 180,
    craftedFrom: 7,
    name: "Terraformer",
  };

  const addFleet1Tx = await fleetsContract.addFleet(1, fleet1);
  await addFleet1Tx.wait();

  const addFleet2Tx = await fleetsContract.addFleet(2, fleet2);
  await addFleet2Tx.wait();

  const addFleet3Tx = await fleetsContract.addFleet(3, fleet3);
  await addFleet3Tx.wait();

  const addFleet4Tx = await fleetsContract.addFleet(4, fleet4);
  await addFleet4Tx.wait();

  const addFleet5Tx = await fleetsContract.addFleet(5, fleet5);
  await addFleet5Tx.wait();

  const addFleet6Tx = await fleetsContract.addFleet(6, fleet6);
  await addFleet6Tx.wait();

  const addFleet7Tx = await fleetsContract.addFleet(7, fleet7);
  await addFleet7Tx.wait();

  const addFleet8Tx = await fleetsContract.addFleet(8, fleet8);
  await addFleet8Tx.wait();

  const addFleet9Tx = await fleetsContract.addFleet(9, fleet9);
  await addFleet9Tx.wait();
}

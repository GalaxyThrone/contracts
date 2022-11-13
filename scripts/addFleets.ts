import { ethers } from "hardhat";
import { Ships } from "../typechain-types";
import { Fleet } from "../types";

export async function addFleets(fleetsAddress: string) {
  // const gasPrice = 35000000000;
  let fleetsContract = (await ethers.getContractAt(
    "Ships",
    fleetsAddress
  )) as Ships;

  const fleet1: Ships = {
    shipType: 0,
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
    moduleSlots: 1,
    //@TODO right syntax?
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet2: Ships = {
    shipType: 1,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet3: Ships = {
    shipType: 2,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet4: Ships = {
    shipType: 3,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet5: Ships = {
    shipType: 4,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet6: Ships = {
    shipType: 5,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet7: Ships = {
    shipType: 6,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet8: Ships = {
    shipType: 7,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
  };

  const fleet9: Ships = {
    shipType: 8,
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
    moduleSlots: 1,
    equippedShipModule: {attackBoostStat: 0, healthBoostStat: 0},
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

import { ethers } from "hardhat";
import {
  BuildingsFacet,
  Ships,
  ShipsFacet,
} from "../typechain-types";
import {
  AdminFacet,
  ShipModuleStruct,
} from "../typechain-types/contracts/facets/AdminFacet";
import { ship } from "../types";

export async function addShipModules(diamondAddr: string) {
  // const gasPrice = 35000000000;
  let fleetsContract = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  const module1: ShipModuleStruct = {
    name: "MK IV Reactive Antimatter Mesh",
    attackBoostStat: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
    ],
    defenseBoostStat: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
    ],
    healthBoostStat: 10,
    price: [
      ethers.utils.parseEther("200"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("50"),
    ],
  };
  let currMod = 0;

  for (let i = 0; i < 1; i++) {
    const addShipTypeModuleTx1 =
      await fleetsContract.addShipModuleType(currMod, module1);
    currMod++;
  }
}



//@TODO add  deploy script to initialize leveling params for every shipType


//@TODO can this go to its own file? 
export async function addFaction(
  diamondAddr: string,
  amountFactions: number
) {
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;

  await adminFacet.addFaction(amountFactions);
}

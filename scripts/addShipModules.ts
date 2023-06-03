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

  const modules: ShipModuleStruct[] = [
    {
      name: "MK IV Reactive Antimatter Mesh",
      attackBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("10"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("3000"),
      ],
    },
    {
      name: "Reinforced Nanocarbon ceramic plating",
      attackBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("300"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("0"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("3500"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("200"),
      ],
    },
    {
      name: "Holtzman EM-Repulse Shield ",
      attackBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("300"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("4000"),
      ],
    },
    {
      name: "0k Railgun",
      attackBoostStat: [
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("50"),
        ethers.utils.parseEther("10"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("4000"),
      ],
    },
    {
      name: "Hercules-Class Missile Platform",
      attackBoostStat: [
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("200"),
        ethers.utils.parseEther("10"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("6000"),
        ethers.utils.parseEther("100"),
      ],
    },
    {
      name: "Faraday Polarization Scrambler",
      attackBoostStat: [
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("200"),
      ],
      defenseBoostStat: [
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
        ethers.utils.parseEther("0"),
      ],
      healthBoostStat: 10,
      price: [
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("100"),
        ethers.utils.parseEther("5000"),
      ],
    },
  ];

  for (let i = 0; i < modules.length; i++) {
    await fleetsContract.addShipModuleType(i, modules[i]);
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

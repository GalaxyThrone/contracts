import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import {
  AdminFacet,
  Buildings,
  Planets,
  Fleets,
  GameFacet,
  BuildingsFacet,
} from "../typechain-types";
import { BigNumber } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import { upgrade } from "../scripts/upgradeDiamond";
// import { upgradeContract } from "../scripts/upgradeContract";

let g: any;
let gameFacet: GameFacet;
let buildingsFacet: BuildingsFacet;

describe("Game", function () {
  before(async function () {
    this.timeout(20000000);
    // g = await deployDiamond();

    await upgrade();
    // await upgradeContract("0xA7902D5fd78e896A1071453D2e24DA41a7fA0004");

    const diamond = "0xe296a5cf8c15d2a4192670fd12132fc7a2d5f426";

    // vrfFacet = (await ethers.getContractAt("VRFFacet", diamond)) as VRFFacet;
    gameFacet = (await ethers.getContractAt("GameFacet", diamond)) as GameFacet;
    buildingsFacet = (await ethers.getContractAt(
      "BuildingsFacet",
      diamond
    )) as BuildingsFacet;
    // actionsFacet = (await ethers.getContractAt(
    //   "ActionsFacet",
    //   diamond
    // )) as ActionsFacet;
    // landsContract = (await ethers.getContractAt(
    //   "MagiaLands",
    //   "0x43D900698f716179794553B5BCaacb0e37080828"
    // )) as MagiaLands;
  });
  it("debug", async function () {
    buildingsFacet = await impersonate(
      "0xf2381dD8B282669C139C2d227bAb5314B5E9EBC7",
      buildingsFacet,
      ethers,
      network
    );

    await buildingsFacet.mineMetal(16);
  });
});

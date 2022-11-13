import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import {
  AdminFacet,
  Buildings,
  Planets,
  BuildingsFacet,
  RegisterFacet,
} from "../typechain-types";
import { BigNumber } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import {
  upgrade,
  upgradeTestVersion,
} from "../scripts/upgradeDiamond";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
// import { upgradeContract } from "../scripts/upgradeContract";

describe("Game", function () {
  let g: any;

  let vrfFacet: RegisterFacet;
  let buildingsFacet: BuildingsFacet;

  let planetNfts: Planets;

  async function deployUsers() {
    const [
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    ] = await ethers.getSigners();

    return {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    };
  }

  before(async function () {
    // this.timeout(20000000);
    g = await deployDiamond();

    const diamond = g.diamondAddress; //"0xe296a5cf8c15d2a4192670fd12132fc7a2d5f426";
    //await upgrade();

    //@why the fuck is this empty
    console.log(
      "-------------------------------------------------------------------"
    );
    console.log(g);
    console.log(
      "-------------------------------------------------------------------"
    );

    await upgradeTestVersion(diamond);
    // await upgradeContract("0xA7902D5fd78e896A1071453D2e24DA41a7fA0004");

    vrfFacet = (await ethers.getContractAt(
      "RegisterFacet",
      diamond
    )) as RegisterFacet;

    planetNfts = (await ethers.getContractAt(
      "Planets",
      g.planetsAddress
    )) as Planets;

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
  it("register user and get planet NFT ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //@actual register function for Tron Network
    const registration = await vrfFacet
      .connect(randomUser)
      .testRegister();

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    console.log(checkOwnershipAmountPlayer);
    //@TODO check if owner holds a planet NFT
  });

  it.skip("debug", async function () {
    buildingsFacet = await impersonate(
      "0xf2381dD8B282669C139C2d227bAb5314B5E9EBC7",
      buildingsFacet,
      ethers,
      network
    );

    await buildingsFacet.mineMetal(16);
  });
});

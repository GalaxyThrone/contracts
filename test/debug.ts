import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import { AdminFacet } from "../typechain-types";
import { BigNumber } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import { upgrade } from "../scripts/upgradeDiamond";
import { upgradeContract } from "../scripts/upgradeContract";

let g: any;
let adminFacet: AdminFacet;

describe.skip("Debug", function () {
  before(async function () {
    this.timeout(20000000);

    // g = await deployDiamond();

    // await upgrade();
    // await upgradeContract("0xA7902D5fd78e896A1071453D2e24DA41a7fA0004");

    const diamond = "0xB701E11C49802D07FA200A8b61b18CfF8b574a66";

    adminFacet = (await ethers.getContractAt(
      "AdminFacet",
      diamond
    )) as AdminFacet;
  });
  it("debug", async function () {
    await adminFacet.startInit(50, 0);
  });
});

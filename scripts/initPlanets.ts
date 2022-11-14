import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function initPlanets(diamondAddress: string) {
  // const gasPrice = 35000000000;
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  console.log("init planets");
  const initPlanets = await adminFacet.initPlanets(20);
  await initPlanets.wait();
}

if (require.main === module) {
  initPlanets("0x273640B69Dc1E94d1E2B8dE715bc127D39dD225f")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

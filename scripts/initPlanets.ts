import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function initPlanets(diamondAddress: string) {
  // const gasPrice = 35000000000;
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  // console.log("FIXING");
  // const fixTx = await adminFacet.removeFix();
  // await fixTx.wait();

  console.log("init planets");
  const initPlanets = await adminFacet.startInit();
  await initPlanets.wait();
}

if (require.main === module) {
  initPlanets("0xB701E11C49802D07FA200A8b61b18CfF8b574a66")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

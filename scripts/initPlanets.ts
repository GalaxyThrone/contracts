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
  const initPlanets = await adminFacet.startInit(50);
  await initPlanets.wait();
}

if (require.main === module) {
  initPlanets("0x0aF02Ef3B10B3BcF518eD44964A253072147Afe6")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

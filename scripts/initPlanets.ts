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
  initPlanets("0xdB6FE0a407559B39A9FCEf60A08af19ccDfE62a6")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

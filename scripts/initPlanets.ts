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
  const initPlanets = await adminFacet.startInit(30, 1);
  await initPlanets.wait();
}

if (require.main === module) {
  initPlanets("0x4bAc227E8377D3f0755569C2638Fe85A068A544c")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

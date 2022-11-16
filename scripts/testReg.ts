import { ethers } from "hardhat";
import { RegisterFacet } from "../typechain-types";

export async function testReg(diamondAddress: string) {
  // const gasPrice = 35000000000;
  let registerFacet = (await ethers.getContractAt(
    "RegisterFacet",
    diamondAddress
  )) as RegisterFacet;

  console.log("reg");
  const initPlanets = await registerFacet.startRegister();
  await initPlanets.wait();
}

if (require.main === module) {
  testReg("0xB701E11C49802D07FA200A8b61b18CfF8b574a66")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

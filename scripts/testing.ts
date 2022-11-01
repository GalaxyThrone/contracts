import { ethers } from "hardhat";
import { GameFacet } from "../typechain-types";

export async function initPlanets(diamondAddress: string) {
  // const gasPrice = 35000000000;
  let gameFacet = (await ethers.getContractAt(
    "GameFacet",
    diamondAddress
  )) as GameFacet;

  const g = await gameFacet.getRegistered(
    "0x296903b6049161bebEc75F6f391a930bdDBDbbFc"
  );
  console.log(g);
  const tx = await gameFacet.register();
  await tx.wait();
  const post = await gameFacet.getRegistered(
    "0x296903b6049161bebEc75F6f391a930bdDBDbbFc"
  );
  console.log(post);
}

if (require.main === module) {
  initPlanets("0xe296a5cf8c15D2A4192670fD12132Fc7a2D5F426")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

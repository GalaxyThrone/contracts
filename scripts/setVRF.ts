import { ethers } from "hardhat";
import { VRFFacet, AdminFacet } from "../typechain-types";

export async function setVRF(diamondAddress: string) {
  let vrfFacet = (await ethers.getContractAt(
    "VRFFacet",
    diamondAddress
  )) as VRFFacet;
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  // console.log("set vrf addresses");
  // const setVrfAddressesTx = await vrfFacet.setVRFAddresses(
  //   "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed", // mumbai coordinator
  //   "0x326C977E6efc84E512bB9C30f76E30c160eD06FB" // mumbai link
  // );
  // await setVrfAddressesTx.wait();

  // console.log("subscribe");
  // const subTx = await vrfFacet.subscribe();
  // await subTx.wait();

  // console.log("topup");
  // const topTx = await vrfFacet.topUpSubscription(
  //   ethers.utils.parseUnits("0.1"),
  //   {}
  // );
  // await topTx.wait();

  console.log("Setting vrf");
  const requestConfig = {
    subId: 2610,
    callbackGasLimit: 2500000,
    requestConfirmations: 3,
    numWords: 1,
    keyHash:
      "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
  };
  let tx = await vrfFacet.setConfig(requestConfig, {});
  await tx.wait();
}

if (require.main === module) {
  setVRF("0xB701E11C49802D07FA200A8b61b18CfF8b574a66")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

import { ethers } from "hardhat";
import { AdminFacet } from "../typechain-types";

export async function setAddresses(diamondAddress: string) {
  // const gasPrice = 35000000000;
  let adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddress
  )) as AdminFacet;

  console.log("set addresses");
  const setAddresses = await adminFacet.setAddresses(
    "0x15E4e32F8a2C3A081850cF6e3b2d1dF88BdB14e6",
    "0xB682571cd7970f257D37Af461c7Df859eB2Be4Ae",
    "0x143785f58e3D63938ff0A47E33E405cd818df030",
    "0x60B517235a0a495a1Ad527B8e946C71aafB80AB7",
    "0x6dee25741B4F6aDE7C6C17772cF58f0262d9B7Bf",
    "0xB2e4bC9F7e8626ab95Cb2a8a00ae3CdCb747C2B4",
    "0x420698c552B575ca34F0593915C3A25f77d45b1e"
  );
  await setAddresses.wait();
}

if (require.main === module) {
  setAddresses("0x4bAc227E8377D3f0755569C2638Fe85A068A544c")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

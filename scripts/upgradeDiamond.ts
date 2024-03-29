import { run, ethers } from "hardhat";
import {
  convertFacetAndSelectorsToString,
  DeployUpgradeTaskArgs,
  FacetsAndAddSelectors,
} from "../tasks/deployUpgrade";

export async function upgrade() {
  const diamondUpgrader =
    "0x9Fdd6069b4DBb60cE882066dF7E11F0f12B7aFC7";
  const diamondAddress = "0xb07030a61e4d257d9dd72C3872Bb959449592e4A";

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "ManagementFacet",
      addSelectors: [],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: diamondUpgrader,
    diamondAddress: diamondAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
    initAddress: ethers.constants.AddressZero,
    initCalldata: "0x",
  };

  await run("deployUpgrade", args);
}
export async function upgradeTestVersion(diamondAddr: any) {
  const diamondUpgrader =
    "0x9Fdd6069b4DBb60cE882066dF7E11F0f12B7aFC7";
  const diamondAddress = diamondAddr;

  const facets: FacetsAndAddSelectors[] = [
    {
      facetName: "ManagementFacet",
      addSelectors: [],
      removeSelectors: [],
    },
  ];

  const joined = convertFacetAndSelectorsToString(facets);

  const args: DeployUpgradeTaskArgs = {
    diamondUpgrader: diamondUpgrader,
    diamondAddress: diamondAddress,
    facetsAndAddSelectors: joined,
    useLedger: false,
    useMultisig: false,
    initAddress: ethers.constants.AddressZero,
    initCalldata: "0x",
  };

  await run("deployUpgrade", args);
}

if (require.main === module) {
  upgrade()
    .then(() => process.exit(0))
    // .then(() => console.log('upgrade completed') /* process.exit(0) */)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

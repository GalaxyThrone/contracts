import { ethers, upgrades } from "hardhat";

export async function upgradeContract(contractAddress: string) {
  console.log("start upgrade");

  // Upgrading
  const Contract = await ethers.getContractFactory("Planets");
  const upgraded = await upgrades.upgradeProxy(contractAddress, Contract);
  console.log("complete upgrade");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  upgradeContract("0xA27374ed9934e00F5E0faCF4Ac2eCc3eDcF45c5F")
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

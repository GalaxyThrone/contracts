import { ethers } from "hardhat";
import { Buildings, Planets, Fleets } from "../typechain-types";

export async function setURI() {
  // const gasPrice = 35000000000;
  let buildings = (await ethers.getContractAt(
    "Buildings",
    "0x0e331F60DF4115db6b94a18e3781Ad88e9aaa503"
  )) as Buildings;

  let planets = (await ethers.getContractAt(
    "Planets",
    "0x32C917F7Ddbc9fe384dF74D3381bc9992c889Ba4"
  )) as Planets;

  let fleets = (await ethers.getContractAt(
    "Fleets",
    "0xab65A36cEaE00508D875079D7732f6460E856fD9"
  )) as Fleets;

  console.log("set uri buildings");
  console.log("set uri planets");
  await planets.setUri("");
  console.log("set uri fleets");
}

if (require.main === module) {
  setURI()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

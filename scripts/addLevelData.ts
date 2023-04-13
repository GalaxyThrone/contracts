import { ethers } from "hardhat";
import { AdminFacet, Ships } from "../typechain-types";
import { ship } from "../types";

export async function addLevels(diamondAddr: string) {
  // const gasPrice = 35000000000;
  let fleetsContract = (await ethers.getContractAt(
    "AdminFacet",
    diamondAddr
  )) as AdminFacet;


  const fleet1Lvl = {
    shipTypeId:1,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet2Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet3Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }


  const fleet4Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet5Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet6Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet7Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet8Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet9Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }

  const fleet10Lvl = {
    shipTypeId:2,
    maxLevel:10,
    levelStats: [10,10,10,10,10,10,5],
    costsLeveling:[50,50,50],
  }





  for(let i =0; i<10; i++){


  //@TODO refactor to its own file
  const addLevel1Tx = await fleetsContract.addLevels(fleet1Lvl.shipTypeId, i, fleet1Lvl.levelStats,fleet1Lvl.costsLeveling,fleet1Lvl.maxLevel);

}
}

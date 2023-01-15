import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import {
  AdminFacet,
  Buildings,
  Planets,
  BuildingsFacet,
  RegisterFacet,
  Metal,
  Crystal,
  Ethereus,
  Ships,
  FleetsFacet,
  FightingFacet,
} from "../typechain-types";
import { BigNumber } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import {
  upgrade,
  upgradeTestVersion,
} from "../scripts/upgradeDiamond";
import { initPlanets } from "../scripts/initPlanets";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
// import { upgradeContract } from "../scripts/upgradeContract";

describe("Game", function () {
  let g: any;

  let vrfFacet: RegisterFacet;
  let adminFacet: AdminFacet;
  let buildingsFacet: BuildingsFacet;

  let fleetsFacet: FleetsFacet;

  let planetNfts: Planets;
  let metalToken: Metal;
  let crystalToken: Crystal;
  let ethereusToken: Ethereus;
  let buildingNfts: Buildings;
  let shipNfts: Ships;
  let fightingFacet: FightingFacet;

  async function deployUsers() {
    const [
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    ] = await ethers.getSigners();

    return {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    };
  }

  before(async function () {
    // this.timeout(20000000);
    g = await deployDiamond();

    const diamond = g.diamondAddress; //"0xe296a5cf8c15d2a4192670fd12132fc7a2d5f426";
    //await upgrade();

    // await upgradeTestVersion(diamond);
    // await upgradeContract("0xA7902D5fd78e896A1071453D2e24DA41a7fA0004");

    vrfFacet = (await ethers.getContractAt(
      "RegisterFacet",
      diamond
    )) as RegisterFacet;

    adminFacet = (await ethers.getContractAt(
      "AdminFacet",
      diamond
    )) as AdminFacet;

    planetNfts = (await ethers.getContractAt(
      "Planets",
      g.planetsAddress
    )) as Planets;

    buildingNfts = (await ethers.getContractAt(
      "Buildings",
      g.buildingsAddress
    )) as Buildings;

    shipNfts = (await ethers.getContractAt(
      "Ships",
      g.shipsAddress
    )) as Ships;

    metalToken = (await ethers.getContractAt(
      "Metal",
      g.metalAddress
    )) as Metal;

    crystalToken = (await ethers.getContractAt(
      "Crystal",
      g.metalAddress
    )) as Crystal;

    ethereusToken = (await ethers.getContractAt(
      "Ethereus",
      g.ethereusAddress
    )) as Ethereus;

    buildingsFacet = (await ethers.getContractAt(
      "BuildingsFacet",
      diamond
    )) as BuildingsFacet;

    fleetsFacet = (await ethers.getContractAt(
      "FleetsFacet",
      diamond
    )) as FleetsFacet;

    fightingFacet = (await ethers.getContractAt(
      "FightingFacet",
      diamond
    )) as FightingFacet;
  });
  it("Mint planets", async function () {
    await adminFacet.startInit(50);
  });
  it("register user and get planet NFT ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet
      .connect(randomUser)
      .startRegister();

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipAmountPlayer).to.equal(1);

    /*
    console.log(checkOwnershipAmountPlayer);

    console.log(checkOwnershipAmountPlayer);
    const expr = await planetNfts.planets(1);
    console.log("Planet1 Data:");
    console.log(expr);

    const expr2 = await planetNfts.planets(2);
    console.log("Planet2 Data:");
    console.log(expr2);

    */
  });

  it("registered user can mine metal every 24hours ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet
      .connect(randomUser)
      .startRegister();

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipAmountPlayer).to.equal(1);

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const beforeMining = await buildingsFacet.getPlanetResources(
      planetId,
      0
    );

    await buildingsFacet.connect(randomUser).mineMetal(planetId);

    const balanceAfterMining =
      await buildingsFacet.getPlanetResources(planetId, 0);

    expect(balanceAfterMining).to.be.above(beforeMining);

    //@TODO edge case double mine should revert if too early.
  });

  it("registered user can craft & claim buildings", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet
      .connect(randomUser)
      .startRegister();

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet
      .connect(randomUser)
      .craftBuilding(1, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 600]);

    let checkOwnershipBuildings = await buildingNfts.balanceOf(
      randomUser.address,
      1
    );

    expect(checkOwnershipBuildings).to.equal(0);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    checkOwnershipBuildings = await buildingNfts.balanceOf(
      randomUser.address,
      1
    );

    expect(checkOwnershipBuildings).to.equal(1);

    //@edge case to test, too early claim
    //@edge case to test, double claim
  });

  it("registered user can craft & claim ships ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet
      .connect(randomUser)
      .startRegister();

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet
      .connect(randomUser)
      .craftBuilding(7, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await fleetsFacet.connect(randomUser).craftFleet(1, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [
      timestampBefore + 1200 + 12000,
    ]);

    await fleetsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(1);
  });

  it("registered user attack other user and conquer his NFT ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);

    //create two opponents

    await vrfFacet.connect(randomUser).startRegister();
    await vrfFacet.connect(randomUserTwo).startRegister();

    const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
      randomUserTwo.address,
      0
    );

    await buildingsFacet
      .connect(randomUser)
      .craftBuilding(7, planetIdPlayer1, 1);

    let blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    let claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetIdPlayer1);

    await fleetsFacet
      .connect(randomUser)
      .craftFleet(6, planetIdPlayer1, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [
      timestampBefore + 1200 + 1200,
    ]);

    await fleetsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(1);

    //@notice player two
    await buildingsFacet
      .connect(randomUserTwo)
      .craftBuilding(7, planetIdPlayer2, 1);

    blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    claimBuild = await buildingsFacet
      .connect(randomUserTwo)
      .claimBuilding(planetIdPlayer2);

    await fleetsFacet
      .connect(randomUserTwo)
      .craftFleet(1, planetIdPlayer2, 1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUserTwo.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [
      timestampBefore + 1200 + 1200,
    ]);

    await fleetsFacet
      .connect(randomUserTwo)
      .claimFleet(planetIdPlayer2);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUserTwo.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(1);

    const player1Fleet = await shipNfts.getDefensePlanet(
      planetIdPlayer1
    );

    const player2Fleet = await shipNfts.getDefensePlanet(
      planetIdPlayer2
    );

    //@user1 attacks user2

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await fightingFacet
      .connect(randomUser)
      .sendAttack(planetIdPlayer1, planetIdPlayer2, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 48000]);

    // //@notice we get the instance Id from the event on the planet contract (attackInitated);
    const attackResolveReceipt = await fightingFacet
      .connect(randomUser)
      .resolveAttack(1);
    const result = attackResolveReceipt.wait();

    // console.log(await (await result).events);
    // const checkAtkship = await shipNfts.getShipStats(0);

    //@notice user2 defense ships should be burned

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUserTwo.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    //@planet should be owned by player 1 now
    const planetsOwnedPlayer1 = await planetNfts.balanceOf(
      randomUser.address
    );

    expect(planetsOwnedPlayer1).to.equal(2);
  });

  it("registered user attack other user and lose ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });

  it("registered user can send friendly ships to his owned planet ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });

  it("registered user can send friendly ships to his alliance member ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });

  it("registered user can create an alliance & invite members ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });

  it("registered user can join  an alliance when invited", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });

  it.skip("chainRunner can mine every 24hours for the user ", async function () {
    const {
      owner,
      randomUser,
      randomUserTwo,
      randomUserThree,
      AdminUser,
    } = await loadFixture(deployUsers);
  });
  it.skip("debug", async function () {
    buildingsFacet = await impersonate(
      "0xf2381dD8B282669C139C2d227bAb5314B5E9EBC7",
      buildingsFacet,
      ethers,
      network
    );

    await buildingsFacet.mineMetal(16);
  });
});

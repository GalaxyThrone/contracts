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
  Antimatter,
  Ships,
  ShipsFacet,
  FightingFacet,
  Aether,
  AllianceFacet,
} from "../typechain-types";
import { BigNumber } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import { upgrade, upgradeTestVersion } from "../scripts/upgradeDiamond";
import { initPlanets } from "../scripts/initPlanets";

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
// import { upgradeContract } from "../scripts/upgradeContract";

describe("Game", function () {
  let g: any;

  let vrfFacet: RegisterFacet;
  let adminFacet: AdminFacet;
  let buildingsFacet: BuildingsFacet;

  let shipsFacet: ShipsFacet;

  let planetNfts: Planets;
  let metalToken: Metal;
  let crystalToken: Crystal;
  let antimatterToken: Antimatter;

  let aetherToken: Aether;
  let buildingNfts: Buildings;
  let shipNfts: Ships;
  let fightingFacet: FightingFacet;
  let allianceFacet: AllianceFacet;

  async function deployUsers() {
    const [owner, randomUser, randomUserTwo, randomUserThree, AdminUser] =
      await ethers.getSigners();

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

    shipNfts = (await ethers.getContractAt("Ships", g.shipsAddress)) as Ships;

    metalToken = (await ethers.getContractAt("Metal", g.metalAddress)) as Metal;

    crystalToken = (await ethers.getContractAt(
      "Crystal",
      g.crystalAddress
    )) as Crystal;

    antimatterToken = (await ethers.getContractAt(
      "Antimatter",
      g.antimatterAddress
    )) as Antimatter;

    aetherToken = (await ethers.getContractAt(
      "Aether",
      g.aetherAddress
    )) as Aether;

    buildingsFacet = (await ethers.getContractAt(
      "BuildingsFacet",
      diamond
    )) as BuildingsFacet;

    shipsFacet = (await ethers.getContractAt(
      "ShipsFacet",
      diamond
    )) as ShipsFacet;

    fightingFacet = (await ethers.getContractAt(
      "FightingFacet",
      diamond
    )) as FightingFacet;

    allianceFacet = (await ethers.getContractAt(
      "AllianceFacet",
      diamond
    )) as AllianceFacet;

    await adminFacet.startInit(20, 1);
  });
  it("Mint planets", async function () {
    await adminFacet.startInit(1, 1);
  });
  it("register user and get planet NFT ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipAmountPlayer).to.equal(1);
  });

  it("registered user can mine metal every 24hours ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipAmountPlayer).to.equal(1);

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const beforeMining = await buildingsFacet.getPlanetResources(planetId, 0);

    await buildingsFacet.connect(randomUser).mineResources(planetId);

    const balanceAfterMining = await buildingsFacet.getPlanetResources(
      planetId,
      0
    );

    expect(balanceAfterMining).to.be.above(beforeMining);

    //@TODO edge case double mine should revert if too early.
  });

  it("registered user can craft & claim buildings", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(1, planetId, 1);

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
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);
  });

  it("registered user attack other user and conquer his NFT ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //create two opponents

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

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
      .craftBuilding(10, planetIdPlayer1, 1);

    let blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    let claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetIdPlayer1);

    await shipsFacet.connect(randomUser).craftFleet(6, planetIdPlayer1, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

    const test = await shipsFacet.getDefensePlanetDetailed(planetIdPlayer1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    //@notice player two
    await buildingsFacet
      .connect(randomUserTwo)
      .craftBuilding(10, planetIdPlayer2, 1);

    blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    claimBuild = await buildingsFacet
      .connect(randomUserTwo)
      .claimBuilding(planetIdPlayer2);

    await shipsFacet.connect(randomUserTwo).craftFleet(1, planetIdPlayer2, 1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUserTwo).claimFleet(planetIdPlayer2);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    const player1Fleet = await shipNfts.getDefensePlanet(planetIdPlayer1);

    const player2Fleet = await shipNfts.getDefensePlanet(planetIdPlayer2);

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

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(0);

    //@planet should be owned by player 1 now
    const planetsOwnedPlayer1 = await planetNfts.balanceOf(randomUser.address);

    expect(planetsOwnedPlayer1).to.equal(2);
  });

  it("registered user attacks other user and lose ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //create two opponents

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

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
      .craftBuilding(10, planetIdPlayer1, 1);

    let blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    let claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetIdPlayer1);

    await shipsFacet.connect(randomUser).craftFleet(6, planetIdPlayer1, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    //@notice player two
    await buildingsFacet
      .connect(randomUserTwo)
      .craftBuilding(10, planetIdPlayer2, 1);

    blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    claimBuild = await buildingsFacet
      .connect(randomUserTwo)
      .claimBuilding(planetIdPlayer2);

    await shipsFacet.connect(randomUserTwo).craftFleet(5, planetIdPlayer2, 10);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUserTwo).claimFleet(planetIdPlayer2);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(10);

    const player1Fleet = await shipNfts.getDefensePlanet(planetIdPlayer1);

    const player2Fleet = await shipNfts.getDefensePlanet(planetIdPlayer2);

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

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(0);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.be.above(1);

    //@planet should be owned by player 1 now
    const planetsOwnedPlayer1 = await planetNfts.balanceOf(randomUser.address);

    expect(planetsOwnedPlayer1).to.equal(1);
  });

  it("registered user can send friendly ships to his alliance member", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

    const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
      randomUserTwo.address,
      0
    );

    const allianceNameBytes32 = ethers.utils.formatBytes32String("bananarama");
    const createAlliance = await allianceFacet
      .connect(randomUser)
      .createAlliance(allianceNameBytes32);

    const allCreatedAlliances = await allianceFacet.returnAllAlliances();

    const invitePlayer = await allianceFacet
      .connect(randomUser)
      .inviteToAlliance(randomUserTwo.address);

    const acceptInvitation = await allianceFacet
      .connect(randomUserTwo)
      .joinAlliance(allianceNameBytes32);

    await buildingsFacet
      .connect(randomUser)
      .craftBuilding(10, planetIdPlayer1, 1);

    let blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    let claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetIdPlayer1);

    let shipAmountToCraft = 2;
    await shipsFacet
      .connect(randomUser)
      .craftFleet(6, planetIdPlayer1, shipAmountToCraft);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(shipAmountToCraft);

    const player1Fleet = await shipNfts.getDefensePlanet(planetIdPlayer1);

    const player2Fleet = await shipNfts.getDefensePlanet(planetIdPlayer2);

    const getShipsOnPlanetBefore = await shipsFacet.getDefensePlanetDetailedIds(
      planetIdPlayer2
    );

    let shipIdPlayer1Reinforcement = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      1
    );

    const sendReinforcementsToPlanet = await fightingFacet
      .connect(randomUser)
      .sendFriendlies(planetIdPlayer1, planetIdPlayer2, [
        shipIdPlayer1Reinforcement,
      ]);

    const getShipsOnPlanetAfter = await shipsFacet.getDefensePlanetDetailedIds(
      planetIdPlayer2
    );

    expect(getShipsOnPlanetAfter.length).to.be.above(
      getShipsOnPlanetBefore.length
    );
  });

  it("registered user can send friendly ships to his owned planet ", async function () {
    {
      const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
        await loadFixture(deployUsers);

      //create two opponents

      await vrfFacet.connect(randomUser).startRegister(0, 2);
      await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

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
        .craftBuilding(10, planetIdPlayer1, 1);

      let blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      let timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

      let claimBuild = await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetIdPlayer1);

      let shipAmountToCraft = 2;
      await shipsFacet
        .connect(randomUser)
        .craftFleet(6, planetIdPlayer1, shipAmountToCraft);

      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

      await shipsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

      expect(checkOwnershipShipsPlayer).to.equal(shipAmountToCraft);

      //@notice player two
      await buildingsFacet
        .connect(randomUserTwo)
        .craftBuilding(10, planetIdPlayer2, 1);

      blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

      claimBuild = await buildingsFacet
        .connect(randomUserTwo)
        .claimBuilding(planetIdPlayer2);

      await shipsFacet.connect(randomUserTwo).craftFleet(1, planetIdPlayer2, 1);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

      await shipsFacet.connect(randomUserTwo).claimFleet(planetIdPlayer2);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(1);

      const player1Fleet = await shipNfts.getDefensePlanet(planetIdPlayer1);

      const player2Fleet = await shipNfts.getDefensePlanet(planetIdPlayer2);

      //@user1 attacks user2

      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      let shipIdPlayer1Reinforcement = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        1
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

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

      expect(checkOwnershipShipsPlayer).to.equal(shipAmountToCraft);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      //@planet should be owned by player 1 now
      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(planetsOwnedPlayer1).to.equal(2);

      const getShipsOnPlanetBefore =
        await shipsFacet.getDefensePlanetDetailedIds(planetIdPlayer2);

      const sendReinforcementsToPlanet = await fightingFacet
        .connect(randomUser)
        .sendFriendlies(planetIdPlayer1, planetIdPlayer2, [
          shipIdPlayer1Reinforcement,
        ]);

      const getShipsOnPlanetAfter =
        await shipsFacet.getDefensePlanetDetailedIds(planetIdPlayer2);

      expect(getShipsOnPlanetAfter.length).to.be.above(
        getShipsOnPlanetBefore.length
      );
    }
  });

  it("registered user can create an alliance ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

    const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
      randomUserTwo.address,
      0
    );

    const createAlliance = await allianceFacet
      .connect(randomUser)
      .createAlliance(ethers.utils.formatBytes32String("bananarama"));

    const allCreatedAlliances = await allianceFacet.returnAllAlliances();

    expect(allCreatedAlliances[0]).to.be.equal(
      ethers.utils.formatBytes32String("bananarama")
    );
  });

  it("Alliance Creator can invite & Invitee can join an alliance when invited", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

    const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
      randomUserTwo.address,
      0
    );

    const allianceNameBytes32 = ethers.utils.formatBytes32String("bananarama");
    const createAlliance = await allianceFacet
      .connect(randomUser)
      .createAlliance(allianceNameBytes32);

    const allCreatedAlliances = await allianceFacet.returnAllAlliances();

    const invitePlayer = await allianceFacet
      .connect(randomUser)
      .inviteToAlliance(randomUserTwo.address);

    const CreatorsAlliance = await allianceFacet.getCurrentAlliancePlayer(
      randomUser.address
    );

    const acceptInvitation = await allianceFacet
      .connect(randomUserTwo)
      .joinAlliance(allianceNameBytes32);

    const MemberTwoAlliance = await allianceFacet.getCurrentAlliancePlayer(
      randomUserTwo.address
    );

    expect(MemberTwoAlliance).to.be.equal(CreatorsAlliance);
  });

  it("registered user can outmine asteroid belt and get aether", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const aetherBefore = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    const sendOutmining = await shipsFacet
      .connect(randomUser)
      .startOutMining(planetId, 215, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 36000]);

    const planetType = await shipsFacet.connect(randomUser).getPlanetType(215);

    const resolveOutmining = await shipsFacet
      .connect(randomUser)
      .resolveOutMining(1, 0);

    const aetherAfter = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    expect(aetherAfter).to.be.above(aetherBefore);
  });

  it("registered user can outmine unowned planet and not get aether", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const aetherBefore = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    const metalBefore = await buildingsFacet.getPlanetResources(planetId, 0);

    const sendOutmining = await shipsFacet
      .connect(randomUser)
      .startOutMining(planetId, 5, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 36000]);

    const planetAmount = await shipsFacet.connect(randomUser).getPlanetAmount();

    const resolveOutmining = await shipsFacet
      .connect(randomUser)
      .resolveOutMining(1, 0);

    const aetherAfter = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    const metalAfter = await buildingsFacet.getPlanetResources(planetId, 0);

    expect(aetherAfter).to.be.equal(aetherBefore);

    expect(metalAfter).to.be.above(metalBefore);
  });

  it("User can withdraw Aether to receive the ERC20-Tokens in their wallet", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const sendOutmining = await shipsFacet
      .connect(randomUser)
      .startOutMining(planetId, 215, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 36000]);

    const planetType = await shipsFacet.connect(randomUser).getPlanetType(1);

    const resolveOutmining = await shipsFacet
      .connect(randomUser)
      .resolveOutMining(1, 0);

    const aetherTokensWalletBefore = await aetherToken.balanceOf(
      randomUser.address
    );

    const withdrawAetherToWallet = await buildingsFacet
      .connect(randomUser)
      .withdrawAether(420);

    const aetherTokensWalletAfter = await aetherToken.balanceOf(
      randomUser.address
    );

    expect(aetherTokensWalletAfter).to.be.above(aetherTokensWalletBefore);
  });

  it("User can deposit Aether to receive the ERC20-Tokens in their wallet", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const sendOutmining = await shipsFacet
      .connect(randomUser)
      .startOutMining(planetId, 215, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 36000]);

    const planetType = await shipsFacet.connect(randomUser).getPlanetType(1);

    const resolveOutmining = await shipsFacet
      .connect(randomUser)
      .resolveOutMining(1, 0);

    const withdrawAetherToWallet = await buildingsFacet
      .connect(randomUser)
      .withdrawAether(420);

    //@notice deposit aether back in

    const AetherBalanceBefore = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    const amountToDeposit = 69;

    await aetherToken
      .connect(randomUser)
      .approve(g.diamondAddress, amountToDeposit);

    const depositAetherToWallet = await buildingsFacet
      .connect(randomUser)
      .depositAether(amountToDeposit);

    const AetherBalanceAfter = await buildingsFacet.getAetherPlayer(
      randomUser.address
    );

    expect(AetherBalanceAfter).to.be.above(AetherBalanceBefore);
  });

  it("User can equip shipModule on their ship", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const statsBeforeModule = await shipsFacet.getShipStatsDiamond(
      shipIdPlayer1
    );

    const equipShipModule = shipsFacet
      .connect(randomUser)
      .equipShipModule(0, shipIdPlayer1);

    const statsAfterModule = await shipsFacet.getShipStatsDiamond(
      shipIdPlayer1
    );

    expect(statsAfterModule.health).to.be.above(statsBeforeModule.health);
  });

  it("User can terraform uninhabited planet", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //@notice actual register function for Tron Network
    const registration = await vrfFacet.connect(randomUser).startRegister(0, 2);

    const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
      randomUser.address
    );

    const planetId = await planetNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    const claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetId);

    await shipsFacet.connect(randomUser).craftFleet(9, planetId, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 12000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    await shipsFacet.connect(randomUser).craftFleet(6, planetId, 2);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 24000]);

    await shipsFacet.connect(randomUser).claimFleet(planetId);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    console.log("checkOwnershipShipsPlayer", checkOwnershipShipsPlayer);

    let shipId1Player1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    let shipId2Player1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      1
    );

    let shipId3Player1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      2
    );

    const planetToTerraform = 14;
    await shipsFacet
      .connect(randomUser)
      .sendTerraform(planetId, planetToTerraform, [
        shipId1Player1,
        shipId2Player1,
        shipId3Player1,
      ]);

    await shipsFacet
      .connect(randomUser)
      .showIncomingTerraformersPlanet(planetToTerraform);

    const blockTwo = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    const blockTwoTime = blockTwo.timestamp;

    await ethers.provider.send("evm_mine", [blockTwoTime + 1200 + 220000]);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    await shipsFacet.connect(randomUser).endTerraform(0);

    const planetsOwnedPlayer1 = await planetNfts.balanceOf(randomUser.address);
    //player should have two planets now.
    expect(planetsOwnedPlayer1).to.equal(2);
  });

  it.skip("chainRunner can mine every 24hours for the user ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);
  });
  it.skip("debug", async function () {
    buildingsFacet = await impersonate(
      "0xf2381dD8B282669C139C2d227bAb5314B5E9EBC7",
      buildingsFacet,
      ethers,
      network
    );

    await buildingsFacet.mineResources(16);
  });

  it("check attack view functions ", async function () {
    const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
      await loadFixture(deployUsers);

    //create two opponents

    await vrfFacet.connect(randomUser).startRegister(0, 2);
    await vrfFacet.connect(randomUserTwo).startRegister(0, 2);

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
      .craftBuilding(10, planetIdPlayer1, 1);

    let blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    let timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    let claimBuild = await buildingsFacet
      .connect(randomUser)
      .claimBuilding(planetIdPlayer1);

    await shipsFacet.connect(randomUser).craftFleet(6, planetIdPlayer1, 1);

    let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
      randomUser.address
    );

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUser).claimFleet(planetIdPlayer1);

    const test = await shipsFacet.getDefensePlanetDetailed(planetIdPlayer1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUser.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    //@notice player two
    await buildingsFacet
      .connect(randomUserTwo)
      .craftBuilding(10, planetIdPlayer2, 1);

    blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [timestampBefore + 1200]);

    claimBuild = await buildingsFacet
      .connect(randomUserTwo)
      .claimBuilding(planetIdPlayer2);

    await shipsFacet.connect(randomUserTwo).craftFleet(1, planetIdPlayer2, 1);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 1200 + 1200]);

    await shipsFacet.connect(randomUserTwo).claimFleet(planetIdPlayer2);

    checkOwnershipShipsPlayer = await shipNfts.balanceOf(randomUserTwo.address);

    expect(checkOwnershipShipsPlayer).to.equal(1);

    const player1Fleet = await shipNfts.getDefensePlanet(planetIdPlayer1);

    const player2Fleet = await shipNfts.getDefensePlanet(planetIdPlayer2);

    //@user1 attacks user2

    let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
      randomUser.address,
      0
    );

    const outgoingAtksEmpty = await fightingFacet.getAllOutgoingAttacks(
      randomUser.address
    );

    expect(outgoingAtksEmpty).to.be.empty;

    await fightingFacet
      .connect(randomUser)
      .sendAttack(planetIdPlayer1, planetIdPlayer2, [shipIdPlayer1]);

    await ethers.provider.send("evm_mine", [timestampBefore + 48000]);

    // //@notice we get the instance Id from the event on the planet contract (attackInitated);

    const outgoingAtks = await fightingFacet.getAllOutgoingAttacks(
      randomUser.address
    );

    expect(outgoingAtks).to.not.be.empty;

    const incomingAtks = await fightingFacet.getAllIncomingAttacksPlanet(
      planetIdPlayer2
    );

    expect(incomingAtks).to.not.be.empty;

    const incomingAtksPlayer = await fightingFacet.getAllIncomingAttacksPlanet(
      randomUserTwo.address
    );

    expect(incomingAtks).to.not.be.empty;
  });
});

import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import { deployDiamond } from "../scripts/deploy";
import {
  AdminFacet,
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
  ManagementFacet,
} from "../typechain-types";
import { BigNumber, Signer, BigNumberish } from "ethers";
import { impersonate } from "../scripts/helperFunctions";
import {
  upgrade,
  upgradeTestVersion,
} from "../scripts/upgradeDiamond";
import { initPlanets } from "../scripts/initPlanets";
import { Provider } from "@ethersproject/abstract-provider";

import { PromiseOrValue } from "../typechain-types/common";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
// import { upgradeContract } from "../scripts/upgradeContract";

describe("Game", function () {
  let g: any;

  let vrfFacet: RegisterFacet;
  let adminFacet: AdminFacet;
  let buildingsFacet: BuildingsFacet;

  let shipsFacet: ShipsFacet;
  let managementFacet: ManagementFacet;

  let planetNfts: Planets;
  let metalToken: Metal;
  let crystalToken: Crystal;
  let antimatterToken: Antimatter;

  let aetherToken: Aether;

  let shipNfts: Ships;
  let fightingFacet: FightingFacet;
  let allianceFacet: AllianceFacet;

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

  const advanceTimeAndBlock = async (quantity: number) => {
    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );
    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [
      timestampBefore + 12000 * quantity,
    ]);
  };

  const advanceTimeAndBlockByAmount = async (quantity: number) => {
    const blockBefore = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );
    const timestampBefore = blockBefore.timestamp;

    await ethers.provider.send("evm_mine", [
      timestampBefore + quantity,
    ]);
  };

  const registerUser = async (user: string | Signer | Provider) => {
    return await vrfFacet.connect(user).startRegister(0, 3);
  };

  const craftBuilding = async (
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>
  ) => {
    return await buildingsFacet
      .connect(user)
      .craftBuilding(10, planetId, 1);
  };

  const craftBuildingSpecific = async (
    buildingId: string,
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>
  ) => {
    return await buildingsFacet
      .connect(user)
      .craftBuilding(buildingId, planetId, 1);
  };

  const claimBuilding = async (
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>
  ) => {
    return await buildingsFacet.connect(user).claimBuilding(planetId);
  };

  const craftAndClaimShipyard = async (
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>
  ) => {
    await craftBuilding(user, planetId);
    await advanceTimeAndBlock(10);
    await claimBuilding(user, planetId);
  };

  const craftFleet = async (
    user: string | Signer | Provider,
    fleetType: PromiseOrValue<BigNumberish>,
    planetId: PromiseOrValue<BigNumberish>,
    quantity: PromiseOrValue<BigNumberish>
  ) => {
    return await shipsFacet
      .connect(user)
      .craftFleet(fleetType, planetId, quantity);
  };

  const claimFleet = async (
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>
  ) => {
    return await shipsFacet.connect(user).claimFleet(planetId);
  };

  const craftAndClaimFleet = async (
    user: string | Signer | Provider,
    fleetType: PromiseOrValue<BigNumberish>,
    planetId: PromiseOrValue<BigNumberish>,
    quantity: PromiseOrValue<BigNumberish>
  ) => {
    await craftFleet(user, fleetType, planetId, quantity);
    await advanceTimeAndBlock(1);
    await claimFleet(user, planetId);
  };

  const sendAttack = async (
    user: string | Signer | Provider,
    planetIdPlayer1: PromiseOrValue<BigNumberish>,
    planetIdPlayer2: PromiseOrValue<BigNumberish>,
    shipIds: BigNumber[]
  ) => {
    await fightingFacet
      .connect(user)
      .sendAttack(planetIdPlayer1, planetIdPlayer2, shipIds);
  };

  const sendTerraform = async (
    user: string | Signer | Provider,
    planetId: PromiseOrValue<BigNumberish>,
    planetToTerraform: PromiseOrValue<BigNumberish>,
    shipIds: PromiseOrValue<BigNumberish>[]
  ) => {
    return await shipsFacet
      .connect(user)
      .sendTerraform(planetId, planetToTerraform, shipIds);
  };

  const endTerraform = async (
    user: string | Signer | Provider,
    terraformIndex: PromiseOrValue<BigNumberish>
  ) => {
    return await shipsFacet
      .connect(user)
      .endTerraform(terraformIndex);
  };

  async function setupUser(
    user: Signer,
    buildings: number,
    fleets: { type: number; quantity: number }[]
  ): Promise<void> {
    const userAddress = await user.getAddress();

    // Register user
    await registerUser(user);

    // Get the user's initial planet
    const planetId = await planetNfts.tokenOfOwnerByIndex(
      userAddress,
      0
    );

    // Craft and claim buildings
    for (let i = 0; i < buildings; i++) {
      await craftBuilding(user, planetId);
      await advanceTimeAndBlock(5000);
      await claimBuilding(user, planetId);
    }

    // Craft and claim fleets
    for (const fleet of fleets) {
      await craftFleet(user, fleet.type, planetId, fleet.quantity);
      await advanceTimeAndBlock(5000);
      await claimFleet(user, planetId);
    }
  }

  async function getShipIdsForOwner(
    user: Signer
  ): Promise<BigNumber[]> {
    const userAddress = await user.getAddress();
    const shipCount = (
      await shipNfts.balanceOf(userAddress)
    ).toNumber();
    const shipIds: BigNumber[] = [];

    for (let i = 0; i < shipCount; i++) {
      const shipId = await shipNfts.tokenOfOwnerByIndex(
        userAddress,
        i
      );
      shipIds.push(shipId);
    }

    return shipIds;
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

    managementFacet = (await ethers.getContractAt(
      "ManagementFacet",
      diamond
    )) as ManagementFacet;

    await adminFacet.startInit(20, 1);
  });

  describe("User Registration & All PlanetFunctions Tests", function () {
    it("mint planets", async function () {
      await adminFacet.startInit(1, 1);
    });

    it("register user and get planet NFT ", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      //@notice actual register function for Tron Network
      await registerUser(randomUser);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipAmountPlayer).to.equal(1);
    });

    it("registered user can mine metal every 24hours ", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const beforeMining = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .mineResources(planetId);

      const balanceAfterMining =
        await buildingsFacet.getPlanetResources(planetId, 0);

      expect(balanceAfterMining).to.be.above(beforeMining);
    });

    it("registered user can craft & claim buildings", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const buildingTypeToCraft = 1;
      const buildingAmountToCraft = 1;

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      await advanceTimeAndBlock(50);
      let checkOwnershipBuildings =
        await buildingsFacet.getAllBuildings(planetId);

      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      checkOwnershipBuildings = await buildingsFacet.getAllBuildings(
        planetId
      );

      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        1
      );
    });

    it("registered user can craft & partially claim buildings", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const buildingTypeToCraft = 1;
      const buildingAmountToCraft = 5;

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      const buildingTypeStruct = await buildingsFacet.getBuildingType(
        buildingTypeToCraft
      );

      const craftTime = buildingTypeStruct.craftTime;
      const newPlayerCraftTime = craftTime.mul(20).div(100); // 80% time reduction for new players

      await advanceTimeAndBlockByAmount(
        newPlayerCraftTime.toNumber() * 2
      ); // Let's claim 2 out of 5 buildings

      let checkOwnershipBuildings =
        await buildingsFacet.getAllBuildings(planetId);

      // Initially, all the buildings are unclaimed
      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      checkOwnershipBuildings = await buildingsFacet.getAllBuildings(
        planetId
      );

      // After claiming, we should have 2 buildings
      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        2
      );

      await advanceTimeAndBlockByAmount(
        newPlayerCraftTime.toNumber() * 3
      ); // Let's claim the remaining 3 buildings

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      checkOwnershipBuildings = await buildingsFacet.getAllBuildings(
        planetId
      );

      // After the second claim, we should have all 5 buildings
      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        5
      );
    });

    it("new player speed buff goes away after 10 buildings", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const buildingTypeToCraft = 2;
      const buildingAmountToCraft = 10;

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      const buildingTypeStruct = await buildingsFacet.getBuildingType(
        buildingTypeToCraft
      );

      const craftTime = buildingTypeStruct.craftTime;
      const newPlayerCraftTime = craftTime.mul(20).div(100);

      await advanceTimeAndBlockByAmount(
        newPlayerCraftTime.toNumber() * buildingAmountToCraft
      );

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      let checkOwnershipBuildings =
        await buildingsFacet.getAllBuildings(planetId);

      // After claiming, we should have 10 buildings
      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        buildingAmountToCraft
      );

      // Now let's try to build an 11th building
      const buildingAmountToCraft11 = 1;

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft11
        );

      await advanceTimeAndBlockByAmount(
        craftTime.toNumber() * buildingAmountToCraft11
      );

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      checkOwnershipBuildings = await buildingsFacet.getAllBuildings(
        planetId
      );

      // After claiming, we should have 11 buildings, meaning the 11th building took the full craft time, not the reduced new player time
      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        buildingAmountToCraft + buildingAmountToCraft11
      );
    });

    it("registered user can recycle buildings", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const buildingTypeToCraft = 1;
      const buildingAmountToCraft = 1;

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      await advanceTimeAndBlock(40);

      let checkOwnershipBuildings =
        await buildingsFacet.getAllBuildings(planetId);

      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      checkOwnershipBuildings = await buildingsFacet.getAllBuildings(
        planetId
      );

      expect(checkOwnershipBuildings[buildingTypeToCraft]).to.equal(
        1
      );

      const initialResources =
        await buildingsFacet.getPlanetResourcesAll(planetId);

      await buildingsFacet
        .connect(randomUser)
        .recycleBuildings(
          planetId,
          buildingTypeToCraft,
          buildingAmountToCraft
        );

      const finalResources =
        await buildingsFacet.getPlanetResourcesAll(planetId);

      const buildingToRecycle = await buildingsFacet.getBuildingType(
        buildingTypeToCraft
      );

      for (let i = 0; i < 3; i++) {
        const expectedResource = initialResources[i].add(
          buildingToRecycle.price[i].mul(50).div(100)
        );
        expect(finalResources[i]).to.equal(expectedResource);
      }
    });

    it("allows registered users to craft and claim ships", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);
      // Get planet ID
      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      // Craft building
      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(10, planetId, 1);

      // Advance time
      await advanceTimeAndBlock(500);

      // Claim building
      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      // Craft fleet
      await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

      // Check ownership of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      await advanceTimeAndBlock(20);

      // Claim fleet
      await shipsFacet.connect(randomUser).claimFleet(planetId);

      // Check ownership of ships again
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);
    });

    it("allows registered users to craft and claim ships partially", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);
      // Get planet ID
      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);

      // Craft fleet
      const shipTypeToCraft = 1;
      const shipAmountToCraft = 10;

      const shipTypeToCraftStruct = await shipsFacet.getShipTypeStats(
        shipTypeToCraft
      );

      const craftTime = shipTypeToCraftStruct.craftTime.toNumber();

      await shipsFacet
        .connect(randomUser)
        .craftFleet(shipTypeToCraft, planetId, shipAmountToCraft);

      // Check ownership of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      for (let i = 0; i < 10; i++) {
        // Advance time
        await advanceTimeAndBlockByAmount(craftTime + 10); // Assume each ship takes 10 seconds to craft

        // Claim fleet
        await shipsFacet.connect(randomUser).claimFleet(planetId);

        // Check ownership of ships again
        checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );
        expect(checkOwnershipShipsPlayer).to.equal(i + 1);
      }
    });
  });

  describe("PVP Combat Testing", function () {
    it("registered user attack other user and conquer his NFT ", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Create two opponents
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      // craft buildings for both players
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(40);
      await claimBuilding(randomUser, planetIdPlayer1);

      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(10000);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      // craft fleets for both players
      await craftFleet(randomUser, 6, planetIdPlayer1, 1);
      await advanceTimeAndBlock(40);
      await claimFleet(randomUser, planetIdPlayer1);

      await craftFleet(randomUserTwo, 1, planetIdPlayer2, 1);
      await advanceTimeAndBlock(40000);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      // Assert players own the right amount of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      // user1 attacks user2
      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      await sendAttack(randomUser, planetIdPlayer1, planetIdPlayer2, [
        shipIdPlayer1,
      ]);

      await advanceTimeAndBlock(100000);

      // Resolve the attack
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      const result = attackResolveReceipt.wait();

      // Assert player1 owns the same amount of ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      // Assert player2 lost all ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      // Assert planet is owned by player1
      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(2);
    });

    it("registered user attacks another user, conquers their NFT and crafts building on conquered planet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Create two opponents
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      // Craft buildings for both players
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(40);
      await claimBuilding(randomUser, planetIdPlayer1);

      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(10000);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      // Craft fleets for both players
      await craftFleet(randomUser, 6, planetIdPlayer1, 1);
      await advanceTimeAndBlock(40);
      await claimFleet(randomUser, planetIdPlayer1);

      await craftFleet(randomUserTwo, 1, planetIdPlayer2, 1);
      await advanceTimeAndBlock(40000);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      // Assert players own the right amount of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      // User1 attacks User2
      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      await sendAttack(randomUser, planetIdPlayer1, planetIdPlayer2, [
        shipIdPlayer1,
      ]);

      await advanceTimeAndBlock(100000);

      // Resolve the attack
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      const result = attackResolveReceipt.wait();

      // Assert player1 owns the same amount of ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      // Assert player2 lost all ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      // Assert planet is owned by player1
      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(2);

      let checkOwnershipBuildingsbefore =
        await buildingsFacet.getAllBuildings(planetIdPlayer2);

      // Craft and claim a building on the newly conquered planet
      await craftBuilding(randomUser, planetIdPlayer2);
      await advanceTimeAndBlock(40);
      await claimBuilding(randomUser, planetIdPlayer2);

      let checkOwnershipBuildingsAfter =
        await buildingsFacet.getAllBuildings(planetIdPlayer2);

      expect(checkOwnershipBuildingsAfter[10]).to.be.above(
        checkOwnershipBuildingsbefore[10]
      );
    });
    it("registered user attacks other user and lose ", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Create two opponents
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      // Craft buildings for both players
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(50);
      await claimBuilding(randomUser, planetIdPlayer1);

      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(150);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      // Craft fleets for both players
      await craftFleet(randomUser, 6, planetIdPlayer1, 1);
      await advanceTimeAndBlock(50);
      await claimFleet(randomUser, planetIdPlayer1);

      await craftFleet(randomUserTwo, 5, planetIdPlayer2, 10);
      await advanceTimeAndBlock(200);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      // Assert players own the right amount of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(10);

      // User1 attacks user2
      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      await sendAttack(randomUser, planetIdPlayer1, planetIdPlayer2, [
        shipIdPlayer1,
      ]);

      await advanceTimeAndBlock(400);

      // Resolve the attack
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      const result = attackResolveReceipt.wait();

      // Assert player1 lost all ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      // Assert player2 still has ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.be.above(1);

      // Assert planet is still owned by player1
      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(1);
    });

    it("check attack view functions ", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Create two opponents
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(1);
      await claimBuilding(randomUser, planetIdPlayer1);

      await craftFleet(randomUser, 6, planetIdPlayer1, 3);
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      await advanceTimeAndBlock(2);
      await claimFleet(randomUser, planetIdPlayer1);

      const test = await shipsFacet.getDefensePlanetDetailed(
        planetIdPlayer1
      );
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(3);

      // Player two
      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(3);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      await craftFleet(randomUserTwo, 2, planetIdPlayer2, 2);
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      await advanceTimeAndBlock(4);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(2);

      const player1Fleet = await shipNfts.getDefensePlanet(
        planetIdPlayer1
      );
      const player2Fleet = await shipNfts.getDefensePlanet(
        planetIdPlayer2
      );

      // user1 attacks user2
      let shipIdsPlayer1 = [];
      for (let i = 0; i < 3; i++) {
        shipIdsPlayer1[i] = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          i
        );
        await sendAttack(
          randomUser,
          planetIdPlayer1,
          planetIdPlayer2,
          [shipIdsPlayer1[i]]
        );
      }

      await advanceTimeAndBlock(5);

      const outgoingAtks = await fightingFacet.getAllOutgoingAttacks(
        randomUser.address
      );
      expect(outgoingAtks).to.not.be.empty;

      const incomingAtksPlanet =
        await fightingFacet.getAllIncomingAttacksPlanet(
          planetIdPlayer2
        );
      const incomingAtksPlayer =
        await fightingFacet.getAllIncomingAttacksPlayer(
          randomUserTwo.address
        );
      const outgoingAtksPlayer =
        await fightingFacet.getAllOutgoingAttacks(randomUser.address);

      expect(incomingAtksPlanet.length).to.equal(3);
      expect(incomingAtksPlayer.length).to.equal(3);
      expect(outgoingAtksPlayer.length).to.equal(3);
    });

    it("registered user can send friendly ships to his owned planet ", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Register two users
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      // User 1 crafts building and fleet
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(10);
      await claimBuilding(randomUser, planetIdPlayer1);

      let shipAmountToCraftInit = 4;
      await craftFleet(
        randomUser,
        6,
        planetIdPlayer1,
        shipAmountToCraftInit
      );
      await advanceTimeAndBlock(20);
      await claimFleet(randomUser, planetIdPlayer1);

      // Assert user owns the right amount of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(
        shipAmountToCraftInit
      );

      // User 2 crafts building and fleet
      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(30);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      let shipAmountToCraft = 1;
      await craftFleet(
        randomUserTwo,
        1,
        planetIdPlayer2,
        shipAmountToCraft
      );
      await advanceTimeAndBlock(40);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      // Assert user 2 owns the right amount of ships
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(shipAmountToCraft);

      // User 1 attacks user 2
      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      await fightingFacet
        .connect(randomUser)
        .sendAttack(planetIdPlayer1, planetIdPlayer2, [
          shipIdPlayer1,
        ]);

      await advanceTimeAndBlock(50);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);

      // Assert user 1 won the battle
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(
        shipAmountToCraftInit
      );
      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUserTwo.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      // Assert planet is owned by player 1 now
      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(2);

      // User 1 sends reinforcements to his new planet
      let shipIdPlayer1Reinforcement =
        await shipNfts.tokenOfOwnerByIndex(randomUser.address, 1);
      const getShipsOnPlanetBefore =
        await shipsFacet.getDefensePlanetDetailedIds(planetIdPlayer2);
      await fightingFacet
        .connect(randomUser)
        .sendFriendlies(planetIdPlayer1, planetIdPlayer2, [
          shipIdPlayer1Reinforcement,
        ]);

      const getShipsOnPlanetAfter =
        await shipsFacet.getDefensePlanetDetailedIds(planetIdPlayer2);

      // Assert reinforcements arrived at the new planet
      expect(getShipsOnPlanetAfter.length).to.be.above(
        getShipsOnPlanetBefore.length
      );
    });
  });

  describe("Alliance Testing", function () {
    it("registered user can create an alliance ", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const createAlliance = await allianceFacet
        .connect(randomUser)
        .createAlliance(
          ethers.utils.formatBytes32String("bananarama")
        );

      const allCreatedAlliances =
        await allianceFacet.returnAllAlliances();

      expect(allCreatedAlliances[0]).to.be.equal(
        ethers.utils.formatBytes32String("bananarama")
      );
    });

    it("alliance creator can invite & invitee can join an alliance when invited", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");
      const createAlliance = await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);

      const allCreatedAlliances =
        await allianceFacet.returnAllAlliances();

      const invitePlayer = await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);

      const CreatorsAlliance =
        await allianceFacet.getCurrentAlliancePlayer(
          randomUser.address
        );

      const acceptInvitation = await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      const MemberTwoAlliance =
        await allianceFacet.getCurrentAlliancePlayer(
          randomUserTwo.address
        );

      expect(MemberTwoAlliance).to.be.equal(CreatorsAlliance);
    });

    it("user can leave an alliance", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");
      await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);

      await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);

      await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      await allianceFacet.connect(randomUserTwo).leaveAlliance();

      const allianceOfPlayerTwo =
        await allianceFacet.getCurrentAlliancePlayer(
          randomUserTwo.address
        );

      expect(allianceOfPlayerTwo).to.be.equal(
        ethers.utils.formatBytes32String("")
      );
    });

    it("alliance owner can kick a member", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");
      await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);

      await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);

      await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      await allianceFacet
        .connect(randomUser)
        .kickAllianceMember(randomUserTwo.address);

      const allianceOfPlayerTwo =
        await allianceFacet.getCurrentAlliancePlayer(
          randomUserTwo.address
        );

      expect(allianceOfPlayerTwo).to.be.equal(
        ethers.utils.formatBytes32String("")
      );
    });

    it("registered user can send friendly ships to his alliance member", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");

      // User creates an alliance and invites other user
      const createAlliance = await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);
      const invitePlayer = await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);
      const acceptInvitation = await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      // User crafts a building and a fleet
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(1);
      await claimBuilding(randomUser, planetIdPlayer1);

      let shipAmountToCraft = 2;
      await craftFleet(
        randomUser,
        6,
        planetIdPlayer1,
        shipAmountToCraft
      );
      await advanceTimeAndBlock(10);
      await claimFleet(randomUser, planetIdPlayer1);

      // Assert user owns the right amount of ships
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(shipAmountToCraft);

      const getShipsOnPlanetBefore =
        await shipsFacet.getDefensePlanetDetailed(planetIdPlayer2);

      // User sends reinforcements to other user
      let shipIdPlayer1Reinforcement =
        await shipNfts.tokenOfOwnerByIndex(randomUser.address, 1);
      const sendReinforcementsToPlanet = await fightingFacet
        .connect(randomUser)
        .sendFriendlies(planetIdPlayer1, planetIdPlayer2, [
          shipIdPlayer1Reinforcement,
        ]);

      const getShipsOnPlanetAfter =
        await shipsFacet.getDefensePlanetDetailed(planetIdPlayer2);

      // Assert other user received the reinforcements
      expect(getShipsOnPlanetAfter[0].length).to.be.above(
        getShipsOnPlanetBefore[0].length
      );
    });

    it("registered user can send resources  to his alliance member", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");

      // User creates an alliance and invites other user
      const createAlliance = await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);
      const invitePlayer = await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);
      const acceptInvitation = await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      // User crafts a building and a fleet
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(1);
      await claimBuilding(randomUser, planetIdPlayer1);

      let shipAmountToCraft = 1;
      let cargoShipId = 8;
      await craftFleet(
        randomUser,
        cargoShipId,
        planetIdPlayer1,
        shipAmountToCraft
      );
      await advanceTimeAndBlock(10);
      await claimFleet(randomUser, planetIdPlayer1);

      const sentAmount = [42000000, 42000000, 42000000] as [
        number,
        number,
        number
      ];

      const metalBefore = await buildingsFacet.getPlanetResources(
        planetIdPlayer2,
        0
      );

      const metalBefore1 = await buildingsFacet.getPlanetResources(
        planetIdPlayer1,
        0
      );

      await shipsFacet
        .connect(randomUser)
        .startSendResources(
          planetIdPlayer1,
          planetIdPlayer2,
          sentAmount
        );

      await advanceTimeAndBlock(10);

      const sendResourcesId = 1;
      await shipsFacet
        .connect(randomUser)
        .resolveSendResources(sendResourcesId);

      const metalAfter = await buildingsFacet.getPlanetResources(
        planetIdPlayer2,
        0
      );

      const metalAfter1 = await buildingsFacet.getPlanetResources(
        planetIdPlayer1,
        0
      );

      expect(metalBefore).to.be.below(metalAfter);
    });

    it("registered user can send resources only with cargo ships", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");

      // User creates an alliance and invites other user
      const createAlliance = await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);
      const invitePlayer = await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);
      const acceptInvitation = await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      // User crafts a building and a fleet
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(1);
      await claimBuilding(randomUser, planetIdPlayer1);

      let shipAmountToCraft = 1;
      let cargoShipId = 5;
      await craftFleet(
        randomUser,
        cargoShipId,
        planetIdPlayer1,
        shipAmountToCraft
      );
      await advanceTimeAndBlock(10);
      await claimFleet(randomUser, planetIdPlayer1);

      const sentAmount = [42000000, 42000000, 42000000] as [
        number,
        number,
        number
      ];

      const metalBefore = await buildingsFacet.getPlanetResources(
        planetIdPlayer2,
        0
      );

      const metalBefore1 = await buildingsFacet.getPlanetResources(
        planetIdPlayer1,
        0
      );

      await expect(
        shipsFacet
          .connect(randomUser)
          .startSendResources(
            planetIdPlayer1,
            planetIdPlayer2,
            sentAmount
          )
      ).to.be.revertedWith("above capacity!");
    });

    it("should return all members of an alliance", async function () {
      const { randomUser, randomUserTwo, randomUserThree } =
        await loadFixture(deployUsers);

      await vrfFacet.connect(randomUser).startRegister(0, 3);
      await vrfFacet.connect(randomUserTwo).startRegister(0, 3);
      await vrfFacet.connect(randomUserThree).startRegister(0, 3);

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");
      await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);

      await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);

      await allianceFacet
        .connect(randomUserTwo)
        .joinAlliance(allianceNameBytes32);

      await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserThree.address);

      await allianceFacet
        .connect(randomUserThree)
        .joinAlliance(allianceNameBytes32);

      const allianceMembers =
        await allianceFacet.viewAllAlliancesMembers(
          allianceNameBytes32
        );

      expect(allianceMembers.length).to.equal(3);
      expect(allianceMembers).to.include.members([
        randomUser.address,
        randomUserTwo.address,
        randomUserThree.address,
      ]);
    });

    it("getOutstandingInvitations returns all outstanding invitations for a member", async function () {
      const {
        owner,
        randomUser,
        randomUserTwo,
        randomUserThree,
        AdminUser,
      } = await loadFixture(deployUsers);

      await vrfFacet.connect(randomUser).startRegister(0, 3);
      await vrfFacet.connect(randomUserTwo).startRegister(0, 3);
      await vrfFacet.connect(randomUserThree).startRegister(0, 3);

      const allianceNameBytes32 =
        ethers.utils.formatBytes32String("bananarama");
      const allianceNameBytes32Second =
        ethers.utils.formatBytes32String("secondAlliance");

      // Create two alliances
      await allianceFacet
        .connect(randomUser)
        .createAlliance(allianceNameBytes32);
      await allianceFacet
        .connect(randomUserThree)
        .createAlliance(allianceNameBytes32Second);

      // Invite the same player to both alliances
      await allianceFacet
        .connect(randomUser)
        .inviteToAlliance(randomUserTwo.address);
      await allianceFacet
        .connect(randomUserThree)
        .inviteToAlliance(randomUserTwo.address);

      const outstandingInvitations =
        await allianceFacet.getOutstandingInvitations(
          randomUserTwo.address
        );

      // Expect to have two outstanding invitations
      expect(outstandingInvitations.length).to.equal(2);
      expect(outstandingInvitations).to.include(allianceNameBytes32);
      expect(outstandingInvitations).to.include(
        allianceNameBytes32Second
      );
    });
  });

  describe("Outmining Testing & Aether Testing", function () {
    it("registered user can outmine asteroid belt and get aether", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);

      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const aetherBefore = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );

      await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 215, [shipIdPlayer1]);
      await advanceTimeAndBlock(3);

      const resolveOutmining = await shipsFacet
        .connect(randomUser)
        .resolveOutMining(1);

      const aetherAfter = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );

      expect(aetherAfter).to.be.above(aetherBefore);
    });

    it("registered user can outmine unowned planet and not get aether", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const aetherBefore = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );
      const metalBefore = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 5, [shipIdPlayer1]);

      await advanceTimeAndBlock(3);

      const resolveOutmining = await shipsFacet
        .connect(randomUser)
        .resolveOutMining(1);

      const aetherAfter = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );
      const metalAfter = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      expect(aetherAfter).to.be.equal(aetherBefore);
      expect(metalAfter).to.be.above(metalBefore);
    });

    it("outmining view functions testing.", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(1);

      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const aetherBefore = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );
      const metalBefore = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 5, [shipIdPlayer1]);

      await advanceTimeAndBlock(3);

      const allOutminingPlayer =
        await shipsFacet.getAllOutMiningPlayer(randomUser.address);
      const allOutminingPlanet =
        await shipsFacet.getAllOutMiningPlanet(5);

      expect(allOutminingPlayer).to.deep.equal(allOutminingPlanet);

      const resolveOutmining = await shipsFacet
        .connect(randomUser)
        .resolveOutMining(1);

      const aetherAfter = await buildingsFacet.getAetherPlayer(
        randomUser.address
      );
      const metalAfter = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      expect(aetherAfter).to.be.equal(aetherBefore);
      expect(metalAfter).to.be.above(metalBefore);
    });
    it("user can withdraw Aether to receive the ERC20-Tokens in their wallet", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      //@notice actual register function for Tron Network

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const sendOutmining = await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 215, [shipIdPlayer1]);

      await advanceTimeAndBlock(4);

      const planetType = await shipsFacet
        .connect(randomUser)
        .getPlanetType(1);

      const resolveOutmining = await shipsFacet
        .connect(randomUser)
        .resolveOutMining(1);

      const aetherTokensWalletBefore = await aetherToken.balanceOf(
        randomUser.address
      );

      const withdrawAetherToWallet = await buildingsFacet
        .connect(randomUser)
        .withdrawAether(420);

      const aetherTokensWalletAfter = await aetherToken.balanceOf(
        randomUser.address
      );

      expect(aetherTokensWalletAfter).to.be.above(
        aetherTokensWalletBefore
      );
    });

    it("user can deposit Aether to receive the ERC20-Tokens in their wallet", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(10, planetId, 1);

      const blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      const timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [
        timestampBefore + 11111111200,
      ]);

      const claimBuild = await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 11111111200 + 12000,
      ]);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(1);

      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const sendOutmining = await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 215, [shipIdPlayer1]);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 11111111200 + 36000,
      ]);

      const planetType = await shipsFacet
        .connect(randomUser)
        .getPlanetType(1);

      const resolveOutmining = await shipsFacet
        .connect(randomUser)
        .resolveOutMining(1);

      const withdrawAetherToWallet = await buildingsFacet
        .connect(randomUser)
        .withdrawAether(420);

      //@notice deposit aether back in

      const AetherBalanceBefore =
        await buildingsFacet.getAetherPlayer(randomUser.address);

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

    it("reverts when attempting to outmine with an invalid shipId", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      const invalidShipId = 999; // Invalid ship ID

      await expect(
        shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 5, [invalidShipId])
      ).to.be.revertedWith("ship is not assigned to this planet!");
    });

    it("reverts when attempting to outmine with a non-mining ship", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 1, planetId, 1);

      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await expect(
        shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 5, [shipIdPlayer1])
      ).to.be.revertedWith("only minerShip!");
    });

    it("reverts when attempting to resolve an unmined outmining", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);
      await craftAndClaimFleet(randomUser, 7, planetId, 1);

      const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await shipsFacet
        .connect(randomUser)
        .startOutMining(planetId, 5, [shipIdPlayer1]);

      await expect(
        shipsFacet.connect(randomUser).resolveOutMining(1) // Attempt to resolve an unmined outmining with ID 2
      ).to.be.revertedWith("ShipsFacet: not arrived yet!");
    });
  });

  describe("Terraforming Testing", function () {
    it("User can terraform uninhabited planet", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);

      await craftAndClaimFleet(randomUser, 9, planetId, 1);

      const planetsOwnedPlayer1Before = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(planetsOwnedPlayer1Before).to.equal(1);

      const shipIds = Array.from(
        { length: 1 },
        async (_, i) =>
          await shipNfts.tokenOfOwnerByIndex(randomUser.address, i)
      );

      await sendTerraform(randomUser, planetId, 14, shipIds);
      await advanceTimeAndBlock(5);

      await endTerraform(randomUser, 0);

      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(planetsOwnedPlayer1).to.equal(2);
    });

    it("User can terraform uninhabited planet with 1terraformer and 2 fighter ships", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);

      await craftAndClaimFleet(randomUser, 9, planetId, 1);
      await craftAndClaimFleet(randomUser, 6, planetId, 2);

      const planetsOwnedPlayer1Before = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(planetsOwnedPlayer1Before).to.equal(1);

      const shipIds = Array.from(
        { length: 3 },
        async (_, i) =>
          await shipNfts.tokenOfOwnerByIndex(randomUser.address, i)
      );

      await sendTerraform(randomUser, planetId, 14, shipIds);
      await advanceTimeAndBlock(5);

      await endTerraform(randomUser, 0);

      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );

      expect(planetsOwnedPlayer1).to.equal(2);
    });

    it("User can terraform uninhabited planet with 1 terraformer and 2 fighter ships, then craft and claim building on terraformed planet", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftAndClaimShipyard(randomUser, planetId);

      await craftAndClaimFleet(randomUser, 9, planetId, 1); // Terraformer
      await craftAndClaimFleet(randomUser, 6, planetId, 2); // Fighter ships

      const planetsOwnedPlayer1Before = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1Before).to.equal(1);

      const shipIds = await Promise.all(
        Array.from(
          { length: 3 },
          async (_, i) =>
            await shipNfts.tokenOfOwnerByIndex(randomUser.address, i)
        )
      );

      await sendTerraform(randomUser, planetId, 14, shipIds); // Targeting planetId: 14
      await advanceTimeAndBlock(5);

      await endTerraform(randomUser, 0);

      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(2);

      // Get the newly terraformed planet ID
      const terraformedPlanetId =
        await planetNfts.tokenOfOwnerByIndex(randomUser.address, 1); // Assuming it's at index 1

      // Check buildings on the terraformed planet before crafting
      let checkOwnershipBuildingsbefore =
        await buildingsFacet.getAllBuildings(terraformedPlanetId);

      await buildingsFacet
        .connect(randomUser)
        .mineResources(terraformedPlanetId);

      // Craft and claim a building on the newly terraformed planet
      await craftBuildingSpecific(
        "5",
        randomUser,
        terraformedPlanetId
      );
      await advanceTimeAndBlock(40);
      await claimBuilding(randomUser, terraformedPlanetId);

      // Check buildings on the terraformed planet after crafting
      let checkOwnershipBuildingsAfter =
        await buildingsFacet.getAllBuildings(terraformedPlanetId);

      // Assert that a building was crafted on the newly terraformed planet
      expect(checkOwnershipBuildingsAfter[5]).to.be.above(
        checkOwnershipBuildingsbefore[5]
      ); // Check the specific building at index 10
    });

    it("check terraform viewing functions", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);
      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await craftBuilding(randomUser, planetId);
      await advanceTimeAndBlock(1);
      await claimBuilding(randomUser, planetId);

      await craftFleet(randomUser, 9, planetId, 1);
      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(0);

      await advanceTimeAndBlock(2);
      await claimFleet(randomUser, planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      await craftFleet(randomUser, 6, planetId, 2);

      await advanceTimeAndBlock(3);
      await claimFleet(randomUser, planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(3);

      let shipIds = [];
      for (let i = 0; i < 3; i++) {
        shipIds[i] = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          i
        );
      }

      const planetToTerraform = 14;
      await sendTerraform(
        randomUser,
        planetId,
        planetToTerraform,
        shipIds
      );

      await shipsFacet
        .connect(randomUser)
        .showIncomingTerraformersPlanet(planetToTerraform);

      const terraformingInstancesPlayer = await shipsFacet
        .connect(randomUser)
        .getAllTerraformingPlayer(randomUser.address);
      const terraformingInstancesPlanet = await shipsFacet
        .connect(randomUser)
        .showIncomingTerraformersPlanet(planetToTerraform);

      expect(terraformingInstancesPlayer).to.not.be.null;
      expect(terraformingInstancesPlanet).to.deep.equal(
        terraformingInstancesPlayer
      );

      await advanceTimeAndBlock(4);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );
      expect(checkOwnershipShipsPlayer).to.equal(3);

      await endTerraform(randomUser, 0);

      const planetsOwnedPlayer1 = await planetNfts.balanceOf(
        randomUser.address
      );
      expect(planetsOwnedPlayer1).to.equal(2);

      const terraformingInstancesPlayerAfterwards = await shipsFacet
        .connect(randomUser)
        .getAllTerraformingPlayer(randomUser.address);
      expect(terraformingInstancesPlayerAfterwards).to.be.empty;
    });
  });

  describe("Ship Customization Testing", function () {
    it("User can equip shipModule on their ship", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(10, planetId, 1);

      const blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      const timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [
        timestampBefore + 11111111200,
      ]);

      const claimBuild = await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 11111111200 + 12000,
      ]);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

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

      expect(statsAfterModule.health).to.be.above(
        statsBeforeModule.health
      );
    });
  });

  describe("Tech Tree Testing", function () {
    it("User can research Technology and buff their ships", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(10, planetId, 1);

      const blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      const timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 1,
      ]);

      const claimBuild = await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 2,
      ]);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(1);

      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const statsBeforeResearch =
        await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

      await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 3,
      ]);

      await managementFacet
        .connect(randomUser)
        .researchTech(1, 1, planetId);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      let shipId2Player1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        1
      );

      const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
        shipId2Player1
      );

      expect(statsAfterResearch.attackTypes[0]).to.be.above(
        statsBeforeResearch.attackTypes[0]
      );
    });

    it("User can research Advanced Shielding Techniques and buff their ships", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(10, planetId, 1);

      const blockBefore = await ethers.provider.getBlock(
        await ethers.provider.getBlockNumber()
      );

      const timestampBefore = blockBefore.timestamp;

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 1,
      ]);

      const claimBuild = await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

      let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(0);

      //research first one
      await managementFacet
        .connect(randomUser)
        .researchTech(2, 1, planetId);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 2,
      ]);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(1);

      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      const statsBeforeResearch =
        await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

      await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 3,
      ]);

      //cooldown research
      await ethers.provider.send("evm_mine", [
        timestampBefore + 120000 * 12,
      ]);
      await managementFacet
        .connect(randomUser)
        .researchTech(3, 1, planetId);

      await shipsFacet.connect(randomUser).claimFleet(planetId);

      let shipId2Player1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        1
      );

      const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
        shipId2Player1
      );

      expect(statsAfterResearch.health).to.be.above(
        statsBeforeResearch.health
      );
    });

    it("User can research Enhanced Planetary Mining and increase mining output", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      // Check if the user has already researched the tech
      let hasResearched =
        await managementFacet.returnPlayerResearchedTech(
          4,
          4,
          randomUser.address
        );
      expect(hasResearched).to.be.false;

      // User researches Enhanced Planetary Mining
      await managementFacet
        .connect(randomUser)
        .researchTech(4, 4, planetId); // TechId, TechTree, PlanetId

      // Verify the tech is now researched
      hasResearched =
        await managementFacet.returnPlayerResearchedTech(
          4,
          4,
          randomUser.address
        );
      expect(hasResearched).to.be.true;

      // Simulate mining
      const beforeMining = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );
      await buildingsFacet
        .connect(randomUser)
        .mineResources(planetId);
      const afterMining = await buildingsFacet.getPlanetResources(
        planetId,
        0
      );

      // Check if mining output increased
      expect(afterMining).to.be.above(beforeMining);
    });

    it("User can research Aether Mining Technology and mine Aether", async function () {
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
        .startRegister(0, 3);

      const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
        randomUser.address
      );

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      await ethers.provider.send("evm_mine", [1200000 * 2222]);

      // Research prerequisites first
      await managementFacet
        .connect(randomUser)
        .researchTech(4, 4, planetId); // Enhanced Planetary Mining

      await ethers.provider.send("evm_mine", [1200000 * 44444]);

      // Research Aether Mining Technology
      await managementFacet
        .connect(randomUser)
        .researchTech(5, 4, planetId); // TechId, TechTree, PlanetId

      // Verify the tech is now researched
      const hasResearchedAetherTech =
        await managementFacet.returnPlayerResearchedTech(
          5,
          4,
          randomUser.address
        );
      expect(hasResearchedAetherTech).to.be.true;

      // Simulate mining multiple times to account for 50% chance
      let aetherMined = false;
      for (let i = 0; i < 10; i++) {
        await buildingsFacet
          .connect(randomUser)
          .mineResources(planetId);

        await ethers.provider.send("evm_mine", [
          1200000 * 444485 + (i + 1) * 10000,
        ]);
        const aetherBalance = await buildingsFacet.getAetherPlayer(
          randomUser.address
        );
        if (aetherBalance.gt(ethers.BigNumber.from("0"))) {
          // Correct BigNumber comparison
          aetherMined = true;
          break;
        }
      }

      // Check if Aether was mined
      expect(aetherMined).to.be.true;
    });

    it("Efficient Construction Methods reduces building craft time by 10%", async function () {
      const { randomUser } = await loadFixture(deployUsers);

      await registerUser(randomUser);

      const planetId = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const buildingTypeToCraft = 2; // Example building type
      const buildingAmountToCraft = 1; // Crafting one building

      // Craft a building without the tech
      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      // Get the craft time for comparison
      let craftItemWithoutTech =
        await buildingsFacet.getCraftBuildings(planetId);
      let standardCraftTime = craftItemWithoutTech.craftTimeItem;

      // Advance time and claim the building
      const timestampBefore = await ethers.provider.getBlock(
        "latest"
      );
      const timeToAdvance = craftItemWithoutTech.readyTimestamp.sub(
        timestampBefore.timestamp
      );
      await advanceTimeAndBlock(timeToAdvance.toNumber());
      await buildingsFacet
        .connect(randomUser)
        .claimBuilding(planetId);

      // Research the "Efficient Construction Methods" tech
      await managementFacet
        .connect(randomUser)
        .researchTech(1, 3, planetId); // TechId 1 in Governance Tech Tree

      // Craft another building after researching the tech
      await buildingsFacet
        .connect(randomUser)
        .craftBuilding(
          buildingTypeToCraft,
          planetId,
          buildingAmountToCraft
        );

      // Get the new craft time
      let craftItemWithTech = await buildingsFacet.getCraftBuildings(
        planetId
      );
      let reducedCraftTime = craftItemWithTech.craftTimeItem;

      // Compare the craft times
      expect(reducedCraftTime.lt(standardCraftTime)).to.be.true;
    });
  });

  describe("Diplomacy Feature Testing", function () {
    it("Should create a peace treaty between two users, preventing them from attacking each other", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      // Register the users
      await registerUser(randomUser);
      await registerUser(randomUserTwo);

      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        randomUserTwo.address,
        0
      );

      // craft buildings for both players
      await craftBuilding(randomUser, planetIdPlayer1);
      await advanceTimeAndBlock(40);
      await claimBuilding(randomUser, planetIdPlayer1);

      await craftBuilding(randomUserTwo, planetIdPlayer2);
      await advanceTimeAndBlock(10000);
      await claimBuilding(randomUserTwo, planetIdPlayer2);

      // craft fleets for both players
      await craftFleet(randomUser, 6, planetIdPlayer1, 1);
      await advanceTimeAndBlock(40);
      await claimFleet(randomUser, planetIdPlayer1);

      await craftFleet(randomUserTwo, 1, planetIdPlayer2, 1);
      await advanceTimeAndBlock(40000);
      await claimFleet(randomUserTwo, planetIdPlayer2);

      const sentAmount = [4200, 4200, 4200] as [
        number,
        number,
        number
      ];

      // Construct a diplomacy deal (peace treaty)
      const diplomacyDeal = {
        initiator: randomUser.address,
        acceptor: randomUserTwo.address,
        initiatorPlanetId: planetIdPlayer1,
        resourcesAmount: sentAmount, // Example amounts
        demanded: false,
        timeFrameExpirationOffer: 2996530365, // Expires in an hour
        timeFramePeaceDealInSeconds: 3600, // Peace lasts for an hour
        status: 0,
      };

      // Create the deal
      const dealCreated = await managementFacet
        .connect(randomUser)
        .createDeal(diplomacyDeal);

      const dealId = 1; //extracted by event, or in this case we know its the first deal.
      // Acceptor agrees to the deal
      await managementFacet
        .connect(randomUserTwo)
        .acceptDeal(dealId, planetIdPlayer2);

      // Assert that a peace treaty is active between the two players
      const peaceStatus = await managementFacet.getPeaceDealStatus(
        randomUser.address,
        randomUserTwo.address
      );
      expect(peaceStatus).to.equal(true);

      // user1 attempts to attack user2
      let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
        randomUser.address,
        0
      );

      // This should revert because a peace treaty is in place
      await expect(
        sendAttack(randomUser, planetIdPlayer1, planetIdPlayer2, [
          shipIdPlayer1,
        ])
      ).to.be.revertedWith("Peace Treaty is in place!");

      // Check that player1's ship count is still the same after the failed attack
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      expect(checkOwnershipShipsPlayer).to.equal(1);
    });
  });

  describe("Deprecated Testing", function () {
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

      await buildingsFacet.mineResources(16);
    });
  });
});

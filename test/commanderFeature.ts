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
  TutorialFacet,
} from "../typechain-types";
import { BigNumber, Signer, BigNumberish } from "ethers";

import { Provider } from "@ethersproject/abstract-provider";

import { PromiseOrValue } from "../typechain-types/common";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
// import { upgradeContract } from "../scripts/upgradeContract";

describe("Research Technology Testing", function () {
  let g: any;

  let registerFacet: RegisterFacet;
  let adminFacet: AdminFacet;
  let buildingsFacet: BuildingsFacet;
  let tutorialFacet: TutorialFacet;

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
    return await registerFacet.connect(user).startRegister(0, 3);
  };

  const registerUserWithCommander = async (
    user: string | Signer | Provider,
    factionId: PromiseOrValue<BigNumberish>,
    commanderId: PromiseOrValue<BigNumberish>
  ) => {
    return await registerFacet
      .connect(user)
      .startRegisterWithCommander(factionId, 3, commanderId);
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
    g = await deployDiamond(false);

    const diamond = g.diamondAddress; //"0xe296a5cf8c15d2a4192670fd12132fc7a2d5f426";
    //await upgrade();

    // await upgradeTestVersion(diamond);
    // await upgradeContract("0xA7902D5fd78e896A1071453D2e24DA41a7fA0004");

    registerFacet = (await ethers.getContractAt(
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

    tutorialFacet = (await ethers.getContractAt(
      "TutorialFacet",
      diamond
    )) as TutorialFacet;
    await adminFacet.startInit(20, 1);
  });

  describe("Commander Testing", function () {
    describe("Commander Trait Testing", function () {
      it("Testing EM Warfare Mastery Trait [ID 1], buffing 20% Electromagnetic AtkDmg Ships", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 0, 1);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const planetIdUnbuffedPlayer =
          await planetNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        await craftAndClaimShipyard(randomUser, planetId);
        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);

        await craftAndClaimShipyard(
          randomUserTwo,
          planetIdUnbuffedPlayer
        );
        await craftAndClaimFleet(
          randomUserTwo,
          7,
          planetIdUnbuffedPlayer,
          1
        );
        await advanceTimeAndBlock(1);

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const shipIdPlayer2Unbuffed =
          await shipNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        const statsBuffedCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

        const statsUnbuffedNoCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer2Unbuffed);

        //attack should be raised by 20%
        expect(statsBuffedCommander.attackTypes[2]).to.be.above(
          statsUnbuffedNoCommander.attackTypes[2]
        );
      });

      it("Testing EM Hardening Mastery Trait [ID 2], buffing 20% Electromagnetic Def Ships", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 0, 2);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const planetIdUnbuffedPlayer =
          await planetNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        await craftAndClaimShipyard(randomUser, planetId);
        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);

        await craftAndClaimShipyard(
          randomUserTwo,
          planetIdUnbuffedPlayer
        );
        await craftAndClaimFleet(
          randomUserTwo,
          7,
          planetIdUnbuffedPlayer,
          1
        );
        await advanceTimeAndBlock(1);

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const shipIdPlayer2Unbuffed =
          await shipNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        const statsBuffedCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

        const statsUnbuffedNoCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer2Unbuffed);

        //attack should be raised by 20%
        expect(statsBuffedCommander.defenseTypes[2]).to.be.above(
          statsUnbuffedNoCommander.attackTypes[2]
        );
      });

      //@TODO
      it.skip("Ship Production Micromanagement Guru [ID 3] reducing 10% Ship Crafting Time", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 0, 2);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const planetIdUnbuffedPlayer =
          await planetNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        await craftAndClaimShipyard(randomUser, planetId);
        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);

        await craftAndClaimShipyard(
          randomUserTwo,
          planetIdUnbuffedPlayer
        );
        await craftAndClaimFleet(
          randomUserTwo,
          7,
          planetIdUnbuffedPlayer,
          1
        );
        await advanceTimeAndBlock(1);

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const shipIdPlayer2Unbuffed =
          await shipNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        const statsBuffedCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

        const statsUnbuffedNoCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer2Unbuffed);

        //attack should be raised by 20%
        expect(statsBuffedCommander.defenseTypes[2]).to.be.above(
          statsUnbuffedNoCommander.attackTypes[2]
        );
      });

      it("Kinetic Warfare Mastery Trait [ID 4], buffing 20% Kinetic Ship Damage", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 1, 1);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const planetIdUnbuffedPlayer =
          await planetNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        await craftAndClaimShipyard(randomUser, planetId);
        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);

        await craftAndClaimShipyard(
          randomUserTwo,
          planetIdUnbuffedPlayer
        );
        await craftAndClaimFleet(
          randomUserTwo,
          7,
          planetIdUnbuffedPlayer,
          1
        );
        await advanceTimeAndBlock(1);

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const shipIdPlayer2Unbuffed =
          await shipNfts.tokenOfOwnerByIndex(
            randomUserTwo.address,
            0
          );

        const statsBuffedCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer1);

        const statsUnbuffedNoCommander =
          await shipsFacet.getShipStatsDiamond(shipIdPlayer2Unbuffed);

        //attack should be raised by 20%
        expect(statsBuffedCommander.attackTypes[0]).to.be.above(
          statsUnbuffedNoCommander.attackTypes[0]
        );
      });

      //@TODO
      it.skip("Home is where the minerals are [ID 5], buffing 20% Asteroid Mining Yield", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 1, 1);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //outmining without buff:
        let beforeAsteroidMining =
          await buildingsFacet.getPlanetResources(planetId, 0);

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10);

        const resolveOutmining = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(1);

        let afterAsteroidMining =
          await buildingsFacet.getPlanetResources(planetId, 0);

        let unbuffedAsteroidMetalGain = afterAsteroidMining.sub(
          beforeAsteroidMining
        );
      });

      //@TODO
      it("Admiral's Impenetrable Mustache [ID 11], 5% total defense improved", async function () {
        const { randomUser, randomUserTwo } = await loadFixture(
          deployUsers
        );

        //user, factionId, commanderId
        await registerUserWithCommander(randomUser, 3, 3);

        //control group, no commander buff
        await registerUser(randomUserTwo);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //outmining without buff:
        let beforeAsteroidMining =
          await buildingsFacet.getPlanetResources(planetId, 0);

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10);

        const resolveOutmining = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(1);

        let afterAsteroidMining =
          await buildingsFacet.getPlanetResources(planetId, 0);

        let unbuffedAsteroidMetalGain = afterAsteroidMining.sub(
          beforeAsteroidMining
        );
      });
    });
  });
});

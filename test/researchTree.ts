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

  describe("Tech Tree Testing", function () {
    // ID of Utility Tech Tree is 4.
    describe("Utility Tech Tree", function () {
      it("Enhanced Planetary Mining increases Users planetary mining output by 20%", async function () {
        const {
          owner,
          randomUser,
          randomUserTwo,
          randomUserThree,
          AdminUser,
        } = await loadFixture(deployUsers);

        const registration = await registerFacet
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

        //mining without buff
        let beforeMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );
        await buildingsFacet
          .connect(randomUser)
          .mineResources(planetId);
        let afterMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        const minedAmountMetalUnbuffed =
          afterMining.sub(beforeMining);

        //advance by one hour to mine again
        await advanceTimeAndBlockByAmount(60 * 60);

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

        //mining without buff
        beforeMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );
        await buildingsFacet
          .connect(randomUser)
          .mineResources(planetId);
        afterMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        const minedAmountMetalBuffed = afterMining.sub(beforeMining);

        // Check if mining output increased after research by 20%
        expect(minedAmountMetalBuffed).to.be.equal(
          minedAmountMetalUnbuffed.mul(120).div(100)
        );
      });

      it("User can research Aether Mining Technology and mine Aether on their Planets 50% of the time", async function () {
        const {
          owner,
          randomUser,
          randomUserTwo,
          randomUserThree,
          AdminUser,
        } = await loadFixture(deployUsers);

        const registration = await registerFacet
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

        //fail if trying to research before researching prerequisite
        await expect(
          managementFacet
            .connect(randomUser)
            .researchTech(5, 4, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        ); // TechId, TechTree, PlanetId

        // Research prerequisite technlogy [Enhanced Planetary Mining [ID 4]] first
        await managementFacet
          .connect(randomUser)
          .researchTech(4, 4, planetId); // Enhanced Planetary Mining

        //advance 24hours research cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 24 + 60);

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
        for (let i = 0; i < 20; i++) {
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

      it("User can research Enhanced Aether Mining Technology and mine Aether on their Planets 100% of the time", async function () {
        const {
          owner,
          randomUser,
          randomUserTwo,
          randomUserThree,
          AdminUser,
        } = await loadFixture(deployUsers);

        const registration = await registerFacet
          .connect(randomUser)
          .startRegister(0, 3);

        const checkOwnershipAmountPlayer = await planetNfts.balanceOf(
          randomUser.address
        );

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        // Research prerequisite technlogy [Enhanced Planetary Mining [ID 4]] first
        await managementFacet
          .connect(randomUser)
          .researchTech(4, 4, planetId); // Enhanced Planetary Mining
        //advance 24hours cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 24 + 60);

        // Research  prerequisite technlogy [Aether Mining Technology [ID 5]] first
        await managementFacet
          .connect(randomUser)
          .researchTech(5, 4, planetId); // TechId, TechTree, PlanetId

        //advance 72hours cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 72 + 60);

        await managementFacet
          .connect(randomUser)
          .researchTech(6, 4, planetId); // TechId, TechTree, PlanetId

        // Verify the tech is now researched
        const hasResearchedAetherTech =
          await managementFacet.returnPlayerResearchedTech(
            6,
            4,
            randomUser.address
          );
        expect(hasResearchedAetherTech).to.be.true;

        // Aether should be mined 100% of the time now
        let aetherMined = false;

        await buildingsFacet
          .connect(randomUser)
          .mineResources(planetId);

        const aetherBalance = await buildingsFacet.getAetherPlayer(
          randomUser.address
        );
        if (aetherBalance.gt(ethers.BigNumber.from("0"))) {
          aetherMined = true;
        }

        // Check if Aether was mined
        expect(aetherMined).to.be.true;
      });
    });

    describe("Military Tech Tree", function () {});

    describe("Governance Tech Tree", function () {
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
          .researchTech(1, 3, planetId); // TechId 1 in Governance Tech Tree // TechId, TechTree, PlanetId

        // Craft another building after researching the tech
        await buildingsFacet
          .connect(randomUser)
          .craftBuilding(
            buildingTypeToCraft,
            planetId,
            buildingAmountToCraft
          );

        // Get the new craft time
        let craftItemWithTech =
          await buildingsFacet.getCraftBuildings(planetId);
        let reducedCraftTime = craftItemWithTech.craftTimeItem;

        let researchCooldown =
          await managementFacet.returnPlayerResearchCooldown(
            randomUser.address
          );

        // Compare the craft times
        expect(reducedCraftTime.lt(standardCraftTime)).to.be.true;
      });
    });

    describe("Ships Tech Tree", function () {
      it("User can research Technology and buff their ships", async function () {
        const {
          owner,
          randomUser,
          randomUserTwo,
          randomUserThree,
          AdminUser,
        } = await loadFixture(deployUsers);

        const registration = await registerFacet
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

        await shipsFacet
          .connect(randomUser)
          .craftFleet(1, planetId, 1);

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

        await shipsFacet
          .connect(randomUser)
          .craftFleet(1, planetId, 1);

        await ethers.provider.send("evm_mine", [
          timestampBefore + 120000 * 3,
        ]);

        await managementFacet
          .connect(randomUser)
          .researchTech(1, 1, planetId); // TechId, TechTree, PlanetId

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        let shipId2Player1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsAfterResearch =
          await shipsFacet.getShipStatsDiamond(shipId2Player1);

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

        const registration = await registerFacet
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

        await shipsFacet
          .connect(randomUser)
          .craftFleet(1, planetId, 1);

        let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );

        expect(checkOwnershipShipsPlayer).to.equal(0);

        //research first one
        await managementFacet
          .connect(randomUser)
          .researchTech(2, 1, planetId); // TechId, TechTree, PlanetId

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

        await shipsFacet
          .connect(randomUser)
          .craftFleet(1, planetId, 1);

        await ethers.provider.send("evm_mine", [
          timestampBefore + 120000 * 3,
        ]);

        //cooldown research
        await ethers.provider.send("evm_mine", [
          timestampBefore + 120000 * 12,
        ]);
        await managementFacet
          .connect(randomUser)
          .researchTech(3, 1, planetId); // TechId, TechTree, PlanetId

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        let shipId2Player1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsAfterResearch =
          await shipsFacet.getShipStatsDiamond(shipId2Player1);

        expect(statsAfterResearch.health).to.be.above(
          statsBeforeResearch.health
        );
      });
    });
  });
});

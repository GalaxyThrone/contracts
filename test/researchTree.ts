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

const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
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

    await ethers.provider.send("evm_mine", [timestampBefore + quantity]);
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
    return await buildingsFacet.connect(user).craftBuilding(10, planetId, 1);
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
    return await shipsFacet.connect(user).endTerraform(terraformIndex);
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
    const planetId = await planetNfts.tokenOfOwnerByIndex(userAddress, 0);

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

  async function getShipIdsForOwner(user: Signer): Promise<BigNumber[]> {
    const userAddress = await user.getAddress();
    const shipCount = (await shipNfts.balanceOf(userAddress)).toNumber();
    const shipIds: BigNumber[] = [];

    for (let i = 0; i < shipCount; i++) {
      const shipId = await shipNfts.tokenOfOwnerByIndex(userAddress, i);
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
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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
        let hasResearched = await managementFacet.returnPlayerResearchedTech(
          4,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.false;

        //mining without buff
        let beforeMining = await buildingsFacet.getPlanetResources(planetId, 0);
        await buildingsFacet.connect(randomUser).mineResources(planetId);
        let afterMining = await buildingsFacet.getPlanetResources(planetId, 0);

        const minedAmountMetalUnbuffed = afterMining.sub(beforeMining);

        //advance by one hour to mine again
        await advanceTimeAndBlockByAmount(60 * 60);

        // User researches Enhanced Planetary Mining
        await managementFacet.connect(randomUser).researchTech(4, 4, planetId); // TechId, TechTree, PlanetId

        // Verify the tech is now researched
        hasResearched = await managementFacet.returnPlayerResearchedTech(
          4,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.true;

        //mining without buff
        beforeMining = await buildingsFacet.getPlanetResources(planetId, 0);
        await buildingsFacet.connect(randomUser).mineResources(planetId);
        afterMining = await buildingsFacet.getPlanetResources(planetId, 0);

        const minedAmountMetalBuffed = afterMining.sub(beforeMining);

        // Check if mining output increased after research by 20%
        expect(minedAmountMetalBuffed).to.be.equal(
          minedAmountMetalUnbuffed.mul(120).div(100)
        );
      });

      it("User can research Aether Mining Technology and mine Aether on their Planets 50% of the time", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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
          managementFacet.connect(randomUser).researchTech(5, 4, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        ); // TechId, TechTree, PlanetId

        // Research prerequisite technlogy [Enhanced Planetary Mining [ID 4]] first
        await managementFacet.connect(randomUser).researchTech(4, 4, planetId); // Enhanced Planetary Mining

        //advance 24hours research cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 24 + 60);

        // Research Aether Mining Technology
        await managementFacet.connect(randomUser).researchTech(5, 4, planetId); // TechId, TechTree, PlanetId

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
          await buildingsFacet.connect(randomUser).mineResources(planetId);

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
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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
        await managementFacet.connect(randomUser).researchTech(4, 4, planetId); // Enhanced Planetary Mining
        //advance 24hours cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 24 + 60);

        // Research  prerequisite technlogy [Aether Mining Technology [ID 5]] first
        await managementFacet.connect(randomUser).researchTech(5, 4, planetId); // TechId, TechTree, PlanetId

        //advance 72hours cooldown
        await advanceTimeAndBlockByAmount(60 * 60 * 72 + 60);

        // Simulate mining multiple times to account for 50% chance
        let aetherMined = false;
        for (let i = 0; i < 30; i++) {
          await buildingsFacet.connect(randomUser).mineResources(planetId);

          await ethers.provider.send("evm_mine", [
            1200000 * 444485 + (i + 1) * 10000,
          ]);
          const aetherBalance = await buildingsFacet.getAetherPlayer(
            randomUser.address
          );
          if (aetherBalance.gt(ethers.BigNumber.from("0"))) {
            aetherMined = true;
            break;
          }
        }

        await managementFacet.connect(randomUser).researchTech(6, 4, planetId); // TechId, TechTree, PlanetId

        // Verify the tech is now researched
        const hasResearchedAetherTech =
          await managementFacet.returnPlayerResearchedTech(
            6,
            4,
            randomUser.address
          );
        expect(hasResearchedAetherTech).to.be.true;

        // Aether should be mined 100% of the time now

        await buildingsFacet.connect(randomUser).mineResources(planetId);

        const aetherBalance = await buildingsFacet.getAetherPlayer(
          randomUser.address
        );
        if (aetherBalance.gt(ethers.BigNumber.from("0"))) {
          aetherMined = true;
        }

        // Check if Aether was mined
        expect(aetherMined).to.be.true;
      });

      it("Enhanced Asteroid Mining Yield increases Users asteroid mining output by 10%", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //outmining without buff:
        let beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10);

        const resolveOutmining = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(1);

        let afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let unbuffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // check that asteroid mining was successful

        // Check if the user has already researched the tech
        let hasResearched = await managementFacet.returnPlayerResearchedTech(
          7,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.false;

        // User researches Enhanced Planetary Mining
        await managementFacet.connect(randomUser).researchTech(7, 4, planetId); // TechId, TechTree, PlanetId

        // Verify the tech is now researched
        hasResearched = await managementFacet.returnPlayerResearchedTech(
          7,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.true;

        //outmining with buff:
        beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10000);

        const resolveOutminingBuffed = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(2);

        afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let buffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // Check if asteroid mining output increased after research by 10%
        expect(buffedAsteroidMetalGain).to.be.equal(
          unbuffedAsteroidMetalGain.mul(110).div(100)
        );
      });

      it("Rapid Asteroid Mining Procedures accelerates Users asteroid mining speed by 25% (6hours faster)", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //should revert if below unbuffed mining time;

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);

        //advance by 22hours, should revert since mining time alone is 24h
        await advanceTimeAndBlockByAmount(60 * 60 * 22);

        expect(
          shipsFacet.connect(randomUser).resolveOutMining(1)
        ).to.be.revertedWith("ShipsFacet: Mining hasnt concluded yet!");

        let travelTime = Number(
          await shipsFacet.checkTravelTime(planetId, 215, 0)
        );

        //advance by 2hours + travelTime ( 24h mining time+ travelTime)
        await advanceTimeAndBlockByAmount(60 * 60 * 3 + travelTime + 60);

        await shipsFacet.connect(randomUser).resolveOutMining(1);

        // User researches Enhanced Planetary Mining
        await managementFacet.connect(randomUser).researchTech(7, 4, planetId); // TechId, TechTree, PlanetId

        //advance by 2 days
        await advanceTimeAndBlockByAmount(60 * 60 * 24 * 2);

        // User researches  Rapid Asteroid Mining Procedures
        await managementFacet.connect(randomUser).researchTech(8, 4, planetId); // TechId, TechTree, PlanetId

        // Check if the user has already researched the tech
        let hasResearched = await managementFacet.returnPlayerResearchedTech(
          8,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.true;

        //outmining with speed buff:
        let beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);

        //advance by 10hours, should revert ( pure mining time should be 18h )
        await advanceTimeAndBlockByAmount(60 * 60 * 10);

        expect(
          shipsFacet.connect(randomUser).resolveOutMining(2)
        ).to.be.revertedWith("ShipsFacet: Mining hasnt concluded yet!");

        //advance by 8 hours + travel time ( total 18h + travelTime)
        await advanceTimeAndBlockByAmount(60 * 60 * 8 + travelTime + 60);

        await shipsFacet.connect(randomUser).resolveOutMining(2);

        let afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        expect(beforeAsteroidMining).to.be.below(afterAsteroidMining);
        //console.log(unbuffedAsteroidMetalGain);
        //console.log(buffedAsteroidMetalGain);
      });

      it("Advanced Asteroid Mining Extraction increases Users asteroid mining output by another 20%", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //outmining without buff:
        let beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10);

        const resolveOutmining = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(1);

        let afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let unbuffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // check that asteroid mining was successful

        // User researches Enhanced Planetary Mining
        await managementFacet.connect(randomUser).researchTech(7, 4, planetId); // TechId, TechTree, PlanetId

        //outmining with buff:
        beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10000);

        const resolveOutminingBuffed = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(2);

        afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let buffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // Check if mining output increased after research by 10%
        expect(buffedAsteroidMetalGain).to.be.equal(
          unbuffedAsteroidMetalGain.mul(110).div(100)
        );

        await managementFacet.connect(randomUser).researchTech(8, 4, planetId); // TechId, TechTree, PlanetId

        await advanceTimeAndBlock(10000);

        // User researches Advanced Asteroid Resource Extraction 20% buff
        await managementFacet.connect(randomUser).researchTech(9, 4, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        // Verify the tech is now researched
        let hasResearched = await managementFacet.returnPlayerResearchedTech(
          9,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.true;

        //outmining with buff:
        beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10000);

        await shipsFacet.connect(randomUser).resolveOutMining(3);

        afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        buffedAsteroidMetalGain = afterAsteroidMining.sub(beforeAsteroidMining);

        // Check if mining output increased after research by 10%
        expect(buffedAsteroidMetalGain).to.be.equal(
          unbuffedAsteroidMetalGain.mul(130).div(100)
        );
      });

      it("Miner Ship Combat Deputization doubles Users newly built Mining Ships Combat Capabilities", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //outmining without buff:
        let beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10);

        const resolveOutmining = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(1);

        let afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let unbuffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // check that asteroid mining was successful

        // User researches Enhanced Planetary Mining
        await managementFacet.connect(randomUser).researchTech(7, 4, planetId); // TechId, TechTree, PlanetId

        //outmining with buff:
        beforeAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet
          .connect(randomUser)
          .startOutMining(planetId, 215, [shipIdPlayer1]);
        await advanceTimeAndBlock(10000);

        const resolveOutminingBuffed = await shipsFacet
          .connect(randomUser)
          .resolveOutMining(2);

        afterAsteroidMining = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let buffedAsteroidMetalGain =
          afterAsteroidMining.sub(beforeAsteroidMining);

        // Check if mining output increased after research by 10%
        expect(buffedAsteroidMetalGain).to.be.equal(
          unbuffedAsteroidMetalGain.mul(110).div(100)
        );

        await managementFacet.connect(randomUser).researchTech(8, 4, planetId); // TechId, TechTree, PlanetId

        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(9, 4, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        // User researches  Miner Ship Combat Deputization for Doubling of Combat Stats
        await managementFacet.connect(randomUser).researchTech(10, 4, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        // Verify the tech is now researched
        let hasResearched = await managementFacet.returnPlayerResearchedTech(
          10,
          4,
          randomUser.address
        );
        expect(hasResearched).to.be.true;

        //craft buffed Miner Ship
        await craftAndClaimFleet(randomUser, 7, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        expect(statsAfterResearch.health).to.be.above(
          statsBeforeResearch.health
        );
        expect(statsAfterResearch.defenseTypes[0]).to.be.above(
          statsBeforeResearch.defenseTypes[0]
        );
      });
    });

    describe("Military Tech Tree", function () {
      //@TODO reimplement testing
      it.skip("Civilian Defense Mobilization Research reduces the malus by 50%", async function () {});
      //@TODO reimplement testing
      it.skip("Defensive Infrastructure Enhancement Research increases Users Buildings Defense by 10%", async function () {});

      it("Fleet Defense Coordination Drills Research increases Users newly built Ships Defense by 10%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //check if prerequisite for Ship Attack Enhancement works correctly
        expect(
          managementFacet.connect(randomUser).researchTech(3, 2, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        );

        //asteroid mine enough aether for advanced research
        for (let i = 0; i < 30; i++) {
          await shipsFacet
            .connect(randomUser)
            .startOutMining(planetId, 215, [shipIdPlayer1]);
          await advanceTimeAndBlock(100);

          await shipsFacet.connect(randomUser).resolveOutMining(1 + i);
        }

        await managementFacet.connect(randomUser).researchTech(1, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(2, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(3, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //craft buffed  Ship
        await craftAndClaimFleet(randomUser, 7, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        expect(statsAfterResearch.defenseTypes[0]).to.be.above(
          statsBeforeResearch.defenseTypes[0]
        );

        //attack should be raised by 10%
        expect(
          statsBeforeResearch.defenseTypes[0].mul(110).div(100)
        ).to.be.equal(statsAfterResearch.defenseTypes[0]);
      });

      it("Elite Naval Defense Tactics Research increases Users newly built Ships Defense by another 10%, totalling 20%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 3);
        await advanceTimeAndBlock(100);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //check if prerequisite for Ship Attack Enhancement works correctly
        expect(
          managementFacet.connect(randomUser).researchTech(3, 2, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        );

        //asteroid mine enough aether for advanced research
        for (let i = 0; i < 100; i++) {
          await shipsFacet
            .connect(randomUser)
            .startOutMining(planetId, 215, [
              shipIdPlayer1,
              shipIdPlayer1.add(1),
              shipIdPlayer1.add(2),
            ]);
          await advanceTimeAndBlock(100);

          await shipsFacet.connect(randomUser).resolveOutMining(1 + i);
        }

        await managementFacet.connect(randomUser).researchTech(1, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(2, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(3, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(4, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //craft buffed  Ship
        await craftAndClaimFleet(randomUser, 7, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          3
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        expect(statsAfterResearch.defenseTypes[0]).to.be.above(
          statsBeforeResearch.defenseTypes[0]
        );

        //attack should be raised by 10%
        expect(statsAfterResearch.defenseTypes[0]).to.be.equal(
          statsBeforeResearch.defenseTypes[0].mul(120).div(100)
        );
      });

      it("Ship Health Enhancement Research increases Users newly built Ships Health by 10%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 1, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        await managementFacet.connect(randomUser).researchTech(5, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //craft buffed Miner Ship
        await craftAndClaimFleet(randomUser, 1, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        expect(statsAfterResearch.health).to.be.above(
          statsBeforeResearch.health
        );
      });

      it("Ship Attack Enhancement Research increases Users newly built Ships Attack by 10%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 1, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        //check if prerequisite for Ship Attack Enhancement works correctly
        expect(
          managementFacet.connect(randomUser).researchTech(6, 2, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        );

        await managementFacet.connect(randomUser).researchTech(5, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(6, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //craft buffed Miner Ship
        await craftAndClaimFleet(randomUser, 1, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        expect(statsAfterResearch.attackTypes[0]).to.be.above(
          statsBeforeResearch.attackTypes[0]
        );

        //attack should be raised by 10%
        expect(
          statsBeforeResearch.attackTypes[0].mul(110).div(100)
        ).to.be.equal(statsAfterResearch.attackTypes[0]);
      });

      //@TODO reimplement testing
      it.skip("Fleetsize Combat Debuff Reduction Research reduces the malus by 50%", async function () {});

      it("Advanced Ship Weaponry Research increases Users newly built Ships Attack by another 10%, total by 20%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

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

        await craftAndClaimShipyard(randomUser, planetId);

        await craftAndClaimFleet(randomUser, 7, planetId, 1);
        await craftAndClaimFleet(randomUser, 1, planetId, 1);
        await advanceTimeAndBlock(1);
        const shipIdPlayer1Miner = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          1
        );

        //check if prerequisite for Ship Attack Enhancement works correctly
        expect(
          managementFacet.connect(randomUser).researchTech(6, 2, planetId)
        ).to.be.revertedWith(
          "ManagementFacet: prerequisite tech not researched"
        );

        await managementFacet.connect(randomUser).researchTech(5, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await managementFacet.connect(randomUser).researchTech(6, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //asteroid mine enough aether for advanced research
        for (let i = 0; i < 30; i++) {
          await shipsFacet
            .connect(randomUser)
            .startOutMining(planetId, 215, [shipIdPlayer1Miner]);
          await advanceTimeAndBlock(100);

          await shipsFacet.connect(randomUser).resolveOutMining(1 + i);
        }

        await managementFacet.connect(randomUser).researchTech(7, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        await buildingsFacet.connect(randomUser).mineResources(planetId);

        await managementFacet.connect(randomUser).researchTech(8, 2, planetId); // TechId, TechTree, PlanetId
        await advanceTimeAndBlock(10000);

        //craft buffed Miner Ship
        await craftAndClaimFleet(randomUser, 1, planetId, 1);

        const shipIdPlayer1buffed = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          2
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        const statsAfterResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1buffed
        );

        //attack should be raised by 10%
        expect(
          statsBeforeResearch.attackTypes[0].mul(120).div(100)
        ).to.be.equal(statsAfterResearch.attackTypes[0]);
      });
    });

    describe("Governance Tech Tree", function () {
      it("Rapid Infrastructure Development Research reduces building craft time by 10%", async function () {
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
          .craftBuilding(buildingTypeToCraft, planetId, buildingAmountToCraft);

        // Get the craft time for comparison
        let craftItemWithoutTech = await buildingsFacet.getCraftBuildings(
          planetId
        );
        let standardCraftTime = craftItemWithoutTech.craftTimeItem;

        // Advance time and claim the building
        const timestampBefore = await ethers.provider.getBlock("latest");
        const timeToAdvance = craftItemWithoutTech.readyTimestamp.sub(
          timestampBefore.timestamp
        );
        await advanceTimeAndBlock(timeToAdvance.toNumber());
        await buildingsFacet.connect(randomUser).claimBuilding(planetId);

        // Research the "Rapid Infrastructure Development" tech
        await managementFacet.connect(randomUser).researchTech(1, 3, planetId); // TechId 1 in Governance Tech Tree // TechId, TechTree, PlanetId

        // Craft another building after researching the tech
        await buildingsFacet
          .connect(randomUser)
          .craftBuilding(buildingTypeToCraft, planetId, buildingAmountToCraft);

        // Get the new craft time
        let craftItemWithTech = await buildingsFacet.getCraftBuildings(
          planetId
        );
        let reducedCraftTime = craftItemWithTech.craftTimeItem;

        let researchCooldown =
          await managementFacet.returnPlayerResearchCooldown(
            randomUser.address
          );

        // Compare the craft times
        expect(reducedCraftTime.lt(standardCraftTime)).to.be.true;
      });

      it("Fleet Fabrication Mastery Research reduces building craft time by 10%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

        await registerUser(randomUser);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        await craftAndClaimShipyard(randomUser, planetId);
        const buildingTypeToCraft = 2; // Example building type
        const buildingAmountToCraft = 1; // Crafting one building

        // Craft a building without the tech
        await buildingsFacet
          .connect(randomUser)
          .craftBuilding(buildingTypeToCraft, planetId, buildingAmountToCraft);

        //resource cost before

        let beforeFleetCraftUnbuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

        let afterFleetCraftUnbuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let UnbuffedCostMetal = beforeFleetCraftUnbuffed.sub(
          afterFleetCraftUnbuffed
        );
        //resource cost after calc diff

        // Get the craft time for comparison
        let craftItemWithoutTech = await shipsFacet.getCraftFleets(planetId);

        let standardCraftTime = craftItemWithoutTech.craftTimeItem;

        await advanceTimeAndBlock(100);

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        await buildingsFacet.connect(randomUser).claimBuilding(planetId);

        // Research the "Rapid Infrastructure Development" tech
        await managementFacet.connect(randomUser).researchTech(1, 3, planetId); // TechId 1 in Governance Tech Tree // TechId, TechTree, PlanetId

        await advanceTimeAndBlock(100);
        await advanceTimeAndBlock(100);
        // Research the "Fleet Fabrication Mastery" tech
        await managementFacet.connect(randomUser).researchTech(2, 3, planetId); // TechId 1 in Governance Tech Tree // TechId, TechTree, PlanetId

        //resource cost before

        let beforeFleetCraftBuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);
        //resource cost after calc diff

        let afterFleetCraftBuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let BuffedCostMetal = beforeFleetCraftBuffed.sub(afterFleetCraftBuffed);

        // Get the new craft time
        let craftItemWithTech = await shipsFacet.getCraftFleets(planetId);
        let reducedCraftTime = craftItemWithTech.craftTimeItem;

        // Compare the craft times
        expect(reducedCraftTime.lt(standardCraftTime)).to.be.true;
      });

      it("Resource-Savvy Constructions Research reduces ships resource craft cost by 10%", async function () {
        const { randomUser } = await loadFixture(deployUsers);

        await registerUser(randomUser);

        const planetId = await planetNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        await craftAndClaimShipyard(randomUser, planetId);
        const buildingTypeToCraft = 2; // Example building type
        const buildingAmountToCraft = 1; // Crafting one building

        // Craft a building without the tech
        await buildingsFacet
          .connect(randomUser)
          .craftBuilding(buildingTypeToCraft, planetId, buildingAmountToCraft);

        //resource cost before

        let beforeFleetCraftUnbuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);

        let afterFleetCraftUnbuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let UnbuffedCostMetal = beforeFleetCraftUnbuffed.sub(
          afterFleetCraftUnbuffed
        );
        //resource cost after calc diff

        // Get the craft time for comparison
        let craftItemWithoutTech = await shipsFacet.getCraftFleets(planetId);

        let standardCraftTime = craftItemWithoutTech.craftTimeItem;

        await advanceTimeAndBlock(100);

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        await buildingsFacet.connect(randomUser).claimBuilding(planetId);

        // Research the "Rapid Infrastructure Development" tech
        await managementFacet.connect(randomUser).researchTech(1, 3, planetId); // TechId 1 in Governance Tech Tree // TechId, TechTree, PlanetId

        await advanceTimeAndBlock(200);

        // Research the "Fleet Fabrication Mastery" tech
        await managementFacet.connect(randomUser).researchTech(2, 3, planetId); // TechId 2 in Governance Tech Tree // TechId, TechTree, PlanetId

        await advanceTimeAndBlock(200);

        const shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );
        //asteroid mine enough aether for advanced research
        for (let i = 0; i < 150; i++) {
          await shipsFacet
            .connect(randomUser)
            .startOutMining(planetId, 215, [shipIdPlayer1]);
          await advanceTimeAndBlock(100);

          await shipsFacet.connect(randomUser).resolveOutMining(1 + i);
        }

        // Research the "Resource-Savvy Constructions" tech
        await managementFacet.connect(randomUser).researchTech(3, 3, planetId); // TechId 3 in Governance Tech Tree // TechId, TechTree, PlanetId

        //resource cost before

        let beforeFleetCraftBuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        await shipsFacet.connect(randomUser).craftFleet(7, planetId, 1);
        //resource cost after calc diff

        let afterFleetCraftBuffed = await buildingsFacet.getPlanetResources(
          planetId,
          0
        );

        let BuffedCostMetal = beforeFleetCraftBuffed.sub(afterFleetCraftBuffed);

        // Get the new craft time
        let craftItemWithTech = await shipsFacet.getCraftFleets(planetId);
        let reducedCraftTime = craftItemWithTech.craftTimeItem;

        // Compare the craft times
        expect(reducedCraftTime.lt(standardCraftTime)).to.be.true;

        expect(BuffedCostMetal).to.be.below(UnbuffedCostMetal);
      });
    });

    describe.skip("Ships Tech Tree", function () {
      it("User can research Technology and buff their ships", async function () {
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

        const blockBefore = await ethers.provider.getBlock(
          await ethers.provider.getBlockNumber()
        );

        const timestampBefore = blockBefore.timestamp;

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 1]);

        const claimBuild = await buildingsFacet
          .connect(randomUser)
          .claimBuilding(planetId);

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

        let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );

        expect(checkOwnershipShipsPlayer).to.equal(0);

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 2]);

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );

        expect(checkOwnershipShipsPlayer).to.equal(1);

        let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 3]);

        await managementFacet.connect(randomUser).researchTech(1, 1, planetId); // TechId, TechTree, PlanetId

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
        const { owner, randomUser, randomUserTwo, randomUserThree, AdminUser } =
          await loadFixture(deployUsers);

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

        await buildingsFacet.connect(randomUser).craftBuilding(10, planetId, 1);

        const blockBefore = await ethers.provider.getBlock(
          await ethers.provider.getBlockNumber()
        );

        const timestampBefore = blockBefore.timestamp;

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 1]);

        const claimBuild = await buildingsFacet
          .connect(randomUser)
          .claimBuilding(planetId);

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

        let checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );

        expect(checkOwnershipShipsPlayer).to.equal(0);

        //research first one
        await managementFacet.connect(randomUser).researchTech(2, 1, planetId); // TechId, TechTree, PlanetId

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 2]);

        await shipsFacet.connect(randomUser).claimFleet(planetId);

        checkOwnershipShipsPlayer = await shipNfts.balanceOf(
          randomUser.address
        );

        expect(checkOwnershipShipsPlayer).to.equal(1);

        let shipIdPlayer1 = await shipNfts.tokenOfOwnerByIndex(
          randomUser.address,
          0
        );

        const statsBeforeResearch = await shipsFacet.getShipStatsDiamond(
          shipIdPlayer1
        );

        await shipsFacet.connect(randomUser).craftFleet(1, planetId, 1);

        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 3]);

        //cooldown research
        await ethers.provider.send("evm_mine", [timestampBefore + 120000 * 12]);
        await managementFacet.connect(randomUser).researchTech(3, 1, planetId); // TechId, TechTree, PlanetId

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
    });
  });
});

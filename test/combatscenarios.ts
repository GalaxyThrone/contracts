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
} from "../typechain-types";
import { BigNumber, Signer, BigNumberish } from "ethers";

import { Provider } from "@ethersproject/abstract-provider";

import { PromiseOrValue } from "../typechain-types/common";

const chalk = require("chalk");

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe.skip("Combat Mechanics Testing", function () {
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

    await adminFacet.startInit(20, 1);
  });

  describe("Combat Balance Testing", function () {
    it("scenario 1: user1 attacks with 10 Bombers against 1 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 1;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.equal(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });

    it("scenario 1.1: user1 attacks with 10 Bombers against 2 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 2;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.equal(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });

    it("scenario 1.2: user1 attacks with 10 Bombers against 3 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 3;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });

    it("scenario 1.3: user1 attacks with 10 Bombers against 4 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 4;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });
    it("scenario 1.4: user1 attacks with 10 Bombers against 5 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 5;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });
    it("scenario 1.5: user1 attacks with 10 Bombers against 7 Capital Destroyer and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 7;
      const attackerType = { name: "Bomber (Type 6)", id: 6 };
      const defenderType = {
        name: "Capital-Class Destroyer (Type 10)",
        id: 10,
      };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });
    it("scenario 2: user1 attacks with 10 Raiders against 10 Bombers and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 10;
      const attackerType = { name: "Raiders (Type 4)", id: 4 };
      const defenderType = { name: "Bomber (Type 6)", id: 6 };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.equal(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });

    it("scenario 3: user1 attacks with 10 Raiders against 3 warships and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 3;
      const attackerType = { name: "Raiders (Type 4)", id: 4 };
      const defenderType = { name: "Warship (Type 5)", id: 5 };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });

    it("scenario 3.1: user1 attacks with 10 Raiders against 4 warships and ? entire fleet", async function () {
      const { randomUser, randomUserTwo } = await loadFixture(
        deployUsers
      );

      const attackerUnits = 10;
      const defenderUnits = 4;
      const attackerType = { name: "Raiders (Type 4)", id: 4 };
      const defenderType = { name: "Warship (Type 5)", id: 5 };

      // Setup user1 with 1 building and 10 ships of type 4
      await setupUser(randomUser, 1, [
        { type: attackerType.id, quantity: attackerUnits },
      ]);

      // Setup user2 with 1 building and 10 ships of type 6
      await setupUser(randomUserTwo, 1, [
        { type: defenderType.id, quantity: defenderUnits },
      ]);

      // Get the initial planet for each user
      const planetIdPlayer1 = await planetNfts.tokenOfOwnerByIndex(
        await randomUser.getAddress(),
        0
      );
      const planetIdPlayer2 = await planetNfts.tokenOfOwnerByIndex(
        await randomUserTwo.getAddress(),
        0
      );

      // Get the ships for each player
      const shipIdsPlayer1 = await getShipIdsForOwner(randomUser);
      const shipIdsPlayer2 = await getShipIdsForOwner(randomUserTwo);

      // User1 attacks user2 with all ships
      await sendAttack(
        randomUser,
        planetIdPlayer1,
        planetIdPlayer2,
        shipIdsPlayer1
      );

      // Get the cost for each player's fleet
      let attackerCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];
      let defenderCost = [
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(0),
      ];

      for (let shipId of shipIdsPlayer1) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          attackerCost[i] = attackerCost[i].add(stats.price[i]);
        }
      }

      for (let shipId of shipIdsPlayer2) {
        let stats = await shipsFacet.getShipStatsDiamond(shipId);
        for (let i = 0; i < 4; i++) {
          defenderCost[i] = defenderCost[i].add(stats.price[i]);
        }
      }

      // Advance time and resolve the attack
      await advanceTimeAndBlock(400);
      const attackResolveReceipt = await fightingFacet
        .connect(randomUser)
        .resolveAttack(1);
      await attackResolveReceipt.wait();

      // Assert that user1 has won, and has therefore kept all ships
      const shipsOwnedByPlayer1 = await getShipIdsForOwner(
        randomUser
      );

      // Assert player2 still has ships
      const checkOwnershipShipsPlayer = await shipNfts.balanceOf(
        randomUser.address
      );

      // Assert that user2 has lost, and has therefore lost all ships
      const shipsOwnedByPlayer2 = await getShipIdsForOwner(
        randomUserTwo
      );
      expect(shipsOwnedByPlayer2.length).to.be.above(0);

      // Generate ASCII Art
      console.log(
        `\n${chalk.blue(
          "+----------------- ATTACKERS -----------------+"
        )}    ${chalk.red(
          "+----------------- DEFENDERS -----------------+"
        )}`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `|   ${chalk.green(attackerUnits)} x ${chalk.cyan(
          attackerType.name
        )}                     |    |   ${chalk.green(
          defenderUnits
        )} x ${chalk.cyan(defenderType.name)}                      |`
      );
      console.log(
        `|       __                                    |    |       __                                    |`
      );
      console.log(
        `|     >('')____,                              |    |     >('')____,                              |`
      );
      console.log(
        `|      (\` =~~/                                |    |      (\` =~~/                                |`
      );
      console.log(
        `|   ^^^^\`---' ^^^                             |    |   ^^^^\`---' ^^^                             |`
      );
      console.log(
        `|                                             |    |                                             |`
      );
      console.log(
        `${chalk.blue(
          "+---------------------------------------------+"
        )}    ${chalk.red(
          "+---------------------------------------------+"
        )}`
      );

      const ASCII_Art_Result = (
        numShipsPlayer1: number,
        numShipsPlayer2: number,
        attackerCost: BigNumber[],
        defenderCost: BigNumber[]
      ) => {
        console.log(
          `\n+------------ ${chalk.yellow("RESULT")} -----------+`
        );
        console.log(
          `|   ${chalk.cyan("Player 1")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer1)} | ${chalk.red(
            "Cost"
          )}: ${attackerCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(
          `|   ${chalk.cyan("Player 2")} | ${chalk.green(
            "Ships Remaining"
          )}: ${chalk.magenta(numShipsPlayer2)} | ${chalk.red(
            "Cost"
          )}: ${defenderCost.map((cost) =>
            parseInt(ethers.utils.formatEther(cost))
          )}   |`
        );
        console.log(`+-------------------------------+`);
      };
      ASCII_Art_Result(
        shipsOwnedByPlayer1.length,
        shipsOwnedByPlayer2.length,
        attackerCost,
        defenderCost
      );
    });
  });
});

import { Signer } from "@ethersproject/abstract-signer";
import { ethers, upgrades } from "hardhat";
import {
  DiamondCutFacet,
  DiamondInit__factory,
  Diamond__factory,
  OwnershipFacet,
  AdminFacet,
  Metal,
  Crystal,
  Antimatter,
  Planets,
  Ships,
  Commanders,
  VRFFacet,
  RegisterFacet,
  AutomationFacet,
  AllianceFacet,
  FightingFacet,
  ManagementFacet,
  Aether,
} from "../typechain-types";
import { addBuildings } from "./addBuildings";
import { addFleets } from "./addFleets";
import { addFaction, addShipModules } from "./addShipModules";

import { addShipTechLevels } from "./addResearchTreesShips";
import { addMilitaryTechLevels } from "./addResearchTreesMilitary";
import { addUtilityTechLevels } from "./addResearchTreesUtility";
import { addGovernanceTechLevels } from "./addResearchTreesGovernance";

const {
  getSelectors,
  FacetCutAction,
} = require("./libraries/diamond");

// const gasPrice = 35000000000;

export async function deployDiamond(logOutput: boolean = true) {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();
  log("Deployer: " + deployerAddress);
  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory(
    "DiamondCutFacet"
  );
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  log("DiamondCutFacet deployed: " + diamondCutFacet.address);

  // deploy Diamond
  const Diamond = (await ethers.getContractFactory(
    "Diamond"
  )) as Diamond__factory;
  const diamond = await Diamond.deploy(
    deployerAddress,
    diamondCutFacet.address
  );
  await diamond.deployed();
  log("Diamond deployed: " + diamond.address);

  // deploy DiamondInit
  const DiamondInit = (await ethers.getContractFactory(
    "DiamondInit"
  )) as DiamondInit__factory;
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  log("DiamondInit deployed: " + diamondInit.address);

  // deploy facets
  log("");
  log("Deploying facets");
  const FacetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "AdminFacet",
    "BuildingsFacet",
    "ShipsFacet",
    "RegisterFacet",
    "VRFFacet",
    "AutomationFacet",
    "AllianceFacet",
    "FightingFacet",
    "ManagementFacet",
    "TutorialFacet",
    "CommanderFacet",
  ];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    log(`${FacetName} deployed: ${facet.address}`);
    cut.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet),
    });
  }

  const diamondCut = (await ethers.getContractAt(
    "IDiamondCut",
    diamond.address
  )) as DiamondCutFacet;

  // call to init function
  const functionCall =
    diamondInit.interface.encodeFunctionData("init");
  const tx = await diamondCut.diamondCut(
    cut,
    diamondInit.address,
    functionCall
  );
  log("Diamond cut tx: ", tx.hash);
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  log("Completed diamond cut");

  const ownershipFacet = (await ethers.getContractAt(
    "OwnershipFacet",
    diamond.address
  )) as OwnershipFacet;
  const diamondOwner = await ownershipFacet.owner();
  log("Diamond owner is:", diamondOwner);

  if (diamondOwner !== deployerAddress) {
    throw new Error(
      `Diamond owner ${diamondOwner} is not deployer address ${deployerAddress}!`
    );
  }

  log("deploying Metal");
  const Metal = await ethers.getContractFactory("Metal");
  const metal = (await upgrades.deployProxy(Metal, [
    diamond.address,
  ])) as Metal;
  await metal.deployed();

  log("deploying Crystal");
  const Crystal = await ethers.getContractFactory("Crystal");
  const crystal = (await upgrades.deployProxy(Crystal, [
    diamond.address,
  ])) as Crystal;
  await crystal.deployed();

  log("deploying Antimatter");
  const Antimatter = await ethers.getContractFactory("Antimatter");
  const antimatter = (await upgrades.deployProxy(Antimatter, [
    diamond.address,
  ])) as Antimatter;
  await antimatter.deployed();

  log("deploying Aether");
  const Aether = await ethers.getContractFactory("Aether");
  const aether = (await upgrades.deployProxy(Aether, [
    diamond.address,
  ])) as Aether;
  await aether.deployed();

  log("deploying Planets");
  const Planets = await ethers.getContractFactory("Planets");
  const planets = (await upgrades.deployProxy(Planets, [
    diamond.address,
  ])) as Planets;
  await planets.deployed();

  //@notice deploy ships contract instead of Ships
  log("deploying Ships");
  const Ships = await ethers.getContractFactory("Ships");
  const ships = (await upgrades.deployProxy(Ships, [
    diamond.address,
  ])) as Ships;
  await ships.deployed();

  log("deploying Commanders");
  const Commanders = await ethers.getContractFactory("Commanders");
  const commanders = (await upgrades.deployProxy(Commanders, [
    diamond.address,
  ])) as Commanders;
  await commanders.deployed();

  log(`Metal deployed: ${metal.address}`);
  log(`Crystal deployed: ${crystal.address}`);
  log(`Antimatter deployed: ${antimatter.address}`);
  log(`Aether deployed: ${aether.address}`);
  log(`Planets deployed: ${planets.address}`);
  log(`Ships deployed: ${ships.address}`);
  log(`Commanders deployed: ${commanders.address}`);
  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamond.address
  )) as AdminFacet;

  // log("deploying GovernanceToken");
  // const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  // //founders governance tokens go to multisig addr
  // const deployedGovernanceToken = GovernanceToken.deploy("0xbc1FF4455b21245Df6ca01354d65Aaf9e5334aD8",diamond.address) as GovernanceToken;
  // await deployedGovernanceToken.deployed();

  //@TODO this should be dynamically set on the adminFacet.

  //@notice Chainlink Automation Address
  const chainRunner = "0x420698c552B575ca34F0593915C3A25f77d45b1e";
  log("setting diamond addresses");
  const setAddresses = await adminFacet.setAddresses(
    crystal.address,
    antimatter.address,
    metal.address,
    aether.address,
    ships.address,
    planets.address,
    chainRunner,
    commanders.address
  );
  await setAddresses.wait();

  log("adding buildings");
  await addBuildings(diamond.address);
  log("adding ships");
  await addFleets(diamond.address);
  await addShipModules(diamond.address);
  log("adding shipTech Research Tree, ID 1");
  await addShipTechLevels(diamond.address);
  log("adding Military Research Tree, ID 2");
  await addMilitaryTechLevels(diamond.address);

  log("adding Governance Research Tree, ID 3 ");
  await addGovernanceTechLevels(diamond.address);
  log("adding Utility Research Tree, ID 4");
  await addUtilityTechLevels(diamond.address);
  log("adding Factions");
  await addFaction(diamond.address, 4);

  log("starting init");

  //planetType 0 is undiscovered.

  //planetType 2 is a Tradehub planet, which cannot be transformed or attacked.

  log("Tradehub Planet Gen");
  const genesisPlanets = await adminFacet.startInit(1, 2);

  log("Starting Planet Gen");
  //main one, first 50 are deterministic
  for (let i = 0; i < 20; i++) {
    const initPlanets = await adminFacet.startInit(8, 0);

    //@notice this the chance for an asteroid belt hub to appear
    if (Math.random() < 0.2) {
      const initBelts = await adminFacet.startInit(2, 1);
      await initBelts.wait();
    } else {
      const initPlanets2 = await adminFacet.startInit(2, 0);
      await initPlanets2.wait();
    }
    await initPlanets.wait();
  }

  console.log(
    "Game Diamond,Facets and Game Setup successfully deployed and executed!"
  );

  return {
    diamondAddress: diamond.address,
    metalAddress: metal.address,
    crystalAddress: crystal.address,
    antimatterAddress: antimatter.address,
    planetsAddress: planets.address,
    shipsAddress: ships.address,
    aetherAddress: aether.address,
  };

  function log(message: string): void {
    if (logOutput) {
      console.log(message);
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

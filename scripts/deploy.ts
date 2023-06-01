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
  Buildings,
  VRFFacet,
  RegisterFacet,
  AutomationFacet,
  AllianceFacet,
  FightingFacet,
  Aether,
} from "../typechain-types";
import { addBuildings } from "./addBuildings";
import { addFleets } from "./addFleets";
import { addFaction, addShipModules } from "./addShipModules";
import { initPlanets } from "./initPlanets";
import { addLevels } from "./addLevelData";

const {
  getSelectors,
  FacetCutAction,
} = require("./libraries/diamond");

// const gasPrice = 35000000000;

export async function deployDiamond() {
  const accounts: Signer[] = await ethers.getSigners();
  const deployer = accounts[0];
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);
  // deploy DiamondCutFacet
  const DiamondCutFacet = await ethers.getContractFactory(
    "DiamondCutFacet"
  );
  const diamondCutFacet = await DiamondCutFacet.deploy();
  await diamondCutFacet.deployed();
  console.log("DiamondCutFacet deployed:", diamondCutFacet.address);

  // deploy Diamond
  const Diamond = (await ethers.getContractFactory(
    "Diamond"
  )) as Diamond__factory;
  const diamond = await Diamond.deploy(
    deployerAddress,
    diamondCutFacet.address
  );
  await diamond.deployed();
  console.log("Diamond deployed:", diamond.address);

  // deploy DiamondInit
  const DiamondInit = (await ethers.getContractFactory(
    "DiamondInit"
  )) as DiamondInit__factory;
  const diamondInit = await DiamondInit.deploy();
  await diamondInit.deployed();
  console.log("DiamondInit deployed:", diamondInit.address);

  // deploy facets
  console.log("");
  console.log("Deploying facets");
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
  ];
  const cut = [];
  for (const FacetName of FacetNames) {
    const Facet = await ethers.getContractFactory(FacetName);
    const facet = await Facet.deploy();
    await facet.deployed();
    console.log(`${FacetName} deployed: ${facet.address}`);
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
  console.log("Diamond cut tx: ", tx.hash);
  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Diamond upgrade failed: ${tx.hash}`);
  }
  console.log("Completed diamond cut");

  const ownershipFacet = (await ethers.getContractAt(
    "OwnershipFacet",
    diamond.address
  )) as OwnershipFacet;
  const diamondOwner = await ownershipFacet.owner();
  console.log("Diamond owner is:", diamondOwner);

  if (diamondOwner !== deployerAddress) {
    throw new Error(
      `Diamond owner ${diamondOwner} is not deployer address ${deployerAddress}!`
    );
  }

  console.log("deploying Metal");
  const Metal = await ethers.getContractFactory("Metal");
  const metal = (await upgrades.deployProxy(Metal, [
    diamond.address,
  ])) as Metal;
  await metal.deployed();

  console.log("deploying Crystal");
  const Crystal = await ethers.getContractFactory("Crystal");
  const crystal = (await upgrades.deployProxy(Crystal, [
    diamond.address,
  ])) as Crystal;
  await crystal.deployed();

  console.log("deploying Antimatter");
  const Antimatter = await ethers.getContractFactory("Antimatter");
  const antimatter = (await upgrades.deployProxy(Antimatter, [
    diamond.address,
  ])) as Antimatter;
  await antimatter.deployed();

  console.log("deploying Aether");
  const Aether = await ethers.getContractFactory("Aether");
  const aether = (await upgrades.deployProxy(Aether, [
    diamond.address,
  ])) as Aether;
  await aether.deployed();

  console.log("deploying Planets");
  const Planets = await ethers.getContractFactory("Planets");
  const planets = (await upgrades.deployProxy(Planets, [
    diamond.address,
  ])) as Planets;
  await planets.deployed();

  //@notice deploy ships contract instead of Ships
  console.log("deploying ships");
  const Ships = await ethers.getContractFactory("Ships");
  const ships = (await upgrades.deployProxy(Ships, [
    diamond.address,
  ])) as Ships;
  await ships.deployed();

  console.log("deploying Buildings");
  const Buildings = await ethers.getContractFactory("Buildings");
  const buildings = (await upgrades.deployProxy(Buildings, [
    diamond.address,
  ])) as Buildings;
  await buildings.deployed();

  console.log(`Metal deployed: ${metal.address}`);
  console.log(`Crystal deployed: ${crystal.address}`);
  console.log(`Antimatter deployed: ${antimatter.address}`);
  console.log(`Aether deployed: ${aether.address}`);
  console.log(`Planets deployed: ${planets.address}`);
  console.log(`Buildings deployed: ${buildings.address}`);
  console.log(`Ships deployed: ${ships.address}`);

  const adminFacet = (await ethers.getContractAt(
    "AdminFacet",
    diamond.address
  )) as AdminFacet;

  // console.log("deploying GovernanceToken");
  // const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  // //founders governance tokens go to multisig addr
  // const deployedGovernanceToken = GovernanceToken.deploy("0xbc1FF4455b21245Df6ca01354d65Aaf9e5334aD8",diamond.address) as GovernanceToken;
  // await deployedGovernanceToken.deployed();

  //@TODO this should be dynamically set on the adminFacet.

  //@notice Chainlink Automation Address
  const chainRunner = "0x420698c552B575ca34F0593915C3A25f77d45b1e";
  console.log("setting diamond addresses");
  const setAddresses = await adminFacet.setAddresses(
    crystal.address,
    antimatter.address,
    metal.address,
    aether.address,
    buildings.address,
    ships.address,
    planets.address,
    chainRunner
  );
  await setAddresses.wait();

  console.log("adding buildings");
  await addBuildings(buildings.address);
  console.log("adding ships");
  await addFleets(ships.address);
  await addFleets(diamond.address);
  await addShipModules(diamond.address);
  await addLevels(diamond.address);
  await addFaction(diamond.address, 4);

  console.log("starting init");

  //planetType 0 is undiscovered.
  //the rest should have some meaning
  for (let i = 0; i < 10; i++) {
    const initPlanets = await adminFacet.startInit(19, 0);
    if (Math.random() < 0.15) {
      const initBelts = await adminFacet.startInit(1, 1);
      await initBelts.wait();
    } else {
      const initPlanets2 = await adminFacet.startInit(1, 0);
      await initPlanets2.wait();
    }
    await initPlanets.wait();
  }

  console.log("ALL DONE");

  //@TODO @notice create some planets to assign
  //@TODO currently gives a revert error for no apparent reason
  //@notice added a genesis nft mint to the planet contract instead..

  /*
  const initPlanets = await adminFacet
    .connect(deployer)
    .initPlanets(20);
  await initPlanets.wait();
  */
  return {
    diamondAddress: diamond.address,
    metalAddress: metal.address,
    crystalAddress: crystal.address,
    antimatterAddress: antimatter.address,
    buildingsAddress: buildings.address,
    planetsAddress: planets.address,
    shipsAddress: ships.address,
    aetherAddress: aether.address,
  };
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
function addFactions(address: string, arg1: number) {
  throw new Error("Function not implemented.");
}

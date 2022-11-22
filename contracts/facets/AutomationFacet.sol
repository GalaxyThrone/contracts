// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./FleetsFacet.sol";
import "./BuildingsFacet.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

contract AutomationFacet is Modifiers, AutomationCompatibleInterface {
    //@notice
    //@params   checkData -> what functionality we are checking
    //          currently there are 6 paths
    //          0,1,2 are for mining resources
    //          3 is for claiming completed ships
    //          4 is for claiming completed buildings
    //          5 is for resolving arrived attacks

    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        // path check if buildings are ready to claim

        uint256 metalId = 0;
        uint256 crystalId = 1;
        uint256 ethereusId = 2;
        uint256 craftShipsId = 3;
        uint256 craftBuildingId = 4;
        uint256 resolveAttacksPath = 5;

        uint256 totalPlanetAmount = IPlanets(s.planets).getTotalPlanetCount();

        //@TODO  to be refactored to return arrays to avoid starvation later on.

        //@notice check claim metal
        if (keccak256(checkData) == keccak256(abi.encode(metalId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(
                    i,
                    metalId
                );
                if (block.timestamp > lastClaimed + 8 hours) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check  claim crystal
        if (keccak256(checkData) == keccak256(abi.encode(crystalId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(
                    i,
                    crystalId
                );
                if (block.timestamp > lastClaimed + 8 hours) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check  claim ethereus
        if (keccak256(checkData) == keccak256(abi.encode(ethereusId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(
                    i,
                    ethereusId
                );
                if (block.timestamp > lastClaimed + 8 hours) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check  claim buildings
        if (keccak256(checkData) == keccak256(abi.encode(craftBuildingId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                if (block.timestamp >= s.craftBuildings[i].readyTimestamp) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check  claim ships
        if (keccak256(checkData) == keccak256(abi.encode(craftShipsId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                if (block.timestamp >= s.craftFleets[i].readyTimestamp) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check resolve attacks
        if (keccak256(checkData) == keccak256(abi.encode(resolveAttacksPath))) {
            attackStatus[] memory currentlyRunningAttacks = IPlanets(s.planets)
                .getAllRunningAttacks();

            for (uint256 i = 0; i < currentlyRunningAttacks.length; i++) {
                if (
                    currentlyRunningAttacks[i].timeToBeResolved >=
                    block.timestamp
                ) {
                    return (true, abi.encode(i));
                }
            }
        }

        return (false, abi.encode(address(0)));
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 metalId = 0;
        uint256 crystalId = 1;
        uint256 ethereusId = 2;
        uint256 craftShipsId = 3;
        uint256 craftBuildingPath = 4;
        uint256 resolveAttacksPath = 5;

        uint256 planetId = abi.decode(performData, (uint256));

        //@notice check all mining available on the planet;
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(
            planetId,
            metalId
        );

        if (block.timestamp > lastClaimed + 8 hours) {
            BuildingsFacet(address(this)).mineMetal(planetId);
        }
        lastClaimed = IPlanets(s.planets).getLastClaimed(planetId, crystalId);
        if (block.timestamp > lastClaimed + 8 hours) {
            BuildingsFacet(address(this)).mineCrystal(planetId);
        }
        lastClaimed = IPlanets(s.planets).getLastClaimed(planetId, ethereusId);
        if (block.timestamp > lastClaimed + 8 hours) {
            BuildingsFacet(address(this)).mineEthereus(planetId);
        }

        //@notice check if buildings are available
        uint256 buildingReadyTimestamp = s
            .craftBuildings[planetId]
            .readyTimestamp;

        if (block.timestamp >= buildingReadyTimestamp) {
            BuildingsFacet(address(this)).claimBuilding(planetId);
        }

        //@notice check if ships are available

        uint256 shipReadyTimestamp = s.craftFleets[planetId].readyTimestamp;

        if (block.timestamp >= shipReadyTimestamp) {
            FleetsFacet(address(this)).claimFleet(planetId);
        }

        //@notice check if attack can be resolved

        attackStatus memory attackInstance = IPlanets(s.planets)
            .getAttackStatus(planetId);

        if (
            attackInstance.attackStarted != 0 &&
            block.timestamp >= attackInstance.timeToBeResolved
        ) {
            FleetsFacet(address(this)).resolveAttack(planetId);
        }
    }
}

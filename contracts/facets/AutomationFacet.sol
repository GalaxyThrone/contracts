// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./ShipsFacet.sol";
import "./FightingFacet.sol";
import "./BuildingsFacet.sol";

contract AutomationFacet is Modifiers {
    //@notice
    //@params   checkData -> what functionality we are checking
    //          currently there are 6 paths
    //          0,1,2 are for mining resources
    //          3 is for claiming completed ships
    //          4 is for claiming completed buildings
    //          5 is for resolving arrived attacks

    function checkUpkeep(
        bytes calldata checkData
    )
        external
        view
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        // path check if buildings are ready to claim

        uint256 resourceId = 0;

        uint256 craftShipsId = 3;
        uint256 craftBuildingId = 4;
        uint256 resolveAttacksPath = 5;

        uint256 totalPlanetAmount = IPlanets(s.planetsAddress)
            .getTotalPlanetCount();

        //@TODO  to be refactored to return arrays to avoid starvation later on.

        //@notice check claim metal
        if (keccak256(checkData) == keccak256(abi.encode(resourceId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                uint256 lastClaimed = s.lastClaimed[i];
                if (
                    block.timestamp > lastClaimed + 8 hours && lastClaimed != 0
                ) {
                    return (true, abi.encode(i));
                }
            }
        }

        //@notice check  claim buildings
        if (keccak256(checkData) == keccak256(abi.encode(craftBuildingId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                if (
                    block.timestamp >= s.craftBuildings[i].readyTimestamp &&
                    s.craftBuildings[i].readyTimestamp != 0
                ) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check  claim ships
        if (keccak256(checkData) == keccak256(abi.encode(craftShipsId))) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                if (
                    block.timestamp >= s.craftFleets[i].readyTimestamp &&
                    s.craftFleets[i].readyTimestamp != 0
                ) {
                    return (true, abi.encode(i));
                }
            }
        }
        //@notice check resolve attacks
        if (keccak256(checkData) == keccak256(abi.encode(resolveAttacksPath))) {
            for (uint256 i = 0; i < s.sendAttackId; i++) {
                if (s.runningAttacks[i].timeToBeResolved >= block.timestamp) {
                    return (true, abi.encode(i));
                }
            }
        }

        return (false, abi.encode(address(0)));
    }

    function performUpkeep(
        bytes calldata performData
    ) external onlyChainRunner {
        uint256 resourceId = 0;

        uint256 craftShipsId = 3;
        uint256 craftBuildingPath = 4;
        uint256 resolveAttacksPath = 5;

        uint256 planetId = abi.decode(performData, (uint256));

        //@notice check all mining available on the planet;
        uint256 lastClaimed = s.lastClaimed[planetId];

        if (block.timestamp > lastClaimed + 8 hours) {
            BuildingsFacet(address(this)).mineResources(planetId);
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
            ShipsFacet(address(this)).claimFleet(planetId);
        }

        attackStatus memory attackInstance = getAttackStatus(planetId);

        if (
            attackInstance.attackStarted != 0 &&
            block.timestamp >= attackInstance.timeToBeResolved
        ) {
            FightingFacet(address(this)).resolveAttack(planetId);
        }
    }

    function getAttackStatus(
        uint256 _instanceId
    ) internal view returns (attackStatus memory) {
        return s.runningAttacks[_instanceId];
    }
}

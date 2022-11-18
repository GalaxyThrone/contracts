// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";
import "../interfaces/IBuildings.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

contract BuildingsFacet is Modifiers, AutomationCompatibleInterface {
    function craftBuilding(uint256 _buildingId, uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        IBuildings buildingsContract = IBuildings(s.buildings);
        uint256[3] memory price = buildingsContract.getPrice(_buildingId);
        uint256 craftTime = buildingsContract.getCraftTime(_buildingId);
        require(craftTime > 0, "BuildingsFacet: not released yet");
        require(
            s.craftBuildings[_planetId].itemId == 0,
            "BuildingsFacet: planet already crafting"
        );
        uint256 readyTimestamp = block.timestamp + craftTime;
        CraftItem memory newBuilding = CraftItem(_buildingId, readyTimestamp);
        s.craftBuildings[_planetId] = newBuilding;
        IERC20(s.metal).burnFrom(msg.sender, price[0]);
        IERC20(s.crystal).burnFrom(msg.sender, price[1]);
        IERC20(s.ethereus).burnFrom(msg.sender, price[2]);
    }

    function claimBuilding(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        require(
            block.timestamp >= s.craftBuildings[_planetId].readyTimestamp,
            "BuildingsFacet: not ready yet"
        );
        IBuildings(s.buildings).mint(
            IERC721(s.planets).ownerOf(_planetId),
            s.craftBuildings[_planetId].itemId
        );
        uint256 buildingId = s.craftBuildings[_planetId].itemId;
        delete s.craftBuildings[_planetId];
        IPlanets(s.planets).addBuilding(_planetId, buildingId);
        uint256[3] memory boosts = IBuildings(s.buildings).getBoosts(
            buildingId
        );
        if (boosts[0] > 0) {
            IPlanets(s.planets).addBoost(_planetId, 0, boosts[0]);
        }
        if (boosts[1] > 0) {
            IPlanets(s.planets).addBoost(_planetId, 1, boosts[1]);
        }
        if (boosts[2] > 0) {
            IPlanets(s.planets).addBoost(_planetId, 2, boosts[2]);
        }
    }

    function mineMetal(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 0);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 0);
        uint256 amountMined = 500 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 0, amountMined);
        IResource(s.metal).mint(
            IERC721(s.planets).ownerOf(_planetId),
            amountMined
        );
    }

    function mineCrystal(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 1);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 1);
        uint256 amountMined = 300 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 1, amountMined);
        IResource(s.crystal).mint(
            IERC721(s.planets).ownerOf(_planetId),
            amountMined
        );
    }

    function mineEthereus(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 2);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 2);
        uint256 amountMined = 200 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 2, amountMined);
        IResource(s.ethereus).mint(
            IERC721(s.planets).ownerOf(_planetId),
            amountMined
        );
    }

    function getCraftBuildings(uint256 _planetId)
        external
        view
        returns (uint256, uint256)
    {
        return (
            s.craftBuildings[_planetId].itemId,
            s.craftBuildings[_planetId].readyTimestamp
        );
    }

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
        uint256 craftBuildingPath = 4;

        bytes memory miningPathMetal = abi.encode(metalId);
        bytes memory miningPathCrystal = abi.encode(crystalId);
        bytes memory miningPathEthereus = abi.encode(ethereusId);
        bytes memory craftingPathBuildings = abi.encode(craftBuildingPath);

        uint256 totalPlanetAmount = IPlanets(s.planets).getTotalPlanetCount();

        if (keccak256(checkData) == keccak256(craftingPathBuildings)) {
            for (uint256 i = 0; i < totalPlanetAmount; i++) {
                if (block.timestamp >= s.craftBuildings[i].readyTimestamp) {
                    return (true, abi.encode(i));
                }
            }
        }

        if (keccak256(checkData) == keccak256(miningPathMetal)) {
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

        if (keccak256(checkData) == keccak256(miningPathCrystal)) {
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

        if (keccak256(checkData) == keccak256(miningPathEthereus)) {
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

        return (false, abi.encode(address(0)));
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 metalId = 0;
        uint256 crystalId = 1;
        uint256 ethereusId = 2;
        uint256 craftBuildingPath = 4;

        uint256 planetId = abi.decode(performData, (uint256));

        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(
            planetId,
            metalId
        );

        if (block.timestamp > lastClaimed + 8 hours) {
            this.mineMetal(planetId);
        }
        lastClaimed = IPlanets(s.planets).getLastClaimed(planetId, crystalId);
        if (block.timestamp > lastClaimed + 8 hours) {
            this.mineCrystal(planetId);
        }
        lastClaimed = IPlanets(s.planets).getLastClaimed(planetId, ethereusId);
        if (block.timestamp > lastClaimed + 8 hours) {
            this.mineEthereus(planetId);
        }

        uint256 buildingReadyTimestamp = s
            .craftBuildings[planetId]
            .readyTimestamp;

        if (block.timestamp >= buildingReadyTimestamp) {
            this.claimBuilding(planetId);
        }
    }
}

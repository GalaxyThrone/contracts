// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";
import "../interfaces/IBuildings.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./FleetsFacet.sol";

contract BuildingsFacet is Modifiers {
    function craftBuilding(uint256 _buildingId, uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        IBuildings buildingsContract = IBuildings(s.buildingsAddress);
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
        require(
            s.planetResources[_planetId][0] >= price[0],
            "BuildingsFacet: not enough metal"
        );
        require(
            s.planetResources[_planetId][1] >= price[1],
            "BuildingsFacet: not enough crystal"
        );
        require(
            s.planetResources[_planetId][2] >= price[2],
            "BuildingsFacet: not enough ethereus"
        );
        s.planetResources[_planetId][0] -= price[0];
        s.planetResources[_planetId][1] -= price[1];
        s.planetResources[_planetId][2] -= price[2];
        IERC20(s.metalAddress).burnFrom(address(this), price[0]);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1]);
        IERC20(s.ethereusAddress).burnFrom(address(this), price[2]);
    }

    function claimBuilding(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        require(
            block.timestamp >= s.craftBuildings[_planetId].readyTimestamp,
            "BuildingsFacet: not ready yet"
        );
        IBuildings(s.buildingsAddress).mint(
            IERC721(s.planetsAddress).ownerOf(_planetId),
            s.craftBuildings[_planetId].itemId
        );
        uint256 buildingId = s.craftBuildings[_planetId].itemId;
        delete s.craftBuildings[_planetId];
        s.buildings[_planetId][buildingId] += 1;
        uint256[3] memory boosts = IBuildings(s.buildingsAddress).getBoosts(
            buildingId
        );
        if (boosts[0] > 0) {
            s.boosts[_planetId][0] += boosts[0];
        }
        if (boosts[1] > 0) {
            s.boosts[_planetId][1] += boosts[1];
        }
        if (boosts[2] > 0) {
            s.boosts[_planetId][2] += boosts[2];
        }
    }

    function mineMetal(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = s.lastClaimed[_planetId][0];
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = s.boosts[_planetId][0];
        uint256 amountMined = 500 ether + (boost * 1e18);
        IPlanets(s.planetsAddress).mineResource(_planetId, 0, amountMined);
        s.lastClaimed[_planetId][0] = block.timestamp;
        IResource(s.metalAddress).mint(address(this), amountMined);
        s.planetResources[_planetId][0] += amountMined;
    }

    function mineCrystal(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = s.lastClaimed[_planetId][1];
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = s.boosts[_planetId][1];
        uint256 amountMined = 300 ether + (boost * 1e18);
        IPlanets(s.planetsAddress).mineResource(_planetId, 1, amountMined);
        s.lastClaimed[_planetId][1] = block.timestamp;
        IResource(s.crystalAddress).mint(address(this), amountMined);
        s.planetResources[_planetId][1] += amountMined;
    }

    function mineEthereus(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        uint256 lastClaimed = s.lastClaimed[_planetId][2];
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = s.boosts[_planetId][2];
        uint256 amountMined = 200 ether + (boost * 1e18);
        IPlanets(s.planetsAddress).mineResource(_planetId, 2, amountMined);
        s.lastClaimed[_planetId][2] = block.timestamp;
        IResource(s.ethereusAddress).mint(address(this), amountMined);
        s.planetResources[_planetId][2] += amountMined;
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

    function getBuildings(uint256 _planetId, uint256 _buildingId)
        external
        view
        returns (uint256)
    {
        return s.buildings[_planetId][_buildingId];
    }

    function getAllBuildings(uint256 _planetId, uint256 _totalBuildingTypeCount)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory buildingsCount = new uint256[](
            _totalBuildingTypeCount
        );

        for (uint256 i = 0; i < _totalBuildingTypeCount; i++) {
            buildingsCount[i] = s.buildings[_planetId][i];
        }
        return buildingsCount;
    }

    function getLastClaimed(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256)
    {
        return s.lastClaimed[_planetId][_resourceId];
    }

    function getBoost(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256)
    {
        return s.boosts[_planetId][_resourceId];
    }

    function getPlanetResources(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256)
    {
        return s.planetResources[_planetId][_resourceId];
    }
}

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
    function craftBuilding(
        uint256 _buildingId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        IBuildings buildingsContract = IBuildings(s.buildingsAddress);
        uint256[3] memory price = buildingsContract.getPrice(_buildingId);
        uint256 craftTime = buildingsContract.getCraftTime(_buildingId);

        require(
            _amount > 0 && _amount % 1 == 0,
            "minimum 1, only in 1 increments"
        );
        require(craftTime > 0, "BuildingsFacet: not released yet");

        require(
            s.craftBuildings[_planetId].itemId == 0,
            "BuildingsFacet: planet already crafting"
        );
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);
        CraftItem memory newBuilding = CraftItem(
            _amount,
            _planetId,
            _buildingId,
            readyTimestamp
        );
        s.craftBuildings[_planetId] = newBuilding;
        require(
            s.planetResources[_planetId][0] >= price[0] * _amount,
            "BuildingsFacet: not enough metal"
        );
        require(
            s.planetResources[_planetId][1] >= price[1] * _amount,
            "BuildingsFacet: not enough crystal"
        );
        require(
            s.planetResources[_planetId][2] >= price[2] * _amount,
            "BuildingsFacet: not enough ethereus"
        );
        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.ethereusAddress).burnFrom(address(this), price[2] * _amount);
    }

    function claimBuilding(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        require(
            block.timestamp >= s.craftBuildings[_planetId].readyTimestamp,
            "BuildingsFacet: not ready yet"
        );

        uint256 buildingId = s.craftBuildings[_planetId].itemId;

        for (uint256 i = 0; i < s.craftBuildings[_planetId].amount; i++) {
            //@TODO refactor to batchMinting
            IBuildings(s.buildingsAddress).mint(
                IERC721(s.planetsAddress).ownerOf(_planetId),
                s.craftBuildings[_planetId].itemId
            );

            s.buildings[_planetId][buildingId] += 1;
        }

        delete s.craftBuildings[_planetId];

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

    //@notice see all running craftbuildings for a planet
    function getCraftBuildings(uint256 _planetId)
        external
        view
        returns (CraftItem memory)
    {
        return (s.craftBuildings[_planetId]);
    }

    //@notice see all running craftbuildings for a planet
    function getAllCraftBuildingsPlayer(address _player)
        external
        view
        returns (CraftItem[] memory)
    {
        uint256 totalCount = IERC721(s.planetsAddress).balanceOf(_player);

        uint256 counter;

        uint256 totalPlanetAmount = IPlanets(s.planetsAddress)
            .getTotalPlanetCount();

        CraftItem[] memory currentlyCraftedBuildings = new CraftItem[](
            totalCount
        );

        uint256[] memory ownedPlanets = new uint256[](totalCount);

        for (uint256 i = 0; i < totalCount; i++) {
            ownedPlanets[i] = IERC721(s.planetsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        for (uint256 i = 0; i < totalCount; i++) {
            currentlyCraftedBuildings[counter] = s.craftBuildings[
                ownedPlanets[i]
            ];
            counter++;
        }

        return currentlyCraftedBuildings;
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

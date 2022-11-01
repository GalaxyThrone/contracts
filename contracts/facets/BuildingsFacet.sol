// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";
import "../interfaces/IBuildings.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IResource.sol";

contract BuildingsFacet is Modifiers {
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
        onlyPlanetOwner(_planetId)
    {
        require(
            block.timestamp >= s.craftBuildings[_planetId].readyTimestamp,
            "BuildingsFacet: not ready yet"
        );
        IBuildings(s.buildings).mint(
            msg.sender,
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

    function mineMetal(uint256 _planetId) external onlyPlanetOwner(_planetId) {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 0);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 0);
        uint256 amountMined = 500 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 0, amountMined);
        IResource(s.metal).mint(msg.sender, amountMined);
    }

    function mineCrystal(uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 1);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 1);
        uint256 amountMined = 300 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 1, amountMined);
        IResource(s.crystal).mint(msg.sender, amountMined);
    }

    function mineEthereus(uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        uint256 lastClaimed = IPlanets(s.planets).getLastClaimed(_planetId, 2);
        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );
        uint256 boost = IPlanets(s.planets).getBoost(_planetId, 2);
        uint256 amountMined = 200 ether + (boost * 1e18);
        IPlanets(s.planets).mineResource(_planetId, 2, amountMined);
        IResource(s.ethereus).mint(msg.sender, amountMined);
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
}

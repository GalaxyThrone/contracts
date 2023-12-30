// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";

import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./ShipsFacet.sol";

contract TutorialFacet is Modifiers {
    event shipsStartedCrafting(uint planetId);
    event shipTutorialConcluded(address player);

    event buildingsStartedCrafting(uint planetId);
    event buildingTutorialConcluded(address player);

    //@notice, claim can stay the same. This is just instant instead, and slimmed down to reduce gas costs.
    function TUTORIALcraftBuilding(
        uint256 _buildingId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        require(
            !s.tutorialStageBuildingDone[msg.sender],
            "TutorialFacet: tutorial building already done!!!!!"
        );
        uint256[3] memory price = s.buildingTypes[_buildingId].price;

        uint craftTimeBuffed;

        require(
            _amount > 0 && _amount % 1 == 0 && _amount <= 20,
            "minimum 1, only in 1 increments, max 20"
        );

        require(
            s.craftBuildings[_planetId].itemId == 0,
            "BuildingsFacet: planet already crafting"
        );
        uint256 readyTimestamp = block.timestamp + 5 seconds;

        craftTimeBuffed = 5 seconds; //only takes 5 seconds to resolve

        CraftItem memory newBuilding = CraftItem(
            1, //only craft 1 of the first buildingType, hardcoded amount
            _planetId,
            _buildingId,
            readyTimestamp,
            block.timestamp,
            1, //only craft 1 of the first buildingType, hardcoded amount
            craftTimeBuffed
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
            "BuildingsFacet: not enough antimatter"
        );

        s.totalBuiltBuildingsPlanet[_planetId] += _amount;
        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.antimatterAddress).burnFrom(address(this), price[2] * _amount);
        s.tutorialStageBuildingDone[msg.sender] = true;
        emit buildingsStartedCrafting(_planetId);
        emit buildingTutorialConcluded(msg.sender);
    }

    function TUTORIALcraftFleet(
        uint256 _fleetId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        require(
            !s.tutorialStageShipDone[msg.sender],
            "TutorialFacet: tutorial ship already done!!!!!"
        );

        uint256[4] memory price = s.shipType[_fleetId].price;
        uint256 craftTime = 5 seconds; //only takes 5 seconds to resolve
        uint craftTimeBuffed;
        uint256 craftedFrom = s.shipType[_fleetId].craftedFrom;
        uint256 buildings = s.buildings[_planetId][craftedFrom];

        require(
            s.craftFleets[_planetId].itemId == 0,
            "ShipsFacet: planet already crafting"
        );
        require(buildings > 0, "TutorialFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + 5 seconds;

        CraftItem memory newFleet = CraftItem(
            1, //only craft 1 of the first shipType, hardcoded amount
            _planetId,
            _fleetId,
            readyTimestamp,
            block.timestamp,
            1, //only craft 1 of the first shipType, hardcoded amount
            craftTime
        );
        s.craftFleets[_planetId] = newFleet;
        require(
            s.planetResources[_planetId][0] >= price[0] * _amount,
            "TutorialFacet: not enough metal"
        );
        require(
            s.planetResources[_planetId][1] >= price[1] * _amount,
            "TutorialFacet: not enough crystal"
        );
        require(
            s.planetResources[_planetId][2] >= price[2] * _amount,
            "TutorialFacet: not enough antimatter"
        );

        require(
            s.aetherHeldPlayer[msg.sender] >= price[3] * _amount,
            "TutorialFacet: not enough Aether held"
        );

        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        s.aetherHeldPlayer[msg.sender] -= price[3] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.antimatterAddress).burnFrom(address(this), price[2] * _amount);
        IERC20(s.aetherAddress).burnFrom(address(this), price[3] * _amount);

        s.tutorialStageShipDone[msg.sender] = true;
        emit shipsStartedCrafting(_planetId);
        emit shipTutorialConcluded(msg.sender);
    }

    function checkTutorialStatus(
        address _playerToCheck
    ) external view returns (bool, bool) {
        return (
            s.tutorialStageBuildingDone[msg.sender],
            s.tutorialStageShipDone[msg.sender]
        );
    }
}

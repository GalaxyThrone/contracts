// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";

import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./ShipsFacet.sol";

contract BuildingsFacet is Modifiers {
    function craftBuilding(
        uint256 _buildingId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        uint256[3] memory price = getPrice(_buildingId);
        uint256 craftTime = getCraftTime(_buildingId);

        require(
            _amount > 0 && _amount % 1 == 0 && _amount <= 10,
            "minimum 1, only in 1 increments, max 10"
        );
        require(craftTime > 0, "BuildingsFacet: not released yet");

        require(
            s.craftBuildings[_planetId].itemId == 0,
            "BuildingsFacet: planet already crafting"
        );
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);

        //Hivemind  Craft-Time Buff.
        if (s.playersFaction[msg.sender] == 3) {
            readyTimestamp -= ((craftTime * _amount) * 20) / 100;
        }

        // new player crafting buff
        if (s.totalBuiltBuildingsPlanet[_planetId] <= 10) {
            readyTimestamp -= ((craftTime * _amount) * 80) / 100;
        }

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
            "BuildingsFacet: not enough antimatter"
        );

        s.totalBuiltBuildingsPlanet[_planetId] += _amount;
        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.antimatterAddress).burnFrom(address(this), price[2] * _amount);
    }

    function claimBuilding(
        uint256 _planetId
    ) external onlyPlanetOwnerOrChainRunner(_planetId) {
        require(
            block.timestamp >= s.craftBuildings[_planetId].readyTimestamp,
            "BuildingsFacet: not ready yet"
        );

        uint256 buildingId = s.craftBuildings[_planetId].itemId;

        for (uint256 i = 0; i < s.craftBuildings[_planetId].amount; i++) {
            s.buildings[_planetId][buildingId] += 1;

            uint256[3] memory boosts = getBoosts(buildingId);

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

        delete s.craftBuildings[_planetId];
    }

    //@notice
    //replaces mineMetal, mineCrystal, mineAntimatter
    function mineResources(
        uint256 _planetId
    ) external onlyPlanetOwnerOrChainRunner(_planetId) {
        uint256 lastClaimed = s.lastClaimed[_planetId];

        require(
            block.timestamp > lastClaimed + 8 hours,
            "BuildingsFacet: 8 hour cooldown"
        );

        for (uint256 i = 0; i < 3; i++) {
            uint256 boost = s.boosts[_planetId][i];
            uint256 amountMined = 2000 ether + (boost * 1e18);
            IPlanets(s.planetsAddress).mineResource(_planetId, i, amountMined);

            //I know its hacky, but loading the resource contract addresses in an array is more gas intensive

            if (i == 0) {
                IResource(s.metalAddress).mint(address(this), amountMined);
            }

            if (i == 1) {
                IResource(s.crystalAddress).mint(address(this), amountMined);
            }

            if (i == 2) {
                IResource(s.antimatterAddress).mint(address(this), amountMined);
            }

            s.planetResources[_planetId][i] += amountMined;
        }

        s.lastClaimed[_planetId] = block.timestamp;
    }

    function withdrawAether(uint256 _amount) external {
        require(
            s.aetherHeldPlayer[msg.sender] >= _amount,
            "ManagementFacet: Player doesnt hold enough Aether!"
        );

        s.aetherHeldPlayer[msg.sender] -= _amount;

        IResource(s.aetherAddress).transfer(msg.sender, _amount);
    }

    //@notice requires Aether Token Approval on the Diamond address!
    function depositAether(uint256 _amount) external {
        require(
            IResource(s.aetherAddress).allowance(msg.sender, address(this)) >=
                _amount,
            "increase allowance!"
        );

        require(
            IResource(s.aetherAddress).transferFrom(
                msg.sender,
                address(this),
                _amount
            ),
            "Transfer failed!"
        );

        s.aetherHeldPlayer[msg.sender] += _amount;
    }

    //@notice see all running craftbuildings for a planet
    function getCraftBuildings(
        uint256 _planetId
    ) external view returns (CraftItem memory) {
        return (s.craftBuildings[_planetId]);
    }

    //@notice see all running craftbuildings for a planet
    function getAllCraftBuildingsPlayer(
        address _player
    ) external view returns (CraftItem[] memory) {
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

    function getPrice(
        uint256 _buildingId
    ) internal view returns (uint256[3] memory) {
        return s.buildingTypes[_buildingId].price;
    }

    function getCraftTime(uint256 _buildingId) internal view returns (uint256) {
        return s.buildingTypes[_buildingId].craftTime;
    }

    function getBoosts(
        uint256 _buildingId
    ) internal view returns (uint256[3] memory) {
        return s.buildingTypes[_buildingId].boosts;
    }

    function getTotalBuildingTypes() external view returns (uint256) {
        return s.totalBuildingTypes;
    }

    function getBuildingType(
        uint256 _buildingId
    ) external view returns (Building memory) {
        return s.buildingTypes[_buildingId];
    }

    function getBuildingTypes(
        uint256[] memory _buildingId
    ) external view returns (Building[] memory) {
        Building[] memory buildingTypesArray = new Building[](
            _buildingId.length
        );

        for (uint256 i = 0; i < _buildingId.length; i++) {
            buildingTypesArray[i] = s.buildingTypes[i];
        }

        return buildingTypesArray;
    }

    function getBuildings(
        uint256 _planetId,
        uint256 _buildingId
    ) external view returns (uint256) {
        return s.buildings[_planetId][_buildingId];
    }

    function getAllBuildings(
        uint256 _planetId
    ) external view returns (uint256[] memory) {
        uint256[] memory buildingsCount = new uint256[](s.totalBuildingTypes);

        for (uint256 i = 0; i < s.totalBuildingTypes; i++) {
            buildingsCount[i] = s.buildings[_planetId][i];
        }
        return buildingsCount;
    }

    function getLastClaimed(uint256 _planetId) external view returns (uint256) {
        return s.lastClaimed[_planetId];
    }

    function getBoost(
        uint256 _planetId,
        uint256 _resourceId
    ) external view returns (uint256) {
        return s.boosts[_planetId][_resourceId];
    }

    function getPlanetResources(
        uint256 _planetId,
        uint256 _resourceId
    ) external view returns (uint256) {
        return s.planetResources[_planetId][_resourceId];
    }

    function getAetherPlayer(address _address) external view returns (uint256) {
        return s.aetherHeldPlayer[_address];
    }
}

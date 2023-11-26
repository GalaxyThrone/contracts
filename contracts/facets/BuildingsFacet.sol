// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem} from "../libraries/AppStorage.sol";

import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./ShipsFacet.sol";

contract BuildingsFacet is Modifiers {
    event buildingsStartedCrafting(uint planetId);
    event buildingsFinishedCrafting(uint planetId);
    event miningConcluded(uint planetId);

    function craftBuilding(
        uint256 _buildingId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        uint256[3] memory price = getPrice(_buildingId);
        uint256 craftTime = getCraftTime(_buildingId);
        uint craftTimeBuffed;

        require(
            _amount > 0 && _amount % 1 == 0 && _amount <= 20,
            "minimum 1, only in 1 increments, max 20"
        );
        require(craftTime > 0, "BuildingsFacet: not released yet");

        require(
            s.craftBuildings[_planetId].itemId == 0,
            "BuildingsFacet: planet already crafting"
        );
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);

        craftTimeBuffed = craftTime;
        // new player crafting buff by 80% for the first 10 buildings
        if (s.totalBuiltBuildingsPlanet[_planetId] <= 10) {
            readyTimestamp -= ((craftTime * _amount) * 80) / 100;
            craftTimeBuffed = ((craftTime * 20) / 100);
        }
        //Hivemind  Craft-Time Buff.
        else if (s.playersFaction[msg.sender] == 3) {
            readyTimestamp -= ((craftTime * _amount) * 20) / 100;
            craftTimeBuffed = ((craftTime * 80) / 100);
        } else {
            craftTimeBuffed = craftTime;
        }

        if (s.playerTechnologies[msg.sender][3][1]) {
            // Governance Tech ID 1
            readyTimestamp -= ((craftTime * _amount) * 10) / 100; // 10% reduction in total craft time
            craftTimeBuffed = (craftTimeBuffed * 90) / 100; // 10% reduction in craft time per building
        }

        CraftItem memory newBuilding = CraftItem(
            _amount,
            _planetId,
            _buildingId,
            readyTimestamp,
            block.timestamp,
            _amount,
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

        emit buildingsStartedCrafting(_planetId);
    }

    function claimBuilding(
        uint256 _planetId
    ) external onlyPlanetOwnerOrChainRunner(_planetId) {
        uint256 currentTimestamp = block.timestamp;
        CraftItem storage currentCraft = s.craftBuildings[_planetId];

        //@notice @TODO temporary bandaid, that can be deleted safely after round 3
        if (s.craftBuildings[_planetId].craftTimeItem == 0) {
            s.craftBuildings[_planetId].craftTimeItem = 10;
        }

        // Compute the readyTimestamp for the next claimable building
        uint256 nextReadyTimestamp = currentCraft.startTimestamp +
            s.craftBuildings[_planetId].craftTimeItem;

        // Check if at least one building is ready
        require(
            currentTimestamp >= nextReadyTimestamp,
            "BuildingsFacet: not ready yet"
        );

        Building memory buildingToClaim = s.buildingTypes[currentCraft.itemId];

        uint interval = currentTimestamp - currentCraft.startTimestamp;
        uint claimableAmount = interval /
            s.craftBuildings[_planetId].craftTimeItem;

        if (claimableAmount > currentCraft.unclaimedAmount) {
            claimableAmount = currentCraft.unclaimedAmount;
        }

        currentCraft.unclaimedAmount -= claimableAmount;
        currentCraft.startTimestamp +=
            claimableAmount *
            s.craftBuildings[_planetId].craftTimeItem;
        // update readyTimestamp to reflect the time when the next unclaimed building will be ready
        currentCraft.readyTimestamp =
            currentCraft.startTimestamp +
            s.craftBuildings[_planetId].craftTimeItem;

        uint256[3] memory boosts = getBoosts(currentCraft.itemId);
        s.buildings[_planetId][currentCraft.itemId] += claimableAmount;
        for (uint256 i = 0; i < 3; i++) {
            if (boosts[i] > 0) {
                s.boosts[_planetId][i] += boosts[i] * claimableAmount;
            }
        }

        if (currentCraft.unclaimedAmount == 0) {
            delete s.craftBuildings[_planetId];
        }

        emit buildingsFinishedCrafting(_planetId);
    }

    function recycleBuildings(
        uint256 _planetId,
        uint256 _buildingId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        require(
            s.buildings[_planetId][_buildingId] >= _amount,
            "Recycle Amount too high!"
        );

        s.buildings[_planetId][_buildingId] -= _amount;

        Building memory buildingToRecycle = s.buildingTypes[_buildingId];

        //uint RECYCLE_MALUS = 50;
        for (uint i = 0; i < 3; i++) {
            s.planetResources[_planetId][i] +=
                (buildingToRecycle.price[i] * 50) /
                100;
        }

        uint256[3] memory boosts = getBoosts(_buildingId);

        if (boosts[0] > 0) {
            s.boosts[_planetId][0] -= boosts[0] * _amount;
        }
        if (boosts[1] > 0) {
            s.boosts[_planetId][1] -= boosts[1] * _amount;
        }
        if (boosts[2] > 0) {
            s.boosts[_planetId][2] -= boosts[2] * _amount;
        }
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
            uint256 amountMined = 3000 ether + (boost * 1e18);
            IPlanets(s.planetsAddress).mineResource(_planetId, i, amountMined);

            // Check if Enhanced Planetary Mining is researched ( 4 is utility)
            if (s.playerTechnologies[msg.sender][4][4]) {
                UtilityTech memory tech = s.availableResearchTechsUtility[4];
                uint256 percentageBoost = (amountMined * tech.utilityBoost) /
                    100;

                amountMined += percentageBoost;
            }

            //I know its hacky, but loading the resource contract addresses in an array is more gas intensive

            if (i == 0) {
                IResource(s.metalAddress).mint(address(this), amountMined);

                // Aether Mining Logic
                if (s.playerTechnologies[msg.sender][4][5]) {
                    // Aether Mining Technology
                    bool isAdvancedAetherTechResearched = s.playerTechnologies[
                        msg.sender
                    ][4][6];
                    uint256 randomNumber = uint256(
                        blockhash(block.number - 1)
                    ) % 2; // 50% chance

                    if (isAdvancedAetherTechResearched || randomNumber == 0) {
                        uint256 aetherMined = (amountMined * 5) / 100; // 5% of the amountMined
                        s.aetherHeldPlayer[msg.sender] += aetherMined; // Adding Aether to player's holdings
                    }
                }
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
        emit miningConcluded(_planetId);
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

    function getPlanetResourcesAll(
        uint256 _planetId
    ) external view returns (uint256[3] memory) {
        uint256[3] memory result;
        result[0] = s.planetResources[_planetId][0];
        result[1] = s.planetResources[_planetId][1];
        result[2] = s.planetResources[_planetId][2];

        return result;
    }

    function getAetherPlayer(address _address) external view returns (uint256) {
        return s.aetherHeldPlayer[_address];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, OutMining, SendTerraform, TransferResource, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

import "./AdminFacet.sol";

contract ShipsFacet is Modifiers {
    event SendTerraformer(
        uint id,
        uint256 indexed toPlanet,
        uint256 indexed arrivalTime,
        uint256 indexed instanceId
    );
    event StartOutMining(
        uint id,
        uint256 indexed fromPlanetId,
        uint256 indexed toPlanetId,
        address indexed sender,
        uint256[] shipsIds,
        uint256 arrivalTime
    );
    event StartSendResources(
        uint256 indexed fromPlanetId,
        uint256 indexed toPlanetId,
        address indexed sender,
        uint256[] shipsIds,
        uint256 arrivalTime
    );

    event resolvedOutmining(uint id);
    event resolvedTerraforming(uint id);

    event shipsStartedCrafting(uint planetId);
    event shipsFinishedCrafting(uint planetId);

    function craftFleet(
        uint256 _fleetId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        uint256[4] memory price = s.shipType[_fleetId].price;
        uint256 craftTime = s.shipType[_fleetId].craftTime;
        uint craftTimeBuffed;
        uint256 craftedFrom = s.shipType[_fleetId].craftedFrom;
        uint256 buildings = s.buildings[_planetId][craftedFrom];
        require(
            _amount > 0 && _amount % 1 == 0 && _amount <= 20,
            "minimum 1, only in 1 increments, max 20"
        );
        require(craftTime > 0, "ShipsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "ShipsFacet: planet already crafting"
        );
        require(buildings > 0, "ShipsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);

        craftTimeBuffed = craftTime;

        // Apply each relevant research buff

        //  Rapid Infrastructure Development, reduce craft time by 10%;
        if (s.playerTechnologies[msg.sender][3][2]) {
            readyTimestamp -= ((craftTime * _amount) * 10) / 100; // 10% reduction in total craft time
            craftTimeBuffed = (craftTimeBuffed * 90) / 100; // 10% reduction in craft time per ship
            //Resource-Savvy Constructions, reduce prices by 10%
            if (s.playerTechnologies[msg.sender][3][3]) {
                for (uint i = 0; i < price.length; ++i) {
                    price[i] -= (price[i] * 10) / 100; // 10% reduction in costs for all resources
                }
            }
        }

        // Apply Commander Buffs

        //@TODO testing
        //Ship Production Micromanagement Guru [ID 3], 10% faster ship crafting time
        if (s.activeCommanderTraits[msg.sender][3]) {
            readyTimestamp -= ((craftTime * _amount) * 10) / 100; // 10% reduction in total craft time
            craftTimeBuffed = (craftTimeBuffed * 90) / 100; // 10% reduction in craft time per ship
        }
        //@TODO testing
        //Explorer Mindset [ID 10], 50% faster crafting of terraformers;
        if (_fleetId == 9 && s.activeCommanderTraits[msg.sender][10]) {
            readyTimestamp -= ((craftTime * _amount) * 50) / 100; // 50% reduction in total craft time
            craftTimeBuffed = (craftTimeBuffed * 50) / 100; // 50% reduction in craft time per terraformer
        }

        CraftItem memory newFleet = CraftItem(
            _amount,
            _planetId,
            _fleetId,
            readyTimestamp,
            block.timestamp,
            _amount,
            craftTimeBuffed
        );
        s.craftFleets[_planetId] = newFleet;

        require(
            s.planetResources[_planetId][0] >= price[0] * _amount,
            "ShipsFacet: not enough metal"
        );
        require(
            s.planetResources[_planetId][1] >= price[1] * _amount,
            "ShipsFacet: not enough crystal"
        );
        require(
            s.planetResources[_planetId][2] >= price[2] * _amount,
            "ShipsFacet: not enough antimatter"
        );

        require(
            s.aetherHeldPlayer[msg.sender] >= price[3] * _amount,
            "ShipsFacet: not enough Aether held"
        );

        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        s.aetherHeldPlayer[msg.sender] -= price[3] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.antimatterAddress).burnFrom(address(this), price[2] * _amount);
        IERC20(s.aetherAddress).burnFrom(address(this), price[3] * _amount);

        emit shipsStartedCrafting(_planetId);
    }

    function claimFleet(
        uint256 _planetId
    ) external onlyPlanetOwnerOrChainRunner(_planetId) {
        uint256 currentTimestamp = block.timestamp;
        CraftItem storage currentCraft = s.craftFleets[_planetId];

        uint256 nextReadyTimestamp = currentCraft.startTimestamp +
            currentCraft.craftTimeItem;

        // Check if at least one ship is ready
        require(
            currentTimestamp >= nextReadyTimestamp,
            "ShipsFacet: not ready yet"
        );

        uint interval = currentTimestamp - currentCraft.startTimestamp;
        uint claimableAmount = interval / currentCraft.craftTimeItem;

        if (claimableAmount > currentCraft.unclaimedAmount) {
            claimableAmount = currentCraft.unclaimedAmount;
        }

        currentCraft.unclaimedAmount -= claimableAmount;
        currentCraft.startTimestamp +=
            claimableAmount *
            currentCraft.craftTimeItem;
        currentCraft.readyTimestamp +=
            claimableAmount *
            currentCraft.craftTimeItem;

        uint256 shipTypeId;
        uint256 shipId;

        address planetOwner = IERC721(s.planetsAddress).ownerOf(_planetId);

        for (uint256 i = 0; i < claimableAmount; ++i) {
            shipId = IShips(s.shipsAddress).mint(
                planetOwner,
                currentCraft.itemId
            );
            shipTypeId = currentCraft.itemId;

            ShipType memory newShipType = s.shipType[shipTypeId];

            // Apply each relevant research buff

            //Miner Deputization doubling all combat stats
            if (shipTypeId == 7) {
                //Miner Ship Combat Deputization
                if (s.playerTechnologies[planetOwner][4][10]) {
                    newShipType.health *= 2;

                    for (uint k = 0; k < 3; k++) {
                        newShipType.attackTypes[k] *= 2;
                        newShipType.defenseTypes[k] *= 2;
                    }
                }
            }

            // Fleet Defense Coordination Drills Defense Buff
            if (s.playerTechnologies[planetOwner][2][3]) {
                for (uint k = 0; k < 3; k++) {
                    newShipType.defenseTypes[k] +=
                        (s.shipType[shipTypeId].defenseTypes[k] * 10) /
                        100;
                }

                //Elite Naval Defense Tactics

                if (s.playerTechnologies[planetOwner][2][4]) {
                    for (uint k = 0; k < 3; k++) {
                        newShipType.defenseTypes[k] +=
                            (s.shipType[shipTypeId].defenseTypes[k] * 10) /
                            100;
                    }
                }
            }

            // Ship Health Enhancement 10% HP Buff
            if (s.playerTechnologies[planetOwner][2][5]) {
                newShipType.health +=
                    (s.shipType[shipTypeId].health * 10) /
                    100;

                // Ship Attack Enhancement 10% Atk Buff
                if (s.playerTechnologies[planetOwner][2][6]) {
                    for (uint k = 0; k < 3; k++) {
                        newShipType.attackTypes[k] +=
                            (s.shipType[shipTypeId].attackTypes[k] * 10) /
                            100;
                    }

                    // Advanced Ship Weaponry 10% Atk Buff
                    if (s.playerTechnologies[planetOwner][2][8]) {
                        for (uint k = 0; k < 3; k++) {
                            newShipType.attackTypes[k] +=
                                (s.shipType[shipTypeId].attackTypes[k] * 10) /
                                100;
                        }
                    }
                }
            }

            // Apply Commander Buffs

            //EM Warfare Mastery Trait [ID 1], 20% extra on EM Attack.
            if (s.activeCommanderTraits[planetOwner][1]) {
                newShipType.attackTypes[2] +=
                    (s.shipType[shipTypeId].attackTypes[2] * 20) /
                    100;
            }

            //@TODO testing
            //EM Hardening Mastery Trait [ID 2], 20% extra on EM Defense.
            if (s.activeCommanderTraits[planetOwner][2]) {
                newShipType.defenseTypes[2] +=
                    (s.shipType[shipTypeId].defenseTypes[2] * 20) /
                    100;
            }

            //@TODO testing
            //Kinetic Warfare Mastery Trait [ID 4], 20% extra on Kinetic Attack.
            if (s.activeCommanderTraits[planetOwner][4]) {
                newShipType.attackTypes[0] +=
                    (s.shipType[shipTypeId].attackTypes[0] * 20) /
                    100;
            }

            //@TODO testing
            // More Ship-Hulls Philosophy [ID 6], 10% extra Ship Health.
            if (s.activeCommanderTraits[planetOwner][6]) {
                newShipType.health +=
                    (s.shipType[shipTypeId].health * 10) /
                    100;
            }

            //@notice
            //ship specific researchtrees disabled for now
            /*
            uint256[] memory relevantTechIds = s
                .shipRelevantTechUpgradesMapping[currentCraft.itemId];
            for (uint256 j = 0; j < relevantTechIds.length; j++) {
                uint256 techId = relevantTechIds[j];
                if (s.playerTechnologies[planetOwner][1][techId]) {
                    // Checking for ShipTypeTechs
                    ShipTypeTech memory techUpdate = s
                        .availableResearchTechsShips[techId];

                    newShipType.health += techUpdate.hpBuff;

                    for (uint k = 0; k < 3; k++) {
                        newShipType.attackTypes[k] += techUpdate
                            .attackBoostStat[k];
                        newShipType.defenseTypes[k] += techUpdate
                            .defenseBoostStat[k];
                    }
                }
            }
            */

            s.SpaceShips[shipId] = newShipType;

            s.fleets[_planetId][shipTypeId] += 1;
            s.assignedPlanet[shipId] = _planetId;
            s.availableModuleSlots[shipId] += s
                .shipType[shipTypeId]
                .moduleSlots;
        }

        if (currentCraft.unclaimedAmount == 0) {
            delete s.craftFleets[_planetId];
        }
        //@notice for the alpha, you are PVP enabled once you are claiming your first spaceship
        IPlanets(s.planetsAddress).enablePVP(_planetId);

        emit shipsFinishedCrafting(_planetId);
    }

    function getCraftFleets(
        uint256 _planetId
    ) external view returns (CraftItem memory) {
        return (s.craftFleets[_planetId]);
    }

    function getAllCraftShipsPlayer(
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

        for (uint256 i = 0; i < totalCount; ++i) {
            ownedPlanets[i] = IERC721(s.planetsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        for (uint256 i = 0; i < totalCount; ++i) {
            currentlyCraftedBuildings[counter] = s.craftFleets[ownedPlanets[i]];
            counter++;
        }

        return currentlyCraftedBuildings;
    }

    function sendTerraform(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] calldata _shipIds
    ) external onlyPlanetOwner(_fromPlanetId) {
        //@notice: require an unowned planet
        require(
            IERC721(s.planetsAddress).ownerOf(_toPlanetId) == address(this),
            "planet already terraformed!"
        );

        require(this.getPlanetType(_toPlanetId) != 2, "planet is a tradehub!");

        require(
            s.planetType[_toPlanetId] != 1,
            "Asteroid Belts cannot be terraformed!"
        );

        uint256 arrivalTime = calculateTravelTime(
            _fromPlanetId,
            _toPlanetId,
            s.playersFaction[msg.sender]
        );

        SendTerraform memory newSendTerraform = SendTerraform(
            s.sendTerraformId,
            _fromPlanetId,
            _toPlanetId,
            _shipIds,
            block.timestamp,
            arrivalTime
        );

        s.sendTerraform[s.sendTerraformId] = newSendTerraform;

        //unassign ship from home planet & substract amount
        // todo remove duplicate storage of assignedPlanet

        bool includeTerraform;

        for (uint256 i = 0; i < _shipIds.length; ++i) {
            require(
                IShips(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            if ((s.SpaceShips[_shipIds[i]].shipType == 9)) {
                includeTerraform = true;
            }

            require(
                s.assignedPlanet[_shipIds[i]] == _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            delete s.assignedPlanet[_shipIds[i]];

            //@TODO check that ships are on _fromPlanetId
        }

        require(
            includeTerraform,
            "only terraform-capital ships can transform uninhabitated planets!"
        );
        emit SendTerraformer(
            s.sendTerraformId,
            _toPlanetId,
            arrivalTime,
            s.sendTerraformId
        );
        s.sendTerraformId++;
    }

    //@notice resolve arrival of terraformer
    //@TODO rename it to resolveTerraform. endTerraform is a bad name for it.
    function endTerraform(uint256 _sendTerraformId) external {
        //@notice retreat path when the planet isnt uninhabited anymore.
        if (
            IERC721(s.planetsAddress).ownerOf(
                s.sendTerraform[_sendTerraformId].toPlanetId
            ) != address(this)
        ) {
            returnShipsToHome(
                s.sendTerraform[_sendTerraformId].fromPlanetId,
                s.sendTerraform[_sendTerraformId].shipsIds
            );
            emit resolvedTerraforming(_sendTerraformId);
            delete s.sendTerraform[_sendTerraformId];
            return;
        }

        require(
            block.timestamp >= s.sendTerraform[_sendTerraformId].arrivalTime,
            "ShipsFacet: not ready yet"
        );

        uint256 terraformerId;

        for (
            uint256 i = 0;
            i < s.sendTerraform[_sendTerraformId].shipsIds.length;
            ++i
        ) {
            if (
                this
                    .getShipStatsDiamond(
                        s.sendTerraform[_sendTerraformId].shipsIds[i]
                    )
                    .shipType == 9
            ) {
                terraformerId = s.sendTerraform[_sendTerraformId].shipsIds[i];
            } else {
                s.assignedPlanet[
                    s.sendTerraform[_sendTerraformId].shipsIds[i]
                ] = s.sendTerraform[_sendTerraformId].toPlanetId;
            }
        }

        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    _sendTerraformId
                )
            )
        );

        s.planetType[s.sendTerraform[_sendTerraformId].toPlanetId] =
            (random % 4) +
            3;

        //@notice transferring planet to terraformer owner. Event on Planet contract
        IPlanets(s.planetsAddress).planetTerraform(
            s.sendTerraform[_sendTerraformId].toPlanetId,
            IShips(s.shipsAddress).ownerOf(terraformerId)
        );

        //@notice to start mining-timer for accumulating mining rewards
        s.lastClaimed[s.sendTerraform[_sendTerraformId].toPlanetId] =
            block.timestamp -
            1 hours;

        //@notice burn terraformer ship from owner

        IShips(s.shipsAddress).burnShip(terraformerId);

        emit resolvedTerraforming(_sendTerraformId);

        //@TODO dont delete, put into resolved instead.
        delete s.sendTerraform[_sendTerraformId];
    }

    function startOutMining(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] calldata _shipIds
    ) external onlyPlanetOwner(_fromPlanetId) {
        // only unowned planets can be outmined ( see GAL-62 Asteroid Feature for future plans)
        require(
            IERC721(s.planetsAddress).ownerOf(_toPlanetId) == address(this) &&
                this.getPlanetType(_toPlanetId) != 2,
            "AppStorage: Planet is owned by somebody else!"
        );

        //check if ship is owned by Player & assigned to the planet. Check if ship is the right type

        //@notice, can be refactored to less calls to external contract

        for (uint256 i; i < _shipIds.length; ++i) {
            require(
                s.assignedPlanet[_shipIds[i]] == _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IShips(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            uint256 shipType = s.SpaceShips[_shipIds[i]].shipType;

            require(shipType == 7, "only minerShip!");
            delete s.assignedPlanet[_shipIds[i]];
        }

        uint256 arrivalTime = calculateTravelTime(
            _fromPlanetId,
            _toPlanetId,
            s.playersFaction[msg.sender]
        );

        uint miningTime = 24 hours;

        //Rapid Asteroid Mining Procedures 25% mining speed buff
        if (s.playerTechnologies[msg.sender][4][8]) {
            miningTime -= 6 hours;
        }
        s.outMiningId++;

        OutMining memory newOutMining = OutMining(
            s.outMiningId,
            _fromPlanetId,
            _toPlanetId,
            _shipIds,
            block.timestamp,
            arrivalTime + miningTime
        );

        s.outMining[s.outMiningId] = newOutMining;
        emit StartOutMining(
            s.outMiningId,
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            _shipIds,
            arrivalTime + miningTime
        );
    }

    function getCargo(uint256 _shipId) internal view returns (uint256) {
        return s.SpaceShips[_shipId].cargo * 1e18;
    }

    function resolveOutMining(uint256 _outMiningId) external {
        //if the destinationPlanet has changed to be non-outminable,
        //return the ships to the origin or, if conquered, to another owned planet

        if (
            IERC721(s.planetsAddress).ownerOf(
                s.outMining[_outMiningId].toPlanetId
            ) !=
            address(this) ||
            IERC721(s.planetsAddress).ownerOf(
                s.outMining[_outMiningId].fromPlanetId
            ) !=
            IERC721(s.shipsAddress).ownerOf(
                s.outMining[_outMiningId].shipsIds[0]
            )
        ) {
            returnShipsToHome(
                s.outMining[_outMiningId].fromPlanetId,
                s.outMining[_outMiningId].shipsIds
            );
            emit resolvedOutmining(_outMiningId);
            delete s.outMining[_outMiningId];
            return;
        }

        require(
            block.timestamp >= s.outMining[_outMiningId].arrivalTime,
            "ShipsFacet: Mining hasnt concluded yet!"
        );

        uint256 buffedAsteroidMiningYield;

        uint destinationPlanetType = this.getPlanetType(
            s.outMining[_outMiningId].toPlanetId
        );

        //Asteroid Mining Buffs
        if (destinationPlanetType == 1) {
            //Technology Asteroid Mining Buffs
            if (s.playerTechnologies[msg.sender][4][7]) {
                buffedAsteroidMiningYield += 2; // representing 10% increase

                if (s.playerTechnologies[msg.sender][4][9]) {
                    buffedAsteroidMiningYield += 4; // representing another 20% increase
                }
            }
            //Naxian Asteroid Mining Buff
            if (s.playersFaction[msg.sender] == 1) {
                buffedAsteroidMiningYield += 2; // representing 10% increase
            }

            // Apply Commander Buffs

            //Home is where the minerals are[ ID 5], 20% increase on asteroid mining yield
            if (s.activeCommanderTraits[msg.sender][5]) {
                buffedAsteroidMiningYield += 4; // representing 20% increase
            }
        }

        for (uint256 i; i < s.outMining[_outMiningId].shipsIds.length; ++i) {
            uint256 cargo = getCargo(s.outMining[_outMiningId].shipsIds[i]);
            // cargo metal

            for (uint256 j = 0; j < 4; j++) {
                uint256 minedAmount = calculatePercentage(
                    cargo,
                    20 + buffedAsteroidMiningYield
                );

                //mining the resources on the diamond
                if (j < 3) {
                    s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                        j
                    ] += minedAmount;

                    IPlanets(s.planetsAddress).mineResource(
                        s.outMining[_outMiningId].toPlanetId,
                        j,
                        minedAmount
                    );
                }
                //mining aether
                else {
                    //PlanetType 1 is an Asteroid Belt. Only those are able to redeem aether
                    if (destinationPlanetType == 1) {
                        minedAmount = calculatePercentage(cargo, 3);

                        s.aetherHeldPlayer[
                            IShips(s.shipsAddress).ownerOf(
                                s.outMining[_outMiningId].shipsIds[0]
                            )
                        ] += minedAmount;
                    }
                }

                //@TODO minting erc20 tokens every time they are generated is wasting a ton of gas.
                //@notice   Ideally, we would only mint them when withdrawing from the diamond
                //mints the erc20 tokenss
                if (j == 0) {
                    IResource(s.metalAddress).mint(address(this), minedAmount);
                } else if (j == 1) {
                    IResource(s.crystalAddress).mint(
                        address(this),
                        minedAmount
                    );
                } else if (j == 2) {
                    IResource(s.antimatterAddress).mint(
                        address(this),
                        minedAmount
                    );
                } else if (j == 3) {
                    IResource(s.aetherAddress).mint(address(this), minedAmount);
                }
            }

            s.assignedPlanet[s.outMining[_outMiningId].shipsIds[i]] = s
                .outMining[_outMiningId]
                .fromPlanetId;
        }

        emit resolvedOutmining(_outMiningId);
        delete s.outMining[_outMiningId];
    }

    function returnShipsToHome(
        uint _fromPlanet,
        uint256[] memory _shipIds
    ) internal {
        //origin planet is still owned by the shipOwner Player

        address shipOwner = IERC721(s.shipsAddress).ownerOf(_shipIds[0]);
        if (shipOwner == IERC721(s.planetsAddress).ownerOf(_fromPlanet)) {
            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = _fromPlanet;
            }
        }
        //player doesnt own any planets anymore, ships go to a tradehub ( curr always planet #42)
        else if (IERC721(s.planetsAddress).balanceOf(shipOwner) == 0) {
            uint tradeHubPlanet = 1;

            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = tradeHubPlanet;
            }
        } else {
            uint256 alternativeHomePlanet = IERC721(s.planetsAddress)
                .tokenOfOwnerByIndex(shipOwner, 0);

            for (uint256 i = 0; i < _shipIds.length; ++i) {
                s.assignedPlanet[_shipIds[i]] = alternativeHomePlanet;
            }
        }
    }

    /* temporary disabled
    function calculateMinedResourceAmount(
        uint256 cargo,
        bool isAsteroidbelt
    ) external view returns (uint256[] memory) {
        uint256[] memory minedAmounts = new uint256[](4); // Array to store mined amounts for each resource

        for (uint256 j = 0; j < 4; j++) {
            uint256 minedAmount = 0;

            // Mining the resources on the diamond
            if (j < 3) {
                minedAmount = calculatePercentage(cargo, 30);
            }
            // Mining aether
            else {
                // PlanetType 1 is an Asteroid Belt. Only those are able to redeem aether
                if (isAsteroidbelt) {
                    minedAmount = calculatePercentage(cargo, 5);
                }
            }

            minedAmounts[j] = minedAmount;
        }

        return minedAmounts;
    }

    */

    //@TODO @NOTICE TEMP FIX BECAUSE OF WRONG ARRAY INSERT IN FINALZE REGISTER
    function getPlanetType(uint256 _planetId) external view returns (uint256) {
        if (_planetId == 1) {
            return 2;
        }
        return s.planetType[_planetId];
    }

    function getPlanetAmount() external view returns (uint256) {
        return s.totalPlanetsAmount;
    }

    function calculatePercentage(
        uint256 amount,
        uint256 percentage
    ) public pure returns (uint256) {
        return (amount * percentage * 100) / 1e4;
    }

    function startSendResources(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[3] memory _resourcesToSend
    ) external onlyPlanetOwner(_fromPlanetId) {
        //only owned planets/ allied planets can receive resources
        require(
            checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) ==
                checkAlliance(msg.sender) ||
                msg.sender == IERC721(s.planetsAddress).ownerOf(_toPlanetId),
            "not a friendly destination!"
        );

        //check and reduce resources from origin transport

        require(
            s.planetResources[_fromPlanetId][0] >= _resourcesToSend[0],
            "ShipsFacet: not enough metal"
        );
        require(
            s.planetResources[_fromPlanetId][1] >= _resourcesToSend[1],
            "ShipsFacet: not enough crystal"
        );
        require(
            s.planetResources[_fromPlanetId][2] >= _resourcesToSend[2],
            "ShipsFacet: not enough antimatter"
        );

        s.planetResources[_fromPlanetId][0] -= _resourcesToSend[0];
        s.planetResources[_fromPlanetId][1] -= _resourcesToSend[1];
        s.planetResources[_fromPlanetId][2] -= _resourcesToSend[2];

        IERC20(s.metalAddress).burnFrom(address(this), _resourcesToSend[0]);
        IERC20(s.crystalAddress).burnFrom(address(this), _resourcesToSend[1]);
        IERC20(s.antimatterAddress).burnFrom(
            address(this),
            _resourcesToSend[2]
        );

        uint256 totalAmount = _resourcesToSend[0] +
            _resourcesToSend[1] +
            _resourcesToSend[2];

        (
            uint256 totalCapacity,
            uint256[] memory cargoShipIds,
            uint256[] memory CargoCapacitiesShips
        ) = getCargoShipsPlanet(_fromPlanetId);

        require(totalCapacity * 1e18 >= totalAmount, "above capacity!");

        uint256 carriedAmount;

        for (uint256 i; i < cargoShipIds.length; ++i) {
            /*
            require(
                IShips(s.shipsAddress).ownerOf(cargoShipIds[i]) == msg.sender,
                "not your ship!"
            );
            */
            carriedAmount += CargoCapacitiesShips[i];

            delete s.assignedPlanet[cargoShipIds[i]];

            if (carriedAmount >= totalAmount) {
                for (uint256 j = i + 1; j < cargoShipIds.length; j++) {
                    delete cargoShipIds[j];
                }
                break;
            }
        }

        uint256 arrivalTime = calculateTravelTime(
            _fromPlanetId,
            _toPlanetId,
            s.playersFaction[msg.sender]
        );

        s.transferResourceId++;

        s.transferResource[s.transferResourceId] = TransferResource(
            _fromPlanetId,
            _toPlanetId,
            cargoShipIds,
            block.timestamp,
            arrivalTime,
            _resourcesToSend
        );

        emit StartSendResources(
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            cargoShipIds,
            arrivalTime
        );
    }

    function checkShippingCapacities(
        uint256 _planetId
    ) external view returns (uint256) {
        uint256 totalShippingCapacity;
        address _player = IERC721(s.planetsAddress).ownerOf(_planetId);
        uint256 totalCount = IERC721(s.shipsAddress).balanceOf(_player);

        uint256[] memory ownedShips = new uint256[](totalCount);
        for (uint256 i = 0; i < totalCount; ++i) {
            ownedShips[i] = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        uint256 currShipType;
        uint256 currShipCargo;
        for (uint256 i = 0; i < totalCount; ++i) {
            currShipType = s.SpaceShips[ownedShips[i]].shipType;

            currShipCargo = s.SpaceShips[ownedShips[i]].cargo;

            if (currShipType == 8) {
                if (s.assignedPlanet[ownedShips[i]] == _planetId) {
                    totalShippingCapacity += currShipCargo;
                }
            }
        }

        return currShipCargo;
    }

    function getCargoShipsPlanet(
        uint256 _planetId
    ) internal view returns (uint256, uint256[] memory, uint256[] memory) {
        address _player = IERC721(s.planetsAddress).ownerOf(_planetId);
        uint256 totalCount = IERC721(s.shipsAddress).balanceOf(_player);
        uint256 counter;
        uint256[] memory ownedShips = new uint256[](totalCount);
        uint256[] memory cargoShips = new uint256[](totalCount);
        uint256[] memory cargoCapacity = new uint256[](totalCount);

        uint256 totalShippingCapacity;
        uint256 currShipType;
        uint256 currShipCargo;

        for (uint256 i = 0; i < totalCount; ++i) {
            ownedShips[i] = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        for (uint256 i = 0; i < totalCount; ++i) {
            currShipType = s.SpaceShips[ownedShips[i]].shipType;

            if (s.assignedPlanet[ownedShips[i]] == _planetId) {
                currShipCargo = s.SpaceShips[ownedShips[i]].cargo;
                cargoShips[counter] = ownedShips[i];
                cargoCapacity[counter] = currShipCargo;
                totalShippingCapacity += currShipCargo;
            }
        }
        return (totalShippingCapacity, cargoShips, cargoCapacity);
    }

    //@TODO add event emit
    function resolveSendResources(uint256 _transferResourceId) external {
        address shipsOwner = IERC721(s.shipsAddress).ownerOf(
            s.transferResource[_transferResourceId].shipsIds[0]
        );

        if (
            checkAlliance(
                IERC721(s.planetsAddress).ownerOf(
                    s.transferResource[_transferResourceId].toPlanetId
                )
            ) != checkAlliance(msg.sender)
        ) {
            returnShipsToHome(
                s.transferResource[_transferResourceId].fromPlanetId,
                s.transferResource[_transferResourceId].shipsIds
            );

            delete s.transferResource[_transferResourceId];
            return;
        }

        require(
            block.timestamp >=
                s.transferResource[_transferResourceId].arrivalTime,
            "ShipsFacet: not ready yet"
        );

        //fulfill delivery
        s.planetResources[s.transferResource[_transferResourceId].toPlanetId][
            0
        ] += s.transferResource[_transferResourceId].sentResources[0];
        s.planetResources[s.transferResource[_transferResourceId].toPlanetId][
            1
        ] += s.transferResource[_transferResourceId].sentResources[1];
        s.planetResources[s.transferResource[_transferResourceId].toPlanetId][
            2
        ] += s.transferResource[_transferResourceId].sentResources[2];

        for (
            uint256 i;
            i < s.transferResource[_transferResourceId].shipsIds.length;
            ++i
        ) {
            //@TODO can create new function that batch-assigns ships to save gas

            s.assignedPlanet[
                s.transferResource[_transferResourceId].shipsIds[i]
            ] = s.transferResource[_transferResourceId].fromPlanetId;
        }

        delete s.transferResource[_transferResourceId];
    }

    function checkAlliance(
        address _playerToCheck
    ) internal view returns (bytes32) {
        return s.allianceOfPlayer[_playerToCheck];
    }

    function calculateTravelTime(
        uint256 _from,
        uint256 _to,
        uint256 factionOfPlayer
    ) internal returns (uint256) {
        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_from);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _to
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;

        uint256 arrivalTime = xDist + yDist + 600 + block.timestamp;
        if (factionOfPlayer == 2) {
            arrivalTime -= (((xDist + yDist) * 30) / 100);
        }

        // Apply Commander Buffs
        //@TODO testing
        //Are we there yet? [ID 7], 15% faster ship travel time
        if (s.activeCommanderTraits[msg.sender][7]) {
            arrivalTime -= (((xDist + yDist) * 15) / 100);
        }

        return arrivalTime;
    }

    function checkTravelTime(
        uint256 _from,
        uint256 _to,
        uint256 factionOfPlayer
    ) external view returns (uint256) {
        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_from);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _to
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;

        uint256 arrivalTime = xDist + yDist + 600 + block.timestamp;
        if (factionOfPlayer == 2) {
            arrivalTime -= (((xDist + yDist) * 30) / 100);
        }

        return arrivalTime;
    }

    function showIncomingTerraformersPlanet(
        uint256 _planetId
    ) external view returns (SendTerraform[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i < s.sendTerraformId; ++i) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                totalCount++;
            }
        }

        SendTerraform[] memory incomingTerraformers = new SendTerraform[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < s.sendTerraformId; ++i) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                incomingTerraformers[counter] = s.sendTerraform[i];
                counter++;
            }
        }

        return incomingTerraformers;
    }

    function getAllTerraformingPlayer(
        address _playerToCheck
    ) external view returns (SendTerraform[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i < s.sendTerraformId; ++i) {
            if (s.sendTerraform[i].toPlanetId == 0) {
                continue;
            }
            if (
                IShips(s.shipsAddress).ownerOf(
                    s.sendTerraform[i].shipsIds[0]
                ) == _playerToCheck
            ) {
                totalCount++;
            }
        }

        SendTerraform[] memory outgoingTerraformersPlayer = new SendTerraform[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < s.sendTerraformId; ++i) {
            if (s.sendTerraform[i].toPlanetId == 0) {
                continue;
            }

            if (
                IShips(s.shipsAddress).ownerOf(
                    s.sendTerraform[i].shipsIds[0]
                ) == _playerToCheck
            ) {
                outgoingTerraformersPlayer[counter] = s.sendTerraform[i];
                counter++;
            }
        }

        return outgoingTerraformersPlayer;
    }

    function showTerraformingInstance(
        uint256 _idToCheck
    ) external view returns (SendTerraform memory) {
        return s.sendTerraform[_idToCheck];
    }

    function showOutminingInstance(
        uint256 _idToCheck
    ) external view returns (OutMining memory) {
        return s.outMining[_idToCheck];
    }

    function getAllOutMiningPlanet(
        uint256 _planetId
    ) external view returns (OutMining[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i <= s.outMiningId + 1; ++i) {
            if (s.outMining[i].toPlanetId == _planetId) {
                totalCount++;
            }
        }

        OutMining[] memory allOutMinings = new OutMining[](totalCount);

        uint256 counter = 0;

        for (uint256 i = 0; i <= s.outMiningId + 1; ++i) {
            if (s.outMining[i].toPlanetId == _planetId) {
                allOutMinings[counter] = s.outMining[i];
                counter++;
            }
        }

        return allOutMinings;
    }

    function getAllOutMiningPlayer(
        address _player
    ) external view returns (OutMining[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i <= s.outMiningId + 1; ++i) {
            if (s.outMining[i].fromPlanetId == 0) {
                continue;
            }

            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.outMining[i].fromPlanetId
                ) == _player
            ) {
                totalCount++;
            }
        }

        OutMining[] memory allOutMinings = new OutMining[](totalCount);

        uint256 counter = 0;

        for (uint256 i = 0; i <= s.outMiningId + 1; ++i) {
            if (s.outMining[i].fromPlanetId == 0) {
                continue;
            }

            if (
                IERC721(s.planetsAddress).ownerOf(
                    s.outMining[i].fromPlanetId
                ) == _player
            ) {
                allOutMinings[counter] = s.outMining[i];
                counter++;
            }
        }

        return allOutMinings;
    }

    function getAllSendResources(
        uint256 _planetId
    ) external view returns (TransferResource[] memory) {
        uint256 totalCount;
        for (uint256 i = 1; i <= s.transferResourceId + 1; ++i) {
            if (s.transferResource[i].fromPlanetId == _planetId) {
                totalCount++;
            }
        }

        TransferResource[] memory allSendResources = new TransferResource[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 1; i <= s.transferResourceId + 1; ++i) {
            if (s.transferResource[i].fromPlanetId == _planetId) {
                allSendResources[counter] = s.transferResource[i];
                counter++;
            }
        }

        return allSendResources;
    }

    //@TODO crafting shipModules.
    //@TODO unequipping shipModules.

    // function equipShipModule(uint256 _moduleToEquip, uint256 _shipId) external {
    //     require(
    //         _moduleToEquip <= s.totalAvailableShipModules,
    //         "Module Item Id Doesnt exist!"
    //     );
    //     require(
    //         IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
    //         "not your ship!"
    //     );

    //     uint256 currAssignedPlanet = s.assignedPlanet[_shipId];

    //     require(
    //         IERC721(s.planetsAddress).ownerOf(currAssignedPlanet) == msg.sender,
    //         "ship is not on an owned planet!"
    //     );
    //     require(s.availableModuleSlots[_shipId] > 0, "all Module slots taken!");

    //     for (uint256 i = 0; i < 3; ++i) {
    //         require(
    //             s.planetResources[currAssignedPlanet][i] >=
    //                 s.shipModuleType[_moduleToEquip].price[i],
    //             "ShipsFacet: not enough resources"
    //         );
    //         s.planetResources[currAssignedPlanet][i] -= s
    //             .shipModuleType[_moduleToEquip]
    //             .price[i];
    //         burnResource(i, s.shipModuleType[_moduleToEquip].price[i]);
    //     }

    //     s.equippedShipModuleType[_shipId][
    //         s.availableModuleSlots[_shipId] - 1
    //     ] = s.shipModuleType[_moduleToEquip];
    //     s.availableModuleSlots[_shipId] -= 1;
    //     s.SpaceShips[_shipId].health += s
    //         .shipModuleType[_moduleToEquip]
    //         .healthBoostStat;

    //     for (uint256 i = 0; i < 3; ++i) {
    //         modifyShipStats(i, _shipId, _moduleToEquip);
    //     }
    // }

    function burnResource(uint256 i, uint256 amount) internal {
        if (i == 0) {
            IERC20(s.metalAddress).burnFrom(address(this), amount);
        } else if (i == 1) {
            IERC20(s.crystalAddress).burnFrom(address(this), amount);
        } else {
            IERC20(s.antimatterAddress).burnFrom(address(this), amount);
        }
    }

    // function modifyShipStats(
    //     uint256 i,
    //     uint256 _shipId,
    //     uint256 _moduleToEquip
    // ) internal {
    //     s.SpaceShips[_shipId].attackTypes[i] += s
    //         .shipModuleType[_moduleToEquip]
    //         .attackBoostStat[i];
    //     s.SpaceShips[_shipId].attackTypes[i] += s
    //         .shipModuleType[_moduleToEquip]
    //         .defenseBoostStat[i];
    // }

    //@notice leveling will be instant, but there will be a cooldown afterwards

    //@notice disabled until tech-tree implementation.
    /*
    function levelShip(uint _shipId) external {
        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        //@TODO require to be stationary, not travelling
        uint currAssignedPlanet = s.assignedPlanet[_shipId];

        require(
            IERC721(s.planetsAddress).ownerOf(currAssignedPlanet) == msg.sender,
            "ship isnt assigned to one of your planets due to movement / friendly base"
        );

        uint shipTypeToLevel = s.SpaceShips[_shipId].shipType;
        uint currLevel = checkCurrentLevelShip(_shipId);
        require(
            currLevel < s.maxLevelShipType[shipTypeToLevel],
            "cannot level further!"
        );

        for (uint i = 0; i < 3; ++i) {
            require(
                s.planetResources[currAssignedPlanet][i] >=
                    s.resourceCostLeveling[shipTypeToLevel][currLevel][i],
                "ShipsFacet: not enough resource!"
            );
            s.planetResources[currAssignedPlanet][i] -= s.resourceCostLeveling[
                shipTypeToLevel
            ][currLevel][i];
        }

        s.currentLevelShip[_shipId]++;

        //@TODO cooldown leveling (? Design question still)

        //@TODO less obtuse way of upgrading
        for (uint i = 0; i < 3; ++i) {
            upgradeShipStats(i, _shipId, shipTypeToLevel, currLevel);
        }
    }
    */

    // function upgradeShipStats(
    //     uint i,
    //     uint _shipId,
    //     uint shipTypeToLevel,
    //     uint currLevel
    // ) internal {
    //     s.SpaceShips[_shipId].attackTypes[i] += s.statsUpgradeLeveling[
    //         shipTypeToLevel
    //     ][currLevel + 1][i];
    //     s.SpaceShips[_shipId].defenseTypes[i] += s.statsUpgradeLeveling[
    //         shipTypeToLevel
    //     ][currLevel + 1][i + 3];
    //     if (i == 0) {
    //         s.SpaceShips[_shipId].health += s.statsUpgradeLeveling[
    //             shipTypeToLevel
    //         ][currLevel + 1][6];
    //     }
    // }

    // function checkCurrentLevelShip(uint _tokenId) internal returns (uint) {
    //     return s.currentLevelShip[_tokenId];
    // }

    function checkAvailableModuleSlots(
        uint256 _shipId
    ) external view returns (uint256) {
        return s.availableModuleSlots[_shipId];
    }

    // function returnEquippedModuleSlots(
    //     uint256 _shipId
    // ) external view returns (ShipModule[] memory) {
    //     uint256 maxModules = s.SpaceShips[_shipId].moduleSlots;
    //     ShipModule[] memory currentModules = new ShipModule[](maxModules);
    //     for (uint256 i = 0; i < s.SpaceShips[_shipId].moduleSlots; ++i) {
    //         currentModules[i] = s.equippedShipModuleType[_shipId][i];
    //     }

    //     return currentModules;
    // }

    function getShipStatsDiamond(
        uint256 _shipId
    ) external view returns (ShipType memory) {
        return s.SpaceShips[_shipId];
    }

    function getShipTypeStats(
        uint256 _shipId
    ) external view returns (ShipType memory) {
        return s.shipType[_shipId];
    }

    function getDefensePlanetDetailed(
        uint256 _planetId
    ) external view returns (uint256[] memory, ShipType[] memory) {
        //@TODO to be refactored / removed / fixed / solved differently
        uint256 totalFleetSize;
        for (uint256 i = 0; i < IShips(s.shipsAddress).totalSupply() + 1; ++i) {
            if (s.assignedPlanet[i] == _planetId) {
                totalFleetSize += 1;
            }
        }
        uint256[] memory defenseFleetToReturn = new uint256[](totalFleetSize);
        ShipType[] memory defenseFleetShipTypesToReturn = new ShipType[](
            totalFleetSize
        );

        for (uint256 i = 0; i < IShips(s.shipsAddress).totalSupply() + 1; ++i) {
            if (s.assignedPlanet[i] == _planetId) {
                defenseFleetToReturn[totalFleetSize - 1] = i;
                totalFleetSize--;
            }
        }

        for (uint256 j = 0; j < defenseFleetToReturn.length; j++) {
            defenseFleetShipTypesToReturn[j] = s.SpaceShips[
                defenseFleetToReturn[j]
            ];
        }

        return (defenseFleetToReturn, defenseFleetShipTypesToReturn);
    }

    function checkShipAssignedPlanet(
        uint _shipId
    ) external view returns (uint) {
        return s.assignedPlanet[_shipId];
    }

    function getDefensePlanetDetailedIds(
        uint256 _planetId
    ) external view returns (uint256[] memory) {
        //@TODO to be refactored / removed / fixed / solved differently
        //@NOTE THIS DOESNT CONSIDER FRIENDLY SHIPS ON THE PLANET FROM ALLIANCE MEMBERS AS DEFENDERS!

        address defenderPlayer = IERC721(s.planetsAddress).ownerOf(_planetId);
        uint256 totalShips = IERC721(s.shipsAddress).balanceOf(defenderPlayer);
        uint256[] memory defenseFleet = new uint256[](totalShips);

        uint256 index = 0;

        for (uint256 i = 0; i < totalShips; ++i) {
            uint256 shipId = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                defenderPlayer,
                i
            );
            if (s.assignedPlanet[shipId] == _planetId) {
                defenseFleet[index] = shipId;
                index++;
            }
        }

        // resize the array to the actual number of defender ships
        // resize the array to the actual number of defender ships
        uint256[] memory defenseFleetToReturn;

        defenseFleetToReturn = new uint256[](index);
        for (uint256 i = 0; i < index; ++i) {
            defenseFleetToReturn[i] = defenseFleet[i];
        }

        return defenseFleetToReturn;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, OutMining, SendTerraform, TransferResource, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./AdminFacet.sol";

contract ShipsFacet is Modifiers {
    event SendTerraformer(
        uint256 indexed toPlanet,
        uint256 indexed arrivalTime,
        uint256 indexed instanceId
    );
    event StartOutMining(
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

    function craftFleet(
        uint256 _fleetId,
        uint256 _planetId,
        uint256 _amount
    ) external onlyPlanetOwner(_planetId) {
        IShips fleetsContract = IShips(s.shipsAddress);
        uint256[4] memory price = fleetsContract.getPrice(_fleetId);
        uint256 craftTime = fleetsContract.getCraftTime(_fleetId);
        uint256 craftedFrom = fleetsContract.getCraftedFrom(_fleetId);
        uint256 buildings = s.buildings[_planetId][craftedFrom];
        require(
            _amount > 0 && _amount % 1 == 0 && _amount <= 10,
            "minimum 1, only in 1 increments, max 10"
        );
        require(craftTime > 0, "ShipsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "ShipsFacet: planet already crafting"
        );
        require(buildings > 0, "ShipsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);

        //Hivemind  Craft-Time Buff.
        if (s.playersFaction[msg.sender] == 3) {
            readyTimestamp -=
                ((block.timestamp + (craftTime * _amount)) * 20) /
                100;
        }
        CraftItem memory newFleet = CraftItem(
            _amount,
            _planetId,
            _fleetId,
            readyTimestamp
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
    }

    function claimFleet(
        uint256 _planetId
    ) external onlyPlanetOwnerOrChainRunner(_planetId) {
        require(
            block.timestamp >= s.craftFleets[_planetId].readyTimestamp,
            "ShipsFacet: not ready yet"
        );

        uint256 shipTypeId;
        uint256 shipId;

        for (uint256 i = 0; i < s.craftFleets[_planetId].amount; i++) {
            //@TODO refactor to batchMinting

            shipId = IShips(s.shipsAddress).mint(
                IERC721(s.planetsAddress).ownerOf(_planetId),
                s.craftFleets[_planetId].itemId
            );

            //assign shipType to shipNFTID on Diamond

            ShipType memory newShipType = s.shipType[
                s.craftFleets[_planetId].itemId
            ];

            if (
                s.playersFaction[IERC721(s.planetsAddress).ownerOf(_planetId)] >
                1
            ) {} else if (
                s.playersFaction[
                    IERC721(s.planetsAddress).ownerOf(_planetId)
                ] == 0
            ) {
                newShipType.attackTypes[2] += ((newShipType.attackTypes[0] *
                    ((10))) / 100);

                newShipType.defenseTypes[2] += ((newShipType.defenseTypes[0] *
                    ((10))) / 100);
            } else if (
                s.playersFaction[
                    IERC721(s.planetsAddress).ownerOf(_planetId)
                ] == 1
            ) {
                newShipType.attackTypes[0] += ((newShipType.attackTypes[0] *
                    ((10))) / 100);

                newShipType.defenseTypes[0] += ((newShipType.defenseTypes[0] *
                    ((10))) / 100);
            }

            s.SpaceShips[shipId] = newShipType;

            shipTypeId = s.craftFleets[_planetId].itemId;

            s.fleets[_planetId][shipTypeId] += 1;

            IShips(s.shipsAddress).assignShipToPlanet(shipId, _planetId);

            s.assignedPlanet[shipId] = _planetId;

            s.availableModuleSlots[shipId] += s
                .shipType[s.craftFleets[_planetId].itemId]
                .moduleSlots;
        }

        delete s.craftFleets[_planetId];

        //@notice for the alpha, you are PVP enabled once you are claiming your first spaceship
        IPlanets(s.planetsAddress).enablePVP(_planetId);
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

        for (uint256 i = 0; i < totalCount; i++) {
            ownedPlanets[i] = IERC721(s.planetsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        for (uint256 i = 0; i < totalCount; i++) {
            currentlyCraftedBuildings[counter] = s.craftFleets[ownedPlanets[i]];
            counter++;
        }

        return currentlyCraftedBuildings;
    }

    function assignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            s.fleets[_toPlanetId][
                IShips(s.shipsAddress).getShipStats(_shipsTokenIds[i]).shipType
            ] += 1;
        }
    }

    function unAssignNewShipTypeAmount(
        uint256 _toPlanetId,
        uint256[] memory _shipsTokenIds
    ) internal {
        for (uint256 i = 0; i < _shipsTokenIds.length; i++) {
            s.fleets[_toPlanetId][
                IShips(s.shipsAddress).getShipStats(_shipsTokenIds[i]).shipType
            ] -= 1;
        }
    }

    function unAssignNewShipTypeIdAmount(
        uint256 _toPlanetId,
        uint256 _shipsTokenIds
    ) internal {
        s.fleets[_toPlanetId][
            IShips(s.shipsAddress).getShipStats(_shipsTokenIds).shipType
        ] -= 1;
    }

    function sendTerraform(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _shipId
    ) external onlyPlanetOwner(_fromPlanetId) {
        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        //@TODO replace with simple ID check to save gas.
        require(
            compareStrings(
                IShips(s.shipsAddress).getShipStats(_shipId).name,
                "Terraformer"
            ),
            "only terraform-capital ships can transform uninhabitated planets!"
        );

        //@notice: require an unowned planet
        require(
            IERC721(s.planetsAddress).ownerOf(_toPlanetId) == address(this),
            "planet already terraformed!"
        );

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
            _shipId,
            block.timestamp,
            arrivalTime
        );

        s.sendTerraform[s.sendTerraformId] = newSendTerraform;

        //unassign ship from home planet & substract amount
        // todo remove duplicate storage of assignedPlanet
        IShips(s.shipsAddress).deleteShipFromPlanet(_shipId);
        delete s.assignedPlanet[_shipId];
        unAssignNewShipTypeIdAmount(_fromPlanetId, _shipId);
        emit SendTerraformer(_toPlanetId, arrivalTime, s.sendTerraformId);
        s.sendTerraformId++;
    }

    //@notice resolve arrival of terraformer
    function endTerraform(uint256 _sendTerraformId) external {
        require(
            block.timestamp >= s.sendTerraform[_sendTerraformId].arrivalTime,
            "ShipsFacet: not ready yet"
        );

        //@notice transferring planet to terraformer owner. Event on Planet contract
        IPlanets(s.planetsAddress).planetTerraform(
            s.sendTerraform[_sendTerraformId].toPlanetId,
            IShips(s.shipsAddress).ownerOf(
                s.sendTerraform[_sendTerraformId].fleetId
            )
        );

        //@notice burn terraformer ship from owner

        IShips(s.shipsAddress).burnShip(
            s.sendTerraform[_sendTerraformId].fleetId
        );

        uint256 random = uint256(
            keccak256(
                abi.encodePacked(
                    blockhash(block.number - 1),
                    block.timestamp,
                    _sendTerraformId
                )
            )
        );
        s.planetType[s.sendTerraform[_sendTerraformId].toPlanetId] = random % 6;

        delete s.sendTerraform[_sendTerraformId];
    }

    function compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }

    function startOutMining(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256[] calldata _shipIds
    ) external onlyPlanetOwner(_fromPlanetId) {
        // only unowned planets can be outmined ( see GAL-62 Asteroid Feature for future plans)
        require(
            IERC721(s.planetsAddress).ownerOf(_toPlanetId) == address(this),
            "AppStorage: Planet is owned by somebody else!"
        );

        //check if ship is owned by Player & assigned to the planet. Check if ship is the right type

        //@notice, can be refactored to less calls to external contract

        for (uint256 i; i < _shipIds.length; i++) {
            require(
                IShips(s.shipsAddress).checkAssignedPlanet(_shipIds[i]) ==
                    _fromPlanetId,
                "ship is not assigned to this planet!"
            );

            require(
                IShips(s.shipsAddress).ownerOf(_shipIds[i]) == msg.sender,
                "not your ship!"
            );

            uint256 shipType = IShips(s.shipsAddress)
                .getShipStats(_shipIds[i])
                .shipType;

            require(shipType == 7, "only minerShip!");

            IShips(s.shipsAddress).deleteShipFromPlanet(_shipIds[i]);
        }

        uint256 arrivalTime = calculateTravelTime(
            _fromPlanetId,
            _toPlanetId,
            s.playersFaction[msg.sender]
        );

        OutMining memory newOutMining = OutMining(
            _fromPlanetId,
            _toPlanetId,
            _shipIds,
            block.timestamp,
            arrivalTime
        );
        s.outMiningId++;
        s.outMining[s.outMiningId] = newOutMining;
        emit StartOutMining(
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            _shipIds,
            arrivalTime
        );
    }

    function getCargo(uint256 _shipId) internal view returns (uint256) {
        return s.SpaceShips[_shipId].cargo;
    }

    function returnCargo(uint256 _shipId) external view returns (uint256) {
        return getCargo(_shipId);
    }

    function resolveOutMining(
        uint256 _outMiningId,
        uint256 _optionalReturnPlanet
    ) external {
        //if the from Planet is conquered,we need an alternate return planet. default for 0 for now.
        require(_optionalReturnPlanet == 0, "WIP PATH");

        require(
            block.timestamp >= s.outMining[_outMiningId].arrivalTime,
            "ShipsFacet: not ready yet"
        );
        for (uint256 i; i < s.outMining[_outMiningId].shipsIds.length; i++) {
            uint256 shipType = IShips(s.shipsAddress)
                .getShipStats(s.outMining[_outMiningId].shipsIds[i])
                .shipType;
            uint256 cargo = getCargo(s.outMining[_outMiningId].shipsIds[i]);
            // cargo metal

            //@TODO make mining yield random
            //@TODO refactor

            for (uint256 j = 0; j < 4; j++) {
                uint256 minedAmount = calculatePercentage(cargo, 30);

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
                    if (
                        this.getPlanetType(
                            s.outMining[_outMiningId].toPlanetId
                        ) == 1
                    ) {
                        minedAmount = calculatePercentage(cargo, 5);

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

            IShips(s.shipsAddress).assignShipToPlanet(
                s.outMining[_outMiningId].shipsIds[i],
                s.outMining[_outMiningId].fromPlanetId
            );
        }

        delete s.outMining[_outMiningId];
    }

    function getPlanetType(uint256 _planetId) external view returns (uint256) {
        return s.planetType[_planetId];
    }

    function getPlanetAmount() external view returns (uint256) {
        return s.totalPlanetsAmount;
    }

    function calculatePercentage(
        uint256 amount,
        uint256 percentage
    ) public returns (uint256) {
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

        require(totalCapacity >= totalAmount, "above capacity!");

        uint256 carriedAmount;

        for (uint256 i; i < cargoShipIds.length; i++) {
            require(
                IShips(s.shipsAddress).ownerOf(cargoShipIds[i]) == msg.sender,
                "not your ship!"
            );

            carriedAmount += CargoCapacitiesShips[i];

            IShips(s.shipsAddress).deleteShipFromPlanet(cargoShipIds[i]);

            if (carriedAmount >= totalAmount) {
                for (uint256 j = 0; j + i < cargoShipIds.length; j++) {
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
        TransferResource memory newTransferResource = TransferResource(
            _fromPlanetId,
            _toPlanetId,
            cargoShipIds,
            block.timestamp,
            arrivalTime,
            _resourcesToSend
        );
        s.transferResource[s.transferResourceId] = newTransferResource;
        s.transferResourceId++;
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
        for (uint256 i = 0; i < totalCount; i++) {
            ownedShips[i] = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        uint256 currShipType;
        uint256 currShipCargo;
        for (uint256 i = 0; i < totalCount; i++) {
            currShipType = IShips(s.shipsAddress)
                .getShipStats(ownedShips[i])
                .shipType;
            currShipCargo = IShips(s.shipsAddress).getCargo(ownedShips[i]);

            if (currShipType == 8) {
                if (
                    IShips(s.shipsAddress).checkAssignedPlanet(ownedShips[i]) ==
                    _planetId
                ) {
                    totalShippingCapacity += currShipCargo;
                }
            }
        }

        return currShipCargo;
    }

    //@TODO  to be refactored to backend/frontend nft selection. its a waste of gas imho

    function checkShippingCapacitiesInternal(
        uint256 _planetId
    ) internal view returns (uint256) {
        uint256 totalShippingCapacity;
        address _player = IERC721(s.planetsAddress).ownerOf(_planetId);
        uint256 totalCount = IERC721(s.shipsAddress).balanceOf(_player);

        uint256[] memory ownedShips = new uint256[](totalCount);
        for (uint256 i = 0; i < totalCount; i++) {
            ownedShips[i] = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        uint256 currShipType;
        uint256 currShipCargo;

        for (uint256 i = 0; i < totalCount; i++) {
            currShipType = IShips(s.shipsAddress)
                .getShipStats(ownedShips[i])
                .shipType;
            currShipCargo = IShips(s.shipsAddress).getCargo(ownedShips[i]);

            if (currShipType == 8) {
                if (
                    IShips(s.shipsAddress).checkAssignedPlanet(ownedShips[i]) ==
                    _planetId
                ) {
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

        for (uint256 i = 0; i < totalCount; i++) {
            ownedShips[i] = IERC721(s.shipsAddress).tokenOfOwnerByIndex(
                _player,
                i
            );
        }

        for (uint256 i = 0; i < totalCount; i++) {
            if (currShipType == 8) {
                if (
                    IShips(s.shipsAddress).checkAssignedPlanet(ownedShips[i]) ==
                    _planetId
                ) {
                    currShipCargo = IShips(s.shipsAddress).getCargo(
                        ownedShips[i]
                    );
                    cargoShips[counter] = ownedShips[i];
                    cargoCapacity[counter] = currShipCargo;
                    totalShippingCapacity += currShipCargo;
                }
            }
        }
        return (totalShippingCapacity, cargoShips, cargoCapacity);
    }

    function resolveSendResources(
        uint256 _transferResourceId,
        uint256 _optionalReturnPlanet
    ) external {
        //if the from Planet is conquered,we need an alternate return planet. default for 0 for now.
        require(_optionalReturnPlanet == 0, "WIP PATH");

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
            i++
        ) {
            //@TODO can create new function that batch-assigns ships to save gas
            IShips(s.shipsAddress).assignShipToPlanet(
                s.transferResource[_transferResourceId].shipsIds[i],
                s.transferResource[_transferResourceId].fromPlanetId
            );
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

        uint256 arrivalTime = xDist + yDist + block.timestamp;
        if (factionOfPlayer == 2) {
            arrivalTime -= (((xDist + yDist) * 30) / 100);
        }

        return arrivalTime;
    }

    //@notice should multiple terraformings be possible? counterplay?

    function showIncomingTerraformersPlanet2(
        uint256 _planetId
    ) external view returns (SendTerraform memory) {
        uint256 totalCount;
        for (uint256 i = 0; i < s.sendTerraformId; i++) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                return s.sendTerraform[i];
            }
        }
    }

    function showIncomingTerraformersPlanet(
        uint256 _planetId
    ) external view returns (SendTerraform[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i < s.sendTerraformId; i++) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                totalCount++;
            }
        }

        SendTerraform[] memory incomingTerraformers = new SendTerraform[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 0; i < s.sendTerraformId; i++) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                incomingTerraformers[counter] = s.sendTerraform[i];
                counter++;
            }
        }

        return incomingTerraformers;
    }

    function showTerraformingInstance(
        uint256 _idToCheck
    ) external view returns (SendTerraform memory) {
        return s.sendTerraform[_idToCheck];
    }

    function getAllOutMining(
        uint256 _planetId
    ) external view returns (OutMining[] memory) {
        uint256 totalCount;
        for (uint256 i = 0; i <= s.outMiningId; i++) {
            if (s.outMining[i].fromPlanetId == _planetId) {
                totalCount++;
            }
        }

        OutMining[] memory allOutMinings = new OutMining[](totalCount);

        uint256 counter = 0;

        for (uint256 i = 0; i <= s.outMiningId; i++) {
            if (s.outMining[i].fromPlanetId == _planetId) {
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
        for (uint256 i = 0; i <= s.transferResourceId; i++) {
            if (s.transferResource[i].fromPlanetId == _planetId) {
                totalCount++;
            }
        }

        TransferResource[] memory allSendResources = new TransferResource[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 0; i <= s.transferResourceId; i++) {
            if (s.transferResource[i].fromPlanetId == _planetId) {
                allSendResources[counter] = s.transferResource[i];
                counter++;
            }
        }

        return allSendResources;
    }

    //@TODO crafting shipModules.
    //@TODO unequipping shipModules.

    function equipShipModule(uint256 _moduleToEquip, uint256 _shipId) external {
        require(
            _moduleToEquip <= s.totalAvailableShipModules,
            "Module Item Id Doesnt exist!"
        );
        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        uint256 currAssignedPlanet = IShips(s.shipsAddress).checkAssignedPlanet(
            _shipId
        );

        require(
            IERC721(s.planetsAddress).ownerOf(currAssignedPlanet) == msg.sender,
            "ship is not on an owned planet!"
        );

        require(s.availableModuleSlots[_shipId] > 0, "all Module slots taken!");

        //currently there is a flat resource price per module. Simple

        require(
            s.planetResources[currAssignedPlanet][0] >=
                s.shipModuleType[_moduleToEquip].price[0],
            "ShipsFacet: not enough metal"
        );
        require(
            s.planetResources[currAssignedPlanet][1] >=
                s.shipModuleType[_moduleToEquip].price[1],
            "ShipsFacet: not enough crystal"
        );
        require(
            s.planetResources[currAssignedPlanet][2] >=
                s.shipModuleType[_moduleToEquip].price[2],
            "ShipsFacet: not enough antimatter"
        );

        s.planetResources[currAssignedPlanet][0] -= s
            .shipModuleType[_moduleToEquip]
            .price[0];
        s.planetResources[currAssignedPlanet][1] -= s
            .shipModuleType[_moduleToEquip]
            .price[1];
        s.planetResources[currAssignedPlanet][2] -= s
            .shipModuleType[_moduleToEquip]
            .price[2];
        IERC20(s.metalAddress).burnFrom(
            address(this),
            s.shipModuleType[_moduleToEquip].price[0]
        );
        IERC20(s.crystalAddress).burnFrom(
            address(this),
            s.shipModuleType[_moduleToEquip].price[1]
        );
        IERC20(s.antimatterAddress).burnFrom(
            address(this),
            s.shipModuleType[_moduleToEquip].price[2]
        );

        s.equippedShipModuleType[_shipId][
            s.availableModuleSlots[_shipId] - 1
        ] = s.shipModuleType[_moduleToEquip];

        s.availableModuleSlots[_shipId] -= 1;

        s.SpaceShips[_shipId].health += s
            .shipModuleType[_moduleToEquip]
            .healthBoostStat;

        for (uint256 i = 0; i < 3; i++) {
            s.SpaceShips[_shipId].attackTypes[i] += s
                .shipModuleType[_moduleToEquip]
                .attackBoostStat[i];

            s.SpaceShips[_shipId].attackTypes[i] += s
                .shipModuleType[_moduleToEquip]
                .defenseBoostStat[i];
        }
    }

    //@notice leveling will be instant, but there will be a cooldown afterwards
    function levelShip(uint _shipId) external {
        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        //@TODO require to be stationary, not travelling
        uint currAssignedPlanet = IShips(s.shipsAddress).checkAssignedPlanet(
            _shipId
        );

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

        for (uint i = 0; i < 3; i++) {
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
        s.SpaceShips[_shipId].attackTypes[0] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][0];
        s.SpaceShips[_shipId].attackTypes[1] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][1];
        s.SpaceShips[_shipId].attackTypes[2] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][2];

        s.SpaceShips[_shipId].defenseTypes[0] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][3];
        s.SpaceShips[_shipId].defenseTypes[1] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][4];
        s.SpaceShips[_shipId].defenseTypes[2] += s.statsUpgradeLeveling[
            shipTypeToLevel
        ][currLevel + 1][5];
        s.SpaceShips[_shipId].health += s.statsUpgradeLeveling[shipTypeToLevel][
            currLevel + 1
        ][6];
    }

    function checkCurrentLevelShip(uint _tokenId) internal returns (uint) {
        return s.currentLevelShip[_tokenId];
    }

    function checkAvailableModuleSlots(
        uint256 _shipId
    ) external view returns (uint256) {
        return s.availableModuleSlots[_shipId];
    }

    function returnEquippedModuleSlots(
        uint256 _shipId
    ) external view returns (ShipModule[] memory) {
        uint256 maxModules = s.SpaceShips[_shipId].moduleSlots;
        ShipModule[] memory currentModules = new ShipModule[](maxModules);
        for (uint256 i = 0; i < s.SpaceShips[_shipId].moduleSlots; i++) {
            currentModules[i] = s.equippedShipModuleType[_shipId][i];
        }

        return currentModules;
    }

    function getShipStatsDiamond(
        uint256 _shipId
    ) external view returns (ShipType memory) {
        return s.SpaceShips[_shipId];
    }

    function getDefensePlanetDetailed(
        uint256 _planetId
    ) external view returns (uint256[] memory, ShipType[] memory) {
        //@TODO to be refactored / removed / fixed / solved differently
        uint256 totalFleetSize;
        for (uint256 i = 0; i < IShips(s.shipsAddress).totalSupply() + 1; i++) {
            if (s.assignedPlanet[i] == _planetId) {
                totalFleetSize += 1;
            }
        }
        uint256[] memory defenseFleetToReturn = new uint256[](totalFleetSize);
        ShipType[] memory defenseFleetShipTypesToReturn = new ShipType[](
            totalFleetSize
        );
        for (uint256 i = 0; i < IShips(s.shipsAddress).totalSupply() + 1; i++) {
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
}

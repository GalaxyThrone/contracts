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
        uint256[3] memory price = fleetsContract.getPrice(_fleetId);
        uint256 craftTime = fleetsContract.getCraftTime(_fleetId);
        uint256 craftedFrom = fleetsContract.getCraftedFrom(_fleetId);
        uint256 buildings = s.buildings[_planetId][craftedFrom];
        require(
            _amount > 0 && _amount % 1 == 0,
            "minimum 1, only in 1 increments"
        );
        require(craftTime > 0, "ShipsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "ShipsFacet: planet already crafting"
        );
        require(buildings > 0, "ShipsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + (craftTime * _amount);
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
            "ShipsFacet: not enough ethereus"
        );

        s.planetResources[_planetId][0] -= price[0] * _amount;
        s.planetResources[_planetId][1] -= price[1] * _amount;
        s.planetResources[_planetId][2] -= price[2] * _amount;
        IERC20(s.metalAddress).burnFrom(address(this), price[0] * _amount);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1] * _amount);
        IERC20(s.ethereusAddress).burnFrom(address(this), price[2] * _amount);
    }

    function claimFleet(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
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

            shipTypeId = s.craftFleets[_planetId].itemId;

            s.fleets[_planetId][shipTypeId] += 1;

            IShips(s.shipsAddress).assignShipToPlanet(shipId, _planetId);
        }

        delete s.craftFleets[_planetId];

        //@notice for the alpha, you are PVP enabled once you are claiming your first spaceship
        IPlanets(s.planetsAddress).enablePVP(_planetId);
    }

    function getCraftFleets(uint256 _planetId)
        external
        view
        returns (CraftItem memory)
    {
        return (s.craftFleets[_planetId]);
    }

    function getAllCraftShipsPlayer(address _player)
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

        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_fromPlanetId);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 arrivalTime = xDist + yDist + block.timestamp;

        s.sendTerraformId++;

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
        IShips(s.shipsAddress).deleteShipFromPlanet(_shipId);
        unAssignNewShipTypeIdAmount(_fromPlanetId, _shipId);
        emit SendTerraformer(_toPlanetId, arrivalTime, s.sendTerraformId);
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

        delete s.sendTerraform[_sendTerraformId];
    }

    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
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

        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_fromPlanetId);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 arrivalTime = xDist + yDist + block.timestamp;

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
            uint256 cargo = IShips(s.shipsAddress).getCargo(
                s.outMining[_outMiningId].shipsIds[i]
            );
            // cargo metal

            //@TODO make mining yield random
            //@TODO refactor
            if (shipType == 7) {
                IPlanets(s.planetsAddress).mineResource(
                    s.outMining[_outMiningId].toPlanetId,
                    0,
                    cargo
                );
                IResource(s.metalAddress).mint(address(this), cargo);
                s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                        0
                    ] += calculatePercentage(cargo, 40);

                s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                        1
                    ] += calculatePercentage(cargo, 30);

                s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                        2
                    ] += calculatePercentage(cargo, 30);
            }

            IShips(s.shipsAddress).assignShipToPlanet(
                s.outMining[_outMiningId].shipsIds[i],
                s.outMining[_outMiningId].fromPlanetId
            );
        }

        delete s.outMining[_outMiningId];
    }

    function calculatePercentage(uint256 amount, uint256 percentage)
        public
        returns (uint256)
    {
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
            "ShipsFacet: not enough ethereus"
        );
        s.planetResources[_fromPlanetId][0] -= _resourcesToSend[0];
        s.planetResources[_fromPlanetId][1] -= _resourcesToSend[1];
        s.planetResources[_fromPlanetId][2] -= _resourcesToSend[2];

        IERC20(s.metalAddress).burnFrom(address(this), _resourcesToSend[0]);
        IERC20(s.crystalAddress).burnFrom(address(this), _resourcesToSend[1]);
        IERC20(s.ethereusAddress).burnFrom(address(this), _resourcesToSend[2]);

        //@notice WIP
        //@TODO (in that order)
        //load all owned ships from player
        //filter by courier ships
        //filter by ships on the planet
        //assign necessary nft ids to the mission

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

            require(shipType == 8, "only courier");

            IShips(s.shipsAddress).deleteShipFromPlanet(_shipIds[i]);
        }

        (uint256 fromX, uint256 fromY) = IPlanets(s.planetsAddress)
            .getCoordinates(_fromPlanetId);
        (uint256 toX, uint256 toY) = IPlanets(s.planetsAddress).getCoordinates(
            _toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 arrivalTime = xDist + yDist + block.timestamp;
        TransferResource memory newTransferResource = TransferResource(
            _fromPlanetId,
            _toPlanetId,
            _shipIds,
            block.timestamp,
            arrivalTime
        );
        s.transferResource[s.transferResourceId] = newTransferResource;
        s.transferResourceId++;
        emit StartSendResources(
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            _shipIds,
            arrivalTime
        );
    }

    function checkShippingCapacities(uint256 _planetId)
        external
        view
        returns (uint256)
    {
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

            if (currShipType == 7) {
                if (
                    IShips(s.shipsAddress).checkAssignedPlanet(ownedShips[i]) ==
                    _planetId
                ) {
                    totalShippingCapacity += currShipCargo;
                }
            }
        }
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

        for (
            uint256 i;
            i < s.transferResource[_transferResourceId].shipsIds.length;
            i++
        ) {
            uint256 shipType = IShips(s.shipsAddress)
                .getShipStats(
                    s.transferResource[_transferResourceId].shipsIds[i]
                )
                .shipType;
            uint256 cargo = IShips(s.shipsAddress).getCargo(
                s.transferResource[_transferResourceId].shipsIds[i]
            );
            // cargo metal
            if (shipType == 7) {
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][0] -= cargo;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][0] += cargo;
                // cargo crystal
            } else if (shipType == 10) {
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][1] -= cargo;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][1] += cargo;
                // cargo ethereus
            } else if (shipType == 11) {
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][2] -= cargo;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][2] += cargo;
                // courier
            } else if (shipType == 8) {
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][0] -= cargo;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][0] += cargo;
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][1] -= cargo / 3;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][1] += cargo / 3;
                s.planetResources[
                    s.transferResource[_transferResourceId].fromPlanetId
                ][2] -= cargo / 6;
                s.planetResources[
                    s.transferResource[_transferResourceId].toPlanetId
                ][2] += cargo / 6;
            }

            IShips(s.shipsAddress).assignShipToPlanet(
                s.transferResource[_transferResourceId].shipsIds[i],
                s.transferResource[_transferResourceId].fromPlanetId
            );
        }

        delete s.transferResource[_transferResourceId];
    }

    function checkAlliance(address _playerToCheck)
        internal
        view
        returns (bytes32)
    {
        return s.allianceOfPlayer[_playerToCheck];
    }

    function showIncomingTerraformersPlanet(uint256 _planetId)
        external
        view
        returns (SendTerraform[] memory)
    {
        uint256 totalCount;
        for (uint256 i = 0; i <= s.sendTerraformId; i++) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                totalCount++;
            }
        }

        SendTerraform[] memory incomingTerraformers = new SendTerraform[](
            totalCount
        );

        uint256 counter = 0;

        for (uint256 i = 0; i <= s.sendTerraformId; i++) {
            if (s.sendTerraform[i].toPlanetId == _planetId) {
                incomingTerraformers[counter] = s.sendTerraform[i];
                counter++;
            }
        }

        return incomingTerraformers;
    }

    function getAllOutMining(uint256 _planetId)
        external
        view
        returns (OutMining[] memory)
    {
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

    function getAllSendResources(uint256 _planetId)
        external
        view
        returns (TransferResource[] memory)
    {
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
}

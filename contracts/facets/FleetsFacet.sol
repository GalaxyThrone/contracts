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

contract FleetsFacet is Modifiers {
    event SendTerraformer(
        uint256 indexed toPlanet,
        uint256 indexed arrivalTime,
        address indexed sender
    );
    event StartOutMining(
        uint256 indexed fromPlanetId,
        uint256 indexed toPlanetId,
        address indexed sender,
        uint256 fleetId,
        uint256 resourceId,
        uint256 arrivalTime
    );
    event StartSendResources(
        uint256 indexed fromPlanetId,
        uint256 indexed toPlanetId,
        address indexed sender,
        uint256 fleetId,
        uint256 resourceId,
        uint256 amount,
        uint256 arrivalTime
    );

    function craftFleet(uint256 _fleetId, uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        IShips fleetsContract = IShips(s.shipsAddress);
        uint256[3] memory price = fleetsContract.getPrice(_fleetId);
        uint256 craftTime = fleetsContract.getCraftTime(_fleetId);
        uint256 craftedFrom = fleetsContract.getCraftedFrom(_fleetId);
        uint256 buildings = s.buildings[_planetId][craftedFrom];
        require(craftTime > 0, "FleetsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "FleetsFacet: planet already crafting"
        );
        require(buildings > 0, "FleetsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + craftTime;
        CraftItem memory newFleet = CraftItem(_fleetId, readyTimestamp);
        s.craftFleets[_planetId] = newFleet;
        require(
            s.planetResources[_planetId][0] >= price[0],
            "FleetsFacet: not enough metal"
        );
        require(
            s.planetResources[_planetId][1] >= price[1],
            "FleetsFacet: not enough crystal"
        );
        require(
            s.planetResources[_planetId][2] >= price[2],
            "FleetsFacet: not enough ethereus"
        );
        IERC20(s.metalAddress).burnFrom(address(this), price[0]);
        IERC20(s.crystalAddress).burnFrom(address(this), price[1]);
        IERC20(s.ethereusAddress).burnFrom(address(this), price[2]);
    }

    function claimFleet(uint256 _planetId)
        external
        onlyPlanetOwnerOrChainRunner(_planetId)
    {
        require(
            block.timestamp >= s.craftFleets[_planetId].readyTimestamp,
            "FleetsFacet: not ready yet"
        );
        uint256 shipId = IShips(s.shipsAddress).mint(
            msg.sender,
            s.craftFleets[_planetId].itemId
        );
        uint256 shipTypeId = s.craftFleets[_planetId].itemId;
        delete s.craftFleets[_planetId];

        s.fleets[_planetId][shipTypeId] += 1;
        IShips(s.shipsAddress).assignShipToPlanet(shipId, _planetId);

        //@notice for the alpha, you are PVP enabled once you are claiming your first spaceship
        IPlanets(s.planetsAddress).enablePVP(_planetId);
    }

    function getCraftFleets(uint256 _planetId)
        external
        view
        returns (uint256, uint256)
    {
        return (
            s.craftFleets[_planetId].itemId,
            s.craftFleets[_planetId].readyTimestamp
        );
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

        SendTerraform memory newSendTerraform = SendTerraform(
            _fromPlanetId,
            _toPlanetId,
            _shipId,
            block.timestamp,
            arrivalTime
        );
        s.sendTerraformId++;
        s.sendTerraform[s.sendTerraformId] = newSendTerraform;

        //unassign ship from home planet & substract amount
        IShips(s.shipsAddress).deleteShipFromPlanet(_shipId);
        unAssignNewShipTypeIdAmount(_fromPlanetId, _shipId);
        emit SendTerraformer(_toPlanetId, arrivalTime, msg.sender);
    }

    //@notice resolve arrival of terraformer
    function endTerraform(uint256 _sendTerraformId) external {
        require(
            block.timestamp >= s.sendTerraform[_sendTerraformId].arrivalTime,
            "FleetsFacet: not ready yet"
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
        uint256 _shipId,
        uint256 _resourceId
    ) external onlyPlanetOwner(_fromPlanetId) {
        // only unowned planets can be outmined ( see GAL-62 Asteroid Feature)
        require(
            IERC721(s.planetsAddress).ownerOf(_toPlanetId) == address(this),
            "AppStorage: Planet is owned by somebody else!"
        );

        //check if ship is owned by Player & assigned to the planet. Check if ship is the right type

        //@notice, can be refactored to less calls to external contract

        require(
            IShips(s.shipsAddress).checkAssignedPlanet(_shipId) ==
                _fromPlanetId,
            "ship is not assigned to this planet!"
        );

        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        uint256 shipType = IShips(s.shipsAddress)
            .getShipStats(_shipId)
            .shipType;

        require(shipType == 7 || shipType == 8, "only cargo/courier");

        IShips(s.shipsAddress).deleteShipFromPlanet(_shipId);

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
            _shipId,
            _resourceId,
            block.timestamp,
            arrivalTime
        );
        s.outMiningId++;
        s.outMining[s.outMiningId] = newOutMining;
        emit StartOutMining(
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            _shipId,
            _resourceId,
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
            "FleetsFacet: not ready yet"
        );
        uint256 cargo = IShips(s.shipsAddress).getCargo(
            s.outMining[_outMiningId].fleetId
        );
        IPlanets(s.planetsAddress).mineResource(
            s.outMining[_outMiningId].toPlanetId,
            s.outMining[_outMiningId].resourceId,
            cargo
        );
        if (s.outMining[_outMiningId].resourceId == 0) {
            IResource(s.metalAddress).mint(address(this), cargo);
            s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                0
            ] += cargo;
        } else if (s.outMining[_outMiningId].resourceId == 1) {
            IResource(s.crystalAddress).mint(address(this), cargo);
            s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                1
            ] += cargo;
        } else if (s.outMining[_outMiningId].resourceId == 2) {
            IResource(s.ethereusAddress).mint(address(this), cargo);
            s.planetResources[s.outMining[_outMiningId].fromPlanetId][
                2
            ] += cargo;
        }

        IShips(s.shipsAddress).assignShipToPlanet(
            s.outMining[_outMiningId].fleetId,
            s.outMining[_outMiningId].fromPlanetId
        );
        delete s.outMining[_outMiningId];
    }

    function startSendResources(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _shipId,
        uint256 _resourceId,
        uint256 _amount
    ) external onlyPlanetOwner(_fromPlanetId) {
        //only owned planets/ allied planets can receive resources
        require(
            checkAlliance(IERC721(s.planetsAddress).ownerOf(_toPlanetId)) ==
                checkAlliance(msg.sender) ||
                msg.sender == IERC721(s.planetsAddress).ownerOf(_toPlanetId),
            "not a friendly destination!"
        );

        //check if ship is owned by Player & assigned to the planet. Check if ship is the right type

        //@notice, can be refactored to less calls to external contract

        require(
            IShips(s.shipsAddress).checkAssignedPlanet(_shipId) ==
                _fromPlanetId,
            "ship is not assigned to this planet!"
        );

        require(
            IShips(s.shipsAddress).ownerOf(_shipId) == msg.sender,
            "not your ship!"
        );

        uint256 shipType = IShips(s.shipsAddress)
            .getShipStats(_shipId)
            .shipType;

        require(shipType == 7 || shipType == 8, "only cargo/courier");

        require(
            s.planetResources[_fromPlanetId][_resourceId] >= _amount,
            "FleetsFacet: not enough resources"
        );

        IShips(s.shipsAddress).deleteShipFromPlanet(_shipId);

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
            _shipId,
            _resourceId,
            _amount,
            block.timestamp,
            arrivalTime
        );
        s.transferResource[s.transferResourceId] = newTransferResource;
        s.transferResourceId++;
        emit StartSendResources(
            _fromPlanetId,
            _toPlanetId,
            msg.sender,
            _shipId,
            _resourceId,
            _amount,
            arrivalTime
        );
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
            "FleetsFacet: not ready yet"
        );
        if (s.transferResource[_transferResourceId].resourceId == 0) {
            s.planetResources[
                s.transferResource[_transferResourceId].fromPlanetId
            ][0] -= s.transferResource[_transferResourceId].amount;
            s.planetResources[
                s.transferResource[_transferResourceId].toPlanetId
            ][0] += s.transferResource[_transferResourceId].amount;
        } else if (s.transferResource[_transferResourceId].resourceId == 1) {
            s.planetResources[
                s.transferResource[_transferResourceId].fromPlanetId
            ][1] -= s.transferResource[_transferResourceId].amount;
            s.planetResources[
                s.transferResource[_transferResourceId].toPlanetId
            ][1] += s.transferResource[_transferResourceId].amount;
        } else if (s.transferResource[_transferResourceId].resourceId == 2) {
            s.planetResources[
                s.transferResource[_transferResourceId].fromPlanetId
            ][2] -= s.transferResource[_transferResourceId].amount;
            s.planetResources[
                s.transferResource[_transferResourceId].toPlanetId
            ][2] += s.transferResource[_transferResourceId].amount;
        }

        IShips(s.shipsAddress).assignShipToPlanet(
            s.transferResource[_transferResourceId].fleetId,
            s.transferResource[_transferResourceId].fromPlanetId
        );

        delete s.transferResource[_transferResourceId];
    }

    function checkAlliance(address _playerToCheck)
        public
        view
        returns (bytes32)
    {
        return s.allianceOfPlayer[_playerToCheck];
    }
}

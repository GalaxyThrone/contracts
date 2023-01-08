// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "../interfaces/IBuildings.sol";
import "./AdminFacet.sol";

contract FleetsFacet is Modifiers {
    event sendTerraformer(
        uint256 indexed _toPlanet,
        uint256 indexed _arrivalTime,
        address indexed sender
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
        IERC20(s.metalAddress).burnFrom(msg.sender, price[0]);
        IERC20(s.crystalAddress).burnFrom(msg.sender, price[1]);
        IERC20(s.ethereusAddress).burnFrom(msg.sender, price[2]);
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
        emit sendTerraformer(_toPlanetId, arrivalTime, msg.sender);
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
}
//@notice Disabled for V0.01
/*
    function sendCargo(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _fleetId,
        uint256 _resourceId
    ) external onlyPlanetOwner(_fromPlanetId) {
        //todo: require only cargo ships
        SendCargo memory newSendCargo = SendCargo(
            _fromPlanetId,
            _toPlanetId,
            _fleetId,
            _resourceId,
            block.timestamp
        );
        s.sendCargoId++;
        s.sendCargo[s.sendCargoId] = newSendCargo;
        // emit event
    }
    */
//@notice Disabled for V0.01
/*
    function returnCargo(uint256 _sendCargoId) external {
        require(
            msg.sender ==
                IERC721(s.planets).ownerOf(
                    s.sendCargo[_sendCargoId].fromPlanetId
                ),
            "AppStorage: Not owner"
        );
        (uint256 fromX, uint256 fromY) = IPlanets(s.planets).getCoordinates(
            s.sendCargo[_sendCargoId].fromPlanetId
        );
        (uint256 toX, uint256 toY) = IPlanets(s.planets).getCoordinates(
            s.sendCargo[_sendCargoId].toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;
        require(
            block.timestamp >=
                s.sendCargo[_sendCargoId].timestamp + (distance * 2),
            "FleetsFacet: not ready yet"
        );
        uint256 cargo = IFleets(s.fleets).getCargo(
            s.sendCargo[_sendCargoId].fleetId
        );
        IPlanets(s.planets).mineResource(
            s.sendCargo[_sendCargoId].toPlanetId,
            s.sendCargo[_sendCargoId].resourceId,
            cargo
        );
        IResource(s.ethereus).mint(msg.sender, cargo);
        delete s.sendCargo[_sendCargoId];
    }
    */

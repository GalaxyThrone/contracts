// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, SendCargo, SendTerraform} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IFleets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

contract FleetsFacet is Modifiers {
    function craftFleet(uint256 _fleetId, uint256 _planetId)
        external
        onlyPlanetOwner(_planetId)
    {
        IFleets fleetsContract = IFleets(s.fleets);
        uint256[3] memory price = fleetsContract.getPrice(_fleetId);
        uint256 craftTime = fleetsContract.getCraftTime(_fleetId);
        uint256 craftedFrom = fleetsContract.getCraftedFrom(_fleetId);
        uint256 buildings = IPlanets(s.planets).getBuildings(
            _planetId,
            craftedFrom
        );
        require(craftTime > 0, "FleetsFacet: not released yet");
        require(
            s.craftFleets[_planetId].itemId == 0,
            "FleetsFacet: planet already crafting"
        );
        require(buildings > 0, "FleetsFacet: missing building requirement");
        uint256 readyTimestamp = block.timestamp + craftTime;
        CraftItem memory newFleet = CraftItem(_fleetId, readyTimestamp);
        s.craftFleets[_planetId] = newFleet;
        IERC20(s.metal).burnFrom(msg.sender, price[0]);
        IERC20(s.crystal).burnFrom(msg.sender, price[1]);
        IERC20(s.ethereus).burnFrom(msg.sender, price[2]);
    }

    function claimFleet(uint256 _planetId) external onlyPlanetOwner(_planetId) {
        require(
            block.timestamp >= s.craftFleets[_planetId].readyTimestamp,
            "FleetsFacet: not ready yet"
        );
        IFleets(s.fleets).mint(msg.sender, s.craftFleets[_planetId].itemId);
        uint256 fleetId = s.craftFleets[_planetId].itemId;
        delete s.craftFleets[_planetId];
        IPlanets(s.planets).addFleet(_planetId, fleetId);
    }

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

    function sendTerraform(
        uint256 _fromPlanetId,
        uint256 _toPlanetId,
        uint256 _fleetId
    ) external onlyPlanetOwner(_fromPlanetId) {
        //todo: require only to empty planet
        //todo: only terraform ship
        SendTerraform memory newSendTerraform = SendTerraform(
            _fromPlanetId,
            _toPlanetId,
            _fleetId,
            block.timestamp
        );
        s.sendTerraformId++;
        s.sendTerraform[s.sendTerraformId] = newSendTerraform;
        // emit event
    }

    function endTerraform(uint256 _sendTerraformId) external {
        require(
            msg.sender ==
                IERC721(s.planets).ownerOf(
                    s.sendTerraform[_sendTerraformId].fromPlanetId
                ),
            "AppStorage: Not owner"
        );
        (uint256 fromX, uint256 fromY) = IPlanets(s.planets).getCoordinates(
            s.sendTerraform[_sendTerraformId].fromPlanetId
        );
        (uint256 toX, uint256 toY) = IPlanets(s.planets).getCoordinates(
            s.sendTerraform[_sendTerraformId].toPlanetId
        );
        uint256 xDist = fromX > toX ? fromX - toX : toX - fromX;
        uint256 yDist = fromY > toY ? fromY - toY : toY - fromY;
        uint256 distance = xDist + yDist;
        require(
            block.timestamp >=
                s.sendTerraform[_sendTerraformId].timestamp + distance,
            "FleetsFacet: not ready yet"
        );
        //todo: conquer planet
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
}

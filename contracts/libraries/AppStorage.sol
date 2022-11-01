// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "./LibDiamond.sol";
import "../interfaces/IERC721.sol";

struct CraftItem {
    uint256 itemId;
    uint256 readyTimestamp;
}

struct SendCargo {
    uint256 fromPlanetId;
    uint256 toPlanetId;
    uint256 fleetId;
    uint256 resourceId;
    uint256 timestamp;
}

struct SendTerraform {
    uint256 fromPlanetId;
    uint256 toPlanetId;
    uint256 fleetId;
    uint256 timestamp;
}

struct AppStorage {
    address crystal;
    address ethereus;
    address metal;
    address buildings;
    address fleets;
    address planets;
    mapping(address => bool) registered;
    mapping(uint256 => CraftItem) craftBuildings;
    mapping(uint256 => CraftItem) craftFleets;
    // sendCargoId => SendCargo
    mapping(uint256 => SendCargo) sendCargo;
    // sendTerraformId => SendTerraform
    mapping(uint256 => SendTerraform) sendTerraform;
    uint256 sendCargoId;
    uint256 sendTerraformId;
}

library LibAppStorage {
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }
}

contract Modifiers {
    AppStorage internal s;

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier onlyPlanetOwner(uint256 _planetId) {
        require(
            msg.sender == IERC721(s.planets).ownerOf(_planetId),
            "AppStorage: Not owner"
        );
        _;
    }
}

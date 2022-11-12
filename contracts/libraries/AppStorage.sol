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

struct RequestConfig {
    uint64 subId;
    uint32 callbackGasLimit;
    uint16 requestConfirmations;
    uint32 numWords;
    bytes32 keyHash;
}

struct attackStatus {
    uint256 attackStarted;
    uint256 distance;
    uint256 timeToBeResolved;
    uint256 fromPlanet;
    uint256 toPlanet;
    uint256[] attackerShipsIds;
    address attacker;
    uint256 attackInstanceId;
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
    // heroId => vrf/reg data
    mapping(uint256 => address) vrfRequestIdToAddress;
    mapping(address => bool) registrationStarted;
    //VRF
    address vrfCoordinator;
    address linkAddress;
    RequestConfig requestConfig;
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

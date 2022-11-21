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
    uint256 arrivalTime;
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
    uint256[] attackSeed;
}

struct ShipType {
    uint256 shipType;
    uint256[3] price; // [metal, crystal, ethereus]
    uint256 attack;
    uint256 health;
    uint256 cargo;
    uint256 craftTime;
    uint256 craftedFrom;
    string name;
    uint256 moduleSlots;
    ShipModule[] equippedShipModule;
}

struct Building {
    uint256[3] price; // [metal, crystal, ethereus]
    uint256[3] boosts; // [metal, crystal, ethereus]
    uint256 attack;
    uint256 health;
    uint256 craftTime;
    string name;
}

struct ShipModule {
    uint256 attackBoostStat;
    uint256 healthBoostStat;
}

struct VrfRequest {
    address owner;
    uint8 kind; // 0 init planet, 1 register, 2 attack
    uint256 attackId;
}

struct AppStorage {
    address crystal;
    address ethereus;
    address metal;
    address buildings;
    address fleets;
    address planets;
    address ships;
    mapping(address => bool) registered;
    mapping(uint256 => CraftItem) craftBuildings;
    mapping(uint256 => CraftItem) craftFleets;
    // sendCargoId => SendCargo
    mapping(uint256 => SendCargo) sendCargo;
    // sendTerraformId => SendTerraform
    mapping(uint256 => SendTerraform) sendTerraform;
    //alliance Mappings
    mapping(address => bool) isInvitedToAlliance;
    mapping(bytes32 => address) allianceOwner;
    mapping(address => bytes32) allianceOfPlayer;
    mapping(bytes23 => uint256) allianceMemberCount;
    uint256 sendCargoId;
    uint256 sendTerraformId;
    // heroId => vrf/reg data
    mapping(uint256 => VrfRequest) vrfRequest;
    mapping(address => bool) registrationStarted;
    //VRF
    address vrfCoordinator;
    address linkAddress;
    RequestConfig requestConfig;
    bool init;
    address chainRunner;
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

    modifier onlySelf() {
        require(msg.sender == address(this), "RegisterFacet: not self");
        _;
    }

    modifier onlyPlanetOwner(uint256 _planetId) {
        require(
            msg.sender == IERC721(s.planets).ownerOf(_planetId),
            "AppStorage: Not owner"
        );
        _;
    }

    modifier onlyPlanetOwnerOrChainRunner(uint256 _planetId) {
        require(
            msg.sender == IERC721(s.planets).ownerOf(_planetId) ||
                //@TODO offload to chainlink automation facet instead of s.buildings
                msg.sender == s.chainRunner ||
                msg.sender == s.buildings,
            "AppStorage: Not owner"
        );
        _;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {LibDiamond} from "./LibDiamond.sol";
import "../interfaces/IERC721.sol";

struct CraftItem {
    uint256 amount;
    uint256 planetId;
    uint256 itemId;
    uint256 readyTimestamp;
}

struct OutMining {
    uint256 instanceId;
    uint256 fromPlanetId;
    uint256 toPlanetId;
    uint256[] shipsIds;
    uint256 timestamp;
    uint256 arrivalTime;
}

struct SendTerraform {
    uint256 instanceId;
    uint256 fromPlanetId;
    uint256 toPlanetId;
    uint256[] shipsIds;
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
    uint256[4] price; // [metal, crystal, antimatter,aether]
    uint256 attack;
    uint256[3] attackTypes;
    uint256[3] defenseTypes;
    uint256 health;
    uint256 cargo;
    uint256 craftTime;
    uint256 craftedFrom;
    string name;
    uint256 moduleSlots;
}

struct Building {
    uint256[3] price; // [metal, crystal, antimatter]
    uint256[3] boosts; // [metal, crystal, antimatter]
    uint256[3] defenseTypes;
    uint256 health;
    uint256 craftTime;
    string name;
}

struct ShipModule {
    string name;
    uint256[3] attackBoostStat;
    uint256[3] defenseBoostStat;
    uint256 healthBoostStat;
    uint256[3] price;
}

struct VrfRequest {
    address owner;
    uint8 kind; // 0 init planet, 1 register, 2 attack
    uint256 attackId;
}

struct TransferResource {
    uint256 fromPlanetId;
    uint256 toPlanetId;
    uint256[] shipsIds;
    uint256 timestamp;
    uint256 arrivalTime;
    uint256[3] sentResources;
}

struct AppStorage {
    address crystalAddress;
    address antimatterAddress;
    address metalAddress;
    address aetherAddress;
    address buildingsAddress;
    address planetsAddress;
    address shipsAddress;
    mapping(address => bool) registered;
    mapping(uint256 => CraftItem) craftBuildings;
    mapping(uint256 => CraftItem) craftFleets;
    // sendCargoId => SendCargo
    mapping(uint256 => OutMining) outMining;
    // sendTerraformId => SendTerraform
    mapping(uint256 => SendTerraform) sendTerraform;
    // transferResourceId => TransferResource
    mapping(uint256 => TransferResource) transferResource;
    //alliance Mappings
    mapping(address => bool) isInvitedToAlliance;
    mapping(bytes32 => address) allianceOwner;
    mapping(address => bytes32) allianceOfPlayer;
    mapping(bytes32 => uint256) allianceMemberCount;
    mapping(bytes32 => mapping(uint => address)) membersAlliance;
    mapping(address => bytes32[]) outstandingInvitations;
    mapping(uint256 => bytes32) registeredAlliances;
    mapping(uint256 => attackStatus) runningAttacks;
    uint256 sendAttackId;
    uint256 totalAllianceCount;
    uint256 outMiningId;
    uint256 sendTerraformId;
    uint256 transferResourceId;
    // heroId => vrf/reg data
    mapping(uint256 => VrfRequest) vrfRequest;
    mapping(address => bool) registrationStarted;
    mapping(uint256 => uint256) planetType;
    mapping(uint => uint[2][3]) planetTypeResourceData;
    uint totalAvailablePlanetTypes;
    uint256 totalPlanetsAmount;
    mapping(address => uint256) aetherHeldPlayer;
    //VRF
    address vrfCoordinator;
    address linkAddress;
    RequestConfig requestConfig;
    bool init;
    address chainRunner;
    // planetId => fleetId => amount
    mapping(uint256 => mapping(uint256 => uint256)) fleets;
    // planetId => buildingId => amount
    mapping(uint256 => mapping(uint256 => uint256)) buildings;
    // planetId => resource => boost
    mapping(uint256 => mapping(uint256 => uint256)) boosts;
    // planetId => lastClaimed
    mapping(uint256 => uint256) lastClaimed;
    //shipId => planetId
    mapping(uint256 => uint256) assignedPlanet;
    //ship categories template
    //@TODO to be removed. Its duplicated on the actual ship contract
    mapping(uint256 => ShipType) shipType;
    //load level cost
    mapping(uint => uint) maxLevelShipType;
    // shiptype => level => statsUpgrade, attackTypes(3), defenseTypes(3), HP
    mapping(uint => mapping(uint => uint[7])) statsUpgradeLeveling;
    //shipType => level => resourcePrice
    mapping(uint => mapping(uint => uint[3])) resourceCostLeveling;
    mapping(uint => uint) currentLevelShip;
    //individual spaceShip Nfts

    mapping(uint256 => ShipType) SpaceShips;
    //shipModuleTypes
    mapping(uint256 => ShipModule) shipModuleType;
    //total shipModuleTypes that exist currently
    uint256 totalAvailableShipModules;
    //equippedShipModuleTypes
    mapping(uint256 => mapping(uint256 => ShipModule)) equippedShipModuleType;
    //how many moduleSlots are still available to use for ship
    mapping(uint256 => uint256) availableModuleSlots;
    // planetId => resource => amount
    mapping(uint256 => mapping(uint256 => uint256)) planetResources;
    mapping(address => uint256) playersFaction;
    uint256 availableFactions;
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
            msg.sender == IERC721(s.planetsAddress).ownerOf(_planetId),
            "AppStorage: Not owner"
        );
        _;
    }

    modifier onlyPlanetOwnerOrChainRunner(uint256 _planetId) {
        require(
            msg.sender == IERC721(s.planetsAddress).ownerOf(_planetId) ||
                msg.sender == address(this),
            "AppStorage: Not owner / chainrunner"
        );
        _;
    }

    modifier onlyChainRunner() {
        require(msg.sender == s.chainRunner, "AppStorage: Not chainrunner");
        _;
    }
}

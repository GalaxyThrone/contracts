// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Ships is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    address public gameDiamond;

    struct ShipType {
        uint256 shipType;
        uint256[4] price; // [metal, crystal, antimatter]
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

    struct ShipModule {
        string name;
        uint256[3] attackBoostStat;
        uint256[3] defenseBoostStat;
        uint256 healthBoostStat;
        uint256[3] price;
    }

    //what kind of ship each tokenId actually is
    mapping(uint256 => ShipType) public SpaceShips;

    //shipId => planetId
    mapping(uint256 => uint256) public assignedPlanet;

    //ship categories template
    mapping(uint256 => ShipType) public shipType;

    mapping(uint256 => ShipModule) public shipModuleType;
    //equippedShipModuleTypes

    mapping(uint256 => mapping(uint256 => ShipModule)) equippedShipModuleType;

    string private _uri;

    modifier onlyGameDiamond() {
        require(msg.sender == gameDiamond, "Planets: restricted");
        _;
    }

    function initialize(address _gameDiamond) public initializer {
        __ERC721_init("Ships", "SHIP");
        __Ownable_init();
        gameDiamond = _gameDiamond;
    }

    function setUri(string calldata __uri) external onlyOwner {
        _uri = __uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    //done
    //@param
    function mint(address _account, uint256 _shipTypeId)
        external
        onlyGameDiamond
        returns (uint256)
    {
        uint256 shipId = totalSupply();
        SpaceShips[shipId] = shipType[_shipTypeId];

        _safeMint(_account, shipId);
        return (shipId);
    }

    function addShipType(uint256 _id, ShipType calldata _newShipType)
        external
        onlyOwner
    {
        shipType[_id] = _newShipType;
    }

    function checkAssignedPlanet(uint256 _shipId)
        external
        view
        returns (uint256)
    {
        return assignedPlanet[_shipId];
    }

    function assignShipToPlanet(uint256 _shipId, uint256 _toPlanetId)
        external
        onlyGameDiamond
    {
        assignedPlanet[_shipId] = _toPlanetId;
    }

    function deleteShipFromPlanet(uint256 _shipId) external onlyGameDiamond {
        delete assignedPlanet[_shipId];
    }

    function getPrice(uint256 _fleetId)
        external
        view
        returns (uint256[4] memory)
    {
        return shipType[_fleetId].price;
    }

    function getCraftTime(uint256 _fleetId) external view returns (uint256) {
        return shipType[_fleetId].craftTime;
    }

    function getCraftedFrom(uint256 _fleetId) external view returns (uint256) {
        return shipType[_fleetId].craftedFrom;
    }

    function getCargo(uint256 _fleetId) external view returns (uint256) {
        return shipType[_fleetId].cargo;
    }

    function burnShip(uint256 _shipId) external onlyGameDiamond {
        _transfer(
            ownerOf(_shipId),
            address(0x0000000000000000000000000000000000000001),
            _shipId
        );
    }

    function getShipStats(uint256 _shipId)
        public
        view
        returns (ShipType memory)
    {
        return SpaceShips[_shipId];
    }

    function getDefensePlanet(uint256 _planetId)
        external
        view
        returns (uint256[] memory)
    {
        //@TODO to be refactored / removed / fixed / solved differently
        uint256 totalFleetSize;
        for (uint256 i = 0; i < totalSupply() + 1; i++) {
            if (assignedPlanet[i] == _planetId) {
                totalFleetSize += 1;
            }
        }
        uint256[] memory defenseFleetToReturn = new uint256[](totalFleetSize);

        for (uint256 i = 0; i < totalSupply() + 1; i++) {
            if (assignedPlanet[i] == _planetId) {
                defenseFleetToReturn[totalFleetSize - 1] = i;
                totalFleetSize--;
            }
        }

        return defenseFleetToReturn;
    }

    function getDefensePlanetDetailed(uint256 _planetId)
        external
        view
        returns (uint256[] memory, ShipType[] memory)
    {
        //@TODO to be refactored / removed / fixed / solved differently
        uint256 totalFleetSize;
        for (uint256 i = 0; i < totalSupply() + 1; i++) {
            if (assignedPlanet[i] == _planetId) {
                totalFleetSize += 1;
            }
        }
        uint256[] memory defenseFleetToReturn = new uint256[](totalFleetSize);
        ShipType[] memory defenseFleetShipTypesToReturn = new ShipType[](
            totalFleetSize
        );
        for (uint256 i = 0; i < totalSupply() + 1; i++) {
            if (assignedPlanet[i] == _planetId) {
                defenseFleetToReturn[totalFleetSize - 1] = i;
                totalFleetSize--;
            }
        }

        for (uint256 j = 0; j < defenseFleetToReturn.length; j++) {
            defenseFleetShipTypesToReturn[j] = getShipStats(
                defenseFleetToReturn[j]
            );
        }

        return (defenseFleetToReturn, defenseFleetShipTypesToReturn);
    }

    //@TODO to be refactored to backend, to accomodate more realtime-traits
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        ShipType memory shipAttributes = SpaceShips[_tokenId];

        string memory maxHP = Strings.toString(shipAttributes.health);
        string memory cargoSpace = Strings.toString(shipAttributes.cargo);
        string memory attackDamage = Strings.toString(shipAttributes.attack);
        string memory shipTypeName = shipAttributes.name;

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{ "description": "Spaceship ",',
                        '"attributes": [ ',
                        '{"trait_type": "tokenId", "value":',
                        _tokenId,
                        "}, ",
                        '{"trait_type": "ship_class", "value":',
                        shipTypeName,
                        "}, ",
                        '{"trait_type": "health", "value":',
                        maxHP,
                        "}, ",
                        '{"trait_type": "attack_strength", "value":',
                        attackDamage,
                        "}, ",
                        '{"trait_type": "cargo_space", "value":',
                        cargoSpace,
                        "}",
                        "]}"
                    )
                )
            )
        );

        string memory output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        return output;
    }
}

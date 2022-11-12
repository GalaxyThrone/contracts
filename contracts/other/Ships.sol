// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract Ships is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    address public gameDiamond;

    struct ShipType {
        uint256[3] price; // [metal, crystal, ethereus]
        uint256 attack;
        uint256 health;
        uint256 cargo;
        uint256 craftTime;
        uint256 craftedFrom;
        string name;
        uint moduleSlots;
        ShipModule[] equippedShipModule;
    }

    struct ShipModule {
        uint256 attackBoostStat;
        uint256 healthBoostStat;
    }

    //what kind of ship each tokenId actually is

    mapping(uint256 => ShipType) public SpaceShips;

    //shipId => planetId
    mapping(uint256 => uint256) public assignedPlanet;

    mapping(uint256 => ShipType) public shipType;

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
    function mint(address _account, uint _shipTypeId)
        external
        onlyGameDiamond
        returns (uint)
    {
        uint256 shipId = totalSupply() + 1;
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

    function assignShipToPlanet(uint256 _shipId, uint _toPlanetId)
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
        returns (uint256[3] memory)
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
        _burn(_shipId);
    }

    function getShipStats(uint256 _shipId)
        external
        view
        returns (ShipType memory)
    {
        return SpaceShips[_shipId];
    }
}

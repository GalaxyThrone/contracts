// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract Planets is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    struct Planet {
        uint256 coordinateX;
        uint256 coordinateY;
        uint256 ethereus;
        uint256 metal;
        uint256 crystal;
    }

    address public gameDiamond;
    // planetId => Planet
    mapping(uint256 => Planet) public planets;
    // planetId => fleetId => amount
    mapping(uint256 => mapping(uint256 => uint256)) public fleets;
    // planetId => buildingId => amount
    mapping(uint256 => mapping(uint256 => uint256)) public buildings;
    // planetId => resource => boost
    mapping(uint256 => mapping(uint256 => uint256)) public boosts;
    // planetId => resource => lastClaimed
    mapping(uint256 => mapping(uint256 => uint256)) public lastClaimed;

    string private _uri;

    function initialize(address _gameDiamond) public initializer {
        __ERC721_init("Planets", "PLN");
        __Ownable_init();
        gameDiamond = _gameDiamond;
    }

    function setUri(string calldata __uri) external onlyOwner {
        _uri = __uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }

    function mint(Planet calldata _planet) external {
        require(msg.sender == gameDiamond, "Planets: restricted");
        uint256 planetId = totalSupply() + 1;
        planets[planetId] = _planet;
        _safeMint(msg.sender, planetId);
    }

    function addBuilding(uint256 _planetId, uint256 _buildingId) external {
        require(msg.sender == gameDiamond, "Planets: restricted");
        buildings[_planetId][_buildingId] += 1;
    }

    function addFleet(uint256 _planetId, uint256 _fleetId) external {
        require(msg.sender == gameDiamond, "Planets: restricted");
        fleets[_planetId][_fleetId] += 1;
    }

    function addBoost(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _boost
    ) external {
        require(msg.sender == gameDiamond, "Planets: restricted");
        boosts[_planetId][_resourceId] += _boost;
    }

    function mineResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external {
        require(msg.sender == gameDiamond, "Planets: restricted");
        if (_resourceId == 0) {
            planets[_planetId].metal -= _amount;
        } else if (_resourceId == 1) {
            planets[_planetId].crystal -= _amount;
        } else if (_resourceId == 2) {
            planets[_planetId].ethereus -= _amount;
        }
        lastClaimed[_planetId][_resourceId] = block.timestamp;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function getBuildings(uint256 _planetId, uint256 _buildingId)
        external
        view
        returns (uint256)
    {
        return buildings[_planetId][_buildingId];
    }

    function getLastClaimed(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256)
    {
        return lastClaimed[_planetId][_resourceId];
    }

    function getBoost(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256)
    {
        return boosts[_planetId][_resourceId];
    }

    function getCoordinates(uint256 _planetId)
        external
        view
        returns (uint256, uint256)
    {
        return (planets[_planetId].coordinateX, planets[_planetId].coordinateY);
    }
}

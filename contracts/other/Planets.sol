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
        bool pvpEnabled;
        address owner;
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

    address public gameDiamond;
    // planetId => Planet
    mapping(uint256 => Planet) public planets;
    // planetId => fleetId => amount
    mapping(uint256 => mapping(uint256 => uint256)) public fleets;
    //planetId  => shipIds
    mapping(uint256 => uint256[]) public fleetShipIds;

    // planetId => buildingId => amount
    mapping(uint256 => mapping(uint256 => uint256)) public buildings;
    // planetId => resource => boost
    mapping(uint256 => mapping(uint256 => uint256)) public boosts;
    // planetId => resource => lastClaimed
    mapping(uint256 => mapping(uint256 => uint256)) public lastClaimed;

    string private _uri;

    attackStatus[] public runningAttacks;

    event planetConquered(
        uint256 indexed tokenId,
        address indexed oldOwner,
        address indexed newOwner
    );

    event attackInitated(
        uint256 indexed attackedPlanet,
        address indexed Attacker,
        uint256 indexed timeToArrive,
        uint256 arrayIndex
    );

    event attackLost(uint256 indexed attackedPlanet, address indexed Attacker);

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

    modifier onlyGameDiamond() {
        require(msg.sender == gameDiamond, "Planets: restricted");
        _;
    }

    function mint(Planet calldata _planet) external onlyGameDiamond {
        uint256 planetId = totalSupply() + 1;
        planets[planetId] = _planet;
        _safeMint(msg.sender, planetId);
    }

    function addBuilding(uint256 _planetId, uint256 _buildingId)
        external
        onlyGameDiamond
    {
        buildings[_planetId][_buildingId] += 1;
    }

    function addFleet(
        uint256 _planetId,
        uint256 _fleetId,
        uint256 _shipType,
        uint256 amount
    ) external onlyGameDiamond {
        fleets[_planetId][_fleetId] += amount;
        fleetShipIds[_planetId].push(_tokenId);
    }

    function removeFleet(
        uint256 _planetId,
        uint256 _fleetId,
        uint256 _shipType,
        uint256 amount
    ) external onlyGameDiamond {
        fleets[_planetId][_fleetId] -= amount;
        fleetShipIds[_planetId].push(_tokenId);
    }

    function addBoost(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _boost
    ) external onlyGameDiamond {
        boosts[_planetId][_resourceId] += _boost;
    }

    function mineResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external onlyGameDiamond {
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

    function getAttackStatus(uint256 _instanceId)
        external
        view
        returns (attackStatus memory)
    {
        return runningAttacks[_instanceId];
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

    function getDefensePlanet(uint256 _planetId)
        external
        view
        returns (uint256[] memory)
    {
        return fleetShipIds[_planetId];
    }

    function assignDefensePlanet(
        uint256 _planetId,
        uint256[] memory _newDefenseShips
    ) external onlyGameDiamond {
        fleetShipIds[_planetId] = _newDefenseShips;
    }

    function addAttack(attackStatus memory _attackToBeInitated)
        external
        onlyGameDiamond
    {
        _attackToBeInitated.attackInstanceId = runningAttacks.length;
        runningAttacks.push(_attackToBeInitated);

        emit attackInitated(
            _attackToBeInitated.toPlanet,
            _attackToBeInitated.attacker,
            _attackToBeInitated.timeToBeResolved,
            runningAttacks.length - 1
        );
    }

    function planetConquestTransfer(
        uint256 _tokenId,
        address _oldOwner,
        address _newOwner,
        uint256 _attackIdResolved
    ) external onlyGameDiamond {
        delete runningAttacks[_attackIdResolved];
        _safeTransfer(_oldOwner, _newOwner, _tokenId, "");
        emit planetConquered(_tokenId, _oldOwner, _newOwner);
    }

    function resolveLostAttack(uint256 _attackIdResolved)
        external
        onlyGameDiamond
    {
        emit attackLost(
            runningAttacks[_attackIdResolved].toPlanet,
            runningAttacks[_attackIdResolved].attacker
        );

        delete runningAttacks[_attackIdResolved];
    }
}

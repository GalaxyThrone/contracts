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
        uint256[] attackSeed;
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

    attackStatus[] public runningAttacks;

    event planetConquered(
        uint256 indexed tokenId,
        address indexed oldOwner,
        address indexed newOwner
    );

    event planetTerraformed(uint256 indexed tokenId, address indexed newOwner);
    event attackInitated(
        uint256 attackedPlanet,
        address indexed Attacker,
        uint256 indexed timeToArrive,
        uint256 indexed arrayIndex
    );

    event attackLost(uint256 indexed attackedPlanet, address indexed Attacker);

    function initialize(address _gameDiamond) public initializer {
        __ERC721_init("Planets", "PLN");
        __Ownable_init();
        gameDiamond = _gameDiamond;
    }

    // function genesisPlanets(address _gameDiamond, uint256 _amount)
    //     public
    //     onlyOwner
    // {
    //     for (uint256 i = 0; i < _amount; i++) {
    //         uint256[] memory expandedValues = new uint256[](5);
    //         for (uint256 j = 0; j < 5; j++) {
    //             expandedValues[j] = uint256(
    //                 keccak256(abi.encode(block.timestamp, j))
    //             );
    //         }

    //         Planet memory genesisPlanet;
    //         genesisPlanet.coordinateX = expandedValues[0] % 10000;
    //         genesisPlanet.coordinateY = expandedValues[1] % 10000;
    //         genesisPlanet.ethereus = (expandedValues[2] % 100000) * 1e18;
    //         genesisPlanet.metal = (expandedValues[3] % 100000) * 1e18;
    //         genesisPlanet.crystal = (expandedValues[4] % 100000) * 1e18;

    //         uint256 planetId = totalSupply() + 1;
    //         planets[planetId] = genesisPlanet;
    //         _mint(_gameDiamond, planetId);
    //     }
    // }

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
        uint256 _shipType,
        uint256 amount
    ) external onlyGameDiamond {
        fleets[_planetId][_shipType] += amount;
    }

    function removeFleet(
        uint256 _planetId,
        uint256 _shipType,
        uint256 amount
    ) external onlyGameDiamond {
        fleets[_planetId][_shipType] -= amount;
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

    function getAllBuildings(uint256 _planetId, uint256 _totalBuildingTypeCount)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory buildingsCount = new uint256[](
            _totalBuildingTypeCount
        );

        for (uint256 i = 0; i < _totalBuildingTypeCount; i++) {
            buildingsCount[i] = buildings[_planetId][i];
        }
        return buildingsCount;
    }

    function getAttackStatus(uint256 _instanceId)
        external
        view
        returns (attackStatus memory)
    {
        //out of bounds access
        if (_instanceId > runningAttacks.length - 1) {
            attackStatus memory emptyResponse;
            return emptyResponse;
        } else {
            return runningAttacks[_instanceId];
        }
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

    function addAttack(attackStatus memory _attackToBeInitated)
        external
        onlyGameDiamond
        returns (uint256)
    {
        _attackToBeInitated.attackInstanceId = runningAttacks.length;
        runningAttacks.push(_attackToBeInitated);

        emit attackInitated(
            _attackToBeInitated.toPlanet,
            _attackToBeInitated.attacker,
            _attackToBeInitated.timeToBeResolved,
            runningAttacks.length - 1
        );

        return (runningAttacks.length - 1);
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

    function planetTerraform(uint256 _tokenId, address _newOwner)
        external
        onlyGameDiamond
    {
        _safeTransfer(gameDiamond, _newOwner, _tokenId, "");
        emit planetTerraformed(_tokenId, _newOwner);
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

    function getPVPStatus(uint256 _planetId) external view returns (bool) {
        return planets[_planetId].pvpEnabled;
    }

    function enablePVP(uint256 _planetId) external onlyGameDiamond {
        planets[_planetId].pvpEnabled = true;
    }

    function addAttackSeed(uint256 _attackId, uint256[] calldata _randomness)
        external
        onlyGameDiamond
    {
        runningAttacks[_attackId].attackSeed = _randomness;
    }

    function getTotalPlanetCount() external view returns (uint256) {
        return totalSupply();
    }

    //view function to check if attack can be resolved
    //returns the ids & timestamps
    function checkIfPlayerHasAttackRunning(address _player)
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        uint256 attackIdsAmount;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].attacker == _player) {
                attackIdsAmount += 1;
            }
        }

        uint256[] memory attackIds = new uint256[](attackIdsAmount);

        uint256[] memory attackResolvementTime = new uint256[](attackIdsAmount);
        uint256 j = 0;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].attacker == _player) {
                attackIds[j] = i;
                attackResolvementTime[j] = runningAttacks[i].timeToBeResolved;
                j++;
            }
        }

        return (attackIds, attackResolvementTime);
    }

    function getAllRunningAttacks()
        external
        view
        returns (attackStatus[] memory)
    {
        return runningAttacks;
    }

    function getAllIncomingAttacksPlayer(address _player)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 totalAttackCount;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (ownerOf(runningAttacks[i].toPlanet) == _player) {
                totalAttackCount += 1;
            }
        }

        attackStatus[] memory incomingAttacksPlayer = new attackStatus[](
            totalAttackCount
        );

        uint256 step = 0;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (ownerOf(runningAttacks[i].toPlanet) == _player) {
                incomingAttacksPlayer[step] = runningAttacks[i];
                step++;
            }
        }

        return incomingAttacksPlayer;
    }

    function getAllOutgoingAttacks(address _player)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 totalAttackCount;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].attacker == _player) {
                totalAttackCount += 1;
            }
        }

        attackStatus[] memory outgoingAttacks = new attackStatus[](
            totalAttackCount
        );

        uint256 step = 0;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].attacker == _player) {
                outgoingAttacks[step] = runningAttacks[i];
                step++;
            }
        }

        return outgoingAttacks;
    }

    function getAllIncomingAttacksPlanet(uint256 _planetId)
        external
        view
        returns (attackStatus[] memory)
    {
        uint256 totalAttackCount;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].toPlanet == _planetId) {
                totalAttackCount += 1;
            }
        }

        attackStatus[] memory planetIncomingAttacks = new attackStatus[](
            totalAttackCount
        );

        uint256 step = 0;
        for (uint256 i = 0; i < runningAttacks.length; i++) {
            if (runningAttacks[i].toPlanet == _planetId) {
                planetIncomingAttacks[step] = runningAttacks[i];
                step++;
            }
        }

        return planetIncomingAttacks;
    }
}

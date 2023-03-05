// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract Planets is ERC721EnumerableUpgradeable, OwnableUpgradeable {
    struct Planet {
        uint256 coordinateX;
        uint256 coordinateY;
        uint256 antimatter;
        uint256 metal;
        uint256 crystal;
        bool pvpEnabled;
        address owner;
        uint256 planetType;
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

    string private _uri;

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

    function mineResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external onlyGameDiamond {
        //@TODO underflow seems possible when mined out.
        if (_resourceId == 0) {
            planets[_planetId].metal -= _amount;
        } else if (_resourceId == 1) {
            planets[_planetId].crystal -= _amount;
        } else if (_resourceId == 2) {
            planets[_planetId].antimatter -= _amount;
        }
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function getCoordinates(uint256 _planetId)
        external
        view
        returns (uint256, uint256)
    {
        return (planets[_planetId].coordinateX, planets[_planetId].coordinateY);
    }

    function planetConquestTransfer(
        uint256 _tokenId,
        address _oldOwner,
        address _newOwner,
        uint256 _attackIdResolved
    ) external onlyGameDiamond {
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

    function getPVPStatus(uint256 _planetId) external view returns (bool) {
        return planets[_planetId].pvpEnabled;
    }

    function enablePVP(uint256 _planetId) external onlyGameDiamond {
        planets[_planetId].pvpEnabled = true;
    }

    function getTotalPlanetCount() external view returns (uint256) {
        return totalSupply();
    }

    /*
    function getAllRunningAttacks()
        external
        view
        returns (attackStatus[] memory)
    {
        return runningAttacks;
    }

    /*
    //@notice get all incoming attacks of a specific player address
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

    //@notice get all outgoing attacks of a players address

    //@notice deprecated, see FightingFacet.
    /*
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
    */
    //@notice get all incoming attacks of a planet NFT id
    //@notice deprecated, see FightingFacet.
    /*
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
    */
}

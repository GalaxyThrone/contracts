// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import {attackStatus} from "../libraries/AppStorage.sol";

interface IPlanets {
    struct Planet {
        uint256 coordinateX;
        uint256 coordinateY;
        uint256 ethereus;
        uint256 metal;
        uint256 crystal;
        bool pvpEnabled;
        address owner;
    }

    function mint(Planet calldata _planet) external;

    function addBuilding(uint256 _planetId, uint256 _buildingId) external;

    function addFleet(
        uint256 _planetId,
        uint256 _shipType,
        uint256 amount
    ) external;

    function removeFleet(
        uint256 _planetId,
        uint256 _shipType,
        uint256 amount
    ) external;

    function getBuildings(uint256 _planetId, uint256 _buildingId)
        external
        view
        returns (uint256);

    function getAllBuildings(uint256 _planetId, uint256 _totalBuildingCount)
        external
        view
        returns (uint256[] memory);

    function addBoost(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _boost
    ) external;

    function getLastClaimed(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256);

    function mineResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external;

    function getBoost(uint256 _planetId, uint256 _resourceId)
        external
        view
        returns (uint256);

    function getCoordinates(uint256 _planetId)
        external
        view
        returns (uint256, uint256);

    function planetConquestTransfer(
        uint256 _tokenId,
        address _oldOwner,
        address _newOwner,
        uint256 _attackIdResolved
    ) external;

    function getDefensePlanet(uint256 planetId)
        external
        returns (uint256[] memory);

    function resolveLostAttack(uint256 attackIdResolved) external;

    function addAttack(attackStatus memory _attackToBeInitated)
        external
        returns (uint256);

    function getAttackStatus(uint256 _instanceId)
        external
        view
        returns (attackStatus memory);

    function getPVPStatus(uint256 _planetId) external view returns (bool);

    function enablePVP(uint256 _planetId) external;

    function addAttackSeed(uint256 _attackId, uint256[] calldata _randomness)
        external;
}

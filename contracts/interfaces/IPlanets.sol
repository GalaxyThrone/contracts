// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import {attackStatus} from "../libraries/AppStorage.sol";

interface IPlanets {
    struct Planet {
        uint256 coordinateX;
        uint256 coordinateY;
        uint256 antimatter;
        uint256 metal;
        uint256 crystal;
        bool pvpEnabled;
        uint256 planetType;
    }

    function mint(Planet calldata _planet) external;

    function mineResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external;

    function getCoordinates(
        uint256 _planetId
    ) external view returns (uint256, uint256);

    function planetConquestTransfer(
        uint256 _tokenId,
        address _oldOwner,
        address _newOwner
    ) external;

    function getDefensePlanet(
        uint256 planetId
    ) external returns (uint256[] memory);

    function resolveLostAttack(uint256 attackIdResolved) external;

    function addAttack(
        attackStatus memory _attackToBeInitated
    ) external returns (uint256);

    function getAttackStatus(
        uint256 _instanceId
    ) external view returns (attackStatus memory);

    function getPVPStatus(uint256 _planetId) external view returns (bool);

    function enablePVP(uint256 _planetId) external;

    function addAttackSeed(
        uint256 _attackId,
        uint256[] calldata _randomness
    ) external;

    function getTotalPlanetCount() external view returns (uint256);

    function checkIfPlayerHasAttackRunning(
        address _player
    ) external view returns (uint256[] memory, uint256[] memory);

    function getAllRunningAttacks()
        external
        view
        returns (attackStatus[] memory);

    function planetTerraform(uint256 _tokenId, address _newOwner) external;

    function getPlanetResources(
        uint256 _planetId
    ) external view returns (uint256, uint256, uint256);

    function addResource(
        uint256 _planetId,
        uint256 _resourceId,
        uint256 _amount
    ) external;
}

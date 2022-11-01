// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IPlanets {
    struct Planet {
        uint256 coordinateX;
        uint256 coordinateY;
        uint256 ethereus;
        uint256 metal;
        uint256 crystal;
    }

    function mint(Planet calldata _planet) external;

    function addBuilding(uint256 _planetId, uint256 _buildingId) external;

    function addFleet(uint256 _planetId, uint256 _fleetId) external;

    function getBuildings(uint256 _planetId, uint256 _buildingId)
        external
        view
        returns (uint256);

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
}

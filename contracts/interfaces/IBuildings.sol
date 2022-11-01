// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IBuildings {
    function mint(address _account, uint256 _buildingId) external;

    function getPrice(uint256 _buildingId)
        external
        view
        returns (uint256[3] memory);

    function getCraftTime(uint256 _buildingId) external view returns (uint256);

    function getBoosts(uint256 _buildingId)
        external
        view
        returns (uint256[3] memory);
}

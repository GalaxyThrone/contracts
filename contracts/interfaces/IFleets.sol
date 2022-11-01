// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IFleets {
    function mint(address _account, uint256 _fleetId) external;

    function getPrice(uint256 _fleetId)
        external
        view
        returns (uint256[3] memory);

    function getCraftTime(uint256 _fleetId) external view returns (uint256);

    function getCraftedFrom(uint256 _fleetId) external view returns (uint256);

    function getCargo(uint256 _fleetId) external view returns (uint256);
}

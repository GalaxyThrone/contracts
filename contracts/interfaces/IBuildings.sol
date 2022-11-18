// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import {Building} from "../libraries/AppStorage.sol";

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

    function getTotalBuildingTypes() external view returns (uint256);

    function getBuildingType(uint256 _buildingId)
        external
        view
        returns (Building memory);

    function getBuildingTypes(uint256[] memory _buildingId)
        external
        view
        returns (Building[] memory);

    function transferBuildingsToConquerer(
        uint256[] memory buildingIdsAmounts,
        address _prevOwner,
        address _newOwner
    ) external;
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract Buildings is ERC1155Upgradeable, OwnableUpgradeable {
    address public gameDiamond;

    struct Building {
        uint256[3] price; // [metal, crystal, ethereus]
        uint256[3] boosts; // [metal, crystal, ethereus]
        uint256[3] defenseTypes;
        uint256 health;
        uint256 craftTime;
        string name;
    }

    // tokenId => Building
    mapping(uint256 => Building) public buildings;
    uint256 public totalBuildingTypes;
    string private _uri;

    modifier onlyGameDiamond() {
        require(msg.sender == gameDiamond, "Planets: restricted");
        _;
    }

    function initialize(address _gameDiamond) public initializer {
        __ERC1155_init("");
        __Ownable_init();
        gameDiamond = _gameDiamond;
    }

    function uri(uint256) public view override returns (string memory) {
        return _uri;
    }

    function setUri(string calldata __uri) external onlyOwner {
        _uri = __uri;
    }

    function mint(address _account, uint256 _buildingId)
        external
        onlyGameDiamond
    {
        _mint(_account, _buildingId, 1, "");
    }

    function addBuilding(uint256 _id, Building calldata _building)
        external
        onlyOwner
    {
        buildings[_id] = _building;
        totalBuildingTypes += 1;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function getPrice(uint256 _buildingId)
        external
        view
        returns (uint256[3] memory)
    {
        return buildings[_buildingId].price;
    }

    function getCraftTime(uint256 _buildingId) external view returns (uint256) {
        return buildings[_buildingId].craftTime;
    }

    function getBoosts(uint256 _buildingId)
        external
        view
        returns (uint256[3] memory)
    {
        return buildings[_buildingId].boosts;
    }

    // function safeTransferFrom(
    //     address,
    //     address,
    //     uint256
    // ) public override {
    //     revert("Buildings: restricted");
    // }

    function getTotalBuildingTypes() external view returns (uint256) {
        return totalBuildingTypes;
    }

    function getBuildingType(uint256 _buildingId)
        external
        view
        returns (Building memory)
    {
        return buildings[_buildingId];
    }

    function getBuildingTypes(uint256[] memory _buildingId)
        external
        view
        returns (Building[] memory)
    {
        Building[] memory buildingTypesArray = new Building[](
            _buildingId.length
        );

        for (uint256 i = 0; i < _buildingId.length; i++) {
            buildingTypesArray[i] = buildings[i];
        }

        return buildingTypesArray;
    }

    function transferBuildingsToConquerer(
        uint256[] memory buildingIdsAmounts,
        address _prevOwner,
        address _newOwner
    ) external onlyGameDiamond {
        //@To be able to use safeBatchTransferFrom, we need an array of tokenIds to transfer
        uint256[] memory buildingTypeIds = new uint256[](
            buildingIdsAmounts.length
        );
        for (uint256 i = 0; i < buildingIdsAmounts.length; i++) {
            buildingTypeIds[i] = i;
        }

        _safeBatchTransferFrom(
            _prevOwner,
            _newOwner,
            buildingTypeIds,
            buildingIdsAmounts,
            ""
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "../interfaces/IERC20.sol";

contract Fleets is ERC1155Upgradeable, OwnableUpgradeable {
    address public gameDiamond;

    struct Fleet {
        uint256[3] price; // [metal, crystal, ethereus]
        uint256 attack;
        uint256 health;
        uint256 cargo;
        uint256 craftTime;
        uint256 craftedFrom;
        string name;
    }

    // tokenId => Building
    mapping(uint256 => Fleet) public fleets;

    string private _uri;

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

    function mint(address _account, uint256 _fleetId) external {
        require(msg.sender == gameDiamond, "Fleets: restricted");
        _mint(_account, _fleetId, 1, "");
    }

    function addFleet(uint256 _id, Fleet calldata _fleet) external onlyOwner {
        fleets[_id] = _fleet;
    }

    function setAddresses(address _gameDiamond) external onlyOwner {
        gameDiamond = _gameDiamond;
    }

    function getPrice(uint256 _fleetId)
        external
        view
        returns (uint256[3] memory)
    {
        return fleets[_fleetId].price;
    }

    function getCraftTime(uint256 _fleetId) external view returns (uint256) {
        return fleets[_fleetId].craftTime;
    }

    function getCraftedFrom(uint256 _fleetId) external view returns (uint256) {
        return fleets[_fleetId].craftedFrom;
    }

    function getCargo(uint256 _fleetId) external view returns (uint256) {
        return fleets[_fleetId].cargo;
    }

    //todo: override transfer
}

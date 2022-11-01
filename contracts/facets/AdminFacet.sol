// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";

contract AdminFacet is Modifiers {
    function setAddresses(
        address _crystal,
        address _ethereus,
        address _metal,
        address _buildings,
        address _fleets,
        address _planets
    ) external onlyOwner {
        s.crystal = _crystal;
        s.ethereus = _ethereus;
        s.metal = _metal;
        s.buildings = _buildings;
        s.fleets = _fleets;
        s.planets = _planets;
    }

    function initPlanets(uint256 _amount) external onlyOwner {
        for (uint256 i = 0; i < _amount; i++) {
            uint256[] memory expandedValues = new uint256[](5);
            for (uint256 j = 0; j < 5; j++) {
                expandedValues[j] = uint256(
                    keccak256(abi.encode(block.timestamp, i))
                );
            }
            uint256 coordinateX = expandedValues[0] % 10000;
            uint256 coordinateY = expandedValues[1] % 10000;
            uint256 ethereus = (expandedValues[2] % 100000) * 1e18;
            uint256 metal = (expandedValues[3] % 100000) * 1e18;
            uint256 crystal = (expandedValues[4] % 100000) * 1e18;
            IPlanets(s.planets).mint(
                IPlanets.Planet({
                    coordinateX: coordinateX,
                    coordinateY: coordinateY,
                    ethereus: ethereus,
                    metal: metal,
                    crystal: crystal
                })
            );
        }
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

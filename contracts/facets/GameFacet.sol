// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers} from "../libraries/AppStorage.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IERC20.sol";

import "hardhat/console.sol";

contract GameFacet is Modifiers {
    function register() external {
        require(
            s.registered[msg.sender] == false,
            "GameFacet: Already registered"
        );
        s.registered[msg.sender] = true;
        uint256 totalSupply = IERC721(s.planets).totalSupply();
        for (uint256 i; i < totalSupply; i++) {
            uint256 tokenId = uint256(
                keccak256(abi.encodePacked(block.timestamp, i))
            ) % totalSupply;
            if (IERC721(s.planets).ownerOf(tokenId) == address(this)) {
                IERC721(s.planets).safeTransferFrom(
                    address(this),
                    msg.sender,
                    tokenId
                );
                break;
            }
        }
        IERC20(s.metal).mint(msg.sender, 120000 ether);
        IERC20(s.crystal).mint(msg.sender, 80000 ether);
        IERC20(s.ethereus).mint(msg.sender, 60000 ether);
    }

    function getRegistered(address _account) external view returns (bool) {
        return s.registered[_account];
    }
}

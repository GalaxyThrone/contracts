// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {RequestConfig, Modifiers} from "../libraries/AppStorage.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IERC20.sol";
import "../libraries/LibMeta.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract RegisterFacet is Modifiers {
    function startRegister() external {
        require(
            !s.registrationStarted[msg.sender],
            "VRFFacet: already registering"
        );
        require(!s.registered[msg.sender], "VRFFacet: already registered");

        // drawRandomNumbers(msg.sender);
        uint256[] memory _randomness = new uint256[](1);
        // generate 5 pseudo random numbers using blockhash, timestamp
        for (uint256 i = 0; i < 1; i++) {
            _randomness[i] = uint256(
                keccak256(
                    abi.encodePacked(
                        blockhash(block.number - i),
                        block.timestamp,
                        i
                    )
                )
            );
        }
        finalizeRegister(msg.sender, _randomness);
    }

    function drawRandomNumbers(address _player) internal {
        // Will revert if subscription is not set and funded.
        uint256 requestId = VRFCoordinatorV2Interface(s.vrfCoordinator)
            .requestRandomWords(
                s.requestConfig.keyHash,
                s.requestConfig.subId,
                s.requestConfig.requestConfirmations,
                s.requestConfig.callbackGasLimit,
                1
            );
        s.vrfRequest[requestId].owner = _player;
        s.vrfRequest[requestId].kind = 1;
        s.registrationStarted[_player] = true;
    }

    function finalizeRegister(address _player, uint256[] memory _randomness)
        internal
    {
        uint256 totalSupply = IERC721(s.planetsAddress).totalSupply();
        for (uint256 i; i < totalSupply; i++) {
            uint256 tokenId = _randomness[0] % totalSupply;
            if (IERC721(s.planetsAddress).ownerOf(tokenId) == address(this)) {
                IERC721(s.planetsAddress).safeTransferFrom(
                    address(this),
                    _player,
                    tokenId
                );
                s.registered[msg.sender] = true;
                IERC20(s.metalAddress).mint(address(this), 120000 ether);
                IERC20(s.crystalAddress).mint(address(this), 80000 ether);
                IERC20(s.ethereusAddress).mint(address(this), 60000 ether);
                s.planetResources[tokenId][0] += 120000 ether;
                s.planetResources[tokenId][1] += 80000 ether;
                s.planetResources[tokenId][2] += 60000 ether;
                break;
            }
        }

        if (!s.registered[msg.sender]) {
            s.registrationStarted[_player] = false;
        }
    }

    function getRegistered(address _account) external view returns (bool) {
        return s.registered[_account];
    }
}

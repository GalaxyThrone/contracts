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

        drawRandomNumbers(msg.sender);
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
        external
        onlySelf
    {
        uint256 totalSupply = IERC721(s.planets).totalSupply();
        for (uint256 i; i < totalSupply; i++) {
            uint256 tokenId = _randomness[0] % totalSupply;
            if (IERC721(s.planets).ownerOf(tokenId) == address(this)) {
                IERC721(s.planets).safeTransferFrom(
                    address(this),
                    _player,
                    tokenId
                );
                s.registered[msg.sender] = true;
                break;
            }
        }
        IERC20(s.metal).mint(_player, 120000 ether);
        IERC20(s.crystal).mint(_player, 80000 ether);
        IERC20(s.ethereus).mint(_player, 60000 ether);

        if (!s.registered[msg.sender]) {
            s.registrationStarted[_player] = false;
        }
    }

    function getRegistered(address _account) external view returns (bool) {
        return s.registered[_account];
    }
}

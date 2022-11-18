// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {RequestConfig, Modifiers} from "../libraries/AppStorage.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IERC20.sol";
import "../libraries/LibMeta.sol";
import "./RegisterFacet.sol";
import "./AdminFacet.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract VRFFacet is Modifiers {
    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        require(
            LibMeta.msgSender() == s.vrfCoordinator,
            "Only VRFCoordinator can fulfill"
        );
        if (s.vrfRequest[requestId].kind == 1) {
            RegisterFacet(address(this)).finalizeRegister(
                s.vrfRequest[requestId].owner,
                randomWords
            );
        } else if (s.vrfRequest[requestId].kind == 0) {
            AdminFacet(address(this)).finalizeInit(5, randomWords);
        } else if (s.vrfRequest[requestId].kind == 2) {
            AdminFacet(address(this)).finalizeAttackSeed(
                s.vrfRequest[requestId].attackId,
                randomWords
            );
        }
    }

    function setConfig(RequestConfig calldata _requestConfig)
        external
        onlyOwner
    {
        s.requestConfig = RequestConfig(
            _requestConfig.subId,
            _requestConfig.callbackGasLimit,
            _requestConfig.requestConfirmations,
            _requestConfig.numWords,
            _requestConfig.keyHash
        );
    }

    function subscribe() external onlyOwner {
        address[] memory consumers = new address[](1);
        consumers[0] = address(this);
        s.requestConfig.subId = VRFCoordinatorV2Interface(s.vrfCoordinator)
            .createSubscription();
        VRFCoordinatorV2Interface(s.vrfCoordinator).addConsumer(
            s.requestConfig.subId,
            consumers[0]
        );
    }

    // Assumes this contract owns link
    function topUpSubscription(uint256 amount) external {
        LinkTokenInterface(s.linkAddress).transferAndCall(
            s.vrfCoordinator,
            amount,
            abi.encode(s.requestConfig.subId)
        );
    }

    function setVRFAddresses(address _vrfCoordinator, address _linkAddress)
        external
        onlyOwner
    {
        s.vrfCoordinator = _vrfCoordinator;
        s.linkAddress = _linkAddress;
    }
}

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
    event Register(uint256 indexed _heroId, uint256 _landId);

    function testRegister(uint256 fakeRandom) external {
        require(!s.registered[msg.sender], "VRFFacet: already registered");
        _testRegister(msg.sender, fakeRandom);
    }

    function register() external {
        require(
            !s.registrationStarted[msg.sender],
            "VRFFacet: already registering"
        );
        require(!s.registered[msg.sender], "VRFFacet: already registered");

        //require payment to prevent sybil attacks. disabled for hackathon
        IERC20(s.governanceToken).mintToUser(msg.sender, 1e18);
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
                s.requestConfig.numWords
            );
        s.vrfRequestIdToAddress[requestId] = _player;
        s.registrationStarted[_player] = true;
    }

    function rawFulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        require(
            LibMeta.msgSender() == s.vrfCoordinator,
            "Only VRFCoordinator can fulfill"
        );
        address player = s.vrfRequestIdToAddress[requestId];
        // run logic
        _register(player, randomWords);
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

    // todo fix refactor with landId
    function _register(address _player, uint256[] memory _randomness) internal {
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
        IERC20(s.metal).mint(msg.sender, 120000 ether);
        IERC20(s.crystal).mint(msg.sender, 80000 ether);
        IERC20(s.ethereus).mint(msg.sender, 60000 ether);

        if (!s.registered[msg.sender]) {
            s.registrationStarted[_player] = false;
        }
    }

    function _testRegister(address _player, uint256 fakeRandom) internal {
        uint256 totalSupply = IERC721(s.planets).totalSupply();
        for (uint256 i; i < totalSupply; i++) {
            uint256 tokenId = fakeRandom % totalSupply;
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
        IERC20(s.metal).mint(msg.sender, 120000 ether);
        IERC20(s.crystal).mint(msg.sender, 80000 ether);
        IERC20(s.ethereus).mint(msg.sender, 60000 ether);
    }

    function getRegistered(address _account) external view returns (bool) {
        return s.registered[_account];
    }
}

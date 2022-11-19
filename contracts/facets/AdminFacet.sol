// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "@chainlink/contracts/src/v0.8/interfaces/LinkTokenInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract AdminFacet is Modifiers {
    function setAddresses(
        address _crystal,
        address _ethereus,
        address _metal,
        address _buildings,
        address _ships,
        address _planets,
        address _chainRunner
    ) external onlyOwner {
        s.crystal = _crystal;
        s.ethereus = _ethereus;
        s.metal = _metal;
        s.buildings = _buildings;
        s.ships = _ships;
        s.planets = _planets;
        s.chainRunner = _chainRunner;
    }

    //@notice generates new planets randomly
    function drawRandomNumbers() internal {
        // Will revert if subscription is not set and funded.
        uint256 requestId = VRFCoordinatorV2Interface(s.vrfCoordinator)
            .requestRandomWords(
                s.requestConfig.keyHash,
                s.requestConfig.subId,
                s.requestConfig.requestConfirmations,
                s.requestConfig.callbackGasLimit,
                5
            );
        s.vrfRequest[requestId].kind = 0;
    }

    function drawRandomAttackSeed(uint256 _attackId) external onlySelf {
        // Will revert if subscription is not set and funded.
        uint256 requestId = VRFCoordinatorV2Interface(s.vrfCoordinator)
            .requestRandomWords(
                s.requestConfig.keyHash,
                s.requestConfig.subId,
                s.requestConfig.requestConfirmations,
                s.requestConfig.callbackGasLimit,
                5
            );
        s.vrfRequest[requestId].kind = 2;
        s.vrfRequest[requestId].attackId = _attackId;
    }

    function startInit() external {
        require(!s.init, "AdminFacet: already running init");
        s.init = true;

        drawRandomNumbers();
    }

    function finalizeInit(uint256 _amount, uint256[] calldata _randomness)
        external
        onlySelf
    {
        for (uint256 i = 0; i < _amount; i++) {
            uint256 coordinateX = _randomness[0] % 10000;
            uint256 coordinateY = _randomness[1] % 10000;
            uint256 ethereus = (_randomness[2] % 100000) * 1e18;
            uint256 metal = (_randomness[3] % 100000) * 1e18;
            uint256 crystal = (_randomness[4] % 100000) * 1e18;
            IPlanets(s.planets).mint(
                IPlanets.Planet({
                    coordinateX: coordinateX,
                    coordinateY: coordinateY,
                    ethereus: ethereus,
                    metal: metal,
                    crystal: crystal,
                    pvpEnabled: false,
                    owner: address(this)
                })
            );
        }
        s.init = false;
    }

    function finalizeAttackSeed(
        uint256 _attackId,
        uint256[] calldata _randomness
    ) external onlySelf {
        IPlanets(s.planets).addAttackSeed(_attackId, _randomness);
    }

    // function removeFix() external {
    //     s.init = false;
    // }

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

    function changeChainRunner(address _newChainRunner) external onlyOwner {
        s.chainRunner = _newChainRunner;
    }
}

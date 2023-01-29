// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, ShipType, ShipModule} from "../libraries/AppStorage.sol";
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
        s.crystalAddress = _crystal;
        s.ethereusAddress = _ethereus;
        s.metalAddress = _metal;
        s.buildingsAddress = _buildings;
        s.shipsAddress = _ships;
        s.planetsAddress = _planets;
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

    function addShipType(uint256 _id, ShipType calldata _newShipType)
        external
        onlyOwner
    {
        s.shipType[_id] = _newShipType;
    }

    function addShipModuleType(
        uint256 _id,
        ShipModule calldata _newShipModuleType
    ) external onlyOwner {
        s.totalAvailableShipModules += 1;
        s.shipModuleType[_id] = _newShipModuleType;
    }

    function addFaction(uint256 _newAmount) external onlyOwner {
        s.availableFactions = _newAmount;
    }

    function drawRandomAttackSeed(uint256 _attackId) external onlySelf {
        // Will revert if subscription is not set and funded.
        // uint256 requestId = VRFCoordinatorV2Interface(s.vrfCoordinator)
        //     .requestRandomWords(
        //         s.requestConfig.keyHash,
        //         s.requestConfig.subId,
        //         s.requestConfig.requestConfirmations,
        //         s.requestConfig.callbackGasLimit,
        //         5
        //     );
        // s.vrfRequest[requestId].kind = 2;
        // s.vrfRequest[requestId].attackId = _attackId;

        uint256[] memory _randomness = new uint256[](5);
        // generate 5 pseudo random numbers using blockhash, timestamp
        for (uint256 i = 0; i < 5; i++) {
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
        s.runningAttacks[_attackId].attackSeed = _randomness;
    }

    function startInit(uint256 _amount) external onlyOwner {
        require(!s.init, "AdminFacet: already running init");
        s.init = true;

        // drawRandomNumbers();
        uint256[] memory _randomness = new uint256[](5);
        // generate 5 pseudo random numbers using blockhash, timestamp
        for (uint256 i = 0; i < 5; i++) {
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
        finalizeInit(_amount, _randomness);
    }

    function finalizeInit(uint256 _amount, uint256[] memory _randomness)
        internal
    {
        for (uint256 i = 0; i < _amount; i++) {
            _randomness[0] = uint256(keccak256(abi.encode(_randomness[0], i)));
            _randomness[1] = uint256(keccak256(abi.encode(_randomness[0], i)));
            _randomness[2] = uint256(keccak256(abi.encode(_randomness[0], i)));
            _randomness[3] = uint256(keccak256(abi.encode(_randomness[0], i)));
            _randomness[4] = uint256(keccak256(abi.encode(_randomness[0], i)));
            uint256 coordinateX = _randomness[0] % 10000;
            uint256 coordinateY = _randomness[1] % 10000;
            uint256 ethereus = (_randomness[2] % 100000) * 1e18;
            uint256 metal = (_randomness[3] % 100000) * 1e18;
            uint256 crystal = (_randomness[4] % 100000) * 1e18;
            IPlanets(s.planetsAddress).mint(
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

    //deprecated until VRF is readded
    /*
    function finalizeAttackSeed(
        uint256 _attackId,
        uint256[] calldata _randomness
    ) external onlySelf {
        IPlanets(s.planetsAddress).addAttackSeed(_attackId, _randomness);
    } 
    */

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

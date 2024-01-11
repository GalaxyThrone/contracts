// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, Commander, CommanderTrait} from "../libraries/AppStorage.sol";

import "../interfaces/IPlanets.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";
import "./ShipsFacet.sol";

contract CommanderFacet is Modifiers {
    //@TODO move to script & function calldata instead of hardcoded
    function setupPresetCommanders() external onlyOwner {
        s.presetCommander[0][1] = Commander(
            0,
            "Commander Vektrix",
            0,
            [uint256(1), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[0][2] = Commander(
            0,
            "Commander Seraphel",
            0,
            [uint256(2), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[0][3] = Commander(
            0,
            "Commander Nova",
            0,
            [uint256(3), uint256(0), uint256(0)],
            0
        );

        // Initialize preset commanders for The Naxians
        s.presetCommander[1][1] = Commander(
            1,
            "Commander Korgath",
            0,
            [uint256(4), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[1][2] = Commander(
            1,
            "Commander Lunara",
            0,
            [uint256(5), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[1][3] = Commander(
            1,
            "Commander Rexar",
            0,
            [uint256(6), uint256(0), uint256(0)],
            0
        );

        // Initialize preset commanders for The Netharim
        s.presetCommander[2][1] = Commander(
            2,
            "Commander Zethos",
            0,
            [uint256(7), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[2][2] = Commander(
            2,
            "Commander Illari",
            0,
            [uint256(8), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[2][3] = Commander(
            2,
            "Commander Raelon",
            0,
            [uint256(9), uint256(0), uint256(0)],
            0
        );

        // Initialize preset commanders for The Xantheans
        s.presetCommander[3][1] = Commander(
            3,
            "Commander Sylas",
            0,
            [uint256(3), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[3][2] = Commander(
            3,
            "Commander Lyria",
            0,
            [uint256(10), uint256(0), uint256(0)],
            0
        );
        s.presetCommander[3][3] = Commander(
            3,
            "Commander Phaelon",
            0,
            [uint256(11), uint256(0), uint256(0)],
            0
        );
    }

    function setupTrait(
        CommanderTrait memory _traitToAdd,
        uint _traitId
    ) external onlyOwner {
        s.traitMapping[_traitId] = _traitToAdd;
    }

    function getPlayerDeployedCommander(
        address _playerToCheck
    ) external view returns (Commander memory) {
        return s.CommanderStats[s.currentCommanderNft[_playerToCheck]];
    }

    function getCommanderStats(
        uint _nftIdToCheck
    ) external view returns (Commander memory) {
        s.CommanderStats[_nftIdToCheck];
    }
}

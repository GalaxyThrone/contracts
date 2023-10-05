// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, OutMining, SendTerraform, TransferResource, attackStatus, ShipType, Building} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

import "./AdminFacet.sol";

contract ManagementFacet is Modifiers {
    event techResearched(uint techId, address playerAddress);
    event playerNameChosen(address playerAddress, string newName);

    function researchTech(
        uint _techIdToResearch,
        uint _researchBasePlanet
    ) external onlyPlanetOwner(_researchBasePlanet) {
        require(
            s.lastResearchTimeCooldown[msg.sender] <= block.timestamp,
            "ManagementFacet: cooldown research!"
        );

        require(
            s.playerTechnologies[msg.sender][_techIdToResearch] == false,
            "ManagementFacet: already researched!"
        );

        require(
            s.counterPlayerTechnologies[msg.sender] < s.maxTechCount,
            "ManagementFacet: reached max tech researched"
        );

        //@TODO prerequisite

        for (uint256 i = 0; i < 3; i++) {
            require(
                s.planetResources[_researchBasePlanet][i] >=
                    s.availableResearchTechs[_techIdToResearch].price[i],
                "ManagementFacet: not enough resources"
            );
            s.planetResources[_researchBasePlanet][i] -= s
                .availableResearchTechs[_techIdToResearch]
                .price[i];

            burnResource(
                i,
                s.availableResearchTechs[_techIdToResearch].price[i]
            );
        }

        s.lastResearchTimeCooldown[msg.sender] =
            block.timestamp +
            s.availableResearchTechs[_techIdToResearch].cooldown;

        s.playerTechnologies[msg.sender][_techIdToResearch] = true;
        s.counterPlayerTechnologies[msg.sender]++;
        emit techResearched(_techIdToResearch, msg.sender);
    }

    function setPlayername(string memory _newPlayerName) external {
        require(s.registered[msg.sender], "ManagementFacet: not registered!");
        require(
            !s.playerNameOwnership[_newPlayerName],
            "ManagementFacet: player name taken!"
        );
        s.playerName[msg.sender] = _newPlayerName;
        s.playerNameOwnership[_newPlayerName] = true;

        emit playerNameChosen(msg.sender, _newPlayerName);
    }

    function returnPlayerName(
        address _playerNameToGet
    ) external view returns (string memory) {
        return s.playerName[_playerNameToGet];
    }

    function returnPlayerResearchedTech(
        uint _techIdToCheckStatus,
        address _playerAddr
    ) external view returns (bool) {
        return s.playerTechnologies[_playerAddr][_techIdToCheckStatus];
    }

    function burnResource(uint256 i, uint256 amount) internal {
        if (i == 0) {
            IERC20(s.metalAddress).burnFrom(address(this), amount);
        } else if (i == 1) {
            IERC20(s.crystalAddress).burnFrom(address(this), amount);
        } else {
            IERC20(s.antimatterAddress).burnFrom(address(this), amount);
        }
    }
}

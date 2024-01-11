// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AppStorage, Modifiers, CraftItem, OutMining, SendTerraform, TransferResource, attackStatus, ShipType, Building, DiplomacyDeal, PeaceDeal} from "../libraries/AppStorage.sol";
import "../interfaces/IPlanets.sol";
import "../interfaces/IShips.sol";
import "../interfaces/IERC20.sol";
import "../interfaces/IERC721.sol";
import "../interfaces/IResource.sol";

import "./AdminFacet.sol";

contract ManagementFacet is Modifiers {
    event techResearched(uint techId, address playerAddress);
    event playerNameChosen(address playerAddress, string newName);
    event DealCreated(
        uint indexed dealID,
        address indexed initiator,
        address indexed acceptor
    );
    event DealAccepted(uint indexed dealID);
    event DealViewed(uint indexed dealID);
    event DealCancelled(uint indexed dealID);
    event DealRejected(uint indexed dealID);
    event dealCountered(uint indexed dealID);

    //Research Feature

    function researchTech(
        uint _techIdToResearch,
        uint _techTree,
        uint _researchBasePlanet
    ) external onlyPlanetOwner(_researchBasePlanet) {
        require(
            s.lastResearchTimeCooldown[msg.sender] <= block.timestamp,
            "ManagementFacet: cooldown research!"
        );

        require(
            !s.playerTechnologies[msg.sender][_techTree][_techIdToResearch],
            "ManagementFacet: already researched!"
        );

        uint256[4] memory price;
        uint256 cooldown;
        uint256 preRequisiteTechId;

        if (_techTree == 1) {
            // Ships
            require(
                s.counterPlayerTechnologiesShips[msg.sender] < s.maxTechCount,
                "ManagementFacet: reached max tech researched for Ships"
            );
            ShipTypeTech memory tech = s.availableResearchTechsShips[
                _techIdToResearch
            ];
            price = tech.price;
            cooldown = tech.cooldown;
            preRequisiteTechId = tech.preRequisiteTech;
            require(
                cooldown != 0,
                "ManagementFacet: Research Technology not initialized!"
            );
        } else if (_techTree == 2) {
            // Military
            require(
                s.counterPlayerTechnologiesMilitary[msg.sender] <
                    s.maxTechCount,
                "ManagementFacet: reached max tech researched for Military"
            );
            MilitaryTech memory tech = s.availableResearchTechsMilitary[
                _techIdToResearch
            ];
            price = tech.price;
            cooldown = tech.cooldown;
            preRequisiteTechId = tech.preRequisiteTech;
            require(
                cooldown != 0,
                "ManagementFacet: Research Technology not initialized!"
            );
        } else if (_techTree == 3) {
            // Governance
            require(
                s.counterPlayerTechnologiesGovernance[msg.sender] <
                    s.maxTechCount,
                "ManagementFacet: reached max tech researched for Governance"
            );
            GovernanceTech memory tech = s.availableResearchTechsGovernance[
                _techIdToResearch
            ];
            price = tech.price;
            cooldown = tech.cooldown;
            preRequisiteTechId = tech.preRequisiteTech;
            require(
                cooldown != 0,
                "ManagementFacet: Research Technology not initialized!"
            );
        } else if (_techTree == 4) {
            // Utility
            require(
                s.counterPlayerTechnologiesUtility[msg.sender] < s.maxTechCount,
                "ManagementFacet: reached max tech researched for Utility"
            );
            UtilityTech memory tech = s.availableResearchTechsUtility[
                _techIdToResearch
            ];
            price = tech.price;
            cooldown = tech.cooldown;
            preRequisiteTechId = tech.preRequisiteTech;
            require(
                cooldown != 0,
                "ManagementFacet: Research Technology not initialized!"
            );
        } else {
            revert("Invalid tech tree");
        }

        if (preRequisiteTechId != 0) {
            require(
                s.playerTechnologies[msg.sender][_techTree][preRequisiteTechId],
                "ManagementFacet: prerequisite tech not researched"
            );
        }

        // Check if the planet has enough resources
        for (uint256 i = 0; i < 3; i++) {
            require(
                s.planetResources[_researchBasePlanet][i] >= price[i],
                "ManagementFacet: not enough resources"
            );
            s.planetResources[_researchBasePlanet][i] -= price[i];
            burnResource(i, price[i]);
        }
        if (price[3] > 0) {
            require(
                s.aetherHeldPlayer[msg.sender] >= price[3],
                "ManagementFacet: Player doesnt hold enough Aether!"
            );

            s.aetherHeldPlayer[msg.sender] -= price[3];
        }

        // Apply Commander Buffs
        //@TODO testing
        //Motivational Research Speaker [ID 8], 20% less research cooldown

        if (s.activeCommanderTraits[msg.sender][8]) {
            cooldown -= (cooldown * 20) / 100;
        }

        s.lastResearchTimeCooldown[msg.sender] = block.timestamp + cooldown;
        s.playerTechnologies[msg.sender][_techTree][_techIdToResearch] = true;

        // Increment the relevant counter based on the tech tree
        if (_techTree == 1) {
            s.counterPlayerTechnologiesShips[msg.sender]++;
        } else if (_techTree == 2) {
            s.counterPlayerTechnologiesMilitary[msg.sender]++;
        } else if (_techTree == 3) {
            s.counterPlayerTechnologiesGovernance[msg.sender]++;
        } else if (_techTree == 4) {
            s.counterPlayerTechnologiesUtility[msg.sender]++;
        }

        emit techResearched(_techIdToResearch, msg.sender);
    }

    function returnPlayerResearchedTech(
        uint _techIdToCheckStatus,
        uint _techTree,
        address _playerAddr
    ) external view returns (bool) {
        return
            s.playerTechnologies[_playerAddr][_techTree][_techIdToCheckStatus];
    }

    function returnPlayerResearchCooldown(
        address _playerAddr
    ) external view returns (uint) {
        return s.lastResearchTimeCooldown[_playerAddr];
    }

    function returnAllPlayerResearchedTechSimplified(
        address _playerAddr
    ) external view returns (bool[4][14] memory techStatuses) {
        // Iterate over tech trees and tech IDs using zero-based indexing
        for (uint i = 0; i < 4; i++) {
            for (uint j = 0; j < 14; j++) {
                // Check if the tech is researched and handle missing mapping entries
                if (isTechResearched(_playerAddr, i + 1, j + 1)) {
                    techStatuses[i][j] = true;
                } else {
                    techStatuses[i][j] = false;
                }
            }
        }

        return techStatuses;
    }

    function isTechResearched(
        address _playerAddr,
        uint _techTree,
        uint _techId
    ) internal view returns (bool) {
        // Return false if the mapping entry does not exist
        // Assuming your mapping is initialized to return false for non-existent keys
        return s.playerTechnologies[_playerAddr][_techTree][_techId];
    }

    function returnPlayerResearchedTechCount(
        uint _techTree,
        address _playerAddr
    ) external view returns (uint) {
        if (_techTree == 1) {
            // Ships
            return s.counterPlayerTechnologiesShips[_playerAddr];
        } else if (_techTree == 2) {
            // Military
            return s.counterPlayerTechnologiesMilitary[_playerAddr];
        } else if (_techTree == 3) {
            // Governance
            return s.counterPlayerTechnologiesGovernance[_playerAddr];
        } else if (_techTree == 4) {
            // Utility
            return s.counterPlayerTechnologiesUtility[_playerAddr];
        } else {
            revert("Invalid tech tree");
        }
    }

    //Playernames Feature (@notice, this could be moved to backend via offchain signature validation..tbd)

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

    //Diplomacy Feature

    function createDeal(
        DiplomacyDeal memory _deal
    ) external onlyPlanetOwner(_deal.initiatorPlanetId) returns (uint) {
        s.dealCounter++;
        s.diplomacyDeals[s.dealCounter] = _deal;
        if (!_deal.demanded) {
            lockResources(_deal.resourcesAmount, _deal.initiatorPlanetId);
        }
        emit DealCreated(s.dealCounter, _deal.initiator, _deal.acceptor);
        return s.dealCounter;
    }

    function lockResources(
        uint[3] memory _resourceToLock,
        uint _planetId
    ) internal {
        // If resources are offered, transfer from the initiator to the contract

        for (uint i = 0; i < 3; i++) {
            require(
                s.planetResources[_planetId][i] >= _resourceToLock[i],
                "Not enough resources"
            );
            s.planetResources[_planetId][i] -= _resourceToLock[i];
        }
    }

    function unlockResources(
        uint[3] memory _resourceToUnlock,
        uint _planetId
    ) internal {
        for (uint i = 0; i < 3; i++) {
            s.planetResources[_planetId][i] += _resourceToUnlock[i];
        }
    }

    function receiveOfferedResources(
        uint[3] memory _offeredResources,
        uint _planetId
    ) internal {
        for (uint i = 0; i < 3; i++) {
            s.planetResources[_planetId][i] += _offeredResources[i];
        }
    }

    function payDemandedResources(
        uint[3] memory _demandedResources,
        uint _planetIdPayer,
        uint _planetIdReceiver
    ) internal {
        for (uint i = 0; i < 3; i++) {
            require(
                s.planetResources[_planetIdPayer][i] >= _demandedResources[i],
                "Not enough resources"
            );
            s.planetResources[_planetIdPayer][i] -= _demandedResources[i];
            s.planetResources[_planetIdReceiver][i] += _demandedResources[i];
        }
    }

    function acceptDeal(
        uint _dealID,
        uint _planetToAcceptDealFrom
    ) external onlyPlanetOwner(_planetToAcceptDealFrom) {
        DiplomacyDeal storage deal = s.diplomacyDeals[_dealID];
        require(
            msg.sender == deal.acceptor,
            "Only the acceptor can accept the deal."
        );

        require(
            block.timestamp < deal.timeFrameExpirationOffer,
            "cant accept expired deal"
        );
        if (deal.demanded) {
            payDemandedResources(
                deal.resourcesAmount,
                _planetToAcceptDealFrom,
                deal.initiatorPlanetId
            );
        } else {
            receiveOfferedResources(
                deal.resourcesAmount,
                _planetToAcceptDealFrom
            );
        }

        // Register the peace deal
        s.activePeaceDeals[deal.initiator][deal.acceptor] = PeaceDeal(
            block.timestamp + deal.timeFramePeaceDealInSeconds
        );
        s.activePeaceDeals[deal.acceptor][deal.initiator] = PeaceDeal(
            block.timestamp + deal.timeFramePeaceDealInSeconds
        );

        deal.status = 1;
        emit DealAccepted(_dealID);
    }

    function cancelDeal(uint _dealID) external {
        DiplomacyDeal storage deal = s.diplomacyDeals[_dealID];
        require(
            msg.sender == deal.initiator,
            "Only the initiator can cancel the deal."
        );
        if (!deal.demanded) {
            unlockResources(deal.resourcesAmount, deal.initiatorPlanetId);
        }
        s.diplomacyDeals[_dealID].status = 2;
        //delete s.diplomacyDeals[_dealID];

        emit DealCancelled(_dealID);
    }

    function viewDeal(
        uint _dealID
    ) external view returns (DiplomacyDeal memory) {
        return s.diplomacyDeals[_dealID];
    }

    function getPeaceDealStatus(
        address _player1,
        address _player2
    ) external view returns (bool) {
        PeaceDeal memory peaceDeal1 = s.activePeaceDeals[_player1][_player2];
        PeaceDeal memory peaceDeal2 = s.activePeaceDeals[_player2][_player1];

        // Check if there's no peace deal in place
        if (peaceDeal1.endTime == 0 && peaceDeal2.endTime == 0) {
            return false;
        }

        // Check if the peace deal between _player1 and _player2 is still active
        if (
            block.timestamp < peaceDeal1.endTime ||
            block.timestamp < peaceDeal2.endTime
        ) {
            return true;
        }

        // If neither of the above conditions are met, then the peace deal has expired
        return false;
    }

    //Helper Functions

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
